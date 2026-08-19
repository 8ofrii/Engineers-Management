import { TouchableOpacity, Text, StyleSheet, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

export default function AICopilotFloatingButton({ style }) {
    const navigation = useNavigation();
    const { i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();

    const isObsidian = theme.id === 'obsidian-emerald';
    const isMonochrome = theme.id === 'monochrome';
    const accentColor = isObsidian ? '#10b981' : (isMonochrome ? '#fafafa' : theme.primary);
    const bgColor = isMonochrome ? theme.cardAlt : (isObsidian ? '#10b981' : theme.primary);
    const textColor = isObsidian ? '#000000' : (isMonochrome ? theme.text : '#ffffff');

    return (
        <TouchableOpacity
            style={[
                styles.fab,
                {
                    backgroundColor: bgColor,
                    borderColor: isMonochrome ? theme.borderStrong : bgColor,
                    [isArabic ? 'left' : 'right']: 16,
                    flexDirection: isArabic ? 'row-reverse' : 'row'
                },
                styles.shadow,
                style
            ]}
            onPress={() => navigation?.navigate('AIChat')}
            activeOpacity={0.85}
        >
            <Ionicons name="sparkles" size={18} color={textColor} />
            <Text style={[styles.fabText, { color: textColor }]}>
                {isArabic ? 'المساعد الذكي' : 'AI Copilot'}
            </Text>
            <View style={[styles.liveDot, { backgroundColor: isObsidian ? '#000000' : theme.success }]} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 24 : 20,
        zIndex: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 24,
        alignItems: 'center',
        gap: 6,
        borderWidth: 1
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    fabText: {
        fontSize: 13,
        fontWeight: '800'
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 4
    }
});
