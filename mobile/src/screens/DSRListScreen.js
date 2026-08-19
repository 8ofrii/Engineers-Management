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
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { dsrApi } from '../services/api';

import { useFocusEffect } from '@react-navigation/native';
import AICopilotHeaderButton from '../components/AICopilotHeaderButton';
import GlassBackground from '../components/GlassBackground';

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB') : '-';

export default function DSRListScreen({ navigation }) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();
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
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const onRefresh = () => { setRefreshing(true); load(); };

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
        <GlassBackground>
            <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
                {/* Header */}
                <View style={[styles.header, { flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <Text style={[styles.headerTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left', flex: 1 }]}>
                    {isArabic ? 'التقارير اليومية للموقع' : 'Daily Site Reports'}
                </Text>
                <AICopilotHeaderButton navigation={navigation} compact />
            </View>

            {/* Filter Pills */}
            <View style={[styles.filterRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                {[
                    { key: 'ALL', label: isArabic ? 'الكل' : 'All' },
                    { key: 'DRAFT', label: isArabic ? 'مسودة' : 'Draft' },
                    { key: 'SUBMITTED', label: isArabic ? 'تحت المراجعة' : 'Pending' },
                    { key: 'ACKNOWLEDGED', label: isArabic ? 'معتمدة' : 'Acknowledged' }
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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                ) : reports.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Ionicons name="clipboard-outline" size={48} color={theme.subtext} />
                        <Text style={[styles.emptyText, { color: theme.subtext }]}>{isArabic ? 'لا توجد تقارير مسجلة بعد' : 'No daily reports yet'}</Text>
                    </View>
                ) : (
                    reports.map(r => {
                        const isDone = r.status === 'ACKNOWLEDGED';
                        const isPending = r.status === 'SUBMITTED';

                        return (
                            <TouchableOpacity
                                key={r.id}
                                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate('DSRDetail', { dsrId: r.id })}
                            >
                                <View style={[styles.cardHeader, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                    <Text style={[styles.projectName, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={1}>
                                        {r.project?.name || (isArabic ? 'مشروع بدون اسم' : 'General Project')}
                                    </Text>
                                    <View style={[
                                        styles.badge,
                                        { backgroundColor: isDone ? theme.successLight : isPending ? theme.warningLight : theme.primaryLight }
                                    ]}>
                                        <Text style={[
                                            styles.badgeText,
                                            { color: isDone ? theme.success : isPending ? theme.warning : theme.primary }
                                        ]}>
                                            {getDSRStatusLabel(r.status)}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={[styles.dateLine, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                                    📅 {fmtDate(r.reportDate)}
                                    {r.weather ? ` · ☀️ ${getWeatherLabel(r.weather)}` : ''}
                                    {r.hoursWorked != null ? ` · ⏱️ ${r.hoursWorked}${isArabic ? ' س' : 'h'}` : ''}
                                </Text>

                                <Text style={[styles.reporter, { color: theme.primary, textAlign: isArabic ? 'right' : 'left' }]}>
                                    👷 {r.reporter?.name || (isArabic ? 'مهندس الموقع' : 'Site Engineer')}
                                </Text>

                                {r.progressNotes ? (
                                    <Text style={[styles.preview, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={2}>
                                        {r.progressNotes}
                                    </Text>
                                ) : null}

                                {r.issues ? (
                                    <View style={[styles.issueBox, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                        <Ionicons name="warning-outline" size={13} color="#ef4444" />
                                        <Text style={[styles.issueText, { textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={1}>
                                            {r.issues}
                                        </Text>
                                    </View>
                                ) : null}
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('DSRCreate')}
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
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 36,
        paddingBottom: 14
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800'
    },
    filterRow: {
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap'
    },
    pill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
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
    cardHeader: {
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8
    },
    projectName: {
        fontSize: 15,
        fontWeight: '700',
        flex: 1
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
    dateLine: {
        fontSize: 13,
        marginTop: 6
    },
    reporter: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2
    },
    preview: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 6
    },
    issueBox: {
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 6
    },
    issueText: {
        fontSize: 11,
        color: '#f87171',
        fontWeight: '600'
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
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6
    }
});


