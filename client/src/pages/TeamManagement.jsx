import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, Trash2, Edit2, Search, X, Eye, EyeOff, Mail, Phone } from 'lucide-react';
import { userAPI, rolesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import CustomAlert from '../components/CustomAlert';
import '../components/Modal.css';

export default function TeamManagement() {
    const { t, i18n } = useTranslation();
    const { user: currentUser } = useAuth();
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
        name: '', email: '', roleId: '', role: 'ENGINEER', password: '', phone: '', permissions: {}
    });
    const [showPassword, setShowPassword] = useState(false);

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
            confirmText: t('common.confirm'),
            cancelText: t('common.cancel'),
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
                rolesAPI.getAll().catch(() => ({ data: { data: [] } })) // Fallback if roles not seeded
            ]);
            setUsers(usersRes.data.data);
            setRoles(rolesRes.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => setSearchTerm(e.target.value);

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Detailed RBAC Permission Structure (matching backend)
    const PERMISSION_CATEGORIES = {
        financials: {
            label: t('roles.permissions.financials.title'),
            permissions: [
                { key: 'view_operational_fund', label: t('roles.permissions.financials.view_operational_fund') },
                { key: 'view_office_profit', label: t('roles.permissions.financials.view_office_profit'), sensitive: true },
                { key: 'view_all_wallets', label: t('roles.permissions.financials.view_all_wallets') },
                { key: 'view_company_stats', label: t('roles.permissions.financials.view_company_stats') }
            ]
        },
        custody: {
            label: t('roles.permissions.custody.title'),
            permissions: [
                { key: 'request_funds', label: t('roles.permissions.custody.request_funds') },
                { key: 'authorize_transfers', label: t('roles.permissions.custody.authorize_transfers') },
                { key: 'approve_receipts', label: t('roles.permissions.custody.approve_receipts') }
            ]
        },
        transactions: {
            label: t('roles.permissions.transactions.title'),
            permissions: [
                { key: 'create', label: t('roles.permissions.transactions.create') },
                { key: 'approve', label: t('roles.permissions.transactions.approve') },
                { key: 'record_income', label: t('roles.permissions.transactions.record_income') }
            ]
        },
        projects: {
            label: t('roles.permissions.projects.title'),
            permissions: [
                { key: 'create', label: t('roles.permissions.projects.create') },
                { key: 'edit', label: t('roles.permissions.projects.edit') },
                { key: 'delete', label: t('roles.permissions.projects.delete') },
                { key: 'view', label: t('roles.permissions.projects.view') },
                { key: 'edit_budget', label: t('roles.permissions.projects.edit_budget') }
            ]
        },
        inventory: {
            label: t('roles.permissions.inventory.title'),
            permissions: [
                { key: 'create_batch', label: t('roles.permissions.inventory.create_batch') },
                { key: 'consume_material', label: t('roles.permissions.inventory.consume_material') },
                { key: 'view', label: t('roles.permissions.inventory.view') }
            ]
        },
        admin: {
            label: t('roles.permissions.admin.title'),
            permissions: [
                { key: 'manage_users', label: t('roles.permissions.admin.manage_users') },
                { key: 'manage_roles', label: t('roles.permissions.admin.manage_roles') },
                { key: 'invite_users', label: t('roles.permissions.admin.invite_users') },
                { key: 'change_user_roles', label: t('roles.permissions.admin.change_user_roles') }
            ]
        }
    };

    // Default permissions for legacy roles (structured format)
    const ROLE_DEFAULTS = {
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
            setFormData({
                name: user.name,
                email: user.email,
                role: user.role,
                roleId: user.roleId || '',
                phone: user.phone || '',
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
                permissions: ROLE_DEFAULTS['ENGINEER']
            });
        }
        setShowModal(true);
    };

    const handleRoleChange = (value) => {
        // Check if it's a custom role (UUID) or legacy role
        if (value.includes('-')) {
            // Custom role - find and load its permissions
            const customRole = roles.find(r => r.id === value);
            const rolePermissions = customRole?.permissions || ROLE_DEFAULTS['ENGINEER'];

            setFormData({ ...formData, roleId: value, role: 'ENGINEER', permissions: rolePermissions });
        } else {
            // Legacy role - load default permissions
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Prepare data for submission
            const submitData = { ...formData };

            // If roleId is empty, remove it (use legacy role)
            if (!submitData.roleId) {
                delete submitData.roleId;
            }

            if (modalMode === 'add') {
                await userAPI.invite(submitData);
                showAlert({
                    type: 'success',
                    title: t('teamManagement.messages.addSuccess'),
                    message: t('teamManagement.messages.addSuccess')
                });
            } else {
                // Don't send password if empty on edit
                if (!submitData.password) {
                    delete submitData.password;
                }
                await userAPI.update(selectedUser.id, submitData);
                showAlert({
                    type: 'success',
                    title: t('teamManagement.messages.updateSuccess'),
                    message: t('teamManagement.messages.updateSuccess')
                });
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error'),
                message: err.response?.data?.message || t('teamManagement.messages.error')
            });
        }
    };

    const handleDelete = (id) => {
        showAlert({
            type: 'danger',
            title: t('teamManagement.confirmDelete.title'),
            message: t('teamManagement.confirmDelete.message'),
            showCancel: true,
            confirmText: t('teamManagement.confirmDelete.confirm'),
            onConfirm: async () => {
                closeAlert();
                try {
                    await userAPI.delete(id);
                    loadData();
                } catch (err) {
                    setTimeout(() => {
                        showAlert({ type: 'error', title: t('common.error'), message: t('teamManagement.messages.error') });
                    }, 100);
                }
            }
        });
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            'SUPER_ADMIN': { bg: '#F3E5F5', text: '#7B1FA2' },
            'ADMIN': { bg: '#E3F2FD', text: '#1976D2' },
            'PROJECT_MANAGER': { bg: '#FFF3E0', text: '#E64A19' },
            'ENGINEER': { bg: '#E8F5E9', text: '#2E7D32' },
            'ACCOUNTANT': { bg: '#FAFAFA', text: '#616161' }
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
        // If user has custom role, show custom role name
        if (user.roleId && user.customRole) {
            return user.customRole.name;
        }
        // Otherwise show translated legacy role
        return t(`teamManagement.roles.${user.role}`);
    };

    return (
        <Layout>
            <div>
                {/* Header */}
                <div className="flex-between mb-xl">
                    <div>
                        <h1 className="flex gap-md" style={{ alignItems: 'center' }}>
                            <Users size={32} />
                            {t('teamManagement.title')}
                        </h1>
                        <p className="text-secondary">{t('teamManagement.subtitle')}</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => handleOpenModal('add')}>
                        <UserPlus size={20} /> {t('teamManagement.addMember')}
                    </button>
                </div>

                {/* Content Card */}
                <div className="card">
                    {/* Search Bar */}
                    <div className="flex-between mb-lg" style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-color)' }}>
                        <div className="input-group" style={{ maxWidth: '400px', margin: 0 }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <Search size={18} style={{
                                    position: 'absolute',
                                    [isRTL ? 'right' : 'left']: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-tertiary)'
                                }} />
                                <input
                                    type="text"
                                    placeholder={t('teamManagement.searchPlaceholder')}
                                    className="input"
                                    style={{
                                        [isRTL ? 'paddingRight' : 'paddingLeft']: '40px',
                                        width: '100%'
                                    }}
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                            </div>
                        </div>
                        <div className="text-secondary" style={{ fontSize: '14px' }}>
                            {t('teamManagement.totalMembers')}: <strong style={{ color: 'var(--text-primary)' }}>{filteredUsers.length}</strong>
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', direction: isRTL ? 'rtl' : 'ltr' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                                    <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'start' }}>{t('teamManagement.table.user')}</th>
                                    <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'start' }}>{t('teamManagement.table.role')}</th>
                                    <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'start' }}>{t('teamManagement.table.contact')}</th>
                                    <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'end' }}>{t('teamManagement.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center' }}>{t('teamManagement.loading')}</td></tr>
                                ) : filteredUsers.length > 0 ? (
                                    filteredUsers.map(user => {
                                        const roleColor = getRoleBadgeColor(user.role);
                                        return (
                                            <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                {/* User */}
                                                <td style={{ padding: '16px', textAlign: 'start' }}>
                                                    <div className="flex gap-md" style={{ alignItems: 'center' }}>
                                                        <div style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white',
                                                            fontWeight: '600',
                                                            fontSize: '14px'
                                                        }}>
                                                            {getInitials(user.name)}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{user.name}</div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{user.company || t('app.name')}</div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role */}
                                                <td style={{ padding: '16px', textAlign: 'start' }}>
                                                    <span style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: '500',
                                                        background: roleColor.bg,
                                                        color: roleColor.text,
                                                        display: 'inline-block'
                                                    }}>
                                                        {getRoleDisplayName(user)}
                                                    </span>
                                                </td>

                                                {/* Contact */}
                                                <td style={{ padding: '16px', textAlign: 'start' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div className="flex gap-sm" style={{ alignItems: 'center', fontSize: '13px' }}>
                                                            <Mail size={14} style={{ color: 'var(--text-tertiary)' }} />
                                                            <span>{user.email}</span>
                                                        </div>
                                                        {user.phone && (
                                                            <div className="flex gap-sm" style={{ alignItems: 'center', fontSize: '13px' }}>
                                                                <Phone size={14} style={{ color: 'var(--text-tertiary)' }} />
                                                                <span>{user.phone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td style={{ padding: '16px', textAlign: 'end' }}>
                                                    <div className="flex gap-sm" style={{ justifyContent: 'flex-end' }}>
                                                        <button
                                                            className="btn btn-sm"
                                                            onClick={() => handleOpenModal('edit', user)}
                                                            style={{ padding: '8px' }}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleDelete(user.id)}
                                                            style={{ padding: '8px' }}
                                                            disabled={user.id === currentUser?.id}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>{t('teamManagement.noMembers')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Add/Edit Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
                            <div className="modal-header">
                                <h2>{modalMode === 'add' ? t('teamManagement.addMember') : t('teamManagement.editMember')}</h2>
                                <button className="modal-close" onClick={() => setShowModal(false)}>
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="modal-body">
                                {/* Basic Personnel Information */}
                                <div className="form-section">
                                    <h3 className="section-title">{t('projects.modal.sections.basic')}</h3>
                                    <div className="form-grid">
                                        {/* Name */}
                                        <div className="form-group">
                                            <label>{t('teamManagement.form.name')} <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                placeholder={t('teamManagement.form.name')}
                                            />
                                        </div>

                                        {/* Email */}
                                        <div className="form-group">
                                            <label>{t('teamManagement.form.email')} <span className="required">*</span></label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                                placeholder={t('teamManagement.form.email')}
                                            />
                                        </div>

                                        {/* Phone */}
                                        <div className="form-group">
                                            <label>{t('teamManagement.form.phone')}</label>
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder={t('teamManagement.form.phone')}
                                            />
                                        </div>

                                        {/* Role Selection */}
                                        <div className="form-group">
                                            <label>{t('teamManagement.form.role')} <span className="required">*</span></label>
                                            <select
                                                value={formData.roleId || formData.role}
                                                onChange={(e) => handleRoleChange(e.target.value)}
                                                required
                                            >
                                                <option value="" disabled>{t('teamManagement.form.selectRole')}</option>

                                                {/* System Roles */}
                                                <option value="ADMIN">{t('teamManagement.roles.ADMIN')}</option>
                                                <option value="PROJECT_MANAGER">{t('teamManagement.roles.PROJECT_MANAGER')}</option>
                                                <option value="ENGINEER">{t('teamManagement.roles.ENGINEER')}</option>
                                                <option value="ACCOUNTANT">{t('teamManagement.roles.ACCOUNTANT')}</option>

                                                {/* Custom Roles */}
                                                {roles.length > 0 && roles.map(role => (
                                                    <option key={role.id} value={role.id}>
                                                        {role.name} ({t('roles.customRole')})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Password Field */}
                                        {(modalMode === 'add' || modalMode === 'edit') && (
                                            <div className="form-group full-width" style={{ position: 'relative' }}>
                                                <label>{t('teamManagement.form.password')} {modalMode === 'add' ? <span className="required">*</span> : `(${t('common.leaveBlank')})`}</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type={showPassword ? 'text' : 'password'}
                                                        style={{ width: '100%', paddingLeft: isRTL ? '12px' : '40px', paddingRight: isRTL ? '40px' : '12px' }}
                                                        value={formData.password}
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                        required={modalMode === 'add'}
                                                        placeholder={modalMode === 'add' ? t('teamManagement.form.password') : '••••••••'}
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
                                                            padding: 0,
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
                                        <h3 className="section-title" style={{ border: 'none', margin: 0 }}>{t('teamManagement.form.permissions')}</h3>
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                            {t('teamManagement.form.basedOnRole')}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-md)' }}>
                                        {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
                                            <div key={categoryKey} style={{
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: 'var(--spacing-md)'
                                            }}>
                                                <h4 style={{
                                                    fontSize: 'var(--font-size-xs)',
                                                    color: 'var(--color-primary)',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    marginBottom: 'var(--spacing-sm)',
                                                    fontWeight: 600
                                                }}>
                                                    {category.label}
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                                    {category.permissions.map(perm => {
                                                        const isChecked = formData.permissions?.[categoryKey]?.[perm.key] || false;
                                                        return (
                                                            <label key={perm.key} style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 'var(--spacing-sm)',
                                                                cursor: 'pointer',
                                                                fontSize: 'var(--font-size-sm)',
                                                                color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                                transition: 'color 0.2s'
                                                            }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => togglePermission(categoryKey, perm.key)}
                                                                    style={{ accentColor: 'var(--color-primary)' }}
                                                                />
                                                                <span>
                                                                    {perm.label}
                                                                    {perm.sensitive && (
                                                                        <span style={{
                                                                            marginLeft: 'var(--spacing-xs)',
                                                                            color: 'var(--color-danger)',
                                                                            fontSize: '10px',
                                                                            fontWeight: 700
                                                                        }}>
                                                                            {t('common.sensitive')}
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

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                        {t('common.cancel')}
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {modalMode === 'add' ? t('common.add') : t('common.update')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Alert */}
                <CustomAlert {...alertConfig} onClose={closeAlert} />
            </div>
        </Layout>
    );
}
