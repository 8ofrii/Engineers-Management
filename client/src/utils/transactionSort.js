/**
 * Transaction sorting utility for Hesaby ERP.
 * Supports multi-column sorting across all table subheaders (date, type, category,
 * description, payer, payment method, amount, status, project, createdBy),
 * respecting locale and maintaining newest-date secondary tie-breaker.
 */

export const getDateVal = (tx) => {
    const raw = tx.transactionDate || tx.createdAt;
    if (!raw) return 0;
    const time = new Date(raw).getTime();
    return isNaN(time) ? 0 : time;
};

export const getTypeVal = (tx, isArabic = false) => {
    if (tx.category === 'MANAGEMENT_FEE_TRANSFER') return isArabic ? 'أرباح مكتب' : 'PROFIT';
    if (tx.type === 'INCOME') return isArabic ? 'إيراد' : 'INCOME';
    return isArabic ? 'مصروف' : 'EXPENSE';
};

export const getCategoryVal = (tx, t = null) => {
    if (tx.category === 'OTHER' && tx.description && (tx.description.startsWith('Other - ') || tx.description.startsWith('أخرى - '))) {
        return tx.description.split(':')[0].trim();
    }
    if (typeof t === 'function' && tx.category) {
        const key = `finance.categories.${tx.category.toLowerCase()}`;
        const val = t(key);
        if (val && val !== key && !val.startsWith('finance.')) {
            return val.trim();
        }
    }
    return (tx.category || '').trim();
};

export const getDescVal = (tx) => (tx.description || '').trim();

export const getPayerVal = (tx) => {
    if (tx.type === 'INCOME') {
        const clientName = tx.client?.name || tx.project?.client?.name || '';
        const payerRep = tx.paidByClientContact || (tx.transactionFrom && tx.transactionFrom !== clientName ? tx.transactionFrom : '');
        return (clientName || payerRep || '').trim();
    } else {
        const payer = tx.payer?.name || tx.user?.name || '';
        const beneficiary = tx.beneficiary || tx.supplier?.name || tx.workman?.name || '';
        const recipient = tx.transactionTo || '';
        return (payer || beneficiary || recipient || '').trim();
    }
};

export const getMethodVal = (tx, t = null, isArabic = false) => {
    const translate = (key, fallbackEn, fallbackAr) => {
        if (typeof t === 'function') {
            const val = t(key);
            if (val && val !== key && !val.startsWith('finance.')) {
                return val;
            }
        }
        return isArabic ? fallbackAr : fallbackEn;
    };

    switch (tx.paymentMethod) {
        case 'BANK_TRANSFER':
            return translate('finance.methods.bankTransfer', 'Bank Transfer', 'تحويل بنكي / إنستاباي');
        case 'CASH':
            return translate('finance.methods.cash', 'Cash', 'نقداً (كاش)');
        case 'CHECK':
            return translate('finance.methods.check', 'Check', 'شيك');
        case 'CREDIT_CARD':
            return translate('finance.methods.creditCard', 'Credit Card', 'بطاقة ائتمان');
        case 'CUSTODY_WALLET':
            return translate('finance.methods.custodyWallet', 'Custody Wallet', 'عهدة مهندس');
        default:
            return tx.paymentMethod || '';
    }
};

export const getAmountVal = (tx) => {
    const n = Number(tx.amount);
    return isNaN(n) ? 0 : n;
};

export const getStatusVal = (tx, t = null, isArabic = false) => {
    if (typeof t === 'function') {
        const key = `finance.status.${tx.status}`;
        const val = t(key);
        if (val && val !== key && !val.startsWith('finance.')) {
            return val.trim();
        }
    }
    if (tx.status === 'CANCELLED') return isArabic ? 'مسترد' : 'Refunded';
    if (tx.status === 'APPROVED') return isArabic ? 'معتمد' : 'Approved';
    if (tx.status === 'PENDING_APPROVAL') return isArabic ? 'معلق' : 'Pending Approval';
    return (tx.status || '').trim();
};

/**
 * Sorts an array of transactions by any subheader field.
 * Default field is 'date', default order is 'desc' (newest first).
 */
export const sortTransactionList = (list, field = 'date', order = 'desc', { isArabic = false, t = null } = {}) => {
    if (!Array.isArray(list) || list.length <= 1) return list || [];

    const locale = isArabic ? 'ar' : 'en';

    return [...list].sort((a, b) => {
        let diff = 0;
        switch (field) {
            case 'date': {
                diff = getDateVal(a) - getDateVal(b);
                break;
            }
            case 'type': {
                diff = getTypeVal(a, isArabic).localeCompare(getTypeVal(b, isArabic), locale, { numeric: true, sensitivity: 'base' });
                break;
            }
            case 'category': {
                diff = getCategoryVal(a, t).localeCompare(getCategoryVal(b, t), locale, { numeric: true, sensitivity: 'base' });
                break;
            }
            case 'description': {
                diff = getDescVal(a).localeCompare(getDescVal(b), locale, { numeric: true, sensitivity: 'base' });
                break;
            }
            case 'payer': {
                diff = getPayerVal(a).localeCompare(getPayerVal(b), locale, { numeric: true, sensitivity: 'base' });
                break;
            }
            case 'paymentMethod': {
                diff = getMethodVal(a, t, isArabic).localeCompare(getMethodVal(b, t, isArabic), locale, { numeric: true, sensitivity: 'base' });
                break;
            }
            case 'amount': {
                diff = getAmountVal(a) - getAmountVal(b);
                break;
            }
            case 'status': {
                diff = getStatusVal(a, t, isArabic).localeCompare(getStatusVal(b, t, isArabic), locale, { numeric: true, sensitivity: 'base' });
                break;
            }
            case 'project': {
                const prjA = (a.project?.name || (a.isOfficeExpense || !a.projectId ? (isArabic ? 'مصروفات المقر' : 'Office & HQ') : '')).trim();
                const prjB = (b.project?.name || (b.isOfficeExpense || !b.projectId ? (isArabic ? 'مصروفات المقر' : 'Office & HQ') : '')).trim();
                diff = prjA.localeCompare(prjB, locale, { numeric: true, sensitivity: 'base' });
                break;
            }
            case 'createdBy': {
                const crA = (a.creator?.name || '').trim();
                const crB = (b.creator?.name || '').trim();
                diff = crA.localeCompare(crB, locale, { numeric: true, sensitivity: 'base' });
                break;
            }
            default:
                diff = 0;
        }

        if (diff !== 0) {
            return order === 'desc' ? -diff : diff;
        }

        // Stable secondary tie-breaker: always newest date first
        return getDateVal(b) - getDateVal(a);
    });
};
