import prisma from '../lib/prisma.js';
import * as transactionV2 from './transactionControllerV2.js';
import { auditFromReq } from '../lib/audit.js';
import { deleteByUrl } from '../lib/storage.js';

// @desc    Get unique cost centers
// @route   GET /api/transactions/cost-centers
// @access  Private
export const getCostCenters = async (req, res, next) => {
    try {
        const [costCenterRows, transactionFromRows, physicalAccountRows, transactionToRows, beneficiaryRows] = await Promise.all([
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
            }),
            prisma.transaction.findMany({
                where: { tenantId: req.user.tenantId, beneficiary: { not: null } },
                select: { beneficiary: true },
                distinct: ['beneficiary']
            })
        ]);

        res.status(200).json({
            success: true,
            data: {
                costCenters: costCenterRows.map(t => t.costCenter).filter(Boolean),
                transactionFroms: transactionFromRows.map(t => t.transactionFrom).filter(Boolean),
                physicalAccounts: physicalAccountRows.map(t => t.physicalAccount).filter(Boolean),
                transactionTos: transactionToRows.map(t => t.transactionTo).filter(Boolean),
                beneficiaries: beneficiaryRows.map(t => t.beneficiary).filter(Boolean)
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
                user: { select: { name: true, email: true } },
                payer: { select: { name: true } },
                workman: { select: { name: true } }
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

// Approval workflow handlers (getPendingApprovals, submitTransaction,
// approveTransaction, rejectTransaction) have moved to
// controllers/transactionApprovalController.js. Routes are wired in
// routes/transactions.js — no behavior change.

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

            return { id: txOut.id, senderBalance: updatedSender.currentCustodyBalance, receiverBalance: updatedReceiver.currentCustodyBalance };
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

// Helper: Find linked MANAGEMENT_FEE_TRANSFER for an expense
export const findLinkedManagementFee = async (tx, parentTransaction, project = null) => {
    if (!parentTransaction || !parentTransaction.projectId) return null;

    // 1. Direct tag in notes: PARENT_TX:<id>
    let feeTx = await tx.transaction.findFirst({
        where: {
            tenantId: parentTransaction.tenantId,
            projectId: parentTransaction.projectId,
            category: 'MANAGEMENT_FEE_TRANSFER',
            notes: `PARENT_TX:${parentTransaction.id}`
        }
    });
    if (feeTx) return feeTx;

    // 2. Notes contains parent id
    feeTx = await tx.transaction.findFirst({
        where: {
            tenantId: parentTransaction.tenantId,
            projectId: parentTransaction.projectId,
            category: 'MANAGEMENT_FEE_TRANSFER',
            notes: { contains: parentTransaction.id }
        }
    });
    if (feeTx) return feeTx;

    // 3. Candidate search on the same project
    const candidates = await tx.transaction.findMany({
        where: {
            tenantId: parentTransaction.tenantId,
            projectId: parentTransaction.projectId,
            category: 'MANAGEMENT_FEE_TRANSFER'
        },
        orderBy: { createdAt: 'desc' }
    });

    if (!candidates.length) return null;

    const parentAmount = Number(parentTransaction.amount);

    // Filter out candidates that already explicitly point to a DIFFERENT parent transaction
    const eligible = candidates.filter(c => !c.notes || !c.notes.startsWith('PARENT_TX:') || c.notes === `PARENT_TX:${parentTransaction.id}`);

    // Match by description
    feeTx = eligible.find(c => {
        if (!c.description) return false;
        const desc = c.description;
        const matchesAmount =
            desc.includes(`${parentAmount} EGP`) ||
            desc.includes(`${Math.round(parentAmount)} EGP`) ||
            desc.includes(`${parentAmount.toLocaleString()} EGP`) ||
            desc.includes(`${parentAmount.toFixed(2)} EGP`);
        return matchesAmount;
    });
    if (feeTx) return feeTx;

    // Match by calculated expected fee amount
    let feePercent = 0;
    if (project && project.managementFeePercent) {
        feePercent = Number(project.managementFeePercent);
    } else {
        const proj = await tx.project.findFirst({
            where: { id: parentTransaction.projectId, tenantId: parentTransaction.tenantId },
            select: { managementFeePercent: true, revenueModel: true }
        });
        if (proj) feePercent = Number(proj.managementFeePercent) || 0;
    }

    if (feePercent > 0) {
        const expectedFee = parentAmount * (feePercent / 100);
        feeTx = eligible.find(c => Math.abs(Number(c.amount) - expectedFee) < 0.01);
        if (feeTx) return feeTx;
    }

    // Time window heuristic
    if (parentTransaction.createdAt) {
        const pTime = new Date(parentTransaction.createdAt).getTime();
        const nearby = eligible.filter(c => {
            const cTime = new Date(c.createdAt).getTime();
            return Math.abs(cTime - pTime) <= 60000;
        });
        if (nearby.length === 1) return nearby[0];
    }

    return null;
};

// @desc    Refund & Cancel transaction (reverses balances, keeps record as CANCELLED)
// @route   POST /api/transactions/:id/refund
// @access  Private (Owner/Manager/Admin/Accountant)
export const refundTransaction = async (req, res, next) => {
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

        // Authorization: Creator, Admin, Project Manager, or Accountant
        if (
            transaction.createdBy !== req.user.id &&
            req.user.role !== 'ADMIN' &&
            req.user.role !== 'PROJECT_MANAGER' &&
            req.user.role !== 'ACCOUNTANT'
        ) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to refund this transaction'
            });
        }

        if (transaction.status === 'CANCELLED') {
            return res.status(400).json({
                success: false,
                message: 'Transaction is already refunded / cancelled'
            });
        }

        let updatedTx;

        await prisma.$transaction(async (tx) => {
            // 1. Handle Financial Reversals based on status
            if (transaction.type === 'EXPENSE') {
                if (transaction.paymentMethod === 'CUSTODY_WALLET') {
                    if (transaction.status === 'DRAFT' || transaction.status === 'PENDING_APPROVAL') {
                        await tx.user.update({
                            where: { id: transaction.createdBy },
                            data: {
                                pendingClearance: { decrement: transaction.amount }
                            }
                        });
                    } else if (transaction.status === 'APPROVED') {
                        // Reverse User Custody Impact
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
                                    operationalFund: { increment: transaction.amount },
                                    actualCost: { decrement: transaction.amount },
                                    projectSafeBalance: { increment: transaction.amount }
                                }
                            });
                        }
                    }
                } else {
                    // Non-Custody Expense (Cash/Bank Transfer/etc)
                    if (transaction.status === 'APPROVED' && transaction.projectId) {
                        await tx.project.update({
                            where: { id: transaction.projectId, tenantId: req.user.tenantId },
                            data: {
                                actualCost: { decrement: transaction.amount },
                                operationalFund: { increment: transaction.amount },
                                projectSafeBalance: { increment: transaction.amount }
                            }
                        });
                    }
                }

                // If approved expense on project, locate linked MANAGEMENT_FEE_TRANSFER
                if (transaction.status === 'APPROVED' && transaction.projectId) {
                    const linkedFeeTx = await findLinkedManagementFee(tx, transaction, transaction.project);
                    if (linkedFeeTx) {
                        // Undo the fee impact from project
                        await tx.project.update({
                            where: { id: transaction.projectId, tenantId: req.user.tenantId },
                            data: {
                                officeRevenue: { decrement: linkedFeeTx.amount },
                                projectSafeBalance: { increment: linkedFeeTx.amount }
                            }
                        });

                        // Cancel the linked fee transaction so it also shows as CANCELLED
                        const feeNotes = linkedFeeTx.notes
                            ? `${linkedFeeTx.notes} | CANCELLED_WITH_PARENT:${transaction.id}`
                            : `CANCELLED_WITH_PARENT:${transaction.id}`;
                        await tx.transaction.update({
                            where: { id: linkedFeeTx.id, tenantId: req.user.tenantId },
                            data: {
                                status: 'CANCELLED',
                                notes: feeNotes
                            }
                        });
                    }
                }

                // Reverse Cost Item if linked
                if (transaction.projectCostItemId && transaction.status === 'APPROVED') {
                    await tx.projectCostItem.update({
                        where: { id: transaction.projectCostItemId, tenantId: req.user.tenantId },
                        data: { totalPaid: { decrement: transaction.amount } }
                    }).catch(() => {});
                }

                // Reverse Workman if linked
                if (transaction.workmanId && transaction.status === 'APPROVED') {
                    await tx.workman.update({
                        where: { id: transaction.workmanId, tenantId: req.user.tenantId },
                        data: { totalPaid: { decrement: transaction.amount } }
                    }).catch(() => {});
                }
            } else if (transaction.category === 'MANAGEMENT_FEE_TRANSFER') {
                // Direct refund of a standalone MANAGEMENT_FEE_TRANSFER entry
                if (transaction.projectId) {
                    await tx.project.update({
                        where: { id: transaction.projectId, tenantId: req.user.tenantId },
                        data: {
                            officeRevenue: { decrement: transaction.amount },
                            projectSafeBalance: { increment: transaction.amount }
                        }
                    });
                }
            } else if (transaction.type === 'INCOME') {
                if (transaction.status === 'APPROVED' && transaction.projectId) {
                    await tx.project.update({
                        where: {
                            id: transaction.projectId,
                            tenantId: req.user.tenantId
                        },
                        data: {
                            projectSafeBalance: { decrement: transaction.amount },
                            operationalFund: { decrement: transaction.amount }
                        }
                    });
                }
            }

            // 2. Mark this transaction as CANCELLED (Do NOT delete row)
            const refundNotes = transaction.notes
                ? `${transaction.notes} | REFUNDED_AT:${new Date().toISOString()}`
                : `REFUNDED_AT:${new Date().toISOString()}`;

            updatedTx = await tx.transaction.update({
                where: {
                    id,
                    tenantId: req.user.tenantId
                },
                data: {
                    status: 'CANCELLED',
                    notes: refundNotes
                }
            });
        });

        await auditFromReq(req, {
            action: 'REFUND',
            entity: 'Transaction',
            entityId: req.params.id,
            before: {
                type: transaction.type,
                category: transaction.category,
                amount: Number(transaction.amount),
                status: transaction.status,
                projectId: transaction.projectId
            },
            after: {
                status: 'CANCELLED'
            }
        });

        res.status(200).json({
            success: true,
            message: 'Transaction refunded and cancelled successfully',
            data: updatedTx
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
            // If already CANCELLED / REFUNDED, financial balances were ALREADY reversed at refund time!
            if (transaction.status === 'CANCELLED') {
                // If there's a linked fee transaction that was cancelled with this parent, delete it too
                if (transaction.projectId) {
                    const linkedFeeTx = await tx.transaction.findFirst({
                        where: {
                            tenantId: req.user.tenantId,
                            projectId: transaction.projectId,
                            category: 'MANAGEMENT_FEE_TRANSFER',
                            status: 'CANCELLED',
                            notes: { contains: transaction.id }
                        }
                    });
                    if (linkedFeeTx) {
                        await tx.transaction.delete({
                            where: { id: linkedFeeTx.id, tenantId: req.user.tenantId }
                        }).catch(() => {});
                    }
                }

                await tx.transaction.delete({
                    where: {
                        id,
                        tenantId: req.user.tenantId
                    }
                });
                return;
            }

            // 1. Handle Reversals based on status
            if (transaction.type === 'EXPENSE') {
                if (transaction.paymentMethod === 'CUSTODY_WALLET') {
                    if (transaction.status === 'DRAFT' || transaction.status === 'PENDING_APPROVAL') {
                        await tx.user.update({
                            where: { id: transaction.createdBy },
                            data: {
                                pendingClearance: { decrement: transaction.amount }
                            }
                        });
                    }
                    else if (transaction.status === 'APPROVED') {
                        await tx.user.update({
                            where: { id: transaction.createdBy },
                            data: {
                                currentCustodyBalance: { increment: transaction.amount }
                            }
                        });

                        if (transaction.projectId) {
                            await tx.project.update({
                                where: {
                                    id: transaction.projectId,
                                    tenantId: req.user.tenantId
                                },
                                data: {
                                    operationalFund: { increment: transaction.amount },
                                    actualCost: { decrement: transaction.amount },
                                    projectSafeBalance: { increment: transaction.amount }
                                }
                            });
                        }
                    }
                } else {
                    if (transaction.status === 'APPROVED' && transaction.projectId) {
                        await tx.project.update({
                            where: { id: transaction.projectId, tenantId: req.user.tenantId },
                            data: {
                                actualCost: { decrement: transaction.amount },
                                operationalFund: { increment: transaction.amount },
                                projectSafeBalance: { increment: transaction.amount }
                            }
                        });
                    }
                }

                // Reverse Cost Item if linked
                if (transaction.projectCostItemId && transaction.status === 'APPROVED') {
                    await tx.projectCostItem.update({
                        where: { id: transaction.projectCostItemId, tenantId: req.user.tenantId },
                        data: { totalPaid: { decrement: transaction.amount } }
                    }).catch(() => {});
                }

                // Reverse Workman if linked
                if (transaction.workmanId && transaction.status === 'APPROVED') {
                    await tx.workman.update({
                        where: { id: transaction.workmanId, tenantId: req.user.tenantId },
                        data: { totalPaid: { decrement: transaction.amount } }
                    }).catch(() => {});
                }
            }
            else if (transaction.type === 'INCOME') {
                if (transaction.status === 'APPROVED' && transaction.projectId) {
                    await tx.project.update({
                        where: {
                            id: transaction.projectId,
                            tenantId: req.user.tenantId
                        },
                        data: {
                            projectSafeBalance: { decrement: transaction.amount },
                            operationalFund: { decrement: transaction.amount }
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

            // Clean up any uploaded media evidence associated with this transaction
            if (transaction.receiptPhotoUrl) {
                await deleteByUrl(transaction.receiptPhotoUrl).catch(() => {});
            }
            if (transaction.voiceNoteUrl) {
                await deleteByUrl(transaction.voiceNoteUrl).catch(() => {});
            }
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

        const url = req.file.location || `/uploads/receipts/${req.file.filename}`;

        if (tx.receiptPhotoUrl && tx.receiptPhotoUrl !== url) {
            await deleteByUrl(tx.receiptPhotoUrl).catch(() => {});
        }

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

// @desc    Attach (or replace) a voice note on an existing transaction.
// @route   PATCH /api/transactions/:id/voice
// @access  Private (creator / manager / admin) — multipart with file=audio
export const uploadVoiceNote = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No audio file uploaded' });
        }

        const { id } = req.params;
        const tx = await prisma.transaction.findFirst({
            where: { id, tenantId: req.user.tenantId }
        });
        if (!tx) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        const canEdit =
            tx.createdBy === req.user.id ||
            ['PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
        if (!canEdit) {
            return res.status(403).json({ success: false, message: 'Not authorized to attach a voice note to this transaction' });
        }

        const url = req.file.location || `/uploads/audio/voice-drafts/${req.file.filename}`;

        if (tx.voiceNoteUrl && tx.voiceNoteUrl !== url) {
            await deleteByUrl(tx.voiceNoteUrl).catch(() => {});
        }

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                voiceNoteUrl: url,
                aiRawText: req.body.transcript || tx.aiRawText
            }
        });

        await auditFromReq(req, {
            action: 'UPDATE',
            entity: 'Transaction',
            entityId: id,
            metadata: { field: 'voiceNoteUrl', from: tx.voiceNoteUrl || null, to: url }
        });

        res.status(200).json({
            success: true,
            data: { id: updated.id, voiceNoteUrl: updated.voiceNoteUrl },
            message: 'Voice note attached successfully'
        });
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
            beneficiary, transactionFrom, transactionTo, costCenter,
            invoiceNumber, payerUserId, projectCostItemId,
            clientId, supplierId, workmanId, physicalAccount, paidByClientContact
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
                    projectCostItemId,
                    beneficiary: beneficiary !== undefined ? (beneficiary || null) : undefined,
                    transactionTo: transactionTo !== undefined ? (transactionTo || null) : undefined,
                    transactionFrom: transactionFrom !== undefined ? (transactionFrom || null) : undefined,
                    costCenter: costCenter !== undefined ? (costCenter || null) : undefined,
                    physicalAccount: physicalAccount !== undefined ? (physicalAccount || null) : undefined,
                    paidByClientContact: paidByClientContact !== undefined ? (paidByClientContact || null) : undefined,
                    supplierId: supplierId !== undefined ? (supplierId || null) : undefined,
                    workmanId: workmanId !== undefined ? (workmanId || null) : undefined,
                    clientId: clientId !== undefined ? (clientId || null) : undefined,
                    voiceNoteUrl: req.body.voiceNoteUrl !== undefined ? (req.body.voiceNoteUrl || null) : undefined,
                    receiptPhotoUrl: req.body.receiptPhotoUrl !== undefined ? (req.body.receiptPhotoUrl || null) : undefined,
                    aiRawText: req.body.aiRawText !== undefined ? (req.body.aiRawText || null) : undefined,
                    aiExtractedData: req.body.aiExtractedData !== undefined ? req.body.aiExtractedData : undefined
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
                                operationalFund: { decrement: diff },  // Fund goes down
                                projectSafeBalance: { decrement: diff }
                            }
                        });

                        const proj = await tx.project.findFirst({
                            where: { id: transaction.projectId, tenantId: req.user.tenantId }
                        });
                        if (proj && proj.revenueModel === 'EXECUTION_COST_PLUS') {
                            const feePercent = Number(proj.managementFeePercent) || 0;
                            const newFeeAmount = Number((newAmount * (feePercent / 100)).toFixed(2));
                            const feeTx = await findLinkedManagementFee(tx, transaction, proj);

                            if (feeTx) {
                                const oldFeeAmount = Number(feeTx.amount);
                                const feeDiff = newFeeAmount - oldFeeAmount;

                                if (newFeeAmount > 0) {
                                    await tx.transaction.update({
                                        where: { id: feeTx.id },
                                        data: {
                                            amount: newFeeAmount,
                                            description: `Cost-Plus Management Fee (${feePercent}%) on ${newAmount} EGP expense`,
                                            notes: `PARENT_TX:${transaction.id}`
                                        }
                                    });
                                } else {
                                    await tx.transaction.delete({
                                        where: { id: feeTx.id }
                                    });
                                }

                                if (feeDiff !== 0) {
                                    await tx.project.update({
                                        where: { id: proj.id },
                                        data: {
                                            officeRevenue: { increment: feeDiff },
                                            projectSafeBalance: { decrement: feeDiff }
                                        }
                                    });
                                }
                            } else if (newFeeAmount > 0) {
                                await tx.transaction.create({
                                    data: {
                                        type: 'EXPENSE',
                                        category: 'MANAGEMENT_FEE_TRANSFER',
                                        amount: newFeeAmount,
                                        description: `Cost-Plus Management Fee (${feePercent}%) on ${newAmount} EGP expense`,
                                        status: 'APPROVED',
                                        projectId: proj.id,
                                        createdBy: req.user.id,
                                        transactionDate: transaction.transactionDate || new Date(),
                                        paymentMethod: 'OTHER',
                                        tenantId: req.user.tenantId,
                                        isOfficeExpense: false,
                                        notes: `PARENT_TX:${transaction.id}`
                                    }
                                });

                                await tx.project.update({
                                    where: { id: proj.id },
                                    data: {
                                        officeRevenue: { increment: newFeeAmount },
                                        projectSafeBalance: { decrement: newFeeAmount }
                                    }
                                });
                            }
                        }
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

// createTransaction (POST /api/transactions) has moved to
// controllers/transactionCreateController.js. Routes are wired in
// routes/transactions.js — no behavior change.

// ========== V1.2 EXPORTS ==========
// New "Profit on Expense" Logic
export const createTransactionV2 = transactionV2.createTransactionV2;
export const recordInventoryUsage = transactionV2.recordInventoryUsage;
export const getProjectInventory = transactionV2.getProjectInventory;
