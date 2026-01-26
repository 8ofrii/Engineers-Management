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
    UserCog
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import ProfileModal from './ProfileModal';
import './Layout.css';

export default function Layout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(true);
    const [profileModalOpen, setProfileModalOpen] = useState(false);

    // Helper function to get full image URL
    const getImageUrl = (path) => {
        if (!path) return null;
        // If path already includes http/https, return as is
        if (path.startsWith('http')) return path;
        // Otherwise, prepend the API base URL
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

    const toggleTheme = () => {
        setDarkMode(!darkMode);
        document.body.classList.toggle('light-mode');
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
        { path: '/workforce', icon: HardHat, label: t('nav.labor') },
        { path: '/chat', icon: MessageSquare, label: t('nav.chat') },
        { path: '/reports', icon: FileText, label: t('nav.reports') }
    ];

    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
        navItems.push({ path: '/team', icon: UserCog, label: 'Team Management' });
    }




    // Force Password Change Logic
    useEffect(() => {
        if (user?.mustChangePassword) {
            setProfileModalOpen(true);
        }
    }, [user]);

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        {user?.companyLogo ? (
                            <img
                                src={getImageUrl(user.companyLogo)}
                                alt="Logo"
                                style={{ height: '56px', width: '56px', borderRadius: '50%', marginRight: '10px', objectFit: 'cover' }}
                            />
                        ) : (
                            <Building2 size={28} />
                        )}
                        <span>{user?.company || t('app.name')}</span>
                    </div>
                    <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    <div
                        className="user-info"
                        onClick={() => setProfileModalOpen(true)}
                        style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                    <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                        <LogOut size={16} />
                        {t('auth.logout')}
                    </button>
                </div>
            </aside>

            {/* Overlay */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
            )}

            {/* Main Content */}
            <div className="main-content">
                <header className="topbar">
                    <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
                        <Menu size={24} />
                    </button>

                    <div className="topbar-actions">
                        {/* Show language and theme toggles only on dashboard */}
                        {location.pathname === '/dashboard' && (
                            <>
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
                                <button className="theme-toggle" onClick={toggleTheme}>
                                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                                </button>
                            </>
                        )}
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
        </div>
    );
}