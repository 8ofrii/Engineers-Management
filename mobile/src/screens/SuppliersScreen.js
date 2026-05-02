import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, SafeAreaView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { suppliersApi } from '../services/api';

const STATUS = {
    ACTIVE: { bg: '#d1fae5', fg: '#065f46' },
    INACTIVE: { bg: '#e5e7eb', fg: '#6b7280' },
    BLACKLISTED: { bg: '#fee2e2', fg: '#991b1b' }
};

export default function SuppliersScreen({ navigation }) {
    const { t } = useTranslation();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const r = await suppliersApi.list();
            setItems(r.data?.data || []);
        } catch { setItems([]); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{'< '}{t('common.back')}</Text></TouchableOpacity>
                <Text style={styles.title}>{t('directory.suppliers')} ({items.length})</Text>
                <View style={{ width: 50 }} />
            </View>
            <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
                {loading ? <ActivityIndicator size="large" style={{ marginTop: 40 }} />
                    : items.length === 0 ? <Text style={styles.empty}>{t('common.empty')}</Text>
                    : items.map(s => {
                        const st = STATUS[s.status] || STATUS.ACTIVE;
                        return (
                            <View key={s.id} style={styles.card}>
                                <View style={styles.row}>
                                    <Text style={styles.name} numberOfLines={2}>{s.name}</Text>
                                    <View style={[styles.badge, { backgroundColor: st.bg }]}>
                                        <Text style={[styles.badgeText, { color: st.fg }]}>{s.status}</Text>
                                    </View>
                                </View>
                                <View style={styles.metaRow}>
                                    <Text style={styles.category}>{s.category}</Text>
                                    {s.rating ? <Text style={styles.rating}>{'⭐'.repeat(s.rating)}</Text> : null}
                                </View>
                                {s.phone ? <Text style={styles.meta}>📞 {s.phone}</Text> : null}
                                {s.paymentTerms ? <Text style={styles.meta}>{t('directory.paymentTerms')}: {s.paymentTerms}</Text> : null}
                            </View>
                        );
                    })}
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
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    name: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '600' },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    category: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
    rating: { fontSize: 11 },
    meta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
    empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 }
});
