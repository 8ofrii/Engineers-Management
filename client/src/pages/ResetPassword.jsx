import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useAlert } from '../context/AlertContext';
import './Auth.css';

export default function ResetPassword() {
    const { t } = useTranslation();
    const { token } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const { showAlert } = useAlert();
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        if (formData.password !== formData.confirmPassword) {
            showAlert({ type: 'error', title: 'Error', message: 'Passwords do not match' });
            return;
        }

        if (formData.password.length < 6) {
            showAlert({ type: 'error', title: 'Error', message: 'Password must be at least 6 characters' });
            return;
        }

        setLoading(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await axios.put(`${apiUrl}/api/auth/reset-password/${token}`, {
                password: formData.password
            });
            const successMsg = response.data.message || 'Password reset successful. You can now login with your new password.';
            setMessage(successMsg);
            showAlert({ type: 'success', title: 'Success', message: successMsg });
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            showAlert({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Error resolving password reset. The link might be expired.' });
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
                        <h1>{t('auth.resetPassword') || 'Reset Password'}</h1>
                        <p>{t('auth.resetPasswordSubtitle') || 'Enter your new password below'}</p>
                    </div>

                    {message && (
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--color-success, #22c55e)', color: 'var(--color-success, #22c55e)', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', marginBottom: '16px' }}>
                            <CheckCircle size={20} />
                            <span>{message}</span>
                        </div>
                    )}

                    {!message ? (
                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="input-group">
                                <label className="input-label">
                                    <Lock size={16} />
                                    {t('auth.newPassword') || 'New Password'}
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    className="input"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">
                                    <Lock size={16} />
                                    {t('auth.confirmNewPassword') || 'Confirm New Password'}
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    className="input"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                                {loading ? (
                                    <>
                                        <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                                        {t('auth.resetting') || 'Resetting...'}
                                    </>
                                ) : (
                                    t('auth.resetPassword') || 'Reset Password'
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center mt-lg mb-lg">
                            <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
                                {t('auth.login') || 'Login'}
                            </Link>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
