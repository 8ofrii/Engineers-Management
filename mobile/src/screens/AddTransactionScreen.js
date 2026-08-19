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
import { Ionicons } from '@expo/vector-icons';
import { projectsApi, transactionsApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';

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
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();
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

    const getCategoryLabel = (cat) => {
        if (!cat) return '';
        if (!isArabic) return cat.replace(/_/g, ' ');
        const map = {
            'CONCRETE': 'خرسانة جاهزة',
            'CEMENT': 'أسمنت ومواد لاصقة',
            'SAND': 'رمل وهالك',
            'BRICKS': 'طوب وبناء',
            'SITE_CLEANING': 'نظافة وتشوين موقع',
            'STOCKING': 'تشوين وعتالة',
            'GENERAL_LABOR': 'عمالة مساعدة وعادية',
            'MASONRY_LABOR': 'مصنعية بناء',
            'PLASTERING_MATERIALS': 'خامات محارة ومصيص',
            'PLASTERING_LABOR': 'مصنعية محارة',
            'PLUMBING_MATERIALS': 'خامات سباكة وتأسيس',
            'PLUMBING_LABOR': 'مصنعية سباكة',
            'ELECTRICAL_MATERIALS': 'خامات كهرباء وأسلاك',
            'ELECTRICAL_LABOR': 'مصنعية كهرباء',
            'CERAMIC_MATERIALS': 'سيراميك وبورسلين ومواد',
            'CERAMIC_LABOR': 'مصنعية تركيب سيراميك',
            'PAINTING_MATERIALS': 'خامات دهانات ومعجون',
            'PAINTING_LABOR': 'مصنعية دهانات',
            'GYPSUM_MATERIALS': 'جبسوم بورد وإكسسوارات',
            'GYPSUM_LABOR': 'مصنعية جبسوم بورد',
            'CARPENTRY_MATERIALS': 'أخشاب ونجارة باب وشباك',
            'CARPENTRY_LABOR': 'مصنعية نجارة',
            'TRANSPORT': 'نقل ومشال ونقليات',
            'TIPS': 'إكراميات ومصروفات نثرية',
            'DECOR': 'ديكورات وتكسيات',
            'DRAWINGS': 'رسومات وتراخيص هندسية',
            'INSULATION_LABOR': 'مصنعية وخامات عزل',
            'HVAC_PREP': 'تجهيزات وتمديدات تكييف',
            'ALUMETAL': 'ألوميتال وواجهات',
            'MATERIALS': 'مواد بناء وتوريدات عامة',
            'LABOR': 'أجور عمالة',
            'EQUIPMENT': 'إيجار معدات وآلات',
            'SERVICES': 'خدمات واستشارات',
            'PAYMENT': 'دفعة من العميل',
            'OTHER': 'أخرى'
        };
        return map[cat] || cat.replace(/_/g, ' ');
    };

    const getPMLabel = (pm) => {
        if (!pm) return '';
        if (!isArabic) return pm.replace(/_/g, ' ');
        const map = {
            'CASH': 'نقدي (كاش)',
            'BANK_TRANSFER': 'تحويل بنكي',
            'CHECK': 'شيك بنكي',
            'CUSTODY_WALLET': 'عهدة / محفظة',
            'OTHER': 'أخرى'
        };
        return map[pm] || pm.replace(/_/g, ' ');
    };

    useEffect(() => {
        projectsApi.list()
            .then(r => setProjects((r.data?.data || []).filter(p => p.status !== 'CANCELLED')))
            .catch(() => setProjects([]));
    }, []);

    const onSubmit = async () => {
        if (!projectId) return Alert.alert(isArabic ? 'تنبيه' : 'Error', isArabic ? 'برجاء اختيار المشروع أولاً' : 'Please select a project');
        if (!category) return Alert.alert(isArabic ? 'تنبيه' : 'Error', isArabic ? 'برجاء اختيار بند المصروف / الإيراد' : 'Please select a category');
        if (!amount || Number(amount) <= 0) return Alert.alert(isArabic ? 'تنبيه' : 'Error', isArabic ? 'برجاء كتابة مبلغ صحيح' : 'Please enter a valid amount');

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
            Alert.alert(
                isArabic ? 'تم الحفظ بنجاح' : 'Success',
                isArabic ? 'تم تسجيل المعاملة بنجاح وإرسالها للمراجعة' : 'Transaction created successfully',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (err) {
            const msg = err.response?.data?.message ||
                err.response?.data?.errors?.map(e => e.message).join(', ') ||
                err.message;
            Alert.alert(isArabic ? 'خطأ' : 'Error', msg);
        } finally {
            setSubmitting(false);
        }
    };

    const categories = type === 'INCOME' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={[styles.header, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                    {isArabic ? 'تسجيل معاملة مالية' : 'New Transaction'}
                </Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
                    {/* AI capture shortcut banner */}
                    <TouchableOpacity
                        style={[styles.aiBox, { backgroundColor: theme.primaryLight, borderColor: theme.primary, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
                        onPress={() => navigation.navigate('DraftsList')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="sparkles" size={22} color={theme.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.aiTitle, { color: theme.primary, textAlign: isArabic ? 'right' : 'left' }]}>
                                {isArabic ? 'التسجيل الذكي بالذكاء الاصطناعي' : 'Use AI to Capture'}
                            </Text>
                            <Text style={[styles.aiSubtitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                                {isArabic ? 'سجل ملاحظة صوتية أو التقط صورة للإيصال وسيقوم المساعد بملء البيانات فوراً' : 'Record voice or take a receipt photo — AI drafts it'}
                            </Text>
                        </View>
                        <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.primary} />
                    </TouchableOpacity>

                    {/* Transaction Type Toggle */}
                    <Text style={[styles.label, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'نوع المعاملة' : 'Transaction Type'}</Text>
                    <View style={[styles.typeRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                        {[
                            { key: 'EXPENSE', label: isArabic ? 'مصروف (-)' : 'Expense' },
                            { key: 'INCOME', label: isArabic ? 'دفعة / إيراد (+)' : 'Income' }
                        ].map(opt => {
                            const active = type === opt.key;
                            return (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[
                                        styles.typeBtn,
                                        {
                                            backgroundColor: active ? (opt.key === 'EXPENSE' ? '#ef4444' : '#10b981') : theme.card,
                                            borderColor: active ? (opt.key === 'EXPENSE' ? '#ef4444' : '#10b981') : theme.borderStrong
                                        }
                                    ]}
                                    onPress={() => { setType(opt.key); setCategory(null); }}
                                >
                                    <Text style={[styles.typeText, { color: active ? '#ffffff' : theme.text, fontWeight: active ? '700' : '600' }]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Project Selector */}
                    <Text style={[styles.label, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'المشروع' : 'Project'} *</Text>
                    <TouchableOpacity
                        style={[styles.selector, { backgroundColor: theme.card, borderColor: theme.borderStrong, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
                        onPress={() => setShowProjectPicker(true)}
                    >
                        <Text style={[styles.selectorText, { color: projectName ? theme.text : theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                            {projectName || (isArabic ? 'اختر المشروع...' : 'Select project...')}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={theme.subtext} />
                    </TouchableOpacity>

                    {/* Category Selector */}
                    <Text style={[styles.label, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'البند / الفئة' : 'Category'} *</Text>
                    <TouchableOpacity
                        style={[styles.selector, { backgroundColor: theme.card, borderColor: theme.borderStrong, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
                        onPress={() => setShowCategoryPicker(true)}
                    >
                        <Text style={[styles.selectorText, { color: category ? theme.text : theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                            {category ? getCategoryLabel(category) : (isArabic ? 'اختر بند المصروف...' : 'Select category...')}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={theme.subtext} />
                    </TouchableOpacity>

                    {/* Amount */}
                    <Text style={[styles.label, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'المبلغ (جنيه مصري)' : 'Amount (EGP)'} *</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                        keyboardType="decimal-pad"
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0.00"
                        placeholderTextColor={theme.subtext}
                    />

                    {/* Description */}
                    <Text style={[styles.label, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'البيان / ملاحظات' : 'Description / Notes'}</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text, minHeight: 70, textAlignVertical: 'top', textAlign: isArabic ? 'right' : 'left' }]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder={isArabic ? 'تفاصيل الفاتورة أو المشتريات...' : 'Invoice details, vendor notes...'}
                        placeholderTextColor={theme.subtext}
                        multiline
                    />

                    {/* Payment Method */}
                    <Text style={[styles.label, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'طريقة الدفع' : 'Payment Method'}</Text>
                    <View style={[styles.paymentRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                        {PAYMENT_METHODS.map(pm => {
                            const active = paymentMethod === pm;
                            return (
                                <TouchableOpacity
                                    key={pm}
                                    style={[
                                        styles.pmPill,
                                        {
                                            backgroundColor: active ? theme.primary : theme.card,
                                            borderColor: active ? theme.primary : theme.borderStrong
                                        }
                                    ]}
                                    onPress={() => setPaymentMethod(pm)}
                                >
                                    <Text style={[styles.pmText, { color: active ? (theme.isDark ? '#000000' : '#ffffff') : theme.text, fontWeight: active ? '700' : '500' }]}>
                                        {getPMLabel(pm)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: theme.primary }, submitting && { opacity: 0.6 }]}
                        onPress={onSubmit}
                        disabled={submitting}
                        activeOpacity={0.8}
                    >
                        {submitting ? (
                            <ActivityIndicator color={theme.isDark ? '#000000' : '#ffffff'} />
                        ) : (
                            <Text style={[styles.submitText, { color: theme.isDark ? '#000000' : '#ffffff' }]}>{isArabic ? 'حفظ المعاملة' : 'Save Transaction'}</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Project Picker Modal */}
            <Modal visible={showProjectPicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                            <Text style={[styles.modalTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'اختر المشروع' : 'Select Project'}</Text>
                            <TouchableOpacity onPress={() => setShowProjectPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.subtext} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {projects.map(p => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={[styles.modalItem, { borderBottomColor: theme.border }]}
                                    onPress={() => {
                                        setProjectId(p.id);
                                        setProjectName(p.name);
                                        setShowProjectPicker(false);
                                    }}
                                >
                                    <Text style={[styles.modalItemText, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{p.name}</Text>
                                    <Text style={[styles.modalItemMeta, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
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
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                            <Text style={[styles.modalTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'اختر البند' : 'Select Category'}</Text>
                            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.subtext} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {categories.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    style={[styles.modalItem, { borderBottomColor: theme.border }]}
                                    onPress={() => {
                                        setCategory(c);
                                        setShowCategoryPicker(false);
                                    }}
                                >
                                    <Text style={[styles.modalItemText, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{getCategoryLabel(c)}</Text>
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
    container: {
        flex: 1
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 36,
        paddingBottom: 14,
        gap: 12
    },
    backBtn: {
        padding: 6
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        flex: 1
    },
    form: {
        padding: 16,
        paddingBottom: 90
    },
    aiBox: {
        alignItems: 'center',
        gap: 12,
        padding: 14,
        marginBottom: 16,
        borderRadius: 14,
        borderWidth: 1
    },
    aiTitle: {
        fontWeight: '800',
        fontSize: 14
    },
    aiSubtitle: {
        fontSize: 12,
        marginTop: 2,
        lineHeight: 16
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        marginTop: 14,
        marginBottom: 6
    },
    typeRow: {
        flexDirection: 'row',
        gap: 8
    },
    typeBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center'
    },
    typeText: {
        fontSize: 14
    },
    selector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1
    },
    selectorText: {
        fontSize: 14,
        fontWeight: '600'
    },
    input: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        fontSize: 15
    },
    paymentRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    pmPill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1
    },
    pmText: {
        fontSize: 12
    },
    submitBtn: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 24
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        maxHeight: '75%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 30
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '800'
    },
    modalItem: {
        padding: 16,
        borderBottomWidth: 1
    },
    modalItemText: {
        fontSize: 15,
        fontWeight: '600'
    },
    modalItemMeta: {
        fontSize: 12,
        marginTop: 3
    }
});

