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
import { useTheme } from '../context/ThemeContext';
import { suppliersApi } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import AICopilotHeaderButton from '../components/AICopilotHeaderButton';

export default function SuppliersScreen({ navigation }) {
    const { i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const r = await suppliersApi.list();
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


    const getCategoryLabel = (category) => {
        const c = (category || '').toUpperCase();
        if (c === 'CONCRETE') return isArabic ? 'خرسانة جاهزة' : 'Concrete';
        if (c === 'STEEL') return isArabic ? 'حديد تسليح' : 'Steel & Rebar';
        if (c === 'CEMENT') return isArabic ? 'أسمنت وجبس' : 'Cement';
        if (c === 'BRICKS') return isArabic ? 'طوب وبلوك' : 'Bricks';
        if (c === 'ELECTRICAL') return isArabic ? 'مهمات كهربائية' : 'Electrical';
        if (c === 'PLUMBING') return isArabic ? 'سباكة ومواسير' : 'Plumbing';
        if (c === 'PAINT') return isArabic ? 'دهانات' : 'Paint';
        if (c === 'WOOD') return isArabic ? 'أخشاب' : 'Wood';
        if (c === 'TOOLS') return isArabic ? 'عدد وأدوات' : 'Tools';
        if (c === 'MATERIALS') return isArabic ? 'مواد بناء وتوريدات' : 'Materials';
        if (c === 'EQUIPMENT') return isArabic ? 'معدات وآليات' : 'Equipment';
        if (c === 'SERVICES') return isArabic ? 'خدمات ومقاولات' : 'Services';
        if (c === 'LABOR') return isArabic ? 'توريد عمالة' : 'Labor';
        if (c === 'SUB_CONTRACTOR') return isArabic ? 'مقاول باطن' : 'Subcontractor';
        return category || (isArabic ? 'توريدات عامة' : 'General');
    };

    const filtered = items.filter(s => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchCompany = (s.company || '').toLowerCase().includes(q);
        const matchPhone = (s.phone || '').toLowerCase().includes(q) || (Array.isArray(s.phones) && s.phones.some(p => (p || '').toLowerCase().includes(q)));
        const matchCategory = (s.category || '').toLowerCase().includes(q) ||
            getCategoryLabel(s.category).toLowerCase().includes(q) ||
            (Array.isArray(s.categories) && s.categories.some(c => (c || '').toLowerCase().includes(q) || getCategoryLabel(c).toLowerCase().includes(q)));
        const matchItems = Array.isArray(s.suppliedItems) && s.suppliedItems.some(it => (it || '').toLowerCase().includes(q));
        return matchName || matchCompany || matchPhone || matchCategory || matchItems;
    });

    const handleCall = (phone) => {
        if (!phone) return;
        Linking.openURL(`tel:${phone}`);
    };

    const getStatusLabel = (status) => {
        const s = (status || 'ACTIVE').toUpperCase();
        if (s === 'ACTIVE') return isArabic ? 'نشط' : 'Active';
        if (s === 'INACTIVE') return isArabic ? 'غير نشط' : 'Inactive';
        return status;
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
                        {isArabic ? 'الموردين والشركات' : 'Suppliers'} ({items.length})
                    </Text>
                </View>
                <AICopilotHeaderButton navigation={navigation} compact />
            </View>

            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.borderStrong, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <Ionicons name="search-outline" size={18} color={theme.subtext} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                    placeholder={isArabic ? 'بحث باسم المورد أو مجالات التوريد أو الأصناف...' : 'Search supplier name, categories, or items...'}
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
                        <Ionicons name="business-outline" size={48} color={theme.subtext} />
                        <Text style={[styles.emptyText, { color: theme.subtext }]}>{isArabic ? 'لا يوجد موردين مطابقين' : 'No suppliers found'}</Text>
                    </View>
                ) : (
                    filtered.map((s) => {
                        const cats = Array.isArray(s.categories) && s.categories.length > 0
                            ? s.categories
                            : (s.category ? [s.category] : []);

                        return (
                            <View key={s.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <View style={[styles.cardHeader, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.name, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={1}>{s.name}</Text>
                                        
                                        {/* Multi-Category Badges */}
                                        <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                            {cats.map((c, idx) => (
                                                <View key={idx} style={{ backgroundColor: theme.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                                    <Text style={{ fontSize: 11, fontWeight: '600', color: theme.primary }}>
                                                        {getCategoryLabel(c)}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>

                                        {/* Supplied Items Chips */}
                                        {Array.isArray(s.suppliedItems) && s.suppliedItems.length > 0 && (
                                            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 4, marginTop: 6, alignItems: 'center' }}>
                                                <Ionicons name="pricetag-outline" size={12} color={theme.subtext} />
                                                {s.suppliedItems.map((item, idx) => (
                                                    <View key={idx} style={{ backgroundColor: theme.bgSecondary || 'rgba(0,0,0,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: theme.border }}>
                                                        <Text style={{ fontSize: 10, color: theme.subtext }}>
                                                            {item}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                    <View style={[styles.badge, { backgroundColor: theme.successLight }]}>
                                        <Text style={[styles.badgeText, { color: theme.success }]}>
                                            {getStatusLabel(s.status)}
                                        </Text>
                                    </View>
                                </View>

                            <View style={[styles.metaBlock, { alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
                                {s.rating ? (
                                    <Text style={[styles.rating, { textAlign: isArabic ? 'right' : 'left' }]}>{'⭐'.repeat(Number(s.rating) || 3)}</Text>
                                ) : null}
                                {s.phone ? <Text style={[styles.meta, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>📞 {s.phone}</Text> : null}
                                {s.paymentTerms ? (
                                    <Text style={[styles.meta, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                                        {isArabic ? 'شروط الدفع' : 'Payment Terms'}: {s.paymentTerms}
                                    </Text>
                                ) : null}
                            </View>

                            {s.phone && (
                                <View style={[styles.actionRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
                                        onPress={() => handleCall(s.phone)}
                                    >
                                        <Ionicons name="call" size={14} color={theme.primary} />
                                        <Text style={[styles.actionBtnText, { color: theme.primary }]}>{isArabic ? 'اتصال بالمورد' : 'Call Supplier'}</Text>
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
    searchBar: {
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 2
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
        marginBottom: 10
    },
    name: {
        fontSize: 16,
        fontWeight: '700'
    },
    category: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800'
    },
    metaBlock: {
        gap: 4,
        marginBottom: 14
    },
    meta: {
        fontSize: 12
    },
    rating: {
        fontSize: 12,
        marginBottom: 2
    },
    actionRow: {
        gap: 8
    },
    actionBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
        gap: 6
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '700'
    },
    emptyCard: {
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        marginTop: 20
    },
    emptyText: {
        fontSize: 14,
        marginTop: 12
    }
});


