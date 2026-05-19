import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en';
import ar from './locales/ar';

// Initialize i18next
i18n
    .use(LanguageDetector) // Detect user language
    .use(initReactI18next) // Pass i18n instance to react-i18next
    .init({
        resources: {
            en: {
                translation: en
            },
            ar: {
                translation: ar
            }
        },

        // Default language
        lng: localStorage.getItem('language') || 'en',
        fallbackLng: 'en',

        // Namespace
        ns: ['translation'],
        defaultNS: 'translation',

        // Debug mode (disable in production)
        debug: process.env.NODE_ENV === 'development',

        // Interpolation
        interpolation: {
            escapeValue: false // React already escapes values
        },

        // Detection options
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage']
        },

        // React options
        react: {
            useSuspense: false
        }
    });

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
    localStorage.setItem('language', lng);

    // Update document direction for RTL
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
});

// Set initial direction
document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = i18n.language;

export default i18n;
