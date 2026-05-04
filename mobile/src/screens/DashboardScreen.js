import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
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
    if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return num.toFixed(0);
};

export default function DashboardScreen({ navigation }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const [pRes, sRes] = await Promise.all([
                projectsApi.list(),
                transactionsApi.stats().catch(() => ({ data: { data: null } }))
            ]);
            setProjects(pRes.data?.data || []);
            setStats(sRes.data?.data || null);
        } catch (err) {
            // Silent fail; UI shows empty state
            setProjects([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const onRefresh = () => { setRefreshing(true); load(); };

    const totalBudget = projects.reduce((s, p) => s + Number(p.budget || 0), 0);
    const totalSafe = projects.reduce((s, p) => s + Number(p.projectSafeBalance || 0), 0);
    const activeCount = projects.filter(p => p.status === 'IN_PROGRESS').length;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>{t('dashboard.title')}</Text>
                    <Text style={styles.welcome}>{t('dashboard.welcome', { name: user?.name })}</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Quick stats */}
                {!loading && (
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>{t('dashboard.projects')}</Text>
                            <Text style={styles.statValue}>{projects.length}</Text>
                            <Text style={styles.statSub}>{activeCount} {t('dashboard.active').toLowerCase()}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>{t('dashboard.totalBudget')}</Text>
                            <Text style={styles.statValue}>{fmtEGP(totalBudget)}</Text>
                            <Text style={styles.statSub}>EGP</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>{t('dashboard.safeBalance')}</Text>
                            <Text style={[styles.statValue, totalSafe < 0 && { color: '#ef4444' }]}>
                                {fmtEGP(totalSafe)}
                            </Text>
                            <Text style={styles.statSub}>EGP</Text>
                        </View>
                    </View>
                )}

                <Text style={styles.sectionTitle}>{t('dashboard.projects')}</Text>

                {loading ? (
                    <ActivityIndicator size="large" style={{ marginTop: 40 }} />
                ) : projects.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>{t('dashboard.noProjects')}</Text>
                    </View>
                ) : (
                    projects.map((p) => {
                        const status = STATUS_STYLES[p.status] || STATUS_STYLES.PLANNING;
                        const budget = Number(p.budget || 0);
                        const spent = Number(p.actualCost || 0);
                        const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
                        return (
                            <TouchableOpacity
                                key={p.id}
                                style={styles.card}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate('ProjectDetail', { projectId: p.id, projectName: p.name })}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle} numberOfLines={2}>{p.name}</Text>
                                    <View style={[styles.badge, { backgroundColor: status.bg }]}>
                                        <Text style={[styles.badgeText, { color: status.fg }]}>
                                            {t(`status.${p.status}`)}
                                        </Text>
                                    </View>
                                </View>
                                {p.client?.name ? <Text style={styles.cardMeta}>{p.client.name}</Text> : null}
                                {p.location ? <Text style={styles.cardMeta}>📍 {p.location}</Text> : null}

                                <View style={styles.progressRow}>
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${pct}%` }]} />
                                    </View>
                                    <Text style={styles.progressText}>
                                        {fmtEGP(spent)} / {fmtEGP(budget)} EGP
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
            <DraftCaptureFAB />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: 16, paddingTop: 50, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
    },
    title: { fontSize: 22, fontWeight: '700', color: '#111827' },
    welcome: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: 8 },
    iconBtn: { paddingHorizontal: 10, paddingVertical: 6 },
    iconBtnText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },

    scrollContent: { padding: 16, paddingBottom: 40 },

    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    statCard: {
        flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#fff',
        borderWidth: 1, borderColor: '#e5e7eb'
    },
    statLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
    statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
    statSub: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },

    card: {
        backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: '#e5e7eb'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    cardMeta: { fontSize: 13, color: '#6b7280', marginTop: 4 },

    progressRow: { marginTop: 10 },
    progressBar: {
        height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden'
    },
    progressFill: { height: '100%', backgroundColor: '#3b82f6' },
    progressText: { fontSize: 11, color: '#6b7280', marginTop: 4 },

    empty: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#9ca3af' }
});
