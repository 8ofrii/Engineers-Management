import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import ar from '../locales/ar.json';

const RTL_LOCALES = ['ar', 'he', 'fa', 'ur'];

const detectInitialLanguage = async () => {
    const stored = await AsyncStorage.getItem('language');
    if (stored) return stored;
    const device = Localization.getLocales()[0]?.languageCode || 'en';
    return RTL_LOCALES.includes(device) ? 'ar' : 'en';
};

export const initI18n = async () => {
    const lng = await detectInitialLanguage();
    await i18n.use(initReactI18next).init({
        compatibilityJSON: 'v3',
        resources: { en: { translation: en }, ar: { translation: ar } },
        lng,
        fallbackLng: 'en',
        interpolation: { escapeValue: false }
    });
    syncRTL(lng);
    return i18n;
};

// React Native locks layout direction at app startup. Toggling RTL after
// initial render requires a full reload (Updates.reloadAsync in dev or relaunch
// in prod). We set the flags here so the next launch picks the right direction.
export const syncRTL = (lng) => {
    const shouldRTL = RTL_LOCALES.includes(lng);
    I18nManager.allowRTL(shouldRTL);
    if (I18nManager.isRTL !== shouldRTL) {
        I18nManager.forceRTL(shouldRTL);
    }
};

export const setLanguage = async (lng) => {
    await AsyncStorage.setItem('language', lng);
    await i18n.changeLanguage(lng);
    syncRTL(lng);
};

export default i18n;
