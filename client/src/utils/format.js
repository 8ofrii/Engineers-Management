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

// Clean bloated quantity/unit tags (e.g. " | 0 TON @ 0" or " | 35 TON @ 1000") so descriptions reflect user text
export const cleanTransactionDescription = (desc) => {
    if (!desc || typeof desc !== 'string') return '';
    
    // 1. Strip trailing "| Qty Unit @ Price" e.g. " | 0 TON @ 0", " | 35 TON @ 1000"
    let cleaned = desc.replace(/\s*\|\s*[\d.]+\s*[A-Za-z\u0600-\u06FF]*\s*@\s*[\d.]+(?:\s*EGP)?\s*$/gi, '');
    
    // 2. Strip leading "Qty Unit @ Price | " e.g. "0 TON @ 0 | "
    cleaned = cleaned.replace(/^[\d.]+\s*[A-Za-z\u0600-\u06FF]*\s*@\s*[\d.]+(?:\s*EGP)?\s*\|\s*/gi, '');
    
    // 3. Strip any standalone "0 TON @ 0" or "(+0 TON @ 0)"
    cleaned = cleaned.replace(/\(?\s*0\s+TON\s+@\s+0\s*\)?/gi, '');
    
    // 4. Clean any residual dangling pipes or extra whitespace
    cleaned = cleaned.replace(/\s*\|\s*$/, '').trim();
    
    return cleaned;
};

const HAS_ARABIC_REGEX = /[\u0600-\u06FF]/;
const HAS_LATIN_REGEX = /[A-Za-z]/;

// Bilingual helper for entity names (Workman, Client, Supplier, Project, Material, User, etc.)
// When in Arabic UI: prioritizes Arabic script name, falls back to English.
// When in English UI: prioritizes English/Latin script name, falls back to Arabic.
export const getLocalizedName = (entity, langOrIsArabic = 'en') => {
    if (!entity) return '';
    if (typeof entity === 'string') return entity;
    const isArabic = typeof langOrIsArabic === 'boolean'
        ? langOrIsArabic
        : (typeof langOrIsArabic === 'string' && langOrIsArabic.startsWith('ar'));

    const val1 = (entity.nameAr && typeof entity.nameAr === 'string') ? entity.nameAr.trim() : (entity.descriptionAr && typeof entity.descriptionAr === 'string' ? entity.descriptionAr.trim() : '');
    const val2 = (entity.name && typeof entity.name === 'string') ? entity.name.trim() : (entity.description && typeof entity.description === 'string' ? entity.description.trim() : '');

    const val1IsArabic = HAS_ARABIC_REGEX.test(val1);
    const val2IsArabic = HAS_ARABIC_REGEX.test(val2);
    const val1IsLatin = HAS_LATIN_REGEX.test(val1);
    const val2IsLatin = HAS_LATIN_REGEX.test(val2);

    if (isArabic) {
        // Arabic primary requested: prefer string with Arabic letters
        if (val1IsArabic) return val1;
        if (val2IsArabic) return val2;
        return val1 || val2 || '';
    } else {
        // English primary requested: prefer string with Latin letters
        if (val2IsLatin) return val2;
        if (val1IsLatin) return val1;
        return val2 || val1 || '';
    }
};

// Returns the secondary / subtitle name in the alternate language, or null if no distinct alternate name exists.
// When in Arabic UI: returns English version underneath (if distinct from Arabic primary).
// When in English UI: returns Arabic version underneath (if distinct from English primary).
export const getLocalizedSubName = (entity, langOrIsArabic = 'en') => {
    if (!entity || typeof entity === 'string') return null;
    const isArabic = typeof langOrIsArabic === 'boolean'
        ? langOrIsArabic
        : (typeof langOrIsArabic === 'string' && langOrIsArabic.startsWith('ar'));

    const val1 = (entity.nameAr && typeof entity.nameAr === 'string') ? entity.nameAr.trim() : (entity.descriptionAr && typeof entity.descriptionAr === 'string' ? entity.descriptionAr.trim() : '');
    const val2 = (entity.name && typeof entity.name === 'string') ? entity.name.trim() : (entity.description && typeof entity.description === 'string' ? entity.description.trim() : '');

    if (!val1 && !val2) return null;
    if (val1 && val2 && val1.toLowerCase() === val2.toLowerCase()) return null;

    const primaryName = getLocalizedName(entity, isArabic);

    if (isArabic) {
        // We want English subtitle underneath
        if (val2 && HAS_LATIN_REGEX.test(val2) && val2 !== primaryName) return val2;
        if (val1 && HAS_LATIN_REGEX.test(val1) && val1 !== primaryName) return val1;
        // If neither has latin letters, only show if distinct from primary
        if (val2 && val2 !== primaryName) return val2;
        if (val1 && val1 !== primaryName) return val1;
        return null;
    } else {
        // We want Arabic subtitle underneath
        if (val1 && HAS_ARABIC_REGEX.test(val1) && val1 !== primaryName) return val1;
        if (val2 && HAS_ARABIC_REGEX.test(val2) && val2 !== primaryName) return val2;
        // If neither has arabic letters, only show if distinct from primary
        if (val1 && val1 !== primaryName) return val1;
        if (val2 && val2 !== primaryName) return val2;
        return null;
    }
};

// Convenience hook so components don't have to thread `i18n.language` through every callsite.
export const useFormat = () => {
    const { i18n } = useTranslation();
    const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
    const isArabic = lang === 'ar';
    return {
        currency: (amount, opts) => formatCurrency(amount, lang, opts),
        number: (amount, opts) => formatNumber(amount, lang, opts),
        date: (dateString) => formatDate(dateString, lang),
        formatDate: (dateString) => formatDate(dateString, lang),
        name: (entity) => getLocalizedName(entity, isArabic),
        getLocalizedName: (entity) => getLocalizedName(entity, isArabic),
        subName: (entity) => getLocalizedSubName(entity, isArabic),
        getLocalizedSubName: (entity) => getLocalizedSubName(entity, isArabic),
        lang,
        isArabic
    };
};

