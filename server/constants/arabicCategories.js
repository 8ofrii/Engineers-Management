/**
 * Arabic Transaction Categories Configuration
 * V1.2 - Client-Provided Categories
 * 
 * These are the exact Arabic terms provided by the client.
 * DO NOT translate or modify these strings.
 */

export const ARABIC_CATEGORIES = [
    // Materials & Labor - Mixed as per client requirement
    { key: 'CONCRETE', ar: 'خرسانات', en: 'Concrete', group: 'MATERIALS' },
    { key: 'SITE_CLEANING', ar: 'نظافة', en: 'Site Cleaning', group: 'SERVICES' },
    { key: 'STOCKING', ar: 'تشوين', en: 'Stocking/Material Handling', group: 'SERVICES' },
    { key: 'CEMENT', ar: 'اسمنت', en: 'Cement', group: 'MATERIALS' },
    { key: 'SAND', ar: 'رمل', en: 'Sand', group: 'MATERIALS' },
    { key: 'BRICKS', ar: 'طوب', en: 'Bricks', group: 'MATERIALS' },
    { key: 'GENERAL_LABOR', ar: 'مصنعية عمالة', en: 'General Labor', group: 'LABOR' },
    { key: 'MASONRY_LABOR', ar: 'مصنعية بناء', en: 'Masonry Labor', group: 'LABOR' },
    { key: 'PLASTERING_MATERIALS', ar: 'خامات محارة', en: 'Plastering Materials', group: 'MATERIALS' },
    { key: 'PLASTERING_LABOR', ar: 'مصنعية محارة', en: 'Plastering Labor', group: 'LABOR' },
    { key: 'PLUMBING_MATERIALS', ar: 'خامات سباكة', en: 'Plumbing Materials', group: 'MATERIALS' },
    { key: 'PLUMBING_LABOR', ar: 'مصنعية سباكة', en: 'Plumbing Labor', group: 'LABOR' },
    { key: 'ELECTRICAL_MATERIALS', ar: 'خامات كهرباء', en: 'Electrical Materials', group: 'MATERIALS' },
    { key: 'ELECTRICAL_LABOR', ar: 'مصنعية كهرباء', en: 'Electrical Labor', group: 'LABOR' },
    { key: 'CERAMIC_MATERIALS', ar: 'خامات سيراميك', en: 'Ceramic Materials', group: 'MATERIALS' },
    { key: 'CERAMIC_LABOR', ar: 'مصنعية سيراميك', en: 'Ceramic Labor', group: 'LABOR' },
    { key: 'PAINTING_MATERIALS', ar: 'خامات دهانات', en: 'Painting Materials', group: 'MATERIALS' },
    { key: 'PAINTING_LABOR', ar: 'مصنعية دهانات', en: 'Painting Labor', group: 'LABOR' },
    { key: 'GYPSUM_MATERIALS', ar: 'خامات جبس بورد', en: 'Gypsum Materials', group: 'MATERIALS' },
    { key: 'GYPSUM_LABOR', ar: 'مصنعية جبس بورد', en: 'Gypsum Labor', group: 'LABOR' },
    { key: 'CARPENTRY_MATERIALS', ar: 'خامات نجارة', en: 'Carpentry Materials', group: 'MATERIALS' },
    { key: 'CARPENTRY_LABOR', ar: 'مصنعية نجارة', en: 'Carpentry Labor', group: 'LABOR' },
    { key: 'DECOR', ar: 'ديكور', en: 'Decor', group: 'SERVICES' },
    { key: 'DRAWINGS', ar: 'رسومات', en: 'Drawings/Designs', group: 'SERVICES' },
    { key: 'TIPS', ar: 'اكراميات', en: 'Tips/Bonuses', group: 'SERVICES' },
    { key: 'TRANSPORT', ar: 'نقل', en: 'Transport', group: 'SERVICES' },
    { key: 'INSULATION_LABOR', ar: 'مصنعية عزل', en: 'Insulation Labor', group: 'LABOR' },
    { key: 'BLACKSMITH_LABOR', ar: 'مصنعية حداد', en: 'Blacksmith/Steel Fixer Labor', group: 'LABOR' },
    { key: 'HVAC_PREP', ar: 'تاسيس تكيف', en: 'HVAC Prep', group: 'MATERIALS' },
    { key: 'ALUMETAL', ar: 'الوميتال', en: 'Alumetal', group: 'MATERIALS' },
    { key: 'EQUIPMENT', ar: 'معدات', en: 'Equipment', group: 'SERVICES' },

    // Contracting (مقاولات)
    { key: 'CONTRACTING_CONCRETE', ar: 'مقاولة خرسانات', en: 'Concrete Subcontracting', group: 'CONTRACTING' },
    { key: 'CONTRACTING_STOCKING', ar: 'مقاولة تشوين', en: 'Stocking Subcontracting', group: 'CONTRACTING' },
    { key: 'CONTRACTING_DEMOLITION', ar: 'مقاولة هدم', en: 'Demolition Subcontracting', group: 'CONTRACTING' },
    { key: 'CONTRACTING_MARBLE', ar: 'مقاولة رخام', en: 'Marble Subcontracting', group: 'CONTRACTING' },
    { key: 'CONTRACTING_POOL', ar: 'مقاولة حمام سباحة', en: 'Swimming Pool Subcontracting', group: 'CONTRACTING' },
    { key: 'CONTRACTING_LANDSCAPE', ar: 'مقاولة Landscape', en: 'Landscape Subcontracting', group: 'CONTRACTING' },

    // General & Office Expenses (مصروفات المقر ومصروفات عامة)
    { key: 'OFFICE_RENT', ar: 'إيجار المقر / المكتب', en: 'Office Rent', group: 'OFFICE' },
    { key: 'OFFICE_ELECTRICITY', ar: 'فاتورة الكهرباء', en: 'Electricity Bill', group: 'OFFICE' },
    { key: 'OFFICE_WATER', ar: 'فاتورة المياه', en: 'Water Bill', group: 'OFFICE' },
    { key: 'OFFICE_INTERNET', ar: 'الإنترنت والاتصالات', en: 'Internet & Wi-Fi', group: 'OFFICE' },
    { key: 'OFFICE_PHONE', ar: 'فواتير الهواتف المحمولة', en: 'Mobile & Telephone Bills', group: 'OFFICE' },
    { key: 'OFFICE_BUFFET', ar: 'بوفيه وضيافة ومشروبات', en: 'Buffet & Hospitality', group: 'OFFICE' },
    { key: 'OFFICE_STATIONERY', ar: 'أدوات مكتبية ومستلزمات ورقية', en: 'Office Stationery & Supplies', group: 'OFFICE' },
    { key: 'OFFICE_PRINTING', ar: 'طباعة ورسومات ومخططات', en: 'Printing & Plotting', group: 'OFFICE' },
    { key: 'OFFICE_CLEANING', ar: 'نظافة ومطهرات ومستلزمات', en: 'Cleaning & Janitorial', group: 'OFFICE' },
    { key: 'OFFICE_MAINTENANCE', ar: 'صيانة المقر والتكييفات والأجهزة', en: 'Office & AC Maintenance', group: 'OFFICE' },
    { key: 'OFFICE_SOFTWARE', ar: 'اشتراكات البرامج والسحابة', en: 'Software & Subscriptions', group: 'OFFICE' },
    { key: 'OFFICE_MARKETING', ar: 'تسويق وإعلانات ودعاية', en: 'Marketing & Advertising', group: 'OFFICE' },
    { key: 'OFFICE_LEGAL_ACCOUNTING', ar: 'استشارات قانونية ومحاسبية ومراجعة', en: 'Legal & Accounting Fees', group: 'OFFICE' },
    { key: 'OFFICE_GOVERNMENT_FEES', ar: 'رسوم حكومية ورخص وضرائب وتأمينات', en: 'Government, Taxes & Licenses', group: 'OFFICE' },
    { key: 'OFFICE_TRANSPORT', ar: 'انتقالات ومواصلات وبنزين للإدارة', en: 'HQ Transportation & Fuel', group: 'OFFICE' },
    { key: 'OFFICE_POSTAL', ar: 'شحن سريع وطرد وبريد', en: 'Courier & Postal Services', group: 'OFFICE' },
    { key: 'OFFICE_FURNITURE', ar: 'أثاث وتجهيزات مكتبية', en: 'Furniture & Fixtures', group: 'OFFICE' },
    { key: 'OFFICE_IT_HARDWARE', ar: 'أجهزة كمبيوتر ومعدات IT وشاشات', en: 'IT Hardware & Computers', group: 'OFFICE' },
    { key: 'OFFICE_STAFF_WELFARE', ar: 'إكراميات ورعاية وضيافة موظفين', en: 'Staff Welfare & Medical', group: 'OFFICE' },
    { key: 'OFFICE_BONUSES', ar: 'مكافآت وحوافز إدارية', en: 'Administrative Bonuses', group: 'OFFICE' },
    { key: 'OFFICE_BANK_FEES', ar: 'مصاريف بنكية وعمولات', en: 'Bank Fees & Service Charges', group: 'OFFICE' },
    { key: 'OFFICE_HOSPITALITY', ar: 'استضافة واجتماعات عملاء ومناسبات', en: 'Client Meetings & Hospitality', group: 'OFFICE' },
    { key: 'OFFICE_SERVICES', ar: 'خدمات متفرقة وصيانة طارئة', en: 'One-time & Miscellaneous Services', group: 'OFFICE' },
    { key: 'OFFICE_EXPENSES', ar: 'مصروفات إدارية عامة', en: 'General Office Expenses', group: 'OFFICE' },
    { key: 'OTHER', ar: 'أخرى / متنوع', en: 'Other / General', group: 'OFFICE' }
];

