import prisma from '../lib/prisma.js';
import { parseCsv, normalizeBankRows } from '../lib/csvParser.js';
import { generateSuggestionsForStatement, findMatchesForRow } from '../services/bankReconciliationService.js';
import { auditFromReq } from '../lib/audit.js';
import logger from '../lib/logger.js';

/**
 * POST /api/bank-statements/upload
 *   multipart "file" — CSV from a bank export. Persists a BankStatement +
 *   parsed BankStatementRow rows. Suggestions are generated synchronously
 *   for now (small statements only); for huge statements we'd queue this.
 */
export const uploadStatement = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'CSV file required (field "file")' });
    }

    let parsedRows;
    try {
        const csvText = req.file.buffer.toString('utf8');
        parsedRows = normalizeBankRows(parseCsv(csvText));
    } catch (err) {
        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message || 'CSV parse error'
        });
    }

    if (parsedRows.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No usable rows found in the CSV. Check that there is a date column and an amount/debit/credit column.'
        });
    }

    // Period is min/max parsed date — useful for the list view
    const dates = parsedRows.map(r => r.parsedDate).filter(Boolean);
    const periodStart = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
    const periodEnd = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

    const statement = await prisma.bankStatement.create({
        data: {
            tenantId: req.user.tenantId,
            uploadedById: req.user.id,
            originalName: req.file.originalname || 'statement.csv',
            status: 'PENDING',
            totalRows: parsedRows.length,
            periodStart,
            periodEnd,
            rows: {
                create: parsedRows.map(r => ({
                    tenantId: req.user.tenantId,
                    rowIndex: r.rowIndex,
                    rawDate: r.rawDate || null,
                    parsedDate: r.parsedDate,
                    amount: r.amount,
                    description: r.description || null,
                    reference: r.reference || null
                }))
            }
        }
    });

    // Run matching now. For a 500-row statement against ~10k transactions
    // this is a few seconds. Beyond that, push to a queue.
    try {
        await generateSuggestionsForStatement(statement.id, req.user.tenantId);
    } catch (err) {
        logger.error({ err, statementId: statement.id }, 'Suggestion generation failed');
        // Statement is still useful with status=PENDING; user can retry.
    }

    auditFromReq(req, {
        action: 'CREATE',
        entity: 'BankStatement',
        entityId: statement.id,
        metadata: { totalRows: statement.totalRows, originalName: statement.originalName }
    });

    const fresh = await prisma.bankStatement.findUnique({ where: { id: statement.id } });
    res.status(201).json({ success: true, data: fresh });
};

/**
 * GET /api/bank-statements
 */
export const listStatements = async (req, res) => {
    const items = await prisma.bankStatement.findMany({
        where: { tenantId: req.user.tenantId },
        orderBy: { createdAt: 'desc' },
        include: {
            uploadedBy: { select: { id: true, name: true } }
        },
        take: 50
    });
    res.json({ success: true, count: items.length, data: items });
};

/**
 * GET /api/bank-statements/:id — detail with rows
 */
export const getStatement = async (req, res) => {
    const stmt = await prisma.bankStatement.findFirst({
        where: { id: req.params.id, tenantId: req.user.tenantId },
        include: {
            uploadedBy: { select: { id: true, name: true } },
            rows: {
                orderBy: { rowIndex: 'asc' },
                include: {
                    matchedTransaction: {
                        select: {
                            id: true, amount: true, transactionDate: true,
                            description: true, type: true,
                            project: { select: { name: true } },
                            supplier: { select: { name: true } }
                        }
                    }
                }
            }
        }
    });
    if (!stmt) return res.status(404).json({ success: false, message: 'Statement not found' });
    res.json({ success: true, data: stmt });
};

/**
 * POST /api/bank-statements/:id/rematch — regenerate suggestions for all
 * UNMATCHED / SUGGESTED rows. Useful if the user just approved more
 * transactions that should now match.
 */
