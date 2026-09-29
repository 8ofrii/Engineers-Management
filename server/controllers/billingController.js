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
import { getPlan, listSelfServicePlans, listAddOnPacks, ADD_ONS, isPlanEligibleForAddOns } from '../lib/plans.js';
import { getTenantAiUsage } from '../lib/aiUsage.js';
import { getTenantStorageUsage } from '../lib/storageUsage.js';
import { getInstaPayConfig, generateReferenceCode } from '../lib/instapay.js';
import { uploadBuffer } from '../lib/storage.js';

/**
 * GET /api/billing/plans — public catalog. Returns the self-serve plans and add-on packs.
 */
export const listPlans = async (req, res) => {
    res.json({
        success: true,
        data: listSelfServicePlans(),
        addOns: listAddOnPacks(),
        billingEnabled: paymobEnabled
    });
};

/**
 * GET /api/billing/subscription — current tenant's active subscription + real-time usage stats.
 */
export const getCurrentSubscription = async (req, res) => {
    const tenantId = req.user.tenantId;
    const [sub, tenant, projectCount, userCount, aiUsage, storageUsage] = await Promise.all([
        prisma.subscription.findFirst({
            where: { tenantId, status: 'ACTIVE' },
            orderBy: { currentPeriodEnd: 'desc' }
        }),
        prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { subscriptionPlan: true }
        }),
        prisma.project.count({ where: { tenantId, deletedAt: null } }),
        prisma.user.count({ where: { tenantId, isActive: true } }),
        getTenantAiUsage(tenantId),
        getTenantStorageUsage(tenantId)
    ]);

    const rawPlanKey = sub?.plan || tenant?.subscriptionPlan || 'FREE';
    const planConfig = getPlan(rawPlanKey);
    const activePlanKey = planConfig.key; // Always canonical: 'FREE', 'PREMIUM', or 'ENTERPRISE'

    const usageStats = {
        projects: {
            current: projectCount,
            max: planConfig.limits.maxProjects,
            isUnlimited: planConfig.limits.maxProjects === -1
        },
        users: {
            current: userCount,
            max: planConfig.limits.maxUsers,
            isUnlimited: planConfig.limits.maxUsers === -1
        },
        aiActions: {
            current: aiUsage.count,
            max: aiUsage.cap,
            remaining: aiUsage.remaining,
            periodStart: aiUsage.periodStart
        },
        storage: {
            currentMb: storageUsage.usedMb,
            maxMb: storageUsage.maxMb,
            remainingMb: storageUsage.remainingMb,
            usedPercent: storageUsage.usedPercent,
            isUnlimited: storageUsage.isUnlimited,
            maxUploadFileMb: storageUsage.maxUploadFileMb
        }
    };

    if (sub) {
        return res.json({
            success: true,
            data: {
                ...sub,
                plan: activePlanKey,
                rawPlan: rawPlanKey,
                planConfig,
                usage: usageStats
            }
        });
    }

    // Default active subscription object
    res.json({
        success: true,
        data: {
            tenantId,
            plan: activePlanKey,
            status: 'ACTIVE',
            currentPeriodStart: null,
            currentPeriodEnd: null,
            amountEgp: planConfig.priceEgp,
            planConfig,
            usage: usageStats,
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
 * POST /api/billing/cancel — admin manually cancels active subscription and downgrades to Free.
 */
export const cancelSubscription = async (req, res) => {
    const tenantId = req.user.tenantId;
    const [sub, tenant] = await Promise.all([
        prisma.subscription.findFirst({
            where: { tenantId, status: 'ACTIVE' }
        }),
        prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { subscriptionPlan: true }
        })
    ]);

    const isPaid = (sub && sub.plan !== 'FREE') || (tenant && tenant.subscriptionPlan !== 'FREE' && tenant.subscriptionPlan !== 'FREE_PILOT');
    if (!sub && !isPaid) {
        return res.status(400).json({ success: false, message: 'No active paid subscription to cancel.' });
    }

    await prisma.$transaction(async (tx) => {
        // Cancel all existing active subscriptions
        await tx.subscription.updateMany({
            where: { tenantId, status: 'ACTIVE' },
            data: { status: 'CANCELLED', cancelledAt: new Date() }
        });

        // Set tenant subscription plan back to FREE
        await tx.tenant.update({
            where: { id: tenantId },
            data: { subscriptionPlan: 'FREE' }
        });

        // Create an active FREE subscription record
        await tx.subscription.create({
            data: {
                tenantId,
                plan: 'FREE',
                status: 'ACTIVE',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000),
                amountEgp: 0
            }
        });
    });

    auditFromReq(req, {
        action: 'CANCEL',
        entity: 'Subscription',
        entityId: sub?.id || tenantId,
        metadata: { plan: sub?.plan || tenant?.subscriptionPlan }
    });

    res.json({ success: true, message: 'Subscription cancelled successfully and downgraded to Free plan.' });
};

