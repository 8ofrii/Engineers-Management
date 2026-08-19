import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

export default function AICopilotHeaderButton({ navigation, params, compact = false, style }) {
    const { i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();

    const isObsidian = theme.id === 'obsidian-emerald';
    const isGlass = theme.id === 'glass-dark';
    const isLiquid = theme.id === 'liquid-glass';
    const isMonochrome = theme.id === 'monochrome';
    const accentColor = isObsidian ? '#10b981' : (isGlass ? '#38bdf8' : (isLiquid ? '#0284c7' : (isMonochrome ? theme.text : theme.primary)));

    return (
        <TouchableOpacity
            style={[
                styles.btn,
                {
                    backgroundColor: theme.primaryLight,
                    borderColor: accentColor,
                    flexDirection: isArabic ? 'row-reverse' : 'row'
                },
                compact && styles.compactBtn,
                style
            ]}
            onPress={() => navigation?.navigate('AIChat', params || {})}
            activeOpacity={0.75}
        >
            <Ionicons name="sparkles" size={compact ? 14 : 16} color={accentColor} />
            <Text style={[styles.btnText, { color: accentColor }]}>
                {isArabic ? 'المساعد' : 'AI Copilot'}
            </Text>
            <View style={[styles.liveDot, { backgroundColor: theme.success }]} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1
    },
    compactBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16
    },
    btnText: {
        fontSize: 12,
        fontWeight: '800'
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3
    }
});
