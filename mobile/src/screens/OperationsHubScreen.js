import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import AICopilotHeaderButton from '../components/AICopilotHeaderButton';
import GlassBackground from '../components/GlassBackground';

export default function OperationsHubScreen({ navigation }) {
    const { i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();

    const HUB_MODULES = [
        {
            id: 'Workmen',
            title: isArabic ? 'العمالة والمقاولين' : 'Workforce & Labor',
            subtitle: isArabic ? 'اليوميات، المقاولين، وسجل الرواتب' : 'Daily rates, trades, and wages',
            icon: 'hammer',
            color: '#3b82f6',
            badge: null
        },
        {
            id: 'Inventory',
            title: isArabic ? 'المخازن والمواد' : 'Raw Materials & Stock',
            subtitle: isArabic ? 'تتبع الكميات، التوريدات، ونواقص المخزن' : 'Stock batches, alerts & valuation',
            icon: 'cube',
            color: '#10b981',
            badge: isArabic ? 'مخزن' : 'Stock'
        },
        {
            id: 'Invoices',
            title: isArabic ? 'الفواتير والتحصيل' : 'Invoices & Billing',
            subtitle: isArabic ? 'مطالبات العملاء، الفواتير المتأخرة والتحصيل' : 'Client billings, overdue & tax invoices',
            icon: 'receipt',
            color: '#f59e0b',
            badge: null
        },
        {
            id: 'AIChat',
            title: isArabic ? 'المساعد الذكي Copilot' : 'AI Assistant Copilot',
            subtitle: isArabic ? 'اسأل عن مصاريف المشاريع والتحليلات بالذكاء الاصطناعي' : 'Ask questions & query financial data',
            icon: 'sparkles',
            color: '#a855f7',
            badge: 'AI'
        },
        {
            id: 'Clients',
            title: isArabic ? 'دليل العملاء' : 'Clients Directory',
            subtitle: isArabic ? 'بيانات أصحاب المشاريع والتواصل' : 'Client accounts & project links',
            icon: 'people',
            color: '#06b6d4',
            badge: null
        },
        {
            id: 'Suppliers',
            title: isArabic ? 'الموردين والشركات' : 'Suppliers & Vendors',
            subtitle: isArabic ? 'شركات التوريد، الخرسانة، والحديد' : 'Material vendors & purchase logs',
            icon: 'business',
            color: '#ec4899',
            badge: null
        }
    ];

    return (
        <GlassBackground>
            <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
                <View style={[styles.header, { backgroundColor: 'transparent' }]}>
                <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[styles.headerTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left', flex: 1 }]}>
                        {isArabic ? 'مركز العمليات والموارد' : 'Operations & Hub'}
                    </Text>
                    <AICopilotHeaderButton navigation={navigation} compact />
                </View>
                <Text style={[styles.headerSubtitle, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                    {isArabic ? 'جميع وحدات إدارة الموقع في مكان واحد' : 'All construction & field modules in one place'}
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.grid}>
                    {HUB_MODULES.map((mod) => (
                        <TouchableOpacity
                            key={mod.id}
                            style={[
                                styles.card,
                                {
                                    backgroundColor: theme.card,
                                    borderColor: theme.border
                                }
                            ]}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate(mod.id)}
                        >
                            <View style={[styles.cardTop, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                <View style={[styles.iconBox, { backgroundColor: `${mod.color}20` }]}>
                                    <Ionicons name={mod.icon} size={26} color={mod.color} />
                                </View>
                                {mod.badge && (
                                    <View style={[styles.badge, { backgroundColor: mod.color }]}>
                                        <Text style={styles.badgeText}>{mod.badge}</Text>
                                    </View>
                                )}
                            </View>

                            <Text style={[styles.cardTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{mod.title}</Text>
                            <Text style={[styles.cardSub, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{mod.subtitle}</Text>

                            <View style={[styles.arrowRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                <Text style={[styles.exploreText, { color: mod.color }]}>
                                    {isArabic ? 'فتح الوحدة' : 'Open'}
                                </Text>
                                <Ionicons
                                    name={isArabic ? 'arrow-back' : 'arrow-forward'}
                                    size={16}
                                    color={mod.color}
                                />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
            </SafeAreaView>
        </GlassBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 12 : 36,
        paddingBottom: 16
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800'
    },
    headerSubtitle: {
        fontSize: 13,
        marginTop: 4
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 90
    },
    grid: {
        gap: 12
    },
    card: {
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3
    },
    cardTop: {
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center'
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '800'
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4
    },
    cardSub: {
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 14
    },
    arrowRow: {
        alignItems: 'center',
        gap: 6
    },
    exploreText: {
        fontSize: 13,
        fontWeight: '700'
    }
});

