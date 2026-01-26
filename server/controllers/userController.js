import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import sendEmail from '../utils/sendEmail.js';
import crypto from 'crypto';

// Get All Users
export const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { tenantId: req.user.tenantId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                profilePicture: true,
                company: true,
                permissions: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: users });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

// Add New User (Invite)
export const inviteUser = async (req, res) => {
    const { name, email, role, password, phone, permissions } = req.body;

    // Validate Input: Email and Phone are mandatory
    if (!name || !email || !password || !phone) {
        return res.status(400).json({ success: false, message: 'Please provide all required fields (Name, Email, Password, Phone)' });
    }

    try {
        // Check if user exists in THIS tenant (email unique per tenant)
        const emailExists = await prisma.user.findFirst({
            where: {
                email,
                tenantId: req.user.tenantId
            }
        });
        if (emailExists) {
            return res.status(400).json({ success: false, message: 'User with this email already exists in this company' });
        }

        // Check if user exists in THIS tenant with same phone
        const phoneExists = await prisma.user.findFirst({
            where: {
                phone,
                tenantId: req.user.tenantId
            }
        });
        if (phoneExists) {
            return res.status(400).json({ success: false, message: 'User with this phone number already exists in this company' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'ENGINEER',
                phone: phone, // Mandatory now
                tenantId: req.user.tenantId,
                isActive: true,
                isVerified: false, // User must verify via email
                verificationCode: verificationToken,
                company: req.user.company,
                permissions: permissions || [],
                mustChangePassword: true
            },
            select: {
                id: true, name: true, email: true, role: true
            }
        });

        // Send Invitation Email
        try {
            const verifyLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-invite?token=${verificationToken}`;

            const message = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #2563eb;">Welcome to Team!</h2>
                    <p>Hello <strong>${name}</strong>,</p>
                    <p>You have been invited to join the Engineers Management System.</p>
                    <p>Please verifying your account by clicking the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verifyLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Account</a>
                    </div>
                    <p>Below are your temporary login credentials:</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                        <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
                    </div>
                    <p style="color: #dc2626;"><strong>Important:</strong> You must verify your account before logging in. You will be required to change your password upon first login.</p>
                </div>
            `;

            await sendEmail({
                email: newUser.email,
                subject: 'Verify Your Account - Engineers Management',
                message
            });
        } catch (emailError) {
            console.error('Failed to send invitation email:', emailError);
        }

        res.status(201).json({ success: true, data: newUser, message: 'User invited. Verification email sent.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create user' });
    }
};

// Update User (Role/Details)
export const updateUser = async (req, res) => {
    const { id } = req.params;
    const { role, name, phone, permissions } = req.body;

    // Verify new phone isn't taken by another user
    if (phone) {
        const phoneExists = await prisma.user.findFirst({
            where: {
                phone,
                tenantId: req.user.tenantId,
                NOT: { id }
            }
        });
        if (phoneExists) {
            return res.status(400).json({ success: false, message: 'Phone number already in use by another member' });
        }
    }

    try {
        const user = await prisma.user.update({
            where: { id, tenantId: req.user.tenantId },
            data: {
                role,
                name,
                phone,
                permissions
            }
        });
        res.json({ success: true, data: user, message: 'User updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
};

// Delete User
export const deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        // Prevent deleting self
        if (id === req.user.id) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
        }

        await prisma.user.delete({
            where: { id, tenantId: req.user.tenantId }
        });
        res.json({ success: true, message: 'User removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
};