/**
 * Get all categories as a flat array for dropdowns
 * @returns {Array} Array of category objects with { key, ar, en, group }
 */
export const getAllCategories = () => {
    return ARABIC_CATEGORIES;
};

/**
 * Get categories grouped by type
 * @returns {Object} Object with groups as keys
 */
export const getCategoriesByGroup = () => {
    const grouped = {
        OFFICE: [],
        MATERIALS: [],
        LABOR: [],
        CONTRACTING: [],
        SERVICES: []
    };

    ARABIC_CATEGORIES.forEach(category => {
        if (grouped[category.group]) {
            grouped[category.group].push(category);
        }
    });

    return grouped;
};

/**
 * Find category by key
 * @param {string} key - The category key to search for
 * @returns {Object|null} Category object or null
 */
export const findCategoryByKey = (key) => {
    return ARABIC_CATEGORIES.find(cat => cat.key === key) || null;
};

/**
 * Find category by Arabic name
 * @param {string} arabicName - The Arabic name to search for
 * @returns {Object|null} Category object or null
 */
export const findCategoryByArabic = (arabicName) => {
    return ARABIC_CATEGORIES.find(cat => cat.ar === arabicName) || null;
};

/**
 * Get category display name based on language
 * @param {string} key - Category key
 * @param {string} language - 'ar' or 'en'
 * @returns {string} Display name
 */
export const getCategoryName = (key, language = 'ar') => {
    const category = findCategoryByKey(key);
    if (!category) return key;
    return language === 'ar' ? category.ar : category.en;
};

export default ARABIC_CATEGORIES;
