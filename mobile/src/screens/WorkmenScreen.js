import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    Linking,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { workmenApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';

import AICopilotHeaderButton from '../components/AICopilotHeaderButton';

import { useFocusEffect } from '@react-navigation/native';

export default function WorkmenScreen({ navigation }) {
    const { i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const r = await workmenApi.list();
            setItems(r.data?.data || []);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const onRefresh = () => { setRefreshing(true); load(); };

    const filtered = items.filter(w =>
        (w.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (w.nameAr || '').toLowerCase().includes(search.toLowerCase()) ||
        (w.trade || '').toLowerCase().includes(search.toLowerCase())
    );

    const totalPaidSum = items.reduce((s, w) => s + Number(w.totalPaid || 0), 0);

    const handleCall = (phone) => {
        if (!phone) return;
        Linking.openURL(`tel:${phone}`);
    };

    const handleWhatsApp = (phone) => {
        if (!phone) return;
        const clean = phone.replace(/[^0-9]/g, '');
        Linking.openURL(`whatsapp://send?phone=${clean}`);
    };

    const getTradeLabel = (trade) => {
        const t = (trade || '').toUpperCase();
        const map = {
            'CARPENTER': 'نجار مسلح',
            'BLACKSMITH': 'حداد مسلح',
            'MASON': 'بناء / مبلط',
            'PLASTERER': 'محارة ومصيص',
            'PAINTER': 'نقاش',
            'ELECTRICIAN': 'كهربائي',
            'PLUMBER': 'سباك',
            'HELPER': 'عامل مساعد',
            'FOREMAN': 'معلم / مشرف عمال',
            'SURVEYOR': 'مساح'
        };
        if (isArabic && map[t]) return map[t];
        return trade || (isArabic ? 'صنايعي' : 'General');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={[styles.header, { flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                        {isArabic ? 'العمالة والمقاولين' : 'Workforce'} ({items.length})
                    </Text>
                </View>
                <AICopilotHeaderButton navigation={navigation} compact />
            </View>

            {/* Total Paid Banner */}
            <View style={[styles.banner, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: isArabic ? 'row-reverse' : 'row', [isArabic ? 'borderRightWidth' : 'borderLeftWidth']: 4, [isArabic ? 'borderRightColor' : 'borderLeftColor']: theme.success }]}>
                <Ionicons name="cash-outline" size={24} color={theme.success} />
                <View style={{ flex: 1, alignItems: isArabic ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.bannerLabel, { color: theme.subtext }]}>{isArabic ? 'إجمالي الأجور والمستحقات المسددة' : 'Total Wages Paid to Date'}</Text>
                    <Text style={[styles.bannerVal, { color: theme.text }]}>{totalPaidSum.toLocaleString()} EGP</Text>
                </View>
            </View>

            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.borderStrong, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <Ionicons name="search-outline" size={18} color={theme.subtext} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                    placeholder={isArabic ? 'بحث باسم العامل أو المهنة (نجار، حداد)...' : 'Search workman name or trade...'}
                    placeholderTextColor={theme.subtext}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                ) : filtered.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Ionicons name="people-outline" size={48} color={theme.subtext} />
                        <Text style={[styles.emptyText, { color: theme.subtext }]}>{isArabic ? 'لا يوجد عمال مطابقين للبحث' : 'No workmen found'}</Text>
                    </View>
                ) : (
                    filtered.map((w) => (
                        <View key={w.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <View style={[styles.cardHeader, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.name, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? (w.nameAr || w.name) : w.name}</Text>
                                    <Text style={[styles.phoneText, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>📞 {w.phone || '—'}</Text>
                                </View>
                                <View style={[styles.tradeBadge, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                                    <Text style={[styles.tradeText, { color: theme.primary }]}>{getTradeLabel(w.trade)}</Text>
                                </View>
                            </View>

                            <View style={[styles.statsRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                <View style={[styles.statBox, { backgroundColor: theme.cardAlt, borderColor: theme.border, alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
                                    <Text style={[styles.statLabel, { color: theme.subtext }]}>{isArabic ? 'اليومية' : 'Daily Rate'}</Text>
                                    <Text style={[styles.statVal, { color: theme.text }]}>{Number(w.dailyRate || 0).toLocaleString()} EGP</Text>
                                </View>
                                <View style={[styles.statBox, { backgroundColor: theme.cardAlt, borderColor: theme.border, alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
                                    <Text style={[styles.statLabel, { color: theme.subtext }]}>{isArabic ? 'إجمالي المستلم' : 'Total Paid'}</Text>
                                    <Text style={[styles.statVal, { color: theme.success }]}>{Number(w.totalPaid || 0).toLocaleString()} EGP</Text>
                                </View>
                            </View>

                            {/* Quick Call & WhatsApp Actions */}
                            {w.phone && (
                                <View style={[styles.actionRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                    <TouchableOpacity style={[styles.callBtn, { borderColor: theme.primary, backgroundColor: theme.primaryLight, flexDirection: isArabic ? 'row-reverse' : 'row' }]} onPress={() => handleCall(w.phone)} activeOpacity={0.8}>
                                        <Ionicons name="call" size={14} color={theme.primary} />
                                        <Text style={[styles.callBtnText, { color: theme.primary }]}>{isArabic ? 'اتصال' : 'Call'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.waBtn, { borderColor: theme.success, backgroundColor: theme.successLight, flexDirection: isArabic ? 'row-reverse' : 'row' }]} onPress={() => handleWhatsApp(w.phone)} activeOpacity={0.8}>
                                        <Ionicons name="logo-whatsapp" size={14} color={theme.success} />
                                        <Text style={[styles.waBtnText, { color: theme.success }]}>WhatsApp</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 36,
        paddingBottom: 14,
        gap: 12
    },
    backBtn: {
        padding: 6
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        flex: 1
    },
    banner: {
        alignItems: 'center',
        borderRadius: 12,
        padding: 14,
        marginHorizontal: 16,
        marginBottom: 12,
        gap: 12,
        borderWidth: 1
    },
    bannerLabel: {
        fontSize: 11,
        fontWeight: '600'
    },
    bannerVal: {
        fontSize: 18,
        fontWeight: '800',
        marginTop: 2
    },
    searchBar: {
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        marginHorizontal: 16,
        marginBottom: 14,
        borderWidth: 1
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        fontSize: 14
    },
    scroll: {
        paddingHorizontal: 16,
        paddingBottom: 90,
        gap: 12
    },
    card: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1
    },
    cardHeader: {
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12
    },
    name: {
        fontSize: 16,
        fontWeight: '700'
    },
    phoneText: {
        fontSize: 12,
        marginTop: 3
    },
    tradeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1
    },
    tradeText: {
        fontSize: 11,
        fontWeight: '700'
    },
    statsRow: {
        gap: 8,
        marginBottom: 10
    },
    statBox: {
        flex: 1,
        borderRadius: 8,
        padding: 10,
        borderWidth: 1
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600'
    },
    statVal: {
        fontSize: 13,
        fontWeight: '700',
        marginTop: 2
    },
    actionRow: {
        gap: 8,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)'
    },
    callBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        gap: 6
    },
    callBtnText: {
        fontSize: 12,
        fontWeight: '700'
    },
    waBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        gap: 6
    },
    waBtnText: {
        fontSize: 12,
        fontWeight: '700'
    },
    emptyCard: {
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
        marginTop: 20,
        borderWidth: 1
    },
    emptyText: {
        fontSize: 14,
        marginTop: 12
    }
});


