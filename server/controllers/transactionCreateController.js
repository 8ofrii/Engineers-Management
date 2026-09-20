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
            isOfficeExpense,
            beneficiary,
            transactionTo,
            transactionFrom,
            costCenter,
            physicalAccount,
            paidByClientContact,
            voiceNoteUrl,
            receiptPhotoUrl,
            aiRawText,
            aiExtractedData,
            safeId
        } = req.body;

        // Validate required fields: projectId is required UNLESS isOfficeExpense is true
        if (!type || !amount || (!projectId && !isOfficeExpense)) {
            return res.status(400).json({
                success: false,
                message: 'Type, amount, and projectId (or office expense flag) are required'
            });
        }

        // Fetch project if projectId is provided
        let project = null;
        if (projectId) {
            project = await prisma.project.findFirst({
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
                        projectId: projectId || null,
                        projectCostItemId: projectCostItemId || null,
                        clientId: clientId || project?.clientId || null,
                        safeId: safeId || null,
                        createdBy: actualPayer,
                        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
                        paymentMethod: paymentMethod || 'BANK_TRANSFER',
                        invoiceNumber: invoiceNumber || null,
                        transactionFrom: transactionFrom || null,
                        paidByClientContact: paidByClientContact || null,
                        physicalAccount: physicalAccount || null,
                        costCenter: costCenter || null,
                        isOfficeExpense: Boolean(isOfficeExpense),
                        voiceNoteUrl: voiceNoteUrl || null,
                        receiptPhotoUrl: receiptPhotoUrl || null,
                        aiRawText: aiRawText || null,
                        aiExtractedData: aiExtractedData || null,
                        tenantId: req.user.tenantId
                    }
                });

                // V1.2: Update Project Safe Balance (full amount) if attached to project
                if (projectId) {
                    await tx.project.update({
                        where: {
                            id: projectId,
                            tenantId: req.user.tenantId
                        },
                        data: {
                            projectSafeBalance: { increment: Number(amount) }
                        }
                    });
                }

                // Update Company Safe Balance if safe selected
                if (safeId) {
                    await tx.companySafe.update({
                        where: { id: safeId },
                        data: {
                            balance: { increment: Number(amount) }
                        }
                    });
                }

                profitInfo = {
                    type: 'INCOME',
                    amountToSafe: Number(amount),
                    profitRecognized: 0,
                    message: 'Full amount added to Safe. Profit will be recognized on expenses.'
                };

                return { transaction, profitInfo };
            }

            // ========== V1.2 EXPENSE LOGIC ==========
            if (type === 'EXPENSE') {
                // V1.2: If projectCostItemId is missing but itemName is provided, create a new ProjectCostItem (Work Order/Band)
                let finalCostItemId = projectCostItemId;
                if (!finalCostItemId && itemName && projectId) {
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
                        projectId: projectId || null,
                        projectCostItemId: finalCostItemId || null,
                        supplierId: supplierId || null,
                        workmanId: workmanId || null,
                        safeId: safeId || null,
                        beneficiary: beneficiary || null,
                        transactionTo: transactionTo || null,
                        costCenter: costCenter || null,
                        createdBy: actualPayer,
                        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
                        paymentMethod: paymentMethod || 'CASH',
                        invoiceNumber: invoiceNumber || null,
                        isOfficeExpense: Boolean(isOfficeExpense),
                        voiceNoteUrl: voiceNoteUrl || null,
                        receiptPhotoUrl: receiptPhotoUrl || null,
                        aiRawText: aiRawText || null,
                        aiExtractedData: aiExtractedData || null,
                        tenantId: req.user.tenantId
                    }
                });

                // Update Company Safe balance if safe selected
                if (safeId) {
                    await tx.companySafe.update({
                        where: { id: safeId },
                        data: {
                            balance: { decrement: Number(amount) }
                        }
                    });
                }

                // Deduct from Project Safe or Office Expenses if project exists
                if (projectId) {
                    if (category === 'MANAGEMENT_FEE_TRANSFER') {
                        await tx.project.update({
                            where: {
                                id: projectId,
                                tenantId: req.user.tenantId
                            },
                            data: {
                                projectSafeBalance: { decrement: Number(amount) },
                                officeRevenue: { increment: Number(amount) }
                            }
                        });
                    } else if (isOfficeExpense) {
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

                // V1.2 PROFIT CALCULATION / BATCH CREATION
                if (createBatch && (projectId || req.body.supplierId)) {
                    // Inventory Purchase: Coalesce into active batch or create new, defer profit
                    let parsedQty = Number(req.body.quantity) || 0;
                    if (!parsedQty && req.body.unitPrice && Number(req.body.unitPrice) > 0) {
                        parsedQty = Number(amount) / Number(req.body.unitPrice);
                    }

                    const targetProjectId = projectId || null;
                    const targetSupplierId = req.body.supplierId || null;
                    const effectiveMatId = req.body.materialId || null;

                    const existingBatch = await tx.materialBatch.findFirst({
                        where: {
                            tenantId: req.user.tenantId,
                            projectId: targetProjectId,
                            supplierId: targetSupplierId,
                            status: { in: ['AVAILABLE', 'PARTIALLY_USED'] },
                            ...(effectiveMatId
                                ? { materialId: effectiveMatId }
                                : { description: { equals: description || 'Material Purchase', mode: 'insensitive' } }
                            )
                        },
                        orderBy: { createdAt: 'desc' }
                    });

                    if (existingBatch) {
                        await tx.materialBatch.update({
                            where: { id: existingBatch.id },
                            data: {
                                initialValue: { increment: Number(amount) },
                                remainingValue: { increment: Number(amount) },
                                status: Number(existingBatch.remainingValue) + Number(amount) === Number(existingBatch.initialValue) + Number(amount) && !existingBatch.quantityUsed
                                    ? 'AVAILABLE'
                                    : 'PARTIALLY_USED',
                                updatedAt: new Date()
                            }
                        });
                    } else {
                        await tx.materialBatch.create({
                            data: {
                                projectId: targetProjectId,
                                supplierId: targetSupplierId,
                                originalReceiptId: transaction.id,
                                description: description || 'Material Purchase',
                                initialValue: Number(amount),
                                remainingValue: Number(amount),
                                status: 'AVAILABLE',
                                recordedBy: actualPayer,
                                tenantId: req.user.tenantId,
                                materialId: effectiveMatId
                            }
                        });
                    }

                    if (effectiveMatId) {
                        await tx.material.update({
                            where: { id: effectiveMatId },
                            data: {
                                stockLevel: { increment: parsedQty > 0 ? parsedQty : 1 }
                            }
                        });
                    }

                    profitInfo = {
                        profit: 0,
                        message: 'Batch created. Profit deferred until material is consumed.'
                    };
                } else if (!isOfficeExpense && project) {
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

                        // Explicit ledger transaction for management fee
                        await tx.transaction.create({
                            data: {
                                type: 'EXPENSE',
                                category: 'MANAGEMENT_FEE_TRANSFER',
                                amount: profit,
                                description: `Cost-Plus Management Fee (${feePercent}%) on ${amount} EGP expense (${description || ''})`,
                                notes: `PARENT_TX:${transaction.id}`,
                                status: 'APPROVED',
                                projectId,
                                createdBy: actualPayer,
                                transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
                                paymentMethod: 'BANK_TRANSFER',
                                isOfficeExpense: false,
                                tenantId: req.user.tenantId
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
