import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, RefreshControl, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { dsrApi } from '../services/api';

const STATUS_STYLES = {
    DRAFT:        { bg: '#f3f4f6', fg: '#374151' },
    SUBMITTED:    { bg: '#fef3c7', fg: '#92400e' },
    ACKNOWLEDGED: { bg: '#d1fae5', fg: '#065f46' }
};

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB') : '-';

export default function DSRListScreen({ navigation }) {
    const { t } = useTranslation();
    const [filter, setFilter] = useState('ALL');
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const params = filter === 'ALL' ? {} : { status: filter };
            const res = await dsrApi.list(params);
            setReports(res.data?.data || []);
        } catch {
            setReports([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('dsr.title') || 'Daily Reports'}</Text>
            </View>

            <View style={styles.filterRow}>
                {['ALL', 'DRAFT', 'SUBMITTED', 'ACKNOWLEDGED'].map(f => (
                    <TouchableOpacity
                        key={f}
                        onPress={() => setFilter(f)}
                        style={[styles.pill, filter === f && styles.pillActive]}
                    >
                        <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
                            {f === 'ALL' ? (t('dsr.filter.all') || 'All')
                                : f === 'DRAFT' ? (t('dsr.filter.draft') || 'Draft')
                                : f === 'SUBMITTED' ? (t('dsr.filter.submitted') || 'Pending')
                                : (t('dsr.filter.acknowledged') || 'Acknowledged')}
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
                ) : reports.length === 0 ? (
                    <Text style={styles.empty}>{t('dsr.empty') || 'No daily reports yet'}</Text>
                ) : (
                    reports.map(r => {
                        const sc = STATUS_STYLES[r.status] || STATUS_STYLES.DRAFT;
                        return (
                            <TouchableOpacity
                                key={r.id}
                                style={styles.card}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate('DSRDetail', { dsrId: r.id })}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={styles.projectName} numberOfLines={1}>
                                        {r.project?.name || 'Unknown project'}
                                    </Text>
                                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                                        <Text style={[styles.badgeText, { color: sc.fg }]}>{r.status}</Text>
                                    </View>
                                </View>
                                <Text style={styles.dateLine}>
                                    📅 {fmtDate(r.reportDate)}
                                    {r.weather ? ` · ${r.weather}` : ''}
                                    {r.hoursWorked != null ? ` · ${r.hoursWorked}h` : ''}
                                </Text>
                                <Text style={styles.reporter}>
                                    👷 {r.reporter?.name || 'Unknown'}
                                </Text>
                                {r.progressNotes ? (
                                    <Text style={styles.preview} numberOfLines={2}>
                                        {r.progressNotes}
                                    </Text>
                                ) : null}
                                {r.issues ? (
                                    <Text style={styles.issuePreview} numberOfLines={1}>
                                        ⚠️ {r.issues}
                                    </Text>
                                ) : null}
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
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
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
        flexWrap: 'wrap'
    },
    pill: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
        backgroundColor: '#f3f4f6'
    },
    pillActive: { backgroundColor: '#2563eb' },
    pillText: { fontSize: 12, color: '#374151', fontWeight: '500' },
    pillTextActive: { color: '#fff' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    card: {
        backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: '#e5e7eb'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    projectName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '700' },
    dateLine: { fontSize: 13, color: '#6b7280', marginTop: 6 },
    reporter: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    preview: { fontSize: 13, color: '#111827', marginTop: 6 },
    issuePreview: { fontSize: 12, color: '#ef4444', marginTop: 4 },
    empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 }
});
