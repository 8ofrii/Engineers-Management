// Locale-aware money + number formatters for the mobile app. Same contract
// as client/src/utils/format.js — Arabic-Indic digits + ج.م. when language
// is Arabic, en-EG otherwise.

import { useTranslation } from 'react-i18next';

const localeFor = (lang) => (lang === 'ar' ? 'ar-EG' : 'en-EG');

export const formatCurrency = (amount, lang = 'en', opts = {}) => {
    const value = Number(amount ?? 0);
    return new Intl.NumberFormat(localeFor(lang), {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        ...opts
    }).format(value);
};

export const formatNumber = (amount, lang = 'en', opts = {}) => {
    const value = Number(amount ?? 0);
    return new Intl.NumberFormat(localeFor(lang), opts).format(value);
};

export const useFormat = () => {
    const { i18n } = useTranslation();
    const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
    return {
        currency: (amount, opts) => formatCurrency(amount, lang, opts),
        number: (amount, opts) => formatNumber(amount, lang, opts),
        lang
    };
};
