import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, Alert, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { setLanguage } from '../i18n';
import { custodyApi } from '../services/api';
import { useFormat } from '../utils/format';

export default function ProfileScreen({ navigation }) {
    const { t, i18n } = useTranslation();
    const { user, logout } = useAuth();
    const { currency } = useFormat();
    const [custody, setCustody] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    const showCustody = user && (user.role === 'ENGINEER' || user.role === 'PROJECT_MANAGER');

    const loadCustody = useCallback(async () => {
        if (!showCustody || !user?.id) return;
        try {
            const res = await custodyApi.balance(user.id);
            setCustody(res.data?.data || null);
        } catch { setCustody(null); }
        finally { setRefreshing(false); }
    }, [showCustody, user?.id]);

    useEffect(() => { loadCustody(); }, [loadCustody]);

    const onLogout = () => {
        Alert.alert(t('profile.logoutConfirm'), '', [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('profile.logout'), style: 'destructive', onPress: logout }
        ]);
    };

    const initials = (user?.name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

    const Item = ({ icon, label, onPress, value, danger, accent }) => (
        <TouchableOpacity style={styles.row} onPress={onPress}>
            <Ionicons
                name={icon}
                size={20}
                color={danger ? '#ef4444' : accent ? '#10b981' : '#374151'}
                style={{ marginRight: 12 }}
            />
            <Text style={[
                styles.rowLabel,
                danger && { color: '#ef4444' },
                accent && { color: '#10b981' }
            ]}>{label}</Text>
            {value ? <Text style={styles.rowValue}>{value} ▸</Text> : <Text style={styles.rowChevron}>▸</Text>}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCustody(); }} />}
            >
                <View style={styles.profileBlock}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
                    <Text style={styles.name}>{user?.name || ''}</Text>
                    <Text style={styles.email}>{user?.email || ''}</Text>
                    <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{user?.role?.replace(/_/g, ' ') || ''}</Text></View>
                </View>

                {showCustody && custody && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('profile.custody')}</Text>
                        <View style={styles.custodyCard}>
                            <Row label={t('profile.currentBalance')} value={currency(custody.currentCustodyBalance)} primary />
                            <Row label={t('profile.pendingClearance')} value={currency(custody.pendingClearance)} />
                            <Row label={t('profile.available')} value={currency(custody.availableBalance)} accent />
                        </View>
                    </View>
                )}

                {isAdmin && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('profile.management')}</Text>
                        <Item icon="cash-outline" label={t('profile.fundEngineer')} onPress={() => navigation.navigate('FundEngineer')} accent />
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('profile.directory')}</Text>
                    <Item icon="people-outline" label={t('directory.clients')} onPress={() => navigation.navigate('Clients')} />
                    <Item icon="business-outline" label={t('directory.suppliers')} onPress={() => navigation.navigate('Suppliers')} />
                    <Item icon="construct-outline" label={t('directory.workmen')} onPress={() => navigation.navigate('Workmen')} />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('profile.preferences')}</Text>
                    <Item
                        icon="language-outline"
                        label={t('profile.language')}
                        value={i18n.language === 'ar' ? 'العربية' : 'English'}
                        onPress={() => setLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('profile.account')}</Text>
                    <Item icon="log-out-outline" label={t('profile.logout')} onPress={onLogout} danger />
                </View>

                <Text style={styles.footer}>Engineers Management v1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const Row = ({ label, value, primary, accent }) => (
    <View style={styles.custodyRow}>
        <Text style={styles.custodyLabel}>{label}</Text>
        <Text style={[
            styles.custodyValue,
            primary && { color: '#0ea5e9', fontSize: 18, fontWeight: '700' },
            accent && { color: '#10b981', fontWeight: '700' }
        ]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    scroll: { padding: 16, paddingTop: 50, paddingBottom: 40 },

    profileBlock: { alignItems: 'center', paddingVertical: 24 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
    name: { fontSize: 20, fontWeight: '700', color: '#111827' },
    email: { fontSize: 13, color: '#6b7280', marginTop: 4 },
    roleBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#dbeafe' },
    roleBadgeText: { color: '#1e40af', fontSize: 12, fontWeight: '600' },

    section: { marginTop: 16 },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },

    custodyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
    custodyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    custodyLabel: { fontSize: 13, color: '#6b7280' },
    custodyValue: { fontSize: 14, color: '#111827', fontWeight: '500' },

    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: '#e5e7eb' },
    rowLabel: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 1 },
    rowValue: { fontSize: 13, color: '#6b7280' },
    rowChevron: { fontSize: 14, color: '#9ca3af' },

    footer: { textAlign: 'center', color: '#9ca3af', fontSize: 11, marginTop: 32 }
});
