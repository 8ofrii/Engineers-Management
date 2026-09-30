import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import sendEmail from '../utils/sendEmail.js';
import { getVerificationEmailHtml, getPasswordResetEmailHtml } from '../utils/emailTemplates.js';
import crypto from 'crypto';
import { generateSecret, verifyToken } from '../lib/totp.js';
import { auditFromReq } from '../lib/audit.js';
import logger from '../lib/logger.js';

// In-memory store for short-lived, single-use OAuth exchange codes (60s TTL)
const oauthExchangeCodes = new Map();

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id, purpose: 'session' }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
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

// Helper to generate cryptographically secure 6-digit OTP
const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

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

        // Send Verification Email using Enterprise HTML Template
        const message = getVerificationEmailHtml({
            companyName,
            adminName,
            verificationCode
        });

        try {
            await sendEmail({
                email: result.user.email,
                subject: `رمز تأكيد مساحة عمل ${companyName} - Hesaby ERP`,
                message
            });
        } catch (error) {
            logger.error({ err: error }, 'Email send error');
        }

        res.status(201).json({
            success: true,
            email: result.user.email,
            message: 'Registration successful. Verification code sent to your email.'
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

        const cleanCode = code.toString().trim();

        // Find user by email and verification code
        const user = await prisma.user.findFirst({
            where: {
                email: email.trim(),
                verificationCode: cleanCode
            },
            include: { tenant: true }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or verification code'
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'User is already verified'
            });
        }

        if (user.verificationExpires && user.verificationExpires < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Verification code expired. Please request a new one.'
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
                nameAr: updatedUser.nameAr,
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
                errorCode: 'MISSING_FIELDS',
                message: 'Please provide both email and password'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check for user(s) by email (case-insensitive)
        const users = await prisma.user.findMany({
            where: {
                email: {
                    equals: normalizedEmail,
                    mode: 'insensitive'
                }
            },
            include: { tenant: true }
        });

        const DUMMY_HASH = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUU1234567890';
        if (!users || users.length === 0) {
            await bcrypt.compare(password, DUMMY_HASH);
            return res.status(401).json({
                success: false,
                errorCode: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password'
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
                errorCode: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                errorCode: 'ACCOUNT_DEACTIVATED',
                message: 'Your account has been deactivated. Please contact your company administrator.'
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
                nameAr: user.nameAr,
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
                nameAr: user.nameAr,
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
                nameAr: user.nameAr,
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
        const { name, nameAr, email, phone, phones, company, currentPassword, newPassword } = req.body;
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

        if (name !== undefined) updateData.name = name;
        if (nameAr !== undefined) updateData.nameAr = nameAr ? nameAr.trim() : null;
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

        if (phones !== undefined || phone !== undefined) {
            let cleanPhones = [];
            if (Array.isArray(phones)) {
                cleanPhones = phones.map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);
            } else if (typeof phones === 'string') {
                try {
                    const parsed = JSON.parse(phones);
                    if (Array.isArray(parsed)) {
                        cleanPhones = parsed.map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);
                    } else if (phones.trim()) {
                        cleanPhones = [phones.trim()];
                    }
                } catch {
                    if (phones.trim()) cleanPhones = [phones.trim()];
                }
            }
            if (cleanPhones.length === 0 && phone) {
                cleanPhones = [phone.trim()].filter(Boolean);
            }
            if (cleanPhones.length > 0) {
                updateData.phones = cleanPhones;
                updateData.phone = cleanPhones[0];
            } else {
                updateData.phones = [];
                updateData.phone = null;
            }
        }
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
            updateData.passwordChangedAt = new Date();
            updateData.mustChangePassword = false; // Reset flag on success
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                nameAr: true,
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
        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide an email address' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find all active users with this email (might be in multiple tenants)
        const users = await prisma.user.findMany({
            where: {
                email: {
                    equals: normalizedEmail,
                    mode: 'insensitive'
                },
                isActive: true
            }
        });

        if (!users || users.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'A password reset link has been sent to your email if an account exists.'
            });
        }

        // Get reset token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash token and set to resetPasswordToken field
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set expire (15 minutes)
        const resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);

        // Update all associated accounts with this email
        await prisma.user.updateMany({
            where: {
                email: {
                    equals: normalizedEmail,
                    mode: 'insensitive'
                }
            },
            data: {
                resetPasswordToken,
                resetPasswordExpire
            }
        });

        // Create reset url
        const resetUrl = `${process.env.CLIENT_URL || 'https://hesaby.aimicromind.com'}/reset-password/${resetToken}`;

        const message = getPasswordResetEmailHtml({
            name: users[0].name,
            resetUrl
        });

        try {
            await sendEmail({
                email: users[0].email,
                subject: 'طلب إعادة تعيين كلمة المرور - Hesaby ERP',
                message
            });

            res.status(200).json({
                success: true,
                message: 'A password reset link has been sent to your email. Please check your inbox.'
            });
        } catch (err) {
            logger.error({ err }, 'Email sending failed');

            // Revert on failure
            await prisma.user.updateMany({
                where: {
                    email: {
                        equals: normalizedEmail,
                        mode: 'insensitive'
                    }
                },
                data: {
                    resetPasswordToken: null,
                    resetPasswordExpire: null
                }
            });

            return res.status(500).json({ success: false, message: 'Email could not be sent. Please check your connection or try again later.' });
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
                passwordChangedAt: new Date(),
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

// @desc    Preview invitation details from token or invite link
// @route   POST /api/auth/invite/preview
// @access  Public
export const previewInvite = async (req, res, next) => {
    try {
        let { token } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, message: 'Invite token is required' });
        }

        // If the user pasted the entire invite URL, extract the token
        if (token.includes('invite=')) {
            try {
                const url = new URL(token.startsWith('http') ? token : `http://${token}`);
                token = url.searchParams.get('invite') || token;
            } catch {
                const match = token.match(/invite=([a-zA-Z0-9_-]+)/);
                if (match) token = match[1];
            }
        } else if (token.includes('token=')) {
            try {
                const url = new URL(token.startsWith('http') ? token : `http://${token}`);
                token = url.searchParams.get('token') || token;
            } catch {
                const match = token.match(/token=([a-zA-Z0-9_-]+)/);
                if (match) token = match[1];
            }
        }

        const cleanToken = token.trim();

        const user = await prisma.user.findFirst({
            where: {
                verificationCode: {
                    equals: cleanToken,
                    mode: 'insensitive'
                }
            },
            include: {
                tenant: true,
                customRole: { select: { name: true } }
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Invalid invitation code or link.' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'This invitation has already been accepted and verified. Please log in.' });
        }

        if (user.verificationExpires && user.verificationExpires < new Date()) {
            return res.status(400).json({ success: false, message: 'This invitation has expired. Please contact your company administrator to resend an invite.' });
        }

        const roleDisplay = user.customRole?.name || user.role;

        res.json({
            success: true,
            data: {
                token: cleanToken,
                email: user.email,
                name: user.name,
                role: user.role,
                roleDisplayName: roleDisplay,
                companyName: user.tenant ? user.tenant.name : user.company || 'Hesaby ERP Workspace',
                companyLogo: user.tenant?.logo || null
            }
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Accept invitation and complete user signup to existing company
// @route   POST /api/auth/invite/accept-signup
// @access  Public
export const acceptInviteSignup = async (req, res, next) => {
    try {
        let { token, name, phone, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Invite token and password are required.' });
        }

        // Extract token if full URL was provided
        if (token.includes('invite=')) {
            try {
                const url = new URL(token.startsWith('http') ? token : `http://${token}`);
                token = url.searchParams.get('invite') || token;
            } catch {
                const match = token.match(/invite=([a-zA-Z0-9_-]+)/);
                if (match) token = match[1];
            }
        } else if (token.includes('token=')) {
            try {
                const url = new URL(token.startsWith('http') ? token : `http://${token}`);
                token = url.searchParams.get('token') || token;
            } catch {
                const match = token.match(/token=([a-zA-Z0-9_-]+)/);
                if (match) token = match[1];
            }
        }

        const cleanToken = token.trim();

        const user = await prisma.user.findFirst({
            where: {
                verificationCode: {
                    equals: cleanToken,
                    mode: 'insensitive'
                }
            },
            include: { tenant: true }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired invitation token.' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'This invitation has already been accepted.' });
        }

        if (user.verificationExpires && user.verificationExpires < new Date()) {
            return res.status(400).json({ success: false, message: 'This invitation has expired. Please contact your company administrator to resend an invite.' });
        }

        // Validate password complexity
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!strongPasswordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long and include uppercase, lowercase, digit, and special character.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                name: (name && name.trim()) || user.name,
                phone: (phone && phone.trim()) || user.phone,
                password: hashedPassword,
                isVerified: true,
                verificationCode: null,
                verificationExpires: null,
                isActive: true,
                mustChangePassword: false
            },
            include: { tenant: true }
        });

        await auditFromReq(req, {
            action: 'ACCEPT_INVITE',
            entity: 'User',
            entityId: updatedUser.id,
            after: updatedUser,
            metadata: { acceptedRole: updatedUser.role }
        });

        const authToken = generateToken(updatedUser.id);

        res.json({
            success: true,
            token: authToken,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                company: updatedUser.tenant ? updatedUser.tenant.name : updatedUser.company,
                permissions: updatedUser.permissions || [],
                companyLogo: updatedUser.tenant?.logo || null,
                tenantId: updatedUser.tenantId
            }
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Initiate Google OAuth 2.0 Redirect
// @route   GET /api/auth/google
// @access  Public
export const googleRedirect = async (req, res, next) => {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID || '1023456789012-hesabyexample.apps.googleusercontent.com';
        const clientUrl = process.env.CLIENT_URL || 'https://hesaby.aimicromind.com';
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${clientUrl}/api/auth/google/callback`;

        // Generate cryptographically secure anti-CSRF state token
        const state = crypto.randomBytes(32).toString('hex');
        res.cookie('oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000 // 10 minutes
        });

        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&prompt=select_account&access_type=offline&state=${encodeURIComponent(state)}`;

        res.redirect(googleAuthUrl);
    } catch (err) {
        next(err);
    }
};

// @desc    Handle Google OAuth 2.0 Callback
// @route   GET /api/auth/google/callback
// @access  Public
export const googleCallback = async (req, res, next) => {
    const clientUrl = process.env.CLIENT_URL || 'https://hesaby.aimicromind.com';
    try {
        const { code, state, error } = req.query;

        if (error) {
            return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(error)}`);
        }

        // Anti-CSRF state token validation
        const cookieState = req.cookies?.oauth_state;
        if (!state || !cookieState || state !== cookieState) {
            return res.redirect(`${clientUrl}/login?error=invalid_oauth_state`);
        }
        res.clearCookie('oauth_state');

        if (!code) {
            return res.redirect(`${clientUrl}/login?error=missing_code`);
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${clientUrl}/api/auth/google/callback`;

        if (!clientId || !clientSecret) {
            // Google credentials need to be configured in .env
            return res.redirect(`${clientUrl}/signup?googleNotice=need_credentials`);
        }

        // Exchange authorization code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData.access_token) {
            return res.redirect(`${clientUrl}/login?error=google_token_exchange_failed`);
        }

        // Fetch User Info from Google
        const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        const profile = await userinfoResponse.json();
        if (!profile.email) {
            return res.redirect(`${clientUrl}/login?error=no_email_returned`);
        }

        // Check if user exists in database
        const existingUser = await prisma.user.findFirst({
            where: { email: profile.email },
            include: { tenant: true }
        });

        if (existingUser) {
            const exchangeCode = crypto.randomBytes(32).toString('hex');
            oauthExchangeCodes.set(exchangeCode, {
                userId: existingUser.id,
                expiresAt: Date.now() + 60000 // 60s single-use TTL
            });
            return res.redirect(`${clientUrl}/login?code=${encodeURIComponent(exchangeCode)}`);
        }

        // New user: Redirect to signup with verified Google details
        return res.redirect(
            `${clientUrl}/signup?googleEmail=${encodeURIComponent(profile.email)}&googleName=${encodeURIComponent(profile.name || '')}&googleVerified=true`
        );
    } catch (err) {
        console.error('Google OAuth callback error:', err);
        return res.redirect(`${clientUrl}/login?error=oauth_internal_error`);
    }
};

// @desc    Exchange one-time OAuth code for session token
// @route   POST /api/auth/oauth-exchange
// @access  Public
export const exchangeOAuthCode = async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, message: 'OAuth exchange code is required' });
        }

        const entry = oauthExchangeCodes.get(code);
        if (!entry || entry.expiresAt < Date.now()) {
            oauthExchangeCodes.delete(code);
            return res.status(400).json({ success: false, message: 'Invalid or expired exchange code' });
        }

        // Single-use guarantee
        oauthExchangeCodes.delete(code);

        const user = await prisma.user.findUnique({
            where: { id: entry.userId },
            include: { tenant: true, customRole: true }
        });

        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, message: 'User not found or account is deactivated' });
        }

        const token = generateToken(user.id);
        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                company: user.company,
                phone: user.phone,
                profilePicture: user.profilePicture,
                permissions: user.permissions,
                tenantId: user.tenantId,
                tenant: user.tenant,
                customRole: user.customRole
            }
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete Personal User Account
// @route   DELETE /api/auth/account
// @access  Private
export const deleteAccount = async (req, res, next) => {
    try {
        const { password } = req.body;
        const userId = req.user.id;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required to delete your account' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }

        // If user is ADMIN of a tenant with multiple active users, prevent deleting without transferring admin or deleting company
        if (user.role === 'ADMIN' && user.tenantId) {
            const otherUsersCount = await prisma.user.count({
                where: { tenantId: user.tenantId, NOT: { id: userId }, isActive: true }
            });
            if (otherUsersCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'You are the Admin of an active workspace with team members. Please transfer admin role or delete the workspace in Company Settings first.'
                });
            }
        }

        // Check if user has dependent financial history
        const [hasTransactions, hasProjects, hasInvoices, hasDsrs, hasAuditLogs] = await Promise.all([
            prisma.transaction.count({ where: { OR: [{ createdBy: userId }, { approvedById: userId }, { payerId: userId }] } }),
            prisma.project.count({ where: { engineerId: userId } }),
            prisma.invoice.count({ where: { createdBy: userId } }),
            prisma.dailySiteReport.count({ where: { OR: [{ reportedBy: userId }, { acknowledgedBy: userId }] } }),
            prisma.auditLog.count({ where: { userId: userId } })
        ]);

        const hasHistory = (hasTransactions + hasProjects + hasInvoices + hasDsrs + hasAuditLogs) > 0;

        if (hasHistory) {
            // Soft delete: deactivate user
            await prisma.user.update({
                where: { id: userId },
                data: {
                    isActive: false,
                    isVerified: false,
                    password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
                    totpEnabled: false,
                    totpSecret: null,
                    verificationCode: null,
                    resetPasswordToken: null,
                    name: `${user.name} (Deleted User)`,
                    email: `deleted_${userId.slice(0, 8)}_${user.email}`
                }
            });
        } else {
            // Clean hard delete
            await prisma.user.delete({ where: { id: userId } });
        }

        await auditFromReq(req, {
            action: 'DELETE',
            entity: 'User',
            entityId: userId,
            metadata: { selfDeleted: true }
        });

        res.json({ success: true, message: 'Your account has been deleted.' });
    } catch (err) {
        next(err);
    }
};

