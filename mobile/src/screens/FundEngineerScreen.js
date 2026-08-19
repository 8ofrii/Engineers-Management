import { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
    SafeAreaView, Alert, Modal, ActivityIndicator,
    KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { custodyApi, usersApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useFormat } from '../utils/format';

export default function FundEngineerScreen({ navigation }) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();
    const { currency } = useFormat();
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
        if (!selected) return Alert.alert(isArabic ? 'تنبيه' : 'Alert', isArabic ? 'يرجى اختيار المهندس' : 'Please select an engineer');
        if (!amount || Number(amount) <= 0) return Alert.alert(isArabic ? 'تنبيه' : 'Alert', isArabic ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
        setSubmitting(true);
        try {
            const res = await custodyApi.fund(selected.id, Number(amount), description);
            const newBalance = res.data?.balanceAfter ?? '?';
            Alert.alert(
                isArabic ? 'تم التحويل بنجاح' : 'Funding Successful',
                isArabic ? `تم تحويل العهدة للمهندس ${selected.name}.\nالرصيد الجديد: ${currency(newBalance)}` : `Funded ${selected.name}.\nNew Balance: ${currency(newBalance)}`,
                [{ text: isArabic ? 'حسناً' : 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (err) {
            Alert.alert(isArabic ? 'خطأ' : 'Error', err.response?.data?.message || err.message);
        } finally { setSubmitting(false); }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            <View style={[styles.header, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'تحويل عهدة لمهندس' : 'Fund Engineer Custody'}</Text>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.label, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'اختر المهندس' : 'Select Engineer'} *</Text>
                    <TouchableOpacity
                        style={[styles.selector, { backgroundColor: theme.card, borderColor: theme.borderStrong }]}
                        onPress={() => setShowPicker(true)}
                        activeOpacity={0.8}
                    >
                        {selected ? (
                            <View>
                                <Text style={[styles.selectorText, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{selected.name}</Text>
                                <Text style={[styles.selectorSub, { color: theme.primary, textAlign: isArabic ? 'right' : 'left' }]}>
                                    {selected.role}
                                    {selected.balance ? ` · ${isArabic ? 'الرصيد الحالي' : 'Balance'}: ${currency(selected.balance.currentCustodyBalance)}` : ''}
                                </Text>
                            </View>
                        ) : (
                            <Text style={[styles.selectorPlaceholder, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'اضغط لاختيار المهندس المستلم...' : 'Tap to select engineer...'}</Text>
                        )}
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'المبلغ (جنيه)' : 'Amount (EGP)'} *</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                        keyboardType="decimal-pad"
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0.00"
                        placeholderTextColor={theme.subtext}
                    />

                    <Text style={[styles.label, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'البيان / سبب التحويل' : 'Description / Notes'}</Text>
                    <TextInput
                        style={[styles.input, { minHeight: 80, textAlignVertical: 'top', backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder={isArabic ? 'أدخل تفاصيل الدفعة أو المشروع التابع له...' : 'Enter details or project purpose...'}
                        placeholderTextColor={theme.subtext}
                        multiline
                    />

                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: theme.success }, submitting && { opacity: 0.6 }]}
                        onPress={onSubmit}
                        disabled={submitting}
                        activeOpacity={0.8}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="cash" size={20} color="#fff" />
                                <Text style={styles.submitText}>{isArabic ? 'تأكيد تحويل العهدة' : 'Confirm Custody Funding'}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={[styles.infoBox, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                        <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Ionicons name="information-circle" size={18} color={theme.primary} />
                            <Text style={[styles.infoTitle, { color: theme.primary }]}>{isArabic ? 'آلية عمل العهدة' : 'How Custody Works'}</Text>
                        </View>
                        <Text style={[styles.infoText, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                            {isArabic
                                ? 'يتم إضافة هذا المبلغ فوراً إلى محفظة العهدة الخاصة بالمهندس لتسجيل مصروفات المواقع الميدانية منها.'
                                : 'This amount will be immediately added to the engineer custody balance to spend on field operations.'}
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal visible={showPicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                            <Text style={[styles.modalTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'اختر المهندس' : 'Select Engineer'}</Text>
                            <TouchableOpacity onPress={() => setShowPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {engineers.length === 0 ? (
                                <Text style={[styles.empty, { color: theme.subtext }]}>{isArabic ? 'لا يوجد مهندسون متاحون' : 'No engineers found'}</Text>
                            ) : engineers.map(e => (
                                <TouchableOpacity
                                    key={e.id}
                                    style={[styles.modalItem, { borderBottomColor: theme.border }]}
                                    onPress={() => { setSelected(e); setShowPicker(false); }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.modalItemText, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{e.name}</Text>
                                    <Text style={[styles.modalItemMeta, { color: theme.primary, textAlign: isArabic ? 'right' : 'left' }]}>
                                        {e.role}
                                        {e.balance ? ` · ${currency(e.balance.currentCustodyBalance)}` : ''}
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
    container: { flex: 1 },
    header: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 36,
        paddingBottom: 14,
        gap: 12
    },
    backBtn: { padding: 6 },
    title: { fontSize: 18, fontWeight: '800', flex: 1 },
    form: { padding: 16, paddingBottom: 90 },
    label: { fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 8 },
    selector: { padding: 14, borderRadius: 12, borderWidth: 1 },
    selectorText: { fontSize: 15, fontWeight: '700' },
    selectorSub: { fontSize: 12, marginTop: 4, fontWeight: '600' },
    selectorPlaceholder: { fontSize: 14 },
    input: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 15 },
    submitBtn: { padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    infoBox: { marginTop: 20, padding: 14, borderRadius: 12, borderWidth: 1 },
    infoTitle: { fontSize: 13, fontWeight: '700' },
    infoText: { fontSize: 12, lineHeight: 18 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { maxHeight: '70%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
    modalHeader: { justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    modalTitle: { fontSize: 17, fontWeight: '800' },
    modalItem: { padding: 16, borderBottomWidth: 1 },
    modalItemText: { fontSize: 15, fontWeight: '700' },
    modalItemMeta: { fontSize: 13, marginTop: 2, fontWeight: '600' },
    empty: { padding: 40, textAlign: 'center' }
});

