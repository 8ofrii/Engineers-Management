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
    Alert,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { draftsApi, aiExtractApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import VoiceRecorderSheet from '../components/VoiceRecorderSheet';
import AICopilotHeaderButton from '../components/AICopilotHeaderButton';
import { useFormat } from '../utils/format';
import { apiErrorMessage } from '../utils/apiError';

export default function DraftsListScreen({ navigation }) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();
    const { currency } = useFormat();
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
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const handleVoiceCaptured = async ({ uri }) => {
        setVoiceOpen(false);
        try {
            setBusy(true);
            const r = await aiExtractApi.voice({ uri });
            navigation.navigate('DraftReview', { id: r.data.draft.id });
        } catch (err) {
            Alert.alert(isArabic ? 'فشل التحليل' : 'Voice extraction failed', apiErrorMessage(err, 'Try again or check connection.'));
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
                Alert.alert(isArabic ? 'إذن الكاميرا مطلوب' : 'Permission needed', `Please enable ${fromCamera ? 'camera' : 'photo library'} access.`);
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
            Alert.alert(isArabic ? 'فشل معالجة الإيصال' : 'Receipt extraction failed', apiErrorMessage(err, 'Try again or check connection.'));
        } finally {
            setBusy(false);
        }
    };

    const getDraftStatusLabel = (status) => {
        const s = (status || '').toUpperCase();
        if (s === 'PENDING_REVIEW' || s === 'PENDING') return isArabic ? 'تحت المراجعة' : 'Pending';
        if (s === 'COMMITTED') return isArabic ? 'تم اعتماده' : 'Committed';
        if (s === 'DISCARDED') return isArabic ? 'مرفوض' : 'Discarded';
        return status;
    };

    return (
        <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
            <View style={[s.header, { flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                        <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.title, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'مسودات الذكاء الاصطناعي' : 'AI Drafts'}</Text>
                        <Text style={[s.subtitle, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'سجل صوتياً أو التقط إيصالاً' : 'Voice or receipt capture'}</Text>
                    </View>
                </View>
                <AICopilotHeaderButton navigation={navigation} compact />
            </View>

            <View style={[s.captureRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                    style={[s.captureBtn, { backgroundColor: theme.primary }, busy && { opacity: 0.5 }]}
                    onPress={() => setVoiceOpen(true)}
                    disabled={busy}
                    activeOpacity={0.8}
                >
                    <Ionicons name="mic" size={22} color={theme.isDark ? '#000000' : '#ffffff'} />
                    <Text style={[s.captureBtnText, { color: theme.isDark ? '#000000' : '#ffffff' }]}>{isArabic ? 'تسجيل صوتي' : 'Voice'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.captureBtn, { backgroundColor: theme.cardAlt, borderColor: theme.borderStrong, borderWidth: 1 }, busy && { opacity: 0.5 }]}
                    onPress={() => handlePickPhoto(true)}
                    disabled={busy}
                    activeOpacity={0.8}
                >
                    <Ionicons name="camera" size={22} color={theme.text} />
                    <Text style={[s.captureBtnText, { color: theme.text }]}>{isArabic ? 'كاميرا' : 'Camera'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.captureBtn, { backgroundColor: theme.cardAlt, borderColor: theme.borderStrong, borderWidth: 1 }, busy && { opacity: 0.5 }]}
                    onPress={() => handlePickPhoto(false)}
                    disabled={busy}
                    activeOpacity={0.8}
                >
                    <Ionicons name="images" size={22} color={theme.text} />
                    <Text style={[s.captureBtnText, { color: theme.text }]}>{isArabic ? 'المعرض' : 'Library'}</Text>
                </TouchableOpacity>
            </View>

            <View style={[s.filterRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                {[
                    { key: 'PENDING_REVIEW', label: isArabic ? 'تحت المراجعة' : 'Pending' },
                    { key: 'COMMITTED', label: isArabic ? 'تم اعتماده' : 'Committed' },
                    { key: 'DISCARDED', label: isArabic ? 'مرفوض' : 'Discarded' },
                    { key: 'ALL', label: isArabic ? 'الكل' : 'All' }
                ].map(f => {
                    const active = filter === f.key;
                    return (
                        <TouchableOpacity
                            key={f.key}
                            onPress={() => setFilter(f.key)}
                            style={[
                                s.pill,
                                {
                                    backgroundColor: active ? theme.primary : theme.card,
                                    borderColor: active ? theme.primary : theme.borderStrong
                                }
                            ]}
                        >
                            <Text style={[s.pillText, { color: active ? (theme.isDark ? '#000000' : '#ffffff') : theme.subtext, fontWeight: active ? '700' : '500' }]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.primary} />
                }
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <ActivityIndicator color={theme.primary} style={{ marginTop: 32 }} />
                ) : drafts.length === 0 ? (
                    <View style={[s.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Ionicons name="sparkles" size={36} color={theme.subtext} />
                        <Text style={[s.emptyTitle, { color: theme.text }]}>{isArabic ? 'لا توجد مسودات' : 'No drafts yet'}</Text>
                        <Text style={[s.emptyText, { color: theme.subtext }]}>{isArabic ? 'اضغط على أحد الأزرار بالأعلى لتسجيل مسودتك الأولى بالذكاء الاصطناعي.' : 'Tap one of the buttons above to capture your first AI draft.'}</Text>
                    </View>
                ) : (
                    drafts.map(d => {
                        const md = d.matchedDraft || {};
                        const isCommitted = d.status === 'COMMITTED';
                        const sourceIcon = d.source === 'VOICE' ? 'mic' : 'image';

                        return (
                            <TouchableOpacity
                                key={d.id}
                                style={[s.row, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
                                onPress={() => navigation.navigate('DraftReview', { id: d.id })}
                                activeOpacity={0.7}
                            >
                                <View style={[s.rowIcon, { backgroundColor: theme.primaryLight }]}>
                                    <Ionicons name={sourceIcon} size={18} color={theme.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.rowTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={1}>
                                        {md.description || (isArabic ? '(بدون وصف)' : '(no summary)')}
                                    </Text>
                                    <Text style={[s.rowSubtitle, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                                        {md.amount != null ? currency(md.amount) : '—'}
                                        {md.category ? ` · ${md.category}` : ''}
                                    </Text>
                                </View>
                                <View style={[
                                    s.badge,
                                    { backgroundColor: isCommitted ? theme.successLight : theme.warningLight }
                                ]}>
                                    <Text style={[
                                        s.badgeText,
                                        { color: isCommitted ? theme.success : theme.warning }
                                    ]}>
                                        {getDraftStatusLabel(d.status)}
                                    </Text>
                                </View>
                                <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.subtext} />
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
                    <Text style={{ color: 'white', marginTop: 8, fontWeight: '700' }}>{isArabic ? 'جارِ التحليل بالذكاء الاصطناعي...' : 'Processing with AI…'}</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    header: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 36,
        paddingBottom: 12,
        gap: 12
    },
    backBtn: { padding: 6 },
    title: { fontSize: 20, fontWeight: '800' },
    subtitle: { fontSize: 12, marginTop: 2 },
    captureRow: { gap: 8, paddingHorizontal: 16, paddingTop: 6 },
    captureBtn: {
        flex: 1,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        gap: 4
    },
    captureBtnText: { fontWeight: '700', fontSize: 12 },
    filterRow: { gap: 6, paddingHorizontal: 16, paddingVertical: 12, flexWrap: 'wrap' },
    pill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1
    },
    pillText: { fontSize: 12 },
    row: {
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 14,
        marginBottom: 8,
        borderWidth: 1
    },
    rowIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    rowTitle: { fontWeight: '700', fontSize: 14 },
    rowSubtitle: { fontSize: 12, marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: '800' },
    emptyBox: { alignItems: 'center', padding: 40, gap: 6, borderRadius: 16, borderWidth: 1, marginTop: 20 },
    emptyTitle: { fontSize: 16, fontWeight: '700' },
    emptyText: { textAlign: 'center', fontSize: 13 },
    busyOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center'
    }
});

