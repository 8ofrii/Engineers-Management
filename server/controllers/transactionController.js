import prisma from '../lib/prisma.js';
import * as transactionV2 from './transactionControllerV2.js';
import { auditFromReq } from '../lib/audit.js';
import { ensureCanApprove, InsufficientApprovalRankError } from '../lib/approvalThresholds.js';

// @desc    Get unique cost centers
// @route   GET /api/transactions/cost-centers
// @access  Private
export const getCostCenters = async (req, res, next) => {
    try {
        const [costCenterRows, transactionFromRows, physicalAccountRows, transactionToRows] = await Promise.all([
            prisma.transaction.findMany({
                where: { tenantId: req.user.tenantId, costCenter: { not: null } },
                select: { costCenter: true },
                distinct: ['costCenter']
            }),
            prisma.transaction.findMany({
                where: { tenantId: req.user.tenantId, transactionFrom: { not: null } },
                select: { transactionFrom: true },
                distinct: ['transactionFrom']
            }),
            prisma.transaction.findMany({
                where: { tenantId: req.user.tenantId, physicalAccount: { not: null } },
                select: { physicalAccount: true },
                distinct: ['physicalAccount']
            }),
            prisma.transaction.findMany({
                where: { tenantId: req.user.tenantId, transactionTo: { not: null } },
                select: { transactionTo: true },
                distinct: ['transactionTo']
            })
        ]);

        res.status(200).json({
            success: true,
            data: {
                costCenters: costCenterRows.map(t => t.costCenter).filter(Boolean),
                transactionFroms: transactionFromRows.map(t => t.transactionFrom).filter(Boolean),
                physicalAccounts: physicalAccountRows.map(t => t.physicalAccount).filter(Boolean),
                transactionTos: transactionToRows.map(t => t.transactionTo).filter(Boolean)
            }
        });
    } catch (error) {
        next(error);
    }
};

// AI-driven voice/text parsing endpoints (analyzeTransaction, parseVoiceNote)
// have moved to controllers/transactionAiController.js. Routes are wired in
// routes/transactions.js — no behavior change.

// @desc    Get all transactions (role-based filtering)
// @route   GET /api/transactions
// @access  Private
export const getTransactions = async (req, res, next) => {
    try {
        let whereClause = {
            tenantId: req.user.tenantId
        };

        // Engineers can only see their own transactions.
        if (req.user.role === 'ENGINEER') {
            whereClause.createdBy = req.user.id;
        }

        // PROJECT_MANAGER, ADMIN, ACCOUNTANT, SUPER_ADMIN all see every
        // transaction in the tenant — managers need full visibility to
        // approve/reject submissions raised by any engineer.

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            include: {
                project: { select: { name: true } },
                supplier: { select: { name: true } },
                client: { select: { name: true } },
                user: { select: { name: true, email: true } }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            count: transactions.length,
            data: transactions
        });
    } catch (error) {
        next(error);
    }
};

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
                project: { select: { name: true } }
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

