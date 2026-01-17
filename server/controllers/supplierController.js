import prisma from '../lib/prisma.js';

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
export const getSuppliers = async (req, res, next) => {
    try {
        const suppliers = await prisma.supplier.findMany({
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
        const supplier = await prisma.supplier.findUnique({
            where: { id: req.params.id }
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
            data: req.body
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
        const supplier = await prisma.supplier.update({
            where: { id: req.params.id },
            data: req.body
        });

        res.status(200).json({
            success: true,
            data: supplier
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
        await prisma.supplier.delete({
            where: { id: req.params.id }
        });

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        next(error);
    }
};
