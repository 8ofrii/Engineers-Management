import { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, SafeAreaView, TextInput, Alert, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { draftsApi, projectsApi, suppliersApi, transactionsApi } from '../services/api';

const CATEGORIES = ['MATERIALS', 'LABOR', 'EQUIPMENT', 'SERVICES', 'OTHER'];

export default function DraftReviewScreen({ route, navigation }) {
    const { id } = route.params || {};
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
            Alert.alert('Failed to load draft', err.response?.data?.message || String(err?.message || err));
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

    // Cleanup audio on unmount
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
            Alert.alert('Re-match failed', err.response?.data?.message || String(err?.message || err));
        } finally {
            setRematching(false);
        }
    };

    const handleDiscard = () => {
        Alert.alert('Discard draft?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Discard',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await draftsApi.discard(id);
                        navigation.goBack();
                    } catch (err) {
                        Alert.alert('Discard failed', err.response?.data?.message || String(err?.message || err));
                    }
                }
            }
        ]);
    };

    const handleCommit = async () => {
        if (!form.amount || Number(form.amount) <= 0) {
            return Alert.alert('Missing amount', 'Please set the amount before saving.');
        }
        if (!form.projectId) {
            return Alert.alert('Missing project', 'Please choose the project this transaction belongs to.');
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
            Alert.alert('Saved', 'Draft committed as a new transaction.');
            navigation.goBack();
        } catch (err) {
            const data = err.response?.data;
            const fieldErrors = Array.isArray(data?.errors) && data.errors.length
                ? data.errors.map(e => `${e.path}: ${e.message}`).join('\n')
                : null;
            Alert.alert('Save failed', fieldErrors || data?.message || String(err?.message || err));
        } finally {
            setSaving(false);
        }
    };

    if (loading || !draft) {
        return (
            <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color="#2563eb" />
            </SafeAreaView>
        );
    }

    const md = draft.matchedDraft || {};
    const matches = draft.matches || {};
    const isReadOnly = draft.status !== 'PENDING_REVIEW';

    return (
        <SafeAreaView style={s.container}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                <View style={s.header}>
                    <Ionicons name="sparkles" size={20} color="#2563eb" />
                    <Text style={s.title}>Review AI draft</Text>
                </View>
                <Text style={s.metaLine}>
                    {draft.source} · {draft.confidence || 'medium'} confidence · {draft.status}
                </Text>

                {/* Original media */}
                <View style={s.card}>
                    <Text style={s.cardTitle}>Your input</Text>
                    {draft.source === 'VOICE' && draft.originalMediaUrl && (
                        <TouchableOpacity style={s.audioRow} onPress={togglePlayback}>
                            <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={36} color="#2563eb" />
                            <Text style={{ color: '#374151', fontSize: 16 }}>
                                {playing ? 'Playing…' : 'Tap to play recording'}
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
                        <View style={s.transcriptBox}>
                            <Text style={s.cardTitle}>Transcript</Text>
                            <Text style={s.transcript}>{draft.transcript}</Text>
                        </View>
                    ) : null}
                    {Array.isArray(md.items) && md.items.length > 0 && (
                        <View style={{ marginTop: 12 }}>
                            <Text style={s.cardTitle}>Items detected</Text>
                            {md.items.map((it, i) => (
                                <Text key={i} style={s.itemLine}>
                                    • {it.name}
                                    {it.quantity != null ? ` — ${it.quantity}` : ''}
                                    {it.unit ? ` ${it.unit}` : ''}
                                    {it.materialMatch ? ` → ${it.materialMatch.name} (${Math.round((it.materialMatch.confidence || 0) * 100)}%)` : ''}
                                </Text>
                            ))}
                        </View>
                    )}
                </View>

                {/* Editable form */}
                <View style={s.card}>
                    <Text style={s.cardTitle}>Matched fields</Text>

                    {isReadOnly && (
                        <View style={s.warnBox}>
                            <Text style={s.warnText}>
                                {draft.status === 'COMMITTED' ? 'Already committed.' : 'Already discarded.'}
                            </Text>
                        </View>
                    )}

                    <FieldLabel label="Amount (EGP)" />
                    <TextInput
                        style={s.input}
                        keyboardType="decimal-pad"
                        value={form.amount}
                        onChangeText={(v) => setForm(p => ({ ...p, amount: v }))}
                        editable={!isReadOnly}
                    />

                    <FieldLabel label="Category" />
                    <View style={s.chipRow}>
                        {CATEGORIES.map(c => (
                            <TouchableOpacity
                                key={c}
                                onPress={() => !isReadOnly && setForm(p => ({ ...p, category: c }))}
                                style={[s.chip, form.category === c && s.chipActive]}
                                disabled={isReadOnly}
                            >
                                <Text style={[s.chipText, form.category === c && s.chipTextActive]}>{c}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <FieldLabel label="Project" match={matches.project} />
                    <View style={s.selectGroup}>
                        {projects.length === 0 ? (
                            <Text style={s.emptyHint}>No projects loaded</Text>
                        ) : projects.map(p => (
                            <TouchableOpacity
                                key={p.id}
                                onPress={() => !isReadOnly && setForm(prev => ({ ...prev, projectId: p.id }))}
                                style={[s.selectItem, form.projectId === p.id && s.selectItemActive]}
                                disabled={isReadOnly}
                            >
                                <Text style={[s.selectItemText, form.projectId === p.id && { color: 'white' }]}>{p.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <FieldLabel label="Supplier (optional)" match={matches.vendor} />
                    <View style={s.selectGroup}>
                        <TouchableOpacity
                            onPress={() => !isReadOnly && setForm(prev => ({ ...prev, supplierId: '' }))}
                            style={[s.selectItem, !form.supplierId && s.selectItemActive]}
                            disabled={isReadOnly}
                        >
                            <Text style={[s.selectItemText, !form.supplierId && { color: 'white' }]}>— none —</Text>
                        </TouchableOpacity>
                        {suppliers.map(sup => (
                            <TouchableOpacity
                                key={sup.id}
                                onPress={() => !isReadOnly && setForm(prev => ({ ...prev, supplierId: sup.id }))}
                                style={[s.selectItem, form.supplierId === sup.id && s.selectItemActive]}
                                disabled={isReadOnly}
                            >
                                <Text style={[s.selectItemText, form.supplierId === sup.id && { color: 'white' }]}>{sup.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <FieldLabel label="Description" />
                    <TextInput
                        style={[s.input, { height: 60 }]}
                        multiline
                        value={form.description}
                        onChangeText={(v) => setForm(p => ({ ...p, description: v }))}
                        editable={!isReadOnly}
                    />

                    <FieldLabel label="Date (YYYY-MM-DD)" />
                    <TextInput
                        style={s.input}
                        value={form.transactionDate}
                        onChangeText={(v) => setForm(p => ({ ...p, transactionDate: v }))}
                        editable={!isReadOnly}
                    />
                </View>

                {!isReadOnly && (
                    <View style={s.actionRow}>
                        <TouchableOpacity style={s.secondaryBtn} onPress={handleRematch} disabled={rematching}>
                            {rematching
                                ? <ActivityIndicator color="#2563eb" />
                                : <><Ionicons name="refresh" size={16} color="#2563eb" /><Text style={s.secondaryBtnText}>Re-match</Text></>}
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.secondaryBtn, { borderColor: '#dc2626' }]} onPress={handleDiscard}>
                            <Ionicons name="trash" size={16} color="#dc2626" />
                            <Text style={[s.secondaryBtnText, { color: '#dc2626' }]}>Discard</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.primaryBtn} onPress={handleCommit} disabled={saving}>
                            {saving
                                ? <ActivityIndicator color="white" />
                                : <><Ionicons name="save" size={18} color="white" /><Text style={s.primaryBtnText}>Save transaction</Text></>}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function FieldLabel({ label, match }) {
    if (!match) return <Text style={s.label}>{label}</Text>;
    if (match.matched) {
        return (
            <View style={s.labelRow}>
                <Text style={s.label}>{label}</Text>
                <View style={[s.matchPill, { backgroundColor: '#dbeafe' }]}>
                    <Text style={[s.matchPillText, { color: '#1e40af' }]}>
                        AI matched · {Math.round((match.matched.confidence || 0) * 100)}%
                    </Text>
                </View>
            </View>
        );
    }
    if (match.raw) {
        return (
            <View style={s.labelRow}>
                <Text style={s.label}>{label}</Text>
                <View style={[s.matchPill, { backgroundColor: '#fef3c7' }]}>
                    <Text style={[s.matchPillText, { color: '#92400e' }]} numberOfLines={1}>
                        AI heard "{match.raw}"
                    </Text>
                </View>
            </View>
        );
    }
    return <Text style={s.label}>{label}</Text>;
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#111827' },
    metaLine: { color: '#6b7280', fontSize: 12, marginTop: 4, marginBottom: 12 },
    card: {
        backgroundColor: 'white', borderRadius: 12, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb'
    },
    cardTitle: { fontWeight: '600', color: '#111827', marginBottom: 8 },
    audioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    receiptImg: { width: '100%', height: 280, backgroundColor: '#f3f4f6', borderRadius: 8 },
    transcriptBox: { marginTop: 12, padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 },
    transcript: { color: '#374151' },
    itemLine: { color: '#374151', fontSize: 13, marginVertical: 2 },
    label: { fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 6 },
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 },
    matchPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, maxWidth: '60%' },
    matchPillText: { fontSize: 10, fontWeight: '600' },
    input: {
        borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
        padding: 10, color: '#111827', backgroundColor: 'white'
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
        borderWidth: 1, borderColor: '#d1d5db', backgroundColor: 'white'
    },
    chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    chipText: { color: '#374151', fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: 'white' },
    selectGroup: { gap: 4 },
    selectItem: {
        padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: 'white'
    },
    selectItemActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    selectItemText: { color: '#111827' },
    emptyHint: { color: '#9ca3af', fontStyle: 'italic' },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
    primaryBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, backgroundColor: '#2563eb', padding: 14, borderRadius: 10
    },
    primaryBtnText: { color: 'white', fontWeight: '700' },
    secondaryBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 12, paddingHorizontal: 16,
        borderWidth: 1, borderColor: '#2563eb', borderRadius: 10, backgroundColor: 'white'
    },
    secondaryBtnText: { color: '#2563eb', fontWeight: '600' },
    warnBox: {
        backgroundColor: '#fef3c7', padding: 10, borderRadius: 8, marginBottom: 10
    },
    warnText: { color: '#92400e' }
});
