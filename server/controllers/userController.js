import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import sendEmail from '../utils/sendEmail.js';
import { getUserInviteEmailHtml } from '../utils/emailTemplates.js';
import crypto from 'crypto';
import { auditFromReq } from '../lib/audit.js';
import logger from '../lib/logger.js';
import { getPlan } from '../lib/plans.js';

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
                roleId: true,
                customRole: {
                    select: { id: true, name: true }
                },
                phone: true,
                phones: true,
                profilePicture: true,
                company: true,
                permissions: true,
                currentCustodyBalance: true,
                isActive: true,
                isVerified: true,
                verificationCode: true,
                verificationExpires: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: users });
    } catch (err) {
        logger.error({ err }, 'Failed to fetch users');
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

// Add New User (Invite)
export const inviteUser = async (req, res) => {
    const { email, role, roleId, permissions, name } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Only SUPER_ADMIN may grant SUPER_ADMIN — prevents tenant ADMINs from
    // escalating to platform-level access by inviting a peer with that role.
    if (role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'You are not authorized to assign the SUPER_ADMIN role' });
    }

    try {
        // Enforce Plan Capacity Limits
        const [sub, tenant, activeUserCount] = await Promise.all([
            prisma.subscription.findFirst({
                where: { tenantId: req.user.tenantId, status: 'ACTIVE' },
                select: { plan: true }
            }),
            prisma.tenant.findUnique({
                where: { id: req.user.tenantId },
                select: { subscriptionPlan: true, name: true }
            }),
            prisma.user.count({
                where: { tenantId: req.user.tenantId, isActive: true }
            })
        ]);

        const planKey = sub?.plan || tenant?.subscriptionPlan || 'FREE';
        const plan = getPlan(planKey);
        if (plan.limits.maxUsers !== -1 && activeUserCount >= plan.limits.maxUsers) {
            return res.status(403).json({
                success: false,
                code: 'USER_LIMIT_REACHED',
                message: `You have reached the maximum seat limit of ${plan.limits.maxUsers} user(s) for the ${plan.name}. Please upgrade your plan in Billing to add more team members.`,
                limit: plan.limits.maxUsers,
                current: activeUserCount
            });
        }

        // Check if user exists in THIS tenant
        const existingUser = await prisma.user.findFirst({
            where: {
                email: { equals: normalizedEmail, mode: 'insensitive' },
                tenantId: req.user.tenantId
            }
        });

        if (existingUser && existingUser.isVerified) {
            return res.status(400).json({ success: false, message: 'A verified team member with this email already exists in your company' });
        }

        // Generate clean human-readable invite token
        const inviteToken = 'HSB-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        const verificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        const placeholderPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
        const companyName = tenant?.name || req.user.company || 'Hesaby ERP';

        let newUser;
        if (existingUser && !existingUser.isVerified) {
            // Update existing pending invite
            newUser = await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    name: (name && name.trim()) || existingUser.name || normalizedEmail.split('@')[0],
                    role: role || 'ENGINEER',
                    roleId: roleId || null,
                    permissions: permissions || [],
                    verificationCode: inviteToken,
                    verificationExpires,
                    isActive: true
                },
                select: {
                    id: true, name: true, email: true, role: true, roleId: true, permissions: true, isVerified: true, verificationCode: true, verificationExpires: true
                }
            });
        } else {
            // Create new pending member
            newUser = await prisma.user.create({
                data: {
                    name: (name && name.trim()) || normalizedEmail.split('@')[0],
                    email: normalizedEmail,
                    password: placeholderPassword,
                    role: role || 'ENGINEER',
                    roleId: roleId || null,
                    tenantId: req.user.tenantId,
                    isActive: true,
                    isVerified: false,
                    verificationCode: inviteToken,
                    verificationExpires,
                    company: companyName,
                    permissions: permissions || []
                },
                select: {
                    id: true, name: true, email: true, role: true, roleId: true, permissions: true, isVerified: true, verificationCode: true, verificationExpires: true
                }
            });
        }

        await auditFromReq(req, {
            action: 'INVITE',
            entity: 'User',
            entityId: newUser.id,
            after: newUser,
            metadata: { invitedRole: newUser.role, inviteToken }
        });

        // Send Invitation Email
        const clientBase = process.env.CLIENT_URL || 'https://hesaby.aimicromind.com';
        const inviteLink = `${clientBase}/signup?invite=${inviteToken}`;

        try {
            const message = getUserInviteEmailHtml({
                name: newUser.name,
                companyName,
                email: newUser.email,
                roleName: role || 'ENGINEER',
                inviteCode: inviteToken,
                inviteLink
            });

            await sendEmail({
                email: newUser.email,
                subject: `دعوة للانضمام إلى مساحة عمل ${companyName} - Hesaby ERP`,
                message
            });
        } catch (emailError) {
            logger.error({ err: emailError }, 'Failed to send invitation email');
        }

        res.status(201).json({
            success: true,
            data: {
                ...newUser,
                inviteToken,
                inviteLink
            },
            message: `Invitation generated and dispatched to ${newUser.email}`
        });

    } catch (err) {
        logger.error({ err }, 'Failed to create user invitation');
        res.status(500).json({ success: false, message: 'Failed to create user invitation' });
    }
};

