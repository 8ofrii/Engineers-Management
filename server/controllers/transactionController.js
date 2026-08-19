import prisma from '../lib/prisma.js';
import * as transactionV2 from './transactionControllerV2.js';
import { auditFromReq } from '../lib/audit.js';

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
            invoiceNumber, payerUserId, projectCostItemId,
            clientId, supplierId, workmanId
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

// createTransaction (POST /api/transactions) has moved to
// controllers/transactionCreateController.js. Routes are wired in
// routes/transactions.js — no behavior change.

// ========== V1.2 EXPORTS ==========
// New "Profit on Expense" Logic
export const createTransactionV2 = transactionV2.createTransactionV2;
export const recordInventoryUsage = transactionV2.recordInventoryUsage;
export const getProjectInventory = transactionV2.getProjectInventory;
