import { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { projectsApi, transactionsApi } from '../services/api';

const CATEGORIES_EXPENSE = [
    'CONCRETE', 'CEMENT', 'SAND', 'BRICKS',
    'SITE_CLEANING', 'STOCKING',
    'GENERAL_LABOR', 'MASONRY_LABOR',
    'PLASTERING_MATERIALS', 'PLASTERING_LABOR',
    'PLUMBING_MATERIALS', 'PLUMBING_LABOR',
    'ELECTRICAL_MATERIALS', 'ELECTRICAL_LABOR',
    'CERAMIC_MATERIALS', 'CERAMIC_LABOR',
    'PAINTING_MATERIALS', 'PAINTING_LABOR',
    'GYPSUM_MATERIALS', 'GYPSUM_LABOR',
    'CARPENTRY_MATERIALS', 'CARPENTRY_LABOR',
    'TRANSPORT', 'TIPS', 'DECOR', 'DRAWINGS',
    'INSULATION_LABOR', 'HVAC_PREP', 'ALUMETAL',
    'MATERIALS', 'LABOR', 'EQUIPMENT', 'SERVICES', 'OTHER'
];

const CATEGORIES_INCOME = ['PAYMENT', 'OTHER'];
const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CHECK', 'CUSTODY_WALLET', 'OTHER'];

export default function AddTransactionScreen({ navigation, route }) {
    const { t } = useTranslation();
    const preset = route?.params || {};
    const [type, setType] = useState(preset.type || 'EXPENSE');
    const [projectId, setProjectId] = useState(preset.projectId || null);
    const [projectName, setProjectName] = useState(preset.projectName || '');
    const [category, setCategory] = useState(null);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [createBatch, setCreateBatch] = useState(false);
    const [projects, setProjects] = useState([]);
    const [showProjectPicker, setShowProjectPicker] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        projectsApi.list()
            .then(r => setProjects((r.data?.data || []).filter(p => p.status !== 'CANCELLED')))
            .catch(() => setProjects([]));
    }, []);

    const onSubmit = async () => {
        if (!projectId) return Alert.alert(t('common.error'), t('addTx.selectProject'));
        if (!category) return Alert.alert(t('common.error'), t('addTx.selectCategory'));
        if (!amount || Number(amount) <= 0) return Alert.alert(t('common.error'), t('addTx.invalidAmount'));

        setSubmitting(true);
        try {
            const payload = {
                type,
                category,
                amount: Number(amount),
                projectId,
                description: description || `${type} - ${category}`,
                paymentMethod,
                transactionDate: new Date().toISOString(),
                createBatch: type === 'EXPENSE' ? createBatch : false
            };
            await transactionsApi.create(payload);
            Alert.alert(t('addTx.success'), t('addTx.successMsg'), [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (err) {
            const msg = err.response?.data?.message ||
                err.response?.data?.errors?.map(e => e.message).join(', ') ||
                err.message;
            Alert.alert(t('common.error'), msg);
        } finally {
            setSubmitting(false);
        }
    };

    const categories = type === 'INCOME' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backLink}>{'< '}{t('common.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('addTx.title')}</Text>
                <View style={{ width: 50 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.form}>
                    <Text style={styles.label}>{t('addTx.type')}</Text>
                    <View style={styles.typeRow}>
                        {['EXPENSE', 'INCOME'].map(opt => (
                            <TouchableOpacity
                                key={opt}
                                style={[
                                    styles.typeBtn,
                                    type === opt && (opt === 'EXPENSE' ? styles.typeExpenseActive : styles.typeIncomeActive)
                                ]}
                                onPress={() => { setType(opt); setCategory(null); }}
                            >
                                <Text style={[
                                    styles.typeText,
                                    type === opt && { color: '#fff' }
                                ]}>
                                    {t(`addTx.${opt.toLowerCase()}`)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>{t('addTx.project')} *</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => setShowProjectPicker(true)}>
                        <Text style={projectName ? styles.selectorText : styles.selectorPlaceholder}>
                            {projectName || t('addTx.selectProject')}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>{t('addTx.category')} *</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => setShowCategoryPicker(true)}>
                        <Text style={category ? styles.selectorText : styles.selectorPlaceholder}>
                            {category ? category.replace(/_/g, ' ') : t('addTx.selectCategory')}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>{t('addTx.amount')} (EGP) *</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0"
                    />

                    <Text style={styles.label}>{t('addTx.description')}</Text>
                    <TextInput
                        style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder={t('addTx.descriptionPlaceholder')}
                        multiline
                    />

                    <Text style={styles.label}>{t('addTx.paymentMethod')}</Text>
                    <View style={styles.paymentRow}>
                        {PAYMENT_METHODS.map(pm => (
                            <TouchableOpacity
                                key={pm}
                                style={[styles.pmPill, paymentMethod === pm && styles.pmPillActive]}
                                onPress={() => setPaymentMethod(pm)}
                            >
                                <Text style={[styles.pmText, paymentMethod === pm && styles.pmTextActive]}>
                                    {pm.replace(/_/g, ' ')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {type === 'EXPENSE' && (
                        <TouchableOpacity
                            style={styles.toggleRow}
                            onPress={() => setCreateBatch(!createBatch)}
                        >
                            <View style={[styles.checkbox, createBatch && styles.checkboxActive]}>
                                {createBatch && <Text style={{ color: '#fff', fontSize: 14 }}>✓</Text>}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.toggleLabel}>{t('addTx.inventoryPurchase')}</Text>
                                <Text style={styles.toggleHint}>{t('addTx.inventoryHint')}</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                        onPress={onSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitText}>{t('addTx.submit')}</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Project Picker Modal */}
            <Modal visible={showProjectPicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('addTx.selectProject')}</Text>
                            <TouchableOpacity onPress={() => setShowProjectPicker(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {projects.map(p => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={styles.modalItem}
                                    onPress={() => {
                                        setProjectId(p.id);
                                        setProjectName(p.name);
                                        setShowProjectPicker(false);
                                    }}
                                >
                                    <Text style={styles.modalItemText}>{p.name}</Text>
                                    <Text style={styles.modalItemMeta}>
                                        {p.client?.name} · {p.status}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Category Picker Modal */}
            <Modal visible={showCategoryPicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('addTx.selectCategory')}</Text>
                            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {categories.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    style={styles.modalItem}
                                    onPress={() => {
                                        setCategory(c);
                                        setShowCategoryPicker(false);
                                    }}
                                >
                                    <Text style={styles.modalItemText}>{c.replace(/_/g, ' ')}</Text>
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
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 14, paddingTop: 50, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
    },
    backLink: { color: '#2563eb', fontSize: 14, fontWeight: '600', width: 60 },
    headerTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'center' },

    form: { padding: 16, paddingBottom: 40 },

    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 6 },

    typeRow: { flexDirection: 'row', gap: 8 },
    typeBtn: {
        flex: 1, padding: 14, borderRadius: 10,
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
        alignItems: 'center'
    },
    typeIncomeActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
    typeExpenseActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
    typeText: { fontSize: 14, fontWeight: '600', color: '#374151' },

    selector: {
        backgroundColor: '#fff', padding: 14, borderRadius: 10,
        borderWidth: 1, borderColor: '#e5e7eb'
    },
    selectorText: { fontSize: 14, color: '#111827' },
    selectorPlaceholder: { fontSize: 14, color: '#9ca3af' },

    input: {
        backgroundColor: '#fff', padding: 14, borderRadius: 10,
        borderWidth: 1, borderColor: '#e5e7eb', fontSize: 14
    },

    paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pmPill: {
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb'
    },
    pmPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    pmText: { fontSize: 12, color: '#374151' },
    pmTextActive: { color: '#fff' },

    toggleRow: {
        flexDirection: 'row', alignItems: 'center', marginTop: 16,
        backgroundColor: '#fff', padding: 12, borderRadius: 10,
        borderWidth: 1, borderColor: '#e5e7eb'
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 5,
        borderWidth: 2, borderColor: '#9ca3af', marginRight: 10,
        justifyContent: 'center', alignItems: 'center'
    },
    checkboxActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    toggleLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
    toggleHint: { fontSize: 11, color: '#6b7280', marginTop: 2 },

    submitBtn: {
        backgroundColor: '#2563eb', padding: 16, borderRadius: 10,
        alignItems: 'center', marginTop: 24
    },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#fff', maxHeight: '70%',
        borderTopLeftRadius: 16, borderTopRightRadius: 16
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
    },
    modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    modalClose: { fontSize: 22, color: '#6b7280' },
    modalItem: {
        padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6'
    },
    modalItemText: { fontSize: 14, color: '#111827', fontWeight: '500' },
    modalItemMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 }
});
