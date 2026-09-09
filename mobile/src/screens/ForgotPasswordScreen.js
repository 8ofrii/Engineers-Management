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
import { useTheme } from '../context/ThemeContext';
import { authApi } from '../services/api';

export default function ForgotPasswordScreen({ navigation }) {
    const { t, i18n } = useTranslation();
    const { theme } = useTheme();
    const isArabic = i18n.language === 'ar';

    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const onSubmit = async () => {
        if (!email) return;
        setSubmitting(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const res = await authApi.forgotPassword(email.trim());
            const msg = res.data?.message || (isArabic ? 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.' : 'If an account exists, a password reset link has been sent.');
            setSuccessMessage(msg);
        } catch (err) {
            setErrorMessage(
                err.response?.data?.message ||
                (isArabic ? 'تعذر إرسال رابط الاستعادة. يرجى التأكد من البريد الإلكتروني.' : 'Failed to send reset link. Please check your email.')
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
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={20} color={theme.primary} />
                    <Text style={[styles.backBtnText, { color: theme.primary }]}>
                        {isArabic ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
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
                        {t('auth.forgotPassword', 'Forgot Password?')}
                    </Text>
                    <Text style={[styles.brandTagline, { color: theme.subtext }]}>
                        {t('auth.forgotPasswordSubtitle', 'Enter your registered email to receive a password reset link.')}
                    </Text>
                </View>

                {/* Form Card */}
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    {successMessage ? (
                        <View style={styles.successBox}>
                            <View style={styles.successIconCircle}>
                                <Ionicons name="checkmark-circle" size={44} color="#22c55e" />
                            </View>
                            <Text style={[styles.successTitle, { color: theme.text }]}>
                                {isArabic ? 'تم إرسال الرابط بنجاح' : 'Reset Link Sent'}
                            </Text>
                            <Text style={[styles.successText, { color: theme.subtext }]}>
                                {successMessage}
                            </Text>
                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: theme.id === 'monochrome' ? '#fafafa' : theme.primary, marginTop: 20 }]}
                                onPress={() => navigation.navigate('Login')}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.submitBtnText, { color: theme.id === 'monochrome' ? '#121212' : '#ffffff' }]}>
                                    {isArabic ? 'العودة لشاشة الدخول' : 'Return to Sign In'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            {/* Email Input */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                                    {t('auth.email', 'Email Address')}
                                </Text>
                                <View style={[styles.inputContainer, { backgroundColor: theme.inputBg || theme.cardAlt, borderColor: theme.border }]}>
                                    <Ionicons name="mail-outline" size={20} color={theme.subtext} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                                        placeholder="name@company.com"
                                        placeholderTextColor={theme.subtext}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        autoComplete="email"
                                        value={email}
                                        onChangeText={setEmail}
                                        editable={!submitting}
                                        autoFocus
                                    />
                                </View>
                            </View>

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[
                                    styles.submitBtn,
                                    { backgroundColor: theme.id === 'monochrome' ? '#fafafa' : theme.primary },
                                    submitting && styles.btnDisabled
                                ]}
                                onPress={onSubmit}
                                disabled={submitting}
                                activeOpacity={0.8}
                            >
                                {submitting ? (
                                    <ActivityIndicator color={theme.id === 'monochrome' ? '#121212' : '#ffffff'} />
                                ) : (
                                    <View style={[styles.btnInner, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                        <Text style={[styles.submitBtnText, { color: theme.id === 'monochrome' ? '#121212' : '#ffffff' }]}>
                                            {t('auth.sendResetLink', 'Send Reset Link')}
                                        </Text>
                                        <Ionicons name={isArabic ? 'arrow-back' : 'arrow-forward'} size={18} color={theme.id === 'monochrome' ? '#121212' : '#ffffff'} />
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Error Banner */}
                            {errorMessage ? (
                                <View style={styles.errorBox}>
                                    <Ionicons name="alert-circle" size={18} color="#ef4444" />
                                    <Text style={styles.errorText}>{errorMessage}</Text>
                                </View>
                            ) : null}
                        </>
                    )}
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
        paddingVertical: 40
    },
    backBtn: {
        alignItems: 'center',
        gap: 6,
        marginBottom: 20
    },
    backBtnText: {
        fontSize: 14,
        fontWeight: '700'
    },
    brandHeader: {
        alignItems: 'center',
        marginBottom: 24
    },
    logoImage: {
        width: 60,
        height: 60,
        borderRadius: 14,
        marginBottom: 12
    },
    brandTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5
    },
    brandTagline: {
        fontSize: 13,
        marginTop: 4,
        textAlign: 'center',
        paddingHorizontal: 16
    },
    card: {
        borderRadius: 20,
        padding: 22,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4
    },
    inputGroup: {
        marginBottom: 18
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 6
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14
    },
    inputIcon: {
        marginRight: 8
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 15
    },
    submitBtn: {
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4
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
        fontSize: 13,
        flex: 1
    },
    successBox: {
        alignItems: 'center',
        paddingVertical: 10
    },
    successIconCircle: {
        marginBottom: 12
    },
    successTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 6
    },
    successText: {
        fontSize: 13.5,
        textAlign: 'center',
        lineHeight: 20
    }
});
