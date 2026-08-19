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
import { invoicesApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useFormat } from '../utils/format';

import AICopilotHeaderButton from '../components/AICopilotHeaderButton';

import { useFocusEffect } from '@react-navigation/native';

export default function InvoicesScreen({ navigation }) {
    const { i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();
    const { currency } = useFormat();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await invoicesApi.list();
            setInvoices(res.data?.data || []);
        } catch (err) {
            setInvoices([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const onRefresh = () => { setRefreshing(true); load(); };

    const totalInvoiced = invoices.reduce((s, inv) => s + Number(inv.totalAmount || inv.amount || 0), 0);
    const totalCollected = invoices.reduce((s, inv) => s + Number(inv.paidAmount || 0), 0);

    const getInvoiceStatusLabel = (status) => {
        const s = (status || '').toUpperCase();
        if (s === 'PAID') return isArabic ? 'مدفوعة' : 'Paid';
        if (s === 'PENDING') return isArabic ? 'معلقة' : 'Pending';
        if (s === 'OVERDUE') return isArabic ? 'متأخرة' : 'Overdue';
        if (s === 'PARTIAL') return isArabic ? 'مدفوعة جزئياً' : 'Partial';
        return status;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={[styles.header, { flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                        {isArabic ? 'الفواتير والمطالبات' : 'Invoices & Billing'}
                    </Text>
                </View>
                <AICopilotHeaderButton navigation={navigation} compact />
            </View>

            {/* Quick Metrics */}
            <View style={[styles.metricRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border, [isArabic ? 'borderRightWidth' : 'borderLeftWidth']: 4, [isArabic ? 'borderRightColor' : 'borderLeftColor']: theme.warning }]}>
                    <Text style={[styles.metricLabel, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'إجمالي المطالبات' : 'Total Invoiced'}</Text>
                    <Text style={[styles.metricVal, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{currency(totalInvoiced)}</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border, [isArabic ? 'borderRightWidth' : 'borderLeftWidth']: 4, [isArabic ? 'borderRightColor' : 'borderLeftColor']: theme.success }]}>
                    <Text style={[styles.metricLabel, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'المحصل الفعلي' : 'Total Collected'}</Text>
                    <Text style={[styles.metricVal, { color: theme.success, textAlign: isArabic ? 'right' : 'left' }]}>{currency(totalCollected)}</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                ) : invoices.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Ionicons name="receipt-outline" size={48} color={theme.subtext} />
                        <Text style={[styles.emptyText, { color: theme.subtext }]}>{isArabic ? 'لا توجد فواتير مسجلة' : 'No invoices found'}</Text>
                    </View>
                ) : (
                    invoices.map((inv) => {
                        const isPaid = inv.status === 'PAID';
                        const isOverdue = inv.status === 'OVERDUE';
                        const badgeBg = isPaid ? theme.successLight : isOverdue ? '#fee2e2' : theme.warningLight;
                        const badgeFg = isPaid ? theme.success : isOverdue ? '#ef4444' : theme.warning;

                        return (
                            <View key={inv.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <View style={[styles.cardHeader, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{inv.invoiceNumber || (isArabic ? 'فاتورة مستحقة' : 'Invoice')}</Text>
                                        <Text style={[styles.projectMeta, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                                            {inv.project?.name || inv.client?.name || (isArabic ? 'مشروع عام' : 'General Project')}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                                        <Text style={[styles.statusText, { color: badgeFg }]}>
                                            {getInvoiceStatusLabel(inv.status)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.amountRow, { borderTopColor: theme.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                    <View style={{ alignItems: isArabic ? 'flex-end' : 'flex-start' }}>
                                        <Text style={[styles.amountLabel, { color: theme.subtext }]}>{isArabic ? 'قيمة الفاتورة' : 'Amount'}</Text>
                                        <Text style={[styles.amountVal, { color: theme.text }]}>
                                            {currency(Number(inv.totalAmount || inv.amount || 0))}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: isArabic ? 'flex-start' : 'flex-end' }}>
                                        <Text style={[styles.amountLabel, { color: theme.subtext }]}>{isArabic ? 'تاريخ الاستحقاق' : 'Due Date'}</Text>
                                        <Text style={[styles.dateVal, { color: theme.subtext }]}>
                                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB') : '—'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    header: {
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
        fontSize: 20,
        fontWeight: '800',
        flex: 1
    },
    metricRow: {
        gap: 10,
        paddingHorizontal: 16,
        marginBottom: 12
    },
    metricCard: {
        flex: 1,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: '600'
    },
    metricVal: {
        fontSize: 16,
        fontWeight: '800',
        marginTop: 4
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 90,
        gap: 12
    },
    card: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1
    },
    cardHeader: {
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700'
    },
    projectMeta: {
        fontSize: 12,
        marginTop: 2
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800'
    },
    amountRow: {
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1
    },
    amountLabel: {
        fontSize: 11
    },
    amountVal: {
        fontSize: 15,
        fontWeight: '700',
        marginTop: 2
    },
    dateVal: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2
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
    }
});