/**
 * POST /api/billing/select-plan — admin directly selects a plan.
 * Security: Only FREE plans can be selected directly. Paid plans MUST be purchased
 * via Paymob checkout (/checkout) or verified InstaPay transfer, unless executed by a SUPER_ADMIN.
 */
export const selectPlan = async (req, res) => {
    const { plan: planKey, confirmDowngrade, confirmationCode, reason, feedback } = req.body || {};
    const plan = getPlan(planKey);
    if (!plan) {
        return res.status(400).json({ success: false, message: 'Unknown plan key.' });
    }

    // Security Gate: Paid plans cannot be activated for free by standard tenant admins
    if (plan.priceEgp > 0 && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
            success: false,
            code: 'PAYMENT_REQUIRED',
            message: 'Paid plans must be purchased via checkout or approved bank transfer.'
        });
    }

    const tenantId = req.user.tenantId;

    // Check if currently on a paid subscription or paid tenant plan
    const [currentSub, tenant] = await Promise.all([
        prisma.subscription.findFirst({
            where: { tenantId, status: 'ACTIVE' },
            orderBy: { currentPeriodEnd: 'desc' }
        }),
        prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { subscriptionPlan: true }
        })
    ]);

    const activePlanKey = currentSub?.plan || tenant?.subscriptionPlan || 'FREE';
    const activePlanConfig = getPlan(activePlanKey);
    const isDowngradingFromPaid = (activePlanConfig?.priceEgp > 0 || (activePlanKey !== 'FREE' && planKey === 'FREE'));

    if (isDowngradingFromPaid && planKey === 'FREE') {
        if (!confirmDowngrade) {
            return res.status(400).json({
                success: false,
                code: 'DOWNGRADE_CONFIRMATION_REQUIRED',
                message: 'Explicit downgrade confirmation is required to switch from a paid plan to Free.',
                messageAr: 'يتطلب الانتقال من باقة مدفوعة إلى الباقة المجانية تأكيداً صريحاً لتجنب التخفيض غير المقصود.'
            });
        }
    }

    const start = new Date();
    const end = new Date(start.getTime() + plan.billingPeriodDays * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
        await tx.subscription.updateMany({
            where: { tenantId, status: 'ACTIVE' },
            data: { status: 'CANCELLED', cancelledAt: start }
        });
        await tx.subscription.create({
            data: {
                tenantId,
                plan: plan.key,
                status: 'ACTIVE',
                currentPeriodStart: start,
                currentPeriodEnd: end,
                amountEgp: plan.priceEgp
            }
        });
        await tx.tenant.update({
            where: { id: tenantId },
            data: { subscriptionPlan: plan.key }
        });
    });

    auditFromReq(req, {
        action: isDowngradingFromPaid ? 'PLAN_DOWNGRADE' : 'PLAN_CHANGED',
        entity: 'Subscription',
        entityId: tenantId,
        metadata: {
            fromPlan: activePlanKey,
            toPlan: plan.key,
            downgradeReason: reason || null,
            downgradeFeedback: feedback || null
        }
    });

    res.json({
        success: true,
        message: isDowngradingFromPaid
            ? `Your plan has been downgraded to ${plan.name}. Limits have been updated.`
            : `Successfully updated plan to ${plan.name}`,
        messageAr: isDowngradingFromPaid
            ? `تم تخفيض باقتك بنجاح إلى ${plan.nameAr}. تم تطبيق الحدود المجانية الجديدة.`
            : `تم تحديث الباقة بنجاح إلى ${plan.nameAr}`,
        plan: plan.key
    });
};

