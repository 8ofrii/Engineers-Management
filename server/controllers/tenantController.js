import prisma from '../lib/prisma.js';
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
        if (name) updateData.name = name;
        if (address) updateData.address = address;
        if (phone) updateData.phone = phone;
        if (email) updateData.email = email;

        // Handle Logo Upload
        if (req.file) {
            updateData.logo = req.file.location || `/uploads/images/${req.file.filename}`;
        }

        const tenant = await prisma.tenant.update({
            where: { id: req.user.tenantId },
            data: updateData
        });

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