// Resend Invitation Email & Refresh Code
export const resendInvite = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findFirst({
            where: {
                id,
                tenantId: req.user.tenantId
            },
            include: { tenant: true }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Invited member not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'User has already verified and joined this workspace' });
        }

        const inviteToken = user.verificationCode || ('HSB-' + crypto.randomBytes(4).toString('hex').toUpperCase());
        const verificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationCode: inviteToken,
                verificationExpires
            }
        });

        const clientBase = process.env.CLIENT_URL || 'https://hesaby.aimicromind.com';
        const inviteLink = `${clientBase}/signup?invite=${inviteToken}`;
        const companyName = user.tenant?.name || req.user.company || 'Hesaby ERP';

        try {
            const message = getUserInviteEmailHtml({
                name: user.name,
                companyName,
                email: user.email,
                roleName: user.role,
                inviteCode: inviteToken,
                inviteLink
            });

            await sendEmail({
                email: user.email,
                subject: `تذكير: دعوة للانضمام إلى مساحة عمل ${companyName} - Hesaby ERP`,
                message
            });
        } catch (emailError) {
            logger.error({ err: emailError }, 'Failed to resend invitation email');
        }

        res.json({
            success: true,
            data: {
                inviteToken,
                inviteLink
            },
            message: `Invitation email re-sent to ${user.email}`
        });

    } catch (err) {
        logger.error({ err }, 'Failed to resend invite');
        res.status(500).json({ success: false, message: 'Failed to resend invitation' });
    }
};

