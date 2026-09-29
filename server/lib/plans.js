// Official Subscription Plan Catalog for Hesaby ERP (2026 Q3)
// Uncapped features for all paid tiers — differentiated solely by capacity and AI quotas.

export const PLANS = {
    FREE: {
        key: 'FREE',
        name: 'Free Plan',
        nameAr: 'الباقة المجانية',
        description: 'Ideal for small site teams on up to 3 active projects.',
        descriptionAr: 'مثالية لتجربة النظام وإدارة فرق المواقع حتى 3 مشاريع نشطة.',
        priceUsd: 0,
        priceEgp: 0,
        billingPeriodDays: 30,
        limits: {
            maxProjects: 3,
            maxUsers: 5,
            aiExtractionsPerMonth: 20,
            maxStorageMb: 50,
            maxUploadFileMb: 3,
            allFeaturesUnlocked: true
        },
        features: [
            'Up to 3 Active Projects',
            'Up to 5 Team Members',
            '20 AI Agent Actions / month',
            '50 MB Media & Document Storage',
            'Max 3 MB per Upload',
            '100% Full ERP Features Included',
            'Mobile Companion App'
        ],
        featuresAr: [
            'حتى 3 مشاريع نشطة',
            'حتى 5 أعضاء في فريق العمل',
            '20 عملية ذكاء اصطناعي شهرياً',
            '50 ميجابايت مساحة تخزين المستندات والإيصالات',
            'الحد الأقصى للملف الواحد 3 ميجابايت',
            'جميع ميزات النظام مفعلة بالكامل',
            'تطبيق الموبايل الميداني'
        ]
    },
    PREMIUM: {
        key: 'PREMIUM',
        name: 'Premium Plan',
        nameAr: 'الباقة المميزة (Premium)',
        description: 'For growing contracting firms and active site teams.',
        descriptionAr: 'لمكاتب وشركات المقاولات وفرق المواقع المتنامية.',
        priceUsd: 49,
        priceEgp: 2450,
        billingPeriodDays: 30,
        popular: true,
        limits: {
            maxProjects: 10,
            maxUsers: 15,
            aiExtractionsPerMonth: 2500,
            maxStorageMb: 2048,
            maxUploadFileMb: 25,
            allFeaturesUnlocked: true
        },
        features: [
            'Up to 10 Active Projects',
            'Up to 15 Team Members',
            '2,500 AI Agent Actions / month',
            '2 GB Cloud Media & Document Storage',
            'Max 25 MB per Upload',
            'ALL ERP Features Unlocked',
            'Workforce Wages & DSR Reports',
            'Inventory & Supplier Batches',
            'Multi-Level Approvals & Custody',
            'Mobile Companion App'
        ],
        featuresAr: [
            'حتى 10 مشاريع نشطة',
            'حتى 15 مستخدماً في الفريق',
            '2,500 عملية ذكاء اصطناعي شهرياً',
            '2 جيجابايت مساحة تخزين المستندات والإيصالات',
            'الحد الأقصى للملف الواحد 25 ميجابايت',
            'جميع ميزات النظام متاحة بالكامل',
            'يوميات العمالة والتقارير اليومية DSR',
            'المخازن وتوريدات الموردين',
            'اعتمادات الصرف والعهدة المالية',
            'تطبيق الموبايل الميداني'
        ]
    },
    ENTERPRISE: {
        key: 'ENTERPRISE',
        name: 'Enterprise Plan',
        nameAr: 'باقة الشركات (Enterprise)',
        description: 'Unlimited scale for large construction firms and developers.',
        descriptionAr: 'سعة غير محدودة لشركات التطوير العقاري والمقاولات الكبرى.',
        priceUsd: null,
        priceEgp: null,
        isCustom: true,
        contactEmail: 'nooraldeenahmed04@gmail.com',
        whatsappNumber: '+201092041908',
        billingPeriodDays: 30,
        limits: {
            maxProjects: -1, // Unlimited
            maxUsers: -1,    // Unlimited
            aiExtractionsPerMonth: 10000,
            maxStorageMb: -1, // Unlimited
            maxUploadFileMb: 50,
            allFeaturesUnlocked: true
        },
        features: [
            'Unlimited Active Projects',
            'Unlimited Team Members',
            'Custom / Dedicated AI Quota',
            'Unlimited Cloud Media Storage',
            'Max 50 MB per Upload',
            'ALL ERP Features Unlocked',
            'Bank Statement Reconciliation',
            'Audit Logging & Security',
            'Dedicated Priority SLA Support',
            'Mobile Companion App'
        ],
        featuresAr: [
            'عدد غير محدود من المشاريع',
            'عدد غير محدود من المستخدمين',
            'رصيد ذكاء اصطناعي مخصص',
            'سعة تخزين وسائط ومستندات غير محدودة',
            'الحد الأقصى للملف الواحد 50 ميجابايت',
            'جميع ميزات النظام متاحة بالكامل',
            'المطابقة والتسوية البنكية الآلية',
            'سجل التدقيق والأمان الكامل',
            'دعم فني مخصص وأولوية قصوى',
            'تطبيق الموبايل الميداني'
        ]
    }
};

