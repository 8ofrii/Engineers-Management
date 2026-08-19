import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const THEMES = {
    'monochrome': {
        id: 'monochrome',
        name: 'Monochrome Grey',
        nameAr: 'الرمادي الهادئ',
        desc: 'Neutral charcoal & off-white (Web Match)',
        descAr: 'رمادي فحمي هادئ مطابق للموقع',
        dot: '#a3a3a3',
        bg: '#141414',
        card: '#1c1c1c',
        cardAlt: '#262626',
        cardHover: '#303030',
        border: '#2b2b2b',
        borderStrong: '#404040',
        text: '#fafafa',
        textMuted: '#e4e4e7',
        subtext: '#a3a3a3',
        primary: '#fafafa',
        primaryLight: 'rgba(250, 250, 250, 0.12)',
        success: '#22c55e',
        successLight: 'rgba(34, 197, 94, 0.15)',
        danger: '#ef4444',
        dangerLight: 'rgba(239, 68, 68, 0.15)',
        warning: '#eab308',
        warningLight: 'rgba(234, 179, 8, 0.15)',
        tabBar: '#181818',
        tabBorder: '#2b2b2b',
        inputBg: '#141414',
        inputBorder: '#2b2b2b',
        statusBarStyle: 'light',
        isDark: true
    },
    'obsidian-emerald': {
        id: 'obsidian-emerald',
        name: 'Obsidian & Emerald',
        nameAr: 'الزمرد والأسود',
        desc: 'Onyx black & mint accent',
        descAr: 'الأسود الفاحم ولمسات زمردية',
        dot: '#10b981',
        bg: '#0a0a0c',
        card: '#121215',
        cardAlt: '#1a1a20',
        cardHover: '#22222a',
        border: '#22222c',
        borderStrong: '#2e2e3a',
        text: '#f8fafc',
        textMuted: '#ffffff',
        subtext: '#94a3b8',
        primary: '#10b981',
        primaryLight: 'rgba(16, 185, 129, 0.15)',
        success: '#10b981',
        successLight: 'rgba(16, 185, 129, 0.15)',
        danger: '#ef4444',
        dangerLight: 'rgba(239, 68, 68, 0.15)',
        warning: '#f59e0b',
        warningLight: 'rgba(245, 158, 11, 0.15)',
        tabBar: '#121215',
        tabBorder: '#22222c',
        inputBg: '#0a0a0c',
        inputBorder: '#22222c',
        statusBarStyle: 'light',
        isDark: true
    },
    'glass-dark': {
        id: 'glass-dark',
        name: 'Dark Glassmorphism',
        nameAr: 'الزجاج المصنفر الداكن',
        desc: 'Frosted crystal glass & neon cyan',
        descAr: 'تأثير الزجاج الداكن ولمسات نيون زرقاء',
        dot: '#38bdf8',
        bg: '#070b14',
        card: '#0f172a',
        cardAlt: '#1e293b',
        cardHover: '#334155',
        border: '#1e293b',
        borderStrong: '#38bdf8',
        text: '#f8fafc',
        textMuted: '#ffffff',
        subtext: '#94a3b8',
        primary: '#38bdf8',
        primaryLight: 'rgba(56, 189, 248, 0.18)',
        success: '#34d399',
        successLight: 'rgba(52, 211, 153, 0.18)',
        danger: '#f87171',
        dangerLight: 'rgba(248, 113, 113, 0.18)',
        warning: '#fbbf24',
        warningLight: 'rgba(251, 191, 36, 0.18)',
        tabBar: '#0b1120',
        tabBorder: '#1e293b',
        inputBg: '#0f172a',
        inputBorder: '#334155',
        statusBarStyle: 'light',
        isDark: true
    },
    'liquid-glass': {
        id: 'liquid-glass',
        name: 'Liquid Glass Light',
        nameAr: 'الزجاج السائل الفاتح',
        desc: 'Iridescent pearl glass & vibrant azure',
        descAr: 'زجاج لؤلؤي شفاف وأزرق نهاري حيوي',
        dot: '#0284c7',
        bg: '#f1f5f9',
        card: '#ffffff',
        cardAlt: '#f8fafc',
        cardHover: '#e2e8f0',
        border: '#cbd5e1',
        borderStrong: '#94a3b8',
        text: '#0f172a',
        textMuted: '#1e293b',
        subtext: '#475569',
        primary: '#0284c7',
        primaryLight: 'rgba(2, 132, 199, 0.12)',
        success: '#059669',
        successLight: 'rgba(5, 150, 105, 0.12)',
        danger: '#dc2626',
        dangerLight: 'rgba(220, 38, 38, 0.12)',
        warning: '#d97706',
        warningLight: 'rgba(217, 119, 6, 0.12)',
        tabBar: '#ffffff',
        tabBorder: '#e2e8f0',
        inputBg: '#ffffff',
        inputBorder: '#cbd5e1',
        statusBarStyle: 'dark',
        isDark: false
    },
    'light': {
        id: 'light',
        name: 'Clean Light',
        nameAr: 'الوضع الفاتح الكلاسيكي',
        desc: 'Crisp daylight theme',
        descAr: 'المظهر النهاري الفاتح',
        dot: '#2563eb',
        bg: '#f8fafc',
        card: '#ffffff',
        cardAlt: '#f1f5f9',
        cardHover: '#e2e8f0',
        border: '#e2e8f0',
        borderStrong: '#cbd5e1',
        text: '#0f172a',
        textMuted: '#1e293b',
        subtext: '#64748b',
        primary: '#2563eb',
        primaryLight: 'rgba(37, 99, 235, 0.1)',
        success: '#10b981',
        successLight: 'rgba(16, 185, 129, 0.1)',
        danger: '#ef4444',
        dangerLight: 'rgba(239, 68, 68, 0.1)',
        warning: '#f59e0b',
        warningLight: 'rgba(245, 158, 11, 0.1)',
        tabBar: '#ffffff',
        tabBorder: '#e2e8f0',
        inputBg: '#f8fafc',
        inputBorder: '#cbd5e1',
        statusBarStyle: 'dark',
        isDark: false
    }
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [themeKey, setThemeKey] = useState('monochrome');

    useEffect(() => {
        AsyncStorage.getItem('theme_preset').then((saved) => {
            if (saved && THEMES[saved]) {
                setThemeKey(saved);
            }
        });
    }, []);

    const changeTheme = async (key) => {
        if (THEMES[key]) {
            setThemeKey(key);
            await AsyncStorage.setItem('theme_preset', key);
        }
    };

    const theme = THEMES[themeKey] || THEMES.monochrome;

    return (
        <ThemeContext.Provider value={{ theme, themeKey, setThemeKey: changeTheme, themes: THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
