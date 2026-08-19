import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    TouchableOpacity,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { projectsApi, transactionsApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import DraftCaptureFAB from '../components/DraftCaptureFAB';
import AICopilotHeaderButton from '../components/AICopilotHeaderButton';
import { useFormat } from '../utils/format';

import { useFocusEffect } from '@react-navigation/native';

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB') : '-';

export default function ProjectDetailScreen({ route, navigation }) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();
    const { currency } = useFormat();
    const projectId = route.params?.id || route.params?.projectId;
    const projectName = route.params?.name || route.params?.projectName;
    const [project, setProject] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        if (!projectId) {
            setProject(null);
            setLoading(false);
            return;
        }
        try {
            const [pRes, tRes] = await Promise.all([
                projectsApi.get(projectId),
                transactionsApi.list({ projectId }).catch(() => ({ data: { data: [] } }))
            ]);
            setProject(pRes.data?.data || null);
            const tx = tRes.data?.data || [];
            setTransactions(Array.isArray(tx) ? tx : (tx.transactions || []));
        } catch {
            setProject(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const onRefresh = () => { setRefreshing(true); load(); };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 80 }} />
            </SafeAreaView>
        );
    }

    if (!project) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>
                <View style={styles.empty}>
                    <Text style={[styles.emptyText, { color: theme.subtext }]}>{isArabic ? 'المشروع غير موجود' : 'Project not found'}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={[styles.header, { flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={1}>
                        {projectName || project.name}
                    </Text>
                </View>
                <AICopilotHeaderButton
                    navigation={navigation}
                    params={{ projectId: project.id, projectName: project.name }}
                    compact
                />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Project info card */}
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.projectName, { color: theme.text }]} numberOfLines={3}>{project.name}</Text>
                        <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
                            <Text style={[styles.badgeText, { color: theme.primary }]}>
                                {project.status || 'ACTIVE'}
                            </Text>
                        </View>
                    </View>
                    {project.description ? (
                        <Text style={[styles.description, { color: theme.subtext }]}>{project.description}</Text>
                    ) : null}

                    <View style={styles.infoGrid}>
                        <Info label={isArabic ? 'العميل' : 'Client'} value={project.client?.name} theme={theme} />
                        <Info label={isArabic ? 'المهندس المشرف' : 'Engineer'} value={project.engineer?.name} theme={theme} />
                        <Info label={isArabic ? 'الموقع' : 'Location'} value={project.location} theme={theme} />
                        <Info label={isArabic ? 'تاريخ البدء' : 'Start Date'} value={fmtDate(project.startDate)} theme={theme} />
                    </View>
                </View>

                {/* Financial summary */}
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{isArabic ? 'الموقف المالي للمشروع' : 'Project Financials'}</Text>
                <View style={styles.financeGrid}>
                    <FinanceCell label={isArabic ? 'الميزانية' : 'Budget'} value={currency(project.budget)} color={theme.primary} theme={theme} />
                    <FinanceCell label={isArabic ? 'المصروف الفعلي' : 'Actual Cost'} value={currency(project.actualCost)} color="#f87171" theme={theme} />
                    <FinanceCell label={isArabic ? 'أتعاب المكتب' : 'Office Rev'} value={currency(project.officeRevenue)} color="#34d399" theme={theme} />
                    <FinanceCell
                        label={isArabic ? 'رصيد العهدة' : 'Safe Balance'}
                        value={currency(project.projectSafeBalance)}
                        color={Number(project.projectSafeBalance) < 0 ? '#f87171' : '#38bdf8'}
                        theme={theme}
                    />
                </View>

                {/* Add transaction button */}
                <TouchableOpacity
                    style={[styles.addTxButton, { backgroundColor: theme.primary }]}
                    onPress={() => navigation.navigate('FinanceTab', {
                        screen: 'AddTransaction',
                        params: { projectId: project.id, projectName: project.name }
                    })}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add-circle-outline" size={18} color="#fff" />
                    <Text style={styles.addTxButtonText}>{isArabic ? 'إضافة معاملة مالية للمشروع' : '+ Add Transaction'}</Text>
                </TouchableOpacity>

                {/* Transactions */}
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    {isArabic ? 'سجل معاملات المشروع' : 'Project Transactions'} ({transactions.length})
                </Text>
                {transactions.length === 0 ? (
                    <Text style={[styles.emptyText, { color: theme.subtext }]}>{isArabic ? 'لا توجد معاملات مسجلة' : 'No transactions recorded'}</Text>
                ) : (
                    transactions.slice(0, 20).map((tx) => (
                        <View key={tx.id} style={[styles.txCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <View style={styles.txHeader}>
                                <Text style={[
                                    styles.txAmount,
                                    { color: tx.type === 'INCOME' || tx.type === 'income' ? '#34d399' : '#f87171' }
                                ]}>
                                    {tx.type === 'INCOME' || tx.type === 'income' ? '+' : '-'}{currency(tx.amount)}
                                </Text>
                                <Text style={[styles.txStatus, { color: theme.subtext }]}>{tx.status}</Text>
                            </View>
                            <Text style={[styles.txCategory, { color: theme.text }]}>{tx.category?.replace(/_/g, ' ') || 'General'}</Text>
                            {tx.description ? (
                                <Text style={[styles.txDescription, { color: theme.subtext }]} numberOfLines={2}>{tx.description}</Text>
                            ) : null}
                            <Text style={[styles.txDate, { color: theme.subtext }]}>{fmtDate(tx.transactionDate || tx.createdAt)}</Text>
                        </View>
                    ))
                )}
                {transactions.length > 20 ? (
                    <Text style={[styles.moreText, { color: theme.subtext }]}>+ {transactions.length - 20} {isArabic ? 'معاملة إضافية' : 'more'}</Text>
                ) : null}
            </ScrollView>
            <DraftCaptureFAB projectId={project.id} projectName={project.name} />
        </SafeAreaView>
    );
}