// AI Token Add-On Packs (Available exclusively for Premium & Enterprise members)
export const ADD_ONS = {
    ADDON_100: {
        key: 'ADDON_100',
        name: '100 Extra AI Actions',
        nameAr: '100 عملية ذكاء اصطناعي إضافية',
        uses: 100,
        priceUsd: 3,
        priceEgp: 150,
        availablePlans: ['PREMIUM', 'ENTERPRISE']
    },
    ADDON_250: {
        key: 'ADDON_250',
        name: '250 Extra AI Actions',
        nameAr: '250 عملية ذكاء اصطناعي إضافية',
        uses: 250,
        priceUsd: 6,
        priceEgp: 300,
        availablePlans: ['PREMIUM', 'ENTERPRISE']
    },
    ADDON_500: {
        key: 'ADDON_500',
        name: '500 Extra AI Actions',
        nameAr: '500 عملية ذكاء اصطناعي إضافية',
        uses: 500,
        priceUsd: 10,
        priceEgp: 500,
        availablePlans: ['PREMIUM', 'ENTERPRISE']
    },
    ADDON_1000: {
        key: 'ADDON_1000',
        name: '1,000 Extra AI Actions',
        nameAr: '1,000 عملية ذكاء اصطناعي إضافية',
        uses: 1000,
        priceUsd: 17,
        priceEgp: 850,
        popular: true,
        availablePlans: ['PREMIUM', 'ENTERPRISE']
    },
    ADDON_2500: {
        key: 'ADDON_2500',
        name: '2,500 Extra AI Actions',
        nameAr: '2,500 عملية ذكاء اصطناعي إضافية',
        uses: 2500,
        priceUsd: 35,
        priceEgp: 1750,
        availablePlans: ['PREMIUM', 'ENTERPRISE']
    }
};

// Legacy key aliases mapping to current plans
const ALIASES = {
    FREE_PILOT: 'FREE',
    BASIC: 'PREMIUM',
    PRO: 'PREMIUM',
    BUSINESS: 'PREMIUM'
};

/** Returns whether a plan is eligible to purchase or activate add-on packs. */
export const isPlanEligibleForAddOns = (planKey) => {
    const plan = getPlan(planKey);
    return Boolean(plan && plan.key !== 'FREE');
};

/** Returns normalized plan config or default FREE if unknown. */
export const getPlan = (key) => {
    if (!key) return PLANS.FREE;
    const normalizedKey = ALIASES[key] || key;
    return PLANS[normalizedKey] || PLANS.FREE;
};

/** Returns all active subscription plans. */
export const listSelfServicePlans = () => Object.values(PLANS);

/** Returns all available Add-On packs. */
export const listAddOnPacks = () => Object.values(ADD_ONS);

/** Read the AI monthly cap for a plan key. */
export const aiCapForPlan = (planKey) => {
    const plan = getPlan(planKey);
    return plan.limits.aiExtractionsPerMonth;
};
