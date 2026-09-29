import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Users, UserPlus, Trash2, Edit2, Search, X, Eye, EyeOff, 
    Mail, Phone, Copy, Check, Send, Link as LinkIcon, Sparkles, 
    Clock, CheckCircle2, RefreshCw, AlertTriangle, Wallet
} from 'lucide-react';
import { userAPI, rolesAPI } from '../services/api';
import { useFormat } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import CustomAlert from '../components/CustomAlert';
import MultiPhoneInput from '../components/MultiPhoneInput';
import '../components/Modal.css';

export default function TeamManagement() {
    const { t, i18n } = useTranslation();
    const { user: currentUser } = useAuth();
    const { currency: fmtCurrency } = useFormat();
    const isRTL = i18n.language === 'ar';

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '', email: '', roleId: '', role: 'ENGINEER', password: '', phone: '', phones: [''], permissions: {}
    });
    const [showPassword, setShowPassword] = useState(false);

    // Invite Success Modal State
    const [inviteSuccessModal, setInviteSuccessModal] = useState({
        isOpen: false,
        inviteToken: '',
        inviteLink: '',
        email: '',
        role: ''
    });
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [resendingId, setResendingId] = useState(null);

    // Alert State
    const [alertConfig, setAlertConfig] = useState({
        isOpen: false, type: 'info', title: '', message: '', onConfirm: () => { }, showCancel: false
    });

    useEffect(() => {
        loadData();
    }, []);

    const showAlert = (config) => {
        setAlertConfig({
            isOpen: true,
            confirmText: isRTL ? 'حسناً' : 'OK',
            cancelText: isRTL ? 'إلغاء' : 'Cancel',
            onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false })),
            ...config
        });
    };

    const closeAlert = () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
    };

    const loadData = async () => {
        try {
            const [usersRes, rolesRes] = await Promise.all([
                userAPI.getAll(),
                rolesAPI.getAll().catch(() => ({ data: { data: [] } }))
            ]);
            setUsers(usersRes.data.data || []);
            setRoles(rolesRes.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => setSearchTerm(e.target.value);

    const filteredUsers = users.filter(u =>
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Detailed RBAC Permission Structure (matching backend)
    const PERMISSION_CATEGORIES = {
        financials: {
            label: isRTL ? 'الإدارة المالية والأرباح' : 'Financials & Margins',
            permissions: [
                { key: 'view_operational_fund', label: isRTL ? 'عرض صندوق التشغيل' : 'View Operational Fund' },
                { key: 'view_office_profit', label: isRTL ? 'عرض أرباح المكتب' : 'View Office Profit', sensitive: true },
                { key: 'view_all_wallets', label: isRTL ? 'عرض محافظ العهد' : 'View Custody Wallets' },
                { key: 'view_company_stats', label: isRTL ? 'عرض إحصائيات الشركة' : 'View Company Analytics' }
            ]
        },
        custody: {
            label: isRTL ? 'العهد والتحويلات' : 'Custody & Transfers',
            permissions: [
                { key: 'request_funds', label: isRTL ? 'طلب عهدة نقدية' : 'Request Custody Funds' },
                { key: 'authorize_transfers', label: isRTL ? 'اعتماد وصرف التحويلات' : 'Authorize Transfers' },
                { key: 'approve_receipts', label: isRTL ? 'اعتماد إيصالات التصفية' : 'Approve Clearance Receipts' }
            ]
        },
        transactions: {
            label: isRTL ? 'المصروفات والإيرادات' : 'Transactions & Incomes',
            permissions: [
                { key: 'create', label: isRTL ? 'تسجيل مصروف' : 'Create Transaction' },
                { key: 'approve', label: isRTL ? 'اعتماد المصروفات' : 'Approve Transactions' },
                { key: 'record_income', label: isRTL ? 'تسجيل إيراد وارد' : 'Record Inflow' }
            ]
        },
        projects: {
            label: isRTL ? 'المشاريع والعقود' : 'Projects & Contracts',
            permissions: [
                { key: 'create', label: isRTL ? 'إنشاء مشروع جديد' : 'Create Project' },
                { key: 'edit', label: isRTL ? 'تعديل المشروع' : 'Edit Project' },
                { key: 'delete', label: isRTL ? 'حذف المشروع' : 'Delete Project' },
                { key: 'view', label: isRTL ? 'عرض المشاريع' : 'View Projects' },
                { key: 'edit_budget', label: isRTL ? 'تعديل الميزانية' : 'Edit Budget' }
            ]
        },
        inventory: {
            label: isRTL ? 'المخزن والمواد' : 'Inventory & Materials',
            permissions: [
                { key: 'create_batch', label: isRTL ? 'توريد مواد جديدة' : 'Create Batch' },
                { key: 'consume_material', label: isRTL ? 'صرف مواد للموقع' : 'Consume Material' },
                { key: 'view', label: isRTL ? 'عرض المخزون' : 'View Inventory' }
            ]
        },
        admin: {
            label: isRTL ? 'إدارة الفريق والأعضاء' : 'Team & Permissions Admin',
            permissions: [
                { key: 'manage_users', label: isRTL ? 'إدارة بيانات المستخدمين' : 'Manage Users' },
                { key: 'manage_roles', label: isRTL ? 'إنشاء وتعديل الأدوار' : 'Manage Roles' },
                { key: 'invite_users', label: isRTL ? 'دعوة أعضاء جدد' : 'Invite Users' },
                { key: 'change_user_roles', label: isRTL ? 'تغيير صلاحيات الفريق' : 'Change User Roles' }
            ]
        }
    };

    // Default permissions for legacy roles (structured format)
    const ROLE_DEFAULTS = {
        'SUPER_ADMIN': {
            financials: { view_operational_fund: true, view_office_profit: true, view_all_wallets: true, view_company_stats: true },
            custody: { request_funds: true, authorize_transfers: true, approve_receipts: true },
            transactions: { create: true, approve: true, record_income: true },
            projects: { create: true, edit: true, delete: true, view: true, edit_budget: true },
            inventory: { create_batch: true, consume_material: true, view: true },
            admin: { manage_users: true, manage_roles: true, invite_users: true, change_user_roles: true }
        },
        'ADMIN': {
            financials: { view_operational_fund: true, view_office_profit: true, view_all_wallets: true, view_company_stats: true },
            custody: { request_funds: true, authorize_transfers: true, approve_receipts: true },
            transactions: { create: true, approve: true, record_income: true },
            projects: { create: true, edit: true, delete: true, view: true, edit_budget: true },
            inventory: { create_batch: true, consume_material: true, view: true },
            admin: { manage_users: true, manage_roles: true, invite_users: true, change_user_roles: true }
        },
        'PROJECT_MANAGER': {
            financials: { view_operational_fund: true, view_office_profit: false, view_all_wallets: true, view_company_stats: true },
            custody: { request_funds: false, authorize_transfers: false, approve_receipts: true },
            transactions: { create: true, approve: true, record_income: false },
            projects: { create: false, edit: true, delete: false, view: true, edit_budget: false },
            inventory: { create_batch: true, consume_material: true, view: true },
            admin: { manage_users: false, manage_roles: false, invite_users: false, change_user_roles: false }
        },
        'ENGINEER': {
            financials: { view_operational_fund: true, view_office_profit: false, view_all_wallets: false, view_company_stats: false },
            custody: { request_funds: true, authorize_transfers: false, approve_receipts: false },
            transactions: { create: true, approve: false, record_income: false },
            projects: { create: false, edit: false, delete: false, view: true, edit_budget: false },
            inventory: { create_batch: true, consume_material: true, view: true },
            admin: { manage_users: false, manage_roles: false, invite_users: false, change_user_roles: false }
        },
        'ACCOUNTANT': {
            financials: { view_operational_fund: true, view_office_profit: true, view_all_wallets: true, view_company_stats: true },
            custody: { request_funds: false, authorize_transfers: true, approve_receipts: false },
            transactions: { create: true, approve: false, record_income: true },
            projects: { create: false, edit: false, delete: false, view: true, edit_budget: false },
            inventory: { create_batch: false, consume_material: false, view: true },
            admin: { manage_users: false, manage_roles: false, invite_users: false, change_user_roles: false }
        }
    };

    const handleOpenModal = (mode, user = null) => {
        setShowPassword(false);
        setModalMode(mode);
        setSelectedUser(user);
        if (mode === 'edit' && user) {
            const userPhones = Array.isArray(user.phones) && user.phones.length > 0
                ? user.phones
                : (user.phone ? [user.phone] : ['']);
            setFormData({
                name: user.name || '',
                email: user.email || '',
                role: user.role || 'ENGINEER',
                roleId: user.roleId || '',
                phone: user.phone || userPhones[0] || '',
                phones: userPhones,
                password: '',
                permissions: user.permissions || ROLE_DEFAULTS[user.role] || ROLE_DEFAULTS['ENGINEER']
            });
        } else {
            setFormData({
                name: '',
                email: '',
                role: 'ENGINEER',
                roleId: '',
                password: '',
                phone: '',
                phones: [''],
                permissions: ROLE_DEFAULTS['ENGINEER']
            });
        }
        setShowModal(true);
    };

    const handleRoleChange = (value) => {
        if (value.includes('-')) {
            // Custom role
            const customRole = roles.find(r => r.id === value);
            const rolePermissions = customRole?.permissions || ROLE_DEFAULTS['ENGINEER'];
            setFormData({ ...formData, roleId: value, role: 'ENGINEER', permissions: rolePermissions });
        } else {
            // Legacy role
            setFormData({ ...formData, role: value, roleId: '', permissions: ROLE_DEFAULTS[value] || ROLE_DEFAULTS['ENGINEER'] });
        }
    };

    const togglePermission = (category, permKey) => {
        setFormData(prev => {
            const current = prev.permissions || {};
            const categoryPerms = current[category] || {};

            return {
                ...prev,
                permissions: {
                    ...current,
                    [category]: {
                        ...categoryPerms,
                        [permKey]: !categoryPerms[permKey]
                    }
                }
            };
        });
    };

    const flattenPermissions = (matrix) => {
        if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) return [];
        const flat = [];
        for (const category of Object.keys(matrix)) {
            const inner = matrix[category];
            if (!inner || typeof inner !== 'object') continue;
            for (const key of Object.keys(inner)) {
                if (inner[key]) flat.push(`${category}.${key}`);
            }
        }
        return flat;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const cleanPhones = (formData.phones || []).map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);
            const submitData = {
                ...formData,
                phone: cleanPhones[0] || formData.phone?.trim() || undefined,
                phones: cleanPhones
            };
            submitData.permissions = flattenPermissions(submitData.permissions);

            if (!submitData.roleId) {
                delete submitData.roleId;
            }

            if (modalMode === 'add') {
                const response = await userAPI.invite(submitData);
                const result = response.data?.data || {};

                setShowModal(false);
                loadData();

                // Open Invitation Success Modal with code and link
                setInviteSuccessModal({
                    isOpen: true,
                    inviteToken: result.inviteToken || '',
                    inviteLink: result.inviteLink || `${window.location.origin}/signup?invite=${result.inviteToken}`,
                    email: result.email || submitData.email,
                    role: result.role || submitData.role
                });
            } else {
                if (!submitData.password) {
                    delete submitData.password;
                }
                await userAPI.update(selectedUser.id, submitData);
                showAlert({
                    type: 'success',
                    title: isRTL ? 'تم التحديث بنجاح' : 'Updated Successfully',
                    message: isRTL ? 'تم تحديث بيانات العضو وصلاحياته.' : 'Member data and permissions updated.'
                });
                setShowModal(false);
                loadData();
            }
        } catch (err) {
            const data = err.response?.data;
            const fieldErrors = Array.isArray(data?.errors) && data.errors.length
                ? data.errors.map(e => `${e.path}: ${e.message}`).join('\n')
                : null;
            showAlert({
                type: 'error',
                title: isRTL ? 'خطأ' : 'Error',
                message: fieldErrors || data?.message || (isRTL ? 'فشل تنفيذ العملية' : 'Operation failed')
            });
        }
    };

    const handleResendInvite = async (userId) => {
        setResendingId(userId);
        try {
            const res = await userAPI.resendInvite(userId);
            const data = res.data?.data;
            showAlert({
                type: 'success',
                title: isRTL ? 'تم إعادة إرسال الدعوة' : 'Invite Re-sent',
                message: isRTL 
                    ? `تم إرسال بريد التذكير ورابط الانضمام بنجاح.`
                    : `Invitation reminder email re-sent successfully.`
            });
            loadData();
        } catch (err) {
            showAlert({
                type: 'error',
                title: isRTL ? 'خطأ' : 'Error',
                message: err.response?.data?.message || (isRTL ? 'فشل إعادة إرسال الدعوة' : 'Failed to resend invite')
            });
        } finally {
            setResendingId(null);
        }
    };

    const handleCopyInviteLink = (code) => {
        const url = `${window.location.origin}/signup?invite=${code}`;
        navigator.clipboard.writeText(url);
        showAlert({
            type: 'success',
            title: isRTL ? 'تم النسخ' : 'Copied',
            message: isRTL ? 'تم نسخ رابط الدعوة إلى الحافظة بنجاح.' : 'Invite link copied to clipboard.'
        });
    };

    const handleDelete = (id, isPending = false) => {
        showAlert({
            type: 'danger',
            title: isPending ? (isRTL ? 'إلغاء الدعوة' : 'Revoke Invite') : (isRTL ? 'حذف العضو' : 'Remove Member'),
            message: isPending 
                ? (isRTL ? 'هل أنت متأكد من إلغاء دعوة هذا العضو؟ لن يتمكن من استخدام كود الانضمام.' : 'Are you sure you want to cancel this pending invitation?')
                : (isRTL ? 'هل أنت متأكد من حذف هذا العضو من فريق العمل؟' : 'Are you sure you want to remove this member from the team?'),
            showCancel: true,
            confirmText: isRTL ? 'تأكيد الحذف' : 'Confirm Remove',
            onConfirm: async () => {
                closeAlert();
                try {
                    await userAPI.delete(id);
                    loadData();
                } catch (err) {
                    setTimeout(() => {
                        showAlert({ type: 'error', title: isRTL ? 'خطأ' : 'Error', message: err.response?.data?.message || (isRTL ? 'فشل الحذف' : 'Failed to delete') });
                    }, 100);
                }
            }
        });
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            'SUPER_ADMIN': { bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
            'ADMIN': { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
            'PROJECT_MANAGER': { bg: 'rgba(249, 115, 22, 0.12)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' },
            'ENGINEER': { bg: 'rgba(16, 185, 129, 0.12)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
            'ACCOUNTANT': { bg: 'rgba(234, 179, 8, 0.12)', text: '#facc15', border: 'rgba(234, 179, 8, 0.3)' }
        };
        return colors[role] || colors['ENGINEER'];
    };

    const getInitials = (name) => {
        return name
            ?.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2) || 'U';
    };

    const getRoleDisplayName = (user) => {
        if (user.roleId && user.customRole) {
            return user.customRole.name;
        }
        const roleMap = {
            'SUPER_ADMIN': isRTL ? 'مدير عام النظام' : 'Super Admin',
            'ADMIN': isRTL ? 'مدير الشركة' : 'Company Admin',
            'PROJECT_MANAGER': isRTL ? 'مدير مشاريع' : 'Project Manager',
            'ENGINEER': isRTL ? 'مهندس موقع' : 'Site Engineer',
            'ACCOUNTANT': isRTL ? 'محاسب مالي' : 'Accountant'
        };
        return roleMap[user.role] || user.role;
    };

    return (
        <Layout>
            <div style={{ paddingBottom: '40px' }}>
                {/* Header */}
                <div className="flex-between mb-xl" style={{ flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 className="flex gap-md" style={{ alignItems: 'center', margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            <Users size={32} color="#3b82f6" />
                            <span>{isRTL ? 'إدارة الفريق والأعضاء' : 'Team & Staff Management'}</span>
                        </h1>
                        <p className="text-secondary" style={{ marginTop: '6px', fontSize: '0.9rem' }}>
                            {isRTL ? 'دعوة المهندسين والمحاسبين وتعيين الصلاحيات وتتبع حالة الانضمام للمساحة.' : 'Invite team members, assign custom roles, and track onboarding status.'}
                        </p>
                    </div>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => handleOpenModal('add')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontWeight: 700, borderRadius: '10px' }}
                    >
                        <UserPlus size={20} />
                        <span>{isRTL ? 'دعوة عضو جديد +' : 'Invite Member +'}</span>
                    </button>
                </div>

                {/* Content Card */}
                <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', overflow: 'hidden' }}>
                    {/* Search & Counter Bar */}
                    <div className="flex-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                            <Search size={18} style={{
                                position: 'absolute',
                                [isRTL ? 'right' : 'left']: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-tertiary)'
                            }} />
                            <input
                                type="text"
                                placeholder={isRTL ? 'البحث بالاسم أو البريد الإلكتروني...' : 'Search by name or email...'}
                                className="input"
                                style={{
                                    [isRTL ? 'paddingRight' : 'paddingLeft']: '42px',
                                    width: '100%',
                                    borderRadius: '10px'
                                }}
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>
                                {isRTL ? 'إجمالي الفريق:' : 'Total Members:'} <strong style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{filteredUsers.length}</strong>
                            </span>
                            <span style={{ color: 'var(--text-secondary)' }}>•</span>
                            <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                <Clock size={15} />
                                <span>{isRTL ? 'في انتظار الانضمام:' : 'Pending Invites:'} {filteredUsers.filter(u => !u.isVerified).length}</span>
                            </span>
                            <span style={{ color: 'var(--text-secondary)' }}>•</span>
                            <span style={{ color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                                <Wallet size={15} />
                                <span>
                                    {isRTL ? 'إجمالي عهد الفريق:' : 'Total Custodies:'}{' '}
                                    <strong style={{ color: '#8b5cf6' }}>{fmtCurrency(filteredUsers.reduce((sum, u) => sum + (Number(u.currentCustodyBalance) || 0), 0))}</strong>
                                </span>
                            </span>
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', direction: isRTL ? 'rtl' : 'ltr' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--text-secondary)', textAlign: 'start' }}>{isRTL ? 'العضو' : 'Member'}</th>
                                    <th style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--text-secondary)', textAlign: 'start' }}>{isRTL ? 'الدور الوظيفي' : 'Role'}</th>
                                    <th style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--text-secondary)', textAlign: 'start' }}>{isRTL ? 'رصيد العهدة' : 'Custody Balance'}</th>
                                    <th style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--text-secondary)', textAlign: 'start' }}>{isRTL ? 'حالة الانضمام' : 'Status'}</th>
                                    <th style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--text-secondary)', textAlign: 'start' }}>{isRTL ? 'بيانات التواصل' : 'Contact'}</th>
                                    <th style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--text-secondary)', textAlign: 'end' }}>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                            <RefreshCw size={24} className="spin-slow" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                                            <span>{isRTL ? 'جاري تحميل بيانات الفريق...' : 'Loading team members...'}</span>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length > 0 ? (
                                    filteredUsers.map(user => {
                                        const roleColor = getRoleBadgeColor(user.role);
                                        const isPending = !user.isVerified;

                                        return (
                                            <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                                                {/* Member Name / Email */}
                                                <td style={{ padding: '16px 20px', textAlign: 'start' }}>
                                                    <div className="flex gap-md" style={{ alignItems: 'center' }}>
                                                        <div style={{
                                                            width: '42px',
                                                            height: '42px',
                                                            borderRadius: '50%',
                                                            background: isPending 
                                                                ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                                                                : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: '#ffffff',
                                                            fontWeight: '800',
                                                            fontSize: '14px',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                                        }}>
                                                            {getInitials(user.name || user.email)}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                                                {user.name || user.email.split('@')[0]}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                                {user.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role */}
                                                <td style={{ padding: '16px 20px', textAlign: 'start' }}>
                                                    <span style={{
                                                        padding: '5px 12px',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        background: roleColor.bg,
                                                        color: roleColor.text,
                                                        border: `1px solid ${roleColor.border}`,
                                                        display: 'inline-block'
                                                    }}>
                                                        {getRoleDisplayName(user)}
                                                    </span>
                                                </td>

                                                {/* Custody Balance */}
                                                <td style={{ padding: '16px 20px', textAlign: 'start' }}>
                                                    {Number(user.currentCustodyBalance || 0) !== 0 ? (
                                                        <div style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '4px 12px',
                                                            borderRadius: '20px',
                                                            background: Number(user.currentCustodyBalance || 0) > 0 ? 'rgba(139, 92, 246, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                            border: `1px solid ${Number(user.currentCustodyBalance || 0) > 0 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                                            color: Number(user.currentCustodyBalance || 0) > 0 ? '#8b5cf6' : '#ef4444',
                                                            fontSize: '13px',
                                                            fontWeight: '800'
                                                        }}>
                                                            <Wallet size={14} />
                                                            <span>{fmtCurrency(user.currentCustodyBalance || 0)}</span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: '600' }}>
                                                            0 {isRTL ? 'ج.م' : 'EGP'}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Status: Active vs Pending Invite */}
                                                <td style={{ padding: '16px 20px', textAlign: 'start' }}>
                                                    {isPending ? (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontSize: '12px', fontWeight: '700' }}>
                                                            <Clock size={13} />
                                                            <span>{isRTL ? 'في انتظار الانضمام' : 'Pending Invite'}</span>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '12px', fontWeight: '700' }}>
                                                            <CheckCircle2 size={13} />
                                                            <span>{isRTL ? 'نشط' : 'Active'}</span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Contact */}
                                                <td style={{ padding: '16px 20px', textAlign: 'start' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div className="flex gap-sm" style={{ alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                            <Mail size={14} style={{ color: 'var(--text-tertiary)' }} />
                                                            <span>{user.email}</span>
                                                        </div>
                                                        {(() => {
                                                            const userPhones = (Array.isArray(user.phones) && user.phones.length > 0 ? user.phones : (user.phone ? [user.phone] : [])).filter(Boolean);
                                                            if (userPhones.length > 0) {
                                                                return (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                        {userPhones.map((p, pIdx) => (
                                                                            <div key={pIdx} className="flex gap-sm" style={{ alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                                                <Phone size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                                                                                <a href={`tel:${p}`} style={{ color: 'inherit', textDecoration: 'none' }}>{p}</a>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            }
                                                            return (
                                                                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                                    {isPending ? (isRTL ? 'سيتم إدخاله عند الانضمام' : 'Provided on joining') : '—'}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td style={{ padding: '16px 20px', textAlign: 'end' }}>
                                                    <div className="flex gap-sm" style={{ justifyContent: 'flex-end' }}>
                                                        {isPending ? (
                                                            <>
                                                                {/* Copy Invite Link */}
                                                                <button
                                                                    className="btn btn-sm"
                                                                    onClick={() => handleCopyInviteLink(user.verificationCode)}
                                                                    title={isRTL ? 'نسخ رابط الدعوة' : 'Copy Invite Link'}
                                                                    style={{ padding: '8px 12px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                                                                >
                                                                    <LinkIcon size={14} />
                                                                    <span style={{ marginInlineStart: 4, fontSize: '12px', fontWeight: 600 }}>{isRTL ? 'نسخ الرابط' : 'Copy Link'}</span>
                                                                </button>

                                                                {/* Resend Email */}
                                                                <button
                                                                    className="btn btn-sm"
                                                                    onClick={() => handleResendInvite(user.id)}
                                                                    disabled={resendingId === user.id}
                                                                    title={isRTL ? 'إعادة إرسال بريد الدعوة' : 'Resend Invite Email'}
                                                                    style={{ padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                                                                >
                                                                    <Send size={14} />
                                                                    <span style={{ marginInlineStart: 4, fontSize: '12px', fontWeight: 600 }}>
                                                                        {resendingId === user.id ? (isRTL ? 'جاري الإرسال...' : 'Sending...') : (isRTL ? 'إعادة الإرسال' : 'Resend')}
                                                                    </span>
                                                                </button>

                                                                {/* Revoke Invite */}
                                                                <button
                                                                    className="btn btn-sm btn-danger"
                                                                    onClick={() => handleDelete(user.id, true)}
                                                                    title={isRTL ? 'إلغاء الدعوة' : 'Revoke Invite'}
                                                                    style={{ padding: '8px' }}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {/* Edit verified user */}
                                                                <button
                                                                    className="btn btn-sm"
                                                                    onClick={() => handleOpenModal('edit', user)}
                                                                    style={{ padding: '8px' }}
                                                                    title={isRTL ? 'تعديل الصلاحيات' : 'Edit Permissions'}
                                                                >
                                                                    <Edit2 size={15} />
                                                                </button>
                                                                {/* Remove verified user */}
                                                                <button
                                                                    className="btn btn-sm btn-danger"
                                                                    onClick={() => handleDelete(user.id, false)}
                                                                    style={{ padding: '8px' }}
                                                                    disabled={user.id === currentUser?.id}
                                                                    title={isRTL ? 'حذف العضو' : 'Remove Member'}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                            <Users size={36} style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.4 }} />
                                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{isRTL ? 'لا يوجد أعضاء مطابقين للبحث' : 'No team members found'}</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL 1: Add (Invite) / Edit Member Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', borderRadius: '16px' }}>
                            <div className="modal-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <UserPlus size={22} color="#3b82f6" />
                                    <h2 style={{ margin: 0 }}>
                                        {modalMode === 'add' ? (isRTL ? 'دعوة عضو جديد إلى مساحة العمل' : 'Invite New Team Member') : (isRTL ? 'تعديل بيانات وصلاحيات العضو' : 'Edit Member Permissions')}
                                    </h2>
                                </div>
                                <button className="modal-close" onClick={() => setShowModal(false)}>
                                    <X size={22} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '24px' }}>
                                {/* Form Inputs Section */}
                                <div className="form-section">
                                    <h3 className="section-title">
                                        {modalMode === 'add' ? (isRTL ? '1. بيانات الدعوة والدور الوظيفي' : '1. Invitation Details & Role') : (isRTL ? 'البيانات الشخصية' : 'Personal Details')}
                                    </h3>
                                    <div className="form-grid">
                                        {/* Email Address */}
                                        <div className="form-group full-width">
                                            <label style={{ fontWeight: 700 }}>
                                                {isRTL ? 'البريد الإلكتروني للمدعو' : 'Invitee Email Address'} <span className="required" style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                                disabled={modalMode === 'edit'}
                                                placeholder="engineer@company.com"
                                                style={{ direction: 'ltr' }}
                                            />
                                            {modalMode === 'add' && (
                                                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                                                    {isRTL ? '📩 سيتم إرسال كود ورابط الانضمام فوراً إلى هذا البريد الإلكتروني.' : 'An invitation link & code will be sent to this email automatically.'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Name (Optional in Add Mode, required in Edit) */}
                                        <div className="form-group">
                                            <label style={{ fontWeight: 700 }}>
                                                {isRTL ? 'الاسم (اختياري)' : 'Member Name (Optional)'}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder={isRTL ? 'مثال: م. أحمد سامي' : 'e.g. Eng. Ahmed Sami'}
                                            />
                                        </div>

                                        {/* Role Selection */}
                                        <div className="form-group">
                                            <label style={{ fontWeight: 700 }}>
                                                {isRTL ? 'الدور الوظيفي والصلاحية' : 'Assigned Role'} <span className="required" style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <select
                                                value={formData.roleId || formData.role}
                                                onChange={(e) => handleRoleChange(e.target.value)}
                                                required
                                            >
                                                {/* System Roles */}
                                                <option value="ADMIN">{isRTL ? 'مدير شركة (Admin)' : 'Company Admin'}</option>
                                                <option value="PROJECT_MANAGER">{isRTL ? 'مدير مشاريع (Project Manager)' : 'Project Manager'}</option>
                                                <option value="ENGINEER">{isRTL ? 'مهندس موقع (Site Engineer)' : 'Site Engineer'}</option>
                                                <option value="ACCOUNTANT">{isRTL ? 'محاسب مالي (Accountant)' : 'Accountant'}</option>

                                                {/* Custom Roles */}
                                                {roles.length > 0 && roles.map(role => (
                                                    <option key={role.id} value={role.id}>
                                                        {role.name} ({isRTL ? 'دور مخصص' : 'Custom Role'})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Phone (Only when editing an active member) */}
                                        {modalMode === 'edit' && (
                                            <div className="form-group full-width">
                                                <MultiPhoneInput
                                                    phones={formData.phones || (formData.phone ? [formData.phone] : [''])}
                                                    onChange={(newPhones) => setFormData(prev => ({ ...prev, phones: newPhones, phone: newPhones[0] || '' }))}
                                                    label={isRTL ? 'أرقام الهاتف' : 'Phone Numbers'}
                                                />
                                            </div>
                                        )}

                                        {/* Password Field (Only when editing) */}
                                        {modalMode === 'edit' && (
                                            <div className="form-group full-width" style={{ position: 'relative' }}>
                                                <label style={{ fontWeight: 700 }}>
                                                    {isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'} <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>({isRTL ? 'اتركه فارغاً لعدم التغيير' : 'leave blank to keep current'})</span>
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type={showPassword ? 'text' : 'password'}
                                                        style={{ width: '100%', [isRTL ? 'paddingLeft' : 'paddingRight']: '40px' }}
                                                        value={formData.password}
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        style={{
                                                            position: 'absolute',
                                                            [isRTL ? 'left' : 'right']: '12px',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            color: 'var(--text-tertiary)'
                                                        }}
                                                    >
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Permissions Matrix */}
                                <div className="form-section">
                                    <div className="flex-between mb-md">
                                        <h3 className="section-title" style={{ border: 'none', margin: 0 }}>
                                            {isRTL ? '2. تخصيص مصفوفة الصلاحيات (RBAC)' : '2. Customize Permissions Matrix'}
                                        </h3>
                                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                            {isRTL ? 'تم ضبطها تلقائياً بناءً على الدور المختار' : 'Auto-configured based on selected role'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                        {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
                                            <div key={categoryKey} style={{
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '12px',
                                                padding: '16px'
                                            }}>
                                                <h4 style={{
                                                    fontSize: '13px',
                                                    color: '#3b82f6',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    margin: '0 0 12px 0',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}>
                                                    <span>{category.label}</span>
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {category.permissions.map(perm => {
                                                        const isChecked = formData.permissions?.[categoryKey]?.[perm.key] || false;
                                                        return (
                                                            <label key={perm.key} style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px',
                                                                cursor: 'pointer',
                                                                fontSize: '13px',
                                                                color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                                padding: '4px 6px',
                                                                borderRadius: '6px',
                                                                background: isChecked ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                                                transition: 'all 0.15s'
                                                            }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => togglePermission(categoryKey, perm.key)}
                                                                    style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                                                                />
                                                                <span>
                                                                    {perm.label}
                                                                    {perm.sensitive && (
                                                                        <span style={{
                                                                            marginInlineStart: '6px',
                                                                            color: '#ef4444',
                                                                            fontSize: '10px',
                                                                            fontWeight: 800,
                                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '4px'
                                                                        }}>
                                                                            {isRTL ? 'حساس' : 'Sensitive'}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="modal-footer" style={{ marginTop: '24px' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                        {isRTL ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ minWidth: '140px', fontWeight: 700 }}>
                                        {modalMode === 'add' ? (isRTL ? 'إرسال وتوليد الدعوة ➔' : 'Generate & Send Invite ➔') : (isRTL ? 'حفظ التعديلات' : 'Save Changes')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 2: Invitation Success Modal with Token & Shareable Link */}
                {inviteSuccessModal.isOpen && (
                    <div className="modal-overlay" onClick={() => setInviteSuccessModal({ isOpen: false, inviteToken: '', inviteLink: '', email: '', role: '' })}>
                        <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', borderRadius: '16px', textAlign: 'center', padding: '32px' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px auto'
                            }}>
                                <Sparkles size={32} />
                            </div>

                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                                {isRTL ? 'تم إنشاء وإرسال الدعوة بنجاح! 🎉' : 'Invitation Created & Sent! 🎉'}
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                                {isRTL 
                                    ? `تم إرسال بريد إلكتروني تلقائياً إلى ${inviteSuccessModal.email} يتضمن تفاصيل الانضمام. يمكنك أيضاً نسخ الكود أو الرابط المباشر ومشاركته معه:`
                                    : `An invitation email has been sent to ${inviteSuccessModal.email}. You can also copy and share the invitation code or link directly:`
                                }
                            </p>

                            {/* Invite Code Box */}
                            <div style={{
                                background: 'var(--bg-primary)',
                                border: '2px dashed rgba(59, 130, 246, 0.4)',
                                borderRadius: '12px',
                                padding: '18px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                                    <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                                        {isRTL ? 'كود الانضمام للمساحة' : 'Invite Code'}
                                    </span>
                                    <span style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace', color: '#ffffff', letterSpacing: '2px' }}>
                                        {inviteSuccessModal.inviteToken}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                        navigator.clipboard.writeText(inviteSuccessModal.inviteToken);
                                        setCopiedCode(true);
                                        setTimeout(() => setCopiedCode(false), 2000);
                                    }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                                >
                                    {copiedCode ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                                    <span>{copiedCode ? (isRTL ? 'تم النسخ' : 'Copied!') : (isRTL ? 'نسخ الكود' : 'Copy Code')}</span>
                                </button>
                            </div>

                            {/* Direct Link Box */}
                            <div style={{
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px'
                            }}>
                                <div style={{ textAlign: isRTL ? 'right' : 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, display: 'block' }}>
                                        {isRTL ? 'رابط الانضمام المباشر' : 'Direct Join Link'}
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#38bdf8', direction: 'ltr', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {inviteSuccessModal.inviteLink}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => {
                                        navigator.clipboard.writeText(inviteSuccessModal.inviteLink);
                                        setCopiedLink(true);
                                        setTimeout(() => setCopiedLink(false), 2000);
                                    }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, flexShrink: 0 }}
                                >
                                    {copiedLink ? <Check size={16} /> : <LinkIcon size={16} />}
                                    <span>{copiedLink ? (isRTL ? 'تم النسخ' : 'Copied!') : (isRTL ? 'نسخ الرابط' : 'Copy Link')}</span>
                                </button>
                            </div>

                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setInviteSuccessModal({ isOpen: false, inviteToken: '', inviteLink: '', email: '', role: '' })}
                                style={{ width: '100%', padding: '12px', fontWeight: 700, borderRadius: '10px' }}
                            >
                                {isRTL ? 'تم وإغلاق' : 'Done & Close'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Alert */}
                <CustomAlert {...alertConfig} onClose={closeAlert} />
            </div>
        </Layout>
    );
}
