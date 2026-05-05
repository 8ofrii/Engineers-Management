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
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { transactionsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFormat } from '../utils/format';

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB') : '-';

const STATUS_COLORS = {
    DRAFT:            { bg: '#f3f4f6', fg: '#374151' },
    PENDING_APPROVAL: { bg: '#fef3c7', fg: '#92400e' },
    APPROVED:         { bg: '#d1fae5', fg: '#065f46' },
    REJECTED:         { bg: '#fee2e2', fg: '#991b1b' },
    CANCELLED:        { bg: '#e5e7eb', fg: '#6b7280' }
};

export default function FinanceScreen({ navigation }) {
    const { t } = useTranslation();
    const { user } = useAuth();
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

    const onApprove = async (id) => {
        try {
            await transactionsApi.approve(id);
            Alert.alert(t('finance.approved'), t('finance.approvedMsg'));
            load();
        } catch (err) {
            Alert.alert(t('common.error'), err.response?.data?.message || err.message);
        }
    };

    const onReject = async (id) => {
        Alert.prompt
            ? Alert.prompt(t('finance.rejectTitle'), t('finance.rejectReason'), async (reason) => {
                try {
                    await transactionsApi.reject(id, reason || 'Rejected via mobile');
                    load();
                } catch (err) {
                    Alert.alert(t('common.error'), err.response?.data?.message || err.message);
                }
            })
            : (async () => {
                try {
                    await transactionsApi.reject(id, 'Rejected via mobile');
                    load();
                } catch (err) {
                    Alert.alert(t('common.error'), err.response?.data?.message || err.message);
                }
            })();
    };

    const filtered = filter === 'MINE'
        ? transactions.filter(t => t.createdBy === user?.id)
        : transactions;

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <Text style={styles.title}>{t('finance.title')}</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('DraftsList')}
                    style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingHorizontal: 12, paddingVertical: 8,
                        backgroundColor: '#dbeafe', borderRadius: 20
                    }}
                >
                    <Ionicons name="sparkles" size={16} color="#1e40af" />
                    <Text style={{ color: '#1e40af', fontWeight: '600', fontSize: 12 }}>AI Drafts</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.filterRow}>
                {['ALL', 'PENDING', 'MINE'].map(f => (
                    <TouchableOpacity
                        key={f}
                        onPress={() => setFilter(f)}
                        style={[styles.pill, filter === f && styles.pillActive]}
                    >
                        <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
                            {t(`finance.filter.${f}`)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" style={{ marginTop: 40 }} />
                ) : filtered.length === 0 ? (
                    <Text style={styles.empty}>{t('finance.noTransactions')}</Text>
                ) : (
                    filtered.map(tx => {
                        const sc = STATUS_COLORS[tx.status] || STATUS_COLORS.DRAFT;
                        const isExpense = tx.type === 'EXPENSE';
                        const showApprove = canApprove && tx.status === 'PENDING_APPROVAL';
                        return (
                            <View key={tx.id} style={styles.card}>
                                <View style={styles.txHeader}>
                                    <Text style={[styles.amount, { color: isExpense ? '#ef4444' : '#10b981' }]}>
                                        {isExpense ? '-' : '+'}{currency(tx.amount)}
                                    </Text>
                                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                                        <Text style={[styles.badgeText, { color: sc.fg }]}>
                                            {t(`txStatus.${tx.status}`)}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.category}>{tx.category?.replace(/_/g, ' ')}</Text>
                                {tx.description ? (
                                    <Text style={styles.description} numberOfLines={2}>{tx.description}</Text>
                                ) : null}
                                <View style={styles.metaRow}>
                                    <Text style={styles.meta}>{fmtDate(tx.transactionDate || tx.createdAt)}</Text>
                                    {tx.project?.name ? (
                                        <Text style={styles.meta} numberOfLines={1}> · {tx.project.name}</Text>
                                    ) : null}
                                </View>
                                {showApprove && (
                                    <View style={styles.approveRow}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.actionApprove]}
                                            onPress={() => onApprove(tx.id)}
                                        >
                                            <Text style={styles.actionApproveText}>✓ {t('finance.approve')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.actionReject]}
                                            onPress={() => onReject(tx.id)}
                                        >
                                            <Text style={styles.actionRejectText}>✕ {t('finance.reject')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddTransaction')}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: {
        padding: 16, paddingTop: 50, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
    },
    title: { fontSize: 22, fontWeight: '700', color: '#111827' },

    filterRow: {
        flexDirection: 'row', padding: 12, gap: 8,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
    },
    pill: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: '#f3f4f6'
    },
    pillActive: { backgroundColor: '#2563eb' },
    pillText: { fontSize: 13, color: '#374151', fontWeight: '500' },
    pillTextActive: { color: '#fff' },

    scrollContent: { padding: 16, paddingBottom: 90 },

    card: {
        backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: '#e5e7eb'
    },
    txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    amount: { fontSize: 18, fontWeight: '700' },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '600' },
    category: { fontSize: 13, color: '#374151', marginTop: 6, fontWeight: '500' },
    description: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    metaRow: { flexDirection: 'row', marginTop: 6 },
    meta: { fontSize: 11, color: '#9ca3af' },

    approveRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    actionBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center'
    },
    actionApprove: { backgroundColor: '#10b981' },
    actionApproveText: { color: '#fff', fontWeight: '600' },
    actionReject: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ef4444' },
    actionRejectText: { color: '#ef4444', fontWeight: '600' },

    empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },

    fab: {
        position: 'absolute', right: 20, bottom: 20,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25, shadowRadius: 4, elevation: 5
    }
});
