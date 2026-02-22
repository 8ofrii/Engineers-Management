import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useAlert } from '../context/AlertContext';
import './Auth.css';

export default function ForgotPassword() {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const [devUrl, setDevUrl] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setDevUrl('');
        setLoading(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await axios.post(`${apiUrl}/api/auth/forgot-password`, { email });
            setMessage(response.data.message || 'If an account with that email exists, an email has been sent with a link to reset your password.');
            if (response.data.devResetUrl) {
                setDevUrl(response.data.devResetUrl);
            }
            showAlert({ type: 'success', title: 'Success', message: response.data.message || 'Email sent successfully.' });
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || 'Error sending password reset email.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-background"></div>

            <div className="auth-content">
                <div className="auth-card glass">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <Building2 size={40} />
                        </div>
                        <h1>{t('auth.forgotPassword') || 'Forgot Password'}</h1>
                        <p>{t('auth.forgotPasswordSubtitle') || 'Enter your email to receive a reset link'}</p>
                    </div>

                    {message && (
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--color-success, #22c55e)', color: 'var(--color-success, #22c55e)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', marginTop: '16px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <CheckCircle size={20} />
                                <span>{message}</span>
                            </div>
                            {devUrl && (
                                <div style={{ width: '100%', marginTop: '10px' }}>
                                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--color-primary)' }}>
                                        <strong>[Dev Testing Mode]</strong> No SMTP? Use this link directly:
                                    </p>
                                    <a href={devUrl} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                                        Reset Password Link
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {!message ? (
                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="input-group">
                                <label className="input-label">
                                    <Mail size={16} />
                                    {t('auth.email')}
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    className="input"
                                    placeholder="john@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                                {loading ? (
                                    <>
                                        <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                                        {t('auth.sending') || 'Sending...'}
                                    </>
                                ) : (
                                    t('auth.sendResetLink') || 'Send Reset Link'
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center mt-lg mb-lg">
                            <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
                                {t('auth.backToLogin') || 'Back to Login'}
                            </Link>
                        </div>
                    )}

                    {!message && (
                        <div className="auth-footer">
                            <p>
                                {t('auth.rememberPassword') || 'Remember your password? '}{' '}
                                <Link to="/login" className="auth-link">
                                    {t('auth.backToLogin') || 'Back to Login'}
                                </Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
