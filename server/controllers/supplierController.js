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
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            count: suppliers.length,
            data: suppliers
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
            }
        });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }

        res.status(200).json({
            success: true,
            data: supplier
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
        if (!data.email) data.email = "-";
        if (!data.phone) data.phone = "-";

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
            data: supplier
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

        const updated = await prisma.supplier.update({
            where: { id: req.params.id },
            data: req.body
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
            data: updated
        });
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
