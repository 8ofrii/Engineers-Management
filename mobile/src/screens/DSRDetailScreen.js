import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    SafeAreaView,
    Alert,
    RefreshControl,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dsrApi } from '../services/api';

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB') : '-';
const fmtDateTime = (s) => s ? new Date(s).toLocaleString('en-GB') : '-';

export default function DSRDetailScreen({ route, navigation }) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { user } = useAuth();
    const { theme } = useTheme();
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

    const onRefresh = () => { setRefreshing(true); load(); };

    const onSubmitForReview = async () => {
        Alert.alert(
            isArabic ? 'إرسال للاعتماد؟' : 'Submit for review?',
            isArabic ? 'سيتم إرسال التقرير لمدير المشروع للمراجعة والاعتماد' : 'Once submitted, manager will review it.',
            [
                { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
                {
                    text: isArabic ? 'إرسال' : 'Submit',
                    onPress: async () => {
                        setSubmitting(true);
                        try {
                            await dsrApi.submit(dsrId);
                            load();
                        } catch (err) {
                            Alert.alert(isArabic ? 'خطأ' : 'Error', err.response?.data?.message || err.message);
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
            Alert.alert(isArabic ? 'تم الاعتماد' : 'Acknowledged', isArabic ? 'تم اعتماد التقرير وإشعار المهندس' : 'Engineer has been notified.');
            setAckNotes('');
            load();
        } catch (err) {
            Alert.alert(isArabic ? 'خطأ' : 'Error', err.response?.data?.message || err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 80 }} />
            </SafeAreaView>
        );
    }

    if (!dsr) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>
                <Text style={[styles.empty, { color: theme.subtext }]}>{isArabic ? 'التقرير غير موجود' : 'Report not found'}</Text>
            </SafeAreaView>
        );
    }

    const isDone = dsr.status === 'ACKNOWLEDGED';
    const isPending = dsr.status === 'SUBMITTED';
    const isAuthor = dsr.reportedBy === user?.id;

    const getDSRStatusLabel = (status) => {
        const s = (status || 'DRAFT').toUpperCase();
        if (s === 'ACKNOWLEDGED') return isArabic ? 'معتمد' : 'Acknowledged';
        if (s === 'SUBMITTED') return isArabic ? 'تحت المراجعة' : 'Pending';
        if (s === 'DRAFT') return isArabic ? 'مسودة' : 'Draft';
        return status;
    };

    const getWeatherLabel = (w) => {
        if (!w) return '';
        const map = {
            'HOT': isArabic ? 'حار' : 'Hot',
            'SUNNY': isArabic ? 'مشمس' : 'Sunny',
            'RAINY': isArabic ? 'ممطر' : 'Rainy',
            'WINDY': isArabic ? 'عاصف' : 'Windy',
            'NORMAL': isArabic ? 'معتدل' : 'Normal',
            'CLOUDY': isArabic ? 'غائم' : 'Cloudy'
        };
        return map[w.toUpperCase()] || w;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            <View style={[styles.header, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={1}>{dsr.project?.name || (isArabic ? 'تفاصيل التقرير' : 'Report Details')}</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={[
                        styles.badge,
                        { backgroundColor: isDone ? theme.successLight : isPending ? theme.warningLight : theme.primaryLight }
                    ]}>
                        <Text style={[
                            styles.badgeText,
                            { color: isDone ? theme.success : isPending ? theme.warning : theme.primary }
                        ]}>
                            {getDSRStatusLabel(dsr.status)}
                        </Text>
                    </View>
                    <Text style={[styles.bigDate, { color: theme.text }]}>{fmtDate(dsr.reportDate)}</Text>
                    <Text style={[styles.reporter, { color: theme.primary }]}>👷 {dsr.reporter?.name || (isArabic ? 'مهندس الموقع' : 'Site Engineer')}</Text>
                </View>

                <View style={[styles.statsGrid, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                    {dsr.weather && <Stat label={isArabic ? 'الطقس' : 'Weather'} value={getWeatherLabel(dsr.weather)} theme={theme} isArabic={isArabic} />}
                    {dsr.temperatureC != null && <Stat label={isArabic ? 'الحرارة' : 'Temp'} value={`${dsr.temperatureC}°C`} theme={theme} isArabic={isArabic} />}
                    {dsr.hoursWorked != null && <Stat label={isArabic ? 'ساعات العمل' : 'Hours'} value={`${dsr.hoursWorked}${isArabic ? ' س' : 'h'}`} theme={theme} isArabic={isArabic} />}
                </View>

                <Section title={isArabic ? 'الأعمال المنجزة' : 'Progress'} body={dsr.progressNotes} theme={theme} isArabic={isArabic} />
                <Section title={isArabic ? 'المعوقات والملاحظات' : 'Issues'} body={dsr.issues} color="#f87171" theme={theme} isArabic={isArabic} />
                <Section title={isArabic ? 'الزوار والملاحظات الخارجية' : 'Visitors'} body={dsr.visitorsNotes} hideIfEmpty theme={theme} isArabic={isArabic} />

                {Array.isArray(dsr.workmenAttendance) && dsr.workmenAttendance.length > 0 && (
                    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Text style={[styles.sectionTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                            {isArabic ? 'حضور العمال' : 'Workmen Attendance'} ({dsr.workmenAttendance.length})
                        </Text>
                        {dsr.workmenAttendance.map((a, i) => (
                            <View key={i} style={[styles.attendanceRow, { borderBottomColor: theme.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                <Text style={[styles.attendanceId, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{a.workmanId?.slice(0, 8)}…</Text>
                                <Text style={[styles.attendanceMeta, { color: theme.primary, textAlign: isArabic ? 'right' : 'left' }]}>
                                    {a.hoursPresent != null ? `${a.hoursPresent}${isArabic ? ' س' : 'h'}` : '—'}
                                    {a.role ? ` · ${a.role}` : ''}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {canAcknowledge && dsr.status === 'SUBMITTED' && (
                    <View style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border, [isArabic ? 'borderRightWidth' : 'borderLeftWidth']: 4, [isArabic ? 'borderRightColor' : 'borderLeftColor']: theme.warning }]}>
                        <Text style={[styles.sectionTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'اعتماد التقرير اليومي' : 'Acknowledge this report'}</Text>
                        <TextInput
                            style={[styles.notesInput, { backgroundColor: theme.cardAlt, borderColor: theme.borderStrong, color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                            multiline
                            placeholder={isArabic ? 'ملاحظات إضافية للمهندس (اختياري)...' : 'Notes for the engineer (optional)…'}
                            placeholderTextColor={theme.subtext}
                            value={ackNotes}
                            onChangeText={setAckNotes}
                        />
                        <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: theme.success }, submitting && { opacity: 0.6 }]}
                            onPress={onAcknowledge}
                            disabled={submitting}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.submitText}>
                                {submitting ? '...' : `✓ ${isArabic ? 'اعتماد التقرير' : 'Acknowledge'}`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {dsr.status === 'DRAFT' && isAuthor && (
                    <View style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border, [isArabic ? 'borderRightWidth' : 'borderLeftWidth']: 4, [isArabic ? 'borderRightColor' : 'borderLeftColor']: theme.primary }]}>
                        <Text style={[styles.draftHint, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                            {isArabic ? 'هذا التقرير مسودة، اضغط لإرساله للاعتماد.' : 'This report is a draft. Submit it for manager review.'}
                        </Text>
                        <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: theme.primary }, submitting && { opacity: 0.6 }]}
                            onPress={onSubmitForReview}
                            disabled={submitting}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.submitText}>
                                {submitting ? '...' : `→ ${isArabic ? 'إرسال للاعتماد' : 'Submit for review'}`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {dsr.status === 'ACKNOWLEDGED' && dsr.acknowledgeNotes && (
                    <View style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border, [isArabic ? 'borderRightWidth' : 'borderLeftWidth']: 4, [isArabic ? 'borderRightColor' : 'borderLeftColor']: theme.success }]}>
                        <Text style={[styles.sectionTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'ملاحظات الإدارة' : 'Manager note'}</Text>
                        <Text style={[styles.ackNote, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>"{dsr.acknowledgeNotes}"</Text>
                        <Text style={[styles.ackBy, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                            — {dsr.acknowledger?.name} · {fmtDateTime(dsr.acknowledgedAt)}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const Stat = ({ label, value, theme, isArabic }) => (
    <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border, alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.statLabel, { color: theme.subtext }]}>{label}</Text>
        <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
    </View>
);

const Section = ({ title, body, color, hideIfEmpty, theme, isArabic }) => {
    if (!body && hideIfEmpty) return null;
    return (
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{title}</Text>
            {body ? (
                <Text style={[styles.bodyText, { color: color || theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{body}</Text>
            ) : (
                <Text style={[styles.emptyText, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>—</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 36,
        paddingBottom: 14,
        gap: 12
    },
    backBtn: { padding: 6 },
    headerTitle: { fontSize: 18, fontWeight: '800', flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 90 },
    statusCard: {
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        alignItems: 'center'
    },
    badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '800' },
    bigDate: { fontSize: 22, fontWeight: '800', marginTop: 8 },
    reporter: { fontSize: 13, fontWeight: '600', marginTop: 4 },
    statsGrid: { flexWrap: 'wrap', marginBottom: 8 },
    statBox: {
        flex: 1,
        minWidth: 100,
        padding: 12,
        margin: 4,
        borderRadius: 12,
        borderWidth: 1
    },
    statLabel: { fontSize: 10, textTransform: 'uppercase' },
    statValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
    section: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
    bodyText: { fontSize: 13, lineHeight: 20 },
    emptyText: { fontSize: 13 },
    attendanceRow: {
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1
    },
    attendanceId: { fontSize: 13, fontWeight: '600' },
    attendanceMeta: { fontSize: 12, fontWeight: '600' },
    actionCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 14
    },
    notesInput: {
        borderRadius: 10,
        padding: 12,
        height: 70,
        fontSize: 13,
        borderWidth: 1,
        marginBottom: 10
    },
    submitBtn: {
        borderRadius: 10,
        alignItems: 'center'
    },
    submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    ackNote: { fontSize: 14, fontStyle: 'italic', marginVertical: 6 },
    ackBy: { fontSize: 11 },
    empty: { textAlign: 'center', marginTop: 40 }
});

