import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
    Image,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

export default function RegisterScreen({ navigation }) {
    const { t, i18n } = useTranslation();
    const { theme } = useTheme();
    const { setSession } = useAuth();
    const isArabic = i18n.language === 'ar';

    // Steps: 1 = Company details, 2 = 2FA email verification code
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [form, setForm] = useState({
        companyName: '',
        adminName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        code: ''
    });

    const updateField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    // Step 1: Request Registration OTP
    const handleRegisterSubmit = async () => {
        if (!form.companyName || !form.adminName || !form.email || !form.password) {
            setErrorMessage(isArabic ? 'يرجى ملء كافة الحقول الإلزامية.' : 'Please fill all required fields.');
            return;
        }

        if (form.password !== form.confirmPassword) {
            setErrorMessage(isArabic ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
            return;
        }

        if (form.password.length < 6) {
            setErrorMessage(isArabic ? 'يجب ألا تقل كلمة المرور عن 6 أحرف.' : 'Password must be at least 6 characters.');
            return;
        }

        setSubmitting(true);
        setErrorMessage('');

        try {
            await authApi.registerCompany({
                companyName: form.companyName.trim(),
                adminName: form.adminName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                password: form.password
            });

            setStep(2);
        } catch (err) {
            setErrorMessage(
                err.response?.data?.message ||
                (isArabic ? 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.' : 'Registration failed. Please try again.')
            );
        } finally {
            setSubmitting(false);
        }
    };

    // Step 2: Verify 6-digit Code & Login
    const handleVerifySubmit = async () => {
        if (!form.code || form.code.length < 6) {
            setErrorMessage(isArabic ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام.' : 'Please enter the 6-digit verification code.');
            return;
        }

        setSubmitting(true);
        setErrorMessage('');

        try {
            const res = await authApi.verifyEmail({
                email: form.email.trim(),
                code: form.code.trim()
            });

            const { token, user } = res.data;
            if (token && user) {
                await setSession(token, user);
            }
        } catch (err) {
            setErrorMessage(
                err.response?.data?.message ||
                (isArabic ? 'رمز التحقق غير صحيح أو منتهي الصلاحية.' : 'Invalid or expired verification code.')
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.container, { backgroundColor: theme.bg }]}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Back Button */}
                <TouchableOpacity
                    style={[styles.backBtn, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}
                    onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
                    activeOpacity={0.7}
                >
                    <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={20} color={theme.primary} />
                    <Text style={[styles.backBtnText, { color: theme.primary }]}>
                        {step === 2 ? (isArabic ? 'الرجوع لتعديل البيانات' : 'Back to Details') : (isArabic ? 'العودة لتسجيل الدخول' : 'Back to Sign In')}
                    </Text>
                </TouchableOpacity>

                {/* Brand Header */}
                <View style={styles.brandHeader}>
                    <Image
                        source={require('../../assets/icon.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={[styles.brandTitle, { color: theme.text }]}>
                        {step === 1 ? t('auth.signup', 'Create Company Workspace') : t('auth.verifyEmail', 'Verify Your Email')}
                    </Text>
                    <Text style={[styles.brandTagline, { color: theme.subtext }]}>
                        {step === 1
                            ? (isArabic ? 'أنشئ حساب شركتك وابدأ إدارة المشاريع والحسابات' : 'Start managing construction projects & finances')
                            : `${t('auth.verifyEmailSubtitle', 'Enter code sent to')} ${form.email}`}
                    </Text>
                </View>

                {/* Card Container */}
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    {step === 1 ? (
                        <>
                            {/* Company Name */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                                    {t('auth.companyName', 'Company Name')} *
                                </Text>
                                <View style={[styles.inputContainer, { backgroundColor: theme.inputBg || theme.cardAlt, borderColor: theme.border }]}>
                                    <Ionicons name="business-outline" size={20} color={theme.subtext} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                                        placeholder={isArabic ? 'مثال: شركة النيل للمقاولات' : 'e.g. Nile Construction'}
                                        placeholderTextColor={theme.subtext}
                                        value={form.companyName}
                                        onChangeText={(v) => updateField('companyName', v)}
                                        editable={!submitting}
                                        autoFocus
                                    />
                                </View>
                            </View>

                            {/* Admin Name */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                                    {t('auth.adminName', 'Admin Full Name')} *
                                </Text>
                                <View style={[styles.inputContainer, { backgroundColor: theme.inputBg || theme.cardAlt, borderColor: theme.border }]}>
                                    <Ionicons name="person-outline" size={20} color={theme.subtext} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                                        placeholder={isArabic ? 'نور الدين أحمد' : 'John Doe'}
                                        placeholderTextColor={theme.subtext}
                                        value={form.adminName}
                                        onChangeText={(v) => updateField('adminName', v)}
                                        editable={!submitting}
                                    />
                                </View>
                            </View>

                            {/* Email */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                                    {t('auth.email', 'Email Address')} *
                                </Text>
                                <View style={[styles.inputContainer, { backgroundColor: theme.inputBg || theme.cardAlt, borderColor: theme.border }]}>
                                    <Ionicons name="mail-outline" size={20} color={theme.subtext} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                                        placeholder="admin@company.com"
                                        placeholderTextColor={theme.subtext}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        value={form.email}
                                        onChangeText={(v) => updateField('email', v)}
                                        editable={!submitting}
                                    />
                                </View>
                            </View>

                            {/* Phone */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                                    {t('auth.phone', 'Phone Number')}
                                </Text>
                                <View style={[styles.inputContainer, { backgroundColor: theme.inputBg || theme.cardAlt, borderColor: theme.border }]}>
                                    <Ionicons name="call-outline" size={20} color={theme.subtext} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                                        placeholder="+20 100 000 0000"
                                        placeholderTextColor={theme.subtext}
                                        keyboardType="phone-pad"
                                        value={form.phone}
                                        onChangeText={(v) => updateField('phone', v)}
                                        editable={!submitting}
                                    />
                                </View>
                            </View>

                            {/* Password */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                                    {t('auth.password', 'Password')} *
                                </Text>
                                <View style={[styles.inputContainer, { backgroundColor: theme.inputBg || theme.cardAlt, borderColor: theme.border }]}>
                                    <Ionicons name="lock-closed-outline" size={20} color={theme.subtext} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                                        placeholder="••••••••"
                                        placeholderTextColor={theme.subtext}
                                        secureTextEntry={!showPassword}
                                        value={form.password}
                                        onChangeText={(v) => updateField('password', v)}
                                        editable={!submitting}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.subtext} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Confirm Password */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                                    {t('auth.confirmPassword', 'Confirm Password')} *
                                </Text>
                                <View style={[styles.inputContainer, { backgroundColor: theme.inputBg || theme.cardAlt, borderColor: theme.border }]}>
                                    <Ionicons name="lock-closed-outline" size={20} color={theme.subtext} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                                        placeholder="••••••••"
                                        placeholderTextColor={theme.subtext}
                                        secureTextEntry={!showConfirm}
                                        value={form.confirmPassword}
                                        onChangeText={(v) => updateField('confirmPassword', v)}
                                        editable={!submitting}
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                                        <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.subtext} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[
                                    styles.submitBtn,
                                    { backgroundColor: theme.id === 'monochrome' ? '#fafafa' : theme.primary },
                                    submitting && styles.btnDisabled
                                ]}
                                onPress={handleRegisterSubmit}
                                disabled={submitting}
                                activeOpacity={0.8}
                            >
                                {submitting ? (
                                    <ActivityIndicator color={theme.id === 'monochrome' ? '#121212' : '#ffffff'} />
                                ) : (
                                    <View style={[styles.btnInner, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                        <Text style={[styles.submitBtnText, { color: theme.id === 'monochrome' ? '#121212' : '#ffffff' }]}>
                                            {t('auth.next', 'Next: Verify Email')}
                                        </Text>
                                        <Ionicons name={isArabic ? 'arrow-back' : 'arrow-forward'} size={18} color={theme.id === 'monochrome' ? '#121212' : '#ffffff'} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            {/* 6-Digit Code Input */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                                    {t('auth.verificationCode', 'Verification Code (6 Digits)')}
                                </Text>
                                <View style={[styles.inputContainer, { backgroundColor: theme.inputBg || theme.cardAlt, borderColor: theme.border }]}>
                                    <TextInput
                                        style={[styles.input, { color: theme.text, textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: '800' }]}
                                        placeholder="123456"
                                        placeholderTextColor={theme.subtext}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        value={form.code}
                                        onChangeText={(v) => updateField('code', v)}
                                        editable={!submitting}
                                        autoFocus
                                    />
                                </View>
                            </View>

                            {/* Activate Account Button */}
                            <TouchableOpacity
                                style={[
                                    styles.submitBtn,
                                    { backgroundColor: theme.id === 'monochrome' ? '#fafafa' : theme.primary },
                                    submitting && styles.btnDisabled
                                ]}
                                onPress={handleVerifySubmit}
                                disabled={submitting}
                                activeOpacity={0.8}
                            >
                                {submitting ? (
                                    <ActivityIndicator color={theme.id === 'monochrome' ? '#121212' : '#ffffff'} />
                                ) : (
                                    <Text style={[styles.submitBtnText, { color: theme.id === 'monochrome' ? '#121212' : '#ffffff' }]}>
                                        {t('auth.activateAccount', 'Activate Account & Sign In')}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Error Banner */}
                    {errorMessage ? (
                        <View style={styles.errorBox}>
                            <Ionicons name="alert-circle" size={18} color="#ef4444" />
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Footer link to login */}
                <View style={styles.footerRow}>
                    <Text style={{ color: theme.subtext, fontSize: 13 }}>
                        {t('auth.alreadyHaveAccount', 'Already have an account?')}
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginLeft: 6 }}>
                        <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '800' }}>
                            {t('auth.login', 'Sign In')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 22,
        paddingVertical: 36
    },
    backBtn: {
        alignItems: 'center',
        gap: 6,
        marginBottom: 16
    },
    backBtnText: {
        fontSize: 14,
        fontWeight: '700'
    },
    brandHeader: {
        alignItems: 'center',
        marginBottom: 20
    },
    logoImage: {
        width: 56,
        height: 56,
        borderRadius: 14,
        marginBottom: 10
    },
    brandTitle: {
        fontSize: 21,
        fontWeight: '800',
        letterSpacing: -0.5
    },
    brandTagline: {
        fontSize: 12.5,
        marginTop: 3,
        textAlign: 'center',
        paddingHorizontal: 14
    },
    card: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4
    },
    inputGroup: {
        marginBottom: 14
    },
    inputLabel: {
        fontSize: 12.5,
        fontWeight: '700',
        marginBottom: 5
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12
    },
    inputIcon: {
        marginRight: 6
    },
    input: {
        flex: 1,
        height: 46,
        fontSize: 14.5
    },
    eyeBtn: {
        padding: 6
    },
    submitBtn: {
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 6
    },
    btnDisabled: {
        opacity: 0.6
    },
    btnInner: {
        alignItems: 'center',
        gap: 8
    },
    submitBtnText: {
        fontSize: 15,
        fontWeight: '700'
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginTop: 14
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12.5,
        flex: 1
    },
    devCodeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: '#22c55e',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginBottom: 14
    },
    devCodeText: {
        color: '#22c55e',
        fontSize: 13
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20
    }
});
