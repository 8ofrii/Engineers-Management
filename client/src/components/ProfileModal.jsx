import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, User, Building2, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { tenantAPI } from '../services/api';
import './Modal.css';
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

    // NEW: Tab & Company State
    const [activeTab, setActiveTab] = useState('profile');
    const [companyData, setCompanyData] = useState({ name: '', address: '', phone: '', email: '' });
    const [companyLogo, setCompanyLogo] = useState(null);
    const [companyLogoPreview, setCompanyLogoPreview] = useState(null);

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
            // Profile Data
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

            // Reset Tab
            setActiveTab('profile');
        }
    }, [isOpen, user]);

    // Load Company Data when tab active
    useEffect(() => {
        if (isOpen && activeTab === 'company' && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')) {
            loadCompanySettings();
        }
    }, [isOpen, activeTab, user]);

    const loadCompanySettings = async () => {
        try {
            const res = await tenantAPI.getSettings();
            const data = res.data.data;
            setCompanyData({
                name: data.name || '',
                address: data.address || '',
                phone: data.phone || '',
                email: data.email || ''
            });
            if (data.logo) {
                setCompanyLogoPreview(getImageUrl(data.logo));
            }
        } catch (err) {
            console.error('Failed to load company settings', err);
        }
    };

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

    const handleCompanyLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCompanyLogo(file);
            setCompanyLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleCompanySubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            data.append('name', companyData.name);
            data.append('address', companyData.address);
            data.append('phone', companyData.phone);
            data.append('email', companyData.email);
            if (companyLogo) data.append('logo', companyLogo);

            const res = await tenantAPI.updateSettings(data);

            // Refresh User to get new logo potentially if it affects user object (it does in my layout logic)
            const me = await api.get('/auth/me');
            updateUser(me.data.data);

            alert('Company settings updated successfully');
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to update company');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // If we are in Company Tab, handle that instead
        if (activeTab === 'company') {
            handleCompanySubmit(e);
            return;
        }

        if (!validate()) return;
        setLoading(true);

        // ... existing profile logic ...
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
                <div className="modal-header" style={{ flexDirection: 'column', gap: '20px', paddingBottom: '0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {activeTab === 'profile' ? t('profile.title') : 'Company Settings'}
                        </h2>
                        <button className="modal-close" onClick={handleClose} style={{ background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '50%' }}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tabs (Pill Style) */}
                    {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                        <div style={{
                            display: 'flex',
                            background: 'var(--bg-tertiary)',
                            padding: '4px',
                            borderRadius: '12px',
                            width: '100%',
                            position: 'relative',
                            border: '1px solid var(--border-color)'
                        }}>
                            <button
                                type="button"
                                onClick={() => setActiveTab('profile')}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: activeTab === 'profile' ? 'var(--gradient-primary)' : 'transparent',
                                    color: activeTab === 'profile' ? 'white' : 'var(--text-secondary)',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <UserCircle size={18} /> {t('profile.title')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('company')}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: activeTab === 'company' ? 'var(--gradient-primary)' : 'transparent',
                                    color: activeTab === 'company' ? 'white' : 'var(--text-secondary)',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <Building2 size={18} /> Company Profile
                            </button>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="modal-body">

                    {/* --- PROFILE TAB --- */}
                    {activeTab === 'profile' && (
                        <>
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
                        </>
                    )}

                    {/* --- COMPANY TAB --- */}
                    {activeTab === 'company' && (
                        <>
                            {/* Logo Section */}
                            <div className="form-section">
                                <h3 className="section-title">Company Logo</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                    <div
                                        style={{
                                            width: '120px',
                                            height: '120px',
                                            borderRadius: '50%', // Circle for consistency, or square for logo? Let's use circle
                                            overflow: 'hidden',
                                            border: '1px solid #eee',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: '#f9fafb',
                                        }}
                                    >
                                        {companyLogoPreview ? (
                                            <img
                                                src={companyLogoPreview}
                                                alt="Logo"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <Building2 size={40} color="#9ca3af" />
                                        )}
                                    </div>
                                    <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Upload size={16} /> Upload Logo
                                        <input type="file" accept="image/*" onChange={handleCompanyLogoChange} style={{ display: 'none' }} />
                                    </label>
                                    <p style={{ fontSize: '12px', color: '#6b7280' }}>Recommended: Square PNG, max 2MB</p>
                                </div>
                            </div>

                            {/* Company Details */}
                            <div className="form-section">
                                <h3 className="section-title">Company Details</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Company Name <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={companyData.name}
                                            onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Support Email</label>
                                        <input
                                            type="email"
                                            value={companyData.email}
                                            onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Phone</label>
                                        <input
                                            type="text"
                                            value={companyData.phone}
                                            onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Address</label>
                                        <input
                                            type="text"
                                            value={companyData.address}
                                            onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={handleClose}>
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? t('common.loading') : (activeTab === 'profile' ? t('profile.saveChanges') : 'Save Company Settings')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
