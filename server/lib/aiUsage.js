// Per-tenant AI usage tracking. Piggybacks on AuditLog — every successful
// extraction already writes an AI_EXTRACT entry, so counting them is just
// a query. No new table.
//
// The cap is a soft limit: we return 429 with code AI_BUDGET_EXHAUSTED so
// the UI can show a clear message ("contact administrator"). Admins always
// see usage via GET /api/tenant/ai-usage.
//
// Defaults: 1000 extractions/month per tenant. ~$10-30/month at current
// gpt-4o-mini + Whisper rates. Override via env until tenant-level config
// is added.

import prisma from './prisma.js';

const DEFAULT_MONTHLY_CAP = Number(process.env.AI_MONTHLY_CAP || 1000);

const startOfCurrentMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
};

/**
 * @returns {Promise<{ count: number, cap: number, remaining: number, periodStart: Date }>}
 */
export const getTenantAiUsage = async (tenantId) => {
    const periodStart = startOfCurrentMonth();
    const count = await prisma.auditLog.count({
        where: {
            tenantId,
            action: 'AI_EXTRACT',
            createdAt: { gte: periodStart }
        }
    });
    return {
        count,
        cap: DEFAULT_MONTHLY_CAP,
        remaining: Math.max(0, DEFAULT_MONTHLY_CAP - count),
        periodStart
    };
};

/**
 * Check usage before an extraction call. Throws a typed error the controller
 * maps to a 429 response. We tolerate a slight race between check + write
 * (one tenant could go over by 1-2) — that's fine for a soft cap.
 */
export const enforceAiBudget = async (tenantId) => {
    const usage = await getTenantAiUsage(tenantId);
    if (usage.remaining > 0) return usage;
    const err = new Error('Monthly AI budget exhausted for this tenant.');
    err.code = 'AI_BUDGET_EXHAUSTED';
    err.statusCode = 429;
    err.usage = usage;
    throw err;
};
