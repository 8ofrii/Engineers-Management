// Official Subscription Plan Catalog for Hesaby ERP (2026 Q3)
// Uncapped features for all paid tiers — differentiated solely by capacity and AI quotas.

export const PLANS = {
    FREE: {
        key: 'FREE',
        name: 'Free Plan',
        nameAr: 'الباقة المجانية',
        description: 'Ideal for testing workflows on up to 2 active projects.',
        descriptionAr: 'مثالية لتجربة النظام على مشروعين نشطين.',
        priceUsd: 0,
        priceEgp: 0,
        billingPeriodDays: 30,
        limits: {
            maxProjects: 2,
            maxUsers: 2,
            aiExtractionsPerMonth: 15,
            allFeaturesUnlocked: false
        },
        features: [
            'Up to 2 Active Projects',
            '2 Team Members',
            '15 AI Agent Actions / month',
            'Core Expenses & Safe Balance',
            'Mobile Companion App'
        ],
        featuresAr: [
            'حتى مشروعين نشطين',
            'عضوان في فريق العمل',
            '15 عملية ذكاء اصطناعي شهرياً',
            'تسجيل المصروفات وحسابات العهدة',
            'تطبيق الموبايل الميداني'
        ]
    },
    PREMIUM: {
        key: 'PREMIUM',
        name: 'Premium Plan',
        nameAr: 'الباقة المميزة (Premium)',
        description: 'For small contracting firms and active site teams.',
        descriptionAr: 'لمكاتب وشركات المقاولات الصغيرة وفرق المواقع.',
        priceUsd: 49,
        priceEgp: 2450,
        billingPeriodDays: 30,
        popular: true,
        limits: {
            maxProjects: 10,
            maxUsers: 6,
            aiExtractionsPerMonth: 2500,
            allFeaturesUnlocked: true
        },
        features: [
            'Up to 10 Active Projects',
            'Up to 6 Team Members',
            '2,500 AI Agent Actions / month',
            'ALL ERP Features Unlocked',
            'Workforce Wages & DSR Reports',
            'Inventory & Supplier Batches',
            'Multi-Level Approvals & Custody',
            'Mobile Companion App'
        ],
        featuresAr: [
            'حتى 10 مشاريع نشطة',
            'حتى 6 مستخدمين في الفريق',
            '2,500 عملية ذكاء اصطناعي شهرياً',
            'جميع ميزات النظام متاحة بالكامل',
            'يوميات العمالة والتقارير اليومية DSR',
            'المخازن وتوريدات الموردين',
            'اعتمادات الصرف والعهدة المالية',
            'تطبيق الموبايل الميداني'
        ]
    },
    BUSINESS: {
        key: 'BUSINESS',
        name: 'Business Plan',
        nameAr: 'باقة الأعمال (Business)',
        description: 'For mid-sized general contractors and multi-project teams.',
        descriptionAr: 'لشركات المقاولات المتوسطة وإدارة عدة مواقع متزامنة.',
        priceUsd: 89,
        priceEgp: 4450,
        billingPeriodDays: 30,
        limits: {
            maxProjects: 20,
            maxUsers: 12,
            aiExtractionsPerMonth: 6000,
            allFeaturesUnlocked: true
        },
        features: [
            'Up to 20 Active Projects',
            'Up to 12 Team Members',
            '6,000 AI Agent Actions / month',
            'ALL ERP Features Unlocked',
            'Multi-Site Safe Wallets',
            'Cost Center Analytics',
            'Custom PDF Branding',
            'Mobile Companion App'
        ],
        featuresAr: [
            'حتى 20 مشروعاً نشطاً',
            'حتى 12 مستخدماً في الفريق',
            '6,000 عملية ذكاء اصطناعي شهرياً',
            'جميع ميزات النظام متاحة بالكامل',
            'خزائن وحسابات عهدة متعددة',
            'مراكز التكلفة والتحليلات المالية',
            'تخصيص شعار وهوية تقارير PDF',
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
            allFeaturesUnlocked: true
        },
        features: [
            'Unlimited Active Projects',
            'Unlimited Team Members',
            'Custom / Dedicated AI Quota',
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
            'جميع ميزات النظام متاحة بالكامل',
            'المطابقة والتسوية البنكية الآلية',
            'سجل التدقيق والأمان الكامل',
            'دعم فني مخصص وأولوية قصوى',
            'تطبيق الموبايل الميداني'
        ]
    }
};

// AI Token Add-On Packs (Available for Paid Subscribers with Volume Discounting)
export const ADD_ONS = {
    ADDON_100: {
        key: 'ADDON_100',
        name: '100 Extra AI Actions',
        nameAr: '100 عملية ذكاء اصطناعي إضافية',
        uses: 100,
        priceUsd: 3,
        priceEgp: 150
    },
    ADDON_250: {
        key: 'ADDON_250',
        name: '250 Extra AI Actions',
        nameAr: '250 عملية ذكاء اصطناعي إضافية',
        uses: 250,
        priceUsd: 6,
        priceEgp: 300
    },
    ADDON_500: {
        key: 'ADDON_500',
        name: '500 Extra AI Actions',
        nameAr: '500 عملية ذكاء اصطناعي إضافية',
        uses: 500,
        priceUsd: 10,
        priceEgp: 500
    },
    ADDON_1000: {
        key: 'ADDON_1000',
        name: '1,000 Extra AI Actions',
        nameAr: '1,000 عملية ذكاء اصطناعي إضافية',
        uses: 1000,
        priceUsd: 17,
        priceEgp: 850,
        popular: true
    },
    ADDON_2500: {
        key: 'ADDON_2500',
        name: '2,500 Extra AI Actions',
        nameAr: '2,500 عملية ذكاء اصطناعي إضافية',
        uses: 2500,
        priceUsd: 35,
        priceEgp: 1750
    }
};

// Legacy key aliases mapping to current plans
const ALIASES = {
    FREE_PILOT: 'FREE',
    BASIC: 'PREMIUM',
    PRO: 'BUSINESS'
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
