import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import sendEmail from '../utils/sendEmail.js';
import crypto from 'crypto';
import { generateSecret, verifyToken } from '../lib/totp.js';
import { auditFromReq } from '../lib/audit.js';
import logger from '../lib/logger.js';

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Short-lived 2FA challenge token. Not a full session — only valid for the
// /auth/2fa/login exchange. The `purpose: '2fa'` claim prevents this token
// from being used as a regular auth token even if leaked into another header.
const generate2faChallenge = (userId) => {
    return jwt.sign({ id: userId, purpose: '2fa' }, process.env.JWT_SECRET, {
        expiresIn: '5m'
    });
};

const verify2faChallenge = (token) => {
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        return payload.purpose === '2fa' ? payload : null;
    } catch {
        return null;
    }
};

// @desc    Register user (Legacy)
// @route   POST /api/auth/register
export const register = async (req, res, next) => {
    try {
        const { name, email, password, company, phone, role } = req.body;

        // Check if user exists
        const userExists = await prisma.user.findFirst({ where: { email } });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                company,
                phone,
                role: role || 'ENGINEER'
            }
        });

        // Generate token
        const token = generateToken(user.id);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: user.company
            }
        });
    } catch (error) {
        next(error);
    }
};

// Helper to generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// @desc    Step 1: Register a new company (SaaS Tenant + Admin User) - Sends OTP
// @route   POST /api/auth/register-company
// @access  Public
export const registerCompany = async (req, res, next) => {
    try {
        const { companyName, adminName, email, password, phone } = req.body;

        // Validation
        if (!companyName || !adminName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if user exists - Removed for Multi-Tenant Support (allow duplicate emails)
        /*
        const userExists = await prisma.user.findFirst({ where: { email } });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }
        */

        // Generate Company Slug
        const slug = companyName
            .toLowerCase()
            .replace(/ /g, '-')
            .replace(/[^\w-]+/g, '') + '-' + Math.floor(Math.random() * 1000);

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate Verification Code
        const verificationCode = generateOTP();
        const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        // Transaction: Create Tenant + Admin User.
        // Use `tx` (not `prisma`) to avoid shadowing the outer client and
        // accidentally running operations outside the transaction. Explicit
        // timeout protects against slow-DB P2028 errors.
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Tenant
            const tenant = await tx.tenant.create({
                data: {
                    name: companyName,
                    slug: slug,
                    subscriptionPlan: 'FREE_PILOT'
                }
            });

            // 2. Create Admin User (Unverified)
            const user = await tx.user.create({
                data: {
                    name: adminName,
                    email,
                    password: hashedPassword,
                    company: companyName,
                    phone,
                    role: 'ADMIN', // Company Owner
                    tenantId: tenant.id,
                    isVerified: false,
                    verificationCode,
                    verificationExpires
                }
            });

            return { tenant, user };
        }, { timeout: 15000, maxWait: 5000 });

        // Send Verification Email
        const message = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #3b82f6;">Welcome to Civil Engine!</h1>
                <p>You have successfully initialized your company workspace: <strong>${companyName}</strong></p>
                <p>Please enter the following code to verify your account and complete the setup:</p>
                <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <h2 style="color: #111827; font-size: 32px; letter-spacing: 5px; margin: 0;">${verificationCode}</h2>
                </div>
                <p>This code expires in 10 minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
            </div>
        `;

        try {
            await sendEmail({
                email: result.user.email,
                subject: 'Verify Your Company Workspace - Civil Engine',
                message
            });
        } catch (error) {
            logger.error({ err: error }, 'Email send error');
            // We return success true but maybe with a warning, or fail?
            // If we fail here, the user is created but can't verify.
            // Let's assume it works or they can resend (need resend endpoint?)
            // For MVP/Demo, let's just log.
        }

        res.status(201).json({
            success: true,
            email: result.user.email,
            message: 'Registration successful. Verification code sent to your email.',
            devVerificationCode: process.env.NODE_ENV !== 'production' ? verificationCode : undefined
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Step 2: Verify Email and Activate Account
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res, next) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and verification code'
            });
        }

        // Find user by email AND code (since email might be duplicate)
        const user = await prisma.user.findFirst({
            where: { email, verificationCode: code },
            include: { tenant: true }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email'
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'User is already verified'
            });
        }

        if (user.verificationCode !== code) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code'
            });
        }

        if (user.verificationExpires && user.verificationExpires < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Verification code expired'
            });
        }

        // Activate User
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                isActive: true, // Ensure active
                verificationCode: null,
                verificationExpires: null
            },
            include: { tenant: true }
        });

        // Generate Token
        const token = generateToken(updatedUser.id);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                company: updatedUser.tenant ? updatedUser.tenant.name : updatedUser.company,
                companyLogo: updatedUser.tenant ? updatedUser.tenant.logo : null, // Added Logo
                tenantId: updatedUser.tenantId
            }
        });

    } catch (error) {
        next(error);
    }
};

// ... (imports remain)

// ... (register, registerCompany, verifyEmail remain)

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an email and password'
            });
        }

        // Check for user(s)
        const users = await prisma.user.findMany({
            where: { email },
            include: { tenant: true }
        });

        if (!users || users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Find the user with the matching password
        let user = null;
        for (const u of users) {
            const isMatch = await bcrypt.compare(password, u.password);
            if (isMatch) {
                user = u;
                break;
            }
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated'
            });
        }

        // Two-factor challenge — if the user has TOTP enabled, don't issue a
        // full session yet. Hand back a short-lived challenge token that they
        // must redeem at /api/auth/2fa/login with a valid 6-digit code.
        if (user.totpEnabled) {
            return res.status(200).json({
                success: true,
                requires2FA: true,
                challengeToken: generate2faChallenge(user.id),
                message: 'Two-factor code required'
            });
        }

        // Generate token
        const token = generateToken(user.id);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: user.tenant ? user.tenant.name : user.company,
                companyLogo: user.tenant ? user.tenant.logo : null,
                tenantId: user.tenantId,
                permissions: user.permissions || [],
                mustChangePassword: user.mustChangePassword || false
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Step 2 of 2FA login: redeem challenge token + 6-digit code → full session.
// @route   POST /api/auth/2fa/login
// @access  Public (presents a valid challenge token)
export const login2FA = async (req, res, next) => {
    try {
        const { challengeToken, code } = req.body;
        if (!challengeToken || !code) {
            return res.status(400).json({ success: false, message: 'challengeToken and code are required' });
        }

        const claims = verify2faChallenge(challengeToken);
        if (!claims) {
            return res.status(401).json({ success: false, message: 'Invalid or expired challenge token' });
        }

        const user = await prisma.user.findUnique({
            where: { id: claims.id },
            include: { tenant: true }
        });
        if (!user || !user.isActive || !user.totpEnabled || !user.totpSecret) {
            return res.status(401).json({ success: false, message: 'Two-factor not enabled for this account' });
        }

        if (!(await verifyToken(code, user.totpSecret))) {
            return res.status(401).json({ success: false, message: 'Invalid two-factor code' });
        }

        const token = generateToken(user.id);
        res.status(200).json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: user.tenant ? user.tenant.name : user.company,
                companyLogo: user.tenant ? user.tenant.logo : null,
                tenantId: user.tenantId,
                permissions: user.permissions || [],
                mustChangePassword: user.mustChangePassword || false
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Begin 2FA enrollment: generate a fresh secret + QR code data URL.
//          Caller must verify the secret with `confirmEnroll2FA` before it
//          becomes active. Until verified, totpEnabled stays false.
// @route   POST /api/auth/2fa/enroll
// @access  Private
export const enroll2FA = async (req, res, next) => {
    try {
        if (req.user.totpEnabled) {
            return res.status(400).json({
                success: false,
                message: 'Two-factor is already enabled. Disable it first to re-enroll.'
            });
        }

        const { secret, otpauth, qrDataUrl } = await generateSecret(req.user.email);

        // Stage the secret on the user row but keep totpEnabled=false until
        // the user proves they can produce a code from it.
        await prisma.user.update({
            where: { id: req.user.id },
            data: { totpSecret: secret, totpEnabled: false }
        });

        res.status(200).json({
            success: true,
            data: { secret, otpauth, qrDataUrl }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Confirm 2FA enrollment with a fresh code. Flips totpEnabled=true.
// @route   POST /api/auth/2fa/confirm
// @access  Private
export const confirmEnroll2FA = async (req, res, next) => {
    try {
        const { code } = req.body;

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user.totpSecret) {
            return res.status(400).json({ success: false, message: 'No enrollment in progress. Call /enroll first.' });
        }
        if (user.totpEnabled) {
            return res.status(400).json({ success: false, message: 'Two-factor already enabled' });
        }
        if (!(await verifyToken(code, user.totpSecret))) {
            return res.status(400).json({ success: false, message: 'Invalid code; try again with the next one shown in your authenticator' });
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: { totpEnabled: true }
        });

        await auditFromReq(req, {
            action: '2FA_ENABLE',
            entity: 'User',
            entityId: req.user.id
        });

        res.status(200).json({ success: true, message: 'Two-factor enabled' });
    } catch (error) {
        next(error);
    }
};

// @desc    Disable 2FA. Requires the current password AND a valid TOTP code.
// @route   POST /api/auth/2fa/disable
// @access  Private
export const disable2FA = async (req, res, next) => {
    try {
        const { password, code } = req.body;

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user.totpEnabled) {
            return res.status(400).json({ success: false, message: 'Two-factor not currently enabled' });
        }

        const passwordOk = await bcrypt.compare(password || '', user.password);
        if (!passwordOk) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }
        if (!(await verifyToken(code, user.totpSecret))) {
            return res.status(401).json({ success: false, message: 'Invalid two-factor code' });
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: { totpEnabled: false, totpSecret: null }
        });

        await auditFromReq(req, {
            action: '2FA_DISABLE',
            entity: 'User',
            entityId: req.user.id
        });

        res.status(200).json({ success: true, message: 'Two-factor disabled' });
    } catch (error) {
        next(error);
    }
};

// @desc    Status endpoint — does this account have 2FA enabled?
// @route   GET /api/auth/2fa/status
// @access  Private
export const status2FA = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { totpEnabled: true, totpSecret: true }
        });
        res.status(200).json({
            success: true,
            data: {
                enabled: !!user.totpEnabled,
                pendingEnrollment: !user.totpEnabled && !!user.totpSecret
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { tenant: true }
        });

        res.status(200).json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: user.tenant ? user.tenant.name : user.company,
                companyLogo: user.tenant ? user.tenant.logo : null,
                tenantId: user.tenantId,
                phone: user.phone,
                profilePicture: user.profilePicture,
                isActive: user.isActive,
                createdAt: user.createdAt,
                permissions: user.permissions || [],
                mustChangePassword: user.mustChangePassword || false
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
    try {
        const { name, email, phone, company, currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Get current user
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prepare update data
        const updateData = {};

        if (name) updateData.name = name;
        if (email && email !== user.email) {
            // Check if email is already taken in THIS tenant
            // If user is trying to change email to one that exists in another tenant, it's fine!
            // But within this tenant, it must be unique.
            const emailExists = await prisma.user.findFirst({ where: { email, tenantId: user.tenantId } });
            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use in this company'
                });
            }
            updateData.email = email;
        }
        if (phone !== undefined) updateData.phone = phone;
        if (company !== undefined) updateData.company = company;

        // Handle profile picture upload
        if (req.file) {
            updateData.profilePicture = req.file.location || `/uploads/images/${req.file.filename}`;
        }

        // Handle password change
        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Password Complexity Check
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.'
                });
            }

            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(newPassword, salt);
            updateData.mustChangePassword = false; // Reset flag on success
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                company: true,
                phone: true,
                profilePicture: true,
                isActive: true,
                createdAt: true,
                permissions: true,
                mustChangePassword: true
            }
        });

        res.status(200).json({
            success: true,
            data: updatedUser,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify Invitation Token
// @route   POST /api/auth/verify-invite
// @access  Public
export const verifyInvite = async (req, res, next) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Invalid token' });
        }

        const user = await prisma.user.findFirst({
            where: { verificationCode: token }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationCode: null,
                isActive: true
            }
        });

        res.status(200).json({ success: true, message: 'Account verified successfully. You can now login.' });

    } catch (error) {
        next(error);
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        // Find all users with this email (might be in multiple tenants)
        const users = await prisma.user.findMany({ where: { email } });

        if (!users || users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get reset token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash token and set to resetPasswordToken field
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set expire
        const resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Update all associated accounts with this email
        await prisma.user.updateMany({
            where: { email },
            data: {
                resetPasswordToken,
                resetPasswordExpire
            }
        });

        // Create reset url
        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

        const message = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #2563eb;">Password Reset Request</h2>
                <p>You have requested a password reset. Please click the button below to set a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                <p>If you did not request this, please ignore this email.</p>
            </div>
        `;

        // Send email to the first user instance (they all share the same email)
        try {
            await sendEmail({
                email: users[0].email,
                subject: 'Password Reset Token',
                message
            });

            // For local development and testing
            const isDev = process.env.NODE_ENV !== 'production';

            res.status(200).json({
                success: true,
                message: 'Email sent. Please check your inbox.',
                devResetUrl: isDev ? resetUrl : undefined // Expose link for dev testing testing without SMTP
            });
        } catch (err) {
            logger.error({ err }, 'Email sending failed');

            // Revert on failure
            await prisma.user.updateMany({
                where: { email },
                data: {
                    resetPasswordToken: null,
                    resetPasswordExpire: null
                }
            });

            return res.status(500).json({ success: false, message: 'Email could not be sent. Please check SMTP configuration.' });
        }
    } catch (err) {
        next(err);
    }
};

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
export const resetPassword = async (req, res, next) => {
    try {
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resettoken)
            .digest('hex');

        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken,
                resetPasswordExpire: { gt: new Date() }
            },
            include: { tenant: true }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token' });
        }

        // Set new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        // Update all related accounts across tenants
        await prisma.user.updateMany({
            where: { resetPasswordToken },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpire: null,
                mustChangePassword: false
            }
        });

        // Generate token
        const token = generateToken(user.id);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: user.tenant ? user.tenant.name : user.company,
                permissions: user.permissions || [],
                mustChangePassword: false,
                companyLogo: user.tenant ? user.tenant.logo : null,
                tenantId: user.tenantId
            }
        });

    } catch (err) {
        next(err);
    }
};

