import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import { auditFromReq } from '../lib/audit.js';
import { DEFAULT_THRESHOLDS, validateThresholds } from '../lib/approvalThresholds.js';

// @desc    Get Tenant Settings
// @route   GET /api/tenant
// @access  Private (Admin & Employees)
export const getTenant = async (req, res, next) => {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: req.user.tenantId }
        });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        res.status(200).json({
            success: true,
            data: tenant
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update Tenant Settings (Logo, Details)
// @route   PUT /api/tenant
// @access  Private (Admin Only)
export const updateTenant = async (req, res, next) => {
    try {
        const { name, address, phone, email } = req.body;

        // Check if user is Admin
        if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update company settings'
            });
        }

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (address !== undefined) updateData.address = address ? address.trim() : null;
        if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
        if (email !== undefined) updateData.email = email ? email.trim() : null;

        // Handle Logo Upload
        if (req.file) {
            updateData.logo = req.file.location || `/uploads/images/${req.file.filename}`;
        }

        const tenant = await prisma.tenant.update({
            where: { id: req.user.tenantId },
            data: updateData
        });

        if (name) {
            await prisma.user.updateMany({
                where: { tenantId: req.user.tenantId },
                data: { company: name.trim() }
            });
        }

        res.status(200).json({
            success: true,
            data: tenant,
            message: 'Company settings updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get the tenant's multi-level approval thresholds.
// @route   GET /api/tenant/approval-thresholds
// @access  Private (Admin / Super Admin)
export const getApprovalThresholds = async (req, res, next) => {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: req.user.tenantId },
            select: { approvalThresholds: true }
        });
        const thresholds = Array.isArray(tenant?.approvalThresholds)
            ? tenant.approvalThresholds
            : DEFAULT_THRESHOLDS;
        const isCustom = Array.isArray(tenant?.approvalThresholds);

        res.status(200).json({
            success: true,
            data: { thresholds, isCustom, defaults: DEFAULT_THRESHOLDS }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update the tenant's multi-level approval thresholds.
// @route   PUT /api/tenant/approval-thresholds
// @access  Private (Admin / Super Admin)
//
// Body: { thresholds: [{ maxAmount, minRole }, ...] }   OR   { thresholds: null } to reset to defaults.
export const updateApprovalThresholds = async (req, res, next) => {
    try {
        if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const incoming = req.body?.thresholds;
        if (incoming !== null) {
            const err = validateThresholds(incoming);
            if (err) return res.status(400).json({ success: false, message: err });
        }

        const before = await prisma.tenant.findUnique({
            where: { id: req.user.tenantId },
            select: { approvalThresholds: true }
        });

        const tenant = await prisma.tenant.update({
            where: { id: req.user.tenantId },
            data: { approvalThresholds: incoming === null ? null : incoming }
        });

        await auditFromReq(req, {
            action: 'UPDATE',
            entity: 'TenantApprovalThresholds',
            entityId: req.user.tenantId,
            before: before?.approvalThresholds || null,
            after: tenant.approvalThresholds
        });

        res.status(200).json({
            success: true,
            data: { thresholds: tenant.approvalThresholds || DEFAULT_THRESHOLDS, isCustom: !!tenant.approvalThresholds },
            message: 'Approval thresholds updated'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete Company (Tenant) and all associated workspace data
// @route   DELETE /api/tenant
// @access  Private (Admin Only)
export const deleteTenant = async (req, res, next) => {
    try {
        const { password, confirmCompanyName } = req.body;
        const tenantId = req.user.tenantId;

        if (!tenantId) {
            return res.status(400).json({ success: false, message: 'No company associated with this account' });
        }

        // Only ADMIN or SUPER_ADMIN may delete the company
        if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ success: false, message: 'Only the company owner/admin can delete this workspace' });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId }
        });

        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        // 1. Validate Company Name confirmation
        if (!confirmCompanyName || confirmCompanyName.trim().toLowerCase() !== tenant.name.trim().toLowerCase()) {
            return res.status(400).json({
                success: false,
                message: 'Company name confirmation does not match. Please type the exact company name.'
            });
        }

        // 2. Validate Password
        if (!password) {
            return res.status(400).json({ success: false, message: 'Admin password is required to delete the workspace' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect password. Deletion cancelled.' });
        }

        // 3. Perform Cascade Deletion in a safe atomic transaction
        await prisma.$transaction(async (tx) => {
            // Delete child and related tenant entities
            await tx.auditLog.deleteMany({ where: { tenantId } });
            await tx.chatMessage.deleteMany({ where: { tenantId } });
            await tx.dailySiteReport.deleteMany({ where: { tenantId } });
            await tx.invoice.deleteMany({ where: { tenantId } });
            await tx.transactionDraft.deleteMany({ where: { tenantId } });
            await tx.transaction.deleteMany({ where: { tenantId } });
            await tx.custodyTransfer.deleteMany({ where: { tenantId } });
            await tx.document.deleteMany({ where: { tenantId } });
            await tx.materialUsage.deleteMany({ where: { tenantId } });
            await tx.materialBatch.deleteMany({ where: { tenantId } });
            await tx.material.deleteMany({ where: { tenantId } });
            await tx.projectCategoryFee.deleteMany({ where: { tenantId } });
            await tx.globalCategoryFee.deleteMany({ where: { tenantId } });
            await tx.projectCostItem.deleteMany({ where: { tenantId } });
            await tx.workmanship.deleteMany({ where: { tenantId } });
            await tx.workman.deleteMany({ where: { tenantId } });
            await tx.note.deleteMany({ where: { tenantId } });
            await tx.notification.deleteMany({ where: { tenantId } });
            await tx.project.deleteMany({ where: { tenantId } });
            await tx.supplier.deleteMany({ where: { tenantId } });
            await tx.client.deleteMany({ where: { tenantId } });
            await tx.bankStatementRow.deleteMany({ where: { tenantId } });
            await tx.bankStatement.deleteMany({ where: { tenantId } });
            await tx.paymentAttempt.deleteMany({ where: { tenantId } });
            await tx.subscription.deleteMany({ where: { tenantId } });
            await tx.role.deleteMany({ where: { tenantId } });
            await tx.user.deleteMany({ where: { tenantId } });

            // Finally delete the Tenant
            await tx.tenant.delete({ where: { id: tenantId } });
        }, { timeout: 30000, maxWait: 10000 });

        res.status(200).json({
            success: true,
            message: 'Company and all associated data have been permanently deleted.'
        });
    } catch (error) {
        next(error);
    }
};