/**
 * POST /api/billing/buy-addon — direct add-on assignment (SUPER_ADMIN only).
 * Standard users must purchase add-ons via /checkout or /instapay/initiate.
 */
export const buyAddOn = async (req, res) => {
    const { addOnKey } = req.body || {};
    const addOn = ADD_ONS[addOnKey];
    if (!addOn) {
        return res.status(400).json({ success: false, message: 'Unknown add-on package.' });
    }

    // Security Gate: Add-on direct activation is restricted to SUPER_ADMIN
    if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
            success: false,
            code: 'PAYMENT_REQUIRED',
            message: 'Add-on packages must be purchased via checkout or approved bank transfer.'
        });
    }

    const tenantId = req.user.tenantId;

    const [sub, tenant] = await Promise.all([
        prisma.subscription.findFirst({
            where: { tenantId, status: 'ACTIVE' },
            orderBy: { currentPeriodEnd: 'desc' }
        }),
        prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { subscriptionPlan: true }
        })
    ]);
    const activePlanKey = sub?.plan || tenant?.subscriptionPlan || 'FREE';
    if (!isPlanEligibleForAddOns(activePlanKey)) {
        return res.status(400).json({
            success: false,
            code: 'ADDON_TIER_RESTRICTED',
            message: 'Add-on packages can only be assigned to tenants on Premium or Enterprise plans.'
        });
    }

    await auditFromReq(req, {
        action: 'ADDON_PURCHASED',
        entity: 'Tenant',
        entityId: tenantId,
        metadata: { addOnKey, uses: addOn.uses, amountEgp: addOn.priceEgp }
    });

    res.json({
        success: true,
        message: `Successfully added ${addOn.name} (${addOn.uses} AI actions).`,
        addOn
    });
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

/**
 * GET /api/billing/instapay-config — public / tenant-facing bank & InstaPay target details.
 */
export const fetchInstaPayConfig = async (req, res) => {
    const config = getInstaPayConfig();
    res.json({
        success: true,
        data: config
    });
};

/**
 * POST /api/billing/instapay/initiate — generate an InstaPay order reference and payment attempt.
 * Body: { itemType: 'PLAN' | 'ADDON', itemKey: 'PREMIUM' | 'BUSINESS' | 'addon_...' }
 */
