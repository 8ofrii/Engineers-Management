import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Building2, Mail, Lock, User, Phone, AlertCircle } from 'lucide-react';
import './Auth.css';

export default function SignUp() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { register } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        company: '',
        phone: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await register({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                company: formData.company,
                phone: formData.phone
            });
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
                        <h1>{t('auth.createAccount')}</h1>
                        <p>{t('projects.subtitle')}</p>
                    </div>

                    {error && (
                        <div className="alert alert-danger">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="input-group">
                            <label className="input-label">
                                <User size={16} />
                                {t('auth.name')}
                            </label>
                            <input
                                type="text"
                                name="name"
                                className="input"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

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
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">
                                <Building2 size={16} />
                                {t('auth.company')}
                            </label>
                            <input
                                type="text"
                                name="company"
                                className="input"
                                placeholder="Your Company"
                                value={formData.company}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">
                                <Phone size={16} />
                                {t('auth.phone')}
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                className="input"
                                placeholder="+1 (555) 000-0000"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">
                                <Lock size={16} />
                                {t('auth.password')}
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
                                {t('auth.confirmPassword')}
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
                                    {t('auth.creatingAccount')}
                                </>
                            ) : (
                                t('auth.createAccount')
                            )}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>
                            {t('auth.alreadyHaveAccount')}{' '}
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