const Info = ({ label, value, theme }) => (
    <View style={styles.infoCell}>
        <Text style={[styles.infoLabel, { color: theme.subtext }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={2}>{value || '-'}</Text>
    </View>
);

const FinanceCell = ({ label, value, color, theme }) => (
    <View style={[styles.financeCell, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.financeLabel, { color: theme.subtext }]}>{label}</Text>
        <Text style={[styles.financeValue, { color }]}>
            {value}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    header: {
        flexDirection: 'row',
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
        fontSize: 18,
        fontWeight: '800',
        flex: 1
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40
    },
    card: {
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8
    },
    projectName: {
        fontSize: 17,
        fontWeight: '800',
        flex: 1
    },
    description: {
        fontSize: 13,
        marginTop: 8
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700'
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12
    },
    infoCell: {
        width: '50%',
        paddingVertical: 6
    },
    infoLabel: {
        fontSize: 11,
        marginBottom: 2
    },
    infoValue: {
        fontSize: 13,
        fontWeight: '600'
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
        marginTop: 8
    },
    financeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16
    },
    financeCell: {
        width: '48%',
        margin: '1%',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1
    },
    financeLabel: {
        fontSize: 11
    },
    financeValue: {
        fontSize: 17,
        fontWeight: '800',
        marginTop: 4
    },
    txCard: {
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1
    },
    txHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    txAmount: {
        fontSize: 15,
        fontWeight: '700'
    },
    txStatus: {
        fontSize: 10,
        fontWeight: '600'
    },
    txCategory: {
        fontSize: 12,
        marginTop: 4,
        fontWeight: '600'
    },
    txDescription: {
        fontSize: 12,
        marginTop: 2
    },
    txDate: {
        fontSize: 11,
        marginTop: 6
    },
    moreText: {
        textAlign: 'center',
        marginTop: 8,
        fontSize: 12
    },
    addTxButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 12
    },
    addTxButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700'
    },
    empty: {
        padding: 40,
        alignItems: 'center'
    },
    emptyText: {
        textAlign: 'center',
        padding: 20
    }
});

