import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    TouchableOpacity
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { projectsApi, transactionsApi } from '../services/api';
import DraftCaptureFAB from '../components/DraftCaptureFAB';

const STATUS_STYLES = {
    PLANNING:    { bg: '#dbeafe', fg: '#1e40af' },
    IN_PROGRESS: { bg: '#d1fae5', fg: '#065f46' },
    ON_HOLD:     { bg: '#fef3c7', fg: '#92400e' },
    COMPLETED:   { bg: '#e5e7eb', fg: '#374151' },
    CANCELLED:   { bg: '#fee2e2', fg: '#991b1b' }
};

const fmtEGP = (n) => {
    const num = Number(n || 0);
    return num.toLocaleString('en-EG', { maximumFractionDigits: 0 });
};

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB') : '-';

export default function ProjectDetailScreen({ route, navigation }) {
    const { t } = useTranslation();
    const { projectId, projectName } = route.params || {};
    const [project, setProject] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const [pRes, tRes] = await Promise.all([
                projectsApi.get(projectId),
                transactionsApi.list({ projectId }).catch(() => ({ data: { data: [] } }))
            ]);
            setProject(pRes.data?.data || null);
            const tx = tRes.data?.data || [];
            setTransactions(Array.isArray(tx) ? tx : (tx.transactions || []));
        } catch (err) {
            setProject(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" style={{ marginTop: 80 }} />
            </SafeAreaView>
        );
    }

    if (!project) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backLink}>{'< '}{t('common.back')}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>{t('project.notFound')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const status = STATUS_STYLES[project.status] || STATUS_STYLES.PLANNING;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backLink}>{'< '}{t('common.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{projectName || project.name}</Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            >
                {/* Project info card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.projectName} numberOfLines={3}>{project.name}</Text>
                        <View style={[styles.badge, { backgroundColor: status.bg }]}>
                            <Text style={[styles.badgeText, { color: status.fg }]}>
                                {t(`status.${project.status}`)}
                            </Text>
                        </View>
                    </View>
                    {project.description ? (
                        <Text style={styles.description}>{project.description}</Text>
                    ) : null}

                    <View style={styles.infoGrid}>
                        <Info label={t('project.client')} value={project.client?.name} />
                        <Info label={t('project.engineer')} value={project.engineer?.name} />
                        <Info label={t('project.location')} value={project.location} />
                        <Info label={t('project.type')} value={project.projectType} />
                        <Info label={t('project.startDate')} value={fmtDate(project.startDate)} />
                        <Info label={t('project.endDate')} value={fmtDate(project.endDate)} />
                        <Info label={t('project.revenueModel')} value={project.revenueModel?.replace(/_/g, ' ')} />
                        {project.managementFeePercent && (
                            <Info label={t('project.mgmtFee')} value={`${project.managementFeePercent}%`} />
                        )}
                    </View>
                </View>

                {/* Financial summary */}
                <Text style={styles.sectionTitle}>{t('project.financials')}</Text>
                <View style={styles.financeGrid}>
                    <FinanceCell label={t('project.budget')} value={project.budget} color="#3b82f6" />
                    <FinanceCell label={t('project.actualCost')} value={project.actualCost} color="#ef4444" />
                    <FinanceCell label={t('project.officeRevenue')} value={project.officeRevenue} color="#10b981" />
                    <FinanceCell
                        label={t('project.safeBalance')}
                        value={project.projectSafeBalance}
                        color={Number(project.projectSafeBalance) < 0 ? '#ef4444' : '#0ea5e9'}
                    />
                </View>

                {/* Add transaction button */}
                <TouchableOpacity
                    style={styles.addTxButton}
                    onPress={() => navigation.navigate('FinanceTab', {
                        screen: 'AddTransaction',
                        params: { projectId: project.id, projectName: project.name }
                    })}
                >
                    <Text style={styles.addTxButtonText}>+ {t('project.addTransaction')}</Text>
                </TouchableOpacity>

                {/* Transactions */}
                <Text style={styles.sectionTitle}>
                    {t('project.transactions')} ({transactions.length})
                </Text>
                {transactions.length === 0 ? (
                    <Text style={styles.emptyText}>{t('project.noTransactions')}</Text>
                ) : (
                    transactions.slice(0, 20).map((tx) => (
                        <View key={tx.id} style={styles.txCard}>
                            <View style={styles.txHeader}>
                                <Text style={[
                                    styles.txAmount,
                                    { color: tx.type === 'INCOME' ? '#10b981' : '#ef4444' }
                                ]}>
                                    {tx.type === 'INCOME' ? '+' : '-'}{fmtEGP(tx.amount)} EGP
                                </Text>
                                <Text style={styles.txStatus}>{tx.status}</Text>
                            </View>
                            <Text style={styles.txCategory}>{tx.category?.replace(/_/g, ' ')}</Text>
                            {tx.description ? (
                                <Text style={styles.txDescription} numberOfLines={2}>{tx.description}</Text>
                            ) : null}
                            <Text style={styles.txDate}>{fmtDate(tx.transactionDate || tx.createdAt)}</Text>
                        </View>
                    ))
                )}
                {transactions.length > 20 ? (
                    <Text style={styles.moreText}>+ {transactions.length - 20} more</Text>
                ) : null}
            </ScrollView>
            <DraftCaptureFAB />
        </SafeAreaView>
    );
}

const Info = ({ label, value }) => (
    <View style={styles.infoCell}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>{value || '-'}</Text>
    </View>
);

const FinanceCell = ({ label, value, color }) => (
    <View style={styles.financeCell}>
        <Text style={styles.financeLabel}>{label}</Text>
        <Text style={[styles.financeValue, { color }]}>
            {fmtEGP(value)}
        </Text>
        <Text style={styles.financeUnit}>EGP</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 14, paddingTop: 50, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
    },
    backLink: { color: '#2563eb', fontSize: 14, fontWeight: '600', width: 60 },
    headerTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'center' },

    scrollContent: { padding: 16, paddingBottom: 40 },

    card: {
        backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
        borderWidth: 1, borderColor: '#e5e7eb'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    projectName: { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1 },
    description: { fontSize: 13, color: '#6b7280', marginTop: 8 },

    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '600' },

    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
    infoCell: { width: '50%', paddingVertical: 6 },
    infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
    infoValue: { fontSize: 13, color: '#374151', fontWeight: '500' },

    sectionTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 10, marginTop: 8 },

    financeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
    financeCell: {
        width: '48%', margin: '1%', padding: 12,
        backgroundColor: '#fff', borderRadius: 10,
        borderWidth: 1, borderColor: '#e5e7eb'
    },
    financeLabel: { fontSize: 11, color: '#6b7280' },
    financeValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
    financeUnit: { fontSize: 10, color: '#9ca3af' },

    txCard: {
        backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8,
        borderWidth: 1, borderColor: '#e5e7eb'
    },
    txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    txAmount: { fontSize: 15, fontWeight: '700' },
    txStatus: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
    txCategory: { fontSize: 12, color: '#374151', marginTop: 4, fontWeight: '500' },
    txDescription: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    txDate: { fontSize: 11, color: '#9ca3af', marginTop: 6 },

    moreText: { textAlign: 'center', color: '#9ca3af', marginTop: 8, fontSize: 12 },

    addTxButton: {
        backgroundColor: '#2563eb', padding: 14, borderRadius: 10,
        alignItems: 'center', marginTop: 8, marginBottom: 8
    },
    addTxButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

    empty: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#9ca3af', textAlign: 'center', padding: 20 }
});
