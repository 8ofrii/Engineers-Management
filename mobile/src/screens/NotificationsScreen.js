import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { notificationsApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const fmtRelative = (dateStr, isArabic) => {
    if (!dateStr) return '';
    const ms = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return isArabic ? 'الآن' : 'now';
    if (min < 60) return isArabic ? `منذ ${min} د` : `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return isArabic ? `منذ ${hrs} س` : `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return isArabic ? `منذ ${days} ي` : `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-GB');
};

export default function NotificationsScreen({ navigation }) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();
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
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            <View style={[styles.header, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
                    {navigation.canGoBack() && (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.text} />
                        </TouchableOpacity>
                    )}
                    <Text style={[styles.title, { color: theme.text }]}>
                        {isArabic ? 'الإشعارات' : 'Notifications'}
                    </Text>
                    {unreadCount > 0 && (
                        <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
                            <Text style={[styles.unreadBadgeText, { color: theme.isDark ? '#000000' : '#ffffff' }]}>{unreadCount}</Text>
                        </View>
                    )}
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={onMarkAllRead} style={styles.markAllBtn}>
                        <Text style={[styles.markAll, { color: theme.primary }]}>{isArabic ? 'قراءة الكل' : 'Mark all read'}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                ) : notifications.length === 0 ? (
                    <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Ionicons name="notifications-off-outline" size={40} color={theme.subtext} />
                        <Text style={[styles.empty, { color: theme.subtext }]}>{isArabic ? 'لا توجد إشعارات جديدة' : 'No notifications yet'}</Text>
                    </View>
                ) : (
                    notifications.map(n => {
                        const iconName = n.type === 'ALERT' ? 'warning' : n.type === 'SUCCESS' ? 'checkmark-circle' : 'information-circle';
                        const iconColor = n.type === 'ALERT' ? '#ef4444' : n.type === 'SUCCESS' ? theme.success : theme.primary;

                        return (
                            <TouchableOpacity
                                key={n.id}
                                style={[
                                    styles.card,
                                    {
                                        backgroundColor: !n.isRead ? theme.primaryLight : theme.card,
                                        borderColor: !n.isRead ? theme.primary : theme.border
                                    }
                                ]}
                                onPress={() => onItemPress(n.id)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.row, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                    <View style={[styles.iconBox, { backgroundColor: theme.cardAlt }]}>
                                        <Ionicons name={iconName} size={20} color={iconColor} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={[styles.titleRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                            <Text style={[styles.notifTitle, { color: theme.text, fontWeight: !n.isRead ? '800' : '600', textAlign: isArabic ? 'right' : 'left' }]}>
                                                {n.title}
                                            </Text>
                                            {!n.isRead && <View style={[styles.dot, { backgroundColor: theme.primary, [isArabic ? 'marginRight' : 'marginLeft']: 6 }]} />}
                                        </View>
                                        <Text style={[styles.message, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{n.message}</Text>
                                        <Text style={[styles.time, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{fmtRelative(n.createdAt, isArabic)}</Text>
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
    container: { flex: 1 },
    header: {
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 36,
        paddingBottom: 14
    },
    backBtn: { padding: 4 },
    title: { fontSize: 22, fontWeight: '800' },
    unreadBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12
    },
    unreadBadgeText: { fontSize: 12, fontWeight: '800' },
    markAllBtn: { paddingVertical: 4, paddingHorizontal: 8 },
    markAll: { fontSize: 13, fontWeight: '700' },
    scroll: { padding: 16, paddingBottom: 90 },
    emptyBox: { alignItems: 'center', padding: 40, gap: 8, borderRadius: 14, borderWidth: 1, marginTop: 20 },
    empty: { textAlign: 'center', fontSize: 14 },
    card: {
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1
    },
    row: { gap: 12 },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center'
    },
    titleRow: { justifyContent: 'space-between', alignItems: 'center' },
    notifTitle: { fontSize: 14, flex: 1 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    message: { fontSize: 13, marginTop: 3, lineHeight: 18 },
    time: { fontSize: 11, marginTop: 6, fontWeight: '500' }
});

