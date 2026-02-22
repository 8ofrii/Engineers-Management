import prisma from '../lib/prisma.js';

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
export const getSuppliers = async (req, res, next) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            where: {
                tenantId: req.user.tenantId
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
                tenantId: req.user.tenantId
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
        const supplier = await prisma.supplier.create({
            data: {
                ...req.body,
                tenantId: req.user.tenantId
            }
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
        // Enforce tenant isolation in update
        const supplier = await prisma.supplier.updateMany({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId
            },
            data: req.body
        });

        if (supplier.count === 0) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found or unauthorized'
            });
        }

        const updated = await prisma.supplier.findUnique({ where: { id: req.params.id } });

        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private
export const deleteSupplier = async (req, res, next) => {
    try {
        const result = await prisma.supplier.deleteMany({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId
            }
        });

        if (result.count === 0) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found or unauthorized'
            });
        }

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        next(error);
    }
};
