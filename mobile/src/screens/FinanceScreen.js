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
    Alert,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { transactionsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFormat } from '../utils/format';

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB') : '-';

import { useFocusEffect } from '@react-navigation/native';
import AICopilotHeaderButton from '../components/AICopilotHeaderButton';
import GlassBackground from '../components/GlassBackground';

export default function FinanceScreen({ navigation }) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { user } = useAuth();
    const { theme } = useTheme();
    const { currency } = useFormat();
    const [filter, setFilter] = useState('ALL');  // ALL / PENDING / MINE
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const canApprove = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER' || user?.role === 'SUPER_ADMIN';

    const load = useCallback(async () => {
        try {
            const params = {};
            if (filter === 'PENDING') params.status = 'PENDING_APPROVAL';
            const res = await transactionsApi.list(params);
            const data = res.data?.data || res.data?.transactions || [];
            setTransactions(Array.isArray(data) ? data : []);
        } catch {
            setTransactions([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter]);

    useEffect(() => { load(); }, [load]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const onApprove = async (id) => {
        try {
            await transactionsApi.approve(id);
            Alert.alert(isArabic ? 'تم الاعتماد' : 'Approved', isArabic ? 'تم اعتماد المعاملة وإدراجها بالدفاتر' : 'Transaction approved successfully');
            load();
        } catch (err) {
            Alert.alert(isArabic ? 'خطأ' : 'Error', err.response?.data?.message || err.message);
        }
    };

    const onReject = async (id) => {
        try {
            await transactionsApi.reject(id, 'Rejected via mobile');
            load();
        } catch (err) {
            Alert.alert(isArabic ? 'خطأ' : 'Error', err.response?.data?.message || err.message);
        }
    };

    const getCategoryLabel = (cat) => {
        const c = (cat || '').toUpperCase();
        const map = {
            'SAND': 'رمل',
            'CEMENT': 'أسمنت',
            'STEEL': 'حديد تسليح',
            'CONCRETE': 'خرسانة جاهزة',
            'BRICKS': 'طوب',
            'MATERIALS': 'مواد بناء وتوريدات',
            'MANAGEMENT_FEE_TRANSFER': 'تحويل أرباح إدارة',
            'LABOR': 'أجور عمالة',
            'EQUIPMENT': 'إيجار معدات',
            'TRANSPORT': 'نقل ومشال',
            'PETTY_CASH': 'مصاريف نثرية',
            'SUBCONTRACTOR': 'مستخلص مقاول باطن',
            'EXPENSE': 'مصروف',
            'INCOME': 'إيراد / دفعة'
        };
        if (isArabic && map[c]) return map[c];
        return cat ? cat.replace(/_/g, ' ') : (isArabic ? 'مصروف عام' : 'General');
    };

    const getStatusLabel = (status) => {
        const s = (status || '').toUpperCase();
        if (s === 'APPROVED') return isArabic ? 'معتمد' : 'Approved';
        if (s === 'PENDING_APPROVAL' || s === 'PENDING') return isArabic ? 'تحت الاعتماد' : 'Pending';
        if (s === 'REJECTED') return isArabic ? 'مرفوض' : 'Rejected';
        return status;
    };

    const filtered = filter === 'MINE'
        ? transactions.filter(tx => tx.createdBy === user?.id)
        : transactions;

    return (
        <GlassBackground>
            <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
            {/* Header */}
            <View style={[styles.header, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.headerTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left', flex: 1 }]}>
                    {isArabic ? 'الحسابات والمالية' : 'Finance & Ledger'}
                </Text>
                <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                    <AICopilotHeaderButton navigation={navigation} compact />
                    <TouchableOpacity
                        onPress={() => navigation.navigate('DraftsList')}
                        style={[styles.aiDraftsBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="sparkles" size={14} color={theme.primary} />
                        <Text style={[styles.aiDraftsText, { color: theme.primary }]}>{isArabic ? 'المسودات' : 'Drafts'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filter Pills */}
            <View style={[styles.filterRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                {[
                    { key: 'ALL', label: isArabic ? 'الكل' : 'All' },
                    { key: 'PENDING', label: isArabic ? 'معلق للاعتماد' : 'Pending' },
                    { key: 'MINE', label: isArabic ? 'معاملاتي' : 'Mine' }
                ].map(f => {
                    const active = filter === f.key;
                    return (
                        <TouchableOpacity
                            key={f.key}
                            onPress={() => setFilter(f.key)}
                            style={[
                                styles.pill,
                                { backgroundColor: active ? theme.primary : theme.card, borderColor: active ? theme.primary : theme.borderStrong }
                            ]}
                        >
                            <Text style={[styles.pillText, { color: active ? (theme.isDark ? '#000000' : '#ffffff') : theme.subtext, fontWeight: active ? '700' : '500' }]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                ) : filtered.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Ionicons name="wallet-outline" size={48} color={theme.subtext} />
                        <Text style={[styles.emptyText, { color: theme.subtext }]}>{isArabic ? 'لا توجد معاملات مسجلة' : 'No transactions recorded'}</Text>
                    </View>
                ) : (
                    filtered.map(tx => {
                        const isExpense = tx.type === 'EXPENSE' || tx.type === 'expense';
                        const showApprove = canApprove && (tx.status === 'PENDING_APPROVAL' || tx.status === 'pending');
                        const isApproved = tx.status === 'APPROVED' || tx.status === 'approved';

                        return (
                            <View key={tx.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <View style={[styles.txHeader, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                    <Text style={[styles.amount, { color: isExpense ? '#f87171' : '#34d399' }]}>
                                        {isExpense ? '-' : '+'}{currency(tx.amount)}
                                    </Text>
                                    <View style={[styles.badge, { backgroundColor: isApproved ? theme.successLight : theme.warningLight }]}>
                                        <Text style={[styles.badgeText, { color: isApproved ? theme.success : theme.warning }]}>
                                            {getStatusLabel(tx.status)}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={[styles.category, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                                    {getCategoryLabel(tx.category)}
                                </Text>
                                {tx.description ? (
                                    <Text style={[styles.description, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={2}>{tx.description}</Text>
                                ) : null}

                                <View style={[styles.metaRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                    <Text style={[styles.meta, { color: theme.subtext }]}>{fmtDate(tx.transactionDate || tx.createdAt)}</Text>
                                    {tx.project?.name ? (
                                        <Text style={[styles.meta, { color: theme.primary }]} numberOfLines={1}> · {tx.project.name}</Text>
                                    ) : null}
                                </View>

                                {showApprove && (
                                    <View style={[styles.approveRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: theme.success }]}
                                            onPress={() => onApprove(tx.id)}
                                        >
                                            <Text style={styles.actionApproveText}>✓ {isArabic ? 'اعتماد' : 'Approve'}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: 'transparent', borderColor: theme.danger, borderWidth: 1 }]}
                                            onPress={() => onReject(tx.id)}
                                        >
                                            <Text style={[styles.actionRejectText, { color: theme.danger }]}>✕ {isArabic ? 'رفض' : 'Reject'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('AddTransaction')}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={28} color={theme.isDark ? '#000000' : '#ffffff'} />
            </TouchableOpacity>
            </SafeAreaView>
        </GlassBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    header: {
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 36,
        paddingBottom: 14
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800'
    },
    aiDraftsBtn: {
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1
    },
    aiDraftsText: {
        fontSize: 12,
        fontWeight: '700'
    },
    filterRow: {
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 12
    },
    pill: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1
    },
    pillText: {
        fontSize: 12
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 90,
        gap: 10
    },
    card: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1
    },
    txHeader: {
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    amount: {
        fontSize: 18,
        fontWeight: '800'
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
    category: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4
    },
    description: {
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 8
    },
    metaRow: {
        alignItems: 'center'
    },
    meta: {
        fontSize: 11
    },
    approveRow: {
        gap: 8,
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)'
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    actionApproveText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700'
    },
    actionRejectText: {
        fontSize: 12,
        fontWeight: '700'
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6
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

