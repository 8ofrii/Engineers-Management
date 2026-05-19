import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const API_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl ||
    '(unset)';

export default function LoginScreen() {
    const { t } = useTranslation();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorDetail, setErrorDetail] = useState(null);

    const onSubmit = async () => {
        if (!email || !password) return;
        setSubmitting(true);
        setErrorDetail(null);
        try {
            await login(email.trim(), password);
        } catch (err) {
            // Build a maximally useful diagnostic — server error, network
            // error, or something unexpected. Shown inline so user can copy.
            const detail = {
                message:
                    err.response?.data?.message ||
                    err.message ||
                    'Unknown error',
                status: err.response?.status,
                code: err.code,
                url: err.config?.url,
                baseURL: err.config?.baseURL
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
            <Text style={styles.title}>{t('auth.login')}</Text>

            <TextInput
                style={styles.input}
                placeholder={t('auth.email')}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                editable={!submitting}
            />

            <TextInput
                style={styles.input}
                placeholder={t('auth.password')}
                secureTextEntry
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                editable={!submitting}
            />

            <TouchableOpacity
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={onSubmit}
                disabled={submitting}
            >
                {submitting ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>{t('auth.signIn')}</Text>
                )}
            </TouchableOpacity>

            {errorDetail && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorTitle}>Login error</Text>
                    <Text style={styles.errorLine}>message: {errorDetail.message}</Text>
                    {errorDetail.status != null && <Text style={styles.errorLine}>status: {errorDetail.status}</Text>}
                    {errorDetail.code && <Text style={styles.errorLine}>code: {errorDetail.code}</Text>}
                    {errorDetail.url && <Text style={styles.errorLine}>url: {errorDetail.url}</Text>}
                    {errorDetail.baseURL && <Text style={styles.errorLine}>base: {errorDetail.baseURL}</Text>}
                </View>
            )}

            <Text style={styles.apiHint}>API: {API_URL}</Text>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#fff'
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 32,
        textAlign: 'center'
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 14,
        fontSize: 16,
        marginBottom: 12,
        backgroundColor: '#f9fafb'
    },
    button: {
        backgroundColor: '#2563eb',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8
    },
    buttonDisabled: {
        opacity: 0.6
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },
    errorBox: {
        marginTop: 16,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca'
    },
    errorTitle: {
        fontWeight: '700',
        color: '#b91c1c',
        marginBottom: 4
    },
    errorLine: {
        fontSize: 12,
        color: '#7f1d1d',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
    },
    apiHint: {
        marginTop: 24,
        fontSize: 11,
        color: '#9ca3af',
        textAlign: 'center'
    }
});
