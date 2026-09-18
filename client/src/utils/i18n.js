import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from '../locales/en.json';
import arTranslations from '../locales/ar.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: enTranslations
            },
            ar: {
                translation: arTranslations
            }
        },
        fallbackLng: 'en',
        debug: false,
        interpolation: {
            escapeValue: false
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage']
        }
    });

i18n.on('languageChanged', (lng) => {
    localStorage.setItem('language', lng);
    const isAr = (lng || '').startsWith('ar');
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = isAr ? 'ar' : 'en';
});

const currentLang = i18n.language || localStorage.getItem('language') || 'ar';
const isInitialAr = currentLang.startsWith('ar');
document.documentElement.dir = isInitialAr ? 'rtl' : 'ltr';
document.documentElement.lang = isInitialAr ? 'ar' : 'en';

export default i18n;