export const rematchStatement = async (req, res) => {
    const stmt = await prisma.bankStatement.findFirst({
        where: { id: req.params.id, tenantId: req.user.tenantId }
    });
    if (!stmt) return res.status(404).json({ success: false, message: 'Statement not found' });
    await generateSuggestionsForStatement(stmt.id, req.user.tenantId);
    const fresh = await prisma.bankStatement.findUnique({ where: { id: stmt.id } });
    res.json({ success: true, data: fresh });
};

/**
 * POST /api/bank-statements/:id/rows/:rowId/match
 *   body: { transactionId } — confirms the match. Sets row.MATCHED + row.matchedTransactionId
 *   AND transaction.reconciledAt. Updates statement.matchedRows.
 */
export const confirmRowMatch = async (req, res) => {
    const { id, rowId } = req.params;
    const { transactionId } = req.body;
    if (!transactionId) {
        return res.status(400).json({ success: false, message: 'transactionId required' });
    }

    const row = await prisma.bankStatementRow.findFirst({
        where: { id: rowId, statementId: id, tenantId: req.user.tenantId }
    });
    if (!row) return res.status(404).json({ success: false, message: 'Row not found' });
    if (row.status === 'MATCHED') {
        return res.status(400).json({ success: false, message: 'Row is already matched' });
    }

    // Verify the transaction is in this tenant and unreconciled
    const tx = await prisma.transaction.findFirst({
        where: { id: transactionId, tenantId: req.user.tenantId, reconciledAt: null }
    });
    if (!tx) {
        return res.status(400).json({
            success: false,
            message: 'Transaction not found in your tenant, or already reconciled'
        });
    }

    const now = new Date();
    await prisma.$transaction([
        prisma.bankStatementRow.update({
            where: { id: row.id },
            data: { status: 'MATCHED', matchedTransactionId: tx.id, matchedAt: now }
        }),
        prisma.transaction.update({
            where: { id: tx.id },
            data: { reconciledAt: now }
        }),
        prisma.bankStatement.update({
            where: { id: row.statementId },
            data: { matchedRows: { increment: 1 } }
        })
    ]);

    auditFromReq(req, {
        action: 'MATCH',
        entity: 'BankStatementRow',
        entityId: row.id,
        metadata: { transactionId: tx.id, statementId: row.statementId }
    });

    res.json({ success: true });
};

/**
 * POST /api/bank-statements/:id/rows/:rowId/ignore
 *   Mark a row as deliberately not-reconciled (e.g., bank fee, transfer to
 *   another account, etc.). It drops out of the review queue.
 */
export const ignoreRow = async (req, res) => {
    const { id, rowId } = req.params;
    const row = await prisma.bankStatementRow.findFirst({
        where: { id: rowId, statementId: id, tenantId: req.user.tenantId }
    });
    if (!row) return res.status(404).json({ success: false, message: 'Row not found' });
    if (row.status === 'MATCHED') {
        return res.status(400).json({ success: false, message: 'Row is already matched. Unmatch first.' });
    }

    await prisma.$transaction([
        prisma.bankStatementRow.update({
            where: { id: row.id },
            data: { status: 'IGNORED' }
        }),
        prisma.bankStatement.update({
            where: { id: row.statementId },
            data: { ignoredRows: { increment: 1 } }
        })
    ]);
    res.json({ success: true });
};

/**
 * POST /api/bank-statements/:id/rows/:rowId/unmatch
 *   Reverses a confirmed match. Used when the user picked the wrong tx.
 */
export const unmatchRow = async (req, res) => {
    const { id, rowId } = req.params;
    const row = await prisma.bankStatementRow.findFirst({
        where: { id: rowId, statementId: id, tenantId: req.user.tenantId }
    });
    if (!row || !row.matchedTransactionId) {
        return res.status(404).json({ success: false, message: 'Match not found' });
    }
    const txId = row.matchedTransactionId;
    await prisma.$transaction([
        prisma.bankStatementRow.update({
            where: { id: row.id },
            data: { status: 'SUGGESTED', matchedTransactionId: null, matchedAt: null }
        }),
        prisma.transaction.update({
            where: { id: txId },
            data: { reconciledAt: null }
        }),
        prisma.bankStatement.update({
            where: { id: row.statementId },
            data: { matchedRows: { decrement: 1 } }
        })
    ]);
    res.json({ success: true });
};