export const initiateInstaPay = async (req, res) => {
    const { itemType = 'PLAN', itemKey } = req.body || {};
    const tenantId = req.user.tenantId;

    let priceEgp = 0;
    let itemName = '';

    if (itemType === 'PLAN') {
        const plan = getPlan(itemKey);
        if (!plan) {
            return res.status(400).json({ success: false, message: 'Invalid subscription plan.' });
        }
        if (plan.priceEgp <= 0) {
            return res.status(400).json({ success: false, message: 'Free plan does not require payment.' });
        }
        priceEgp = plan.priceEgp;
        itemName = `${plan.name} Subscription`;
    } else if (itemType === 'ADDON') {
        // Enforce: Add-ons only available to Premium and Enterprise members
        const [sub, tenant] = await Promise.all([
            prisma.subscription.findFirst({
                where: { tenantId, status: 'ACTIVE' },
                orderBy: { currentPeriodEnd: 'desc' }
            }),
            prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { subscriptionPlan: true }
            })
        ]);
        const activePlanKey = sub?.plan || tenant?.subscriptionPlan || 'FREE';
        if (!isPlanEligibleForAddOns(activePlanKey)) {
            return res.status(403).json({
                success: false,
                code: 'ADDON_TIER_RESTRICTED',
                message: 'AI Token Add-On packs are exclusively available to Premium and Enterprise members. Please upgrade your plan first.',
                messageAr: 'باقات شحن الذكاء الاصطناعي الإضافية متاحة حصرياً لمشتركي الباقة المميزة (Premium) وباقة الشركات (Enterprise). يرجى ترقية باقتك أولاً.'
            });
        }

        const addOn = ADD_ONS[itemKey];
        if (!addOn) {
            return res.status(400).json({ success: false, message: 'Invalid add-on package.' });
        }
        priceEgp = addOn.priceEgp;
        itemName = `${addOn.name} (${addOn.uses} AI Actions)`;
    } else {
        return res.status(400).json({ success: false, message: 'Invalid item type.' });
    }

    const referenceCode = generateReferenceCode();
    const config = getInstaPayConfig();

    // Check if there is already an active submitted proof for this tenant
    const existingPending = await prisma.paymentAttempt.findMany({
        where: {
            tenantId,
            status: 'PENDING'
        }
    });

    for (const ep of existingPending) {
        const meta = ep.rawWebhook || {};
        if (meta.step === 'PROOF_SUBMITTED') {
            return res.status(400).json({
                success: false,
                code: 'ALREADY_PENDING',
                message: 'You already have a payment receipt under verification. Please wait for approval or cancel your current request.'
            });
        }
    }

    // Expire any unsubmitted (INITIATED) drafts for this tenant
    await prisma.paymentAttempt.updateMany({
        where: {
            tenantId,
            status: 'PENDING'
        },
        data: { status: 'EXPIRED' }
    });

    const attempt = await prisma.paymentAttempt.create({
        data: {
            tenantId,
            plan: itemKey,
            amountEgp: priceEgp,
            status: 'PENDING',
            paymobOrderId: referenceCode, // Stores our human-readable IPN reference
            rawWebhook: {
                method: 'INSTAPAY',
                itemType,
                itemKey,
                itemName,
                referenceCode,
                step: 'INITIATED',
                initiatedByUserId: req.user.id,
                initiatedByEmail: req.user.email,
                initiatedAt: new Date().toISOString()
            }
        }
    });

    await auditFromReq(req, {
        action: 'INSTAPAY_INITIATED',
        entity: 'PaymentAttempt',
        entityId: attempt.id,
        metadata: { referenceCode, itemType, itemKey, amountEgp: priceEgp }
    });

    res.json({
        success: true,
        data: {
            paymentAttemptId: attempt.id,
            referenceCode,
            amountEgp: priceEgp,
            itemName,
            itemType,
            itemKey,
            targetDetails: config
        }
    });
};

/**
 * POST /api/billing/instapay/submit-proof — customer submits receipt image & sender details.
 */
export const submitInstaPayProof = async (req, res) => {
    const { paymentAttemptId, senderName, senderPhone, transferRef, receiptUrl: bodyReceiptUrl } = req.body || {};
    const tenantId = req.user.tenantId;

    if (!paymentAttemptId) {
        return res.status(400).json({ success: false, message: 'Payment attempt ID is required.' });
    }

    const attempt = await prisma.paymentAttempt.findFirst({
        where: { id: paymentAttemptId, tenantId }
    });

    if (!attempt) {
        return res.status(404).json({ success: false, message: 'Payment attempt not found.' });
    }

    let finalReceiptUrl = bodyReceiptUrl || '';

    if (req.file) {
        try {
            finalReceiptUrl = await uploadBuffer(req.file.buffer, req.file.mimetype, 'receipts');
        } catch (uploadErr) {
            logger.error({ uploadErr }, 'Failed to upload InstaPay receipt image');
        }
    }

    const existingMeta = typeof attempt.rawWebhook === 'object' && attempt.rawWebhook !== null ? attempt.rawWebhook : {};
    const updatedMeta = {
        ...existingMeta,
        step: 'PROOF_SUBMITTED',
        senderName: senderName || '',
        senderPhone: senderPhone || '',
        transferRef: transferRef || '',
        receiptUrl: finalReceiptUrl,
        submittedAt: new Date().toISOString()
    };

    // Mark any other pending attempts for this tenant as EXPIRED
    await prisma.paymentAttempt.updateMany({
        where: {
            tenantId,
            id: { not: attempt.id },
            status: 'PENDING'
        },
        data: { status: 'EXPIRED' }
    });

    await prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
            status: 'PENDING',
            rawWebhook: updatedMeta
        }
    });

    await auditFromReq(req, {
        action: 'INSTAPAY_PROOF_SUBMITTED',
        entity: 'PaymentAttempt',
        entityId: attempt.id,
        metadata: { referenceCode: attempt.paymobOrderId, senderName, senderPhone, transferRef, receiptUrl: finalReceiptUrl }
    });

    res.json({
        success: true,
        message: 'Payment proof submitted successfully. Your request is under verification.',
        data: {
            paymentAttemptId: attempt.id,
            status: 'PENDING',
            referenceCode: attempt.paymobOrderId,
            receiptUrl: finalReceiptUrl
        }
    });
};

