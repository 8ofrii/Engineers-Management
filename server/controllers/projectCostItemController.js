import prisma from '../lib/prisma.js';

/**
 * @desc    Create a new Project Cost Item (Work Order/Band)
 * @route   POST /api/project-cost-items
 * @access  Private (Manager, Admin)
 */
export const createProjectCostItem = async (req, res, next) => {
    try {
        const {
            projectId,
            name,
            category,
            totalQuantity,
            unitOfMeasure,
            unitPrice,
            estimatedTotal
        } = req.body;

        // Validate project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Calculate estimated total if not provided
        const calculatedEstimate = estimatedTotal ||
            (totalQuantity && unitPrice ? Number(totalQuantity) * Number(unitPrice) : null);

        const costItem = await prisma.projectCostItem.create({
            data: {
                projectId,
                name,
                category,
                totalQuantity: totalQuantity ? Number(totalQuantity) : null,
                unitOfMeasure,
                unitPrice: unitPrice ? Number(unitPrice) : null,
                estimatedTotal: calculatedEstimate,
                tenantId: req.user.tenantId,
                status: 'OPEN'
            }
        });

        res.status(201).json({
            success: true,
            data: costItem
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all cost items for a project
 * @route   GET /api/project-cost-items/project/:projectId
 * @access  Private
 */
export const getProjectCostItems = async (req, res, next) => {
    try {
        const { projectId } = req.params;

        const costItems = await prisma.projectCostItem.findMany({
            where: { projectId },
            include: {
                transactions: {
                    select: {
                        id: true,
                        amount: true,
                        transactionDate: true,
                        status: true,
                        description: true
                    },
                    orderBy: {
                        transactionDate: 'desc'
                    }
                },
                _count: {
                    select: { transactions: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Calculate progress for each item
        const itemsWithProgress = costItems.map(item => ({
            ...item,
            progress: item.estimatedTotal
                ? (Number(item.totalPaid) / Number(item.estimatedTotal)) * 100
                : 0,
            remaining: item.estimatedTotal
                ? Number(item.estimatedTotal) - Number(item.totalPaid)
                : null
        }));

        res.status(200).json({
            success: true,
            count: costItems.length,
            data: itemsWithProgress
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single cost item with full details
 * @route   GET /api/project-cost-items/:id
 * @access  Private
 */
export const getProjectCostItem = async (req, res, next) => {
    try {
        const { id } = req.params;

        const costItem = await prisma.projectCostItem.findUnique({
            where: { id },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        managementFeePercent: true
                    }
                },
                transactions: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    },
                    orderBy: {
                        transactionDate: 'desc'
                    }
                }
            }
        });

        if (!costItem) {
            return res.status(404).json({
                success: false,
                message: 'Cost item not found'
            });
        }

        res.status(200).json({
            success: true,
            data: costItem
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update a cost item
 * @route   PUT /api/project-cost-items/:id
 * @access  Private (Manager, Admin)
 */
export const updateProjectCostItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            name,
            category,
            totalQuantity,
            unitOfMeasure,
            unitPrice,
            estimatedTotal,
            status
        } = req.body;

        const costItem = await prisma.projectCostItem.findUnique({
            where: { id }
        });

        if (!costItem) {
            return res.status(404).json({
                success: false,
                message: 'Cost item not found'
            });
        }

        // Recalculate estimated total if quantity or price changed
        let newEstimate = estimatedTotal;
        if (!newEstimate && (totalQuantity || unitPrice)) {
            const qty = totalQuantity !== undefined ? Number(totalQuantity) : Number(costItem.totalQuantity);
            const price = unitPrice !== undefined ? Number(unitPrice) : Number(costItem.unitPrice);
            newEstimate = qty && price ? qty * price : null;
        }

        const updated = await prisma.projectCostItem.update({
            where: { id },
            data: {
                name,
                category,
                totalQuantity: totalQuantity !== undefined ? Number(totalQuantity) : undefined,
                unitOfMeasure,
                unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
                estimatedTotal: newEstimate,
                status
            }
        });

        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete a cost item
 * @route   DELETE /api/project-cost-items/:id
 * @access  Private (Admin only)
 */
export const deleteProjectCostItem = async (req, res, next) => {
    try {
        const { id } = req.params;

        const costItem = await prisma.projectCostItem.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { transactions: true }
                }
            }
        });

        if (!costItem) {
            return res.status(404).json({
                success: false,
                message: 'Cost item not found'
            });
        }

        // Prevent deletion if there are linked transactions
        if (costItem._count.transactions > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete cost item with ${costItem._count.transactions} linked transaction(s). Please remove or reassign transactions first.`
            });
        }

        await prisma.projectCostItem.delete({
            where: { id }
        });

        res.status(200).json({
            success: true,
            message: 'Cost item deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all cost items (with optional filtering)
 * @route   GET /api/project-cost-items
 * @access  Private
 */
export const getAllProjectCostItems = async (req, res, next) => {
    try {
        const { status, projectId } = req.query;

        const where = {};
        if (status) where.status = status;
        if (projectId) where.projectId = projectId;

        const costItems = await prisma.projectCostItem.findMany({
            where,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                _count: {
                    select: { transactions: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            count: costItems.length,
            data: costItems
        });
    } catch (error) {
        next(error);
    }
};
