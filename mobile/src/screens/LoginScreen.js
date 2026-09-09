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
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { setLanguage } from '../i18n';

export default function LoginScreen({ navigation }) {
    const { t, i18n } = useTranslation();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorDetail, setErrorDetail] = useState(null);

    const isArabic = i18n.language === 'ar';

    const toggleLanguage = async () => {
        const next = isArabic ? 'en' : 'ar';
        await setLanguage(next);
    };

    const setQuickDemo = (userEmail) => {
        setEmail(userEmail);
        setPassword('Demo@1234');
        setErrorDetail(null);
    };

    const onSubmit = async () => {
        if (!email || !password) return;
        setSubmitting(true);
        setErrorDetail(null);
        try {
            await login(email.trim(), password);
        } catch (err) {
            const detail = {
                message:
                    err.response?.data?.message ||
                    err.message ||
                    (isArabic ? 'فشل تسجيل الدخول، تأكد من الاتصال.' : 'Login failed. Check your credentials/connection.'),
                status: err.response?.status
            };
            setErrorDetail(detail);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Language Switcher Bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity
                        style={styles.langBtn}
                        onPress={toggleLanguage}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="language" size={16} color="#2563eb" />
                        <Text style={styles.langBtnText}>{isArabic ? 'English' : 'العربية'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Brand Header */}
                <View style={styles.brandHeader}>
                    <Image
                        source={require('../../assets/icon.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.brandTitle}>Hesaby ERP</Text>
                    <Text style={styles.brandTagline}>
                        {isArabic ? 'إدارة المشاريع والحسابات الهندسية' : 'Engineering & Construction ERP'}
                    </Text>
                </View>

                {/* Login Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                        {isArabic ? 'تسجيل الدخول' : 'Sign In to Your Workspace'}
                    </Text>

                    {/* Email Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{isArabic ? 'البريد الإلكتروني' : 'Email Address'}</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={isArabic ? 'name@company.com' : 'name@company.com'}
                                placeholderTextColor="#9ca3af"
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoComplete="email"
                                value={email}
                                onChangeText={setEmail}
                                editable={!submitting}
                            />
                        </View>
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{isArabic ? 'كلمة المرور' : 'Password'}</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="••••••••"
                                placeholderTextColor="#9ca3af"
                                secureTextEntry={!showPassword}
                                autoComplete="password"
                                value={password}
                                onChangeText={setPassword}
                                editable={!submitting}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeBtn}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color="#6b7280"
                                />
                            </TouchableOpacity>
                    {/* Forgot Password Link */}
                    <TouchableOpacity
                        onPress={() => navigation?.navigate('ForgotPassword')}
                        style={{ alignSelf: isArabic ? 'flex-start' : 'flex-end', marginTop: 6, marginBottom: 16 }}
                        activeOpacity={0.7}
                    >
                        <Text style={{ color: '#2563eb', fontSize: 13, fontWeight: '700' }}>
                            {t('auth.forgotPassword', 'Forgot Password?')}
                        </Text>
                    </TouchableOpacity>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitBtn, submitting && styles.btnDisabled]}
                        onPress={onSubmit}
                        disabled={submitting}
                        activeOpacity={0.8}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <View style={[styles.btnInner, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                <Text style={styles.submitBtnText}>{isArabic ? 'دخول للنظام' : 'Sign In'}</Text>
                                <Ionicons name={isArabic ? 'arrow-back' : 'arrow-forward'} size={18} color="#fff" />
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Register New Company Workspace Link */}
                    <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', justifyContent: 'center', alignItems: 'center', marginTop: 18 }}>
                        <Text style={{ color: '#6b7280', fontSize: 13 }}>
                            {t('auth.dontHaveAccount', "Don't have an account?")}
                        </Text>
                        <TouchableOpacity onPress={() => navigation?.navigate('Register')} style={{ marginHorizontal: 6 }} activeOpacity={0.7}>
                            <Text style={{ color: '#2563eb', fontSize: 13, fontWeight: '800' }}>
                                {t('auth.signup', 'Create Company')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Error Banner */}
                    {errorDetail && (
                        <View style={styles.errorBox}>
                            <Ionicons name="alert-circle" size={18} color="#dc2626" />
                            <Text style={styles.errorText}>{errorDetail.message}</Text>
                        </View>
                    )}
                </View>

                {/* Quick Demo Credentials */}
                <View style={styles.demoSection}>
                    <Text style={styles.demoTitle}>
                        {isArabic ? '⚡ حسابات تجريبية سريعة:' : '⚡ Quick Demo Logins:'}
                    </Text>
                    <View style={styles.demoChips}>
                        <TouchableOpacity
                            style={styles.chip}
                            onPress={() => setQuickDemo('admin@demo.local')}
                        >
                            <Text style={styles.chipText}>👑 {isArabic ? 'المدير' : 'Admin'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.chip}
                            onPress={() => setQuickDemo('engineer@demo.local')}
                        >
                            <Text style={styles.chipText}>👷 {isArabic ? 'مهندس موقع' : 'Engineer'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.chip}
                            onPress={() => setQuickDemo('manager@demo.local')}
                        >
                            <Text style={styles.chipText}>👔 {isArabic ? 'مدير مشروع' : 'Manager'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a' // Sleek modern dark slate background
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 40
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10
    },
    langBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)'
    },
    langBtnText: {
        color: '#60a5fa',
        fontSize: 13,
        fontWeight: '600'
    },
    brandHeader: {
        alignItems: 'center',
        marginBottom: 28
    },
    logoImage: {
        width: 80,
        height: 80,
        borderRadius: 20,
        marginBottom: 12
    },
    logoCircle: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        borderWidth: 1.5,
        borderColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8
    },
    brandTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: 0.5
    },
    brandTagline: {
        fontSize: 13,
        color: '#94a3b8',
        marginTop: 4
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 18,
        padding: 22,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 10
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: 18,
        textAlign: 'center'
    },
    inputGroup: {
        marginBottom: 16
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#cbd5e1',
        marginBottom: 6
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        paddingHorizontal: 12
    },
    inputIcon: {
        marginRight: 8
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 15,
        color: '#f8fafc'
    },
    eyeBtn: {
        padding: 6
    },
    submitBtn: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6
    },
    btnDisabled: {
        opacity: 0.6
    },
    btnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    submitBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700'
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 14,
        padding: 12,
        borderRadius: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderWidth: 1,
        borderColor: '#ef4444'
    },
    errorText: {
        color: '#fca5a5',
        fontSize: 13,
        flex: 1
    },
    demoSection: {
        marginTop: 22,
        alignItems: 'center'
    },
    demoTitle: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 10,
        fontWeight: '600'
    },
    demoChips: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center'
    },
    chip: {
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#334155'
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#e2e8f0'
    }
});
