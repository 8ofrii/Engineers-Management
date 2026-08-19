import prisma from '../lib/prisma.js';
import { canAutoApprove, requiredRoleForAmount } from '../lib/approvalThresholds.js';

/**
 * V1.2 PROFIT ENGINE: "Profit on Expense" Logic
 * 
 * OLD LOGIC (DISCARDED): Income split 80/20 → Project Safe / Office Revenue
 * NEW LOGIC (IMPLEMENTED):
 * 
 * A. INCOME Transaction:
 *    - Add full amount to Project.projectSafeBalance
 *    - Profit = 0 (not recognized yet)
 * 
 * B. EXPENSE Transaction (Direct/Service on COST_PLUS):
 *    - Deduct Amount from Project.projectSafeBalance
 *    - Calculate Profit = Amount * (ManagementFeePercent / 100)
 *    - Transfer Profit from projectSafeBalance to officeRevenue
 * 
 * C. EXPENSE Transaction (Inventory Purchase):
 *    - Deduct Amount from Project.projectSafeBalance
 *    - Profit = 0 (deferred until usage)
 * 
 * D. INVENTORY USAGE:
 *    - Calculate Profit = ValueConsumed * (ManagementFeePercent / 100)
 *    - Transfer Profit from projectSafeBalance to officeRevenue
 */

/**
 * Helper: Calculate and transfer profit on expense
 * @param {Object} tx - Prisma transaction client
 * @param {Object} project - Project object
 * @param {Number} expenseAmount - The expense amount
 * @param {String} userId - The user creating the transaction
 * @returns {Object} { profit, projectSafeAfter, officeRevenueAfter }
 */
const calculateAndTransferProfit = async (tx, project, expenseAmount, userId) => {
    const feePercent = Number(project.managementFeePercent) || 0;
    const profit = Number(expenseAmount) * (feePercent / 100);

    if (profit > 0 && project.revenueModel === 'EXECUTION_COST_PLUS') {
        // Transfer profit from Project Safe to Office Revenue
        await tx.project.update({
            where: {
                id: project.id,
                tenantId: project.tenantId
            },
            data: {
                projectSafeBalance: { decrement: profit },
                officeRevenue: { increment: profit }
            }
        });

        // V1.2 REVISION: Create an explicit ledger transaction for the management fee
        await tx.transaction.create({
            data: {
                type: 'EXPENSE',
                category: 'MANAGEMENT_FEE_TRANSFER',
                amount: profit,
                description: `Cost-Plus Management Fee (${feePercent}%) on ${expenseAmount} EGP expense`,
                status: 'APPROVED',
                projectId: project.id,
                createdBy: userId,
                transactionDate: new Date(),
                paymentMethod: 'OTHER',
                tenantId: project.tenantId,
                isOfficeExpense: false
            }
        });

        return {
            profit,
            projectSafeAfter: Number(project.projectSafeBalance) - Number(expenseAmount) - profit,
            officeRevenueAfter: Number(project.officeRevenue) + profit
        };
    }

    return {
        profit: 0,
        projectSafeAfter: Number(project.projectSafeBalance) - Number(expenseAmount),
        officeRevenueAfter: Number(project.officeRevenue)
    };
};

/**
 * @desc    Create a new transaction with V1.2 Profit Logic
 * @route   POST /api/transactions
 * @access  Private
 */
