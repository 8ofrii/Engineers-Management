import prisma from '../lib/prisma.js';
import { auditFromReq } from '../lib/audit.js';

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
export const getSuppliers = async (req, res, next) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            where: {
                tenantId: req.user.tenantId,
                deletedAt: null
            },
            include: {
                transactions: {
                    where: {
                        status: 'APPROVED',
                        type: 'EXPENSE'
                    },
                    select: {
                        id: true,
                        amount: true,
                        projectId: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const formatted = suppliers.map(s => {
            const totalPaid = (s.transactions || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
            return {
                ...s,
                totalPaid,
                categories: (Array.isArray(s.categories) && s.categories.length > 0) ? s.categories : (s.category ? [s.category] : []),
                suppliedItems: Array.isArray(s.suppliedItems) ? s.suppliedItems : []
            };
        });

        res.status(200).json({
            success: true,
            count: formatted.length,
            data: formatted
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single supplier
// @route   GET /api/suppliers/:id
// @access  Private
export const getSupplier = async (req, res, next) => {
    try {
        const supplier = await prisma.supplier.findFirst({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId,
                deletedAt: null
            },
            include: {
                transactions: {
                    where: {
                        status: 'APPROVED',
                        type: 'EXPENSE'
                    },
                    select: {
                        id: true,
                        amount: true,
                        projectId: true
                    }
                }
            }
        });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }

        const totalPaid = (supplier.transactions || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

        const formatted = {
            ...supplier,
            totalPaid,
            categories: (Array.isArray(supplier.categories) && supplier.categories.length > 0) ? supplier.categories : (supplier.category ? [supplier.category] : []),
            suppliedItems: Array.isArray(supplier.suppliedItems) ? supplier.suppliedItems : []
        };

        res.status(200).json({
            success: true,
            data: formatted
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create supplier
// @route   POST /api/suppliers
// @access  Private
export const createSupplier = async (req, res, next) => {
    try {
        const data = { ...req.body, tenantId: req.user.tenantId };
        if (Array.isArray(data.phones)) {
            data.phones = data.phones.map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);
            if (!data.phone && data.phones.length > 0) {
                data.phone = data.phones[0];
            } else if (data.phone && !data.phones.includes(data.phone.trim())) {
                data.phones = [data.phone.trim(), ...data.phones];
            }
        } else if (data.phone) {
            data.phones = [data.phone.trim()];
        }
        if (!data.email) data.email = "-";
        if (!data.phone) data.phone = data.phones?.[0] || "-";

        // Multi-category & supplied items normalization
        if (Array.isArray(data.categories)) {
            data.categories = [...new Set(data.categories.filter(Boolean))];
            if (data.categories.length > 0) {
                data.category = data.categories[0];
            } else if (data.category) {
                data.categories = [data.category];
            }
        } else if (data.category) {
            data.categories = [data.category];
        }

        if (Array.isArray(data.suppliedItems)) {
            data.suppliedItems = [...new Set(data.suppliedItems.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean))];
        } else if (typeof data.suppliedItems === 'string') {
            data.suppliedItems = data.suppliedItems.split(',').map(s => s.trim()).filter(Boolean);
        }

        const supplier = await prisma.supplier.create({
            data: data
        });

        await auditFromReq(req, {
            action: 'CREATE',
            entity: 'Supplier',
            entityId: supplier.id,
            after: supplier
        });

        res.status(201).json({
            success: true,
            data: {
                ...supplier,
                categories: (Array.isArray(supplier.categories) && supplier.categories.length > 0) ? supplier.categories : (supplier.category ? [supplier.category] : []),
                suppliedItems: Array.isArray(supplier.suppliedItems) ? supplier.suppliedItems : []
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private
export const updateSupplier = async (req, res, next) => {
    try {
        const before = await prisma.supplier.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }
        });

        if (!before) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found or unauthorized'
            });
        }

        const data = { ...req.body };
        if (Array.isArray(data.phones)) {
            data.phones = data.phones.map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);
            if (!data.phone && data.phones.length > 0) {
                data.phone = data.phones[0];
            } else if (data.phone && !data.phones.includes(data.phone.trim())) {
                data.phones = [data.phone.trim(), ...data.phones];
            }
        } else if (data.phone !== undefined) {
            data.phones = data.phone ? [data.phone.trim()] : [];
        }

        // Multi-category & supplied items normalization
        if (Array.isArray(data.categories)) {
            data.categories = [...new Set(data.categories.filter(Boolean))];
            if (data.categories.length > 0) {
                data.category = data.categories[0];
            }
        } else if (data.category && (!data.categories || data.categories.length === 0)) {
            data.categories = [data.category];
        }

        if (Array.isArray(data.suppliedItems)) {
            data.suppliedItems = [...new Set(data.suppliedItems.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean))];
        } else if (typeof data.suppliedItems === 'string') {
            data.suppliedItems = data.suppliedItems.split(',').map(s => s.trim()).filter(Boolean);
        }

        const updated = await prisma.supplier.update({
            where: { id: req.params.id },
            data: data
        });

        await auditFromReq(req, {
            action: 'UPDATE',
            entity: 'Supplier',
            entityId: updated.id,
            before,
            after: updated
        });

        res.status(200).json({
            success: true,
            data: {
                ...updated,
                categories: (Array.isArray(updated.categories) && updated.categories.length > 0) ? updated.categories : (updated.category ? [updated.category] : []),
                suppliedItems: Array.isArray(updated.suppliedItems) ? updated.suppliedItems : []
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Restore a soft-deleted supplier.
// @route   PUT /api/suppliers/:id/restore
// @access  Private (Admin / Super Admin)
export const restoreSupplier = async (req, res, next) => {
    try {
        const supplier = await prisma.supplier.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: { not: null } }
        });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Soft-deleted supplier not found'
            });
        }

        const restored = await prisma.supplier.update({
            where: { id: req.params.id },
            data: { deletedAt: null }
        });

        await auditFromReq(req, {
            action: 'RESTORE',
            entity: 'Supplier',
            entityId: restored.id,
            after: restored
        });

        res.status(200).json({ success: true, data: restored });
    } catch (error) {
        next(error);
    }
};

// @desc    Soft-delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private
export const deleteSupplier = async (req, res, next) => {
    try {
        const before = await prisma.supplier.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }
        });

        if (!before) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found or unauthorized'
            });
        }

        await prisma.supplier.update({
            where: { id: req.params.id },
            data: { deletedAt: new Date() }
        });

        await auditFromReq(req, {
            action: 'DELETE',
            entity: 'Supplier',
            entityId: before.id,
            before
        });

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        next(error);
    }
};
