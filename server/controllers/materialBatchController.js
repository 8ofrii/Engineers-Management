import prisma from '../lib/prisma.js';

// @desc    Consume material batch (with office fee calculation)
// @route   POST /api/material-batches/:id/consume
// @access  Private (Engineer, Manager, Admin)
export const consumeBatch = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amountConsumed, quantityConsumed, description } = req.body;

        // Must provide either amount or quantity
        if ((!amountConsumed || amountConsumed <= 0) && (!quantityConsumed || quantityConsumed <= 0)) {
            return res.status(400).json({
                success: false,
                message: 'Either amountConsumed or quantityConsumed must be provided and greater than 0'
            });
        }

        // Fetch the batch - Enforce Tenant Isolation
        const batch = await prisma.materialBatch.findFirst({
            where: {
                id,
                tenantId: req.user.tenantId
            },
            include: {
                project: true
            }
        });

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Material batch not found'
            });
        }

        // Calculate actual consumed value
        let actualConsumedValue = amountConsumed;
        if (!actualConsumedValue && quantityConsumed) {
            // Calculate based on quantity (proportional to initial value)
            const totalQuantity = Number(batch.quantityUsed) || Number(batch.initialValue);
            actualConsumedValue = (Number(quantityConsumed) / totalQuantity) * Number(batch.initialValue);
        }

        // Check if enough material is available
        if (Number(batch.remainingValue) < actualConsumedValue) {
            return res.status(400).json({
                success: false,
                message: `Insufficient material value. Available: ${batch.remainingValue} EGP`,
                availableValue: Number(batch.remainingValue)
            });
        }

        // Import office fee service
        const officeFeeService = await import('../services/officeFeeService.js');

        // Calculate office fee on consumed portion
        const officeFee = await officeFeeService.calculateOfficeFee(
            batch.projectId,
            'MATERIALS', // Generic materials category
            actualConsumedValue
        );

        // Calculate new values
        const newRemainingValue = Number(batch.remainingValue) - actualConsumedValue;
        const newQuantityUsed = Number(batch.quantityUsed || 0) + (quantityConsumed || 0);
        const newOfficeFeeApplied = Number(batch.officeFeeApplied) + officeFee;
        const newStatus = newRemainingValue <= 0 ? 'CONSUMED' :
            newRemainingValue < batch.initialValue ? 'PARTIALLY_USED' :
                'AVAILABLE';

        // Atomic transaction: Update batch + Apply office fee to project
        const result = await prisma.$transaction(async (tx) => {
            // Update batch
            const updatedBatch = await tx.materialBatch.update({
                where: { id },
                data: {
                    remainingValue: newRemainingValue,
                    quantityUsed: newQuantityUsed,
                    officeFeeApplied: newOfficeFeeApplied,
                    status: newStatus
                }
            });

            // Apply office fee to project
            await tx.project.update({
                where: { id: batch.projectId },
                data: {
                    officeRevenue: { increment: officeFee },
                    projectSafeBalance: { decrement: officeFee }
                }
            });

            // Create material usage record
            if (batch.materialId) {
                await tx.materialUsage.create({
                    data: {
                        materialId: batch.materialId,
                        projectId: batch.projectId,
                        quantity: quantityConsumed || 0,
                        notes: description || `Consumed from batch: ${batch.description}`,
                        recordedBy: req.user.id,
                        tenantId: req.user.tenantId
                    }
                });
            }

            return updatedBatch;
        });

        res.status(200).json({
            success: true,
            message: `Consumed ${actualConsumedValue.toFixed(2)} EGP worth of materials`,
            data: {
                ...result,
                remainingValue: Number(result.remainingValue),
                initialValue: Number(result.initialValue),
                consumed: actualConsumedValue,
                officeFeeApplied: officeFee,
                totalOfficeFee: Number(result.officeFeeApplied)
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get available stock for a project
// @route   GET /api/material-batches/project/:projectId
// @access  Private
export const getAvailableStock = async (req, res, next) => {
    try {
        const { projectId } = req.params;

        const batches = await prisma.materialBatch.findMany({
            where: {
                projectId: projectId,
                tenantId: req.user.tenantId, // Enforce Tenant Isolation
                status: {
                    in: ['AVAILABLE', 'PARTIALLY_USED']
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Calculate totals
        const totalInitialValue = batches.reduce((sum, b) => sum + Number(b.initialValue), 0);
        const totalRemainingValue = batches.reduce((sum, b) => sum + Number(b.remainingValue), 0);
        const totalConsumed = totalInitialValue - totalRemainingValue;

        res.status(200).json({
            success: true,
            count: batches.length,
            data: batches.map(b => ({
                ...b,
                initialValue: Number(b.initialValue),
                remainingValue: Number(b.remainingValue)
            })),
            summary: {
                totalInitialValue,
                totalRemainingValue,
                totalConsumed,
                consumptionRate: totalInitialValue > 0 ? ((totalConsumed / totalInitialValue) * 100).toFixed(2) + '%' : '0%'
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get all material batches
// @route   GET /api/material-batches
// @access  Private
export const getAllBatches = async (req, res, next) => {
    try {
        const { status, projectId } = req.query;
        
        let whereClause = {
            tenantId: req.user.tenantId // Enforce Tenant Isolation
        };

        if (projectId) {
            whereClause.projectId = projectId;
        }

        if (status) {
            whereClause.status = {
                in: status.split(',')
            };
        }

        const batches = await prisma.materialBatch.findMany({
            where: whereClause,
            include: {
                project: {
                    select: { name: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            count: batches.length,
            data: batches.map(b => ({
                ...b,
                initialValue: Number(b.initialValue),
                remainingValue: Number(b.remainingValue)
            }))
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get single material batch
// @route   GET /api/material-batches/:id
// @access  Private
export const getBatch = async (req, res, next) => {
    try {
        const batch = await prisma.materialBatch.findFirst({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId // Enforce Tenant Isolation
            },
            include: {
                project: {
                    select: { name: true }
                }
            }
        });

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Material batch not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                ...batch,
                initialValue: Number(batch.initialValue),
                remainingValue: Number(batch.remainingValue)
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Delete material batch
// @route   DELETE /api/material-batches/:id
// @access  Private (Admin only)
export const deleteBatch = async (req, res, next) => {
    try {
        const batch = await prisma.materialBatch.findFirst({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId
            }
        });

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Material batch not found'
            });
        }

        await prisma.materialBatch.delete({
            where: {
                id: req.params.id
            }
        });

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        next(error);
    }
};