export const createTransactionV2 = async (req, res, next) => {
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
            payerUserId, // For managers to assign payer
            invoiceNumber,
            clientId,
            supplierId,
            workmanId,
            createBatch,// Flag for inventory purchase
            itemName,   // For creating new ProjectCostItem
            unit,
            quantity,
            unitPrice,
            costCenter,
            transactionTo,
            transactionFrom,
            physicalAccount
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

        // Determine payer (Manager can assign, Engineer defaults to self)
        let actualPayer = req.user.id;
        if (payerUserId && (req.user.role === 'PROJECT_MANAGER' || req.user.role === 'ADMIN')) {
            actualPayer = payerUserId;
        }

        // Income is money coming IN to the company/project from clients — auto-approved immediately.
        // Expenses require approval thresholds based on creator role and amount.
        const callerRole = req.user.role;
        let initialStatus = 'APPROVED';
        if (type === 'EXPENSE') {
            const tenantConfig = await prisma.tenant.findUnique({
                where: { id: req.user.tenantId },
                select: { approvalThresholds: true }
            });
            initialStatus = canAutoApprove(callerRole, amount, tenantConfig)
                ? 'APPROVED'
                : 'PENDING_APPROVAL';
        }

        const result = await prisma.$transaction(async (tx) => {
            let profitInfo = null;

            // ========== INCOME LOGIC ==========
            if (type === 'INCOME') {
                // V1.2: Add full amount to Project Safe
                const transaction = await tx.transaction.create({
                    data: {
                        type: 'INCOME',
                        category: category || 'PAYMENT',
                        amount: Number(amount),
                        description: description || 'Client Payment',
                        status: initialStatus,
                        projectId,
                        projectCostItemId,
                        clientId: clientId || project.clientId,
                        createdBy: actualPayer,
                        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
                        paymentMethod: paymentMethod || 'BANK_TRANSFER',
                        invoiceNumber: invoiceNumber || null,
                        costCenter: costCenter || null,
                        transactionTo: transactionTo || null,
                        transactionFrom: transactionFrom || null,
                        physicalAccount: physicalAccount || null,
                        tenantId: req.user.tenantId
                    }
                });

                // Only Update Project Safe Balance if APPROVED
                if (initialStatus === 'APPROVED') {
                    await tx.project.update({
                        where: { id: projectId, tenantId: req.user.tenantId },
                        data: { projectSafeBalance: { increment: Number(amount) } }
                    });
                }

                return {
                    transaction,
                    profitInfo: {
                        type: 'INCOME',
                        amountToSafe: initialStatus === 'APPROVED' ? Number(amount) : 0,
                        profitRecognized: 0,
                        message: initialStatus === 'APPROVED' ? 'Full amount added to Project Safe. Profit deferred.' : 'Transaction pending approval.'
                    }
                };
            }

            // ========== EXPENSE LOGIC ==========
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
                        status: initialStatus,
                        projectId,
                        projectCostItemId: finalCostItemId,
                        supplierId,
                        workmanId,
                        createdBy: actualPayer,
                        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
                        paymentMethod: paymentMethod || 'CASH',
                        invoiceNumber: invoiceNumber || null,
                        costCenter: costCenter || null,
                        transactionTo: transactionTo || null,
                        transactionFrom: transactionFrom || null,
                        physicalAccount: physicalAccount || null,
                        tenantId: req.user.tenantId
                    }
                });

                // If DRAFT, we skip safe deduction and profit calculation
                if (initialStatus === 'PENDING_APPROVAL') {
                    // Just return the transaction without calculating profit or deductions
                    return {
                        transaction,
                        profitInfo: {
                            profit: 0,
                            message: 'Transaction saved as draft. Waiting for Manager approval.'
                        }
                    };
                }

                // If APPROVED, Deduct from Project Safe
                const updatedProject = await tx.project.update({
                    where: { id: projectId, tenantId: req.user.tenantId },
                    data: {
                        projectSafeBalance: { decrement: Number(amount) },
                        actualCost: { increment: Number(amount) }
                    },
                    include: { engineer: true }
                });

                // ALERT: If project safe becomes negative, notify manager and admin
                if (Number(updatedProject.projectSafeBalance) < 0) {
                    await tx.notification.create({
                        data: {
                            userId: updatedProject.engineerId, // Project manager/engineer
                            tenantId: req.user.tenantId,
                            type: 'ALERT',
                            title: '⚠️ Project Safe Balance Negative',
                            message: `Project "${updatedProject.name}" has a negative safe balance: ${updatedProject.projectSafeBalance} EGP`,
                            resourceId: projectId,
                            resourceType: 'project'
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

                // PROFIT CALCULATION
                // If it's NOT an inventory purchase and is APPROVED, recognize profit immediately
                if (!createBatch) {
                    profitInfo = await calculateAndTransferProfit(tx, updatedProject, amount, actualPayer);
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
                        message: 'Inventory created. Profit deferred until usage.'
                    };
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

/**
 * @desc    Record Inventory Usage with Profit Recognition
 * @route   POST /api/transactions/inventory-usage
 * @access  Private
 */
export const recordInventoryUsage = async (req, res, next) => {
    try {
        const {
            materialBatchId,
            valueConsumed,
            quantityConsumed,
            projectId,
            description
        } = req.body;

        const batch = await prisma.materialBatch.findFirst({
            where: {
                id: materialBatchId,
                tenantId: req.user.tenantId
            },
            include: { project: true }
        });

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Material batch not found'
            });
        }

        if (Number(valueConsumed) > Number(batch.remainingValue)) {
            return res.status(400).json({
                success: false,
                message: 'Value consumed exceeds remaining batch value'
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Update batch
            const newRemaining = Number(batch.remainingValue) - Number(valueConsumed);
            await tx.materialBatch.update({
                where: {
                    id: materialBatchId,
                    tenantId: req.user.tenantId
                },
                data: {
                    remainingValue: newRemaining,
                    status: newRemaining === 0 ? 'CONSUMED' : 'PARTIALLY_USED',
                    ...(quantityConsumed && { quantityUsed: { increment: Number(quantityConsumed) } })
                }
            });

            // Resolve materialId: if batch doesn't have materialId linked, find or create default material
            let effectiveMaterialId = batch.materialId;
            if (!effectiveMaterialId) {
                const defaultMaterial = await tx.material.findFirst({
                    where: { tenantId: req.user.tenantId, deletedAt: null }
                });
                if (defaultMaterial) {
                    effectiveMaterialId = defaultMaterial.id;
                } else {
                    const newMat = await tx.material.create({
                        data: {
                            name: batch.description || 'General Material',
                            unit: 'PIECE',
                            unitPrice: Number(valueConsumed) || 0,
                            tenantId: req.user.tenantId
                        }
                    });
                    effectiveMaterialId = newMat.id;
                }
            }

            // Create usage record
            const usage = await tx.materialUsage.create({
                data: {
                    materialId: effectiveMaterialId,
                    projectId: projectId || batch.projectId,
                    quantity: quantityConsumed && Number(quantityConsumed) > 0 ? Number(quantityConsumed) : 1,
                    notes: description || 'Material Usage',
                    recordedBy: req.user.id,
                    tenantId: req.user.tenantId
                }
            });

            // PROFIT RECOGNITION on Usage
            const profitInfo = await calculateAndTransferProfit(
                tx,
                batch.project,
                valueConsumed,
                req.user.id
            );

            // ALERT: If project safe becomes negative after profit transfer
            if (profitInfo.profit > 0) {
                const refreshedProject = await tx.project.findFirst({
                    where: {
                        id: batch.projectId,
                        tenantId: req.user.tenantId
                    },
                    include: { engineer: true }
                });

                if (Number(refreshedProject.projectSafeBalance) < 0) {
                    await tx.notification.create({
                        data: {
                            userId: refreshedProject.engineerId,
                            tenantId: req.user.tenantId,
                            type: 'ALERT',
                            title: '⚠️ Negative Balance on Usage',
                            message: `Project "${refreshedProject.name}" has hit a negative balance after recognizing profit for material usage. Current Balance: ${refreshedProject.projectSafeBalance} EGP`,
                            resourceId: batch.projectId,
                            resourceType: 'project'
                        }
                    });
                }
            }

            return { usage, profitInfo };
        });

        res.status(201).json({
            success: true,
            data: result.usage,
            profitInfo: result.profitInfo
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get Project Inventory (Aggregated Material Batches)
 * @route   GET /api/projects/:id/inventory
 * @access  Private
 */
export const getProjectInventory = async (req, res, next) => {
    try {
        const { id } = req.params;

        const batches = await prisma.materialBatch.findMany({
            where: {
                projectId: id,
                tenantId: req.user.tenantId,
                status: { in: ['AVAILABLE', 'PARTIALLY_USED'] }
            },
            include: {
                material: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Aggregate by material type
        const inventory = batches.reduce((acc, batch) => {
            const key = batch.material?.name || batch.description;
            if (!acc[key]) {
                acc[key] = {
                    itemName: key,
                    unitOfMeasure: batch.material?.unit || 'PIECE',
                    quantityOnHand: 0,
                    totalValue: 0,
                    batches: []
                };
            }

            acc[key].quantityOnHand += 1; // Count batches as quantity
            acc[key].totalValue += Number(batch.remainingValue);
            acc[key].batches.push({
                id: batch.id,
                description: batch.description,
                initialValue: batch.initialValue,
                remainingValue: batch.remainingValue,
                status: batch.status,
                unitPrice: batch.material?.unitPrice,
                unit: batch.material?.unit || 'PIECE'
            });

            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: Object.values(inventory)
        });

    } catch (error) {
        next(error);
    }
};

export default {
    createTransactionV2,
    recordInventoryUsage,
    getProjectInventory
};
