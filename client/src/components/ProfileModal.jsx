import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Upload, User, Building2, UserCircle, AlertCircle, Eye, EyeOff, CheckCircle, Trash2, AlertTriangle, ShieldAlert, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import api, { tenantAPI, authAPI } from '../services/api';
import './Modal.css';

export default function ProfileModal({ isOpen, onClose, forceChangePassword = false }) {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const { user, updateUser, logout } = useAuth();
    const { showAlert } = useAlert();
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        nameAr: '',
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
    const [uploadingCompanyLogo, setUploadingCompanyLogo] = useState(false);

    // Danger Zone Deletion State
    const [showDeleteCompanyConfirm, setShowDeleteCompanyConfirm] = useState(false);
    const [deleteCompanyConfirmName, setDeleteCompanyConfirmName] = useState('');
    const [deleteCompanyPassword, setDeleteCompanyPassword] = useState('');
    const [deletingCompany, setDeletingCompany] = useState(false);

    const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
    const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
    const [deletingAccount, setDeletingAccount] = useState(false);

    // Password Visibility State
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const togglePassword = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    // Helper function to get full image URL
    const getImageUrl = (path) => {
        if (!path || typeof path !== 'string') return null;
        if (path.startsWith('blob:') || path.startsWith('data:')) return path;
        const cleanPath = path.replace(/^https?:\/\/(localhost|127\.0\.0\.1):5000/i, '');
        if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
            return cleanPath;
        }
        return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    };

    useEffect(() => {
        if (isOpen && user) {
            // Profile Data
            setFormData({
                name: user.name || '',
                nameAr: user.nameAr || '',
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

        // Password validation
        // If forceChangePassword is true, newPassword is MANDATORY
        if (forceChangePassword || formData.newPassword || formData.confirmPassword) {
            if (!formData.currentPassword) {
                newErrors.currentPassword = t('profile.errors.currentPasswordRequired');
            }

            // Strict Complexity Check
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!formData.newPassword) {
                newErrors.newPassword = t('profile.errors.passwordRequired');
            } else if (!passwordRegex.test(formData.newPassword)) {
                newErrors.newPassword = 'Password must be at least 8 chars, with Uppercase, Lowercase, Number, and Symbol.';
            }

            if (formData.newPassword !== formData.confirmPassword) {
                newErrors.confirmPassword = t('profile.errors.passwordMismatch');
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCompanyLogoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: 'Please select a valid image file.' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: 'Image size must not exceed 5MB.' });
            return;
        }

        setCompanyLogo(file);
        setCompanyLogoPreview(URL.createObjectURL(file));
        setUploadingCompanyLogo(true);

        try {
            const data = new FormData();
            data.append('logo', file);
            if (companyData.name) data.append('name', companyData.name);
            if (companyData.address) data.append('address', companyData.address);
            if (companyData.phone) data.append('phone', companyData.phone);
            if (companyData.email) data.append('email', companyData.email);

            const res = await tenantAPI.updateSettings(data);
            const newLogo = res.data?.data?.logo;
            if (newLogo) {
                setCompanyLogoPreview(getImageUrl(newLogo));
            }

            const me = await api.get('/auth/me');
            updateUser(me.data.data);
            setSuccessMessage('Company logo updated successfully');
        } catch (err) {
            console.error(err);
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || 'Failed to upload company logo' });
        } finally {
            setUploadingCompanyLogo(false);
            e.target.value = '';
        }
    };

    const [successMessage, setSuccessMessage] = useState(null);

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

            setSuccessMessage('Company settings updated successfully');
        } catch (err) {
            console.error(err);
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || 'Failed to update company' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCompanySubmit = async (e) => {
        e?.preventDefault?.();
        if (deleteCompanyConfirmName.trim().toLowerCase() !== companyData.name.trim().toLowerCase()) {
            showAlert({
                type: 'error',
                title: isAr ? 'خطأ في التأكيد' : 'Confirmation Error',
                message: isAr
                    ? 'اسم الشركة المدخل غير متطابق مع اسم مساحة العمل.'
                    : 'The typed company name does not match the workspace name.'
            });
            return;
        }

        setDeletingCompany(true);
        try {
            await tenantAPI.deleteCompany({
                confirmCompanyName: deleteCompanyConfirmName,
                password: deleteCompanyPassword
            });
            setShowDeleteCompanyConfirm(false);
            onClose();
            showAlert({
                type: 'success',
                title: isAr ? 'تم حذف مساحة العمل' : 'Workspace Deleted',
                message: isAr
                    ? 'تم حذف مساحة العمل وجميع البيانات المرتبطة بها بنجاح.'
                    : 'The workspace and all associated data have been permanently deleted.'
            });
            setTimeout(() => {
                logout();
                window.location.href = '/login';
            }, 1000);
        } catch (err) {
            showAlert({
                type: 'error',
                title: isAr ? 'فشل الحذف' : 'Deletion Failed',
                message: err.response?.data?.message || (isAr ? 'تعذر حذف مساحة العمل' : 'Could not delete workspace')
            });
        } finally {
            setDeletingCompany(false);
        }
    };

    const handleDeleteAccountSubmit = async (e) => {
        e?.preventDefault?.();
        setDeletingAccount(true);
        try {
            await authAPI.deleteAccount({
                password: deleteAccountPassword
            });
            setShowDeleteAccountConfirm(false);
            onClose();
            showAlert({
                type: 'success',
                title: isAr ? 'تم حذف الحساب' : 'Account Deleted',
                message: isAr ? 'تم حذف حسابك بنجاح.' : 'Your account has been deleted.'
            });
            setTimeout(() => {
                logout();
                window.location.href = '/login';
            }, 1000);
        } catch (err) {
            showAlert({
                type: 'error',
                title: isAr ? 'فشل الحذف' : 'Deletion Failed',
                message: err.response?.data?.message || (isAr ? 'تعذر حذف الحساب' : 'Could not delete account')
            });
        } finally {
            setDeletingAccount(false);
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
            formDataToSend.append('nameAr', formData.nameAr || '');
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
            setSuccessMessage(t('profile.updateSuccess'));
        } catch (error) {
            console.error('Failed to update profile:', error);
            if (error.response?.data?.message) {
                showAlert({ type: 'error', title: t('common.error') || 'Error', message: error.response.data.message });
            } else {
                showAlert({ type: 'error', title: t('common.error') || 'Error', message: t('profile.updateError') });
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
        setSuccessMessage(null);
        onClose();
    };

    // Prevent closing if forced
    const handleOverlayClick = (e) => {
        if (!forceChangePassword) {
            handleClose();
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{ flexDirection: 'column', gap: '20px', paddingBottom: '0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {forceChangePassword ? 'Action Required: Change Password' : (activeTab === 'profile' ? t('profile.title') : 'Company Settings')}
                        </h2>
                        {!forceChangePassword && (
                            <button className="modal-close" onClick={handleClose} style={{ background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '50%' }}>
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {/* Tabs (Pill Style) - Hide if forced */}
                    {!forceChangePassword && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
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

                <div className="modal-body">
                    {successMessage ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px 20px',
                            textAlign: 'center',
                            height: '100%'
                        }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: 'rgba(34, 197, 94, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '24px'
                            }}>
                                <CheckCircle size={48} color="#22c55e" />
                            </div>
                            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-primary)' }}>Success!</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '16px' }}>{successMessage}</p>
                            <button className="btn btn-primary" onClick={handleClose} style={{ minWidth: '150px' }}>
                                {t('common.close')}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>

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
                                                <label htmlFor="name">{t('profile.fields.name')} ({isAr ? 'بالإنجليزية' : 'English'}) <span className="required">*</span></label>
                                                <input
                                                    type="text"
                                                    id="name"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    className={errors.name ? 'error' : ''}
                                                    placeholder="e.g. Hossam Hassan"
                                                />
                                                {errors.name && <span className="error-message">{errors.name}</span>}
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="nameAr">{isAr ? 'الاسم بالعربية' : 'Name in Arabic'}</label>
                                                <input
                                                    type="text"
                                                    id="nameAr"
                                                    name="nameAr"
                                                    value={formData.nameAr}
                                                    onChange={handleChange}
                                                    placeholder="مثال: حسام حسن"
                                                />
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
                                        <h3 className="section-title">{forceChangePassword ? 'Create New Password' : t('profile.sections.password')}</h3>
                                        {forceChangePassword && (
                                            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                                                <AlertCircle size={16} />
                                                <span>For your security, you must change your password on first login.</span>
                                            </div>
                                        )}
                                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                            Password must include: 8+ chars, Uppercase, Lowercase, Number, Symbol.
                                        </p>
                                        <div className="form-grid">
                                            <div className="form-group full-width">
                                                <label htmlFor="currentPassword">{t('profile.fields.currentPassword')}</label>
                                                <div style={{ position: 'relative', width: '100%' }}>
                                                    <input
                                                        type={showPasswords.current ? 'text' : 'password'}
                                                        id="currentPassword"
                                                        name="currentPassword"
                                                        value={formData.currentPassword}
                                                        onChange={handleChange}
                                                        className={errors.currentPassword ? 'error' : ''}
                                                        style={{ paddingRight: '40px', width: '100%' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePassword('current')}
                                                        style={{
                                                            position: 'absolute',
                                                            right: '10px',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--text-secondary)',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                                {errors.currentPassword && <span className="error-message">{errors.currentPassword}</span>}
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="newPassword">{t('profile.fields.newPassword')}</label>
                                                <div style={{ position: 'relative', width: '100%' }}>
                                                    <input
                                                        type={showPasswords.new ? 'text' : 'password'}
                                                        id="newPassword"
                                                        name="newPassword"
                                                        value={formData.newPassword}
                                                        onChange={handleChange}
                                                        className={errors.newPassword ? 'error' : ''}
                                                        style={{ paddingRight: '40px', width: '100%' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePassword('new')}
                                                        style={{
                                                            position: 'absolute',
                                                            right: '10px',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--text-secondary)',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                                {errors.newPassword && <span className="error-message">{errors.newPassword}</span>}
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="confirmPassword">{t('profile.fields.confirmPassword')}</label>
                                                <div style={{ position: 'relative', width: '100%' }}>
                                                    <input
                                                        type={showPasswords.confirm ? 'text' : 'password'}
                                                        id="confirmPassword"
                                                        name="confirmPassword"
                                                        value={formData.confirmPassword}
                                                        onChange={handleChange}
                                                        className={errors.confirmPassword ? 'error' : ''}
                                                        style={{ paddingRight: '40px', width: '100%' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePassword('confirm')}
                                                        style={{
                                                            position: 'absolute',
                                                            right: '10px',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--text-secondary)',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Danger Zone: Delete Personal Account */}
                                    <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.25)', backgroundColor: 'rgba(239, 68, 68, 0.04)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 600, fontSize: '14px' }}>
                                                    <AlertTriangle size={18} />
                                                    <span>{isAr ? 'منطقة الخطر: حذف الحساب' : 'Danger Zone: Delete Account'}</span>
                                                </div>
                                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    {isAr ? 'سيؤدي حذف حسابك إلى إلغاء صلاحيات الوصول وتسجيل الخروج فوراً.' : 'Permanently delete your personal user account and credentials.'}
                                                </p>
                                            </div>
                                            {!showDeleteAccountConfirm ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDeleteAccountConfirm(true)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={14} />
                                                    {isAr ? 'حذف حسابي' : 'Delete My Account'}
                                                </button>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', marginTop: '8px' }}>
                                                    <input
                                                        type="password"
                                                        placeholder={isAr ? 'أدخل كلمة المرور للتأكيد' : 'Enter password to confirm'}
                                                        value={deleteAccountPassword}
                                                        onChange={(e) => setDeleteAccountPassword(e.target.value)}
                                                        style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #ef4444', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleDeleteAccountSubmit}
                                                        disabled={deletingAccount || !deleteAccountPassword}
                                                        style={{ padding: '8px 14px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                                    >
                                                        {deletingAccount ? t('common.loading') : (isAr ? 'تأكيد الحذف' : 'Confirm Delete')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowDeleteAccountConfirm(false)}
                                                        style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                                                    >
                                                        {t('common.cancel')}
                                                    </button>
                                                </div>
                                            )}
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
                                                    borderRadius: '50%',
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
                                            <label className="btn btn-secondary" style={{ cursor: uploadingCompanyLogo ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: uploadingCompanyLogo ? 0.7 : 1 }}>
                                                {uploadingCompanyLogo ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                                                {uploadingCompanyLogo ? 'Uploading...' : 'Upload Logo'}
                                                <input type="file" accept="image/*" onChange={handleCompanyLogoChange} disabled={uploadingCompanyLogo} style={{ display: 'none' }} />
                                            </label>
                                            <p style={{ fontSize: '12px', color: '#6b7280' }}>Recommended: Square PNG, max 5MB</p>
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

                                    {/* Danger Zone: Delete Company (Admins Only) */}
                                    {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                                        <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.25)', backgroundColor: 'rgba(239, 68, 68, 0.04)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 600, fontSize: '14px' }}>
                                                        <ShieldAlert size={18} />
                                                        <span>{isAr ? 'منطقة الخطر: حذف مساحة العمل' : 'Danger Zone: Delete Workspace'}</span>
                                                    </div>
                                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                        {isAr ? 'حذف مساحة العمل يؤدي لمسح دائم للمشاريع والمعاملات وحسابات الفريق.' : 'Permanently wipes all company projects, transactions, invoices, and members.'}
                                                    </p>
                                                </div>
                                                {!showDeleteCompanyConfirm ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowDeleteCompanyConfirm(true)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                                    >
                                                        <Trash2 size={14} />
                                                        {isAr ? 'حذف الشركة بالكامل' : 'Delete Workspace'}
                                                    </button>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '8px' }}>
                                                        <input
                                                            type="text"
                                                            placeholder={isAr ? `اكتب اسم الشركة للتأكيد: "${companyData.name}"` : `Type company name: "${companyData.name}"`}
                                                            value={deleteCompanyConfirmName}
                                                            onChange={(e) => setDeleteCompanyConfirmName(e.target.value)}
                                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ef4444', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                                                        />
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <input
                                                                type="password"
                                                                placeholder={isAr ? 'كلمة مرور المدير' : 'Admin password'}
                                                                value={deleteCompanyPassword}
                                                                onChange={(e) => setDeleteCompanyPassword(e.target.value)}
                                                                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #ef4444', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={handleDeleteCompanySubmit}
                                                                disabled={deletingCompany || !deleteCompanyPassword || !deleteCompanyConfirmName}
                                                                style={{ padding: '8px 14px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                                            >
                                                                {deletingCompany ? t('common.loading') : (isAr ? 'تأكيد الحذف النهائي' : 'Permanently Delete')}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowDeleteCompanyConfirm(false)}
                                                                style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                                                            >
                                                                {t('common.cancel')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="modal-footer">
                                {!forceChangePassword && (
                                    <button type="button" className="btn btn-secondary" onClick={handleClose}>
                                        {t('common.cancel')}
                                    </button>
                                )}
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? t('common.loading') : (activeTab === 'profile' ? t('profile.saveChanges') : 'Save Company Settings')}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
