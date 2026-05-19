import { useState, useEffect } from 'react';
import { tenantAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Building2, Save, Upload, AlertCircle, User, UserCircle } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { useTranslation } from 'react-i18next';

export default function CompanySettings() {
    const { user, updateUser } = useAuth();
    const { showAlert } = useAlert();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('company'); // 'company' or 'profile'

    // Feedback
    // Using showAlert instead of local state for consistency across project per user request

    // Company State
    const [companyData, setCompanyData] = useState({
        name: '', address: '', phone: '', email: ''
    });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    // Profile State
    const [profileData, setProfileData] = useState({
        name: '', email: '', phone: '', company: ''
    });
    const [profileImg, setProfileImg] = useState(null);
    const [profilePreview, setProfilePreview] = useState(null);

    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        if (path.startsWith('blob:')) return path; // For local preview
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        return `${apiUrl}${path}`;
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [companyRes, userRes] = await Promise.all([
                tenantAPI.getSettings(),
                authAPI.getMe()
            ]);

            // Load Company
            const cData = companyRes.data.data;
            setCompanyData({
                name: cData.name || '',
                address: cData.address || '',
                phone: cData.phone || '',
                email: cData.email || ''
            });
            if (cData.logo) {
                setLogoPreview(getImageUrl(cData.logo));
            }

            // Load User
            const uData = userRes.data.data;
            setProfileData({
                name: uData.name || '',
                email: uData.email || '',
                phone: uData.phone || '',
                company: uData.company || ''
            });
            if (uData.profilePicture) {
                setProfilePreview(getImageUrl(uData.profilePicture));
            }

        } catch (err) {
            console.error(err);
            showAlert({ type: 'error', title: t('common.error'), message: t('common.error') });
        } finally {
            setLoading(false);
        }
    };

    // File Handlers
    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogo(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleProfileImgChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImg(file);
            setProfilePreview(URL.createObjectURL(file));
        }
    };

    // Submit Handlers
    const handleCompanySubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const data = new FormData();
            data.append('name', companyData.name);
            data.append('address', companyData.address);
            data.append('phone', companyData.phone);
            data.append('email', companyData.email);
            if (logo) data.append('logo', logo);

            const res = await tenantAPI.updateSettings(data);
            showAlert({ type: 'success', title: t('common.save'), message: t('profile.updateSuccess') });
            // Refresh user context if needed to update sidebar logo
            const me = await authAPI.getMe();
            updateUser(me.data.data);
            // window.location.reload(); // Force reload to ensure sidebar updates if context sync issues
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error'), message: t('profile.updateError') });
        } finally {
            setSaving(false);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const data = new FormData();
            data.append('name', profileData.name);
            data.append('email', profileData.email);
            data.append('phone', profileData.phone);
            data.append('company', profileData.company);
            if (profileImg) data.append('profilePicture', profileImg);

            // Assuming we have an endpoint for profile update
            const res = await authAPI.updateProfile(data);

            showAlert({ type: 'success', title: t('common.save'), message: t('profile.updateSuccess') });
            updateUser(res.data.data);
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error'), message: t('profile.updateError') });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>{t('common.loading')}</div>;

    return (
        <div className="container mt-4">
            <div className="card glass">
                <div className="card-header border-b border-gray-100 pb-0">
                    <div className="flex gap-6">
                        <button
                            className={`pb-4 px-2 font-medium flex items-center gap-2 ${activeTab === 'company' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                            onClick={() => setActiveTab('company')}
                        >
                            <Building2 size={20} /> {t('profile.sections.basic') || 'بيانات الشركة'}
                        </button>
                        <button
                            className={`pb-4 px-2 font-medium flex items-center gap-2 ${activeTab === 'profile' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                            onClick={() => setActiveTab('profile')}
                        >
                            <UserCircle size={20} /> {t('profile.title') || 'الملف الشخصي'}
                        </button>
                    </div>
                </div>

                <div className="card-body mt-4">
                    {/* Feedback Messages handled by showAlert modal */}

                    {/* COMPANY TAB */}
                    {activeTab === 'company' && (
                        <form onSubmit={handleCompanySubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-gray-50/5">
                                <div className="w-32 h-32 mb-4 rounded-full overflow-hidden bg-gray-200 border flex items-center justify-center relative">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <Building2 size={48} className="text-gray-400" />
                                    )}
                                </div>
                                <label className="btn btn-secondary cursor-pointer flex items-center gap-2">
                                    <Upload size={16} /> {t('profile.uploadPicture') || 'رفع الشعار'}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                                </label>
                            </div>

                            <div className="input-group">
                                <label className="input-label">{t('profile.fields.company') || 'اسم الشركة'}</label>
                                <input type="text" className="input" value={companyData.name} onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })} required />
                            </div>
                            <div className="input-group">
                                <label className="input-label">{t('profile.fields.email') || 'البريد الإلكتروني'}</label>
                                <input type="email" className="input" value={companyData.email} onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">{t('profile.fields.phone') || 'الهاتف'}</label>
                                <input type="text" className="input" value={companyData.phone} onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">{t('auth.company') || 'العنوان'}</label>
                                <input type="text" className="input" value={companyData.address} onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })} />
                            </div>

                            <div className="col-span-2 flex justify-end">
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? t('common.loading') : <><Save size={18} className="mr-2" /> {t('common.save')}</>}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-gray-50/5">
                                <div className="w-32 h-32 mb-4 rounded-full overflow-hidden bg-gray-200 border flex items-center justify-center relative">
                                    {profilePreview ? (
                                        <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={48} className="text-gray-400" />
                                    )}
                                </div>
                                <label className="btn btn-secondary cursor-pointer flex items-center gap-2">
                                    <Upload size={16} /> {t('profile.uploadPicture')}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleProfileImgChange} />
                                </label>
                            </div>

                            <div className="input-group">
                                <label className="input-label">{t('profile.fields.name')}</label>
                                <input type="text" className="input" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} required />
                            </div>
                            <div className="input-group">
                                <label className="input-label">{t('profile.fields.email')}</label>
                                <input type="email" className="input" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} required />
                            </div>
                            <div className="input-group">
                                <label className="input-label">{t('profile.fields.phone')}</label>
                                <input type="text" className="input" value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} />
                            </div>

                            <div className="col-span-2 flex justify-end">
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? t('common.loading') : <><Save size={18} className="mr-2" /> {t('profile.saveChanges')}</>}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
