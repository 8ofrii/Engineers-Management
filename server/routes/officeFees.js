import express from 'express';
import prisma from '../lib/prisma.js';
import { protect, authorize } from '../middleware/auth.js';
import * as officeFeeService from '../services/officeFeeService.js';
import { validate } from '../middleware/validate.js';
import {
    setGlobalFeeSchema,
    setProjectFeeSchema,
    calculateFeeSchema,
    projectIdParamSchema,
    projectAndCategoryParamsSchema
} from '../schemas/officeFees.schema.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @desc    Get office fee configuration for a project
// @route   GET /api/office-fees/project/:projectId
// @access  Private
router.get('/project/:projectId', validate({ params: projectIdParamSchema }), async (req, res, next) => {
    try {
        const { projectId } = req.params;

        const config = await officeFeeService.getProjectOfficeFees(projectId);

        res.status(200).json({
            success: true,
            data: config
        });

    } catch (error) {
        next(error);
    }
});

// @desc    Get all global category fees
// @route   GET /api/office-fees/global
// @access  Private (Admin only)
router.get('/global', authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
    try {
        const globalFees = await prisma.globalCategoryFee.findMany({
            where: {
                tenantId: req.user.tenantId
            },
            orderBy: {
                category: 'asc'
            }
        });

        res.status(200).json({
            success: true,
            count: globalFees.length,
            data: globalFees.map(f => ({
                ...f,
                defaultFeePercent: Number(f.defaultFeePercent)
            }))
        });

    } catch (error) {
        next(error);
    }
});

// @desc    Set global category fee
// @route   POST /api/office-fees/global
// @access  Private (Admin only)
router.post('/global', authorize('ADMIN', 'SUPER_ADMIN'), validate({ body: setGlobalFeeSchema }), async (req, res, next) => {
    try {
        const { category, defaultFeePercent } = req.body;

        if (!category || defaultFeePercent === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Category and defaultFeePercent are required'
            });
        }

        if (defaultFeePercent < 0 || defaultFeePercent > 100) {
            return res.status(400).json({
                success: false,
                message: 'Fee percent must be between 0 and 100'
            });
        }

        const fee = await officeFeeService.setGlobalCategoryFee(
            category,
            defaultFeePercent,
            req.user.tenantId
        );

        res.status(201).json({
            success: true,
            data: {
                ...fee,
                defaultFeePercent: Number(fee.defaultFeePercent)
            },
            message: 'Global category fee updated successfully'
        });

    } catch (error) {
        next(error);
    }
});

// @desc    Get project-specific category fees
// @route   GET /api/office-fees/project/:projectId/categories
// @access  Private
router.get('/project/:projectId/categories', validate({ params: projectIdParamSchema }), async (req, res, next) => {
    try {
        const { projectId } = req.params;

        const projectFees = await prisma.projectCategoryFee.findMany({
            where: {
                projectId,
                tenantId: req.user.tenantId
            },
            orderBy: {
                category: 'asc'
            }
        });

        res.status(200).json({
            success: true,
            count: projectFees.length,
            data: projectFees.map(f => ({
                ...f,
                feePercent: Number(f.feePercent)
            }))
        });

    } catch (error) {
        next(error);
    }
});

// @desc    Set project-specific category fee
// @route   POST /api/office-fees/project/:projectId/categories
// @access  Private (Admin, Project Manager)
router.post('/project/:projectId/categories', authorize('ADMIN', 'PROJECT_MANAGER', 'SUPER_ADMIN'), validate({ params: projectIdParamSchema, body: setProjectFeeSchema }), async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { category, feePercent } = req.body;

        if (!category || feePercent === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Category and feePercent are required'
            });
        }

        if (feePercent < 0 || feePercent > 100) {
            return res.status(400).json({
                success: false,
                message: 'Fee percent must be between 0 and 100'
            });
        }

        const fee = await officeFeeService.setProjectCategoryFee(
            projectId,
            category,
            feePercent,
            req.user.tenantId
        );

        res.status(201).json({
            success: true,
            data: {
                ...fee,
                feePercent: Number(fee.feePercent)
            },
            message: 'Project category fee updated successfully'
        });

    } catch (error) {
        next(error);
    }
});

// @desc    Delete project-specific category fee override
// @route   DELETE /api/office-fees/project/:projectId/categories/:category
// @access  Private (Admin, Project Manager)
router.delete('/project/:projectId/categories/:category', authorize('ADMIN', 'PROJECT_MANAGER', 'SUPER_ADMIN'), validate({ params: projectAndCategoryParamsSchema }), async (req, res, next) => {
    try {
        const { projectId, category } = req.params;

        await officeFeeService.deleteProjectCategoryFee(projectId, category);

        res.status(200).json({
            success: true,
            message: 'Project category fee override removed successfully'
        });

    } catch (error) {
        next(error);
    }
});

// @desc    Calculate office fee for a transaction (preview)
// @route   POST /api/office-fees/calculate
// @access  Private
router.post('/calculate', validate({ body: calculateFeeSchema }), async (req, res, next) => {
    try {
        const { projectId, category, amount } = req.body;

        if (!projectId || !category || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Project ID, category, and amount are required'
            });
        }

        const feePercent = await officeFeeService.getOfficeFeePercent(projectId, category);
        const officeFee = await officeFeeService.calculateOfficeFee(projectId, category, amount);
        const isInventory = officeFeeService.isInventoryCategory(category);

        res.status(200).json({
            success: true,
            data: {
                amount: Number(amount),
                category,
                feePercent,
                officeFee,
                totalDeduction: Number(amount) + officeFee,
                isInventory,
                note: isInventory ?
                    'Office fee will be calculated when inventory is used' :
                    'Office fee will be deducted immediately'
            }
        });

    } catch (error) {
        next(error);
    }
});

export default router;
