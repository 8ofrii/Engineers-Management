import prisma from '../lib/prisma.js';

// @desc    Get all materials
// @route   GET /api/materials
// @access  Private
export const getMaterials = async (req, res, next) => {
    try {
        const materials = await prisma.material.findMany({
            where: {
                tenantId: req.user.tenantId
            },
            include: {
                supplier: {
                    select: { name: true }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        res.status(200).json({
            success: true,
            count: materials.length,
            data: materials
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single material
// @route   GET /api/materials/:id
// @access  Private
export const getMaterial = async (req, res, next) => {
    try {
        const material = await prisma.material.findFirst({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId
            }
        });

        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material not found or unauthorized'
            });
        }

        res.status(200).json({
            success: true,
            data: material
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create material
// @route   POST /api/materials
// @access  Private
export const createMaterial = async (req, res, next) => {
    try {
        const material = await prisma.material.create({
            data: {
                ...req.body,
                tenantId: req.user.tenantId
            }
        });

        res.status(201).json({
            success: true,
            data: material
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update material
// @route   PUT /api/materials/:id
// @access  Private
export const updateMaterial = async (req, res, next) => {
    try {
        const updated = await prisma.material.updateMany({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId
            },
            data: req.body
        });

        if (updated.count === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found or unauthorized'
            });
        }

        const material = await prisma.material.findUnique({
            where: { id: req.params.id }
        });

        res.status(200).json({
            success: true,
            data: material
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete material
// @route   DELETE /api/materials/:id
// @access  Private
export const deleteMaterial = async (req, res, next) => {
    try {
        const deleted = await prisma.material.deleteMany({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId
            }
        });

        if (deleted.count === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found or unauthorized'
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