/**
 * GET /api/billing/instapay/pending — list pending/submitted payments.
 * Supports ?scope=all for Super Admin / Admin approvals queue.
 */
export const listPendingInstaPayPayments = async (req, res) => {
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    const scope = req.query.scope;

    if (isSuperAdmin && scope === 'all') {
        const attempts = await prisma.paymentAttempt.findMany({
            where: {
                status: 'PENDING'
            },
            include: {
                tenant: {
                    select: { id: true, name: true, email: true, phone: true, subscriptionPlan: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        // Filter only InstaPay attempts where proof has been submitted
        const instapayAttempts = attempts.filter(att => {
            const meta = att.rawWebhook;
            return meta && typeof meta === 'object' && meta.method === 'INSTAPAY' && meta.step === 'PROOF_SUBMITTED';
        });

        return res.json({
            success: true,
            data: instapayAttempts
        });
    }

    // Tenant Scope
    const tenant = await prisma.tenant.findUnique({
        where: { id: req.user.tenantId },
        select: { id: true, subscriptionPlan: true }
    });

    const attempts = await prisma.paymentAttempt.findMany({
        where: {
            tenantId: req.user.tenantId,
            status: 'PENDING'
        },
        include: {
            tenant: {
                select: { id: true, name: true, email: true, phone: true, subscriptionPlan: true }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    const instapayAttempts = attempts.filter(att => {
        const meta = att.rawWebhook;
        if (!meta || typeof meta !== 'object' || meta.method !== 'INSTAPAY') return false;
        // Must have actually submitted proof
        if (meta.step !== 'PROOF_SUBMITTED') return false;
        // If tenant is already on this plan, auto-expire and don't show
        if (meta.itemType === 'PLAN' && att.plan === tenant?.subscriptionPlan) {
            prisma.paymentAttempt.update({
                where: { id: att.id },
                data: { status: 'EXPIRED' }
            }).catch(() => {});
            return false;
        }
        return true;
    });

    res.json({
        success: true,
        data: instapayAttempts
    });
};

/**
 * POST /api/billing/instapay/cancel — User/tenant cancels a pending InstaPay verification request.
 */
export const cancelInstaPayRequest = async (req, res) => {
    const { paymentAttemptId } = req.body || {};
    const tenantId = req.user.tenantId;

    await prisma.paymentAttempt.updateMany({
        where: {
            ...(paymentAttemptId ? { id: paymentAttemptId } : {}),
            tenantId,
            status: 'PENDING'
        },
        data: { status: 'EXPIRED' }
    });

    res.json({
        success: true,
        message: 'Request cancelled successfully.'
    });
};

/**
 * POST /api/billing/instapay/approve — Admin approves InstaPay payment and activates plan or add-on.
 */
export const approveInstaPayPayment = async (req, res) => {
    const { paymentAttemptId, adminNotes } = req.body || {};

    if (!paymentAttemptId) {
        return res.status(400).json({ success: false, message: 'Payment attempt ID is required.' });
    }

    const attempt = await prisma.paymentAttempt.findUnique({
        where: { id: paymentAttemptId },
        include: { tenant: true }
    });

    if (!attempt) {
        return res.status(404).json({ success: false, message: 'Payment attempt not found.' });
    }

    if (attempt.status === 'SUCCESS') {
        return res.status(400).json({ success: false, message: 'Payment attempt is already approved.' });
    }

    const meta = typeof attempt.rawWebhook === 'object' && attempt.rawWebhook !== null ? attempt.rawWebhook : {};
    const itemType = meta.itemType || 'PLAN';
    const itemKey = attempt.plan;

    try {
        if (itemType === 'PLAN') {
            const plan = getPlan(itemKey);
            if (!plan) {
                return res.status(400).json({ success: false, message: 'Plan configuration not found.' });
            }

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
                        plan: plan.key,
                        status: 'ACTIVE',
                        currentPeriodStart: start,
                        currentPeriodEnd: end,
                        amountEgp: attempt.amountEgp,
                        paymobOrderId: attempt.paymobOrderId || 'INSTAPAY'
                    }
                });
            });

            await prisma.tenant.update({
                where: { id: attempt.tenantId },
                data: { subscriptionPlan: plan.key }
            });

            await prisma.paymentAttempt.update({
                where: { id: attempt.id },
                data: {
                    status: 'SUCCESS',
                    subscriptionId: newSub.id,
                    rawWebhook: {
                        ...meta,
                        step: 'APPROVED',
                        approvedBy: req.user.id,
                        approvedByEmail: req.user.email,
                        approvedAt: new Date().toISOString(),
                        adminNotes: adminNotes || ''
                    }
                }
            });
        } else if (itemType === 'ADDON') {
            const addOn = ADD_ONS[itemKey];
            const uses = addOn?.uses || 500;

            await prisma.auditLog.create({
                data: {
                    tenantId: attempt.tenantId,
                    userId: req.user.id,
                    action: 'ADDON_PURCHASED',
                    entity: 'Tenant',
                    entityId: attempt.tenantId,
                    metadata: {
                        addOnKey: itemKey,
                        uses,
                        amountEgp: Number(attempt.amountEgp),
                        paymentMethod: 'INSTAPAY',
                        referenceCode: attempt.paymobOrderId
                    }
                }
            });

            await prisma.paymentAttempt.update({
                where: { id: attempt.id },
                data: {
                    status: 'SUCCESS',
                    rawWebhook: {
                        ...meta,
                        step: 'APPROVED',
                        approvedBy: req.user.id,
                        approvedByEmail: req.user.email,
                        approvedAt: new Date().toISOString(),
                        adminNotes: adminNotes || ''
                    }
                }
            });
        }

        // Expire all other pending attempts for this tenant so no stale banners remain
        await prisma.paymentAttempt.updateMany({
            where: {
                tenantId: attempt.tenantId,
                id: { not: attempt.id },
                status: 'PENDING'
            },
            data: { status: 'EXPIRED' }
        });

        await auditFromReq(req, {
            action: 'INSTAPAY_APPROVED',
            entity: 'PaymentAttempt',
            entityId: attempt.id,
            metadata: { referenceCode: attempt.paymobOrderId, itemType, itemKey, tenantId: attempt.tenantId }
        });

        res.json({
            success: true,
            message: 'Payment approved successfully and service activated!'
        });
    } catch (err) {
        logger.error({ err, attemptId: attempt.id }, 'InstaPay approval failed');
        res.status(500).json({ success: false, message: 'Failed to complete payment approval.' });
    }
};

/**
 * POST /api/billing/instapay/reject — Admin rejects InstaPay payment attempt with reason.
 */
export const rejectInstaPayPayment = async (req, res) => {
    const { paymentAttemptId, reason } = req.body || {};

    if (!paymentAttemptId) {
        return res.status(400).json({ success: false, message: 'Payment attempt ID is required.' });
    }

    const attempt = await prisma.paymentAttempt.findUnique({
        where: { id: paymentAttemptId }
    });

    if (!attempt) {
        return res.status(404).json({ success: false, message: 'Payment attempt not found.' });
    }

    const meta = typeof attempt.rawWebhook === 'object' && attempt.rawWebhook !== null ? attempt.rawWebhook : {};

    await prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
            status: 'FAILED',
            failureReason: reason || 'Transfer proof rejected by admin.',
            rawWebhook: {
                ...meta,
                step: 'REJECTED',
                rejectedBy: req.user.id,
                rejectedByEmail: req.user.email,
                rejectedAt: new Date().toISOString(),
                rejectReason: reason || ''
            }
        }
    });

    await auditFromReq(req, {
        action: 'INSTAPAY_REJECTED',
        entity: 'PaymentAttempt',
        entityId: attempt.id,
        metadata: { referenceCode: attempt.paymobOrderId, reason }
    });

    res.json({
        success: true,
        message: 'Payment request rejected.'
    });
};

