import prisma from '../lib/prisma.js';
import { auditFromReq } from '../lib/audit.js';
import logger from '../lib/logger.js';
import {
    getAuthToken,
    registerOrder,
    getPaymentKey,
    buildIframeUrl,
    verifyWebhookHmac,
    paymobEnabled
} from '../lib/paymob.js';
import { getPlan, listSelfServicePlans } from '../lib/plans.js';

/**
 * GET /api/billing/plans — public catalog. Returns the self-serve plans.
 */
export const listPlans = async (req, res) => {
    res.json({
        success: true,
        data: listSelfServicePlans(),
        billingEnabled: paymobEnabled
    });
};

/**
 * GET /api/billing/subscription — current tenant's active subscription.
 * Falls back to a synthetic FREE_PILOT object if none persisted yet.
 */
export const getCurrentSubscription = async (req, res) => {
    const tenantId = req.user.tenantId;
    const sub = await prisma.subscription.findFirst({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { currentPeriodEnd: 'desc' }
    });
    if (sub) {
        return res.json({
            success: true,
            data: {
                ...sub,
                planConfig: getPlan(sub.plan)
            }
        });
    }
    // Synthetic free-pilot — no row in DB yet (legacy tenants pre-Phase-6.4)
    res.json({
        success: true,
        data: {
            tenantId,
            plan: 'FREE_PILOT',
            status: 'ACTIVE',
            currentPeriodStart: null,
            currentPeriodEnd: null,
            amountEgp: 0,
            planConfig: getPlan('FREE_PILOT'),
            synthetic: true
        }
    });
};

/**
 * POST /api/billing/checkout — start a Paymob payment for a chosen plan.
 * Body: { plan: 'BASIC' | 'PRO' }
 *
 * Returns: { iframeUrl, paymentAttemptId } — frontend redirects the user
 * to the iframe URL. Paymob handles card / wallet / Fawry from there.
 */
export const startCheckout = async (req, res) => {
    if (!paymobEnabled) {
        return res.status(503).json({
            success: false,
            code: 'BILLING_DISABLED',
            message: 'Online billing is not configured on this server. Please contact support.'
        });
    }

    const { plan: planKey } = req.body || {};
    const plan = getPlan(planKey);
    if (!plan) {
        return res.status(400).json({ success: false, message: 'Unknown plan key.' });
    }
    if (plan.priceEgp <= 0) {
        return res.status(400).json({ success: false, message: 'Free plans do not need checkout.' });
    }

    // Persist the attempt FIRST so we can correlate the webhook later
    const attempt = await prisma.paymentAttempt.create({
        data: {
            tenantId: req.user.tenantId,
            plan: plan.key,
            amountEgp: plan.priceEgp,
            status: 'PENDING'
        }
    });

    try {
        const authToken = await getAuthToken();
        const order = await registerOrder(authToken, {
            amountEgp: plan.priceEgp,
            merchantOrderId: attempt.id, // critical: this lets the webhook find our attempt
            items: [{
                name: plan.name,
                amount_cents: Math.round(plan.priceEgp * 100),
                description: `${plan.name} subscription — 1 month`,
                quantity: 1
            }]
        });

        const paymentToken = await getPaymentKey(authToken, {
            orderId: order.id,
            amountEgp: plan.priceEgp,
            billing: {
                email: req.user.email,
                name: req.user.name,
                phone: req.user.phone || '+200000000000'
            }
        });

        const iframeUrl = buildIframeUrl(paymentToken);

        await prisma.paymentAttempt.update({
            where: { id: attempt.id },
            data: {
                paymobOrderId: String(order.id),
                paymobPaymentKey: paymentToken,
                paymobIframeUrl: iframeUrl
            }
        });

        auditFromReq(req, {
            action: 'CHECKOUT_STARTED',
            entity: 'PaymentAttempt',
            entityId: attempt.id,
            metadata: { plan: plan.key, amount: plan.priceEgp, paymobOrderId: order.id }
        });

        res.json({
            success: true,
            data: {
                paymentAttemptId: attempt.id,
                iframeUrl,
                plan: plan.key,
                amountEgp: plan.priceEgp
            }
        });
    } catch (err) {
        logger.error({ err, attemptId: attempt.id }, 'Paymob checkout init failed');
        await prisma.paymentAttempt.update({
            where: { id: attempt.id },
            data: { status: 'FAILED', failureReason: err.message?.slice(0, 500) || 'unknown' }
        }).catch(() => { /* best-effort */ });
        res.status(err.statusCode || 502).json({
            success: false,
            message: 'Could not start checkout. Please try again or contact support.'
        });
    }
};

