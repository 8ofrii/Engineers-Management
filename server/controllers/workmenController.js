import prisma from '../lib/prisma.js';
import { auditFromReq } from '../lib/audit.js';

// @desc    Get all workmen
// @route   GET /api/workmen
// @access  Private
export const getAll = async (req, res, next) => {
    try {
        const workmen = await prisma.workman.findMany({
            where: {
                tenantId: req.user.tenantId,
                deletedAt: null
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            data: workmen
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single workman
// @route   GET /api/workmen/:id
// @access  Private
export const getOne = async (req, res, next) => {
    try {
        const workman = await prisma.workman.findFirst({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId,
                deletedAt: null
            },
            include: {
                workmanships: true,
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });

        if (!workman) {
            return res.status(404).json({
                success: false,
                message: 'Workman not found'
            });
        }

        res.status(200).json({
            success: true,
            data: workman
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new workman
// @route   POST /api/workmen
// @access  Private
export const create = async (req, res, next) => {
    try {
        const { name, nameAr, trade, customTrade, dailyRate, phone, nationalId, nationalIdImage } = req.body;

        const workman = await prisma.workman.create({
            data: {
                name,
                nameAr,
                trade,
                customTrade,
                dailyRate,
                phone,
                nationalId,
                nationalIdImage,
                tenantId: req.user.tenantId // Critical: Assign to Tenant
            }
        });

        await auditFromReq(req, {
            action: 'CREATE',
            entity: 'Workman',
            entityId: workman.id,
            after: workman
        });

        res.status(201).json({
            success: true,
            data: workman
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update workman
// @route   PUT /api/workmen/:id
// @access  Private
export const update = async (req, res, next) => {
    try {
        const { name, nameAr, trade, customTrade, dailyRate, phone, nationalId, nationalIdImage, isActive } = req.body;

        const before = await prisma.workman.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }
        });

        if (!before) {
            return res.status(404).json({
                success: false,
                message: 'Workman not found or authorized'
            });
        }

        const updatedWorkman = await prisma.workman.update({
            where: { id: req.params.id },
            data: { name, nameAr, trade, customTrade, dailyRate, phone, nationalId, nationalIdImage, isActive }
        });

        await auditFromReq(req, {
            action: 'UPDATE',
            entity: 'Workman',
            entityId: updatedWorkman.id,
            before,
            after: updatedWorkman
        });

        res.status(200).json({
            success: true,
            data: updatedWorkman
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Restore a soft-deleted workman.
// @route   PUT /api/workmen/:id/restore
// @access  Private (Admin / Super Admin)
export const restoreWorkman = async (req, res, next) => {
    try {
        const workman = await prisma.workman.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: { not: null } }
        });

        if (!workman) {
            return res.status(404).json({
                success: false,
                message: 'Soft-deleted workman not found'
            });
        }

        const restored = await prisma.workman.update({
            where: { id: req.params.id },
            data: { deletedAt: null }
        });

        await auditFromReq(req, {
            action: 'RESTORE',
            entity: 'Workman',
            entityId: restored.id,
            after: restored
        });

        res.status(200).json({ success: true, data: restored });
    } catch (error) {
        next(error);
    }
};

// @desc    Soft-delete workman
// @route   DELETE /api/workmen/:id
// @access  Private
export const deleteWorkman = async (req, res, next) => {
    try {
        const before = await prisma.workman.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }
        });

        if (!before) {
            return res.status(404).json({
                success: false,
                message: 'Workman not found or authorized'
            });
        }

        await prisma.workman.update({
            where: { id: req.params.id },
            data: { deletedAt: new Date() }
        });

        await auditFromReq(req, {
            action: 'DELETE',
            entity: 'Workman',
            entityId: before.id,
            before
        });

        res.status(200).json({
            success: true,
            message: 'Workman deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
