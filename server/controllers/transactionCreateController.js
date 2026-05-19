// V1 transaction creation. Extracted from transactionController.js so the
// 1,044-line CRUD controller can stay focused on list/get/update/delete.
//
// FOLLOW-UP: this createTransaction overlaps significantly with
// transactionControllerV2.createTransactionV2. Both implement the V1.2
// "Profit on Expense" lifecycle (ledger row + project safe deduction +
// optional batch creation + cost-item rollup + workman balance update +
// negative-safe alert), but with subtly different defaults. They should
// be consolidated into one canonical creation pipeline. Keeping V1 here
// 1:1 for now to avoid behavior drift in the live POST /api/transactions.

import prisma from '../lib/prisma.js';

/**
 * @desc    Create transaction with V1.2 "Profit on Expense" Logic
 * @route   POST /api/transactions
 * @access  Private
 */
export const createTransaction = async (req, res, next) => {
    try {
        const {
            type,
            category,
            amount,
            projectId,
            projectCostItemId,
            description,
            paymentMethod,
            transactionDate,
            payerUserId, // V1.2: For managers to assign payer
            invoiceNumber,
            clientId,
            supplierId,
            workmanId,
            createBatch, // Flag for inventory purchase
            itemName,   // For creating new ProjectCostItem
            unit,
            quantity,
            unitPrice,
            isOfficeExpense
        } = req.body;

        // Validate required fields
        if (!type || !amount || !projectId) {
            return res.status(400).json({
                success: false,
                message: 'Type, amount, and projectId are required'
            });
        }

        // Fetch project
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                tenantId: req.user.tenantId
            }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // V1.2: Determine payer (Manager can assign, Engineer defaults to self)
        let actualPayer = req.user.id;
        if (payerUserId && (req.user.role === 'PROJECT_MANAGER' || req.user.role === 'ADMIN')) {
            actualPayer = payerUserId;
        }

        const result = await prisma.$transaction(async (tx) => {
            let profitInfo = null;

            // ========== V1.2 INCOME LOGIC ==========
            if (type === 'INCOME') {
                // NEW: Add full amount to Project Safe (no split)
                const transaction = await tx.transaction.create({
                    data: {
                        type: 'INCOME',
                        category: category || 'PAYMENT',
                        amount: Number(amount),
                        description: description || 'Client Payment',
                        status: 'APPROVED',
                        projectId,
                        projectCostItemId,
                        clientId: clientId || project.clientId,
                        createdBy: actualPayer,
                        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
                        paymentMethod: paymentMethod || 'BANK_TRANSFER',
                        invoiceNumber,
                        tenantId: req.user.tenantId
                    }
                });

                // V1.2: Update Project Safe Balance (full amount)
                await tx.project.update({
                    where: {
                        id: projectId,
                        tenantId: req.user.tenantId
                    },
                    data: {
                        projectSafeBalance: { increment: Number(amount) }
                    }
                });

                profitInfo = {
                    type: 'INCOME',
                    amountToSafe: Number(amount),
                    profitRecognized: 0,
                    message: 'Full amount added to Project Safe. Profit will be recognized on expenses.'
                };

                return { transaction, profitInfo };
            }

            // ========== V1.2 EXPENSE LOGIC ==========
            if (type === 'EXPENSE') {
                // V1.2: If projectCostItemId is missing but itemName is provided, create a new ProjectCostItem (Work Order/Band)
                let finalCostItemId = projectCostItemId;
                if (!finalCostItemId && itemName && type === 'EXPENSE') {
                    const newItem = await tx.projectCostItem.create({
                        data: {
                            projectId,
                            name: itemName,
                            category,
                            totalQuantity: quantity ? Number(quantity) : null,
                            unitOfMeasure: unit,
                            unitPrice: unitPrice ? Number(unitPrice) : null,
                            estimatedTotal: (quantity && unitPrice) ? (Number(quantity) * Number(unitPrice)) : null,
                            tenantId: req.user.tenantId,
                            totalPaid: 0 // Will be incremented below
                        }
                    });
                    finalCostItemId = newItem.id;
                }

                const transaction = await tx.transaction.create({
                    data: {
                        type: 'EXPENSE',
                        category,
                        amount: Number(amount),
                        description,
                        status: 'APPROVED',
                        projectId,
                        projectCostItemId: finalCostItemId,
                        supplierId,
                        workmanId,
                        createdBy: actualPayer,
                        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
                        paymentMethod: paymentMethod || 'CASH',
                        invoiceNumber,
                        isOfficeExpense: isOfficeExpense || false,
                        tenantId: req.user.tenantId
                    }
                });

                // Deduct from Project Safe or Office Expenses
                if (isOfficeExpense) {
                    await tx.project.update({
                        where: {
                            id: projectId,
                            tenantId: req.user.tenantId
                        },
                        data: {
                            officeExpenses: { increment: Number(amount) },
                            actualCost: { increment: Number(amount) }
                        }
                    });
                } else {
                    await tx.project.update({
                        where: {
                            id: projectId,
                            tenantId: req.user.tenantId
                        },
                        data: {
                            projectSafeBalance: { decrement: Number(amount) },
                            actualCost: { increment: Number(amount) }
                        }
                    });
                }

                // Update Cost Item if linked
                if (finalCostItemId) {
                    await tx.projectCostItem.update({
                        where: {
                            id: finalCostItemId,
                            tenantId: req.user.tenantId
                        },
                        data: {
                            totalPaid: { increment: Number(amount) }
                        }
                    });
                }

                // V1.2: Update Workman balance if linked
                if (workmanId) {
                    await tx.workman.update({
                        where: {
                            id: workmanId,
                            tenantId: req.user.tenantId
                        },
                        data: {
                            totalPaid: { increment: Number(amount) }
                        }
                    });
                }

                // V1.2 PROFIT CALCULATION
                // If it's NOT an inventory purchase and NOT an office expense, recognize profit immediately
                if (!createBatch && !isOfficeExpense) {
                    const feePercent = Number(project.managementFeePercent) || 0;
                    const profit = Number(amount) * (feePercent / 100);

                    if (profit > 0 && project.revenueModel === 'EXECUTION_COST_PLUS') {
                        // Transfer profit from Project Safe to Office Revenue
                        await tx.project.update({
                            where: {
                                id: projectId,
                                tenantId: req.user.tenantId
                            },
                            data: {
                                projectSafeBalance: { decrement: profit },
                                officeRevenue: { increment: profit }
                            }
                        });

                        profitInfo = {
                            profit,
                            projectSafeAfter: Number(project.projectSafeBalance) - Number(amount) - profit,
                            officeRevenueAfter: Number(project.officeRevenue) + profit,
                            message: `Profit of ${profit} EGP recognized and transferred to office revenue.`
                        };
                    } else {
                        profitInfo = {
                            profit: 0,
                            message: 'No profit recognized (not a COST_PLUS project or 0% fee).'
                        };
                    }
                } else {
                    // Inventory Purchase: Create batch, defer profit
                    await tx.materialBatch.create({
                        data: {
                            projectId,
                            originalReceiptId: transaction.id,
                            description: description || 'Material Purchase',
                            initialValue: Number(amount),
                            remainingValue: Number(amount),
                            status: 'AVAILABLE',
                            recordedBy: actualPayer,
                            tenantId: req.user.tenantId
                        }
                    });

                    profitInfo = {
                        profit: 0,
                        message: 'Inventory batch created. Profit deferred until usage.'
                    };
                }

                // Check if Project Safe is negative and send notification
                const updatedProject = await tx.project.findFirst({
                    where: {
                        id: projectId,
                        tenantId: req.user.tenantId
                    },
                    include: { engineer: true }
                });

                if (Number(updatedProject.projectSafeBalance) < 0) {
                    // Send notification to project manager and admin
                    await tx.notification.create({
                        data: {
                            userId: updatedProject.engineerId,
                            tenantId: req.user.tenantId,
                            type: 'ALERT',
                            title: '⚠️ Project Safe Balance Negative',
                            message: `Project "${updatedProject.name}" has a negative safe balance: ${updatedProject.projectSafeBalance} EGP`,
                            resourceId: projectId,
                            resourceType: 'project'
                        }
                    });
                }

                return { transaction, profitInfo };
            }

            throw new Error('Invalid transaction type');
        });

        res.status(201).json({
            success: true,
            data: result.transaction,
            profitInfo: result.profitInfo
        });

    } catch (error) {
        next(error);
    }
};
