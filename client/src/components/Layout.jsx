import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    FolderKanban,
    Users,
    Package,
    MessageSquare,
    FileText,
    LogOut,
    Menu,
    X,
    Building2,
    Moon,
    Sun,
    Languages,
    User as UserIcon,
    HardHat,
    Settings,
    UserCog,
    Wallet,
    ClipboardList,
    ShieldCheck,
    Activity,
    Receipt,
    Sparkles,
    Banknote,
    CreditCard,
    Pencil,
    ChevronLeft,
    ChevronRight,
    PanelLeftClose,
    PanelLeft,
    Palette,
    Check
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import ProfileModal from './ProfileModal';
import TwoFactorModal from './TwoFactorModal';
import DraftCaptureFAB from './DraftCaptureFAB';
import GlobalAIChatDrawer from './GlobalAIChatDrawer';
import AddTransactionModal from './AddTransactionModal';
import AddProjectModal from './AddProjectModal';
import { useCopilot } from '../context/CopilotContext';
import { transactionsAPI } from '../services/api';
import './Layout.css';

export default function Layout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });
    const [activeTheme, setActiveTheme] = useState(() => {
        return localStorage.getItem('theme_preset') || 'monochrome';
    });
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
    const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

    // Fetch pending approvals for badge
    useEffect(() => {
        const isManager = ['PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role);
        if (!isManager) return;
        const fetchPending = async () => {
            try {
                const res = await transactionsAPI.getPending();
                setPendingApprovalCount((res?.data?.data || []).length);
            } catch (e) { /* silent */ }
        };
        fetchPending();
        const interval = setInterval(fetchPending, 60000); // refresh every minute
        return () => clearInterval(interval);
    }, [user?.role]);

    const toggleSidebarCollapse = () => {
        const next = !sidebarCollapsed;
        setSidebarCollapsed(next);
        localStorage.setItem('sidebar_collapsed', next ? 'true' : 'false');
    };

    // Apply active theme preset and light mode class
    useEffect(() => {
        if (activeTheme === 'light') {
            document.body.classList.add('light-mode');
            document.body.removeAttribute('data-theme');
        } else {
            document.body.classList.remove('light-mode');
            document.body.setAttribute('data-theme', activeTheme);
        }
        localStorage.setItem('theme_preset', activeTheme);
    }, [activeTheme]);

    const changeThemePreset = (presetKey) => {
        setActiveTheme(presetKey);
        setIsThemeMenuOpen(false);
    };

    // Helper function to get full image URL
    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        return `${apiUrl}${path}`;
    };

    useEffect(() => {
        // Set RTL direction for Arabic
        document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    }, [i18n.language]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en';
        i18n.changeLanguage(newLang);
    };

    const navItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
        { path: '/projects', icon: FolderKanban, label: t('nav.projects') },
        { path: '/clients', icon: Users, label: t('nav.clients') },
        { path: '/suppliers', icon: Package, label: t('nav.suppliers') },
        { path: '/inventory', icon: Package, label: t('nav.inventory', 'Inventory') },
        { path: '/workforce', icon: HardHat, label: t('nav.labor') },
        { path: '/finance', icon: Wallet, label: t('finance.title') }, // or 'Accounting'
        { path: '/chat', icon: MessageSquare, label: t('nav.chat') },
        { path: '/reports', icon: FileText, label: t('nav.reports') },
        { path: '/dsr', icon: ClipboardList, label: t('nav.dsr', 'Daily Reports') },
        { path: '/invoices', icon: Receipt, label: t('nav.invoices', 'Invoices') },
        { path: '/drafts', icon: Sparkles, label: t('nav.drafts', 'AI Drafts') }
    ];

    // Reconciliation is finance work — admin/manager/accountant.
    if (['ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT'].includes(user?.role)) {
        navItems.push({ path: '/reconcile', icon: Banknote, label: t('nav.reconcile', 'Bank Reconciliation') });
    }

    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
        navItems.push({ path: '/team', icon: UserCog, label: t('teamManagement.title') });
        navItems.push({ path: '/audit-log', icon: Activity, label: t('nav.auditLog', 'Activity Log') });
        navItems.push({ path: '/settings/approval-thresholds', icon: ShieldCheck, label: t('nav.approvalThresholds', 'Approval Thresholds') });
        navItems.push({ path: '/billing', icon: CreditCard, label: t('nav.billing', 'Billing') });
    }

    // Force Password Change Logic
    useEffect(() => {
        if (user?.mustChangePassword) {
            setProfileModalOpen(true);
        }
    }, [user]);

    const { activeModal, modalPrefillData, closeModal } = useCopilot();

    return (
        <div className={`layout ${sidebarCollapsed ? 'layout-collapsed' : ''}`}>
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <div className="sidebar-header" style={{ position: 'relative' }}>
                    <div className="sidebar-logo">
                        {user?.companyLogo ? (
                            <img
                                src={getImageUrl(user.companyLogo)}
                                alt="Logo"
                                style={{ height: '48px', width: '48px', borderRadius: '50%', marginRight: '8px', objectFit: 'cover' }}
                            />
                        ) : (
                            <Building2 size={26} />
                        )}
                        <span className="company-title">{user?.company || t('app.name')}</span>
                    </div>

                    {/* Minimize / Full-screen Toggle Button */}
                    <button
                        type="button"
                        className="sidebar-collapse-btn"
                        onClick={toggleSidebarCollapse}
                        title={i18n.language === 'ar' ? 'تصغير القائمة الجانبية' : 'Minimize Sidebar / Fullscreen Tab'}
                    >
                        {i18n.language === 'ar' ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>

                    <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        const showBadge = item.path === '/finance' && pendingApprovalCount > 0;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                                onClick={() => setSidebarOpen(false)}
                                style={{ position: 'relative' }}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                                {showBadge && (
                                    <span style={{
                                        position: 'absolute',
                                        top: 6,
                                        right: sidebarCollapsed ? 4 : 12,
                                        background: '#f59e0b',
                                        color: 'white',
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        borderRadius: '50%',
                                        minWidth: 18,
                                        height: 18,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0 4px',
                                        boxShadow: '0 0 0 2px var(--bg-primary)',
                                        animation: 'pulse-badge 2s infinite'
                                    }}>
                                        {pendingApprovalCount > 9 ? '9+' : pendingApprovalCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    <div
                        className="user-info"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
                    >
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, cursor: 'pointer' }}
                            onClick={() => setProfileModalOpen(true)}
                            title="Click to view/edit profile"
                        >
                            <div className="user-avatar">
                                {user?.profilePicture ? (
                                    <img
                                        src={getImageUrl(user.profilePicture)}
                                        alt={user.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                    />
                                ) : (
                                    user?.name?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="user-details">
                                <div className="user-name">{user?.name}</div>
                                <div className="user-email">{user?.email}</div>
                            </div>
                        </div>

                        {/* Edit Info Button */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setProfileModalOpen(true);
                            }}
                            title={t('common.edit') || 'Edit Profile'}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                flexShrink: 0
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#60a5fa';
                                e.currentTarget.style.borderColor = '#60a5fa';
                                e.currentTarget.style.background = 'rgba(96, 165, 250, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--text-secondary)';
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.background = 'var(--bg-tertiary)';
                            }}
                        >
                            <Pencil size={14} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={handleLogout}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                            <LogOut size={16} />
                            {t('auth.logout')}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setSidebarOpen(false);
                                setTwoFactorModalOpen(true);
                            }}
                            title={t('nav.twoFactor', '2-Factor Authentication')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: twoFactorModalOpen ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)',
                                border: twoFactorModalOpen ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                                color: twoFactorModalOpen ? 'var(--color-primary)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                flexShrink: 0
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#10b981';
                                e.currentTarget.style.borderColor = '#10b981';
                                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = twoFactorModalOpen ? 'var(--color-primary)' : 'var(--text-secondary)';
                                e.currentTarget.style.borderColor = twoFactorModalOpen ? 'var(--color-primary)' : 'var(--border-color)';
                                e.currentTarget.style.background = twoFactorModalOpen ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)';
                            }}
                        >
                            <ShieldCheck size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Overlay */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
            )}

            {/* Main Content */}
            <div className="main-content">
                <header className="topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* When collapsed on desktop or on mobile, show expand toggle */}
                        {sidebarCollapsed ? (
                            <button
                                className="expand-sidebar-btn"
                                onClick={toggleSidebarCollapse}
                                title="Expand Sidebar"
                            >
                                <PanelLeft size={20} />
                            </button>
                        ) : (
                            <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
                                <Menu size={24} />
                            </button>
                        )}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '6px 14px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
                        }}>
                            <img
                                src="/hesaby_logo_icon.png"
                                alt="Hesaby Logo"
                                style={{
                                    height: '44px',
                                    width: 'auto',
                                    objectFit: 'contain',
                                    filter: 'drop-shadow(0 2px 6px rgba(37, 99, 235, 0.35))'
                                }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{
                                    fontWeight: 900,
                                    fontSize: '1.45rem',
                                    lineHeight: '1.1',
                                    background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    letterSpacing: '0.5px'
                                }}>
                                    Hesaby
                                </span>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    color: 'var(--text-tertiary)',
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase'
                                }}>
                                    ERP Construction
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="topbar-actions">
                        {/* Theme Preset Switcher Dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button
                                className="theme-toggle"
                                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                                title="Change Color Theme / Palette"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Palette size={19} />
                            </button>

                            {isThemeMenuOpen && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '115%',
                                        right: i18n.language === 'ar' ? 'auto' : 0,
                                        left: i18n.language === 'ar' ? 0 : 'auto',
                                        width: '230px',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '12px',
                                        padding: '8px',
                                        boxShadow: 'var(--shadow-xl)',
                                        zIndex: 1200,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}
                                >
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Chill Themes
                                    </div>

                                    {[
                                        { id: 'monochrome', name: 'Monochrome Minimal', desc: 'Neutral grey & off-white', dot: '#262626' },
                                        { id: 'obsidian-emerald', name: 'Obsidian & Emerald', desc: 'Onyx / Vercel mint', dot: '#10b981' },
                                        { id: 'light', name: 'Clean Light Mode', desc: 'Crisp day theme', dot: '#f59e0b' }
                                    ].map((tPreset) => (
                                        <button
                                            key={tPreset.id}
                                            onClick={() => changeThemePreset(tPreset.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 10px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: activeTheme === tPreset.id ? 'var(--bg-tertiary)' : 'transparent',
                                                color: activeTheme === tPreset.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span
                                                    style={{
                                                        width: '10px',
                                                        height: '10px',
                                                        borderRadius: '50%',
                                                        background: tPreset.dot,
                                                        border: '1px solid rgba(255,255,255,0.2)'
                                                    }}
                                                />
                                                <div>
                                                    <div style={{ fontSize: '12.5px', fontWeight: activeTheme === tPreset.id ? '700' : '500' }}>
                                                        {tPreset.name}
                                                    </div>
                                                    <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                                                        {tPreset.desc}
                                                    </div>
                                                </div>
                                            </div>
                                            {activeTheme === tPreset.id && <Check size={14} style={{ color: 'var(--color-primary)' }} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            className="theme-toggle"
                            onClick={toggleLanguage}
                            title="Switch Language"
                        >
                            <Languages size={20} />
                            <span style={{ fontSize: '11px', marginLeft: '4px', fontWeight: '600' }}>
                                {i18n.language === 'en' ? 'AR' : 'EN'}
                            </span>
                        </button>
                        {/* Notification bell always visible on all pages - ALWAYS LAST */}
                        <NotificationBell />
                    </div>
                </header>

                <main className="content">
                    <div className="container">
                        {children}
                    </div>
                </main>
            </div>

            {/* Profile Modal */}
            <ProfileModal
                isOpen={profileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                forceChangePassword={user?.mustChangePassword}
            />

            {/* Two-Factor Authentication Modal */}
            <TwoFactorModal
                isOpen={twoFactorModalOpen}
                onClose={() => setTwoFactorModalOpen(false)}
            />

            {/* Global AI Copilot Assistant Drawer */}
            <GlobalAIChatDrawer />

            {/* Global AI capture button — voice + receipt photo from anywhere */}
            <DraftCaptureFAB />

            {/* Global Copilot Modals */}
            <AddTransactionModal
                isOpen={activeModal === 'ADD_TRANSACTION'}
                onClose={closeModal}
                initialData={modalPrefillData}
                onSubmit={() => {
                    closeModal();
                    // If currently on Finance or Projects page, trigger page refresh
                    window.dispatchEvent(new Event('transaction-updated'));
                }}
            />

            <AddProjectModal
                isOpen={activeModal === 'ADD_PROJECT'}
                onClose={closeModal}
                initialData={modalPrefillData}
                onSubmit={() => {
                    closeModal();
                    window.dispatchEvent(new Event('project-updated'));
                }}
            />
        </div>
    );
}