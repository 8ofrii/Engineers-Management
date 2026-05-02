import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { Building2, Mail, Lock, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import './Auth.css';

export default function Login() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { login, complete2FALogin } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // 2FA challenge state — when set, the user has passed password but
    // needs to enter a TOTP code to complete login.
    const [twoFactor, setTwoFactor] = useState(null); // { challengeToken } | null
    const [twoFactorCode, setTwoFactorCode] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await login(formData.email, formData.password);
            if (result?.requires2FA) {
                setTwoFactor({ challengeToken: result.challengeToken });
                return;
            }
            navigate('/dashboard');
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || 'Login failed. Please check your credentials.' });
        } finally {
            setLoading(false);
        }
    };

    const handle2FASubmit = async (e) => {
        e.preventDefault();
        if (!/^\d{6}$/.test(twoFactorCode.trim())) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: 'Enter a 6-digit code from your authenticator app' });
            return;
        }
        setLoading(true);
        try {
            await complete2FALogin(twoFactor.challengeToken, twoFactorCode.trim());
            navigate('/dashboard');
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || 'Invalid code' });
        } finally {
            setLoading(false);
        }
    };

    // 2FA challenge view — replaces the email/password form when active.
    if (twoFactor) {
        return (
            <div className="auth-container">
                <div className="auth-background"></div>
                <div className="auth-content">
                    <div className="auth-card glass">
                        <div className="auth-header">
                            <div className="auth-logo"><ShieldCheck size={40} /></div>
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
                            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                                {loading ? (
                                    <>
                                        <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                                        {t('auth.signingIn') || 'Verifying…'}
                                    </>
                                ) : (
                                    t('auth.verify') || 'Verify'
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setTwoFactor(null); setTwoFactorCode(''); }}
                                className="btn"
                                style={{ marginTop: '12px', background: 'transparent', color: 'var(--color-primary)' }}
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
            <div className="auth-background"></div>

            <div className="auth-content">
                <div className="auth-card glass">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <Building2 size={40} />
                        </div>
                        <h1>{t('auth.welcomeBack')}</h1>
                        <p>{t('projects.subtitle')}</p>
                    </div>

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
                                value={formData.email}
                                onChange={handleChange}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="input-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label className="input-label">
                                    <Lock size={16} />
                                    {t('auth.password')}
                                </label>
                                <Link to="/forgot-password" style={{ fontSize: '12px', color: 'var(--color-primary)', textDecoration: 'none' }}>
                                    {t('auth.forgotPassword') || 'Forgot Password?'}
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
                                    style={{ paddingRight: '40px', width: '100%' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
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
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                            {loading ? (
                                <>
                                    <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                                    {t('auth.signingIn')}
                                </>
                            ) : (
                                t('auth.login')
                            )}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>
                            {t('auth.dontHaveAccount')}{' '}
                            <Link to="/signup" className="auth-link">
                                {t('auth.createAccount')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
