
// Helper to eliminate quantity/unit/price bloat from transaction descriptions
export const cleanTransactionDescription = (desc) => {
    if (!desc || typeof desc !== 'string') return '';
    let cleaned = desc.replace(/\s*\|\s*[\d.]+\s*[A-Za-z\u0600-\u06FF]*\s*@\s*[\d.]+(?:\s*EGP)?\s*$/gi, '');
    cleaned = cleaned.replace(/^[\d.]+\s*[A-Za-z\u0600-\u06FF]*\s*@\s*[\d.]+(?:\s*EGP)?\s*\|\s*/gi, '');
    cleaned = cleaned.replace(/\(?\s*0\s+TON\s+@\s+0\s*\)?/gi, '');
    cleaned = cleaned.replace(/\s*\|\s*$/, '').trim();
    return cleaned;
};

import prisma from '../lib/prisma.js';
import * as transactionV2 from './transactionControllerV2.js';
import { auditFromReq } from '../lib/audit.js';
import { deleteByUrl } from '../lib/storage.js';
import { generateVoucherPdf } from '../lib/voucherPdf.js';
import { generateTransactionsLedgerPdf } from '../lib/transactionsLedgerPdf.js';

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

        if (req.query.projectId) {
            whereClause.projectId = req.query.projectId;
        } else {
            // Exclude transactions belonging to soft-deleted projects
            whereClause.OR = [
                { projectId: null },
                { project: { deletedAt: null } }
            ];
        }

        if (req.query.workmanId && req.query.workmanId !== 'ALL') {
            whereClause.workmanId = req.query.workmanId;
        }
        if (req.query.supplierId && req.query.supplierId !== 'ALL') {
            whereClause.supplierId = req.query.supplierId;
        }

        // PROJECT_MANAGER, ADMIN, ACCOUNTANT, SUPER_ADMIN all see every
        // transaction in the tenant — managers need full visibility to
        // approve/reject submissions raised by any engineer.

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            include: {
                project: { select: { id: true, name: true } },
                supplier: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } },
                user: { select: { id: true, name: true, email: true } },
                payer: { select: { id: true, name: true } },
                toEngineer: { select: { id: true, name: true } },
                workman: { select: { id: true, name: true } },
                safe: { select: { id: true, name: true, type: true } }
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
        const { projectId, amount, category, description, isOfficeExpense, safeId } = req.body;

        const draft = await prisma.transaction.create({
            data: {
                type: 'EXPENSE',
                category: category,
                amount: amount,
                description: description,
                status: 'DRAFT',
                projectId: projectId || null,
                createdBy: req.user.id,
                paymentMethod: 'CUSTODY_WALLET',
                isOfficeExpense: isOfficeExpense || false,
                safeId: safeId || null,
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

        let expenseTotal = 0;
        let incomeTotal = 0;
        let profitTotal = 0;

        transactions.forEach(t => {
            const amt = Number(t.amount || 0);
            if (t.type === 'INCOME') {
                incomeTotal += amt;
            } else if (t.type === 'EXPENSE') {
                if (t.category === 'MANAGEMENT_FEE_TRANSFER') {
                    profitTotal += amt;
                } else {
                    expenseTotal += amt;
                }
            }
        });

        const byType = [
            { _id: 'INCOME', total: incomeTotal },
            { _id: 'EXPENSE', total: expenseTotal }
        ];
        if (profitTotal > 0) {
            byType.push({ _id: 'OFFICE_PROFIT', total: profitTotal });
        }

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

// @desc    Generate and stream official Transaction Voucher PDF
// @route   GET /api/transactions/:id/voucher-pdf
// @access  Private
export const getTransactionVoucherPdf = async (req, res, next) => {
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
                workman: true,
                safe: true,
                user: { select: { id: true, name: true, email: true, phone: true } },
                approver: { select: { id: true, name: true, email: true } },
                payer: { select: { id: true, name: true, email: true } },
                tenant: true
            }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        const tenant = transaction.tenant || (req.user.tenantId ? await prisma.tenant.findUnique({ where: { id: req.user.tenantId } }) : null);

        const buffer = await generateVoucherPdf({
            transaction,
            tenant,
            user: req.user
        });

        const ref = (transaction.id || 'TX').slice(0, 8).toUpperCase();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="voucher-${ref}.pdf"`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Generate and stream an Executive Accounting Transactions Ledger PDF
 * @route   GET/POST /api/transactions/ledger-pdf
 * @access  Private (Authenticated tenant users)
 */
export const getTransactionsLedgerPdf = async (req, res, next) => {
    try {
        const tenantId = req.user.tenantId;
        const bodyOrQuery = req.method === 'POST' ? req.body : req.query;
        const {
            transactionIds,
            filterProjectId,
            filterType,
            filterWorkmanId,
            filterSupplierId,
            dateFrom,
            dateTo,
            lang
        } = bodyOrQuery;

        const isArabic = lang ? lang.startsWith('ar') : true;

        // Fetch Tenant and User details
        const tenant = tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId } }) : null;

        // Resolve branding name
        let companyName = tenant?.name;
        if (!companyName || companyName === 'Demo Construction Co.') {
            if (req.user?.company && req.user.company !== 'Demo Construction Co.') {
                companyName = req.user.company;
            }
        }
        companyName = companyName || req.user?.company || 'Hesaby ERP';

        let transactions = [];

        // If client provided explicit transaction IDs (representing exact on-screen table)
        if (Array.isArray(transactionIds) && transactionIds.length > 0) {
            transactions = await prisma.transaction.findMany({
                where: {
                    id: { in: transactionIds },
                    tenantId
                },
                include: {
                    project: true,
                    client: true,
                    workman: true,
                    supplier: true,
                    safe: true,
                    projectCostItem: true,
                    user: { select: { id: true, name: true, email: true } },
                    payer: { select: { id: true, name: true, email: true } }
                },
                orderBy: [
                    { transactionDate: 'desc' },
                    { createdAt: 'desc' }
                ]
            });
        } else {
            // Build query based on filters
            const where = { tenantId };

            if (filterType && filterType !== 'ALL') {
                if (filterType === 'COMPANY_SHARE') {
                    where.OR = [
                        { category: 'MANAGEMENT_FEE_TRANSFER' },
                        { description: { contains: 'management fee', mode: 'insensitive' } },
                        { description: { contains: 'أتعاب' } }
                    ];
                } else if (filterType === 'EXPENSE') {
                    where.type = 'EXPENSE';
                    where.category = { not: 'MANAGEMENT_FEE_TRANSFER' };
                } else if (filterType === 'INCOME') {
                    where.type = 'INCOME';
                } else if (filterType === 'MY_LEDGER') {
                    where.OR = [
                        { createdBy: req.user.id },
                        { payerUserId: req.user.id },
                        { toEngineerId: req.user.id }
                    ];
                }
            }

            if (filterProjectId && filterProjectId !== 'ALL') {
                if (filterProjectId === 'OFFICE') {
                    where.OR = [
                        { isOfficeExpense: true },
                        { projectId: null }
                    ];
                } else {
                    where.projectId = filterProjectId;
                }
            }

            if (filterWorkmanId && filterWorkmanId !== 'ALL') {
                where.workmanId = filterWorkmanId;
            }

            if (filterSupplierId && filterSupplierId !== 'ALL') {
                where.supplierId = filterSupplierId;
            }

            if (dateFrom || dateTo) {
                where.transactionDate = {};
                if (dateFrom) where.transactionDate.gte = new Date(dateFrom);
                if (dateTo) {
                    const toDate = new Date(dateTo);
                    toDate.setHours(23, 59, 59, 999);
                    where.transactionDate.lte = toDate;
                }
            }

            transactions = await prisma.transaction.findMany({
                where,
                include: {
                    project: true,
                    client: true,
                    workman: true,
                    supplier: true,
                    safe: true,
                    projectCostItem: true,
                    user: { select: { id: true, name: true, email: true } },
                    payer: { select: { id: true, name: true, email: true } }
                },
                orderBy: [
                    { transactionDate: 'desc' },
                    { createdAt: 'desc' }
                ]
            });
        }

        // Resolve Project Name for Scope
        let scopeProjectName = isArabic ? 'كافة المشاريع' : 'All Projects';
        if (filterProjectId === 'OFFICE') {
            scopeProjectName = isArabic ? 'مصروفات المقر الرئيسي' : 'Headquarters / Office';
        } else if (filterProjectId && filterProjectId !== 'ALL') {
            const proj = await prisma.project.findUnique({ where: { id: filterProjectId }, select: { name: true } });
            if (proj?.name) scopeProjectName = proj.name;
        }

        let dateRangeLabel = '';
        if (dateFrom && dateTo) {
            dateRangeLabel = `${dateFrom} ${isArabic ? 'إلى' : 'to'} ${dateTo}`;
        } else if (dateFrom) {
            dateRangeLabel = `${isArabic ? 'من' : 'From'} ${dateFrom}`;
        } else if (dateTo) {
            dateRangeLabel = `${isArabic ? 'حتى' : 'Until'} ${dateTo}`;
        }

        let typeLabel = '';
        if (filterType && filterType !== 'ALL') {
            if (filterType === 'INCOME') typeLabel = isArabic ? 'إيرادات' : 'Income';
            else if (filterType === 'EXPENSE') typeLabel = isArabic ? 'مصروفات' : 'Expenses';
            else if (filterType === 'COMPANY_SHARE') typeLabel = isArabic ? 'أرباح الشركة' : 'Office Profit';
            else if (filterType === 'MY_LEDGER') typeLabel = isArabic ? 'عهدي ومعاملاتي' : 'My Ledger';
        }

        const buffer = await generateTransactionsLedgerPdf({
            transactions,
            tenant: {
                ...tenant,
                name: companyName,
                logo: tenant?.logo || req.user?.companyLogo || null,
                email: tenant?.email || req.user?.email || '',
                phone: tenant?.phone || req.user?.phone || '',
                address: tenant?.address || ''
            },
            user: req.user,
            scope: {
                projectName: scopeProjectName,
                filterType: typeLabel,
                dateRangeLabel
            },
            isArabic
        });

        const dateSlug = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="hesaby-transactions-${dateSlug}.pdf"`);
        res.send(buffer);
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
            if (transaction.category === 'MANAGEMENT_FEE_TRANSFER') {
                // Direct refund or cancellation of a standalone MANAGEMENT_FEE_TRANSFER entry
                if (transaction.projectId) {
                    await tx.project.update({
                        where: { id: transaction.projectId, tenantId: req.user.tenantId },
                        data: {
                            officeRevenue: { decrement: transaction.amount },
                            projectSafeBalance: { increment: transaction.amount }
                        }
                    });
                }
            } else if (transaction.type === 'EXPENSE') {
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

            // Reverse Company Safe Balance if transaction was approved and linked to safe
            if (transaction.status === 'APPROVED' && transaction.safeId) {
                if (transaction.type === 'INCOME') {
                    await tx.companySafe.update({
                        where: { id: transaction.safeId },
                        data: { balance: { decrement: transaction.amount } }
                    });
                } else if (transaction.type === 'EXPENSE') {
                    await tx.companySafe.update({
                        where: { id: transaction.safeId },
                        data: { balance: { increment: transaction.amount } }
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
            if (transaction.category === 'MANAGEMENT_FEE_TRANSFER') {
                if (transaction.projectId) {
                    await tx.project.update({
                        where: { id: transaction.projectId, tenantId: req.user.tenantId },
                        data: {
                            officeRevenue: { decrement: transaction.amount },
                            projectSafeBalance: { increment: transaction.amount }
                        }
                    });
                }
            } else if (transaction.type === 'EXPENSE') {
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

            // Reverse Company Safe Balance if transaction was approved and linked to safe
            if (transaction.status === 'APPROVED' && transaction.safeId) {
                if (transaction.type === 'INCOME') {
                    await tx.companySafe.update({
                        where: { id: transaction.safeId },
                        data: { balance: { decrement: transaction.amount } }
                    });
                } else if (transaction.type === 'EXPENSE') {
                    await tx.companySafe.update({
                        where: { id: transaction.safeId },
                        data: { balance: { increment: transaction.amount } }
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
                const urls = parseReceiptUrls(transaction.receiptPhotoUrl);
                for (const u of urls) {
                    await deleteByUrl(u).catch(() => {});
                }
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
export const parseReceiptAttachments = (val) => {
    if (!val) return [];
    let items = [];
    if (Array.isArray(val)) {
        items = val;
    } else if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) items = parsed;
            } catch (e) {
                items = [trimmed];
            }
        } else {
            items = [trimmed];
        }
    }

    return items.map((item, index) => {
        if (!item) return null;
        if (typeof item === 'string') {
            return {
                url: item,
                label: '',
                name: item.split('/').pop() || item
            };
        }
        if (typeof item === 'object' && item.url) {
            return {
                url: item.url,
                label: typeof item.label === 'string' ? item.label : '',
                name: item.name || item.url.split('/').pop() || item.url,
                size: item.size || null
            };
        }
        return null;
    }).filter(Boolean);
};

export const parseReceiptUrls = (val) => {
    return parseReceiptAttachments(val).map(a => a.url);
};

// @desc    Attach, append, or update receipt / invoice media (supports unlimited files restricted by space/storage and custom per-attachment labels).
// @route   PATCH /api/transactions/:id/receipt
// @access  Private (creator / manager / admin) — multipart
export const uploadReceipt = async (req, res, next) => {
    try {
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
            return res.status(403).json({ success: false, message: 'Not authorized to attach media to this transaction' });
        }

        // Gather all uploaded files from req.files or req.file
        let uploadedFiles = [];
        if (req.files) {
            if (Array.isArray(req.files)) {
                uploadedFiles = req.files;
            } else if (typeof req.files === 'object') {
                uploadedFiles = [
                    ...(req.files.files || []),
                    ...(req.files.file || [])
                ];
            }
        } else if (req.file) {
            uploadedFiles = [req.file];
        }

        // Parse existing attachments & URLs stored on this transaction
        const existingTxAttachments = parseReceiptAttachments(tx.receiptPhotoUrl);
        const existingTxUrls = existingTxAttachments.map(a => a.url);

        // Check if client explicitly provided keptExistingAttachments or keptExistingUrls
        let keptExistingAttachments = existingTxAttachments;
        if (req.body.keptExistingAttachments !== undefined) {
            try {
                const parsedKept = typeof req.body.keptExistingAttachments === 'string'
                    ? JSON.parse(req.body.keptExistingAttachments)
                    : req.body.keptExistingAttachments;
                if (Array.isArray(parsedKept)) {
                    keptExistingAttachments = parsedKept.map(item => {
                        if (typeof item === 'string') return { url: item, label: '', name: item.split('/').pop() };
                        return {
                            url: item.url,
                            label: typeof item.label === 'string' ? item.label : '',
                            name: item.name || item.url?.split('/').pop()
                        };
                    }).filter(item => item.url && item.url.trim().length > 0);
                }
            } catch (e) {
                // If invalid JSON, retain current
            }
        } else if (req.body.keptExistingUrls !== undefined) {
            try {
                const parsedKept = typeof req.body.keptExistingUrls === 'string'
                    ? JSON.parse(req.body.keptExistingUrls)
                    : req.body.keptExistingUrls;
                if (Array.isArray(parsedKept)) {
                    const keptUrls = parsedKept.filter(u => typeof u === 'string' && u.trim().length > 0);
                    keptExistingAttachments = existingTxAttachments.filter(a => keptUrls.includes(a.url));
                }
            } catch (e) {
                // If invalid JSON, retain current existing
            }
        } else if (req.body.replace === 'true') {
            keptExistingAttachments = [];
        }

        if (uploadedFiles.length === 0 && req.body.keptExistingAttachments === undefined && req.body.keptExistingUrls === undefined) {
            return res.status(400).json({ success: false, message: 'No files uploaded or modified' });
        }

        // Delete any existing files that were removed by the user
        const keptUrls = keptExistingAttachments.map(a => a.url);
        const removedUrls = existingTxUrls.filter(url => !keptUrls.includes(url));
        for (const remUrl of removedUrls) {
            await deleteByUrl(remUrl).catch(() => {});
        }

        // Storage budget check (50 MB total for this transaction upload batch)
        const MAX_TOTAL_STORAGE_BYTES = 50 * 1024 * 1024; // 50 MB
        const totalNewBytes = uploadedFiles.reduce((sum, f) => sum + (f.size || 0), 0);

        if (totalNewBytes > MAX_TOTAL_STORAGE_BYTES) {
            // Delete newly uploaded files that exceeded the quota
            for (const f of uploadedFiles) {
                const u = f.key ? `/uploads/${f.key}` : (f.location || `/uploads/receipts/${f.filename}`);
                await deleteByUrl(u).catch(() => {});
            }
            return res.status(400).json({
                success: false,
                message: `Uploaded files (${(totalNewBytes / (1024 * 1024)).toFixed(1)} MB) exceed the maximum allowed total storage limit of 50 MB.`
            });
        }

        // Parse optional custom labels for new files
        let fileLabels = [];
        if (req.body.fileLabels !== undefined) {
            try {
                const parsedLabels = typeof req.body.fileLabels === 'string'
                    ? JSON.parse(req.body.fileLabels)
                    : req.body.fileLabels;
                if (Array.isArray(parsedLabels)) {
                    fileLabels = parsedLabels;
                }
            } catch (e) {}
        }

        // Generate public URLs and attachment objects for all newly uploaded files
        const newAttachments = uploadedFiles.map((file, idx) => {
            const url = file.key
                ? `/uploads/${file.key}`
                : (file.location || `/uploads/receipts/${file.filename}`);
            const label = (fileLabels[idx] && typeof fileLabels[idx] === 'string') ? fileLabels[idx].trim() : '';
            return {
                url,
                label,
                name: file.originalname || file.filename || url.split('/').pop(),
                size: file.size || null
            };
        });

        // Combine kept existing attachments with new attachments
        const combinedAttachments = [...keptExistingAttachments, ...newAttachments];
        const finalReceiptValue = combinedAttachments.length === 0
            ? null
            : JSON.stringify(combinedAttachments);

        const updated = await prisma.transaction.update({
            where: { id },
            data: { receiptPhotoUrl: finalReceiptValue }
        });

        await auditFromReq(req, {
            action: 'UPDATE',
            entity: 'Transaction',
            entityId: id,
            metadata: {
                field: 'receiptPhotoUrl',
                from: tx.receiptPhotoUrl || null,
                to: finalReceiptValue,
                fileCount: combinedAttachments.length,
                newFilesUploaded: newAttachments.length
            }
        });

        res.status(200).json({
            success: true,
            data: {
                id: updated.id,
                receiptPhotoUrl: updated.receiptPhotoUrl,
                attachments: combinedAttachments,
                receiptUrls: combinedAttachments.map(a => a.url),
                totalFiles: combinedAttachments.length
            }
        });
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

        const url = req.file.key
            ? `/uploads/${req.file.key}`
            : (req.file.location || (req.file.filename ? `/uploads/audio/${req.file.filename}` : `/uploads/audio/voice-drafts/${req.file.filename}`));

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
            beneficiary, transactionTo, transactionFrom, costCenter,
            invoiceNumber, payerUserId, projectCostItemId,
            clientId, supplierId, workmanId, physicalAccount, paidByClientContact,
            safeId, isOfficeExpense
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

        // Clean description without unit/quantity bloating
        let finalDescription = cleanTransactionDescription(description !== undefined ? description : transaction.description);

        const oldAmount = Number(transaction.amount);
        const newAmount = (amount !== undefined && amount !== null && amount !== '') ? Number(amount) : oldAmount;
        const diff = newAmount - oldAmount;

        // Resolve safe vs custody targets
        let targetSafeId = safeId !== undefined ? (safeId || null) : transaction.safeId;
        let targetPaymentMethod = paymentMethod !== undefined ? paymentMethod : transaction.paymentMethod;
        let targetPayerUserId = payerUserId !== undefined ? (payerUserId || null) : transaction.payerUserId;
        let targetCustodyWalletId = req.body.custodyWalletId !== undefined ? (req.body.custodyWalletId || null) : transaction.custodyWalletId;

        // If safeId was passed with custody_ prefix
        if (typeof targetSafeId === 'string' && targetSafeId.startsWith('custody_')) {
            const custodyUserId = targetSafeId.replace('custody_', '');
            targetSafeId = null;
            targetPaymentMethod = 'CUSTODY_WALLET';
            if (!targetPayerUserId) targetPayerUserId = custodyUserId;
            if (!targetCustodyWalletId) targetCustodyWalletId = custodyUserId;
        }

        // If target paymentMethod is CUSTODY_WALLET, ensure safeId is null
        if (targetPaymentMethod === 'CUSTODY_WALLET') {
            targetSafeId = null;
            if (!targetCustodyWalletId && targetPayerUserId) {
                targetCustodyWalletId = targetPayerUserId;
            }
        } else if (targetSafeId) {
            targetCustodyWalletId = null;
        }

        // Determine old vs new source entity for balance adjustments
        const oldIsCustody = transaction.paymentMethod === 'CUSTODY_WALLET';
        const oldCustodianId = oldIsCustody ? (transaction.payerUserId || transaction.custodyWalletId || transaction.createdBy) : null;
        const oldSafeId = !oldIsCustody ? transaction.safeId : null;

        const newIsCustody = targetPaymentMethod === 'CUSTODY_WALLET';
        const newCustodianId = newIsCustody ? (targetPayerUserId || targetCustodyWalletId || transaction.createdBy) : null;
        const newSafeId = !newIsCustody ? targetSafeId : null;

        // Atomic update with financial recalculations
        const updated = await prisma.$transaction(async (tx) => {
            // 1. Update the Transaction itself
            const t = await tx.transaction.update({
                where: {
                    id,
                    tenantId: req.user.tenantId
                },
                data: {
                    amount: (amount !== undefined && amount !== null && amount !== '') ? Number(amount) : undefined,
                    description: finalDescription,
                    category,
                    transactionDate: transactionDate ? new Date(transactionDate) : undefined,
                    paymentMethod: targetPaymentMethod,
                    projectId: projectId !== undefined ? (projectId || null) : undefined,
                    safeId: targetSafeId,
                    custodyWalletId: targetCustodyWalletId,
                    isOfficeExpense: isOfficeExpense !== undefined ? Boolean(isOfficeExpense) : undefined,
                    invoiceNumber: invoiceNumber !== undefined ? (invoiceNumber || null) : undefined,
                    payerUserId: targetPayerUserId,
                    projectCostItemId: projectCostItemId !== undefined ? (projectCostItemId || null) : undefined,
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

            // 2. Handle Safe and Custody Balance Adjustments if APPROVED
            if (transaction.status === 'APPROVED') {
                // Revert old funding source
                if (oldIsCustody && oldCustodianId) {
                    if (oldCustodianId !== newCustodianId || !newIsCustody) {
                        if (transaction.type === 'INCOME') {
                            await tx.user.update({
                                where: { id: oldCustodianId },
                                data: { currentCustodyBalance: { decrement: oldAmount } }
                            }).catch(e => console.error('Error decrementing old custody balance:', e));
                        } else if (transaction.type === 'EXPENSE') {
                            await tx.user.update({
                                where: { id: oldCustodianId },
                                data: { currentCustodyBalance: { increment: oldAmount } }
                            }).catch(e => console.error('Error incrementing old custody balance:', e));
                        }
                    }
                } else if (!oldIsCustody && oldSafeId) {
                    if (oldSafeId !== newSafeId || newIsCustody) {
                        if (transaction.type === 'INCOME') {
                            await tx.companySafe.update({
                                where: { id: oldSafeId },
                                data: { balance: { decrement: oldAmount } }
                            }).catch(e => console.error('Error decrementing old safe balance:', e));
                        } else if (transaction.type === 'EXPENSE') {
                            await tx.companySafe.update({
                                where: { id: oldSafeId },
                                data: { balance: { increment: oldAmount } }
                            }).catch(e => console.error('Error incrementing old safe balance:', e));
                        }
                    }
                }

                // Apply new funding source
                if (newIsCustody && newCustodianId) {
                    if (oldCustodianId !== newCustodianId || !oldIsCustody) {
                        if (transaction.type === 'INCOME') {
                            await tx.user.update({
                                where: { id: newCustodianId },
                                data: { currentCustodyBalance: { increment: newAmount } }
                            }).catch(e => console.error('Error incrementing new custody balance:', e));
                        } else if (transaction.type === 'EXPENSE') {
                            await tx.user.update({
                                where: { id: newCustodianId },
                                data: { currentCustodyBalance: { decrement: newAmount } }
                            }).catch(e => console.error('Error decrementing new custody balance:', e));
                        }
                    } else if (oldCustodianId === newCustodianId && diff !== 0) {
                        // Same custodian, amount changed
                        if (transaction.type === 'INCOME') {
                            await tx.user.update({
                                where: { id: newCustodianId },
                                data: { currentCustodyBalance: { increment: diff } }
                            }).catch(e => console.error('Error adjusting custody income balance:', e));
                        } else if (transaction.type === 'EXPENSE') {
                            await tx.user.update({
                                where: { id: newCustodianId },
                                data: { currentCustodyBalance: { decrement: diff } }
                            }).catch(e => console.error('Error adjusting custody expense balance:', e));
                        }
                    }
                } else if (!newIsCustody && newSafeId) {
                    if (oldSafeId !== newSafeId || oldIsCustody) {
                        if (transaction.type === 'INCOME') {
                            await tx.companySafe.update({
                                where: { id: newSafeId },
                                data: { balance: { increment: newAmount } }
                            }).catch(e => console.error('Error incrementing new safe balance:', e));
                        } else if (transaction.type === 'EXPENSE') {
                            await tx.companySafe.update({
                                where: { id: newSafeId },
                                data: { balance: { decrement: newAmount } }
                            }).catch(e => console.error('Error decrementing new safe balance:', e));
                        }
                    } else if (oldSafeId === newSafeId && diff !== 0) {
                        // Same safe, amount changed
                        if (transaction.type === 'INCOME') {
                            await tx.companySafe.update({
                                where: { id: newSafeId },
                                data: { balance: { increment: diff } }
                            }).catch(e => console.error('Error adjusting safe income balance:', e));
                        } else if (transaction.type === 'EXPENSE') {
                            await tx.companySafe.update({
                                where: { id: newSafeId },
                                data: { balance: { decrement: diff } }
                            }).catch(e => console.error('Error adjusting safe expense balance:', e));
                        }
                    }
                }
            } else if (transaction.status === 'PENDING_APPROVAL' || transaction.status === 'DRAFT') {
                // Adjust pendingClearance reservations for expenses
                if (transaction.type === 'EXPENSE') {
                    if (oldIsCustody && oldCustodianId && (oldCustodianId !== newCustodianId || !newIsCustody)) {
                        await tx.user.update({
                            where: { id: oldCustodianId },
                            data: { pendingClearance: { decrement: oldAmount } }
                        }).catch(e => console.error('Error decrementing old pending clearance:', e));
                    }
                    if (newIsCustody && newCustodianId && (oldCustodianId !== newCustodianId || !oldIsCustody)) {
                        await tx.user.update({
                            where: { id: newCustodianId },
                            data: { pendingClearance: { increment: newAmount } }
                        }).catch(e => console.error('Error incrementing new pending clearance:', e));
                    } else if (newIsCustody && newCustodianId && oldCustodianId === newCustodianId && diff !== 0) {
                        await tx.user.update({
                            where: { id: newCustodianId },
                            data: { pendingClearance: { increment: diff } }
                        }).catch(e => console.error('Error adjusting pending clearance:', e));
                    }
                }
            }

            // 3. Handle Project / Cost Impacts if Amount Changed
            if (diff !== 0) {
                // If APPROVED, we must update project balances
                if (transaction.status === 'APPROVED') {
                    // Update Project Costs or Office Profit
                    if (transaction.projectId && transaction.category === 'MANAGEMENT_FEE_TRANSFER') {
                        await tx.project.update({
                            where: {
                                id: transaction.projectId,
                                tenantId: req.user.tenantId
                            },
                            data: {
                                officeRevenue: { increment: diff },
                                projectSafeBalance: { decrement: diff }
                            }
                        });
                    } else if (transaction.projectId && transaction.type === 'EXPENSE') {
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
                                            description: `Cost-Plus Management Fee (${feePercent}%) on ${newAmount} EGP expense (${finalDescription})`
                                        }
                                    });

                                    await tx.project.update({
                                        where: { id: transaction.projectId, tenantId: req.user.tenantId },
                                        data: {
                                            officeRevenue: { increment: feeDiff },
                                            projectSafeBalance: { decrement: feeDiff }
                                        }
                                    });
                                } else {
                                    await tx.transaction.delete({
                                        where: { id: feeTx.id }
                                    });

                                    await tx.project.update({
                                        where: { id: transaction.projectId, tenantId: req.user.tenantId },
                                        data: {
                                            officeRevenue: { decrement: oldFeeAmount },
                                            projectSafeBalance: { increment: oldFeeAmount }
                                        }
                                    });
                                }
                            } else if (newFeeAmount > 0) {
                                await tx.transaction.create({
                                    data: {
                                        type: 'EXPENSE',
                                        category: 'MANAGEMENT_FEE_TRANSFER',
                                        amount: newFeeAmount,
                                        description: `Cost-Plus Management Fee (${feePercent}%) on ${newAmount} EGP expense (${finalDescription})`,
                                        status: 'APPROVED',
                                        projectId: transaction.projectId,
                                        createdBy: req.user.id,
                                        transactionDate: new Date(),
                                        paymentMethod: 'OTHER',
                                        tenantId: req.user.tenantId,
                                        isOfficeExpense: false,
                                        notes: `PARENT_TX:${transaction.id}`
                                    }
                                });

                                await tx.project.update({
                                    where: { id: transaction.projectId, tenantId: req.user.tenantId },
                                    data: {
                                        officeRevenue: { increment: newFeeAmount },
                                        projectSafeBalance: { decrement: newFeeAmount }
                                    }
                                });
                            }
                        }
                    }
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
