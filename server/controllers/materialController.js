import prisma from '../lib/prisma.js';
import { auditFromReq } from '../lib/audit.js';

// @desc    Get all materials
// @route   GET /api/materials
// @access  Private
export const getMaterials = async (req, res, next) => {
    try {
        const materials = await prisma.material.findMany({
            where: {
                tenantId: req.user.tenantId,
                deletedAt: null
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
                tenantId: req.user.tenantId,
                deletedAt: null
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

        await auditFromReq(req, {
            action: 'CREATE',
            entity: 'Material',
            entityId: material.id,
            after: material
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
        const before = await prisma.material.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }
        });

        if (!before) {
            return res.status(404).json({
                success: false,
                message: 'Material not found or unauthorized'
            });
        }

        const material = await prisma.material.update({
            where: { id: req.params.id },
            data: req.body
        });

        await auditFromReq(req, {
            action: 'UPDATE',
            entity: 'Material',
            entityId: material.id,
            before,
            after: material
        });

        res.status(200).json({
            success: true,
            data: material
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Soft-delete material
// @route   DELETE /api/materials/:id
// @access  Private
export const deleteMaterial = async (req, res, next) => {
    try {
        const before = await prisma.material.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }
        });

        if (!before) {
            return res.status(404).json({
                success: false,
                message: 'Material not found or unauthorized'
            });
        }

        await prisma.material.update({
            where: { id: req.params.id },
            data: { deletedAt: new Date() }
        });

        await auditFromReq(req, {
            action: 'DELETE',
            entity: 'Material',
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
