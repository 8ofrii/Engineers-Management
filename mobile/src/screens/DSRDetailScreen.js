import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
    ActivityIndicator, SafeAreaView, Alert, RefreshControl
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { dsrApi } from '../services/api';

const STATUS_STYLES = {
    DRAFT:        { bg: '#f3f4f6', fg: '#374151' },
    SUBMITTED:    { bg: '#fef3c7', fg: '#92400e' },
    ACKNOWLEDGED: { bg: '#d1fae5', fg: '#065f46' }
};

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB') : '-';
const fmtDateTime = (s) => s ? new Date(s).toLocaleString('en-GB') : '-';

export default function DSRDetailScreen({ route, navigation }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { dsrId } = route.params || {};

    const [dsr, setDsr] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [ackNotes, setAckNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const canAcknowledge = ['PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role);

    const load = useCallback(async () => {
        try {
            const r = await dsrApi.get(dsrId);
            setDsr(r.data?.data || null);
        } catch {
            setDsr(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dsrId]);

    useEffect(() => { load(); }, [load]);

    const onSubmitForReview = async () => {
        Alert.alert(
            t('dsr.submitConfirm') || 'Submit for review?',
            t('dsr.submitConfirmMsg') || 'Once submitted, you cannot edit until a manager rejects it.',
            [
                { text: t('common.cancel') || 'Cancel', style: 'cancel' },
                {
                    text: t('dsr.submit') || 'Submit',
                    onPress: async () => {
                        setSubmitting(true);
                        try {
                            await dsrApi.submit(dsrId);
                            load();
                        } catch (err) {
                            Alert.alert(t('common.error') || 'Error', err.response?.data?.message || err.message);
                        } finally {
                            setSubmitting(false);
                        }
                    }
                }
            ]
        );
    };

    const onAcknowledge = async () => {
        setSubmitting(true);
        try {
            await dsrApi.acknowledge(dsrId, ackNotes);
            Alert.alert(t('dsr.acknowledged') || 'Acknowledged', t('dsr.acknowledgedMsg') || 'Engineer has been notified.');
            setAckNotes('');
            load();
        } catch (err) {
            Alert.alert(t('common.error') || 'Error', err.response?.data?.message || err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" style={{ marginTop: 80 }} />
            </SafeAreaView>
        );
    }

    if (!dsr) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.back}>{'< '}{t('common.back') || 'Back'}</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.empty}>{t('dsr.notFound') || 'Report not found'}</Text>
            </SafeAreaView>
        );
    }

    const sc = STATUS_STYLES[dsr.status] || STATUS_STYLES.DRAFT;
    const isAuthor = dsr.reportedBy === user?.id;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< '}{t('common.back') || 'Back'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{dsr.project?.name}</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            >
                {/* Status + meta */}
                <View style={styles.statusCard}>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.badgeText, { color: sc.fg }]}>{dsr.status}</Text>
                    </View>
                    <Text style={styles.bigDate}>{fmtDate(dsr.reportDate)}</Text>
                    <Text style={styles.reporter}>👷 {dsr.reporter?.name}</Text>
                </View>

                {/* Stats grid */}
                <View style={styles.statsGrid}>
                    {dsr.weather && <Stat label={t('dsr.weather') || 'Weather'} value={dsr.weather} />}
                    {dsr.temperatureC != null && <Stat label={t('dsr.temperature') || 'Temp'} value={`${dsr.temperatureC}°C`} />}
                    {dsr.hoursWorked != null && <Stat label={t('dsr.hours') || 'Hours'} value={`${dsr.hoursWorked}`} />}
                </View>

                {/* Notes sections */}
                <Section title={t('dsr.progress') || 'Progress'} body={dsr.progressNotes} />
                <Section title={t('dsr.issues') || 'Issues'} body={dsr.issues} color="#ef4444" />
                <Section title={t('dsr.visitors') || 'Visitors'} body={dsr.visitorsNotes} hideIfEmpty />

                {/* Workmen attendance */}
                {Array.isArray(dsr.workmenAttendance) && dsr.workmenAttendance.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {t('dsr.attendance') || 'Workmen Attendance'} ({dsr.workmenAttendance.length})
                        </Text>
                        {dsr.workmenAttendance.map((a, i) => (
                            <View key={i} style={styles.attendanceRow}>
                                <Text style={styles.attendanceId}>{a.workmanId?.slice(0, 8)}…</Text>
                                <Text style={styles.attendanceMeta}>
                                    {a.hoursPresent != null ? `${a.hoursPresent}h` : '—'}
                                    {a.role ? ` · ${a.role}` : ''}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Materials received */}
                {Array.isArray(dsr.materialsReceived) && dsr.materialsReceived.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('dsr.materials') || 'Materials Received'}</Text>
                        {dsr.materialsReceived.map((m, i) => (
                            <Text key={i} style={styles.materialLine}>
                                • <Text style={{ fontWeight: '600' }}>{m.name}</Text>
                                {m.quantity != null ? ` — ${m.quantity}${m.unit ? ' ' + m.unit : ''}` : ''}
                                {m.notes ? <Text style={{ color: '#6b7280' }}> ({m.notes})</Text> : null}
                            </Text>
                        ))}
                    </View>
                )}

                {/* Photos count */}
                {Array.isArray(dsr.photos) && dsr.photos.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📷 {t('dsr.photos') || 'Photos'} ({dsr.photos.length})</Text>
                        {dsr.photos.map(p => (
                            <Text key={p.id} style={styles.photoName}>📸 {p.name}</Text>
                        ))}
                    </View>
                )}

                {/* Manager acknowledge form */}
                {canAcknowledge && dsr.status === 'SUBMITTED' && (
                    <View style={styles.actionCard}>
                        <Text style={styles.sectionTitle}>{t('dsr.acknowledge') || 'Acknowledge this report'}</Text>
                        <TextInput
                            style={styles.notesInput}
                            multiline
                            placeholder={t('dsr.ackNotesPlaceholder') || 'Notes for the engineer (optional)…'}
                            value={ackNotes}
                            onChangeText={setAckNotes}
                        />
                        <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: '#10b981' }, submitting && { opacity: 0.6 }]}
                            onPress={onAcknowledge}
                            disabled={submitting}
                        >
                            <Text style={styles.submitText}>
                                {submitting ? '...' : `✓ ${t('dsr.acknowledge') || 'Acknowledge'}`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Author submit (DRAFT) */}
                {dsr.status === 'DRAFT' && isAuthor && (
                    <View style={styles.actionCard}>
                        <Text style={styles.draftHint}>
                            {t('dsr.draftHint') || 'This report is a draft. Submit it for manager review.'}
                        </Text>
                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                            onPress={onSubmitForReview}
                            disabled={submitting}
                        >
                            <Text style={styles.submitText}>
                                {submitting ? '...' : `→ ${t('dsr.submit') || 'Submit for review'}`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Acknowledged note */}
                {dsr.status === 'ACKNOWLEDGED' && dsr.acknowledgeNotes && (
                    <View style={[styles.actionCard, { borderLeftColor: '#10b981' }]}>
                        <Text style={styles.sectionTitle}>{t('dsr.managerNote') || 'Manager note'}</Text>
                        <Text style={styles.ackNote}>"{dsr.acknowledgeNotes}"</Text>
                        <Text style={styles.ackBy}>
                            — {dsr.acknowledger?.name} · {fmtDateTime(dsr.acknowledgedAt)}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const Stat = ({ label, value }) => (
    <View style={styles.statBox}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
    </View>
);

const Section = ({ title, body, color, hideIfEmpty }) => {
    if (!body && hideIfEmpty) return null;
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {body ? (
                <Text style={[styles.bodyText, color ? { color } : null]}>{body}</Text>
            ) : (
                <Text style={styles.emptyText}>—</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 14, paddingTop: 50, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
    },
    back: { color: '#2563eb', fontSize: 14, fontWeight: '600', width: 60 },
    headerTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'center' },
    scrollContent: { padding: 16, paddingBottom: 40 },

    statusCard: {
        backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center'
    },
    badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    bigDate: { fontSize: 22, fontWeight: '700', color: '#111827', marginTop: 8 },
    reporter: { fontSize: 13, color: '#6b7280', marginTop: 4 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
    statBox: {
        flex: 1, minWidth: 100, padding: 12, margin: 4,
        backgroundColor: '#fff', borderRadius: 10,
        borderWidth: 1, borderColor: '#e5e7eb'
    },
    statLabel: { fontSize: 10, color: '#9ca3af', textTransform: 'uppercase' },
    statValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },

    section: {
        backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 10,
        borderWidth: 1, borderColor: '#e5e7eb'
    },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
    bodyText: { fontSize: 14, color: '#111827', lineHeight: 20 },
    emptyText: { color: '#9ca3af', fontStyle: 'italic' },

    attendanceRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6'
    },
    attendanceId: { fontFamily: 'monospace', fontSize: 11, color: '#6b7280' },
    attendanceMeta: { fontSize: 13, color: '#111827' },
    materialLine: { fontSize: 13, marginVertical: 2, color: '#111827' },
    photoName: { fontSize: 13, marginVertical: 2, color: '#374151' },

    actionCard: {
        backgroundColor: '#fff', padding: 14, borderRadius: 10, marginTop: 10,
        borderWidth: 1, borderColor: '#e5e7eb',
        borderLeftWidth: 4, borderLeftColor: '#f59e0b'
    },
    draftHint: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
    notesInput: {
        backgroundColor: '#f9fafb', padding: 12, borderRadius: 8,
        borderWidth: 1, borderColor: '#e5e7eb',
        fontSize: 14, minHeight: 60, textAlignVertical: 'top', marginBottom: 10
    },
    submitBtn: {
        padding: 14, borderRadius: 8, alignItems: 'center',
        backgroundColor: '#2563eb'
    },
    submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    ackNote: { fontSize: 14, fontStyle: 'italic', color: '#111827', marginVertical: 6 },
    ackBy: { fontSize: 11, color: '#6b7280' },

    empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 }
});
