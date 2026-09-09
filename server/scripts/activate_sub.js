import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';

const refOrTenant = process.argv[2];

if (!refOrTenant) {
    console.log(`
Usage: node scripts/activate_sub.js <ORDER_REFERENCE_OR_TENANT_ID> [PLAN_NAME]
Examples:
  node scripts/activate_sub.js IPN-807709
  node scripts/activate_sub.js "AI Micromind" BUSINESS
`);
    process.exit(1);
}

async function run() {
    console.log(`🔍 Searching for order or company: "${refOrTenant}"...`);

    // 1. Try finding payment attempt by reference (e.g. IPN-807709) or ID
    let attempt = await prisma.paymentAttempt.findFirst({
        where: {
            OR: [
                { paymobOrderId: refOrTenant },
                { id: refOrTenant }
            ]
        },
        include: { tenant: true }
    });

    if (attempt) {
        console.log(`✅ Found Payment Attempt:`, {
            id: attempt.id,
            ref: attempt.paymobOrderId,
            tenant: attempt.tenant.name,
            plan: attempt.plan,
            amount: attempt.amountEgp,
            status: attempt.status
        });

        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Update payment attempt status to SUCCESS
        await prisma.paymentAttempt.update({
            where: { id: attempt.id },
            data: {
                status: 'SUCCESS',
                rawWebhook: {
                    ...(attempt.rawWebhook || {}),
                    approvedBy: 'CLI Script',
                    approvedAt: new Date().toISOString()
                }
            }
        });

        // Update tenant subscription
        await prisma.tenant.update({
            where: { id: attempt.tenantId },
            data: {
                subscriptionPlan: attempt.plan || 'PREMIUM',
                isActive: true
            }
        });

        // Close old active subscription and create new active one
        await prisma.subscription.updateMany({
            where: { tenantId: attempt.tenantId, status: 'ACTIVE' },
            data: { status: 'EXPIRED' }
        });

        const newSub = await prisma.subscription.create({
            data: {
                tenantId: attempt.tenantId,
                plan: attempt.plan || 'PREMIUM',
                status: 'ACTIVE',
                currentPeriodStart: new Date(),
                currentPeriodEnd: periodEnd,
                billingCycle: 'MONTHLY',
                amountEgp: attempt.amountEgp,
                paymobOrderId: attempt.paymobOrderId
            }
        });

        console.log(`🎉 SUCCESS! Company "${attempt.tenant.name}" upgraded to ${attempt.plan} Plan until ${periodEnd.toLocaleDateString('en-GB')}`);
        process.exit(0);
    }

    // 2. Try finding by Tenant Name or Slug
    const tenant = await prisma.tenant.findFirst({
        where: {
            OR: [
                { name: { contains: refOrTenant, mode: 'insensitive' } },
                { slug: { contains: refOrTenant, mode: 'insensitive' } }
            ]
        }
    });

    if (!tenant) {
        console.error(`❌ Could not find any order reference or tenant matching "${refOrTenant}"`);
        process.exit(1);
    }

    const planToSet = (process.argv[3] || 'PREMIUM').toUpperCase();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
            subscriptionPlan: planToSet,
            isActive: true
        }
    });

    await prisma.subscription.updateMany({
        where: { tenantId: tenant.id, status: 'ACTIVE' },
        data: { status: 'EXPIRED' }
    });

    await prisma.subscription.create({
        data: {
            tenantId: tenant.id,
            plan: planToSet,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
            billingCycle: 'MONTHLY'
        }
    });

    console.log(`🎉 SUCCESS! Company "${tenant.name}" activated with ${planToSet} plan until ${periodEnd.toLocaleDateString('en-GB')}`);
    process.exit(0);
}

run().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
