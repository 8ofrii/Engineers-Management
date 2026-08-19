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
