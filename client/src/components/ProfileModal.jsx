import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Modal.css';

export default function ProfileModal({ isOpen, onClose }) {
    const { t } = useTranslation();
    const { user, updateUser } = useAuth();
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [profilePicture, setProfilePicture] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    // Helper function to get full image URL
    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        if (path.startsWith('blob:')) return path; // For local preview
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        return `${apiUrl}${path}`;
    };

    useEffect(() => {
        if (isOpen && user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                company: user.company || '',
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            // Set preview URL with full path
            setPreviewUrl(getImageUrl(user.profilePicture));
        }
    }, [isOpen, user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setErrors(prev => ({ ...prev, profilePicture: t('profile.errors.invalidImage') }));
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, profilePicture: t('profile.errors.imageTooLarge') }));
                return;
            }

            setProfilePicture(file);
            setPreviewUrl(URL.createObjectURL(file));
            setErrors(prev => ({ ...prev, profilePicture: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = t('profile.errors.nameRequired');
        }

        if (!formData.email.trim()) {
            newErrors.email = t('profile.errors.emailRequired');
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = t('profile.errors.emailInvalid');
        }

        // Password validation (only if user wants to change password)
        if (formData.newPassword || formData.confirmPassword) {
            if (!formData.currentPassword) {
                newErrors.currentPassword = t('profile.errors.currentPasswordRequired');
            }
            if (formData.newPassword.length < 6) {
                newErrors.newPassword = t('profile.errors.passwordTooShort');
            }
            if (formData.newPassword !== formData.confirmPassword) {
                newErrors.confirmPassword = t('profile.errors.passwordMismatch');
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('name', formData.name);
            formDataToSend.append('email', formData.email);
            formDataToSend.append('phone', formData.phone || '');
            formDataToSend.append('company', formData.company || '');

            if (formData.currentPassword && formData.newPassword) {
                formDataToSend.append('currentPassword', formData.currentPassword);
                formDataToSend.append('newPassword', formData.newPassword);
            }

            if (profilePicture) {
                formDataToSend.append('profilePicture', profilePicture);
            }

            const response = await api.put('/auth/profile', formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Update user context
            updateUser(response.data.data);

            alert(t('profile.updateSuccess'));
            handleClose();
        } catch (error) {
            console.error('Failed to update profile:', error);
            if (error.response?.data?.message) {
                alert(error.response.data.message);
            } else {
                alert(t('profile.updateError'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            company: '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setProfilePicture(null);
        setPreviewUrl(null);
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{t('profile.title')}</h2>
                    <button className="modal-close" onClick={handleClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {/* Profile Picture Section */}
                    <div className="form-section">
                        <h3 className="section-title">{t('profile.sections.picture')}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div
                                style={{
                                    width: '120px',
                                    height: '120px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    border: '3px solid var(--color-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'var(--bg-secondary)',
                                    fontSize: '48px',
                                    fontWeight: '600',
                                    color: 'var(--color-primary)'
                                }}
                            >
                                {previewUrl ? (
                                    <img
                                        src={previewUrl}
                                        alt="Profile"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <User size={60} />
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={16} />
                                {t('profile.uploadPicture')}
                            </button>
                            {errors.profilePicture && <span className="error-message">{errors.profilePicture}</span>}
                        </div>
                    </div>

                    {/* Basic Information */}
                    <div className="form-section">
                        <h3 className="section-title">{t('profile.sections.basic')}</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="name">{t('profile.fields.name')} <span className="required">*</span></label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={errors.name ? 'error' : ''}
                                />
                                {errors.name && <span className="error-message">{errors.name}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">{t('profile.fields.email')} <span className="required">*</span></label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={errors.email ? 'error' : ''}
                                />
                                {errors.email && <span className="error-message">{errors.email}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="phone">{t('profile.fields.phone')}</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="company">{t('profile.fields.company')}</label>
                                <input
                                    type="text"
                                    id="company"
                                    name="company"
                                    value={formData.company}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Change Password */}
                    <div className="form-section">
                        <h3 className="section-title">{t('profile.sections.password')}</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            {t('profile.passwordHint')}
                        </p>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label htmlFor="currentPassword">{t('profile.fields.currentPassword')}</label>
                                <input
                                    type="password"
                                    id="currentPassword"
                                    name="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={handleChange}
                                    className={errors.currentPassword ? 'error' : ''}
                                />
                                {errors.currentPassword && <span className="error-message">{errors.currentPassword}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="newPassword">{t('profile.fields.newPassword')}</label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    className={errors.newPassword ? 'error' : ''}
                                />
                                {errors.newPassword && <span className="error-message">{errors.newPassword}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword">{t('profile.fields.confirmPassword')}</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className={errors.confirmPassword ? 'error' : ''}
                                />
                                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={handleClose}>
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? t('common.loading') : t('profile.saveChanges')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
