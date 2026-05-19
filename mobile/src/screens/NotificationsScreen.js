import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { notificationsApi } from '../services/api';

const TYPE_STYLES = {
    INFO:    { bg: '#dbeafe', fg: '#1e40af', icon: 'ℹ️' },
    ALERT:   { bg: '#fee2e2', fg: '#991b1b', icon: '⚠️' },
    SUCCESS: { bg: '#d1fae5', fg: '#065f46', icon: '✓' },
    WARNING: { bg: '#fef3c7', fg: '#92400e', icon: '⚠' }
};

const fmtRelative = (dateStr) => {
    if (!dateStr) return '';
    const ms = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'now';
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-GB');
};

export default function NotificationsScreen() {
    const { t } = useTranslation();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await notificationsApi.list();
            setNotifications(res.data?.notifications || res.data?.data || []);
        } catch {
            setNotifications([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const onMarkAllRead = async () => {
        try {
            await notificationsApi.markAllRead();
            load();
        } catch {}
    };

    const onItemPress = async (id) => {
        try {
            await notificationsApi.markRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch {}
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>
                    {t('notif.title')}
                    {unreadCount > 0 && <Text style={styles.unreadBadge}>  {unreadCount}</Text>}
                </Text>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={onMarkAllRead}>
                        <Text style={styles.markAll}>{t('notif.markAllRead')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" style={{ marginTop: 40 }} />
                ) : notifications.length === 0 ? (
                    <Text style={styles.empty}>{t('notif.empty')}</Text>
                ) : (
                    notifications.map(n => {
                        const ts = TYPE_STYLES[n.type] || TYPE_STYLES.INFO;
                        return (
                            <TouchableOpacity
                                key={n.id}
                                style={[styles.card, !n.isRead && styles.cardUnread]}
                                onPress={() => onItemPress(n.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.row}>
                                    <View style={[styles.iconBox, { backgroundColor: ts.bg }]}>
                                        <Text style={{ fontSize: 14 }}>{ts.icon}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.titleRow}>
                                            <Text style={[styles.notifTitle, !n.isRead && { fontWeight: '700' }]}>
                                                {n.title}
                                            </Text>
                                            {!n.isRead && <View style={styles.dot} />}
                                        </View>
                                        <Text style={styles.message}>{n.message}</Text>
                                        <Text style={styles.time}>{fmtRelative(n.createdAt)}</Text>
                                    </View>
                                </View>
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
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, paddingTop: 50, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
    },
    title: { fontSize: 22, fontWeight: '700', color: '#111827' },
    unreadBadge: { fontSize: 14, color: '#ef4444' },
    markAll: { fontSize: 13, color: '#2563eb', fontWeight: '600' },

    scroll: { padding: 16, paddingBottom: 40 },
    empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },

    card: {
        backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 8,
        borderWidth: 1, borderColor: '#e5e7eb'
    },
    cardUnread: { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' },
    row: { flexDirection: 'row' },
    iconBox: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center', marginRight: 10
    },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    notifTitle: { fontSize: 14, color: '#111827', fontWeight: '600', flex: 1 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb', marginLeft: 6 },
    message: { fontSize: 13, color: '#4b5563', marginTop: 2 },
    time: { fontSize: 11, color: '#9ca3af', marginTop: 4 }
});
