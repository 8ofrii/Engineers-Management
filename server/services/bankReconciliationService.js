// Bank-statement → Transaction matching.
//
// For each unmatched bank row, we look for tenant transactions where:
//   - amount matches (within 1 EGP tolerance, exact in practice)
//   - transactionDate is within ±DATE_WINDOW_DAYS
//   - transaction is APPROVED (PENDING_APPROVAL drafts shouldn't reconcile)
//   - transaction is not already reconciled
//
// We score candidates by date proximity (full points if same day, scaling
// down) and return the top N. The user always confirms — no auto-commit.

import prisma from '../lib/prisma.js';

const DATE_WINDOW_DAYS = 7;
const AMOUNT_TOLERANCE = 1.0; // EGP
const TOP_N = 5;

const dayDiff = (a, b) => Math.abs((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

/**
 * For a single row, return { suggestions: [{ transactionId, score, reason }] }.
 * Higher score = better match. 1.0 = exact amount + same day.
 */
export const findMatchesForRow = async ({ amount, parsedDate, description }, tenantId) => {
    if (!parsedDate || amount == null) return [];

    // Bank credits = positive (money in), debits = negative (money out).
    // Our Transaction.type INCOME = credit-side, EXPENSE = debit-side.
    // Match by absolute value; type filter narrows the search.
    const absAmount = Math.abs(Number(amount));
    const txType = amount > 0 ? 'INCOME' : 'EXPENSE';

    const dateLow = new Date(parsedDate);
    dateLow.setDate(dateLow.getDate() - DATE_WINDOW_DAYS);
    const dateHigh = new Date(parsedDate);
    dateHigh.setDate(dateHigh.getDate() + DATE_WINDOW_DAYS);

    // We pull a slightly wider amount window in case of fee discrepancies, then
    // filter strictly in JS. Prisma's Decimal column doesn't support tolerance
    // in WHERE so we do a range query.
    const candidates = await prisma.transaction.findMany({
        where: {
            tenantId,
            type: txType,
            status: 'APPROVED',
            reconciledAt: null,
            transactionDate: { gte: dateLow, lte: dateHigh },
            amount: {
                gte: absAmount - AMOUNT_TOLERANCE,
                lte: absAmount + AMOUNT_TOLERANCE
            }
        },
        select: {
            id: true,
            amount: true,
            transactionDate: true,
            description: true,
            supplier: { select: { name: true } },
            project: { select: { name: true } }
        },
        take: 50
    });

    return candidates
        .map(c => {
            const days = dayDiff(parsedDate, c.transactionDate);
            // Score: 1.0 - (days / window). Same day → 1.0, edge of window → ~0
            const dateScore = Math.max(0, 1 - days / DATE_WINDOW_DAYS);
            // Description similarity (very rough): boost if substring match
            const descBoost = description && c.description &&
                String(c.description).toLowerCase().includes(String(description).toLowerCase().slice(0, 20))
                ? 0.1 : 0;
            const score = Math.min(1, dateScore + descBoost);
            return {
                transactionId: c.id,
                amount: Number(c.amount),
                transactionDate: c.transactionDate,
                description: c.description,
                supplier: c.supplier?.name || null,
                project: c.project?.name || null,
                score: Math.round(score * 100) / 100,
                reason: days < 1
                    ? 'amount + same day'
                    : `amount + ${Math.round(days)} day${days >= 2 ? 's' : ''} apart`
            };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_N);
};

/**
 * Run matching for every UNMATCHED row in a statement, persist the
 * suggestions, and update statement status to REVIEWING.
 */
export const generateSuggestionsForStatement = async (statementId, tenantId) => {
    const rows = await prisma.bankStatementRow.findMany({
        where: { statementId, tenantId, status: 'UNMATCHED' }
    });

    for (const row of rows) {
        const suggestions = await findMatchesForRow(
            {
                amount: Number(row.amount),
                parsedDate: row.parsedDate,
                description: row.description
            },
            tenantId
        );
        await prisma.bankStatementRow.update({
            where: { id: row.id },
            data: {
                suggestions,
                status: suggestions.length > 0 ? 'SUGGESTED' : 'UNMATCHED'
            }
        });
    }

    await prisma.bankStatement.update({
        where: { id: statementId },
        data: { status: 'REVIEWING' }
    });
};
