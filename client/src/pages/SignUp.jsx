import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../context/AlertContext';
import {
    Building2, Mail, Lock, User, Phone, CheckCircle2,
    Eye, EyeOff, Sparkles, ArrowRight, ArrowLeft,
    ShieldCheck, Users, Link as LinkIcon, Check, Loader2, AlertTriangle, Globe, X
} from 'lucide-react';
import SkyToggle from '../components/ui/sky-toggle';
import { authAPI } from '../services/api';
import { BeamsBackground } from '@/components/ui/beams-background';
import './Auth.css';

export default function SignUp() {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showAlert } = useAlert();

    const toggleLanguage = () => {
        const nextLang = isAr ? 'en' : 'ar';
        i18n.changeLanguage(nextLang);
        document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = nextLang;
        localStorage.setItem('language', nextLang);
    };

    // Step state: 1 = Personal Info, 2 = Workspace Choice, 3 = OTP Verification
    const [step, setStep] = useState(1);
    
    // Workspace Path: 'CREATE_COMPANY' | 'JOIN_COMPANY'
    const [workspacePath, setWorkspacePath] = useState('CREATE_COMPANY');

    // UI States
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
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
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validatingInvite, setValidatingInvite] = useState(false);
    const [invitePreview, setInvitePreview] = useState(null);

    // Google Modal States
    const [showGoogleModal, setShowGoogleModal] = useState(false);
    const [googleEmail, setGoogleEmail] = useState('');
    const [googleName, setGoogleName] = useState('');
    const [googleLoading, setGoogleLoading] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        // Step 1: Personal Credentials
        name: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        // Step 2: Company Details
        companyName: '',
        companyPhone: '',
        companyAddress: '',
        // Step 2 (Join): Invite Token / Link
        inviteToken: '',
        // Step 3: Verification Code
        code: ''
    });

    // Auto-detect invite token, Google OAuth callback, or existing auth session
    useEffect(() => {
        const existingToken = localStorage.getItem('token');
        const emailParam = searchParams.get('email');
        const urlToken = searchParams.get('token') || searchParams.get('invite');
        const googleEmailParam = searchParams.get('googleEmail');
        const googleNameParam = searchParams.get('googleName');
        const googleVerified = searchParams.get('googleVerified');

        if (!urlToken && !googleEmailParam && existingToken) {
            // If already authenticated and user navigates or presses browser back to /signup, exit to Landing page
            navigate('/', { replace: true });
            return;
        }

        if (emailParam) {
            setFormData(prev => ({ ...prev, email: emailParam }));
        }

        if (urlToken) {
            setFormData(prev => ({ ...prev, inviteToken: urlToken }));
            setWorkspacePath('JOIN_COMPANY');
            validateInviteToken(urlToken);
        }

        // Google OAuth Callback check
        if (googleEmailParam && googleVerified) {
            setFormData(prev => ({
                ...prev,
                name: googleNameParam || googleEmailParam.split('@')[0],
                email: googleEmailParam,
                password: prev.password || 'GoogleOAuth2026!@#',
                confirmPassword: prev.password || 'GoogleOAuth2026!@#'
            }));
            setStep(2);
            showAlert({
                type: 'success',
                title: isAr ? 'تم التحقق من حساب Google' : 'Google Account Connected',
                message: isAr ? `مرحباً ${googleNameParam || ''}! يرجى الآن إكمال بيانات شركتك للبدء.` : 'Google account connected! Complete your company setup to proceed.'
            });
        }
    }, [searchParams, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Calculate Password Strength
    const getPasswordStrength = (pass) => {
        if (!pass) return { score: 0, label: '', color: '' };
        let score = 0;
        if (pass.length >= 8) score += 1;
        if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
        if (/\d/.test(pass)) score += 1;
        if (/[\W_]/.test(pass)) score += 1;

        if (score <= 1) return { score: 25, label: isAr ? 'ضعيفة' : 'Weak', color: '#ef4444' };
        if (score === 2) return { score: 50, label: isAr ? 'مقبولة' : 'Fair', color: '#f59e0b' };
        if (score === 3) return { score: 75, label: isAr ? 'جيدة' : 'Good', color: '#3b82f6' };
        return { score: 100, label: isAr ? 'قوية جداً' : 'Strong', color: '#10b981' };
    };

    const passwordStrength = getPasswordStrength(formData.password);

    // Step 1: Validate Personal Info and proceed to Step 2
    const handleStep1Submit = (e) => {
        e.preventDefault();

        // 1. Email Regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: isAr ? 'يرجى إدخال بريد إلكتروني صالح.' : 'Please enter a valid email address' });
            return;
        }

        // 2. Phone Validation
        if (!formData.phone.trim() || formData.phone.trim().length < 8) {
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: isAr ? 'يرجى إدخال رقم هاتف صحيح.' : 'Please enter a valid phone number.' });
            return;
        }

        // 3. Password Match
        if (formData.password !== formData.confirmPassword) {
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: isAr ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match' });
            return;
        }

        // 4. Password Strength
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!strongPasswordRegex.test(formData.password)) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: isAr
                    ? 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل، وتحتوي على حرف كبير وصغير ورقم ورمز خاص.'
                    : 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.'
            });
            return;
        }


        // Terms of Service agreement
        if (!agreedToTerms) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: isAr
                    ? 'يجب الموافقة على شروط الخدمة وسياسة الخصوصية للمتابعة.'
                    : 'You must agree to the Terms of Service and Privacy Policy to continue.'
            });
            return;
        }
        setStep(2);
    };

    // Live validate Invite Token
    const validateInviteToken = async (tokenStr) => {
        if (!tokenStr || tokenStr.trim().length < 5) {
            setInvitePreview(null);
            return;
        }

        setValidatingInvite(true);
        try {
            const res = await authAPI.previewInvite(tokenStr.trim());
            if (res.data?.success) {
                setInvitePreview(res.data.data);
            }
        } catch {
            setInvitePreview(null);
        } finally {
            setValidatingInvite(false);
        }
    };

    // Step 2: Submit final onboarding choice (Create Company OR Join Company)
    const handleStep2Submit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (workspacePath === 'CREATE_COMPANY') {
                if (!formData.companyName.trim()) {
                    showAlert({ type: 'error', title: t('common.error', 'Error'), message: isAr ? 'يرجى كتابة اسم الشركة الهندسية.' : 'Please enter company name' });
                    setLoading(false);
                    return;
                }

                const primaryPhone = (formData.phone || formData.companyPhone || '').trim();

                await authAPI.registerCompany({
                    companyName: formData.companyName.trim(),
                    adminName: formData.name.trim(),
                    email: formData.email.trim().toLowerCase(),
                    phone: primaryPhone || null,
                    password: formData.password
                });

                setStep(3);
                showAlert({
                    type: 'success',
                    title: isAr ? 'تم إرسال كود التحقق' : 'Verification Code Sent',
                    message: isAr ? 'أرسلنا كود التحقق المكون من 6 أرقام إلى بريدك الإلكتروني.' : 'Verification code sent to your email.'
                });
            } else {
                // JOIN COMPANY
                if (!formData.inviteToken.trim()) {
                    showAlert({ type: 'error', title: t('common.error', 'Error'), message: isAr ? 'يرجى إدخال رابط أو كود الدعوة.' : 'Please enter invite link or code' });
                    setLoading(false);
                    return;
                }

                const res = await authAPI.acceptInviteSignup({
                    token: formData.inviteToken.trim(),
                    name: formData.name.trim(),
                    phone: formData.phone.trim() || null,
                    password: formData.password
                });

                const { token, user } = res.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));

                showAlert({
                    type: 'success',
                    title: isAr ? 'تم الانضمام بنجاح' : 'Success',
                    message: isAr ? `مرحباً بك في مساحة عمل ${user.company || ''}! جاري نقلك للنظام...` : 'Welcome! Redirecting...'
                });

                setTimeout(() => {
                    window.location.replace('/dashboard');
                }, 1000);
            }
        } catch (err) {
            const firstError = err.response?.data?.errors?.[0]?.message;
            const backendMsg = err.response?.data?.message;
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: firstError ? `${firstError}` : (backendMsg || (isAr ? 'فشل إكمال التسجيل. يرجى التأكد من البيانات والمحاولة مجدداً.' : 'Registration failed. Please try again.'))
            });
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await authAPI.verifyEmail({
                email: formData.email.trim(),
                code: formData.code.trim()
            });

            const { token, user } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            showAlert({
                type: 'success',
                title: isAr ? 'تم تفعيل الحساب' : 'Success',
                message: isAr ? 'تم إنشاء وتفعيل حسابك ومساحة عمل شركتك بنجاح!' : 'Account created successfully! Redirecting...'
            });

            setTimeout(() => {
                window.location.replace('/dashboard');
            }, 1000);
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: err.response?.data?.message || (isAr ? 'رمز التحقق غير صحيح أو منتهي الصلاحية.' : 'Invalid or expired verification code.')
            });
        } finally {
            setLoading(false);
        }
    };

    // Google OAuth via backend (sets state cookie, then redirects to Google)
    const handleGoogleAuth = () => {
        window.location.href = '/api/auth/google';
    };

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
                    {/* Header with Hesaby Logo */}
                    <div className="auth-header">
                        <img
                            src="/hesaby_logo_icon.svg"
                            alt="Hesaby ERP Logo"
                            className="auth-logo-img"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <h1>
                            {step === 1 && (isAr ? 'إنشاء حساب جديد' : 'Create Your Account')}
                            {step === 2 && (isAr ? 'بيانات الشركة' : 'Company & Team')}
                            {step === 3 && (isAr ? 'تأكيد البريد الإلكتروني' : 'Verify Your Email')}
                        </h1>
                        <p>
                            {step === 1 && (isAr ? 'الخطوة 1: أدخل بياناتك الشخصية لبدء الاستخدام' : 'Step 1: Enter your personal credentials')}
                            {step === 2 && (isAr ? 'الخطوة 2: إنشاء شركة جديدة أو الانضمام لفريق عملك' : 'Step 2: Create a new company or join your team')}
                            {step === 3 && `${isAr ? 'أدخل كود التحقق المرسل إلى:' : 'Enter code sent to:'} ${formData.email}`}
                        </p>
                    </div>

                    {/* Progress Stepper Bar */}
                    <div className="auth-stepper">
                        <div className={`auth-step-pill ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
                            <span>1. {isAr ? 'البيانات الشخصية' : 'Personal Info'}</span>
                            {step > 1 && <Check size={14} />}
                        </div>
                        <div className="auth-step-divider"></div>
                        <div className={`auth-step-pill ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
                            <span>2. {isAr ? 'بيانات الشركة' : 'Company'}</span>
                            {step > 2 && <Check size={14} />}
                        </div>
                        <div className="auth-step-divider"></div>
                        <div className={`auth-step-pill ${step === 3 ? 'active' : ''}`}>
                            <span>3. {isAr ? 'التفعيل' : 'Verify'}</span>
                        </div>
                    </div>

                    {/* STEP 1: Personal Info Form */}
                    {step === 1 && (
                        <div>
                            {/* Google & Social Sign-Up Options */}
                            <div className="social-auth-container">
                                <button type="button" className="social-auth-btn" onClick={handleGoogleAuth}>
                                    <svg width="20" height="20" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                    </svg>
                                    <span>{isAr ? 'المتابعة باستخدام Google' : 'Continue with Google'}</span>
                                </button>
                            </div>

                            <div className="auth-divider">
                                <span>{isAr ? 'أو التسجيل بالبريد الإلكتروني' : 'Or register with email'}</span>
                            </div>

                            <form onSubmit={handleStep1Submit} className="auth-form">
                                {/* Name */}
                                <div className="input-group">
                                    <label className="input-label">
                                        <User size={16} /> <span>{isAr ? 'الاسم بالكامل' : 'Full Name'}</span> <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="input"
                                        placeholder={isAr ? 'م. أحمد خالد' : 'Eng. Ahmed Khaled'}
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                {/* Phone */}
                                <div className="input-group">
                                    <label className="input-label">
                                        <Phone size={16} /> <span>{isAr ? 'رقم الهاتف' : 'Phone Number'}</span> <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        className="input"
                                        placeholder="01012345678"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        required
                                        style={{ direction: 'ltr', textAlign: isAr ? 'right' : 'left' }}
                                    />
                                </div>

                                {/* Email */}
                                <div className="input-group">
                                    <label className="input-label">
                                        <Mail size={16} /> <span>{isAr ? 'البريد الإلكتروني' : 'Email Address'}</span> <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        className="input"
                                        placeholder="eng.ahmed@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                {/* Password */}
                                <div className="input-group">
                                    <label className="input-label">
                                        <Lock size={16} /> <span>{isAr ? 'كلمة المرور' : 'Password'}</span> <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            className="input"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            minLength={8}
                                            style={{ paddingInlineEnd: '40px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                [isAr ? 'left' : 'right']: '12px',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-tertiary)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    {/* Password Strength Indicator */}
                                    {formData.password && (
                                        <div className="password-strength-container">
                                            <div className="password-strength-bar">
                                                <div 
                                                    className="password-strength-fill" 
                                                    style={{ 
                                                        width: `${passwordStrength.score}%`, 
                                                        background: passwordStrength.color 
                                                    }}
                                                ></div>
                                            </div>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: passwordStrength.color }}>
                                                {passwordStrength.label}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div className="input-group">
                                    <label className="input-label">
                                        <Lock size={16} /> <span>{isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}</span> <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            name="confirmPassword"
                                            className="input"
                                            placeholder="••••••••"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                            style={{ paddingInlineEnd: '40px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                [isAr ? 'left' : 'right']: '12px',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-tertiary)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Terms of Service Agreement */}
                                <label style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 8,
                                    marginTop: 14, cursor: 'pointer', fontSize: '0.8rem',
                                    lineHeight: 1.45, color: 'var(--text-secondary, #a8a29e)'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                        style={{
                                            marginTop: 2, accentColor: '#ff5a1f',
                                            width: 16, height: 16, flexShrink: 0, cursor: 'pointer'
                                        }}
                                    />
                                    <span>
                                        {isAr ? 'أوافق على ' : 'I agree to the '}
                                        <Link to="/terms" target="_blank" style={{ color: '#ff5a1f', textDecoration: 'none', fontWeight: 600 }}>
                                            {isAr ? 'شروط الخدمة' : 'Terms of Service'}
                                        </Link>
                                        {isAr ? ' و' : ' and '}
                                        <Link to="/privacy" target="_blank" style={{ color: '#ff5a1f', textDecoration: 'none', fontWeight: 600 }}>
                                            {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
                                        </Link>
                                    </span>
                                </label>

                                <button 
                                    type="submit" 
                                    className="btn btn-primary btn-lg" 
                                    style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                >
                                    <span>{isAr ? 'المتابعة لإعداد بيانات الشركة' : 'Continue to Company Setup'}</span>
                                    <ArrowRight size={18} />
                                </button>
                            </form>
                        </div>
                    )}

                    {/* STEP 2: Workspace Decision (Create vs. Join) */}
                    {step === 2 && (
                        <form onSubmit={handleStep2Submit} className="auth-form">
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                {isAr ? 'اختر نوع الحساب المطلوب للبدء:' : 'Choose your account type to begin:'}
                            </label>

                            {/* Dual Selection Cards */}
                            <div className="workspace-options-grid">
                                {/* Card 1: Create New Company */}
                                <div 
                                    className={`workspace-card-option ${workspacePath === 'CREATE_COMPANY' ? 'selected' : ''}`}
                                    onClick={() => setWorkspacePath('CREATE_COMPANY')}
                                >
                                    <div>
                                        <span className="workspace-card-badge">
                                            {isAr ? 'فترة تجريبية 30 يوم' : '30-Day Pilot'}
                                        </span>
                                        <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Building2 size={18} color="#ff5a1f" />
                                            <span>{isAr ? 'إنشاء شركة جديدة' : 'Create New Company'}</span>
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                            {isAr ? 'ابدأ حساباً لشركتك الهندسية أو مكتبك وقم بإدارة المشاريع والفريق.' : 'Start a fresh company account for your firm.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Card 2: Join Existing Company */}
                                <div 
                                    className={`workspace-card-option ${workspacePath === 'JOIN_COMPANY' ? 'selected' : ''}`}
                                    onClick={() => setWorkspacePath('JOIN_COMPANY')}
                                >
                                    <div>
                                        <span className="workspace-card-badge">
                                            {isAr ? 'رابط / كود دعوة' : 'Invite Link/Code'}
                                        </span>
                                        <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Users size={18} color="#10b981" />
                                            <span>{isAr ? 'الانضمام لشركة قائمة' : 'Join Existing Company'}</span>
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                            {isAr ? 'انضم لفريق عمل شركتك أو مشروعك باستخدام رابط أو كود الدعوة المرسل لك.' : 'Join your team with an invite code.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* PATH A: Create New Company Inputs */}
                            {workspacePath === 'CREATE_COMPANY' && (
                                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                                    <div className="input-group">
                                        <label className="input-label">
                                            <Building2 size={16} /> <span>{isAr ? 'اسم الشركة الهندسية أو المقاولات' : 'Company Name'}</span> <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="companyName"
                                            className="input"
                                            placeholder={isAr ? 'مثال: شركة النور للمقاولات العامة' : 'e.g. Al-Nour Contracting'}
                                            value={formData.companyName}
                                            onChange={handleChange}
                                            required={workspacePath === 'CREATE_COMPANY'}
                                        />
                                    </div>

                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label className="input-label">
                                            <Phone size={16} /> <span>{isAr ? 'هاتف الشركة (اختياري)' : 'Company Phone (Optional)'}</span>
                                        </label>
                                        <input
                                            type="tel"
                                            name="companyPhone"
                                            className="input"
                                            placeholder="01099998888"
                                            value={formData.companyPhone}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* PATH B: Join Existing Company Inputs */}
                            {workspacePath === 'JOIN_COMPANY' && (
                                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                                    <div className="input-group">
                                        <label className="input-label">
                                            <LinkIcon size={16} /> <span>{isAr ? 'رابط أو كود الدعوة' : 'Invite Link or Token'}</span> <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="inviteToken"
                                            className="input"
                                            placeholder={isAr ? 'الصق رابط الدعوة أو الكود هنا...' : 'Paste invite URL or token code...'}
                                            value={formData.inviteToken}
                                            onChange={(e) => {
                                                handleChange(e);
                                                validateInviteToken(e.target.value);
                                            }}
                                            required={workspacePath === 'JOIN_COMPANY'}
                                        />
                                    </div>

                                    {validatingInvite && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            <Loader2 size={14} className="spin" />
                                            <span>{isAr ? 'جاري التحقق من بيانات الشركة...' : 'Verifying company details...'}</span>
                                        </div>
                                    )}

                                    {invitePreview && (
                                        <div className="invite-preview-box" style={{ marginTop: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    {isAr ? '✓ مساحة عمل معتمدة وموثقة' : '✓ Verified Workspace'}
                                                </span>
                                                <h4 style={{ margin: '4px 0 2px 0', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                    {invitePreview.companyName}
                                                </h4>
                                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    {isAr ? 'الدور المخصص لك:' : 'Assigned Role:'} <strong style={{ color: '#38bdf8' }}>{invitePreview.roleDisplayName || invitePreview.role}</strong>
                                                    {invitePreview.email ? ` (${invitePreview.email})` : ''}
                                                </span>
                                            </div>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <CheckCircle2 size={24} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => setStep(1)}
                                    style={{ flex: 1, padding: '12px' }}
                                >
                                    <ArrowLeft size={16} />
                                    <span>{isAr ? 'الرجوع' : 'Back'}</span>
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary"
                                    disabled={loading}
                                    style={{ flex: 2, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                >
                                    {loading ? <Loader2 size={18} className="spin" /> : null}
                                    <span>
                                        {workspacePath === 'CREATE_COMPANY'
                                            ? (isAr ? 'تأكيد وإنشاء حساب الشركة' : 'Create Company')
                                            : (isAr ? 'الانضمام للشركة وتفعيل الحساب' : 'Join Company')
                                        }
                                    </span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* STEP 3: OTP Verification View */}
                    {step === 3 && (
                        <form onSubmit={handleVerifyOtp} className="auth-form">
                            <div className="input-group">
                                <label className="input-label" style={{ justifyContent: 'center' }}>
                                    <ShieldCheck size={18} /> <span>{isAr ? 'رمز التحقق (6 أرقام)' : 'Verification Code (6 Digits)'}</span>
                                </label>
                                <input
                                    type="text"
                                    name="code"
                                    inputMode="numeric"
                                    maxLength={6}
                                    autoFocus
                                    className="input"
                                    placeholder="123456"
                                    value={formData.code}
                                    onChange={handleChange}
                                    required
                                    style={{ fontSize: '26px', letterSpacing: '8px', textAlign: 'center', fontWeight: 800 }}
                                />
                            </div>

                            <button 
                                type="submit" 
                                className="btn btn-primary btn-lg" 
                                disabled={loading || formData.code.length < 6}
                                style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            >
                                {loading ? <Loader2 size={18} className="spin" /> : null}
                                <span>{isAr ? 'تأكيد الحساب والدخول للنظام' : 'Confirm & Go to Dashboard'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="btn"
                                style={{ marginTop: '12px', background: 'transparent', color: '#ff8a50', width: '100%' }}
                            >
                                {isAr ? 'الرجوع لتعديل بيانات الشركة' : 'Back to Edit Details'}
                            </button>
                        </form>
                    )}

                    {/* Footer */}
                    <div className="auth-footer">
                        <p>
                            {isAr ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                            <Link to="/login" className="auth-link">
                                {isAr ? 'تسجيل الدخول' : 'Sign in'}
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
