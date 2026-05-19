import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, SafeAreaView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { workmenApi } from '../services/api';
import { useFormat } from '../utils/format';

export default function WorkmenScreen({ navigation }) {
    const { t } = useTranslation();
    const { currency } = useFormat();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const r = await workmenApi.list();
            setItems(r.data?.data || []);
        } catch { setItems([]); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{'< '}{t('common.back')}</Text></TouchableOpacity>
                <Text style={styles.title}>{t('directory.workmen')} ({items.length})</Text>
                <View style={{ width: 50 }} />
            </View>
            <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
                {loading ? <ActivityIndicator size="large" style={{ marginTop: 40 }} />
                    : items.length === 0 ? <Text style={styles.empty}>{t('common.empty')}</Text>
                    : items.map(w => (
                        <View key={w.id} style={styles.card}>
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.name}>{w.nameAr || w.name}</Text>
                                    {w.nameAr && w.name !== w.nameAr ? <Text style={styles.subname}>{w.name}</Text> : null}
                                </View>
                                <View style={styles.tradeBadge}>
                                    <Text style={styles.tradeText}>{w.trade}</Text>
                                </View>
                            </View>
                            <View style={styles.statsRow}>
                                <View style={styles.stat}>
                                    <Text style={styles.statLabel}>{t('directory.dailyRate')}</Text>
                                    <Text style={styles.statValue}>{currency(w.dailyRate)}</Text>
                                </View>
                                <View style={styles.stat}>
                                    <Text style={styles.statLabel}>{t('directory.totalPaid')}</Text>
                                    <Text style={styles.statValue}>{currency(w.totalPaid)}</Text>
                                </View>
                            </View>
                            {w.phone ? <Text style={styles.meta}>📞 {w.phone}</Text> : null}
                            {!w.isActive ? <Text style={styles.inactive}>{t('directory.inactive')}</Text> : null}
                        </View>
                    ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    back: { color: '#2563eb', fontSize: 14, fontWeight: '600', width: 60 },
    title: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'center' },
    scroll: { padding: 16, paddingBottom: 40 },
    card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    name: { fontSize: 15, fontWeight: '600', color: '#111827' },
    subname: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    tradeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#eef2ff' },
    tradeText: { fontSize: 11, fontWeight: '600', color: '#3730a3' },
    statsRow: { flexDirection: 'row', marginTop: 10, gap: 16 },
    stat: { flex: 1 },
    statLabel: { fontSize: 11, color: '#9ca3af' },
    statValue: { fontSize: 13, color: '#111827', fontWeight: '600', marginTop: 2 },
    meta: { fontSize: 12, color: '#6b7280', marginTop: 8 },
    inactive: { fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: '600' },
    empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 }
});