// Update User (Role/Details)
export const updateUser = async (req, res) => {
    const { id } = req.params;
    const { role, name, phone, phones, permissions, password } = req.body;

    // Only SUPER_ADMIN may grant SUPER_ADMIN. Also forbid demoting an existing
    // SUPER_ADMIN unless the caller is one — otherwise an ADMIN could lock out
    // the platform owner.
    if (role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'You are not authorized to assign the SUPER_ADMIN role' });
    }
    if (role && role !== 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        const target = await prisma.user.findFirst({
            where: { id, tenantId: req.user.tenantId },
            select: { role: true }
        });
        if (target?.role === 'SUPER_ADMIN') {
            return res.status(403).json({ success: false, message: 'You are not authorized to modify a SUPER_ADMIN' });
        }
    }

    let normalizedPhones = undefined;
    let primaryPhone = phone !== undefined ? (phone ? phone.trim() : null) : undefined;
    if (Array.isArray(phones)) {
        normalizedPhones = phones.map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);
        primaryPhone = normalizedPhones[0] || null;
    }

    // Verify new primary phone isn't taken by another user if provided
    if (primaryPhone) {
        const phoneExists = await prisma.user.findFirst({
            where: {
                phone: primaryPhone,
                tenantId: req.user.tenantId,
                NOT: { id }
            }
        });
        if (phoneExists) {
            return res.status(400).json({ success: false, message: 'Phone number already in use by another member' });
        }
    }

    try {
        const before = await prisma.user.findFirst({
            where: { id, tenantId: req.user.tenantId },
            select: { id: true, name: true, email: true, role: true, phone: true, phones: true, permissions: true, isActive: true }
        });

        const updateData = { role, name, permissions };
        if (normalizedPhones !== undefined) {
            updateData.phones = normalizedPhones;
            updateData.phone = primaryPhone;
        } else if (phone !== undefined) {
            updateData.phone = primaryPhone;
            updateData.phones = primaryPhone ? [primaryPhone] : [];
        }

        if (password) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(password)) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.'
                });
            }
            updateData.password = await bcrypt.hash(password, 10);
            updateData.mustChangePassword = true;
        }

        const user = await prisma.user.update({
            where: { id, tenantId: req.user.tenantId },
            data: updateData
        });

        const isRoleChange = role && before && role !== before.role;
        await auditFromReq(req, {
            action: isRoleChange ? 'ROLE_CHANGE' : 'UPDATE',
            entity: 'User',
            entityId: user.id,
            before,
            after: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, phones: user.phones, permissions: user.permissions, isActive: user.isActive },
            metadata: isRoleChange ? { from: before?.role, to: role } : undefined
        });

        res.json({ success: true, data: user, message: 'User updated successfully' });
    } catch (err) {
        logger.error({ err }, 'Failed to update user');
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
};

// Delete User
export const deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        // Prevent deleting self
        if (id === req.user.id) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account from the team page. Use Profile settings to delete your account.' });
        }

        // Only a SUPER_ADMIN may delete a SUPER_ADMIN.
        if (req.user.role !== 'SUPER_ADMIN') {
            const target = await prisma.user.findFirst({
                where: { id, tenantId: req.user.tenantId },
                select: { role: true }
            });
            if (target?.role === 'SUPER_ADMIN') {
                return res.status(403).json({ success: false, message: 'You are not authorized to delete a SUPER_ADMIN' });
            }
        }

        const before = await prisma.user.findFirst({
            where: { id, tenantId: req.user.tenantId },
            select: { id: true, name: true, email: true, role: true }
        });

        if (!before) {
            return res.status(404).json({ success: false, message: 'User not found in your company' });
        }

        // Check if user has associated history that requires soft-deletion
        const [hasTransactions, hasProjects, hasInvoices, hasDsrs, hasAuditLogs] = await Promise.all([
            prisma.transaction.count({ where: { OR: [{ createdBy: id }, { approvedBy: id }, { payerUserId: id }] } }),
            prisma.project.count({ where: { engineerId: id } }),
            prisma.invoice.count({ where: { createdBy: id } }),
            prisma.dailySiteReport.count({ where: { OR: [{ reportedBy: id }, { acknowledgedBy: id }] } }),
            prisma.auditLog.count({ where: { userId: id } })
        ]);

        const hasHistory = (hasTransactions + hasProjects + hasInvoices + hasDsrs + hasAuditLogs) > 0;

        if (hasHistory) {
            // Soft delete: deactivate user, scramble credentials & release email so company can re-invite if needed
            await prisma.user.update({
                where: { id },
                data: {
                    isActive: false,
                    isVerified: false,
                    password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
                    totpEnabled: false,
                    totpSecret: null,
                    verificationCode: null,
                    resetPasswordToken: null,
                    name: `${before.name} (Archived)`,
                    email: `archived_${id.slice(0, 8)}_${before.email}`
                }
            });
        } else {
            // Clean hard-delete
            await prisma.user.delete({
                where: { id, tenantId: req.user.tenantId }
            });
        }

        await auditFromReq(req, {
            action: 'DELETE',
            entity: 'User',
            entityId: id,
            before,
            metadata: { softDelete: hasHistory }
        });

        res.json({ success: true, message: 'User removed from team successfully' });
    } catch (err) {
        logger.error({ err }, 'Failed to delete user');
        res.status(500).json({ success: false, message: 'Failed to delete user: ' + (err.message || 'Database error') });
    }
};
