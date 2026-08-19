import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    TextInput,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { materialsApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import AICopilotHeaderButton from '../components/AICopilotHeaderButton';

import { useFocusEffect } from '@react-navigation/native';

export default function InventoryScreen({ navigation }) {
    const { i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();
    const [materials, setMaterials] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await materialsApi.list();
            setMaterials(res.data?.data || []);
        } catch (err) {
            setMaterials([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const onRefresh = () => { setRefreshing(true); load(); };

    const filtered = materials.filter(m =>
        (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.category || '').toLowerCase().includes(search.toLowerCase())
    );

    const totalItems = materials.length;
    const lowStockCount = materials.filter(m => Number(m.currentStock || 0) <= Number(m.minStockAlert || 5)).length;

    const getCategoryLabel = (category) => {
        const c = (category || '').toUpperCase();
        if (c === 'MATERIALS') return isArabic ? 'مواد بناء وتوريدات' : 'Materials';
        if (c === 'EQUIPMENT') return isArabic ? 'معدات' : 'Equipment';
        if (c === 'FINISHING') return isArabic ? 'تشطيبات' : 'Finishing';
        return category || (isArabic ? 'مواد بناء' : 'General');
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
                        {isArabic ? 'المخازن والمواد' : 'Raw Materials & Stock'}
                    </Text>
                </View>
                <AICopilotHeaderButton navigation={navigation} compact />
            </View>

            {/* Quick Metrics */}
            <View style={[styles.metricRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border, [isArabic ? 'borderRightWidth' : 'borderLeftWidth']: 4, [isArabic ? 'borderRightColor' : 'borderLeftColor']: theme.primary }]}>
                    <Text style={[styles.metricLabel, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'إجمالي المواد' : 'Total Items'}</Text>
                    <Text style={[styles.metricVal, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{totalItems}</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border, [isArabic ? 'borderRightWidth' : 'borderLeftWidth']: 4, [isArabic ? 'borderRightColor' : 'borderLeftColor']: '#ef4444' }]}>
                    <Text style={[styles.metricLabel, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'نواقص المخزن' : 'Low Stock Alert'}</Text>
                    <Text style={[styles.metricVal, { color: lowStockCount > 0 ? '#f87171' : theme.success, textAlign: isArabic ? 'right' : 'left' }]}>
                        {lowStockCount} {isArabic ? 'صنف' : 'Items'}
                    </Text>
                </View>
            </View>

            {/* Search Input */}
            <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.borderStrong, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <Ionicons name="search-outline" size={18} color={theme.subtext} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                    placeholder={isArabic ? 'بحث باسم الخامة أو التصنيف...' : 'Search material or category...'}
                    placeholderTextColor={theme.subtext}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                ) : filtered.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Ionicons name="cube-outline" size={48} color={theme.subtext} />
                        <Text style={[styles.emptyText, { color: theme.subtext }]}>{isArabic ? 'لا توجد خامات مطابقة للبحث' : 'No materials found'}</Text>
                    </View>
                ) : (
                    filtered.map((m) => {
                        const stock = Number(m.currentStock || 0);
                        const minAlert = Number(m.minStockAlert || 5);
                        const isLow = stock <= minAlert;

                        return (
                            <View key={m.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <View style={[styles.cardHeader, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{m.name}</Text>
                                        <Text style={[styles.categoryBadge, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{getCategoryLabel(m.category)}</Text>
                                    </View>
                                    {isLow && (
                                        <View style={[styles.lowBadge, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                            <Ionicons name="warning" size={12} color="#ef4444" />
                                            <Text style={styles.lowText}>{isArabic ? 'ناقص' : 'Low Stock'}</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={[styles.stockRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                    <View style={[styles.stockBox, { backgroundColor: theme.cardAlt, borderColor: theme.border, alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
                                        <Text style={[styles.stockLabel, { color: theme.subtext }]}>{isArabic ? 'الرصيد الحالي' : 'In Stock'}</Text>
                                        <Text style={[styles.stockVal, { color: isLow ? '#f87171' : theme.text }]}>
                                            {stock} <Text style={[styles.unit, { color: theme.subtext }]}>{m.unit || (isArabic ? 'وحدة' : 'Unit')}</Text>
                                        </Text>
                                    </View>
                                    <View style={[styles.stockBox, { backgroundColor: theme.cardAlt, borderColor: theme.border, alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
                                        <Text style={[styles.stockLabel, { color: theme.subtext }]}>{isArabic ? 'متوسط السعر' : 'Avg Unit Price'}</Text>
                                        <Text style={[styles.stockVal, { color: theme.text }]}>
                                            {Number(m.avgUnitPrice || 0).toLocaleString()} <Text style={[styles.unit, { color: theme.subtext }]}>EGP</Text>
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })
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
    metricRow: {
        gap: 10,
        paddingHorizontal: 16,
        marginBottom: 12
    },
    metricCard: {
        flex: 1,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: '600'
    },
    metricVal: {
        fontSize: 18,
        fontWeight: '800',
        marginTop: 4
    },
    searchBar: {
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        marginHorizontal: 16,
        marginBottom: 14,
        borderWidth: 1,
        gap: 8
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        fontSize: 14
    },
    scrollContent: {
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
    cardTitle: {
        fontSize: 16,
        fontWeight: '700'
    },
    categoryBadge: {
        fontSize: 12,
        marginTop: 2
    },
    lowBadge: {
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ef4444'
    },
    lowText: {
        color: '#fca5a5',
        fontSize: 11,
        fontWeight: '700'
    },
    stockRow: {
        gap: 8
    },
    stockBox: {
        flex: 1,
        borderRadius: 8,
        padding: 10,
        borderWidth: 1
    },
    stockLabel: {
        fontSize: 10,
        marginBottom: 2
    },
    stockVal: {
        fontSize: 14,
        fontWeight: '700'
    },
    unit: {
        fontSize: 11,
        fontWeight: '400'
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

