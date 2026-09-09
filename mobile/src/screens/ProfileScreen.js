import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Alert,
    RefreshControl,
    Platform,
    Modal,
    Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { setLanguage } from '../i18n';
import { custodyApi, billingApi, getWebBillingUrl } from '../services/api';
import { useFormat } from '../utils/format';

import { useFocusEffect } from '@react-navigation/native';
import AICopilotHeaderButton from '../components/AICopilotHeaderButton';
import GlassBackground from '../components/GlassBackground';

export default function ProfileScreen({ navigation }) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { user, logout } = useAuth();
    const { theme, themeKey, setThemeKey, themes } = useTheme();
    const { currency } = useFormat();
    const [custody, setCustody] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [themeModalVisible, setThemeModalVisible] = useState(false);

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    const showCustody = user && (user.role === 'ENGINEER' || user.role === 'PROJECT_MANAGER' || user.role === 'ADMIN');

    const loadCustody = useCallback(async () => {
        if (!user?.id) return;
        try {
            const res = await custodyApi.balance(user.id);
            setCustody(res.data?.data || null);
        } catch {
            setCustody(null);
        }
    }, [user?.id]);

    const loadSubscription = useCallback(async () => {
        try {
            const res = await billingApi.subscription();
            setSubscription(res.data?.data || null);
        } catch {
            setSubscription(null);
        }
    }, []);

    const loadAll = useCallback(async () => {
        setRefreshing(true);
        await Promise.allSettled([loadCustody(), loadSubscription()]);
        setRefreshing(false);
    }, [loadCustody, loadSubscription]);

    useEffect(() => {
        loadCustody();
        loadSubscription();
    }, [loadCustody, loadSubscription]);

    useFocusEffect(useCallback(() => {
        loadCustody();
        loadSubscription();
    }, [loadCustody, loadSubscription]));

    const onLogout = () => {
        Alert.alert(
            isArabic ? 'تسجيل الخروج' : 'Sign Out',
            isArabic ? 'هل أنت متأكد من تسجيل الخروج من التطبيق؟' : 'Are you sure you want to sign out?',
            [
                { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
                { text: isArabic ? 'خروج' : 'Sign Out', style: 'destructive', onPress: logout }
            ]
        );
    };

    const openWebBilling = async () => {
        const url = getWebBillingUrl();
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert(isArabic ? 'تنبيه' : 'Notice', isArabic ? 'يمكنك فتح الرابط: ' + url : 'Open: ' + url);
            }
        } catch {
            Linking.openURL(url).catch(() => {});
        }
    };

    const currentPlanKey = subscription?.plan || user?.tenant?.subscriptionPlan || 'FREE';
    const planName = currentPlanKey === 'BUSINESS'
        ? (isArabic ? 'باقة الأعمال (Business)' : 'Business Plan')
        : currentPlanKey === 'PREMIUM'
        ? (isArabic ? 'الباقة الاحترافية (Premium)' : 'Premium Plan')
        : currentPlanKey === 'ENTERPRISE'
        ? (isArabic ? 'باقة المؤسسات (Enterprise)' : 'Enterprise Plan')
        : (isArabic ? 'الباقة المجانية (Free Tier)' : 'Free Tier');

    const planLimits = currentPlanKey === 'BUSINESS'
        ? (isArabic ? 'مشاريع غير محدودة · 12 مقعد كحد أقصى' : 'Unlimited Projects · 12 Seats')
        : currentPlanKey === 'PREMIUM'
        ? (isArabic ? 'مشاريع غير محدودة · 6 مقاعد كحد أقصى' : 'Unlimited Projects · 6 Seats')
        : currentPlanKey === 'ENTERPRISE'
        ? (isArabic ? 'مشاريع غير محدودة · مقاعد مخصصة' : 'Unlimited Projects · Custom Seats')
        : (isArabic ? 'مشروعين نشطين · مقعدين فقط' : '2 Active Projects · 2 Seats Max');

    const initials = (user?.name || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

    const currentThemeInfo = themes[themeKey] || themes.monochrome;

    return (
        <GlassBackground>
            <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
                {/* Top Bar with AI Copilot Button */}
                <View style={[styles.topBar, { flexDirection: isArabic ? 'row-reverse' : 'row', borderBottomColor: theme.border }]}>
                <Text style={[styles.topBarTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left', flex: 1 }]}>
                    {isArabic ? 'الملف الشخصي والإعدادات' : 'Profile & Settings'}
                </Text>
                <AICopilotHeaderButton navigation={navigation} compact />
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCustody(); }} tintColor={theme.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Header Block */}
                <View style={styles.profileBlock}>
                    <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <Text style={[styles.name, { color: theme.text }]}>{user?.name || (isArabic ? 'مستخدم النظام' : 'User')}</Text>
                    <Text style={[styles.email, { color: theme.subtext }]}>{user?.email || ''}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                        <Text style={[styles.roleBadgeText, { color: theme.primary }]}>
                            {user?.role?.replace(/_/g, ' ') || 'ENGINEER'}
                        </Text>
                    </View>
                </View>

                {/* Company Subscription & Web Upgrade Card */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.subtext }]}>
                        {isArabic ? 'باقة واشتراك الشركة' : 'Company Subscription & Plan'}
                    </Text>
                    <View style={[styles.subscriptionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text, textAlign: isArabic ? 'right' : 'left' }}>
                                    {planName}
                                </Text>
                                <Text style={{ fontSize: 12, color: theme.subtext, marginTop: 3, textAlign: isArabic ? 'right' : 'left' }}>
                                    {planLimits}
                                </Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                                <Text style={[styles.statusBadgeText, { color: theme.primary }]}>
                                    {isArabic ? 'نشطة' : 'Active'}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.upgradeBtn,
                                {
                                    backgroundColor: theme.id === 'monochrome' ? '#fafafa' : theme.primary,
                                    flexDirection: isArabic ? 'row-reverse' : 'row'
                                }
                            ]}
                            activeOpacity={0.8}
                            onPress={openWebBilling}
                        >
                            <Ionicons name="globe-outline" size={17} color={theme.id === 'monochrome' ? '#121212' : '#ffffff'} />
                            <Text style={[styles.upgradeBtnText, { color: theme.id === 'monochrome' ? '#121212' : '#ffffff' }]}>
                                {isArabic ? 'إدارة وترقية الباقة عبر المتصفح' : 'Manage & Upgrade on Web'}
                            </Text>
                            <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={15} color={theme.id === 'monochrome' ? '#121212' : '#ffffff'} />
                        </TouchableOpacity>

                        <Text style={[styles.billingNotice, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                            {isArabic
                                ? 'تتم إدارة الاشتراكات وسداد الفواتير بأمان عبر بوابة الويب الرسمية.'
                                : 'Subscriptions and billing are managed securely via the web portal.'}
                        </Text>
                    </View>
                </View>

                {/* Custody Wallet Card */}
                {showCustody && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.subtext }]}>{isArabic ? 'عهدة المهندس المالية' : 'My Custody Wallet'}</Text>
                        <View style={[styles.custodyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <View style={[styles.custodyRow, { borderBottomColor: theme.borderStrong }]}>
                                <Text style={[styles.custodyLabel, { color: theme.subtext }]}>{isArabic ? 'رصيد العهدة الحالي' : 'Current Balance'}</Text>
                                <Text style={[styles.custodyValue, { color: theme.primary, fontSize: 18, fontWeight: '800' }]}>
                                    {currency(custody?.currentCustodyBalance || 0)}
                                </Text>
                            </View>
                            <View style={[styles.custodyRow, { borderBottomColor: theme.borderStrong }]}>
                                <Text style={[styles.custodyLabel, { color: theme.subtext }]}>{isArabic ? 'معلق تحت التصفية' : 'Pending Clearance'}</Text>
                                <Text style={[styles.custodyValue, { color: theme.text }]}>
                                    {currency(custody?.pendingClearance || 0)}
                                </Text>
                            </View>
                            <View style={[styles.custodyRow, { borderBottomWidth: 0 }]}>
                                <Text style={[styles.custodyLabel, { color: theme.subtext }]}>{isArabic ? 'المتاح للصرف' : 'Available to Spend'}</Text>
                                <Text style={[styles.custodyValue, { color: theme.success, fontWeight: '800' }]}>
                                    {currency(custody?.availableBalance || 0)}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Admin Management Actions */}
                {isAdmin && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.subtext }]}>{isArabic ? 'إدارة النقدية والعهد' : 'Admin Controls'}</Text>
                        <TouchableOpacity
                            style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
                            onPress={() => navigation.navigate('FundEngineer')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.itemIconBox, { backgroundColor: theme.successLight }]}>
                                <Ionicons name="cash-outline" size={20} color={theme.success} />
                            </View>
                            <Text style={[styles.rowLabel, { color: theme.text }]}>{isArabic ? 'صرف عهدة لمهندس موقع' : 'Fund Site Engineer Custody'}</Text>
                            <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.subtext} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* App Preferences */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.subtext }]}>{isArabic ? 'الإعدادات والمظهر' : 'Preferences & Appearance'}</Text>
                    
                    {/* Theme Switcher Row */}
                    <TouchableOpacity
                        style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => setThemeModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.itemIconBox, { backgroundColor: theme.primaryLight }]}>
                            <Ionicons name="color-palette-outline" size={20} color={theme.primary} />
                        </View>
                        <Text style={[styles.rowLabel, { color: theme.text }]}>{isArabic ? 'مظهر وتصميم التطبيق' : 'Color Theme'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: currentThemeInfo.dot }} />
                            <Text style={[styles.rowValue, { color: theme.subtext }]}>
                                {isArabic ? currentThemeInfo.nameAr : currentThemeInfo.name}
                            </Text>
                        </View>
                        <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.subtext} />
                    </TouchableOpacity>

                    {/* Language Switcher Row */}
                    <TouchableOpacity
                        style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => setLanguage(isArabic ? 'en' : 'ar')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.itemIconBox, { backgroundColor: theme.primaryLight }]}>
                            <Ionicons name="language-outline" size={20} color={theme.primary} />
                        </View>
                        <Text style={[styles.rowLabel, { color: theme.text }]}>{isArabic ? 'لغة التطبيق' : 'App Language'}</Text>
                        <Text style={[styles.rowValue, { color: theme.subtext }]}>{isArabic ? 'العربية' : 'English'}</Text>
                        <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.subtext} />
                    </TouchableOpacity>
                </View>

                {/* Account & Logout */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.subtext }]}>{isArabic ? 'الحساب' : 'Account'}</Text>
                    <TouchableOpacity
                        style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={onLogout}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.itemIconBox, { backgroundColor: theme.dangerLight }]}>
                            <Ionicons name="log-out-outline" size={20} color={theme.danger} />
                        </View>
                        <Text style={[styles.rowLabel, { color: theme.danger }]}>{isArabic ? 'تسجيل الخروج' : 'Sign Out'}</Text>
                        <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.subtext} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.footer, { color: theme.subtext }]}>Hesaby ERP Mobile v2.0</Text>
            </ScrollView>

            {/* Theme Selector Modal */}
            <Modal
                visible={themeModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setThemeModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setThemeModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>
                                {isArabic ? 'اختر مظهر التطبيق' : 'Select Theme Preset'}
                            </Text>
                            <TouchableOpacity onPress={() => setThemeModalVisible(false)}>
                                <Ionicons name="close-circle" size={24} color={theme.subtext} />
                            </TouchableOpacity>
                        </View>

                        {Object.values(themes).map((tPreset) => {
                            const isSelected = themeKey === tPreset.id;
                            return (
                                <TouchableOpacity
                                    key={tPreset.id}
                                    style={[
                                        styles.themeOption,
                                        { backgroundColor: isSelected ? theme.primaryLight : theme.cardAlt, borderColor: isSelected ? theme.primary : theme.borderStrong }
                                    ]}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setThemeKey(tPreset.id);
                                        setThemeModalVisible(false);
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <View style={[styles.themeDot, { backgroundColor: tPreset.dot }]} />
                                        <View>
                                            <Text style={[styles.themeName, { color: theme.text }]}>
                                                {isArabic ? tPreset.nameAr : tPreset.name}
                                            </Text>
                                            <Text style={[styles.themeDesc, { color: theme.subtext }]}>
                                                {isArabic ? tPreset.descAr : tPreset.desc}
                                            </Text>
                                        </View>
                                    </View>
                                    {isSelected && (
                                        <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </TouchableOpacity>
            </Modal>
            </SafeAreaView>
        </GlassBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    scroll: {
        padding: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 36,
        paddingBottom: 90
    },
    profileBlock: {
        alignItems: 'center',
        paddingVertical: 20
    },
    avatar: {
        width: 76,
        height: 76,
        borderRadius: 38,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6
    },
    avatarText: {
        color: '#ffffff',
        fontSize: 26,
        fontWeight: '800'
    },
    name: {
        fontSize: 20,
        fontWeight: '800'
    },
    email: {
        fontSize: 13,
        marginTop: 4
    },
    roleBadge: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: '700'
    },
    section: {
        marginTop: 18
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginLeft: 4
    },
    custodyCard: {
        borderRadius: 14,
        padding: 14,
        borderWidth: 1
    },
    custodyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1
    },
    custodyLabel: {
        fontSize: 13
    },
    custodyValue: {
        fontSize: 14,
        fontWeight: '600'
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1
    },
    itemIconBox: {
        width: 34,
        height: 34,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    rowLabel: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1
    },
    rowValue: {
        fontSize: 13,
        marginRight: 6
    },
    footer: {
        textAlign: 'center',
        fontSize: 11,
        marginTop: 28
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        width: '100%',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 10
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800'
    },
    themeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1.5
    },
    themeDot: {
        width: 14,
        height: 14,
        borderRadius: 7
    },
    themeName: {
        fontSize: 15,
        fontWeight: '700'
    },
    themeDesc: {
        fontSize: 12,
        marginTop: 2
    },
    topBar: {
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 10 : 32,
        paddingBottom: 10,
        borderBottomWidth: 1,
        gap: 10
    },
    topBarTitle: {
        fontSize: 17,
        fontWeight: '800'
    },
    subscriptionCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '800'
    },
    upgradeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginTop: 6,
        marginBottom: 8,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3
    },
    upgradeBtnText: {
        fontSize: 13.5,
        fontWeight: '700'
    },
    billingNotice: {
        fontSize: 11,
        lineHeight: 16,
        marginTop: 2
    }
});


