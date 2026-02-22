import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { Building2, Mail, Lock, AlertCircle, User, Phone, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { tenantAPI, authAPI } from '../services/api'; // Use APIs directly for granular control
import './Auth.css';

export default function RegisterCompany() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    // const { registerCompany } = useAuth(); // Note: We need to access authAPI directly for verify

    // Step State: 1 = Form, 2 = Verification
    const [step, setStep] = useState(1);

    // UI State
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [devCode, setDevCode] = useState('');

    const [formData, setFormData] = useState({
        companyName: '',
        adminName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        code: '' // Verification Code
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Step 1: Submit Details & Request OTP
    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: t('auth.invalidEmail') || 'Please enter a valid email address' });
            return;
        }

        // 2. Password Match
        if (formData.password !== formData.confirmPassword) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: t('auth.passwordsDoNotMatch') || 'Passwords do not match' });
            return;
        }

        // 3. Strong Password Validation
        // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

        if (!strongPasswordRegex.test(formData.password)) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.' });
            return;
        }

        setLoading(true);

        try {
            // Call API directly to get verification flow initiated
            const response = await authAPI.registerCompany({
                companyName: formData.companyName,
                adminName: formData.adminName,
                email: formData.email,
                phone: formData.phone,
                password: formData.password
            });

            if (response.data?.devVerificationCode) {
                setDevCode(response.data.devVerificationCode);
            }

            // On success
            setStep(2);
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || 'Registration failed. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Submit Verification Code
    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await authAPI.verifyEmail({
                email: formData.email,
                code: formData.code
            });

            // Login successful
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Force reload to update context or use window.location
            window.location.href = '/dashboard';

        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || 'Verification failed. Invalid code.' });
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
                        <h1>{step === 1 ? 'Start Your Pilot' : 'Verify Email'}</h1>
                        <p>{step === 1 ? 'Create your construction company workspace' : `Enter the code sent to ${formData.email}`}</p>
                    </div>

                    {step === 1 ? (
                        <form onSubmit={handleSubmit} className="auth-form">
                            {/* Company Name */}
                            <div className="input-group">
                                <label className="input-label">
                                    <Building2 size={16} /> Company Name <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input type="text" name="companyName" className="input" placeholder="Al-Futtaim Construction" value={formData.companyName} onChange={handleChange} required autoFocus />
                            </div>

                            {/* Admin Name */}
                            <div className="input-group">
                                <label className="input-label">
                                    <User size={16} /> Admin Name <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input type="text" name="adminName" className="input" placeholder="John Doe" value={formData.adminName} onChange={handleChange} required />
                            </div>

                            {/* Email */}
                            <div className="input-group">
                                <label className="input-label">
                                    <Mail size={16} /> {t('auth.email')} <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input type="email" name="email" className="input" placeholder="admin@company.com" value={formData.email} onChange={handleChange} required />
                            </div>

                            {/* Phone */}
                            <div className="input-group">
                                <label className="input-label">
                                    <Phone size={16} /> Phone Number <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input type="tel" name="phone" className="input" placeholder="+20 100 000 0000" value={formData.phone} onChange={handleChange} required />
                            </div>

                            {/* Passwords */}
                            <div className="grid grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {/* Password Field */}
                                <div className="input-group">
                                    <label className="input-label">
                                        <Lock size={16} /> {t('auth.password')} <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            className="input"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            style={{ paddingRight: '40px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '10px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: '#6b7280',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Field */}
                                <div className="input-group">
                                    <label className="input-label">
                                        <CheckCircle size={16} /> Confirm <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            name="confirmPassword"
                                            className="input"
                                            placeholder="••••••••"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                            style={{ paddingRight: '40px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            style={{
                                                position: 'absolute',
                                                right: '10px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: '#6b7280',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '-10px', marginBottom: '20px' }}>
                                Must contain: 8+ chars, Uppercase, Lowercase, Number, Symbol
                            </p>

                            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                                {loading ? 'Sending Code...' : 'Next: Verify Email'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerify} className="auth-form">
                            {devCode && (
                                <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--color-success, #22c55e)', color: 'var(--color-success, #22c55e)', padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginBottom: '15px' }}>
                                    <div><CheckCircle size={16} style={{ display: 'inline', marginRight: '5px' }} /> <strong>[Dev Testing Mode]</strong></div>
                                    <p style={{ margin: 0, fontSize: '14px' }}>Since SMTP might off locally, your code is: <strong style={{ letterSpacing: '2px', fontSize: '18px' }}>{devCode}</strong></p>
                                </div>
                            )}
                            {/* Verification Code */}
                            <div className="input-group">
                                <label className="input-label"><CheckCircle size={16} /> Verification Code</label>
                                <input
                                    type="text"
                                    name="code"
                                    className="input"
                                    placeholder="123456"
                                    style={{ fontSize: '24px', textAlign: 'center', letterSpacing: '8px' }}
                                    value={formData.code}
                                    onChange={handleChange}
                                    maxLength="6"
                                    required
                                    autoFocus
                                />
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                                {loading ? 'Verifying...' : 'Activate Account'}
                            </button>

                            <button type="button" className="btn btn-link" onClick={() => setStep(1)} style={{ marginTop: '10px' }}>
                                Back to Details
                            </button>
                        </form>
                    )}

                    <div className="auth-footer">
                        <p>
                            Already have an account?{' '}
                            <Link to="/login" className="auth-link">
                                {t('auth.login')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