// @desc    Record client income (with auto-split)
// @route   POST /api/transactions/income
// @access  Private (Admin, Accountant)
export const recordIncome = async (req, res, next) => {
    try {
        const {
            projectId, amount, category, clientId, description,
            paymentMethod, transactionDate, invoiceNumber,
            transactionFrom, physicalAccount, payerUserId
        } = req.body;

        // Fetch project configuration
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

        // V1.2: Income is no longer split upon receipt.
        // It goes 100% to the Project Safe (Operational Fund).

        // Append extended details to description
        let finalDescription = description;
        const extras = [];
        if (transactionFrom) extras.push(`From: ${transactionFrom}`);
        if (physicalAccount) extras.push(`Safe: ${physicalAccount}`);
        if (extras.length > 0) {
            finalDescription = `${finalDescription || ''} | ${extras.join(' | ')}`;
        }

        // Atomic transaction
        const result = await prisma.$transaction([
            // Create income transaction
            prisma.transaction.create({
                data: {
                    type: 'INCOME',
                    category: category || 'PAYMENT',
                    amount: amount,
                    description: finalDescription,
                    status: 'APPROVED',
                    projectId: projectId,
                    clientId: clientId,
                    createdBy: req.user.id,
                    transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
                    paymentMethod: paymentMethod || 'BANK_TRANSFER',
                    invoiceNumber: invoiceNumber,
                    payerUserId: payerUserId,
                    tenantId: req.user.tenantId
                }
            }),

            // Update project safe balance (Full Amount - 100%)
            prisma.project.update({
                where: { id: projectId },
                data: {
                    projectSafeBalance: { increment: amount },
                    operationalFund: { increment: amount }
                }
            })
        ]);

        res.status(201).json({
            success: true,
            transaction: result[0],
            split: {
                total: amount,
                toProjectSafe: amount,
                officeRevenue: 0,
                note: 'Income goes 100% to project safe. Office revenue calculated on expenses.'
            }
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

        // Multi-level approval guard: caller's role must meet the threshold
        // tier required for this amount.
        try {
            const tenantCfg = await prisma.tenant.findUnique({
                where: { id: req.user.tenantId },
                select: { approvalThresholds: true }
            });
            ensureCanApprove(req.user.role, transaction.amount, tenantCfg);
        } catch (err) {
            if (err instanceof InsufficientApprovalRankError) {
                return res.status(403).json({
                    success: false,
                    message: err.message,
                    requiredRole: err.requiredRole,
                    callerRole: err.callerRole
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

            // Make sure we have the latest project data for calculation
            const project = await tx.project.findFirst({
                where: { id: transaction.projectId, tenantId: req.user.tenantId }
            });

            // LINK 2: Handle EXPENSE transactions with logic V1.2
            if (transaction.type === 'EXPENSE') {
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
                                isOfficeExpense: false
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

// @desc    Transfer custody between employees (e.g. Engineer giving cash to another)
// @route   POST /api/transactions/transfer-custody
// @access  Private
export const transferCustody = async (req, res, next) => {
    try {
        const { amount, fromEngineerId, toEngineerId, description } = req.body;

        if (!amount || !fromEngineerId || !toEngineerId) {
            return res.status(400).json({
                success: false,
                message: 'Amount, Sender, and Receiver are required.'
            });
        }

        const sender = await prisma.user.findFirst({
            where: { id: fromEngineerId, tenantId: req.user.tenantId }
        });

        const receiver = await prisma.user.findFirst({
            where: { id: toEngineerId, tenantId: req.user.tenantId }
        });

        if (!sender || !receiver) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Deduct from sender
            const updatedSender = await tx.user.update({
                where: { id: sender.id },
                data: { currentCustodyBalance: { decrement: amount } }
            });

            // Add to receiver
            const updatedReceiver = await tx.user.update({
                where: { id: receiver.id },
                data: { currentCustodyBalance: { increment: amount } }
            });

            // Create explicitly linked transfer transactions so it shows up globally
            const txOut = await tx.transaction.create({
                data: {
                    type: 'EXPENSE',
                    category: 'CUSTODY_TRANSFER',
                    amount: amount,
                    description: `Custody Out: ${description || 'Transfer to ' + receiver.name}`,
                    status: 'APPROVED',
                    createdBy: req.user.id,
                    transactionDate: new Date(),
                    paymentMethod: 'CASH',
                    transactionTo: receiver.name,
                    toEngineerId: receiver.id,
                    tenantId: req.user.tenantId
                }
            });

            const txIn = await tx.transaction.create({
                data: {
                    type: 'INCOME',
                    category: 'CUSTODY_TRANSFER',
                    amount: amount,
                    description: `Custody In: ${description || 'Transfer from ' + sender.name}`,
                    status: 'APPROVED',
                    createdBy: req.user.id,
                    transactionDate: new Date(),
                    paymentMethod: 'CASH',
                    transactionFrom: sender.name,
                    tenantId: req.user.tenantId
                }
            });

            // Log custody transfers
            await tx.custodyTransfer.create({
                data: {
                    type: 'CLEARANCE', // Sender gives money
                    amount: amount,
                    description: `Transferred to ${receiver.name}: ${description}`,
                    engineerId: sender.id,
                    balanceBefore: sender.currentCustodyBalance,
                    balanceAfter: updatedSender.currentCustodyBalance,
                    relatedTransactionId: txOut.id,
                    tenantId: req.user.tenantId
                }
            });

            await tx.custodyTransfer.create({
                data: {
                    type: 'FUNDING', // Receiver gets money
                    amount: amount,
                    description: `Received from ${sender.name}: ${description}`,
                    engineerId: receiver.id,
                    balanceBefore: receiver.currentCustodyBalance,
                    balanceAfter: updatedReceiver.currentCustodyBalance,
                    relatedTransactionId: txIn.id,
                    tenantId: req.user.tenantId
                }
            });

            return { senderBalance: updatedSender.currentCustodyBalance, receiverBalance: updatedReceiver.currentCustodyBalance };
        });

        res.status(200).json({
            success: true,
            data: result,
            message: 'Custody transferred successfully.'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Create draft transaction (manual entry)
// @route   POST /api/transactions/draft
// @access  Private
export const createDraft = async (req, res, next) => {
    try {
        const { projectId, amount, category, description, isOfficeExpense } = req.body;

        const draft = await prisma.transaction.create({
            data: {
                type: 'EXPENSE',
                category: category,
                amount: amount,
                description: description,
                status: 'DRAFT',
                projectId: projectId,
                createdBy: req.user.id,
                paymentMethod: 'CUSTODY_WALLET',
                isOfficeExpense: isOfficeExpense || false,
                tenantId: req.user.tenantId
            }
        });

        // Update pending clearance
        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                pendingClearance: { increment: amount }
            }
        });

        res.status(201).json({
            success: true,
            data: draft,
            message: 'Draft created. Please review and submit.'
        });

    } catch (error) {
        next(error);
    }
};

// Keep existing functions
export const getStats = async (req, res, next) => {
    try {
        let whereClause = {
            status: 'APPROVED',
            tenantId: req.user.tenantId
        };

        // Role-based filtering. Engineers see only their own; everyone
        // else sees the full tenant.
        if (req.user.role === 'ENGINEER') {
            whereClause.createdBy = req.user.id;
        }

        const transactions = await prisma.transaction.findMany({
            where: whereClause
        });

        const byType = transactions.reduce((acc, t) => {
            const typeKey = t.type.toUpperCase();
            const existing = acc.find(item => item._id === typeKey);
            if (existing) {
                existing.total += Number(t.amount);
            } else {
                acc.push({ _id: typeKey, total: Number(t.amount) });
            }
            return acc;
        }, []);

        // The dashboard's "Expenses by Category" chart consumes byCategory,
        // so only EXPENSE transactions belong here. Filter out income (PAYMENT)
        // and the auto-generated MANAGEMENT_FEE_TRANSFER ledger entries.
        const byCategory = transactions
            .filter(t => t.type === 'EXPENSE' && t.category !== 'MANAGEMENT_FEE_TRANSFER')
            .reduce((acc, t) => {
                const catKey = t.category.toUpperCase();
                const existing = acc.find(item => item._id === catKey);
                if (existing) {
                    existing.total += Number(t.amount);
                } else {
                    acc.push({ _id: catKey, total: Number(t.amount) });
                }
                return acc;
            }, []);

        res.status(200).json({
            success: true,
            data: {
                byType,
                byCategory
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getTransaction = async (req, res, next) => {
    try {
        const transaction = await prisma.transaction.findFirst({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId
            },
            include: {
                project: true,
                supplier: true,
                client: true,
                user: { select: { name: true, email: true } },
                approver: { select: { name: true, email: true } }
            }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        res.status(200).json({
            success: true,
            data: transaction
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete transaction (with financial reversals)
// @route   DELETE /api/transactions/:id
// @access  Private (Owner/Admin)
export const deleteTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;
        const transaction = await prisma.transaction.findFirst({
            where: {
                id,
                tenantId: req.user.tenantId
            },
            include: {
                project: true,
                user: true
            }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Authorization: Only Creator or Admin can delete
        if (transaction.createdBy !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'PROJECT_MANAGER') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this transaction'
            });
        }

        await prisma.$transaction(async (tx) => {
            // 1. Handle Reversals based on status
            if (transaction.type === 'EXPENSE') {
                if (transaction.paymentMethod === 'CUSTODY_WALLET') {
                    // If DRAFT or PENDING, money is in "pendingClearance" (Frozen)
                    // We must release it back (decrement pendingClearance is not quite right, pendingClearance tracks "money spent but not approved").
                    // Actually, `pendingClearance` = "Receipts in hand". 
                    // If I delete the receipt, I effectively say "I didn't spend this".
                    // So `pendingClearance` should be DECREMENTED.
                    // And `currentCustodyBalance`? In `createDraft` we ONLY touched `pendingClearance`.
                    // Wait, `createDraft` -> `pendingClearance: { increment: amount }`.
                    // `currentCustodyBalance` was NOT touched.
                    // So if I delete DRAFT, I just remove from `pendingClearance`.
                    if (transaction.status === 'DRAFT' || transaction.status === 'PENDING_APPROVAL') {
                        await tx.user.update({
                            where: { id: transaction.createdBy },
                            data: {
                                pendingClearance: { decrement: transaction.amount }
                            }
                        });
                    }
                    else if (transaction.status === 'APPROVED') {
                        // If APPROVED, it was deducted from `currentCustodyBalance` and removed from `pendingClearance`.
                        // Reversing means: Giving money back to `currentCustodyBalance`.
                        // And updating Project costs.

                        // Reverse User Impact
                        await tx.user.update({
                            where: { id: transaction.createdBy },
                            data: {
                                currentCustodyBalance: { increment: transaction.amount }
                            }
                        });

                        // Reverse Project Impact
                        if (transaction.projectId) {
                            await tx.project.update({
                                where: {
                                    id: transaction.projectId,
                                    tenantId: req.user.tenantId
                                },
                                data: {
                                    operationalFund: { increment: transaction.amount }, // Give back to fund
                                    actualCost: { decrement: transaction.amount }       // Reduce cost
                                }
                            });
                        }
                    }
                } else {
                    // Non-Custody Expense (Cash/Check/etc)
                    if (transaction.status === 'APPROVED' && transaction.projectId) {
                        await tx.project.update({
                            where: { id: transaction.projectId },
                            data: {
                                actualCost: { decrement: transaction.amount }
                            }
                        });
                    }
                }
            }
            else if (transaction.type === 'INCOME') {
                if (transaction.status === 'APPROVED' && transaction.projectId) {
                    // Reverse Income
                    // Need to reverse the split (Office/Ops)
                    // We can re-calculate or assume standard split.
                    // Let's use the project's current model.
                    const project = transaction.project;
                    let officeShare = 0;
                    let opsShare = Number(transaction.amount);

                    if (project.revenueModel === 'EXECUTION_COST_PLUS') {
                        const feePercent = Number(project.managementFeePercent) || 20;
                        officeShare = Number(transaction.amount) * (feePercent / 100);
                        opsShare = Number(transaction.amount) - officeShare;
                    }

                    await tx.project.update({
                        where: {
                            id: transaction.projectId,
                            tenantId: req.user.tenantId
                        },
                        data: {
                            officeRevenue: { decrement: officeShare },
                            operationalFund: { decrement: opsShare }
                        }
                    });
                }
            }

            // 2. Finally Delete
            await tx.transaction.delete({
                where: {
                    id,
                    tenantId: req.user.tenantId
                }
            });
        });

        await auditFromReq(req, {
            action: 'DELETE',
            entity: 'Transaction',
            entityId: req.params.id,
            before: {
                type: transaction.type,
                category: transaction.category,
                amount: Number(transaction.amount),
                status: transaction.status,
                projectId: transaction.projectId,
                createdBy: transaction.createdBy
            }
        });

        res.status(200).json({
            success: true,
            data: {},
            message: 'Transaction deleted and balances updated'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private (Owner/Admin)
// @desc    Attach (or replace) a receipt photo on an existing transaction.
// @route   PATCH /api/transactions/:id/receipt
// @access  Private (creator / manager / admin) — multipart with file=image
export const uploadReceipt = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { id } = req.params;
        const tx = await prisma.transaction.findFirst({
            where: { id, tenantId: req.user.tenantId }
        });
        if (!tx) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        // Authorization: creator, manager, admin, super-admin
        const canEdit =
            tx.createdBy === req.user.id ||
            req.user.role === 'PROJECT_MANAGER' ||
            req.user.role === 'ADMIN' ||
            req.user.role === 'SUPER_ADMIN';
        if (!canEdit) {
            return res.status(403).json({ success: false, message: 'Not authorized to attach a receipt to this transaction' });
        }

        const url = req.file.location || `/uploads/images/${req.file.filename}`;

        const updated = await prisma.transaction.update({
            where: { id },
            data: { receiptPhotoUrl: url }
        });

        await auditFromReq(req, {
            action: 'UPDATE',
            entity: 'Transaction',
            entityId: id,
            metadata: { field: 'receiptPhotoUrl', from: tx.receiptPhotoUrl || null, to: url }
        });

        res.status(200).json({ success: true, data: { id: updated.id, receiptPhotoUrl: updated.receiptPhotoUrl } });
    } catch (error) {
        next(error);
    }
};

export const updateTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            amount, description, category, transactionDate,
            paymentMethod, projectId,
            // Extended fields
            itemName, unit, quantity, unitPrice,
            transactionFrom, transactionTo, costCenter,
            invoiceNumber
        } = req.body;

        let transaction = await prisma.transaction.findFirst({
            where: {
                id,
                tenantId: req.user.tenantId
            }
        });

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        // Only allow editing if user is creator or admin, and status is usually DRAFT or PENDING
        // specific business logic can be added here

        // Append extended details to description if needed, similar to create
        // Logic: specific fields > description text
        // If we have extended fields, re-format the description.
        // If we don't, just use the description as is (assuming it might already contain the format or is simple)
        let finalDescription = description;
        if (quantity !== undefined || unitPrice !== undefined || unit || itemName) {
            // We are updating the "stats" part.
            // We should reconstruct the full string: "Clean Description | Qty Unit @ Price"
            const cleanDesc = description ? description.split('|')[0].trim() : (transaction.description.split('|')[0].trim());
            const q = quantity !== undefined ? Number(quantity) : 0;
            const up = unitPrice !== undefined ? Number(unitPrice) : 0;
            const u = unit || (transaction.description.includes('|') ? '' : 'TON'); // Fallback logic is tricky without explicit previous values, default empty

            // If the user didn't send unit, we might lose it if we just use ''. 
            // Ideally frontend sends ALL fields on update.
            // Assuming frontend sends the full state of the form.

            finalDescription = `${cleanDesc} | ${q} ${u} @ ${up}`;
        }

        const oldAmount = Number(transaction.amount);
        const newAmount = amount ? Number(amount) : oldAmount;
        const diff = newAmount - oldAmount;

        // Atomic update with financial recalculations
        const updated = await prisma.$transaction(async (tx) => {
            // 1. Update the Transaction itself
            const t = await tx.transaction.update({
                where: {
                    id,
                    tenantId: req.user.tenantId
                },
                data: {
                    amount: amount ? Number(amount) : undefined,
                    description: finalDescription,
                    category,
                    transactionDate: transactionDate ? new Date(transactionDate) : undefined,
                    paymentMethod,
                    projectId,
                    invoiceNumber,
                    payerUserId,
                    projectCostItemId
                }
            });

            // 2. Handle Financial Impacts if Amount Changed
            if (diff !== 0) {
                // If APPROVED, we must update balances
                if (transaction.status === 'APPROVED') {
                    // Update User Custody (if paid from custody)
                    if (transaction.paymentMethod === 'CUSTODY_WALLET') {
                        await tx.user.update({
                            where: { id: transaction.createdBy },
                            data: {
                                currentCustodyBalance: { decrement: diff }, // Spend more = Balance down
                                // pendingClearance is already cleared for approved transactions, so no change there
                            }
                        });
                    }

                    // Update Project Costs (if linked to project and is Expense)
                    if (transaction.projectId && transaction.type === 'EXPENSE') {
                        await tx.project.update({
                            where: {
                                id: transaction.projectId,
                                tenantId: req.user.tenantId
                            },
                            data: {
                                actualCost: { increment: diff },       // Cost goes up
                                operationalFund: { decrement: diff }   // Fund goes down
                            }
                        });
                    }
                }
                // If PENDING or DRAFT and CUSTODY_WALLET, update pendingClearance
                else if ((transaction.status === 'PENDING_APPROVAL' || transaction.status === 'DRAFT') && transaction.paymentMethod === 'CUSTODY_WALLET') {
                    await tx.user.update({
                        where: { id: transaction.createdBy },
                        data: {
                            pendingClearance: { increment: diff } // Reserved amount changes
                        }
                    });
                }
            }

            return t;
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

// ========== V1.2 EXPORTS ==========
// New "Profit on Expense" Logic
export const createTransactionV2 = transactionV2.createTransactionV2;
export const recordInventoryUsage = transactionV2.recordInventoryUsage;
export const getProjectInventory = transactionV2.getProjectInventory;
