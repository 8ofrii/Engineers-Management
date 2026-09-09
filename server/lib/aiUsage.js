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
import { aiCapForPlan } from './plans.js';

// Hard ceiling that overrides plan-based caps if env is set — useful as a
// global circuit breaker when OpenAI billing alarms fire.
const ENV_HARD_CAP = process.env.AI_MONTHLY_CAP ? Number(process.env.AI_MONTHLY_CAP) : null;

const startOfCurrentMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
};

/**
 * Resolve the cap for this tenant: plan limit (from active subscription)
 * + any purchased add-on token packs; clamp to ENV_HARD_CAP if set.
 */
const resolveCap = async (tenantId) => {
    const periodStart = startOfCurrentMonth();
    const [sub, tenant, addOns] = await Promise.all([
        prisma.subscription.findFirst({
            where: { tenantId, status: 'ACTIVE' },
            select: { plan: true }
        }),
        prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { subscriptionPlan: true }
        }),
        prisma.auditLog.findMany({
            where: {
                tenantId,
                action: 'ADDON_PURCHASED',
                createdAt: { gte: periodStart }
            },
            select: { metadata: true }
        })
    ]);
    const planKey = sub?.plan || tenant?.subscriptionPlan || 'FREE';
    let planCap = aiCapForPlan(planKey);

    // Sum purchased add-on tokens in this billing cycle
    if (addOns && addOns.length > 0) {
        for (const addon of addOns) {
            const meta = typeof addon.metadata === 'string' ? JSON.parse(addon.metadata) : addon.metadata;
            const uses = Number(meta?.uses || 0);
            planCap += uses;
        }
    }

    if (ENV_HARD_CAP != null) return Math.min(planCap, ENV_HARD_CAP);
    return planCap;
};

/**
 * @returns {Promise<{ count, cap, remaining, plan, periodStart }>}
 */
export const getTenantAiUsage = async (tenantId) => {
    const periodStart = startOfCurrentMonth();
    const [count, cap, sub, tenant] = await Promise.all([
        prisma.auditLog.count({
            where: {
                tenantId,
                action: { in: ['AI_EXTRACT', 'AI_CHAT'] },
                createdAt: { gte: periodStart }
            }
        }),
        resolveCap(tenantId),
        prisma.subscription.findFirst({
            where: { tenantId, status: 'ACTIVE' },
            select: { plan: true }
        }),
        prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { subscriptionPlan: true }
        })
    ]);
    const activePlanKey = sub?.plan || tenant?.subscriptionPlan || 'FREE';
    return {
        count,
        cap,
        remaining: Math.max(0, cap - count),
        plan: activePlanKey,
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
