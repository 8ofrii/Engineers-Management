// Arabic Translations for V1.2
export const ar = {
    // Transaction Modal
    transaction: {
        title: 'إضافة معاملة جديدة',
        editTitle: 'تعديل المعاملة',
        type: 'نوع المعاملة',
        income: 'دخل',
        expense: 'مصروف',
        category: 'الفئة',
        amount: 'المبلغ (جنيه)',
        date: 'تاريخ ووقت المعاملة',
        costItem: 'بند التكلفة / أمر العمل',
        noLink: 'بدون ربط',
        newCostItem: 'جديد',
        description: 'الوصف',
        paymentMethod: 'طريقة الدفع',
        cash: 'نقدي',
        bankTransfer: 'تحويل بنكي',
        check: 'شيك',
        creditCard: 'بطاقة ائتمان',
        invoiceNumber: 'رقم الفاتورة',
        paidBy: 'الدافع',
        inventoryPurchase: 'شراء مخزون (تأجيل الربح)',
        inventoryAlert: 'سيتم إنشاء دفعة مخزون. الربح سيتم احتسابه عند الاستخدام.',
        cancel: 'إلغاء',
        save: 'حفظ',
        saving: 'جاري الحفظ...',

        // Validation
        typeRequired: 'النوع مطلوب',
        categoryRequired: 'الفئة مطلوبة',
        amountRequired: 'المبلغ يجب أن يكون أكبر من صفر',
        descriptionRequired: 'الوصف مطلوب'
    },

    // Cost Item Modal
    costItem: {
        title: 'إضافة بند تكلفة جديد',
        editTitle: 'تعديل بند التكلفة',
        name: 'اسم البند / أمر العمل',
        namePlaceholder: 'مثال: تركيب سيراميك الطابق الأرضي',
        quantity: 'الكمية الإجمالية',
        unit: 'وحدة القياس',
        unitPlaceholder: 'م², كيس، متر، إلخ',
        unitPrice: 'سعر الوحدة (جنيه)',
        estimatedTotal: 'الإجمالي المقدر (جنيه)',
        optional: 'اختياري',
        autoCalculated: 'يحسب تلقائياً',
        infoMessage: 'بند التكلفة يساعد في تتبع التقدم والمصروفات لأعمال محددة في المشروع.',
        cancel: 'إلغاء',
        save: 'حفظ',
        saving: 'جاري الحفظ...',

        // Validation
        nameRequired: 'اسم البند مطلوب'
    },

    // Inventory Usage Modal
    inventory: {
        title: 'تسجيل استهلاك مخزون',
        batch: 'دفعة المخزون',
        noBatches: 'لا توجد دفعات متاحة',
        batchInfo: 'معلومات الدفعة',
        initialValue: 'القيمة الأولية',
        remaining: 'المتبقي',
        valueConsumed: 'القيمة المستهلكة (جنيه)',
        profitPreview: 'معاينة الربح',
        managementFee: 'نسبة الإدارة',
        profitRecognized: 'الربح المحقق',
        remainingAfter: 'المتبقي بعد الاستهلاك',
        description: 'الوصف / الغرض من الاستخدام',
        descriptionPlaceholder: 'مثال: استخدام الأسمنت لأعمال الأساسات',
        cancel: 'إلغاء',
        record: 'تسجيل الاستهلاك',
        recording: 'جاري التسجيل...',

        // Validation
        batchRequired: 'يجب اختيار دفعة مخزون',
        valueRequired: 'القيمة المستهلكة يجب أن تكون أكبر من صفر',
        valueExceeds: 'القيمة تتجاوز المتاح',
        descriptionRequired: 'الوصف مطلوب'
    },

    // Categories
    categories: {
        materials: 'خامات',
        labor: 'مصنعية',
        services: 'أخرى'
    },

    // Common
    common: {
        egp: 'جنيه',
        close: 'إغلاق',
        submit: 'إرسال',
        delete: 'حذف',
        edit: 'تعديل',
        view: 'عرض',
        search: 'بحث',
        filter: 'تصفية',
        export: 'تصدير',
        import: 'استيراد',
        refresh: 'تحديث',
        loading: 'جاري التحميل...',
        noData: 'لا توجد بيانات',
        now: 'الآن',
        error: 'حدث خطأ',
        success: 'نجح',
        confirm: 'تأكيد',
        yes: 'نعم',
        no: 'لا'
    }
};

export default ar;
