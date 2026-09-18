// Transaction approval workflow. Extracted from the 1,475-line
// transactionController.js so the approve/reject/submit/queue logic can
// evolve independently from CRUD and AI parsing.
//
// Lifecycle:
//   DRAFT
//     └─ submitTransaction  → PENDING_APPROVAL  (engineer; notifies PM)
//   PENDING_APPROVAL
//     ├─ approveTransaction → APPROVED          (manager/admin; runs the
//     │                                          atomic balance updates,
//     │                                          custody clearance, work-
//     │                                          order rollup, V1.2 profit
//     │                                          transfer, negative-safe
//     │                                          alerts)
//     └─ rejectTransaction  → REJECTED          (manager/admin; reverts
//                                                pending clearance + emits
//                                                ALERT to engineer)
//
//   getPendingApprovals    → manager queue listing
//
// Approval-tier guard: ensureCanApprove() checks the caller's role
// against the tenant's approvalThresholds JSON. Higher amounts can
// require higher rank. See lib/approvalThresholds.js.
//
// All mutations that touch multiple rows run inside prisma.$transaction()
// for atomicity. auditFromReq() emits an immutable AuditLog entry per
// approval/rejection so we can prove who approved what.

import prisma from '../lib/prisma.js';
import { auditFromReq } from '../lib/audit.js';
import { ensureCanApprove, InsufficientApprovalRankError } from '../lib/approvalThresholds.js';

