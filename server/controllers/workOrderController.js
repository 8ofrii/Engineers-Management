import prisma from '../lib/prisma.js';

// @desc    Get all work orders
// @route   GET /api/work-orders
// @access  Private
export const getWorkOrders = async (req, res, next) => {
    try {
        const { projectId, category, status, workmanId } = req.query;

        const where = {
            tenantId: req.user.tenantId
        };

        if (projectId) where.projectId = projectId;
        if (category) where.category = category;
        if (status) where.status = status;

        const workOrders = await prisma.projectCostItem.findMany({
            where,
            include: {
                project: {
                    select: {
                        name: true,
                        id: true
                    }
                },
                transactions: {
                    select: {
                        id: true,
                        amount: true,
                        transactionDate: true,
                        status: true
                    },
                    orderBy: {
                        transactionDate: 'desc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Calculate progress for each work order
        const workOrdersWithProgress = workOrders.map(wo => ({
            ...wo,
            totalQuantity: wo.totalQuantity ? Number(wo.totalQuantity) : null,
            unitPrice: wo.unitPrice ? Number(wo.unitPrice) : null,
            estimatedTotal: wo.estimatedTotal ? Number(wo.estimatedTotal) : null,
            totalPaid: Number(wo.totalPaid),
            remaining: wo.estimatedTotal ? Number(wo.estimatedTotal) - Number(wo.totalPaid) : null,
            progressPercent: wo.estimatedTotal ?
                Math.round((Number(wo.totalPaid) / Number(wo.estimatedTotal)) * 100) : 0,
            paymentCount: wo.transactions.length
        }));

        res.status(200).json({
            success: true,
            count: workOrdersWithProgress.length,
            data: workOrdersWithProgress
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get single work order by ID
// @route   GET /api/work-orders/:id
// @access  Private
export const getWorkOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const workOrder = await prisma.projectCostItem.findUnique({
            where: { id },
            include: {
                project: {
                    select: {
                        name: true,
                        id: true
                    }
                },
                transactions: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                id: true
                            }
                        },
                        payer: {
                            select: {
                                name: true,
                                id: true
                            }
                        }
                    },
                    orderBy: {
                        transactionDate: 'desc'
                    }
                }
            }
        });

        if (!workOrder) {
            return res.status(404).json({
                success: false,
                message: 'Work order not found'
            });
        }

        // Calculate progress
        const workOrderWithProgress = {
            ...workOrder,
            totalQuantity: workOrder.totalQuantity ? Number(workOrder.totalQuantity) : null,
            unitPrice: workOrder.unitPrice ? Number(workOrder.unitPrice) : null,
            estimatedTotal: workOrder.estimatedTotal ? Number(workOrder.estimatedTotal) : null,
            totalPaid: Number(workOrder.totalPaid),
            remaining: workOrder.estimatedTotal ?
                Number(workOrder.estimatedTotal) - Number(workOrder.totalPaid) : null,
            progressPercent: workOrder.estimatedTotal ?
                Math.round((Number(workOrder.totalPaid) / Number(workOrder.estimatedTotal)) * 100) : 0,
            paymentCount: workOrder.transactions.length
        };

        res.status(200).json({
            success: true,
            data: workOrderWithProgress
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Create new work order
// @route   POST /api/work-orders
// @access  Private
export const createWorkOrder = async (req, res, next) => {
    try {
        const {
            projectId,
            name,
            category,
            totalQuantity,
            unitOfMeasure,
            unitPrice,
            estimatedTotal,
            description,
            // Optional: Create first payment
            createFirstPayment,
            firstPaymentAmount,
            firstPaymentDate,
            payerUserId,
            paymentMethod,
            paymentNotes
        } = req.body;

        // Validate required fields
        if (!projectId || !name || !category) {
            return res.status(400).json({
                success: false,
                message: 'Project, name, and category are required'
            });
        }

        // Calculate estimated total if not provided
        let calculatedEstimatedTotal = estimatedTotal;
        if (!calculatedEstimatedTotal && totalQuantity && unitPrice) {
            calculatedEstimatedTotal = Number(totalQuantity) * Number(unitPrice);
        }

        const result = await prisma.$transaction(async (tx) => {
            // Create work order
            const workOrder = await tx.projectCostItem.create({
                data: {
                    projectId,
                    name,
                    category,
                    totalQuantity: totalQuantity ? Number(totalQuantity) : null,
                    unitOfMeasure,
                    unitPrice: unitPrice ? Number(unitPrice) : null,
                    estimatedTotal: calculatedEstimatedTotal ? Number(calculatedEstimatedTotal) : null,
                    totalPaid: 0,
                    status: 'OPEN',
                    tenantId: req.user.tenantId
                }
            });

            let transaction = null;

            // Create first payment if requested
            if (createFirstPayment && firstPaymentAmount) {
                transaction = await tx.transaction.create({
                    data: {
                        type: 'EXPENSE',
                        category,
                        amount: Number(firstPaymentAmount),
                        description: paymentNotes || `First payment for: ${name}`,
                        status: 'PENDING_APPROVAL',
                        projectId,
                        projectCostItemId: workOrder.id,
                        createdBy: req.user.id,
                        transactionDate: firstPaymentDate ? new Date(firstPaymentDate) : new Date(),
                        paymentMethod: paymentMethod || 'CASH',
                        payerUserId,
                        tenantId: req.user.tenantId
                    }
                });
            }

            return { workOrder, transaction };
        });

        res.status(201).json({
            success: true,
            data: result.workOrder,
            transaction: result.transaction,
            message: createFirstPayment ?
                'Work order created with first payment pending approval' :
                'Work order created successfully'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Update work order
// @route   PUT /api/work-orders/:id
// @access  Private
export const updateWorkOrder = async (req, res, next) => {
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

        const workOrder = await prisma.projectCostItem.findUnique({
            where: { id }
        });

        if (!workOrder) {
            return res.status(404).json({
                success: false,
                message: 'Work order not found'
            });
        }

        // Calculate new estimated total if quantity or unit price changed
        let newEstimatedTotal = estimatedTotal;
        if (totalQuantity && unitPrice) {
            newEstimatedTotal = Number(totalQuantity) * Number(unitPrice);
        }

        const updated = await prisma.projectCostItem.update({
            where: { id },
            data: {
                name: name || workOrder.name,
                category: category || workOrder.category,
                totalQuantity: totalQuantity ? Number(totalQuantity) : workOrder.totalQuantity,
                unitOfMeasure: unitOfMeasure || workOrder.unitOfMeasure,
                unitPrice: unitPrice ? Number(unitPrice) : workOrder.unitPrice,
                estimatedTotal: newEstimatedTotal ? Number(newEstimatedTotal) : workOrder.estimatedTotal,
                status: status || workOrder.status
            }
        });

        res.status(200).json({
            success: true,
            data: updated,
            message: 'Work order updated successfully'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Delete work order
// @route   DELETE /api/work-orders/:id
// @access  Private (Admin, Project Manager)
export const deleteWorkOrder = async (req, res, next) => {
    try {
        const { id } = req.params;

        const workOrder = await prisma.projectCostItem.findUnique({
            where: { id },
            include: {
                transactions: true
            }
        });

        if (!workOrder) {
            return res.status(404).json({
                success: false,
                message: 'Work order not found'
            });
        }

        // Check if there are linked transactions
        if (workOrder.transactions.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete work order with linked transactions. Please unlink or delete transactions first.',
                transactionCount: workOrder.transactions.length
            });
        }

        await prisma.projectCostItem.delete({
            where: { id }
        });

        res.status(200).json({
            success: true,
            message: 'Work order deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get work order payments (transactions)
// @route   GET /api/work-orders/:id/payments
// @access  Private
export const getWorkOrderPayments = async (req, res, next) => {
    try {
        const { id } = req.params;

        const workOrder = await prisma.projectCostItem.findUnique({
            where: { id }
        });

        if (!workOrder) {
            return res.status(404).json({
                success: false,
                message: 'Work order not found'
            });
        }

        const payments = await prisma.transaction.findMany({
            where: {
                projectCostItemId: id
            },
            include: {
                user: {
                    select: {
                        name: true,
                        id: true
                    }
                },
                payer: {
                    select: {
                        name: true,
                        id: true
                    }
                },
                approver: {
                    select: {
                        name: true,
                        id: true
                    }
                }
            },
            orderBy: {
                transactionDate: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            count: payments.length,
            data: payments.map(p => ({
                ...p,
                amount: Number(p.amount)
            }))
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get suggested name for work order based on category
// @route   GET /api/work-orders/suggest-name/:category
// @access  Private
export const suggestWorkOrderName = async (req, res, next) => {
    try {
        const { category } = req.params;

        // Arabic names mapping
        const categoryNames = {
            'CONCRETE': 'خرسانات',
            'SITE_CLEANING': 'نظافة',
            'STOCKING': 'تشوين',
            'CEMENT': 'اسمنت',
            'SAND': 'رمل',
            'BRICKS': 'طوب',
            'GENERAL_LABOR': 'مصنعية عمالة',
            'MASONRY_LABOR': 'مصنعية بناء',
            'PLASTERING_MATERIALS': 'خامات محارة',
            'PLASTERING_LABOR': 'مصنعية محارة',
            'PLUMBING_MATERIALS': 'خامات سباكة',
            'PLUMBING_LABOR': 'مصنعية سباكة',
            'ELECTRICAL_MATERIALS': 'خامات كهرباء',
            'ELECTRICAL_LABOR': 'مصنعية كهرباء',
            'CERAMIC_MATERIALS': 'خامات سيراميك',
            'CERAMIC_LABOR': 'مصنعية سيراميك',
            'PAINTING_MATERIALS': 'خامات دهانات',
            'PAINTING_LABOR': 'مصنعية دهانات',
            'GYPSUM_MATERIALS': 'خامات جبس بورد',
            'GYPSUM_LABOR': 'مصنعية جبس بورد',
            'CARPENTRY_MATERIALS': 'خامات نجارة',
            'CARPENTRY_LABOR': 'مصنعية نجارة',
            'DECOR': 'ديكور',
            'DRAWINGS': 'رسومات',
            'TIPS': 'اكراميات',
            'TRANSPORT': 'نقل',
            'INSULATION_LABOR': 'مصنعية عزل',
            'HVAC_PREP': 'تاسيس تكيف',
            'ALUMETAL': 'الوميتال'
        };

        const suggestedName = categoryNames[category] || category;

        res.status(200).json({
            success: true,
            data: {
                category,
                suggestedName
            }
        });

    } catch (error) {
        next(error);
    }
};
