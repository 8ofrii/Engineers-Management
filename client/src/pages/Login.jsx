import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { authAPI } from '../services/api';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Loader2, Globe, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import SkyToggle from '../components/ui/sky-toggle';
import { BeamsBackground } from '@/components/ui/beams-background';
import './Auth.css';

export default function Login() {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const navigate = useNavigate();
    const { login, complete2FALogin } = useAuth();
    const { showAlert } = useAlert();

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [fieldErrors, setFieldErrors] = useState({
        email: '',
        password: '',
        general: ''
    });

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme_preset_v3');
        if (!saved) return 'light';
        return saved === 'dark' ? 'dark' : 'light';
    });
    const light = theme === 'light';

    useEffect(() => {
        document.body.classList.toggle('light-mode', light);
        localStorage.setItem('theme_preset', theme);
        localStorage.setItem('theme_preset_v3', theme);
    }, [theme, light]);

    // 2FA challenge state
    const [twoFactor, setTwoFactor] = useState(null);
    const [twoFactorCode, setTwoFactorCode] = useState('');

    const [searchParams] = useSearchParams();

    const toggleLanguage = () => {
        const nextLang = isAr ? 'en' : 'ar';
        i18n.changeLanguage(nextLang);
        document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = nextLang;
        localStorage.setItem('language', nextLang);
    };

    // Check for Google OAuth callback code/token, errors, or existing auth session
    useEffect(() => {
        const code = searchParams.get('code');
        const token = searchParams.get('token');
        const error = searchParams.get('error');
        const existingToken = localStorage.getItem('token');

        if (code) {
            // Strip code from browser history and URL bar immediately
            window.history.replaceState({}, document.title, window.location.pathname);
            authAPI.oauthExchange(code).then(res => {
                if (res.data?.token) {
                    localStorage.setItem('token', res.data.token);
                    if (res.data.user) {
                        localStorage.setItem('user', JSON.stringify(res.data.user));
                    }
                    showAlert({
                        type: 'success',
                        title: isAr ? 'تم تسجيل الدخول' : 'Success',
                        message: isAr ? 'تم تسجيل الدخول بنجاح بحساب Google! جاري تحويلك...' : 'Signed in with Google! Redirecting...'
                    });
                    setTimeout(() => { window.location.replace('/dashboard'); }, 600);
                }
            }).catch(err => {
                setFieldErrors(prev => ({
                    ...prev,
                    general: isAr ? 'فشل تبادل رمز الدخول بحساب Google. يرجى المحاولة مجدداً.' : 'Google authentication exchange failed. Please try again.'
                }));
            });
        } else if (token) {
            // Legacy token callback: strip from URL immediately
            window.history.replaceState({}, document.title, window.location.pathname);
            localStorage.setItem('token', token);
            authAPI.getMe().then(res => {
                if (res.data?.user) {
                    localStorage.setItem('user', JSON.stringify(res.data.user));
                }
                showAlert({
                    type: 'success',
                    title: isAr ? 'تم تسجيل الدخول' : 'Success',
                    message: isAr ? 'تم تسجيل الدخول بنجاح بحساب Google! جاري تحويلك...' : 'Signed in with Google! Redirecting...'
                });
                setTimeout(() => { window.location.replace('/dashboard'); }, 600);
            }).catch(() => {
                window.location.replace('/dashboard');
            });
        } else if (error) {
            setFieldErrors(prev => ({
                ...prev,
                general: isAr ? `فشل تسجيل الدخول بحساب Google (${error})` : `Google sign-in failed (${error})`
            }));
        } else if (existingToken) {
            // If already logged in and user navigated or pressed browser back to /login, exit to Landing page
            navigate('/', { replace: true });
        }
    }, [searchParams, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear field error as soon as user types
        if (fieldErrors[name] || fieldErrors.general) {
            setFieldErrors(prev => ({ ...prev, [name]: '', general: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFieldErrors({ email: '', password: '', general: '' });

        try {
            const result = await login(formData.email, formData.password);
            if (result?.requires2FA) {
                setTwoFactor({ challengeToken: result.challengeToken });
                return;
            }
            navigate('/dashboard', { replace: true });
        } catch (err) {
            const errorCode = err.response?.data?.errorCode;
            const message = err.response?.data?.message || '';

            if (errorCode === 'INVALID_CREDENTIALS' || message.toLowerCase().includes('invalid email') || message.toLowerCase().includes('incorrect password')) {
                setFieldErrors({
                    email: '',
                    password: '',
                    general: isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد والمحاولة مجدداً.' : 'Invalid email or password. Please verify and try again.'
                });
            } else if (errorCode === 'EMAIL_NOT_FOUND' || message.toLowerCase().includes('not found') || message.toLowerCase().includes('no account')) {
                setFieldErrors({
                    email: isAr ? 'هذا البريد الإلكتروني غير مسجل في النظام.' : "This email address isn't registered.",
                    password: '',
                    general: ''
                });
            } else if (errorCode === 'WRONG_PASSWORD' || message.toLowerCase().includes('password') || message.toLowerCase().includes('credentials')) {
                setFieldErrors({
                    email: '',
                    password: isAr ? 'كلمة المرور غير صحيحة. يرجى المحاولة مجدداً.' : 'Incorrect password. Please try again.',
                    general: ''
                });
            } else if (errorCode === 'ACCOUNT_DEACTIVATED') {
                setFieldErrors({
                    email: '',
                    password: '',
                    general: isAr ? 'تم تعطيل هذا الحساب. يرجى مراجعة مسؤول الشركة.' : 'This account has been deactivated. Please contact your company administrator.'
                });
            } else {
                setFieldErrors({
                    email: '',
                    password: '',
                    general: message || (isAr ? 'فشل تسجيل الدخول. يرجى التأكد من البيانات المدخلة.' : 'Login failed. Please verify your credentials.')
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handle2FASubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await complete2FALogin(twoFactor.challengeToken, twoFactorCode);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error') || 'Error',
                message: err.response?.data?.message || (isAr ? 'رمز التحقق غير صحيح أو انتهت صلاحيته' : 'Invalid or expired 2FA code')
            });
        } finally {
            setLoading(false);
        }
    };

    // Google OAuth via backend (sets state cookie, then redirects to Google)
    const handleGoogleSignIn = () => {
        window.location.href = '/api/auth/google';
    };

    // 2FA challenge view
    if (twoFactor) {
        return (
            <div className="auth-container">
                {!light && (
                    <BeamsBackground
                        colorScheme="ember"
                        intensity="medium"
                        className="fixed inset-0 pointer-events-none z-0"
                    />
                )}
                <div className="auth-background"></div>
                <div className="auth-content">
                    <div className="auth-card">
                        <div className="auth-header">
                            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(255, 90, 31, 0.12)', color: '#ff5a1f', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <ShieldCheck size={36} />
                            </div>
                            <h1>{t('auth.twoFactorTitle') || 'Two-Factor Code'}</h1>
                            <p>{t('auth.twoFactorPrompt') || 'Open your authenticator app and enter the 6-digit code.'}</p>
                        </div>
                        <form onSubmit={handle2FASubmit} className="auth-form">
                            <div className="input-group">
                                <label className="input-label">
                                    <Lock size={16} />
                                    {t('auth.code') || 'Code'}
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="\d{6}"
                                    maxLength={6}
                                    autoComplete="one-time-code"
                                    autoFocus
                                    className="input"
                                    placeholder="123456"
                                    value={twoFactorCode}
                                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    required
                                    style={{ fontSize: '24px', letterSpacing: '8px', textAlign: 'center' }}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {loading ? <Loader2 size={18} className="spin" /> : null}
                                <span>{t('auth.verify') || 'Verify'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setTwoFactor(null); setTwoFactorCode(''); }}
                                className="btn"
                                style={{ marginTop: '12px', background: 'transparent', color: '#ff8a50', width: '100%' }}
                            >
                                {t('common.cancel') || 'Cancel'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            {!light && (
                <BeamsBackground
                    colorScheme="ember"
                    intensity="medium"
                    className="fixed inset-0 pointer-events-none z-0"
                />
            )}
            <div className="auth-background"></div>

            {/* Top Bar with brand + theme + language */}
            <div className="auth-top-bar">
                <div className="auth-top-bar-inner">
                    <Link to="/" className="auth-brand">
                        <img src="/hesaby_logo_lockup.svg" alt="Hesaby.ai" className="auth-brand-lockup logo-for-dark" />
                        <img src="/hesaby_logo_lockup_light.svg" alt="Hesaby.ai" className="auth-brand-lockup logo-for-light" />
                    </Link>
                    <div className="auth-top-actions">
                        <Link to="/" className="auth-home-link">{isAr ? 'الرئيسية' : 'Home'}</Link>
                        <SkyToggle dark={!light} onToggle={() => setTheme(light ? 'dark' : 'light')} label={isAr ? (light ? 'التحويل للوضع الليلي' : 'التحويل للوضع الفاتح') : (light ? 'Switch to dark mode' : 'Switch to light mode')} />
                        <button type="button" className="auth-lang-btn" onClick={toggleLanguage}>
                            <Globe size={14} />
                            <span>{isAr ? 'English' : 'العربية'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="auth-content">
                <div className="auth-card">
                    <div className="auth-header">
                        <img 
                            src="/hesaby_logo_icon.svg" 
                            alt="Hesaby ERP Logo" 
                            className="auth-logo-img" 
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <h1>{isAr ? 'تسجيل الدخول' : 'Welcome Back'}</h1>
                        <p>{isAr ? 'أهلاً بك مجدداً في منصة حسابي لإدارة المشاريع الهندسية' : 'Sign in to access your projects and finances'}</p>
                    </div>

                    {/* Google Social Sign-In */}
                    <div className="social-auth-container">
                        <button type="button" className="social-auth-btn" onClick={handleGoogleSignIn}>
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            <span>{isAr ? 'تسجيل الدخول باستخدام Google' : 'Sign in with Google'}</span>
                        </button>
                    </div>

                    <div className="auth-divider">
                        <span>{isAr ? 'أو بالبريد الإلكتروني وكلمة المرور' : 'Or with email & password'}</span>
                    </div>

                    {/* General / Deactivation Error Message Banner */}
                    {fieldErrors.general && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            fontSize: '13px',
                            marginBottom: '20px',
                            lineHeight: 1.4
                        }}>
                            <AlertCircle size={18} style={{ flexShrink: 0 }} />
                            <span>{fieldErrors.general}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        {/* Email Input Field */}
                        <div className="input-group">
                            <label className="input-label">
                                <Mail size={16} />
                                {t('auth.email')}
                            </label>
                            <input
                                type="email"
                                name="email"
                                className="input"
                                placeholder="name@company.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                autoFocus
                                style={fieldErrors.email ? {
                                    borderColor: '#ef4444',
                                    backgroundColor: 'rgba(239, 68, 68, 0.04)',
                                    boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)'
                                } : {}}
                            />

                            {/* Friendly Email Not Found Alert */}
                            {fieldErrors.email && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginTop: '8px',
                                    fontSize: '12.5px',
                                    color: '#ef4444',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    flexWrap: 'wrap',
                                    gap: '6px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <AlertCircle size={15} style={{ flexShrink: 0 }} />
                                        <span>{fieldErrors.email}</span>
                                    </div>
                                    <Link 
                                        to={`/signup?email=${encodeURIComponent(formData.email)}`}
                                        style={{ 
                                            color: '#ff8a50', 
                                            fontWeight: 700, 
                                            textDecoration: 'none', 
                                            display: 'inline-flex', 
                                            alignItems: 'center', 
                                            gap: '4px',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: 'rgba(255, 90, 31, 0.1)'
                                        }}
                                    >
                                        <span>{isAr ? 'إنشاء حساب جديد' : 'Sign up now'}</span>
                                        {isAr ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Password Input Field */}
                        <div className="input-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label className="input-label">
                                    <Lock size={16} />
                                    {t('auth.password')}
                                </label>
                                <Link to="/forgot-password" style={{ fontSize: '12px', color: '#ff8a50', textDecoration: 'none' }}>
                                    {t('auth.forgotPassword') || (isAr ? 'نسيت كلمة المرور؟' : 'Forgot Password?')}
                                </Link>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    className="input"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    style={{
                                        paddingInlineEnd: '40px',
                                        width: '100%',
                                        ...(fieldErrors.password ? {
                                            borderColor: '#ef4444',
                                            backgroundColor: 'rgba(239, 68, 68, 0.04)',
                                            boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)'
                                        } : {})
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        [isAr ? 'left' : 'right']: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-tertiary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        zIndex: 10
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {/* Friendly Wrong Password Alert */}
                            {fieldErrors.password && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginTop: '8px',
                                    fontSize: '12.5px',
                                    color: '#ef4444',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    flexWrap: 'wrap',
                                    gap: '6px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <AlertCircle size={15} style={{ flexShrink: 0 }} />
                                        <span>{fieldErrors.password}</span>
                                    </div>
                                    <Link 
                                        to="/forgot-password"
                                        style={{ 
                                            color: '#ff8a50', 
                                            fontWeight: 700, 
                                            textDecoration: 'none',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: 'rgba(255, 90, 31, 0.1)'
                                        }}
                                    >
                                        <span>{isAr ? 'إعادة تعيين كلمة المرور' : 'Reset password'}</span>
                                    </Link>
                                </div>
                            )}
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: '8px' }}>
                            {loading ? <Loader2 size={18} className="spin" /> : null}
                            <span>{t('auth.login')}</span>
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>
                            {isAr ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
                            <Link to="/signup" className="auth-link">
                                {isAr ? 'إنشاء حساب جديد' : 'Create Account'}
                            </Link>
                        </p>
                        <p style={{ marginTop: 10, fontSize: '11.5px', color: 'var(--text-tertiary, #78716c)' }}>
                            <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>
                                {isAr ? 'شروط الخدمة' : 'Terms'}
                            </Link>
                            {' · '}
                            <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>
                                {isAr ? 'سياسة الخصوصية' : 'Privacy'}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
