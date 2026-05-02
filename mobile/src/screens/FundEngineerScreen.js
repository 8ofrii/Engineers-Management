import { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
    SafeAreaView, Alert, Modal, ActivityIndicator,
    KeyboardAvoidingView, Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { custodyApi, usersApi } from '../services/api';

const fmtEGP = (n) => Number(n || 0).toLocaleString('en-EG', { maximumFractionDigits: 2 });

export default function FundEngineerScreen({ navigation }) {
    const { t } = useTranslation();
    const [engineers, setEngineers] = useState([]);
    const [selected, setSelected] = useState(null);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [usersRes, custodyRes] = await Promise.all([
                    usersApi.list().catch(() => ({ data: { data: [] } })),
                    custodyApi.all().catch(() => ({ data: { data: [] } }))
                ]);
                const all = usersRes.data?.data || [];
                const balances = custodyRes.data?.data || [];
                const balByUser = Object.fromEntries(balances.map(b => [b.id, b]));
                const eligible = all
                    .filter(u => u.role === 'ENGINEER' || u.role === 'PROJECT_MANAGER')
                    .map(u => ({ ...u, balance: balByUser[u.id] }));
                setEngineers(eligible);
            } catch { setEngineers([]); }
        })();
    }, []);

    const onSubmit = async () => {
        if (!selected) return Alert.alert(t('common.error'), t('fund.selectEngineer'));
        if (!amount || Number(amount) <= 0) return Alert.alert(t('common.error'), t('fund.invalidAmount'));
        setSubmitting(true);
        try {
            const res = await custodyApi.fund(selected.id, Number(amount), description);
            const newBalance = res.data?.balanceAfter ?? '?';
            Alert.alert(t('fund.success'), t('fund.successMsg', { name: selected.name, balance: fmtEGP(newBalance) }), [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (err) {
            Alert.alert(t('common.error'), err.response?.data?.message || err.message);
        } finally { setSubmitting(false); }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{'< '}{t('common.back')}</Text></TouchableOpacity>
                <Text style={styles.title}>{t('fund.title')}</Text>
                <View style={{ width: 50 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.form}>
                    <Text style={styles.label}>{t('fund.engineer')} *</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => setShowPicker(true)}>
                        {selected ? (
                            <View>
                                <Text style={styles.selectorText}>{selected.name}</Text>
                                <Text style={styles.selectorSub}>
                                    {selected.role}
                                    {selected.balance ? ` · ${t('fund.currentBalance')}: ${fmtEGP(selected.balance.currentCustodyBalance)} EGP` : ''}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.selectorPlaceholder}>{t('fund.selectEngineer')}</Text>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.label}>{t('fund.amount')} (EGP) *</Text>
                    <TextInput style={styles.input} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0" />

                    <Text style={styles.label}>{t('fund.description')}</Text>
                    <TextInput
                        style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                        value={description} onChangeText={setDescription}
                        placeholder={t('fund.descriptionPlaceholder')} multiline
                    />

                    <TouchableOpacity
                        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                        onPress={onSubmit} disabled={submitting}
                    >
                        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('fund.submit')}</Text>}
                    </TouchableOpacity>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>{t('fund.howItWorks')}</Text>
                        <Text style={styles.infoText}>{t('fund.howItWorksText')}</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal visible={showPicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('fund.selectEngineer')}</Text>
                            <TouchableOpacity onPress={() => setShowPicker(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
                        </View>
                        <ScrollView>
                            {engineers.length === 0 ? (
                                <Text style={styles.empty}>{t('common.empty')}</Text>
                            ) : engineers.map(e => (
                                <TouchableOpacity key={e.id} style={styles.modalItem} onPress={() => { setSelected(e); setShowPicker(false); }}>
                                    <Text style={styles.modalItemText}>{e.name}</Text>
                                    <Text style={styles.modalItemMeta}>
                                        {e.role}
                                        {e.balance ? ` · ${fmtEGP(e.balance.currentCustodyBalance)} EGP` : ''}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    back: { color: '#2563eb', fontSize: 14, fontWeight: '600', width: 60 },
    title: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'center' },
    form: { padding: 16, paddingBottom: 40 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 6 },
    selector: { backgroundColor: '#fff', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
    selectorText: { fontSize: 14, color: '#111827', fontWeight: '500' },
    selectorSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
    selectorPlaceholder: { fontSize: 14, color: '#9ca3af' },
    input: { backgroundColor: '#fff', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 14 },
    submitBtn: { backgroundColor: '#10b981', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 24 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    infoBox: { marginTop: 16, padding: 12, borderRadius: 8, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
    infoTitle: { fontSize: 12, fontWeight: '700', color: '#1e40af', marginBottom: 4 },
    infoText: { fontSize: 11, color: '#1e40af', lineHeight: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', maxHeight: '70%', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    modalClose: { fontSize: 22, color: '#6b7280' },
    modalItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    modalItemText: { fontSize: 14, color: '#111827', fontWeight: '500' },
    modalItemMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    empty: { padding: 40, textAlign: 'center', color: '#9ca3af' }
});
