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
    Platform,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { projectsApi, transactionsApi, dsrApi } from '../services/api';
import DraftCaptureFAB from '../components/DraftCaptureFAB';

const STATUS_STYLES = {
    PLANNING:    { bg: 'rgba(59, 130, 246, 0.15)', fg: '#3b82f6', label: 'Planning', labelAr: 'تخطيط' },
    IN_PROGRESS: { bg: 'rgba(16, 185, 129, 0.15)', fg: '#10b981', label: 'In Progress', labelAr: 'شغال' },
    ON_HOLD:     { bg: 'rgba(245, 158, 11, 0.15)', fg: '#f59e0b', label: 'On Hold', labelAr: 'واقف' },
    COMPLETED:   { bg: 'rgba(148, 163, 184, 0.15)', fg: '#64748b', label: 'Completed', labelAr: 'خلصان' },
    CANCELLED:   { bg: 'rgba(239, 68, 68, 0.15)', fg: '#ef4444', label: 'Cancelled', labelAr: 'ملغي' }
};

const fmtEGP = (n) => {
    const num = Number(n || 0);
    if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return num.toLocaleString();
};

export default function DashboardScreen({ navigation }) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { user } = useAuth();
    const { theme } = useTheme();
    const [projects, setProjects] = useState([]);
    const [todaySummary, setTodaySummary] = useState({
        activeProjects: 0,
        dsrCount: 0,
        todayIncome: 0,
        todayExpense: 0
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const [pRes, tRes, dsrRes] = await Promise.all([
                projectsApi.list(),
                transactionsApi.list().catch(() => ({ data: { data: [] } })),
                dsrApi.list().catch(() => ({ data: { data: [] } }))
            ]);

            const projectList = pRes.data?.data || [];
            const txList = tRes.data?.data || tRes.data?.transactions || [];
            const dsrList = dsrRes.data?.data || [];

            setProjects(projectList);

            // Compute Today's Summary
            const todayStr = new Date().toISOString().slice(0, 10);
            const activeProjectsCount = projectList.filter(p => p.status === 'IN_PROGRESS' || p.status === 'in_progress').length;
            const dsrsTodayCount = dsrList.filter(d => (d.date || d.createdAt || '').slice(0, 10) === todayStr).length;

            const todayIncomeSum = txList
                .filter(tx => (tx.type === 'INCOME' || tx.type === 'income') && (tx.transactionDate || tx.createdAt || '').slice(0, 10) === todayStr && tx.status === 'APPROVED')
                .reduce((s, tx) => s + Number(tx.amount || 0), 0);

            const todayExpenseSum = txList
                .filter(tx => (tx.type === 'EXPENSE' || tx.type === 'expense') && (tx.transactionDate || tx.createdAt || '').slice(0, 10) === todayStr && tx.status === 'APPROVED')
                .reduce((s, tx) => s + Number(tx.amount || 0), 0);

            setTodaySummary({
                activeProjects: activeProjectsCount,
                dsrCount: dsrsTodayCount,
                todayIncome: todayIncomeSum,
                todayExpense: todayExpenseSum
            });
        } catch (err) {
            setProjects([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const onRefresh = () => { setRefreshing(true); load(); };

    const totalSafe = projects.reduce((s, p) => s + Number(p.projectSafeBalance || 0), 0);
    const totalProfit = projects.reduce((s, p) => s + Number(p.officeRevenue || 0), 0);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={[styles.header, { flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center' }]}>
                <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Image
                        source={require('../../assets/icon.png')}
                        style={{ width: 40, height: 40, borderRadius: 10 }}
                        resizeMode="contain"
                    />
                    <View style={{ alignItems: isArabic ? 'flex-end' : 'flex-start' }}>
                        <Text style={[styles.welcomeText, { color: theme.subtext }]}>
                            {isArabic ? `مرحباً، ${user?.name || 'المهندس'}` : `Welcome, ${user?.name || 'Engineer'}`}
                        </Text>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Hesaby ERP</Text>
                    </View>
                </View>
                <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                        style={[styles.aiHeaderBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
                        onPress={() => navigation.navigate('AIChat')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="sparkles" size={16} color={theme.primary} />
                        <Text style={[styles.aiHeaderBtnText, { color: theme.primary }]}>{isArabic ? 'المساعد' : 'Copilot'}</Text>
                    </TouchableOpacity>
                    <View style={[styles.userBadge, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.userInitials, { color: theme.primary }]}>
                            {(user?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </Text>
                    </View>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* 🤖 AI Copilot Quick Launcher Banner */}
                <TouchableOpacity
                    style={[styles.copilotBanner, { backgroundColor: theme.card, borderColor: theme.border, [isArabic ? 'borderRightWidth' : 'borderLeftWidth']: 4, [isArabic ? 'borderRightColor' : 'borderLeftColor']: theme.primary }]}
                    onPress={() => navigation.navigate('AIChat')}
                    activeOpacity={0.85}
                >
                    <View style={[styles.copilotBannerRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.copilotIconBox, { backgroundColor: theme.primaryLight }]}>
                            <Ionicons name="sparkles" size={22} color={theme.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.copilotTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                                    {isArabic ? 'المساعد الذكي Copilot' : 'AI Copilot Assistant'}
                                </Text>
                                <View style={[styles.copilotLivePill, { backgroundColor: theme.successLight }]}>
                                    <Text style={[styles.copilotLiveText, { color: theme.success }]}>{isArabic ? 'متصل' : 'Active'}</Text>
                                </View>
                            </View>
                            <Text style={[styles.copilotSubtitle, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                                {isArabic ? 'اسأل عن المصاريف، الميزانيات، أو سجل بالصوت' : 'Ask about cashflow, project budgets, or voice log'}
                            </Text>
                        </View>
                        <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.primary} />
                    </View>
                </TouchableOpacity>

                {/* 🌟 Today's Summary Widget */}
                <View style={[styles.todayWidget, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={[styles.todayHeader, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                        <Text style={[styles.todayTitle, { color: theme.text }]}>
                            {isArabic ? 'ملخص اليوم' : "Today's Summary"} —{' '}
                            <Text style={[styles.todayDate, { color: theme.subtext }]}>
                                {new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                            </Text>
                        </Text>
                    </View>
                    <View style={[styles.todayGrid, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.todayItem, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                            <Ionicons name="folder-outline" size={18} color={theme.primary} />
                            <Text style={[styles.todayValue, { color: theme.text }]}>{todaySummary.activeProjects}</Text>
                            <Text style={[styles.todayLabel, { color: theme.subtext }]}>{isArabic ? 'مشاريع نشطة' : 'Active'}</Text>
                        </View>
                        <View style={[styles.todayItem, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                            <Ionicons name="document-text-outline" size={18} color="#a855f7" />
                            <Text style={[styles.todayValue, { color: theme.text }]}>{todaySummary.dsrCount}</Text>
                            <Text style={[styles.todayLabel, { color: theme.subtext }]}>{isArabic ? 'تقارير اليوم' : 'DSRs'}</Text>
                        </View>
                        <View style={[styles.todayItem, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                            <Ionicons name="trending-up-outline" size={18} color={theme.success} />
                            <Text style={[styles.todayValue, { color: theme.success }]}>{fmtEGP(todaySummary.todayIncome)}</Text>
                            <Text style={[styles.todayLabel, { color: theme.subtext }]}>{isArabic ? 'إيرادات' : 'Income'}</Text>
                        </View>
                        <View style={[styles.todayItem, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                            <Ionicons name="trending-down-outline" size={18} color="#f87171" />
                            <Text style={[styles.todayValue, { color: '#f87171' }]}>{fmtEGP(todaySummary.todayExpense)}</Text>
                            <Text style={[styles.todayLabel, { color: theme.subtext }]}>{isArabic ? 'مصروفات' : 'Expenses'}</Text>
                        </View>
                    </View>
                </View>

                {/* 💼 Executive Financial Row */}
                <View style={[styles.execRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.execCard, { backgroundColor: theme.card, borderColor: theme.border, [isArabic ? 'borderRightWidth' : 'borderLeftWidth']: 4, [isArabic ? 'borderRightColor' : 'borderLeftColor']: theme.primary }]}>
                        <Text style={[styles.execLabel, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'خزينة المشاريع' : 'Projects Safe'}</Text>
                        <Text style={[styles.execValue, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }, totalSafe < 0 && { color: '#f87171' }]}>
                            {fmtEGP(totalSafe)} <Text style={[styles.curr, { color: theme.subtext }]}>EGP</Text>
                        </Text>
                    </View>
                    <View style={[styles.execCard, { backgroundColor: theme.card, borderColor: theme.border, [isArabic ? 'borderRightWidth' : 'borderLeftWidth']: 4, [isArabic ? 'borderRightColor' : 'borderLeftColor']: theme.success }]}>
                        <Text style={[styles.execLabel, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'أرباح المكتب' : 'Office Profit'}</Text>
                        <Text style={[styles.execValue, { color: theme.success, textAlign: isArabic ? 'right' : 'left' }]}>
                            {fmtEGP(totalProfit)} <Text style={[styles.curr, { color: theme.subtext }]}>EGP</Text>
                        </Text>
                    </View>
                </View>

                {/* Section Title */}
                <View style={[styles.sectionHeader, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{isArabic ? 'المشاريع الجارية' : 'Active Projects'}</Text>
                    <Text style={[styles.sectionCount, { color: theme.subtext }]}>{projects.length} {isArabic ? 'مشروع' : 'Projects'}</Text>
                </View>

                {/* Projects List */}
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                ) : projects.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Ionicons name="folder-open-outline" size={48} color={theme.subtext} />
                        <Text style={[styles.emptyText, { color: theme.subtext }]}>{isArabic ? 'لا توجد مشاريع مسجلة حالياً' : 'No projects found'}</Text>
                    </View>
                ) : (
                    projects.map((p) => {
                        const statusKey = (p.status || 'PLANNING').toUpperCase();
                        const st = STATUS_STYLES[statusKey] || STATUS_STYLES.PLANNING;
                        const budget = Number(p.budget || 0);
                        const actualCost = Number(p.actualCost || p.totalExpenses || 0);
                        const burnPct = budget > 0 ? Math.min(Math.round((actualCost / budget) * 100), 100) : 0;
                        const safeBal = Number(p.projectSafeBalance || 0);

                        return (
                            <TouchableOpacity
                                key={p.id}
                                style={[styles.projectCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate('ProjectDetail', { id: p.id, name: p.name })}
                            >
                                <View style={[styles.cardTop, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{p.name}</Text>
                                        <Text style={[styles.clientMeta, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                                            {p.client?.name || p.code || (isArabic ? 'مشروع عام' : 'General Project')}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                                        <Text style={[styles.statusText, { color: st.fg }]}>
                                            {isArabic ? st.labelAr : st.label}
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.balanceRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                    <View style={[styles.balanceBox, { backgroundColor: theme.cardAlt, borderColor: theme.border, alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
                                        <Text style={[styles.boxLabel, { color: theme.subtext }]}>{isArabic ? 'خزينة الموقع' : 'Safe Balance'}</Text>
                                        <Text style={[styles.boxVal, { color: safeBal < 0 ? '#f87171' : theme.text }]}>
                                            {fmtEGP(safeBal)} <Text style={[styles.curr, { color: theme.subtext }]}>EGP</Text>
                                        </Text>
                                    </View>
                                    <View style={[styles.balanceBox, { backgroundColor: theme.cardAlt, borderColor: theme.border, alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
                                        <Text style={[styles.boxLabel, { color: theme.subtext }]}>{isArabic ? 'ربح المكتب' : 'Office Rev'}</Text>
                                        <Text style={[styles.boxVal, { color: theme.success }]}>
                                            {fmtEGP(p.officeRevenue)} <Text style={[styles.curr, { color: theme.subtext }]}>EGP</Text>
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.budgetSection}>
                                    <View style={[styles.budgetLabels, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                        <Text style={[styles.burnText, { color: theme.text }]}>
                                            {isArabic ? 'الصرف من الميزانية' : 'Budget Spent'}:{' '}
                                            <Text style={{ fontWeight: '700', color: burnPct > 90 ? '#f87171' : theme.primary }}>{burnPct}%</Text>
                                        </Text>
                                        <Text style={[styles.budgetNums, { color: theme.subtext }]}>
                                            {fmtEGP(actualCost)} / {fmtEGP(budget)}
                                        </Text>
                                    </View>
                                    <View style={[styles.barTrack, { backgroundColor: theme.cardAlt }]}>
                                        <View
                                            style={[
                                                styles.barFill,
                                                {
                                                    width: `${burnPct}%`,
                                                    backgroundColor: burnPct > 90 ? '#ef4444' : burnPct > 70 ? '#f59e0b' : theme.primary
                                                }
                                            ]}
                                        />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            <DraftCaptureFAB navigation={navigation} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 36,
        paddingBottom: 12
    },
    welcomeText: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800'
    },
    userBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    userInitials: {
        fontSize: 14,
        fontWeight: '800'
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 100
    },
    todayWidget: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1
    },
    todayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14
    },
    todayTitle: {
        fontSize: 14,
        fontWeight: '700'
    },
    todayDate: {
        fontSize: 12,
        fontWeight: '400'
    },
    todayGrid: {
        flexDirection: 'row',
        gap: 8
    },
    todayItem: {
        flex: 1,
        borderRadius: 10,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1
    },
    todayValue: {
        fontSize: 14,
        fontWeight: '800',
        marginTop: 4
    },
    todayLabel: {
        fontSize: 10,
        marginTop: 2
    },
    execRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20
    },
    execCard: {
        flex: 1,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderLeftWidth: 4
    },
    execLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4
    },
    execValue: {
        fontSize: 18,
        fontWeight: '800'
    },
    curr: {
        fontSize: 11,
        fontWeight: '400'
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700'
    },
    sectionCount: {
        fontSize: 12,
        fontWeight: '600'
    },
    projectCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 12
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700'
    },
    clientMeta: {
        fontSize: 12,
        marginTop: 2
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700'
    },
    balanceRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12
    },
    balanceBox: {
        flex: 1,
        borderRadius: 8,
        padding: 8,
        borderWidth: 1
    },
    boxLabel: {
        fontSize: 10,
        marginBottom: 2
    },
    boxVal: {
        fontSize: 13,
        fontWeight: '700'
    },
    budgetSection: {
        marginTop: 4
    },
    budgetLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
    },
    burnText: {
        fontSize: 11
    },
    budgetNums: {
        fontSize: 11
    },
    barTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden'
    },
    barFill: {
        height: '100%',
        borderRadius: 3
    },
    emptyCard: {
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1
    },
    emptyText: {
        fontSize: 14,
        marginTop: 12
    },
    aiHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1
    },
    aiHeaderBtnText: {
        fontSize: 12,
        fontWeight: '800'
    },
    copilotBanner: {
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1
    },
    copilotBannerRow: {
        alignItems: 'center',
        gap: 12
    },
    copilotIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center'
    },
    copilotTitle: {
        fontSize: 15,
        fontWeight: '800'
    },
    copilotLivePill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10
    },
    copilotLiveText: {
        fontSize: 10,
        fontWeight: '800'
    },
    copilotSubtitle: {
        fontSize: 12,
        marginTop: 2,
        lineHeight: 16
    }
});
