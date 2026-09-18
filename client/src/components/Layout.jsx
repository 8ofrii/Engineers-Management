import { useState, useEffect, useLayoutEffect, useRef } from 'react';
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
    Globe,
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
    ChevronDown,
    Boxes,
    Gauge,
    PanelLeftClose,
    PanelLeft,
    Check,
    Shield
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import SkyToggle from './ui/sky-toggle';
import ProfileModal from './ProfileModal';
import TwoFactorModal from './TwoFactorModal';
import DraftCaptureFAB from './DraftCaptureFAB';
import GlobalAIChatDrawer from './GlobalAIChatDrawer';
import AddTransactionModal from './AddTransactionModal';
import AddProjectModal from './AddProjectModal';
import { useCopilot } from '../context/CopilotContext';
import { transactionsAPI } from '../services/api';
import './Layout.css';

// Module-level persistent scroll tracker across route changes and Layout remounts
let savedSidebarScrollTop = 0;
try {
    savedSidebarScrollTop = Number(sessionStorage.getItem('hesaby_sidebar_scroll')) || 0;
} catch (_) {}

export default function Layout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const navRef = useRef(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });
    const [activeTheme, setActiveTheme] = useState(() => {
        const saved = localStorage.getItem('theme_preset_v3');
        if (!saved) return 'light';
        return saved === 'monochrome' || saved === 'dark' ? 'monochrome' : 'light';
    });
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
    const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

    // Immediately restore sidebar scroll position on mount & whenever route changes
    useLayoutEffect(() => {
        if (navRef.current) {
            navRef.current.scrollTop = savedSidebarScrollTop;
        }
    }, [location.pathname]);

    const handleSidebarScroll = (e) => {
        const top = e.currentTarget.scrollTop;
        savedSidebarScrollTop = top;
        try {
            sessionStorage.setItem('hesaby_sidebar_scroll', String(top));
        } catch (_) {}
    };

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

    // Apply active theme preset and light mode class (Monochrome Dark <-> Light Mode)
    useEffect(() => {
        if (activeTheme === 'light') {
            document.body.classList.add('light-mode');
            document.body.removeAttribute('data-theme');
        } else {
            document.body.classList.remove('light-mode');
            document.body.setAttribute('data-theme', 'monochrome');
        }
        localStorage.setItem('theme_preset', activeTheme);
        localStorage.setItem('theme_preset_v3', activeTheme);
    }, [activeTheme]);

    const toggleTheme = () => {
        setActiveTheme(prev => (prev === 'light' ? 'monochrome' : 'light'));
    };

    const [avatarError, setAvatarError] = useState(false);
    const [companyLogoError, setCompanyLogoError] = useState(false);

    useEffect(() => {
        setAvatarError(false);
    }, [user?.profilePicture]);

    useEffect(() => {
        setCompanyLogoError(false);
    }, [user?.companyLogo]);

    // Helper function to get full image URL (handles local uploads, proxy, and remote S3)
    const getImageUrl = (path) => {
        if (!path || typeof path !== 'string') return null;
        if (path.startsWith('blob:') || path.startsWith('data:')) return path;
        // Strip localhost:5000 / 127.0.0.1:5000 so relative proxy works seamlessly
        const cleanPath = path.replace(/^https?:\/\/(localhost|127\.0\.0\.1):5000/i, '');
        if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
            return cleanPath;
        }
        return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    };

    const isArabic = (i18n.language || '').startsWith('ar');

    useEffect(() => {
        // Set RTL direction for Arabic
        document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
        document.documentElement.lang = isArabic ? 'ar' : 'en';
    }, [isArabic]);

    const [collapsedGroups, setCollapsedGroups] = useState(() => {
        try {
            const saved = localStorage.getItem('sidebar_collapsed_groups');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const toggleGroup = (groupId) => {
        setCollapsedGroups(prev => {
            const next = { ...prev, [groupId]: !prev[groupId] };
            localStorage.setItem('sidebar_collapsed_groups', JSON.stringify(next));
            return next;
        });
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleLanguage = () => {
        const newLang = isArabic ? 'en' : 'ar';
        i18n.changeLanguage(newLang);
    };

    // 1. Standalone Top Items (Dashboard & Projects)
    const mainItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard', 'Dashboard') },
        { path: '/projects', icon: FolderKanban, label: t('nav.projects', 'Projects') }
    ];

    // 2. Navigation Categories / Groups
    const navGroups = [
        {
            id: 'operations',
            title: t('nav.groupOperations', 'Operations'),
            icon: Boxes,
            items: [
                { path: '/clients', icon: Users, label: t('nav.clients', 'Clients') },
                { path: '/suppliers', icon: Package, label: t('nav.suppliers', 'Suppliers') },
                { path: '/inventory', icon: Package, label: t('nav.inventory', 'Raw Materials') },
                { path: '/workforce', icon: HardHat, label: t('nav.labor', 'Labor & Workforce') },
                { path: '/dsr', icon: ClipboardList, label: t('nav.dsr', 'Daily Site Reports') }
            ]
        },
        {
            id: 'finance',
            title: t('nav.groupFinance', 'Finance'),
            icon: Wallet,
            badge: pendingApprovalCount > 0 ? (pendingApprovalCount > 9 ? '9+' : pendingApprovalCount) : null,
            items: [
                { path: '/finance', icon: Wallet, label: t('finance.title', 'Accounting & Expenses'), badge: pendingApprovalCount > 0 ? (pendingApprovalCount > 9 ? '9+' : pendingApprovalCount) : null },
                { path: '/invoices', icon: Receipt, label: t('nav.invoices', 'Invoices') },
                ...( ['ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT'].includes(user?.role) ? [
                    { path: '/reconcile', icon: Banknote, label: t('nav.reconcile', 'Bank Reconciliation') }
                ] : []),
                { path: '/drafts', icon: Sparkles, label: t('nav.drafts', 'AI Drafts') },
                { path: '/reports', icon: FileText, label: t('nav.reports', 'Reports') }
            ]
        },
        ...( ['ADMIN', 'SUPER_ADMIN'].includes(user?.role) ? [
            {
                id: 'cockpit',
                title: t('nav.groupCockpit', 'Management'),
                icon: Gauge,
                items: [
                    { path: '/team', icon: UserCog, label: t('teamManagement.title', 'Team Management') },
                    { path: '/settings', icon: Settings, label: i18n.language === 'ar' ? 'إعدادات الشركة' : 'Company Settings' },
                    { path: '/settings/approval-thresholds', icon: ShieldCheck, label: t('nav.approvalThresholds', 'Approval Thresholds') },
                    { path: '/billing', icon: CreditCard, label: t('nav.billing', 'Billing & Plans') },
                    ...( user?.role === 'SUPER_ADMIN' ? [
                        { path: '/audit-log', icon: Activity, label: t('nav.auditLog', 'Activity Log') },
                        { path: '/platform/payments', icon: Shield, label: i18n.language === 'ar' ? 'اعتمادات المنصة' : 'Platform Approvals' }
                    ] : [])
                ]
            }
        ] : [])
    ];

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
                        {user?.companyLogo && !companyLogoError ? (
                            <img
                                src={getImageUrl(user.companyLogo)}
                                alt={user?.company || "Company Logo"}
                                onError={() => setCompanyLogoError(true)}
                                style={{ height: '40px', width: '40px', borderRadius: '12px', flexShrink: 0, objectFit: 'cover' }}
                            />
                        ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 12, background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                                <img src="/hesaby_logo_icon.svg" alt="Hesaby" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                            </span>
                        )}
                        <span className="company-title">{user?.company || t('app.name')}</span>
                    </div>

                    {/* Minimize / Full-screen Toggle Button */}
                    <button
                        type="button"
                        className="sidebar-collapse-btn"
                        onClick={toggleSidebarCollapse}
                        title={isArabic ? 'تصغير القائمة الجانبية' : 'Minimize Sidebar / Fullscreen Tab'}
                    >
                        {isArabic ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>

                    <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav" ref={navRef} onScroll={handleSidebarScroll}>
                    {/* Standalone Main Items (Dashboard & Projects) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                        {mainItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                                    onClick={() => setSidebarOpen(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-md)',
                                        padding: '10px 14px',
                                        fontSize: '13.5px',
                                        fontWeight: 600,
                                        color: isActive ? 'var(--color-primary)' : 'var(--text-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: '2px',
                                        position: 'relative'
                                    }}
                                >
                                    <Icon size={19} style={{ flexShrink: 0 }} />
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Categorized Dropdowns / Groups */}
                    {navGroups.map((group) => {
                        const isGroupActive = group.items.some((item) => location.pathname === item.path);
                        const isCollapsed = !!collapsedGroups[group.id];
                        const GroupIcon = group.icon;

                        return (
                            <div key={group.id} className="nav-group" style={{ marginTop: 6, marginBottom: 2 }}>
                                {!sidebarCollapsed ? (
                                    <button
                                        type="button"
                                        className="nav-item nav-group-btn"
                                        onClick={() => toggleGroup(group.id)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 14px',
                                            background: isGroupActive ? 'rgba(255, 90, 31, 0.09)' : 'transparent',
                                            border: '1px solid transparent',
                                            color: isGroupActive ? 'var(--color-primary)' : 'var(--text-primary)',
                                            fontSize: '13.5px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            borderRadius: 'var(--radius-md)',
                                            transition: 'all 0.15s ease',
                                            marginBottom: '2px',
                                            textAlign: 'inherit'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', minWidth: 0 }}>
                                            <GroupIcon size={19} style={{ flexShrink: 0 }} />
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.title}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                            {group.badge && isCollapsed && (
                                                <span style={{
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
                                                    padding: '0 4px'
                                                }}>
                                                    {group.badge}
                                                </span>
                                            )}
                                            <ChevronDown
                                                size={16}
                                                style={{
                                                    transform: isCollapsed ? (i18n.language === 'ar' ? 'rotate(90deg)' : 'rotate(-90deg)') : 'rotate(0deg)',
                                                    transition: 'transform 0.2s ease',
                                                    opacity: 0.7
                                                }}
                                            />
                                        </div>
                                    </button>
                                ) : (
                                    <div style={{
                                        height: '1px',
                                        background: 'var(--border-color)',
                                        margin: '10px 6px',
                                        opacity: 0.6
                                    }} />
                                )}

                                {/* Sub-items with tree guide line */}
                                {(!isCollapsed || sidebarCollapsed) && (
                                    <div
                                        className="nav-group-items"
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '2px',
                                            marginInlineStart: sidebarCollapsed ? 0 : 16,
                                            paddingInlineStart: sidebarCollapsed ? 0 : 10,
                                            borderInlineStart: sidebarCollapsed ? 'none' : '1.5px solid var(--border-color)',
                                            marginTop: 2,
                                            marginBottom: 6
                                        }}
                                    >
                                        {group.items.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = location.pathname === item.path;
                                            const showBadge = item.badge;
                                            return (
                                                <Link
                                                    key={item.path}
                                                    to={item.path}
                                                    className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                                                    onClick={() => setSidebarOpen(false)}
                                                    style={{ position: 'relative', padding: '9px 12px', fontSize: '13px' }}
                                                >
                                                    <Icon size={18} />
                                                    <span>{item.label}</span>
                                                    {showBadge && (
                                                        <span style={{
                                                            position: 'absolute',
                                                            top: 7,
                                                            right: sidebarCollapsed ? 4 : (i18n.language === 'ar' ? 'auto' : 12),
                                                            left: sidebarCollapsed ? 'auto' : (i18n.language === 'ar' ? 12 : 'auto'),
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
                                                            {showBadge}
                                                        </span>
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
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
                                {user?.profilePicture && !avatarError ? (
                                    <img
                                        src={getImageUrl(user.profilePicture)}
                                        alt={user.name}
                                        onError={() => setAvatarError(true)}
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
                                e.currentTarget.style.color = '#ff8a50';
                                e.currentTarget.style.borderColor = '#ff8a50';
                                e.currentTarget.style.background = 'rgba(255, 90, 31, 0.12)';
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
                                background: twoFactorModalOpen ? 'rgba(255, 90, 31, 0.14)' : 'var(--bg-tertiary)',
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
                                e.currentTarget.style.background = twoFactorModalOpen ? 'rgba(255, 90, 31, 0.14)' : 'var(--bg-tertiary)';
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
                            gap: '10px',
                            padding: '6px 14px 6px 8px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                                <img
                                    src="/hesaby_logo_icon.svg"
                                    alt="Hesaby Logo"
                                    style={{ width: 27, height: 27, objectFit: 'contain' }}
                                />
                            </span>
                            <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                                Hesaby
                            </span>
                        </div>
                    </div>

                    <div className="topbar-actions">
                        {/* Sky day/night switcher, synced with landing + auth */}
                        <SkyToggle
                            dark={activeTheme !== 'light'}
                            onToggle={toggleTheme}
                            label={activeTheme === 'light' ? (isArabic ? 'التحويل للوضع الليلي' : 'Switch to Dark Mode') : (isArabic ? 'التحويل للوضع الفاتح' : 'Switch to Light Mode')}
                        />

                        {/* Clean & Simple Language Toggle Button with Globe Icon */}
                        <button
                            className="theme-toggle"
                            onClick={toggleLanguage}
                            title={isArabic ? 'Switch to English' : 'التحويل إلى اللغة العربية'}
                            aria-label="Toggle language"
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 10px' }}
                        >
                            <Globe size={18} />
                            <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px' }}>
                                {isArabic ? 'EN' : 'AR'}
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