/**
 * POST /api/billing/webhook — Paymob's transaction-processed callback.
 * Public (no auth) but HMAC-verified. Paymob includes the HMAC as a query
 * param `?hmac=...`; the body's `obj` field has the transaction details.
 *
 * On success: close any active subscription, create a new one, mark
 * attempt SUCCESS. On failure: mark attempt FAILED + leave subscription as-is.
 */
export const webhook = async (req, res) => {
    const hmac = req.query.hmac;
    const obj = req.body?.obj;

    if (!obj) {
        return res.status(400).json({ success: false, message: 'Missing obj in webhook payload' });
    }

    const verified = verifyWebhookHmac(obj, hmac);
    if (!verified) {
        // Don't reveal much — log + 401. Paymob retries on non-2xx, so don't
        // 500 here unless we really crashed.
        logger.warn({ orderId: obj?.order?.id }, 'Paymob webhook HMAC failed');
        return res.status(401).json({ success: false, message: 'Invalid HMAC' });
    }

    // Find the attempt via the merchant_order_id we registered earlier.
    // Paymob nests the order; merchant_order_id is on order.merchant_order_id.
    const merchantOrderId = obj.order?.merchant_order_id;
    if (!merchantOrderId) {
        logger.warn('Webhook obj.order.merchant_order_id missing');
        return res.status(200).json({ success: true, ignored: true });
    }

    const attempt = await prisma.paymentAttempt.findUnique({
        where: { id: merchantOrderId }
    });
    if (!attempt) {
        logger.warn({ merchantOrderId }, 'Webhook for unknown payment attempt');
        return res.status(200).json({ success: true, ignored: true });
    }

    const success = obj.success === true;
    const errorOccured = obj.error_occured === true;

    try {
        if (success && !errorOccured) {
            // Close any existing active subscription, start a new one
            const plan = getPlan(attempt.plan);
            const start = new Date();
            const end = new Date(start.getTime() + plan.billingPeriodDays * 24 * 60 * 60 * 1000);

            const newSub = await prisma.$transaction(async (tx) => {
                await tx.subscription.updateMany({
                    where: { tenantId: attempt.tenantId, status: 'ACTIVE' },
                    data: { status: 'CANCELLED', cancelledAt: start }
                });
                return tx.subscription.create({
                    data: {
                        tenantId: attempt.tenantId,
                        plan: attempt.plan,
                        status: 'ACTIVE',
                        currentPeriodStart: start,
                        currentPeriodEnd: end,
                        amountEgp: attempt.amountEgp,
                        paymobOrderId: String(obj.order?.id ?? ''),
                        paymobTransactionId: String(obj.id ?? '')
                    }
                });
            });

            await prisma.paymentAttempt.update({
                where: { id: attempt.id },
                data: {
                    status: 'SUCCESS',
                    subscriptionId: newSub.id,
                    paymobTransactionId: String(obj.id ?? ''),
                    rawWebhook: obj
                }
            });

            // Reflect plan on the legacy Tenant.subscriptionPlan for older code paths
            await prisma.tenant.update({
                where: { id: attempt.tenantId },
                data: { subscriptionPlan: attempt.plan }
            });
        } else {
            await prisma.paymentAttempt.update({
                where: { id: attempt.id },
                data: {
                    status: 'FAILED',
                    failureReason: obj.data?.message || obj.txn_response_code || 'declined',
                    paymobTransactionId: String(obj.id ?? ''),
                    rawWebhook: obj
                }
            });
        }
        return res.status(200).json({ success: true });
    } catch (err) {
        logger.error({ err, attemptId: attempt.id }, 'Webhook handler crashed');
        // Return 200 anyway so Paymob doesn't retry-storm us; we have the rawWebhook saved.
        return res.status(200).json({ success: true, processed: false });
    }
};

/**
 * POST /api/billing/cancel — admin manually cancels active subscription.
 * No refund logic in v1; current period stays usable until end date.
 */
export const cancelSubscription = async (req, res) => {
    const sub = await prisma.subscription.findFirst({
        where: { tenantId: req.user.tenantId, status: 'ACTIVE' }
    });
    if (!sub) {
        return res.status(404).json({ success: false, message: 'No active subscription to cancel.' });
    }
    await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() }
    });
    auditFromReq(req, {
        action: 'CANCEL',
        entity: 'Subscription',
        entityId: sub.id,
        metadata: { plan: sub.plan }
    });
    res.json({ success: true });
};

/**
 * GET /api/billing/payment-attempts — admin sees recent checkouts (debugging).
 */
export const listPaymentAttempts = async (req, res) => {
    const items = await prisma.paymentAttempt.findMany({
        where: { tenantId: req.user.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50
    });
    res.json({ success: true, data: items });
};
