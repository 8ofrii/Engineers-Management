import prisma from '../lib/prisma.js';

// @desc    Consume material batch
// @route   POST /api/material-batches/:id/consume
// @access  Private (Engineer, Manager, Admin)
export const consumeBatch = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amountConsumed, description } = req.body;

        if (!amountConsumed || amountConsumed <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount consumed must be greater than 0'
            });
        }

        // Fetch the batch
        const batch = await prisma.materialBatch.findUnique({
            where: { id }
        });

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Material batch not found'
            });
        }

        // Check if enough material is available
        if (batch.remainingValue < amountConsumed) {
            return res.status(400).json({
                success: false,
                message: `Insufficient material value. Available: ${batch.remainingValue} EGP`,
                availableValue: Number(batch.remainingValue)
            });
        }

        // Calculate new values
        const newRemainingValue = Number(batch.remainingValue) - Number(amountConsumed);
        const newStatus = newRemainingValue <= 0 ? 'CONSUMED' :
            newRemainingValue < batch.initialValue ? 'PARTIALLY_USED' :
                'AVAILABLE';

        // Update batch (NO project cost change - already counted at purchase)
        const updated = await prisma.materialBatch.update({
            where: { id },
            data: {
                remainingValue: newRemainingValue,
                status: newStatus
            }
        });

        res.status(200).json({
            success: true,
            message: `Consumed ${amountConsumed} EGP worth of materials`,
            data: {
                ...updated,
                remainingValue: Number(updated.remainingValue),
                initialValue: Number(updated.initialValue),
                consumed: Number(amountConsumed)
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
        const batches = await prisma.materialBatch.findMany({
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
        const batch = await prisma.materialBatch.findUnique({
            where: { id: req.params.id },
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
