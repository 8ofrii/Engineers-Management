import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, AlertCircle, CheckCircle, Globe, ArrowRight, ArrowLeft } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAlert } from '../context/AlertContext';
import './Auth.css';

export default function ForgotPassword() {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const toggleLanguage = () => {
        const nextLang = isAr ? 'en' : 'ar';
        i18n.changeLanguage(nextLang);
        document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = nextLang;
        localStorage.setItem('language', nextLang);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setErrorMessage('');
        setLoading(true);

        try {
            const response = await authAPI.forgotPassword({ email: email.trim().toLowerCase() });
            const successMsg = response.data?.message || (isAr ? 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.' : 'A password reset link has been sent to your email.');
            setMessage(successMsg);
            showAlert({ type: 'success', title: isAr ? 'تم الإرسال' : 'Success', message: successMsg });
        } catch (err) {
            const errText = err.response?.data?.message || (isAr ? 'حدث خطأ أثناء إرسال البريد الإلكتروني. يرجى المحاولة لاحقاً.' : 'Error sending password reset email. Please try again.');
            setErrorMessage(errText);
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: errText });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-background"></div>

            {/* Top Bar with Language Switcher */}
            <div className="auth-top-bar">
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                    <span>{isAr ? '← العودة لتسجيل الدخول' : '← Back to Sign In'}</span>
                </Link>
                <button type="button" className="auth-lang-btn" onClick={toggleLanguage}>
                    <Globe size={16} />
                    <span>{isAr ? 'English' : 'العربية'}</span>
                </button>
            </div>

            <div className="auth-content">
                <div className="auth-card" style={{ maxWidth: 460 }}>
                    <div className="auth-header">
                        <img 
                            src="/hesaby_logo_icon.png" 
                            alt="Hesaby ERP Logo" 
                            className="auth-logo-img" 
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <h1>{t('auth.forgotPassword', 'Forgot Password?')}</h1>
                        <p>{t('auth.forgotPasswordSubtitle', 'Enter your registered email to receive a password reset link.')}</p>
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
                                        <strong>[Dev Link]</strong> Direct Reset URL:
                                    </p>
                                    <a href={devUrl} className="btn btn-secondary btn-sm" style={{ width: '100%', textAlign: 'center' }}>
                                        {isAr ? 'فتح صفحة إعادة تعيين كلمة المرور' : 'Open Reset Password Page'}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {!message ? (
                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="input-group">
                                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Mail size={16} />
                                    <span>{t('auth.email', 'Email Address')}</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    className="input"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                    style={{ direction: 'ltr', textAlign: isAr ? 'right' : 'left' }}
                                />
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
                                {loading ? (
                                    <>
                                        <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                                        <span>{t('auth.sending', 'Sending...')}</span>
                                    </>
                                ) : (
                                    t('auth.sendResetLink', 'Send Reset Link')
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center mt-lg mb-lg">
                            <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
                                {t('auth.backToLogin', 'Back to Sign In')}
                            </Link>
                        </div>
                    )}

                    {!message && (
                        <div className="auth-footer" style={{ marginTop: 20 }}>
                            <p>
                                {t('auth.rememberPassword', 'Remember your password? ')}{' '}
                                <Link to="/login" className="auth-link" style={{ fontWeight: 700 }}>
                                    {t('auth.backToLogin', 'Back to Sign In')}
                                </Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
