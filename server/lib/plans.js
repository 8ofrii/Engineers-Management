// Subscription plan catalog. Hardcoded JSON for now — it'll move to a
// `plans` Prisma table when admin needs to edit prices without a deploy.
//
// Pricing rationale (Egyptian construction-firm SME market, 2026 Q2):
//   FREE_PILOT — 0 EGP, capped to 1 active project so tenants can try
//                the workflow on a real site before committing.
//   BASIC      — 500 EGP/mo (~$10), small contractor (5-15 employees,
//                3-5 concurrent projects).
//   PRO        — 1500 EGP/mo (~$30), mid-sized contractor (20-50
//                employees, multiple sites). Includes higher AI cap.
//   ENTERPRISE — contact sales (no in-app checkout).
//
// Limits matter: AI extraction is the most expensive feature; users on
// FREE_PILOT could otherwise burn the OpenAI bill. Tighten there.

export const PLANS = {
    FREE_PILOT: {
        key: 'FREE_PILOT',
        name: 'Free Pilot',
        nameAr: 'تجربة مجانية',
        priceEgp: 0,
        billingPeriodDays: 30,
        limits: {
            maxProjects: 1,
            maxUsers: 3,
            aiExtractionsPerMonth: 50,
            invoicePdf: true,
            bankReconciliation: false,
            customRoles: false
        },
        features: [
            '1 active project',
            '3 team members',
            '50 AI captures / month',
            'Basic financial tracking',
            'Daily site reports',
            'Invoice PDFs'
        ]
    },
    BASIC: {
        key: 'BASIC',
        name: 'Basic',
        nameAr: 'الباقة الأساسية',
        priceEgp: 500,
        billingPeriodDays: 30,
        limits: {
            maxProjects: 5,
            maxUsers: 10,
            aiExtractionsPerMonth: 500,
            invoicePdf: true,
            bankReconciliation: true,
            customRoles: false
        },
        features: [
            'Up to 5 active projects',
            '10 team members',
            '500 AI captures / month',
            'Bank reconciliation',
            'Email invoices',
            'Multi-tier approvals'
        ]
    },
    PRO: {
        key: 'PRO',
        name: 'Pro',
        nameAr: 'الباقة الاحترافية',
        priceEgp: 1500,
        billingPeriodDays: 30,
        limits: {
            maxProjects: -1,        // unlimited
            maxUsers: 30,
            aiExtractionsPerMonth: 2000,
            invoicePdf: true,
            bankReconciliation: true,
            customRoles: true
        },
        features: [
            'Unlimited projects',
            '30 team members',
            '2,000 AI captures / month',
            'Custom roles & permissions',
            'Priority support',
            'Everything in Basic'
        ]
    }
};

/** Returns plan config or null if key is unknown. */
export const getPlan = (key) => PLANS[key] || null;

/** Plans available for self-service checkout (excludes ENTERPRISE which is sales-led). */
export const listSelfServicePlans = () => Object.values(PLANS);

/** Read the AI cap for a plan, falling back to FREE_PILOT if invalid. */
export const aiCapForPlan = (planKey) => {
    const plan = getPlan(planKey) || PLANS.FREE_PILOT;
    return plan.limits.aiExtractionsPerMonth;
};