// @desc    Get pending approval transactions
// @route   GET /api/transactions/pending
// @access  Private (Manager, Admin)
export const getPendingApprovals = async (req, res, next) => {
    try {
        const pending = await prisma.transaction.findMany({
            where: {
                status: 'PENDING_APPROVAL',
                tenantId: req.user.tenantId
            },
            include: {
                user: { select: { name: true, email: true } },
                project: { select: { name: true } },
                supplier: { select: { name: true } },
                client: { select: { name: true } },
                payer: { select: { name: true } },
                workman: { select: { name: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.status(200).json({
            success: true,
            count: pending.length,
            data: pending
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Submit transaction for approval
// @route   PUT /api/transactions/:id/submit
// @access  Private
export const submitTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { receiptPhotoUrl, confirmedAmount, confirmedDescription } = req.body;

        const transaction = await prisma.transaction.findFirst({
            where: {
                id,
                tenantId: req.user.tenantId
            },
            include: { project: { include: { engineer: true } } }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        if (transaction.status !== 'DRAFT') {
            return res.status(400).json({
                success: false,
                message: 'Only draft transactions can be submitted'
            });
        }

        if (transaction.createdBy !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Update transaction
        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                status: 'PENDING_APPROVAL',
                receiptPhotoUrl: receiptPhotoUrl,
                amount: confirmedAmount || transaction.amount,
                description: confirmedDescription || transaction.description
            }
        });

        // Notify project manager
        await prisma.notification.create({
            data: {
                userId: transaction.project.engineerId,
                type: 'ACTION_REQUIRED',
                title: 'New Expense Pending Approval',
                message: `${req.user.name} submitted expense: ${confirmedAmount || transaction.amount} EGP for ${transaction.project.name}`,
                resourceId: id,
                resourceType: 'transaction'
            }
        });

        res.status(200).json({
            success: true,
            data: updated,
            message: 'Transaction submitted for approval'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Approve transaction
// @route   PUT /api/transactions/:id/approve
// @access  Private (Manager, Admin)
export const approveTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;

        const transaction = await prisma.transaction.findFirst({
            where: {
                id,
                tenantId: req.user.tenantId
            },
            include: {
                user: true,
                project: true,
                projectCostItem: true
            }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        if (transaction.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({
                success: false,
                message: 'Transaction is not pending approval'
            });
        }

        // Segregation of duties: Creator cannot approve their own transaction (Four-Eyes Principle)
        if (transaction.createdBy === req.user.id && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Segregation of duties violation: You cannot approve transactions that you created. A secondary reviewer must approve this transaction.'
            });
        }

        // Multi-level approval threshold check against tenant config
        const tenant = await prisma.tenant.findUnique({
            where: { id: req.user.tenantId },
            select: { approvalThresholds: true }
        });

        try {
            ensureCanApprove(req.user.role, transaction.amount, tenant);
        } catch (err) {
            if (err instanceof InsufficientApprovalRankError) {
                return res.status(403).json({
                    success: false,
                    message: err.message,
                    requiredRole: err.requiredRole,
                    callerRole: err.callerRole,
                    amount: err.amount
                });
            }
            throw err;
        }

        // Import V1.2 office profit calculation
        const transactionV2 = await import('./transactionControllerV2.js');

        // THE CRITICAL LINKS - All happen atomically
        const updates = await prisma.$transaction(async (tx) => {
            // LINK 1: Update transaction status
            const updatedTransaction = await tx.transaction.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    approvedBy: req.user.id,
                    approvedAt: new Date()
                }
            });

            // If this is an INCOME transaction, increment project safe balance upon approval
            if (transaction.type === 'INCOME') {
                await tx.project.update({
                    where: { id: transaction.projectId, tenantId: req.user.tenantId },
                    data: {
                        projectSafeBalance: { increment: transaction.amount }
                    }
                });
            }

            // Make sure we have the latest project data for calculation
            const project = await tx.project.findFirst({
                where: { id: transaction.projectId, tenantId: req.user.tenantId }
            });

            // LINK 2: Handle EXPENSE transactions with logic V1.2
            if (transaction.category === 'MANAGEMENT_FEE_TRANSFER') {
                await tx.project.update({
                    where: { id: transaction.projectId, tenantId: req.user.tenantId },
                    data: {
                        projectSafeBalance: { decrement: transaction.amount },
                        officeRevenue: { increment: transaction.amount }
                    }
                });
            } else if (transaction.type === 'EXPENSE') {
                const isInventory = transaction.category === 'MATERIALS' || transaction.category === 'ELECTRICITY_MATERIALS' || transaction.category === 'PLUMBING_MATERIALS' || transaction.category === 'PAINTING_MATERIALS' || transaction.category === 'CERAMIC_MATERIALS' || transaction.category === 'CARPENTRY_MATERIALS';

                // Deduct from Project Safe (Drafts skipped this on creation)
                const updatedProject = await tx.project.update({
                    where: { id: transaction.projectId, tenantId: req.user.tenantId },
                    data: {
                        projectSafeBalance: { decrement: transaction.amount },
                        actualCost: { increment: transaction.amount }
                    },
                    include: { engineer: true }
                });

                // V1.2 PROFIT CALCULATION
                if (!isInventory) {
                    // Call the V1.2 calculation directly
                    // Note: We need to recreate calculateAndTransferProfit logic here or import it
                    // To keep it simple and avoid circular deps, we rewrite the calculation inline here
                    const feePercent = Number(updatedProject.managementFeePercent) || 0;
                    const profit = Number(transaction.amount) * (feePercent / 100);

                    if (profit > 0 && updatedProject.revenueModel === 'EXECUTION_COST_PLUS') {
                        // Transfer profit
                        await tx.project.update({
                            where: { id: updatedProject.id, tenantId: req.user.tenantId },
                            data: {
                                projectSafeBalance: { decrement: profit },
                                officeRevenue: { increment: profit }
                            }
                        });

                        // Explicit ledger transaction
                        await tx.transaction.create({
                            data: {
                                type: 'EXPENSE',
                                category: 'MANAGEMENT_FEE_TRANSFER',
                                amount: profit,
                                description: `Cost-Plus Management Fee (${feePercent}%) on ${transaction.amount} EGP expense (${transaction.description})`,
                                status: 'APPROVED',
                                projectId: updatedProject.id,
                                createdBy: req.user.id,
                                transactionDate: new Date(),
                                paymentMethod: 'OTHER',
                                tenantId: req.user.tenantId,
                                isOfficeExpense: false,
                                notes: `PARENT_TX:${transaction.id}`
                            }
                        });
                    }
                }

                // LINK 3: Update work order if linked
                if (transaction.projectCostItemId) {
                    const workOrder = await tx.projectCostItem.findFirst({
                        where: { id: transaction.projectCostItemId, tenantId: req.user.tenantId }
                    });

                    if (workOrder) {
                        const newTotalPaid = Number(workOrder.totalPaid) + Number(transaction.amount);
                        const isCompleted = workOrder.estimatedTotal && newTotalPaid >= Number(workOrder.estimatedTotal);

                        await tx.projectCostItem.update({
                            where: { id: transaction.projectCostItemId, tenantId: req.user.tenantId },
                            data: {
                                totalPaid: newTotalPaid,
                                status: isCompleted ? 'COMPLETED' : 'OPEN'
                            }
                        });
                    }
                }

                // LINK 4: Handle custody payment clearance
                if (transaction.paymentMethod === 'CUSTODY_WALLET') {
                    // Reduce the user's pending clearance
                    await tx.user.update({
                        where: { id: transaction.createdBy },
                        data: {
                            currentCustodyBalance: { decrement: transaction.amount },
                            pendingClearance: { decrement: transaction.amount }
                        }
                    });

                    await tx.custodyTransfer.create({
                        data: {
                            type: 'CLEARANCE',
                            amount: transaction.amount,
                            description: `Cleared: ${transaction.description}`,
                            engineerId: transaction.createdBy,
                            // Note: balance is computed below
                            balanceBefore: transaction.user.currentCustodyBalance,
                            balanceAfter: Number(transaction.user.currentCustodyBalance) - Number(transaction.amount),
                            relatedTransactionId: id,
                            tenantId: req.user.tenantId
                        }
                    });
                }

                // LINK 5: Create material batch if it's a material purchase (inventory)
                if (isInventory) {
                    await tx.materialBatch.create({
                        data: {
                            category: transaction.category,
                            projectId: transaction.projectId,
                            originalReceiptId: id,
                            description: transaction.description,
                            initialValue: transaction.amount,
                            remainingValue: transaction.amount,
                            status: 'AVAILABLE',
                            recordedBy: transaction.createdBy,
                            tenantId: req.user.tenantId
                        }
                    });
                }

                // LINK 6: Check for negative project safe and send alerts
                const finalProject = await tx.project.findFirst({
                    where: {
                        id: transaction.projectId,
                        tenantId: req.user.tenantId
                    }
                });

                if (Number(finalProject.projectSafeBalance) < 0) {
                    // Get recipients: Project Manager + All ADMINs + All PROJECT_MANAGERs
                    const recipients = await tx.user.findMany({
                        where: {
                            OR: [
                                { id: finalProject.engineerId },
                                { role: 'ADMIN' },
                                { role: 'PROJECT_MANAGER' }
                            ],
                            tenantId: req.user.tenantId,
                            isActive: true
                        }
                    });

                    // Send alert notifications
                    for (const user of recipients) {
                        await tx.notification.create({
                            data: {
                                userId: user.id,
                                tenantId: req.user.tenantId,
                                type: 'ALERT',
                                title: 'تحذير: رصيد المشروع سالب',
                                message: `مشروع "${finalProject.name}" رصيده أصبح سالب: ${Number(finalProject.projectSafeBalance).toLocaleString()} جنيه`,
                                resourceId: finalProject.id,
                                resourceType: 'project'
                            }
                        });
                    }
                }
            }

            // LINK 7: Notify the engineer
            await tx.notification.create({
                data: {
                    userId: transaction.createdBy,
                    tenantId: req.user.tenantId,
                    type: 'INFO',
                    title: transaction.type === 'EXPENSE' ? 'تم الموافقة على المصروف' : 'تم الموافقة على المعاملة',
                    message: `تم الموافقة على ${transaction.type === 'EXPENSE' ? 'مصروف' : 'معاملة'} بقيمة ${Number(transaction.amount).toLocaleString()} جنيه`,
                    resourceId: id,
                    resourceType: 'transaction'
                }
            });

            return updatedTransaction;
        });

        res.status(200).json({
            success: true,
            data: updates,
            message: 'Transaction approved and all balances updated'
        });

        await auditFromReq(req, {
            action: 'APPROVE',
            entity: 'Transaction',
            entityId: req.params.id,
            metadata: { type: transaction.type, category: transaction.category, amount: Number(transaction.amount), projectId: transaction.projectId }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Reject transaction
// @route   PUT /api/transactions/:id/reject
// @access  Private (Manager, Admin)
export const rejectTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const transaction = await prisma.transaction.findFirst({
            where: {
                id,
                tenantId: req.user.tenantId
            }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        if (transaction.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({
                success: false,
                message: 'Transaction is not pending approval'
            });
        }

        // Update transaction and remove from pending clearance
        const [updated] = await prisma.$transaction([
            prisma.transaction.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    rejectionReason: reason,
                    approvedBy: req.user.id,
                    approvedAt: new Date()
                }
            }),

            prisma.user.update({
                where: { id: transaction.createdBy },
                data: {
                    pendingClearance: { decrement: transaction.amount }
                }
            }),

            prisma.notification.create({
                data: {
                    userId: transaction.createdBy,
                    type: 'ALERT',
                    title: 'Expense Rejected',
                    message: `Your expense of ${transaction.amount} EGP was rejected. Reason: ${reason}`,
                    resourceId: id,
                    resourceType: 'transaction'
                }
            })
        ]);

        await auditFromReq(req, {
            action: 'REJECT',
            entity: 'Transaction',
            entityId: id,
            metadata: { reason, amount: Number(transaction.amount), category: transaction.category }
        });

        res.status(200).json({
            success: true,
            data: updated,
            message: 'Transaction rejected'
        });

    } catch (error) {
        next(error);
    }
};
