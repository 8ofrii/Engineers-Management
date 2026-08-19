import { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, SafeAreaView, TextInput, Alert, Image,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTranslation } from 'react-i18next';
import { draftsApi, projectsApi, suppliersApi, transactionsApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useFormat } from '../utils/format';
import { apiErrorMessage } from '../utils/apiError';

const CATEGORIES = ['MATERIALS', 'LABOR', 'EQUIPMENT', 'SERVICES', 'OTHER'];

export default function DraftReviewScreen({ route, navigation }) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();
    const { id } = route.params || {};
    const { currency } = useFormat();
    const [draft, setDraft] = useState(null);
    const [projects, setProjects] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rematching, setRematching] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [sound, setSound] = useState(null);

    const [form, setForm] = useState({
        amount: '',
        category: 'OTHER',
        description: '',
        projectId: '',
        supplierId: '',
        transactionDate: ''
    });

    const load = async () => {
        try {
            setLoading(true);
            const [dRes, pRes, sRes] = await Promise.all([
                draftsApi.get(id),
                projectsApi.list(),
                suppliersApi.list()
            ]);
            const d = dRes.data.data;
            setDraft(d);
            setProjects(pRes.data.data || []);
            setSuppliers(sRes.data.data || []);
            const md = d.matchedDraft || {};
            setForm({
                amount: md.amount != null ? String(md.amount) : '',
                category: md.category || 'OTHER',
                description: md.description || '',
                projectId: md.projectId || '',
                supplierId: md.supplierId || '',
                transactionDate: md.transactionDate || new Date().toISOString().slice(0, 10)
            });
        } catch (err) {
            Alert.alert(isArabic ? 'فشل تحميل المسودة' : 'Failed to load draft', apiErrorMessage(err, 'Please retry.'));
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);
    useEffect(() => () => { sound?.unloadAsync().catch(() => { }); }, [sound]);

    const togglePlayback = async () => {
        if (!draft?.originalMediaUrl) return;
        if (playing) {
            await sound?.unloadAsync().catch(() => { });
            setSound(null);
            setPlaying(false);
            return;
        }
        const { sound: s } = await Audio.Sound.createAsync({ uri: draft.originalMediaUrl });
        s.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
                setPlaying(false);
                s.unloadAsync().catch(() => { });
                setSound(null);
            }
        });
        setSound(s);
        setPlaying(true);
        await s.playAsync();
    };

    const handleRematch = async () => {
        try {
            setRematching(true);
            const r = await draftsApi.rematch(id);
            const md = r.data.data.matchedDraft || {};
            setForm(prev => ({
                ...prev,
                projectId: prev.projectId || md.projectId || '',
                supplierId: prev.supplierId || md.supplierId || ''
            }));
            setDraft(r.data.data);
        } catch (err) {
            Alert.alert(isArabic ? 'فشل إعادة المطابقة' : 'Re-match failed', apiErrorMessage(err, 'Please retry.'));
        } finally {
            setRematching(false);
        }
    };

    const handleDiscard = () => {
        Alert.alert(isArabic ? 'حذف المسودة؟' : 'Discard draft?', isArabic ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This cannot be undone.', [
            { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
            {
                text: isArabic ? 'حذف' : 'Discard',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await draftsApi.discard(id);
                        navigation.goBack();
                    } catch (err) {
                        Alert.alert(isArabic ? 'فشل الحذف' : 'Discard failed', apiErrorMessage(err, 'Please retry.'));
                    }
                }
            }
        ]);
    };

    const handleCommit = async () => {
        if (!form.amount || Number(form.amount) <= 0) {
            return Alert.alert(isArabic ? 'المبلغ مطلوب' : 'Missing amount', isArabic ? 'يرجى تحديد المبلغ قبل الحفظ.' : 'Please set amount.');
        }
        if (!form.projectId) {
            return Alert.alert(isArabic ? 'المشروع مطلوب' : 'Missing project', isArabic ? 'يرجى تحديد المشروع التابع له هذه المعاملة.' : 'Please choose project.');
        }

        try {
            setSaving(true);
            const txRes = await transactionsApi.create({
                type: 'EXPENSE',
                amount: Number(form.amount),
                category: form.category,
                projectId: form.projectId,
                supplierId: form.supplierId || undefined,
                description: form.description,
                transactionDate: form.transactionDate || undefined
            });
            const newTx = txRes.data.data;
            await draftsApi.commit(id, newTx.id);
            Alert.alert(isArabic ? 'تم الحفظ' : 'Saved', isArabic ? 'تم تحويل المسودة إلى معاملة مالية معتمدة.' : 'Draft committed as a new transaction.');
            navigation.goBack();
        } catch (err) {
            Alert.alert(isArabic ? 'فشل الحفظ' : 'Save failed', apiErrorMessage(err, 'Please retry.'));
        } finally {
            setSaving(false);
        }
    };

    if (loading || !draft) {
        return (
            <SafeAreaView style={[s.container, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={theme.primary} />
            </SafeAreaView>
        );
    }

    const md = draft.matchedDraft || {};
    const matches = draft.matches || {};
    const isReadOnly = draft.status !== 'PENDING_REVIEW';

    const getCatLabel = (cat) => {
        if (!isArabic) return cat;
        const map = {
            'MATERIALS': 'مواد بناء',
            'LABOR': 'عمالة',
            'EQUIPMENT': 'معدات',
            'SERVICES': 'خدمات',
            'OTHER': 'أخرى'
        };
        return map[cat] || cat;
    };

    return (
        <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
            <View style={[s.topNav, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[s.topNavTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'مراجعة مسودة الذكاء الاصطناعي' : 'Review AI Draft'}</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
                <View style={[s.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="sparkles" size={20} color={theme.primary} />
                        <Text style={[s.title, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'مسودة مستخرجة بالذكاء الاصطناعي' : 'AI Extracted Draft'}</Text>
                    </View>
                    <Text style={[s.metaLine, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                        {draft.source} · {draft.confidence || 'high'} confidence · {draft.status}
                    </Text>
                </View>

                {/* Original media */}
                <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[s.cardTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'المدخلات الأصلية' : 'Your Input'}</Text>
                    {draft.source === 'VOICE' && draft.originalMediaUrl && (
                        <TouchableOpacity style={[s.audioRow, { backgroundColor: theme.cardAlt, flexDirection: isArabic ? 'row-reverse' : 'row' }]} onPress={togglePlayback}>
                            <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={36} color={theme.primary} />
                            <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>
                                {playing ? (isArabic ? 'جارِ التشغيل...' : 'Playing…') : (isArabic ? 'اضغط لسماع التسجيل الصوتي' : 'Tap to play recording')}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {draft.source === 'RECEIPT' && draft.originalMediaUrl && (
                        <Image
                            source={{ uri: draft.originalMediaUrl }}
                            style={s.receiptImg}
                            resizeMode="contain"
                        />
                    )}
                    {draft.transcript ? (
                        <View style={[s.transcriptBox, { backgroundColor: theme.cardAlt }]}>
                            <Text style={[s.cardTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'النص المفرغ من الصوت' : 'Transcript'}</Text>
                            <Text style={[s.transcript, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{draft.transcript}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Editable form */}
                <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[s.cardTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'البيانات المستخرجة' : 'Extracted Details'}</Text>

                    <FieldLabel label={isArabic ? 'المبلغ (جنيه)' : 'Amount (EGP)'} match={matches.amount} theme={theme} isArabic={isArabic} />
                    <TextInput
                        style={[s.input, { backgroundColor: theme.cardAlt, borderColor: theme.borderStrong, color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                        keyboardType="decimal-pad"
                        value={form.amount}
                        onChangeText={(v) => setForm(p => ({ ...p, amount: v }))}
                        editable={!isReadOnly}
                    />

                    <FieldLabel label={isArabic ? 'البند' : 'Category'} match={matches.category} theme={theme} isArabic={isArabic} />
                    <View style={[s.chipRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                        {CATEGORIES.map(cat => {
                            const active = form.category === cat;
                            return (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => !isReadOnly && setForm(prev => ({ ...prev, category: cat }))}
                                    style={[
                                        s.chip,
                                        {
                                            backgroundColor: active ? theme.primary : theme.cardAlt,
                                            borderColor: active ? theme.primary : theme.borderStrong
                                        }
                                    ]}
                                    disabled={isReadOnly}
                                >
                                    <Text style={[s.chipText, { color: active ? (theme.isDark ? '#000000' : '#ffffff') : theme.text, fontWeight: active ? '700' : '500' }]}>{getCatLabel(cat)}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <FieldLabel label={isArabic ? 'المشروع' : 'Project'} match={matches.project} theme={theme} isArabic={isArabic} />
                    <View style={s.selectGroup}>
                        {projects.slice(0, 8).map(p => {
                            const active = form.projectId === p.id;
                            return (
                                <TouchableOpacity
                                    key={p.id}
                                    onPress={() => !isReadOnly && setForm(prev => ({ ...prev, projectId: p.id }))}
                                    style={[
                                        s.selectItem,
                                        {
                                            backgroundColor: active ? theme.primaryLight : theme.cardAlt,
                                            borderColor: active ? theme.primary : theme.borderStrong
                                        }
                                    ]}
                                    disabled={isReadOnly}
                                >
                                    <Text style={[s.selectItemText, { color: active ? theme.primary : theme.text, fontWeight: active ? '700' : '500', textAlign: isArabic ? 'right' : 'left' }]}>{p.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <FieldLabel label={isArabic ? 'البيان / ملاحظات' : 'Description'} theme={theme} isArabic={isArabic} />
                    <TextInput
                        style={[s.input, { height: 60, backgroundColor: theme.cardAlt, borderColor: theme.borderStrong, color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                        multiline
                        value={form.description}
                        onChangeText={(v) => setForm(p => ({ ...p, description: v }))}
                        editable={!isReadOnly}
                    />

                    <FieldLabel label={isArabic ? 'التاريخ' : 'Date (YYYY-MM-DD)'} theme={theme} isArabic={isArabic} />
                    <TextInput
                        style={[s.input, { backgroundColor: theme.cardAlt, borderColor: theme.borderStrong, color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                        value={form.transactionDate}
                        onChangeText={(v) => setForm(p => ({ ...p, transactionDate: v }))}
                        editable={!isReadOnly}
                    />
                </View>

                {!isReadOnly && (
                    <View style={[s.actionRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                        <TouchableOpacity style={[s.secondaryBtn, { borderColor: theme.primary, backgroundColor: theme.card, flexDirection: isArabic ? 'row-reverse' : 'row' }]} onPress={handleRematch} disabled={rematching}>
                            {rematching
                                ? <ActivityIndicator color={theme.primary} />
                                : <><Ionicons name="refresh" size={16} color={theme.primary} /><Text style={[s.secondaryBtnText, { color: theme.primary }]}>{isArabic ? 'إعادة مطابقة' : 'Re-match'}</Text></>}
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.secondaryBtn, { borderColor: '#ef4444', backgroundColor: theme.card, flexDirection: isArabic ? 'row-reverse' : 'row' }]} onPress={handleDiscard}>
                            <Ionicons name="trash" size={16} color="#ef4444" />
                            <Text style={[s.secondaryBtnText, { color: '#ef4444' }]}>{isArabic ? 'حذف' : 'Discard'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.primaryBtn, { backgroundColor: theme.primary, flexDirection: isArabic ? 'row-reverse' : 'row' }]} onPress={handleCommit} disabled={saving}>
                            {saving
                                ? <ActivityIndicator color={theme.isDark ? '#000000' : '#ffffff'} />
                                : <><Ionicons name="save" size={18} color={theme.isDark ? '#000000' : '#ffffff'} /><Text style={[s.primaryBtnText, { color: theme.isDark ? '#000000' : '#ffffff' }]}>{isArabic ? 'حفظ المعاملة' : 'Save Transaction'}</Text></>}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function FieldLabel({ label, match, theme, isArabic }) {
    if (!match) return <Text style={[s.label, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{label}</Text>;
    if (match.matched) {
        return (
            <View style={[s.labelRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <Text style={[s.label, { color: theme.subtext }]}>{label}</Text>
                <View style={[s.matchPill, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[s.matchPillText, { color: theme.primary }]}>
                        {isArabic ? 'مطابقة AI' : 'AI matched'} · {Math.round((match.matched.confidence || 0) * 100)}%
                    </Text>
                </View>
            </View>
        );
    }
    return <Text style={[s.label, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{label}</Text>;
}

const s = StyleSheet.create({
    container: { flex: 1 },
    topNav: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 36,
        paddingBottom: 12,
        gap: 12
    },
    backBtn: { padding: 6 },
    topNavTitle: { fontSize: 18, fontWeight: '800', flex: 1 },
    header: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
    title: { fontSize: 16, fontWeight: '800' },
    metaLine: { fontSize: 12, marginTop: 4 },
    card: {
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1
    },
    cardTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10 },
    audioRow: { alignItems: 'center', gap: 12, padding: 12, borderRadius: 10 },
    receiptImg: { width: '100%', height: 280, borderRadius: 10 },
    transcriptBox: { marginTop: 12, padding: 12, borderRadius: 10 },
    transcript: { lineHeight: 20 },
    label: { fontWeight: '700', fontSize: 13, marginTop: 12, marginBottom: 6 },
    labelRow: { alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 },
    matchPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, maxWidth: '60%' },
    matchPillText: { fontSize: 10, fontWeight: '700' },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        fontSize: 14
    },
    chipRow: { flexWrap: 'wrap', gap: 6 },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1
    },
    chipText: { fontSize: 12 },
    selectGroup: { gap: 6 },
    selectItem: {
        padding: 12,
        borderRadius: 10,
        borderWidth: 1
    },
    selectItemText: { fontSize: 14 },
    actionRow: { gap: 8, marginTop: 8, flexWrap: 'wrap' },
    primaryBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 14,
        borderRadius: 12
    },
    primaryBtnText: { fontWeight: '800' },
    secondaryBtn: {
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderRadius: 12
    },
    secondaryBtnText: { fontWeight: '700' }
});
