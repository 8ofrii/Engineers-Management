// Locale-aware money + number formatters.
// `lang === 'ar'` produces Arabic-Indic digits and the ج.م. currency abbreviation
// (`Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' })`).
// English path keeps the EGP prefix the rest of the app expects.

import { useTranslation } from 'react-i18next';

const localeFor = (lang) => (lang === 'ar' ? 'ar-EG' : 'en-EG');

export const formatCurrency = (amount, lang = 'en', opts = {}) => {
    const value = Number(amount ?? 0);
    const formatter = new Intl.NumberFormat(localeFor(lang), {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        ...opts
    });

    if (lang === 'ar') {
        return formatter.format(value);
    }

    const parts = formatter.formatToParts(value);
    const minusIndex = parts.findIndex(p => p.type === 'minusSign');
    const currencyIndex = parts.findIndex(p => p.type === 'currency');
    if (minusIndex !== -1 && currencyIndex !== -1 && minusIndex < currencyIndex) {
        const [minusPart] = parts.splice(minusIndex, 1);
        const numIndex = parts.findIndex(p => p.type === 'integer' || p.type === 'decimal');
        if (numIndex !== -1) {
            parts.splice(numIndex, 0, minusPart);
        } else {
            parts.push(minusPart);
        }
    }
    return parts.map(p => p.value).join('');
};

export const formatNumber = (amount, lang = 'en', opts = {}) => {
    const value = Number(amount ?? 0);
    return new Intl.NumberFormat(localeFor(lang), opts).format(value);
};

export const formatDate = (dateString, lang = 'en') => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
};

// Convenience hook so components don't have to thread `i18n.language` through every callsite.
export const useFormat = () => {
    const { i18n } = useTranslation();
    const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
    return {
        currency: (amount, opts) => formatCurrency(amount, lang, opts),
        number: (amount, opts) => formatNumber(amount, lang, opts),
        date: (dateString) => formatDate(dateString, lang),
        formatDate: (dateString) => formatDate(dateString, lang),
        lang
    };
};

