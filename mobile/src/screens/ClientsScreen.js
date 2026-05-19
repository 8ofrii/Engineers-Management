import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, SafeAreaView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { clientsApi } from '../services/api';

const STATUS = {
    ACTIVE: { bg: '#d1fae5', fg: '#065f46' },
    INACTIVE: { bg: '#e5e7eb', fg: '#6b7280' },
    PENDING: { bg: '#fef3c7', fg: '#92400e' }
};

export default function ClientsScreen({ navigation }) {
    const { t } = useTranslation();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const r = await clientsApi.list();
            setItems(r.data?.data || []);
        } catch { setItems([]); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{'< '}{t('common.back')}</Text></TouchableOpacity>
                <Text style={styles.title}>{t('directory.clients')} ({items.length})</Text>
                <View style={{ width: 50 }} />
            </View>
            <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
                {loading ? <ActivityIndicator size="large" style={{ marginTop: 40 }} />
                    : items.length === 0 ? <Text style={styles.empty}>{t('common.empty')}</Text>
                    : items.map(c => {
                        const s = STATUS[c.status] || STATUS.ACTIVE;
                        return (
                            <View key={c.id} style={styles.card}>
                                <View style={styles.row}>
                                    <Text style={styles.name} numberOfLines={1}>{c.name}</Text>
                                    <View style={[styles.badge, { backgroundColor: s.bg }]}>
                                        <Text style={[styles.badgeText, { color: s.fg }]}>{c.status}</Text>
                                    </View>
                                </View>
                                {c.company ? <Text style={styles.meta}>{c.company}</Text> : null}
                                {c.email ? <Text style={styles.meta}>📧 {c.email}</Text> : null}
                                {c.phone ? <Text style={styles.meta}>📞 {c.phone}</Text> : null}
                                {c.city ? <Text style={styles.meta}>📍 {[c.city, c.country].filter(Boolean).join(', ')}</Text> : null}
                                {c.contactName ? <Text style={styles.contact}>{t('directory.contact')}: {c.contactName}</Text> : null}
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
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '600' },
    meta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
    contact: { fontSize: 12, color: '#374151', marginTop: 6, fontStyle: 'italic' },
    empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 }
});
