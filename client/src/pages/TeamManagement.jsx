import { useState, useEffect } from 'react';

import { useTranslation } from 'react-i18next';
import { Users, UserPlus, Shield, Trash2, Edit2, Search, MoreVertical, X, Check, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import CustomAlert from '../components/CustomAlert';

export default function TeamManagement() {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '', email: '', role: 'ENGINEER', password: '', phone: ''
    });
    const [showPassword, setShowPassword] = useState(false); // Toggle state

    // Alert State
    const [alertConfig, setAlertConfig] = useState({
        isOpen: false, type: 'info', title: '', message: '', onConfirm: () => { }, showCancel: false
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const showAlert = (config) => {
        setAlertConfig({
            isOpen: true,
            confirmText: 'OK',
            cancelText: 'Cancel',
            onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false })),
            ...config
        });
    };

    const closeAlert = () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
    };

    const loadUsers = async () => {
        try {
            const res = await userAPI.getAll();
            setUsers(res.data.data);
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

    // Permissions Configuration
    const PERMISSIONS_LIST = [
        { id: 'view_dashboard', label: 'View Dashboard' },
        { id: 'manage_projects', label: 'Manage Projects' },
        { id: 'manage_clients', label: 'Manage Clients/Suppliers' },
        { id: 'manage_workforce', label: 'Manage Workforce' },
        { id: 'view_financials', label: 'View Financials' },
        { id: 'manage_team', label: 'Manage Team' },
        { id: 'view_reports', label: 'View Reports' },
        { id: 'manage_settings', label: 'Company Settings' }
    ];

    const ROLE_DEFAULTS = {
        'SUPER_ADMIN': PERMISSIONS_LIST.map(p => p.id),
        'ADMIN': PERMISSIONS_LIST.map(p => p.id),
        'PROJECT_MANAGER': ['view_dashboard', 'manage_projects', 'manage_clients', 'manage_workforce', 'view_financials', 'view_reports'],
        'ENGINEER': ['view_dashboard', 'manage_projects', 'manage_workforce'],
        'ACCOUNTANT': ['view_dashboard', 'view_financials', 'view_reports', 'manage_clients']
    };

    const handleRoleChange = (newRole) => {
        setFormData(prev => ({
            ...prev,
            role: newRole,
            permissions: ROLE_DEFAULTS[newRole] || []
        }));
    };

    const togglePermission = (permId) => {
        setFormData(prev => {
            const current = prev.permissions || [];
            if (current.includes(permId)) {
                return { ...prev, permissions: current.filter(p => p !== permId) };
            } else {
                return { ...prev, permissions: [...current, permId] };
            }
        });
    };

    // Reset password show state when modal opens
    const handleOpenModal = (mode, user = null) => {
        setShowPassword(false);
        setModalMode(mode);
        setSelectedUser(user);
        if (mode === 'edit' && user) {
            // If user has saved permissions use them, else fallback to role defaults
            setFormData({
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone || '',
                password: '',
                permissions: user.permissions || ROLE_DEFAULTS[user.role] || []
            });
        } else {
            setFormData({
                name: '',
                email: '',
                role: 'ENGINEER',
                password: '',
                phone: '',
                permissions: ROLE_DEFAULTS['ENGINEER']
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'add') {
                await userAPI.invite(formData);
                showAlert({ type: 'success', title: 'Invite Sent', message: 'User has been invited successfully via email.' });
            } else {
                await userAPI.update(selectedUser.id, formData);
                showAlert({ type: 'success', title: 'Updated', message: 'User details updated successfully.' });
            }
            setShowModal(false);
            loadUsers();
        } catch (err) {
            showAlert({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Operation failed' });
        }
    };

    const handleDelete = (id) => {
        showAlert({
            type: 'danger',
            title: 'Remove User',
            message: 'Are you sure you want to remove this user? This action cannot be undone.',
            showCancel: true,
            confirmText: 'Remove',
            onConfirm: async () => {
                closeAlert();
                try {
                    await userAPI.delete(id);
                    loadUsers();
                    // Optional: Show success
                    // showAlert({ type: 'success', title: 'Removed', message: 'User removed successfully.' });
                } catch (err) {
                    // Need to wait for modal to close or use timeout, but simplistic replaces state works usually
                    setTimeout(() => {
                        showAlert({ type: 'error', title: 'Error', message: 'Failed to delete user' });
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

    // Helper to extract initials
    const getInitials = (name) => {
        return name
            ?.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2) || 'U';
    };

    return (
        <Layout>
            <div>
                {/* Header */}
                <div className="flex-between mb-xl">
                    <div>
                        <h1 className="flex gap-md" style={{ alignItems: 'center' }}>
                            <Users size={32} />
                            Team Management
                        </h1>
                        <p className="text-secondary">Manage your team members and their roles</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => handleOpenModal('add')}>
                        <UserPlus size={20} /> Add New Member
                    </button>
                </div>

                {/* Content Card */}
                <div className="card">
                    {/* Search Bar */}
                    <div className="flex-between mb-lg" style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-color)' }}>
                        <div className="input-group" style={{ maxWidth: '400px', margin: 0 }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input
                                    type="text"
                                    placeholder="Search members by name or email..."
                                    className="input"
                                    style={{ paddingLeft: '40px', width: '100%' }}
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                            </div>
                        </div>
                        <div className="text-secondary" style={{ fontSize: '14px' }}>
                            Total Members: <strong style={{ color: 'var(--text-primary)' }}>{filteredUsers.length}</strong>
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-tertiary)' }}>
                                    <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>User</th>
                                    <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Role</th>
                                    <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Contact</th>
                                    <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center' }}>Loading...</td></tr>
                                ) : filteredUsers.length > 0 ? (
                                    filteredUsers.map(user => (
                                        <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '40px', height: '40px', borderRadius: '50%',
                                                        background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center',
                                                        justifyContent: 'center', fontWeight: '600', color: 'var(--color-primary)',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {user.profilePicture ? (
                                                            <img
                                                                src={user.profilePicture.startsWith('http') ? user.profilePicture : `${import.meta.env.VITE_API_URL}${user.profilePicture}`}
                                                                alt={user.name}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            />
                                                        ) : getInitials(user.name)}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{user.name}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{user.company || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span className="badge" style={{
                                                    backgroundColor: getRoleBadgeColor(user.role).bg,
                                                    color: getRoleBadgeColor(user.role).text
                                                }}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                                                        <Mail size={14} /> {user.email}
                                                    </span>
                                                    {user.phone && (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                                                            <Phone size={14} /> {user.phone}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                                {currentUser.id !== user.id && (
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                        <button
                                                            onClick={() => handleOpenModal('edit', user)}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '6px', minWidth: 'auto' }}
                                                            title="Edit Role"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(user.id)}
                                                            className="btn"
                                                            style={{ padding: '6px', minWidth: 'auto', color: 'var(--color-danger)', background: '#fee2e2' }}
                                                            title="Remove User"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No members found matching your search.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', width: '95%', padding: '32px' }}>
                            <div className="modal-header" style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>{modalMode === 'add' ? 'Add New Member' : 'Edit Member'}</h2>
                                <button className="modal-close" onClick={() => setShowModal(false)}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ marginBottom: '6px', display: 'block', fontWeight: '500', fontSize: '14px' }}>Full Name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                                        <input
                                            type="text"
                                            className="input"
                                            style={{ height: '42px' }}
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ marginBottom: '6px', display: 'block', fontWeight: '500', fontSize: '14px' }}>Email Address <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                                        <input
                                            type="email"
                                            className="input"
                                            style={{ height: '42px' }}
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            disabled={modalMode === 'edit'}
                                            placeholder="john@company.com"
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ marginBottom: '6px', display: 'block', fontWeight: '500', fontSize: '14px' }}>Role <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <select
                                                className="input"
                                                style={{ height: '42px', width: '100%' }}
                                                value={formData.role}
                                                onChange={e => handleRoleChange(e.target.value)}
                                            >
                                                <option value="ADMIN">Admin</option>
                                                <option value="PROJECT_MANAGER">Project Manager</option>
                                                <option value="ENGINEER">Site Engineer</option>
                                                <option value="ACCOUNTANT">Accountant</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ marginBottom: '6px', display: 'block', fontWeight: '500', fontSize: '14px' }}>Phone Number <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                                        <input
                                            type="text"
                                            className="input"
                                            style={{ height: '42px' }}
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="+1 234 567 890"
                                            required
                                        />
                                    </div>
                                    {modalMode === 'add' && (
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ marginBottom: '6px', display: 'block', fontWeight: '500', fontSize: '14px' }}>Initial Password <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    className="input"
                                                    style={{ height: '42px', paddingRight: '40px' }}
                                                    value={formData.password}
                                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                    required
                                                    placeholder="Create a password"
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
                                                        color: 'var(--text-tertiary)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Permissions Checkboxes */}
                                <div className="form-section" style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>Permissions</label>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '12px'
                                    }}>
                                        {PERMISSIONS_LIST.map(perm => {
                                            const isChecked = (formData.permissions || []).includes(perm.id);
                                            return (
                                                <label key={perm.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    fontSize: '13px',
                                                    cursor: 'pointer',
                                                    userSelect: 'none',
                                                    color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)'
                                                }}>
                                                    <div style={{
                                                        minWidth: '18px',
                                                        height: '18px',
                                                        borderRadius: '4px',
                                                        border: isChecked ? 'none' : '2px solid var(--text-tertiary)',
                                                        background: isChecked ? 'var(--color-primary)' : 'transparent',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s',
                                                        flexShrink: 0
                                                    }}>
                                                        {isChecked && <Check size={12} color="white" strokeWidth={3} />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => togglePermission(perm.id)}
                                                        style={{ display: 'none' }}
                                                    />
                                                    {perm.label}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="modal-footer" style={{ marginTop: '0', paddingTop: '16px', borderTop: '1px solid var(--border-color)', gap: '12px' }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowModal(false)}
                                        style={{ height: '40px', padding: '0 20px', fontSize: '14px' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ height: '40px', padding: '0 20px', fontSize: '14px' }}
                                    >
                                        {modalMode === 'add' ? 'Send Invite' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                <CustomAlert {...alertConfig} onCancel={closeAlert} />
            </div>
        </Layout>
    );
}
