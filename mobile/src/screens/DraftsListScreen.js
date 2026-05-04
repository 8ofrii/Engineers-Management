import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, RefreshControl, SafeAreaView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { draftsApi, aiExtractApi } from '../services/api';
import VoiceRecorderSheet from '../components/VoiceRecorderSheet';

const STATUS_STYLES = {
    PENDING_REVIEW: { bg: '#fef3c7', fg: '#92400e', label: 'Pending' },
    COMMITTED:      { bg: '#d1fae5', fg: '#065f46', label: 'Committed' },
    DISCARDED:      { bg: '#e5e7eb', fg: '#6b7280', label: 'Discarded' }
};

export default function DraftsListScreen({ navigation }) {
    const [filter, setFilter] = useState('PENDING_REVIEW');
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [voiceOpen, setVoiceOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const params = filter === 'ALL' ? {} : { status: filter };
            const r = await draftsApi.list(params);
            setDrafts(r.data?.data || []);
        } catch {
            setDrafts([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter]);

    useEffect(() => { load(); }, [load]);
    // Refresh when returning from review screen so committed drafts move buckets
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const handleVoiceCaptured = async ({ uri }) => {
        setVoiceOpen(false);
        try {
            setBusy(true);
            const r = await aiExtractApi.voice({ uri });
            navigation.navigate('DraftReview', { id: r.data.draft.id });
        } catch (err) {
            Alert.alert('Voice extraction failed', err.response?.data?.message || String(err?.message || err));
        } finally {
            setBusy(false);
        }
    };

    const handlePickPhoto = async (fromCamera) => {
        try {
            const perm = fromCamera
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (perm.status !== 'granted') {
                Alert.alert('Permission needed', `Please enable ${fromCamera ? 'camera' : 'photo library'} access in your device settings.`);
                return;
            }
            const res = fromCamera
                ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
                : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
            if (res.canceled || !res.assets?.length) return;
            const asset = res.assets[0];
            setBusy(true);
            const apiRes = await aiExtractApi.receipt({
                uri: asset.uri,
                name: asset.fileName || 'receipt.jpg',
                type: asset.mimeType || 'image/jpeg'
            });
            navigation.navigate('DraftReview', { id: apiRes.data.draft.id });
        } catch (err) {
            Alert.alert('Receipt extraction failed', err.response?.data?.message || String(err?.message || err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}>
                <Text style={s.title}>AI Drafts</Text>
                <Text style={s.subtitle}>Capture a voice note or receipt — AI prepares a draft for you</Text>
            </View>

            <View style={s.captureRow}>
                <TouchableOpacity
                    style={[s.captureBtn, busy && { opacity: 0.5 }]}
                    onPress={() => setVoiceOpen(true)}
                    disabled={busy}
                >
                    <Ionicons name="mic" size={24} color="white" />
                    <Text style={s.captureBtnText}>Voice</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.captureBtn, busy && { opacity: 0.5 }]}
                    onPress={() => handlePickPhoto(true)}
                    disabled={busy}
                >
                    <Ionicons name="camera" size={24} color="white" />
                    <Text style={s.captureBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.captureBtn, busy && { opacity: 0.5 }]}
                    onPress={() => handlePickPhoto(false)}
                    disabled={busy}
                >
                    <Ionicons name="images" size={24} color="white" />
                    <Text style={s.captureBtnText}>Library</Text>
                </TouchableOpacity>
            </View>

            <View style={s.filterRow}>
                {['PENDING_REVIEW', 'COMMITTED', 'DISCARDED', 'ALL'].map(f => (
                    <TouchableOpacity
                        key={f}
                        onPress={() => setFilter(f)}
                        style={[s.pill, filter === f && s.pillActive]}
                    >
                        <Text style={[s.pillText, filter === f && s.pillTextActive]}>
                            {f.replace('_', ' ')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
                }
            >
                {loading ? (
                    <ActivityIndicator color="#2563eb" style={{ marginTop: 32 }} />
                ) : drafts.length === 0 ? (
                    <View style={s.emptyBox}>
                        <Ionicons name="sparkles" size={36} color="#9ca3af" />
                        <Text style={s.emptyTitle}>No drafts yet</Text>
                        <Text style={s.emptyText}>Tap one of the buttons above to capture your first AI draft.</Text>
                    </View>
                ) : (
                    drafts.map(d => {
                        const md = d.matchedDraft || {};
                        const sty = STATUS_STYLES[d.status] || STATUS_STYLES.PENDING_REVIEW;
                        const sourceIcon = d.source === 'VOICE' ? 'mic' : 'image';
                        return (
                            <TouchableOpacity
                                key={d.id}
                                style={s.row}
                                onPress={() => navigation.navigate('DraftReview', { id: d.id })}
                            >
                                <View style={s.rowIcon}>
                                    <Ionicons name={sourceIcon} size={18} color="#2563eb" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.rowTitle} numberOfLines={1}>
                                        {md.description || '(no summary)'}
                                    </Text>
                                    <Text style={s.rowSubtitle}>
                                        {md.amount != null ? `${md.amount} EGP` : '—'}
                                        {md.category ? ` · ${md.category}` : ''}
                                    </Text>
                                </View>
                                <View style={[s.badge, { backgroundColor: sty.bg }]}>
                                    <Text style={[s.badgeText, { color: sty.fg }]}>{sty.label}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            <VoiceRecorderSheet
                visible={voiceOpen}
                onClose={() => setVoiceOpen(false)}
                onCaptured={handleVoiceCaptured}
                maxSeconds={60}
            />

            {busy && (
                <View style={s.busyOverlay}>
                    <ActivityIndicator size="large" color="white" />
                    <Text style={{ color: 'white', marginTop: 8 }}>Processing with AI…</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { padding: 16, backgroundColor: 'white' },
    title: { fontSize: 22, fontWeight: '700', color: '#111827' },
    subtitle: { color: '#6b7280', marginTop: 4 },
    captureRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 0 },
    captureBtn: {
        flex: 1, backgroundColor: '#2563eb', borderRadius: 12,
        padding: 14, alignItems: 'center', gap: 4
    },
    captureBtnText: { color: 'white', fontWeight: '600' },
    filterRow: { flexDirection: 'row', gap: 6, padding: 16, flexWrap: 'wrap' },
    pill: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
        backgroundColor: '#e5e7eb'
    },
    pillActive: { backgroundColor: '#2563eb' },
    pillText: { color: '#374151', fontSize: 12, fontWeight: '600' },
    pillTextActive: { color: 'white' },
    row: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'white', padding: 12, borderRadius: 10,
        marginBottom: 8
    },
    rowIcon: {
        width: 36, height: 36, borderRadius: 8,
        backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center'
    },
    rowTitle: { fontWeight: '600', color: '#111827' },
    rowSubtitle: { color: '#6b7280', fontSize: 12, marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    emptyBox: { alignItems: 'center', padding: 40, gap: 6 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
    emptyText: { color: '#6b7280', textAlign: 'center' },
    busyOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center', justifyContent: 'center'
    }
});
