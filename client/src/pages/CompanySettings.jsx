import { useState, useEffect } from 'react';
import { tenantAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
    Building2, Save, Upload, UserCircle, Trash2, 
    AlertTriangle, ShieldAlert, X, Mail, Phone, MapPin, 
    Lock, CheckCircle2, RefreshCw, Eye, EyeOff, Shield
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import MultiPhoneInput from '../components/MultiPhoneInput';

export default function CompanySettings() {
    const { user, updateUser, logout } = useAuth();
    const { showAlert } = useAlert();
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('company'); // 'company' | 'profile'

    // Company State
    const [companyData, setCompanyData] = useState({
        name: '', address: '', phone: '', email: '', phones: ['']
    });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    // Profile State
    const [profileData, setProfileData] = useState({
        name: '', nameAr: '', email: '', phone: '', company: '', phones: [''],
        currentPassword: '', newPassword: '', confirmPassword: ''
    });
    const [profileImg, setProfileImg] = useState(null);
    const [profilePreview, setProfilePreview] = useState(null);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    // Delete Modals State
    const [showDeleteCompanyModal, setShowDeleteCompanyModal] = useState(false);
    const [deleteCompanyConfirmName, setDeleteCompanyConfirmName] = useState('');
    const [deleteCompanyPassword, setDeleteCompanyPassword] = useState('');
    const [deletingCompany, setDeletingCompany] = useState(false);

    const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
    const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
    const [deletingAccount, setDeletingAccount] = useState(false);

    // Instant Upload States
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingProfileImg, setUploadingProfileImg] = useState(false);

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
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [companyRes, userRes] = await Promise.all([
                tenantAPI.getSettings().catch(() => ({ data: { data: {} } })),
                authAPI.getMe().catch(() => ({ data: { data: {} } }))
            ]);

            // Load Company
            const cData = companyRes.data?.data || {};
            const cPhones = Array.isArray(cData.phones) && cData.phones.length > 0
                ? cData.phones
                : (cData.phone ? [cData.phone] : ['']);
            setCompanyData({
                name: cData.name || '',
                address: cData.address || '',
                phone: cData.phone || cPhones[0] || '',
                phones: cPhones,
                email: cData.email || ''
            });
            if (cData.logo) {
                setLogoPreview(getImageUrl(cData.logo));
            }

            // Load User
            const uData = userRes.data?.data || {};
            const uPhones = Array.isArray(uData.phones) && uData.phones.length > 0
                ? uData.phones
                : (uData.phone ? [uData.phone] : ['']);
            setProfileData({
                name: uData.name || '',
                nameAr: uData.nameAr || '',
                email: uData.email || '',
                phone: uData.phone || uPhones[0] || '',
                phones: uPhones,
                company: uData.company || '',
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            if (uData.profilePicture) {
                setProfilePreview(getImageUrl(uData.profilePicture));
            }

        } catch (err) {
            console.error(err);
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: err.response?.data?.message || 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: isAr ? 'يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)' : 'Please select a valid image file (PNG, JPG, WebP).'
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: isAr ? 'حجم الصورة يجب ألا يتجاوز 5 ميجابايت' : 'Image size must not exceed 5MB.'
            });
            return;
        }

        setLogo(file);
        setLogoPreview(URL.createObjectURL(file));
        setUploadingLogo(true);

        try {
            const data = new FormData();
            data.append('logo', file);
            if (companyData.name) data.append('name', companyData.name);
            if (companyData.address) data.append('address', companyData.address);
            const cleanPhones = (companyData.phones || []).map(p => (p || '').trim()).filter(Boolean);
            const primaryPhone = cleanPhones[0] || companyData.phone || '';
            if (primaryPhone) data.append('phone', primaryPhone);
            if (cleanPhones.length > 0) data.append('phones', JSON.stringify(cleanPhones));
            if (companyData.email) data.append('email', companyData.email);

            const res = await tenantAPI.updateSettings(data);
            const savedLogo = res.data?.data?.logo;
            if (savedLogo) {
                setLogoPreview(getImageUrl(savedLogo));
            }

            const me = await authAPI.getMe();
            updateUser(me.data.data);

            showAlert({
                type: 'success',
                title: isAr ? 'تم حفظ الشعار' : 'Logo Updated',
                message: isAr ? 'تم رفع وحفظ شعار الشركة بنجاح وتطبيقه في أعلى النظام.' : 'Company logo uploaded and saved successfully across the system.'
            });
        } catch (err) {
            console.error('Failed to auto-upload logo:', err);
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: err.response?.data?.message || (isAr ? 'فشل رفع الشعار' : 'Failed to upload company logo')
            });
        } finally {
            setUploadingLogo(false);
            e.target.value = '';
        }
    };

    const handleProfileImgChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: isAr ? 'يرجى اختيار ملف صورة صالح' : 'Please select a valid image file.'
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: isAr ? 'حجم الصورة يجب ألا يتجاوز 5 ميجابايت' : 'Image size must not exceed 5MB.'
            });
            return;
        }

        setProfileImg(file);
        setProfilePreview(URL.createObjectURL(file));
        setUploadingProfileImg(true);

        try {
            const data = new FormData();
            data.append('profilePicture', file);
            if (profileData.name) data.append('name', profileData.name);
            if (profileData.email) data.append('email', profileData.email);
            const cleanUserPhones = (profileData.phones || []).map(p => (p || '').trim()).filter(Boolean);
            const primaryUserPhone = cleanUserPhones[0] || profileData.phone || '';
            if (primaryUserPhone) data.append('phone', primaryUserPhone);
            if (cleanUserPhones.length > 0) data.append('phones', JSON.stringify(cleanUserPhones));
            if (profileData.company) data.append('company', profileData.company);

            const res = await authAPI.updateProfile(data);
            const updatedUser = res.data?.data;
            if (updatedUser) {
                updateUser(updatedUser);
                if (updatedUser.profilePicture) {
                    setProfilePreview(getImageUrl(updatedUser.profilePicture));
                }
            }

            showAlert({
                type: 'success',
                title: isAr ? 'تم تحديث الصورة الشخصية' : 'Profile Picture Updated',
                message: isAr ? 'تم حفظ وتطبيق صورتك الشخصية بنجاح.' : 'Profile picture uploaded and saved successfully.'
            });
        } catch (err) {
            console.error('Failed to auto-upload profile picture:', err);
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: err.response?.data?.message || (isAr ? 'فشل رفع الصورة' : 'Failed to upload profile picture')
            });
        } finally {
            setUploadingProfileImg(false);
            e.target.value = '';
        }
    };

    // Save Company Settings
    const handleCompanySubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const data = new FormData();
            data.append('name', companyData.name);
            data.append('address', companyData.address);
            const cleanPhones = (companyData.phones || []).map(p => (p || '').trim()).filter(Boolean);
            const primaryPhone = cleanPhones[0] || companyData.phone || '';
            data.append('phone', primaryPhone);
            data.append('phones', JSON.stringify(cleanPhones));
            data.append('email', companyData.email);
            if (logo) data.append('logo', logo);

            await tenantAPI.updateSettings(data);
            showAlert({ 
                type: 'success', 
                title: isAr ? 'تم الحفظ' : 'Saved Successfully', 
                message: isAr ? 'تم تحديث إعدادات مساحة العمل بنجاح' : 'Company workspace settings updated successfully.' 
            });
            const me = await authAPI.getMe();
            updateUser(me.data.data);
            setLogo(null);
        } catch (err) {
            showAlert({ 
                type: 'error', 
                title: t('common.error', 'Error'), 
                message: err.response?.data?.message || (isAr ? 'فشل حفظ الإعدادات' : 'Failed to update company settings') 
            });
        } finally {
            setSaving(false);
        }
    };

    // Save Profile Settings
    const handleProfileSubmit = async (e) => {
        e.preventDefault();

        if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
            showAlert({
                type: 'error',
                title: isAr ? 'خطأ في كلمة المرور' : 'Password Mismatch',
                message: isAr ? 'كلمة المرور الجديدة غير متطابقة مع التأكيد.' : 'New password does not match confirmation.'
            });
            return;
        }

        setSaving(true);

        try {
            const data = new FormData();
            data.append('name', profileData.name);
            data.append('nameAr', profileData.nameAr || '');
            data.append('email', profileData.email);
            const cleanUserPhones = (profileData.phones || []).map(p => (p || '').trim()).filter(Boolean);
            const primaryUserPhone = cleanUserPhones[0] || profileData.phone || '';
            data.append('phone', primaryUserPhone);
            data.append('phones', JSON.stringify(cleanUserPhones));
            data.append('company', profileData.company || '');

            if (profileData.currentPassword && profileData.newPassword) {
                data.append('currentPassword', profileData.currentPassword);
                data.append('newPassword', profileData.newPassword);
            }

            if (profileImg) data.append('profilePicture', profileImg);

            const res = await authAPI.updateProfile(data);
            showAlert({ 
                type: 'success', 
                title: isAr ? 'تم التحديث' : 'Profile Updated', 
                message: isAr ? 'تم حفظ بيانات الملف الشخصي بنجاح' : 'Your personal profile has been updated.' 
            });
            updateUser(res.data.data);
            setProfileData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        } catch (err) {
            showAlert({ 
                type: 'error', 
                title: t('common.error', 'Error'), 
                message: err.response?.data?.message || (isAr ? 'فشل تحديث الملف الشخصي' : 'Failed to update profile') 
            });
        } finally {
            setSaving(false);
        }
    };

    // Delete Company Handler
    const handleConfirmDeleteCompany = async (e) => {
        e.preventDefault();
        if (deleteCompanyConfirmName.trim().toLowerCase() !== companyData.name.trim().toLowerCase()) {
            showAlert({
                type: 'error',
                title: isAr ? 'خطأ في التأكيد' : 'Confirmation Error',
                message: isAr
                    ? 'اسم الشركة المدخل غير متطابق مع اسم الشركة الفعلي.'
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
            setShowDeleteCompanyModal(false);
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

    // Delete Personal Account Handler
    const handleConfirmDeleteAccount = async (e) => {
        e.preventDefault();
        setDeletingAccount(true);
        try {
            await authAPI.deleteAccount({
                password: deleteAccountPassword
            });
            setShowDeleteAccountModal(false);
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

    const isCompanyAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    return (
        <Layout>
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px 0 48px 0' }}>
                {/* Page Header */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                    gap: '16px'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: 'rgba(59, 130, 246, 0.12)',
                                color: '#3b82f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Building2 size={22} />
                            </div>
                            <div>
                                <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                    {isAr ? 'إعدادات مساحة العمل' : 'Workspace & Settings'}
                                </h1>
                                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    {isAr ? 'إدارة بيانات الشركة، الهوية البصرية، والملف الشخصي' : 'Manage your organization profile, branding identity, and personal credentials.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tab Navigation Pill */}
                    <div style={{
                        display: 'flex',
                        background: 'var(--bg-tertiary)',
                        padding: '4px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        gap: '4px'
                    }}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('company')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeTab === 'company' ? 'var(--color-primary)' : 'transparent',
                                color: activeTab === 'company' ? '#ffffff' : 'var(--text-secondary)',
                                fontWeight: activeTab === 'company' ? 600 : 500,
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Building2 size={16} />
                            {isAr ? 'بيانات الشركة' : 'Company Details'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('profile')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeTab === 'profile' ? 'var(--color-primary)' : 'transparent',
                                color: activeTab === 'profile' ? '#ffffff' : 'var(--text-secondary)',
                                fontWeight: activeTab === 'profile' ? 600 : 500,
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <UserCircle size={16} />
                            {isAr ? 'الملف الشخصي' : 'User Profile'}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        padding: '60px', 
                        color: 'var(--text-secondary)',
                        gap: '12px'
                    }}>
                        <RefreshCw size={24} className="animate-spin" />
                        <span>{t('common.loading', 'Loading...')}</span>
                    </div>
                ) : (
                    <>
                        {/* =================== TAB 1: COMPANY SETTINGS =================== */}
                        {activeTab === 'company' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div className="card" style={{
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border-color)',
                                    padding: '24px',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
                                }}>
                                    <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 20px 0', color: 'var(--text-primary)' }}>
                                        {isAr ? 'الهوية والبيانات الأساسية' : 'Organization Branding & Contact'}
                                    </h2>

                                    <form onSubmit={handleCompanySubmit}>
                                        {/* Logo Branding Box */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '24px',
                                            padding: '20px',
                                            borderRadius: '12px',
                                            background: 'var(--bg-tertiary)',
                                            border: '1px dashed var(--border-color)',
                                            marginBottom: '24px',
                                            flexWrap: 'wrap'
                                        }}>
                                            <div style={{
                                                width: '90px',
                                                height: '90px',
                                                borderRadius: '16px',
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                {logoPreview ? (
                                                    <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                ) : (
                                                    <Building2 size={36} color="var(--text-secondary)" />
                                                )}
                                            </div>

                                            <div style={{ flex: 1, minWidth: '220px' }}>
                                                <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {isAr ? 'شعار الشركة' : 'Company Logo'}
                                                </h3>
                                                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    {isAr ? 'يظهر في أعلى النظام، التقارير المطبوعة، وفواتير العملاء. يفضل صيغة PNG بدقة عالية.' : 'Appears across the top header, generated PDF reports, and customer invoices.'}
                                                </p>
                                                <label
                                                    className="btn btn-secondary btn-sm"
                                                    style={{
                                                        cursor: uploadingLogo ? 'not-allowed' : 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        opacity: uploadingLogo ? 0.7 : 1
                                                    }}
                                                >
                                                    {uploadingLogo ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                                                    {uploadingLogo ? (isAr ? 'جاري الرفع...' : 'Uploading...') : (isAr ? 'رفع شعار جديد' : 'Upload New Logo')}
                                                    <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploadingLogo} style={{ display: 'none' }} />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Company Fields Grid */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                            gap: '18px',
                                            marginBottom: '24px'
                                        }}>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-primary)' }}>
                                                    {isAr ? 'اسم الشركة / المؤسسة' : 'Company Name'} <span style={{ color: '#ef4444' }}>*</span>
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={companyData.name}
                                                        onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                                                        placeholder="e.g. Nile Sky Engineering"
                                                        required
                                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-primary)' }}>
                                                    {isAr ? 'البريد الإلكتروني للعمل' : 'Business Email'}
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="email"
                                                        className="form-control"
                                                        value={companyData.email}
                                                        onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                                                        placeholder="support@company.com"
                                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <MultiPhoneInput
                                                    phones={companyData.phones}
                                                    onChange={(newPhones) => {
                                                        setCompanyData(prev => ({
                                                            ...prev,
                                                            phones: newPhones,
                                                            phone: newPhones[0] || ''
                                                        }));
                                                    }}
                                                    label={isAr ? 'أرقام الهاتف الرسمية للشركة' : 'Official Company Phone Numbers'}
                                                    placeholder={isAr ? 'مثال: +20 100 000 0000' : 'e.g. +20 100 000 0000'}
                                                    maxPhones={5}
                                                />
                                            </div>

                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-primary)' }}>
                                                    {isAr ? 'العنوان / المقر الرئيسي' : 'Office Address'}
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={companyData.address}
                                                        onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                                                        placeholder="Cairo, Egypt"
                                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={saving}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '14px', borderRadius: '8px' }}
                                            >
                                                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                                {saving ? t('common.loading', 'Saving...') : (isAr ? 'حفظ إعدادات الشركة' : 'Save Company Details')}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Danger Zone: Delete Entire Workspace */}
                                {isCompanyAdmin && (
                                    <div style={{
                                        background: 'rgba(239, 68, 68, 0.05)',
                                        border: '1px solid rgba(239, 68, 68, 0.25)',
                                        borderRadius: '16px',
                                        padding: '24px'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'space-between',
                                            gap: '16px',
                                            flexWrap: 'wrap'
                                        }}>
                                            <div style={{ maxWidth: '600px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 700, fontSize: '15px' }}>
                                                    <ShieldAlert size={20} />
                                                    <span>{isAr ? 'منطقة الخطر: حذف مساحة العمل بالكامل' : 'Danger Zone: Delete Workspace'}</span>
                                                </div>
                                                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                                    {isAr
                                                        ? 'حذف مساحة العمل يؤدي إلى مسح دائم وشامل لجميع المشاريع، الحركات المالية، الفواتير، التقارير اليومية، وحسابات فريق العمل. لا يمكن التراجع عن هذا الإجراء.'
                                                        : 'Deleting the workspace permanently wipes all projects, financial ledgers, invoices, daily reports, and member accounts. This action cannot be reversed.'}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDeleteCompanyConfirmName('');
                                                    setDeleteCompanyPassword('');
                                                    setShowDeleteCompanyModal(true);
                                                }}
                                                style={{
                                                    background: '#dc2626',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    padding: '10px 18px',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    boxShadow: '0 2px 10px rgba(220, 38, 38, 0.3)'
                                                }}
                                            >
                                                <Trash2 size={16} />
                                                {isAr ? 'حذف مساحة العمل' : 'Delete Entire Workspace'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* =================== TAB 2: PROFILE SETTINGS =================== */}
                        {activeTab === 'profile' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div className="card" style={{
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border-color)',
                                    padding: '24px',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
                                }}>
                                    <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 20px 0', color: 'var(--text-primary)' }}>
                                        {isAr ? 'الملف الشخصي وكلمة المرور' : 'Personal Profile & Credentials'}
                                    </h2>

                                    <form onSubmit={handleProfileSubmit}>
                                        {/* Avatar Uploader */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '24px',
                                            padding: '20px',
                                            borderRadius: '12px',
                                            background: 'var(--bg-tertiary)',
                                            border: '1px dashed var(--border-color)',
                                            marginBottom: '24px',
                                            flexWrap: 'wrap'
                                        }}>
                                            <div style={{
                                                width: '80px',
                                                height: '80px',
                                                borderRadius: '50%',
                                                background: 'var(--bg-secondary)',
                                                border: '2px solid var(--border-color)',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                {profilePreview ? (
                                                    <img src={profilePreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <UserCircle size={48} color="var(--text-secondary)" />
                                                )}
                                            </div>

                                            <div style={{ flex: 1, minWidth: '220px' }}>
                                                <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {isAr ? 'الصورة الشخصية' : 'Profile Picture'}
                                                </h3>
                                                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    {isAr ? 'صورتك الرمزية المعروضة في المحادثات وسجل التدقيق.' : 'Your avatar shown across chat, assignments, and audit events.'}
                                                </p>
                                                <label
                                                    className="btn btn-secondary btn-sm"
                                                    style={{
                                                        cursor: uploadingProfileImg ? 'not-allowed' : 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        opacity: uploadingProfileImg ? 0.7 : 1
                                                    }}
                                                >
                                                    {uploadingProfileImg ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                                                    {uploadingProfileImg ? (isAr ? 'جاري الرفع...' : 'Uploading...') : (isAr ? 'تغيير الصورة' : 'Change Avatar')}
                                                    <input type="file" accept="image/*" onChange={handleProfileImgChange} disabled={uploadingProfileImg} style={{ display: 'none' }} />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Profile Fields Grid */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                            gap: '18px',
                                            marginBottom: '24px'
                                        }}>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-primary)' }}>
                                                    {isAr ? 'الاسم بالإنجليزية' : 'Full Name in English'} <span style={{ color: '#ef4444' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={profileData.name}
                                                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                                    required
                                                    placeholder="e.g. Hossam Hassan"
                                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                />
                                            </div>

                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-primary)' }}>
                                                    {isAr ? 'الاسم بالعربية' : 'Full Name in Arabic'}
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={profileData.nameAr}
                                                    onChange={(e) => setProfileData({ ...profileData, nameAr: e.target.value })}
                                                    placeholder="مثال: حسام حسن"
                                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                />
                                            </div>

                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-primary)' }}>
                                                    {isAr ? 'البريد الإلكتروني لتسجيل الدخول' : 'Login Email'} <span style={{ color: '#ef4444' }}>*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    className="form-control"
                                                    value={profileData.email}
                                                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                                    required
                                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                />
                                            </div>

                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <MultiPhoneInput
                                                    phones={profileData.phones}
                                                    onChange={(newPhones) => {
                                                        setProfileData(prev => ({
                                                            ...prev,
                                                            phones: newPhones,
                                                            phone: newPhones[0] || ''
                                                        }));
                                                    }}
                                                    label={isAr ? 'أرقام الهاتف الشخصية' : 'Personal Phone Numbers'}
                                                    placeholder={isAr ? 'مثال: +20 100 000 0000' : 'e.g. +20 100 000 0000'}
                                                    maxPhones={5}
                                                />
                                            </div>

                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-primary)' }}>
                                                    {isAr ? 'الدور الوظيفي' : 'Role & Permissions'}
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={user?.role || 'USER'}
                                                    disabled
                                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Optional Password Change Section */}
                                        <div style={{
                                            borderTop: '1px solid var(--border-color)',
                                            paddingTop: '20px',
                                            marginTop: '10px',
                                            marginBottom: '24px'
                                        }}>
                                            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Lock size={16} />
                                                {isAr ? 'تغيير كلمة المرور (اختياري)' : 'Change Password (Optional)'}
                                            </h3>

                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                                gap: '16px'
                                            }}>
                                                <div className="form-group" style={{ margin: 0 }}>
                                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                                        {isAr ? 'كلمة المرور الحالية' : 'Current Password'}
                                                    </label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type={showPasswords.current ? 'text' : 'password'}
                                                            className="form-control"
                                                            value={profileData.currentPassword}
                                                            onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                                                            style={{ width: '100%', padding: '8px 36px 8px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                                                            style={{ position: 'absolute', right: isAr ? 'auto' : '8px', left: isAr ? '8px' : 'auto', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                                        >
                                                            {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="form-group" style={{ margin: 0 }}>
                                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                                        {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                                                    </label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type={showPasswords.new ? 'text' : 'password'}
                                                            className="form-control"
                                                            value={profileData.newPassword}
                                                            onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                                                            style={{ width: '100%', padding: '8px 36px 8px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                                                            style={{ position: 'absolute', right: isAr ? 'auto' : '8px', left: isAr ? '8px' : 'auto', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                                        >
                                                            {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="form-group" style={{ margin: 0 }}>
                                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                                        {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                                                    </label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type={showPasswords.confirm ? 'text' : 'password'}
                                                            className="form-control"
                                                            value={profileData.confirmPassword}
                                                            onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                                                            style={{ width: '100%', padding: '8px 36px 8px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                                                            style={{ position: 'absolute', right: isAr ? 'auto' : '8px', left: isAr ? '8px' : 'auto', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                                        >
                                                            {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={saving}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '14px', borderRadius: '8px' }}
                                            >
                                                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                                {saving ? t('common.loading', 'Saving...') : (isAr ? 'حفظ الملف الشخصي' : 'Save Profile Changes')}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Danger Zone: Delete Personal Account */}
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.05)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    borderRadius: '16px',
                                    padding: '24px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: '16px',
                                        flexWrap: 'wrap'
                                    }}>
                                        <div style={{ maxWidth: '600px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 700, fontSize: '15px' }}>
                                                <AlertTriangle size={20} />
                                                <span>{isAr ? 'منطقة الخطر: حذف الحساب الشخصي' : 'Danger Zone: Delete Account'}</span>
                                            </div>
                                            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                                {isAr
                                                    ? 'سيؤدي حذف حسابك إلى إلغاء صلاحيات الوصول وتسجيل الخروج الفوري. لا يمكن التراجع عن هذا الإجراء.'
                                                    : 'Permanently delete your user credentials and access tokens. This action is irreversible.'}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDeleteAccountPassword('');
                                                setShowDeleteAccountModal(true);
                                            }}
                                            style={{
                                                background: '#dc2626',
                                                color: '#ffffff',
                                                border: 'none',
                                                padding: '10px 18px',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                boxShadow: '0 2px 10px rgba(220, 38, 38, 0.3)'
                                            }}
                                        >
                                            <Trash2 size={16} />
                                            {isAr ? 'حذف حسابي' : 'Delete My Account'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* =================== MODAL: DELETE COMPANY =================== */}
                {showDeleteCompanyModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}>
                        <div style={{
                            background: 'var(--bg-secondary)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)',
                            width: '100%',
                            maxWidth: '460px',
                            padding: '24px',
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                                    <ShieldAlert size={22} />
                                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                                        {isAr ? 'تأكيد حذف مساحة العمل' : 'Confirm Workspace Deletion'}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowDeleteCompanyModal(false)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                                {isAr
                                    ? `أنت على وشك حذف مساحة العمل "${companyData.name}" بشكل نهائي وجميع ما تحتويه. للمتابعة، اكتب اسم الشركة وكلمة المرور الخاصة بك.`
                                    : `You are about to permanently delete "${companyData.name}" and all related data. Enter the company name and your admin password to proceed.`}
                            </p>

                            <form onSubmit={handleConfirmDeleteCompany} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                                        {isAr ? `اكتب اسم الشركة للتأكيد: "${companyData.name}"` : `Type company name to confirm: "${companyData.name}"`}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder={companyData.name}
                                        value={deleteCompanyConfirmName}
                                        onChange={(e) => setDeleteCompanyConfirmName(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid #ef4444', color: 'var(--text-primary)', fontSize: '13px' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                                        {isAr ? 'كلمة مرور المدير' : 'Admin Password'}
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={deleteCompanyPassword}
                                        onChange={(e) => setDeleteCompanyPassword(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteCompanyModal(false)}
                                        className="btn btn-secondary"
                                        disabled={deletingCompany}
                                        style={{ padding: '8px 16px', fontSize: '13px' }}
                                    >
                                        {t('common.cancel', 'Cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={deletingCompany || !deleteCompanyPassword || !deleteCompanyConfirmName}
                                        style={{
                                            background: '#dc2626',
                                            color: '#ffffff',
                                            border: 'none',
                                            padding: '8px 18px',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        {deletingCompany ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        {deletingCompany ? t('common.loading', 'Deleting...') : (isAr ? 'تأكيد الحذف النهائي' : 'Permanently Delete')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* =================== MODAL: DELETE ACCOUNT =================== */}
                {showDeleteAccountModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}>
                        <div style={{
                            background: 'var(--bg-secondary)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)',
                            width: '100%',
                            maxWidth: '440px',
                            padding: '24px',
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                                    <AlertTriangle size={22} />
                                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                                        {isAr ? 'تأكيد حذف الحساب' : 'Confirm Account Deletion'}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowDeleteAccountModal(false)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                                {isAr
                                    ? 'يرجى إدخال كلمة المرور لتأكيد رغبتك في حذف حسابك الشخصي.'
                                    : 'Please enter your password to confirm that you want to delete your personal account.'}
                            </p>

                            <form onSubmit={handleConfirmDeleteAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                                        {isAr ? 'كلمة المرور' : 'Password'}
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={deleteAccountPassword}
                                        onChange={(e) => setDeleteAccountPassword(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteAccountModal(false)}
                                        className="btn btn-secondary"
                                        disabled={deletingAccount}
                                        style={{ padding: '8px 16px', fontSize: '13px' }}
                                    >
                                        {t('common.cancel', 'Cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={deletingAccount || !deleteAccountPassword}
                                        style={{
                                            background: '#dc2626',
                                            color: '#ffffff',
                                            border: 'none',
                                            padding: '8px 18px',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        {deletingAccount ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        {deletingAccount ? t('common.loading', 'Deleting...') : (isAr ? 'حذف الحساب' : 'Delete Account')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
