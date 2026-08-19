import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Bell,
    Maximize2,
    CheckCheck,
    Trash2,
    X,
    Filter,
    Clock,
    AlertCircle,
    Info,
    CheckCircle2,
    Calendar
} from 'lucide-react';
import api from '../services/api';
import './NotificationBell.css';

export default function NotificationBell() {
    const { t, i18n } = useTranslation();
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [modalFilter, setModalFilter] = useState('ALL'); // ALL, UNREAD, READ

    // Fetch notifications on mount and periodically
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 45000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            setLoading(true);
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteNotification = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => {
                const target = prev.find(n => n.id === id);
                if (target && !target.isRead) {
                    setUnreadCount(c => Math.max(0, c - 1));
                }
                return prev.filter(n => n.id !== id);
            });
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const clearAllNotifications = async () => {
        if (!window.confirm(t('notifications.clearConfirm') || 'Are you sure you want to clear all notifications?')) {
            return;
        }
        try {
            setLoading(true);
            await api.delete('/notifications');
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to clear all notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'ACTION_REQUIRED':
                return <AlertCircle size={18} className="notif-type-icon notif-icon-action" />;
            case 'INFO':
                return <Info size={18} className="notif-type-icon notif-icon-info" />;
            case 'ALERT':
                return <Bell size={18} className="notif-type-icon notif-icon-alert" />;
            default:
                return <CheckCircle2 size={18} className="notif-type-icon notif-icon-default" />;
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return t('notifications.justNow') || 'Just now';
        if (diffMins < 60) return `${diffMins}m ${t('notifications.ago') || 'ago'}`;
        if (diffHours < 24) return `${diffHours}h ${t('notifications.ago') || 'ago'}`;
        if (diffDays < 7) return `${diffDays}d ${t('notifications.ago') || 'ago'}`;
        return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US');
    };

    const filteredNotifications = notifications.filter(n => {
        if (modalFilter === 'UNREAD') return !n.isRead;
        if (modalFilter === 'READ') return n.isRead;
        return true;
    });

    return (
        <div className="notification-bell-container">
            {/* Bell Trigger Button */}
            <button
                className="notification-bell-button"
                onClick={() => setShowDropdown(!showDropdown)}
                aria-label="Notifications"
                title={t('notifications.title') || 'Notifications'}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {/* Quick Dropdown Menu */}
            {showDropdown && (
                <>
                    <div
                        className="notification-overlay"
                        onClick={() => setShowDropdown(false)}
                    />
                    <div className="notification-dropdown">
                        <div className="notification-header">
                            <div className="notif-header-title">
                                <h3>{t('notifications.title') || 'Notifications'}</h3>
                                {unreadCount > 0 && (
                                    <span className="notif-count-pill">{unreadCount}</span>
                                )}
                            </div>

                            <div className="notif-header-actions">
                                {notifications.length > 0 && (
                                    <>
                                        <button
                                            className="notif-action-icon-btn"
                                            onClick={markAllAsRead}
                                            title={t('notifications.markAllRead') || 'Mark all read'}
                                            disabled={loading || unreadCount === 0}
                                        >
                                            <CheckCheck size={16} />
                                        </button>
                                        <button
                                            className="notif-action-icon-btn notif-clear-btn"
                                            onClick={clearAllNotifications}
                                            title={t('notifications.clearAll') || 'Clear All'}
                                            disabled={loading}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                                <button
                                    className="notif-action-icon-btn notif-expand-btn"
                                    onClick={() => {
                                        setShowDropdown(false);
                                        setShowModal(true);
                                    }}
                                    title={t('notifications.maximize') || 'Expand Full Window'}
                                >
                                    <Maximize2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="notification-list">
                            {notifications.length === 0 ? (
                                <div className="notification-empty">
                                    <Bell size={40} className="empty-icon" />
                                    <p>{t('notifications.noNotifications') || 'No notifications'}</p>
                                    <span>{t('notifications.noNotificationsDesc') || 'You are all caught up!'}</span>
                                </div>
                            ) : (
                                notifications.slice(0, 15).map(notif => (
                                    <div
                                        key={notif.id}
                                        className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
                                        onClick={() => !notif.isRead && markAsRead(notif.id)}
                                    >
                                        <div className="notification-icon-wrapper">
                                            {getNotificationIcon(notif.type)}
                                        </div>
                                        <div className="notification-content">
                                            <h4>{notif.title}</h4>
                                            <p>{notif.message}</p>
                                            <span className="notification-time">
                                                <Clock size={11} /> {formatTime(notif.createdAt)}
                                            </span>
                                        </div>
                                        <div className="notif-item-actions">
                                            <button
                                                className="notif-delete-single-btn"
                                                onClick={(e) => deleteNotification(notif.id, e)}
                                                title={t('notifications.delete') || 'Delete'}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            {!notif.isRead && (
                                                <div className="unread-dot" title="Unread"></div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="notif-dropdown-footer">
                                <button
                                    className="view-all-modal-btn"
                                    onClick={() => {
                                        setShowDropdown(false);
                                        setShowModal(true);
                                    }}
                                >
                                    <Maximize2 size={14} />
                                    <span>{t('notifications.allNotifications') || 'Open All in Window'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Full Expanded Floating Modal */}
            {showModal && (
                <div className="notif-modal-backdrop" onClick={() => setShowModal(false)}>
                    <div
                        className="notif-modal-dialog"
                        onClick={(e) => e.stopPropagation()}
                        dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                    >
                        {/* Modal Header */}
                        <div className="notif-modal-header">
                            <div className="notif-modal-title-group">
                                <div className="notif-modal-avatar">
                                    <Bell size={22} />
                                </div>
                                <div>
                                    <h3>{t('notifications.allNotifications') || 'All Notifications'}</h3>
                                    <span className="notif-modal-subtitle">
                                        {notifications.length} {t('notifications.title') || 'Notifications'} ({unreadCount} {t('notifications.unread') || 'Unread'})
                                    </span>
                                </div>
                            </div>

                            <div className="notif-modal-header-actions">
                                {notifications.length > 0 && (
                                    <>
                                        <button
                                            className="btn-modal-action"
                                            onClick={markAllAsRead}
                                            disabled={loading || unreadCount === 0}
                                        >
                                            <CheckCheck size={16} />
                                            <span>{t('notifications.markAllRead') || 'Mark All Read'}</span>
                                        </button>
                                        <button
                                            className="btn-modal-action btn-modal-danger"
                                            onClick={clearAllNotifications}
                                            disabled={loading}
                                        >
                                            <Trash2 size={16} />
                                            <span>{t('notifications.clearAll') || 'Clear All'}</span>
                                        </button>
                                    </>
                                )}
                                <button
                                    className="btn-modal-close"
                                    onClick={() => setShowModal(false)}
                                    title={t('common.close') || 'Close'}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Filter Tabs */}
                        <div className="notif-modal-tabs">
                            <button
                                className={`notif-tab ${modalFilter === 'ALL' ? 'active' : ''}`}
                                onClick={() => setModalFilter('ALL')}
                            >
                                {t('notifications.all') || 'All'} ({notifications.length})
                            </button>
                            <button
                                className={`notif-tab ${modalFilter === 'UNREAD' ? 'active' : ''}`}
                                onClick={() => setModalFilter('UNREAD')}
                            >
                                {t('notifications.unread') || 'Unread'} ({unreadCount})
                            </button>
                            <button
                                className={`notif-tab ${modalFilter === 'READ' ? 'active' : ''}`}
                                onClick={() => setModalFilter('READ')}
                            >
                                {t('notifications.read') || 'Read'} ({Math.max(0, notifications.length - unreadCount)})
                            </button>
                        </div>

                        {/* Modal Scrollable Notification List */}
                        <div className="notif-modal-body">
                            {filteredNotifications.length === 0 ? (
                                <div className="notif-modal-empty">
                                    <div className="empty-bell-circle">
                                        <Bell size={48} />
                                    </div>
                                    <h4>{t('notifications.noNotifications') || 'No notifications found'}</h4>
                                    <p>{t('notifications.noNotificationsDesc') || 'You have no notifications in this category.'}</p>
                                </div>
                            ) : (
                                <div className="notif-modal-grid">
                                    {filteredNotifications.map(notif => (
                                        <div
                                            key={notif.id}
                                            className={`notif-card ${notif.isRead ? 'card-read' : 'card-unread'}`}
                                            onClick={() => !notif.isRead && markAsRead(notif.id)}
                                        >
                                            <div className="notif-card-header">
                                                <div className="notif-card-type">
                                                    {getNotificationIcon(notif.type)}
                                                    <span className="notif-card-title">{notif.title}</span>
                                                </div>
                                                <div className="notif-card-actions">
                                                    <span className="notif-card-date">
                                                        <Calendar size={12} /> {formatTime(notif.createdAt)}
                                                    </span>
                                                    <button
                                                        className="notif-card-delete"
                                                        onClick={(e) => deleteNotification(notif.id, e)}
                                                        title={t('notifications.delete') || 'Delete'}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>

                                            <p className="notif-card-body">{notif.message}</p>

                                            <div className="notif-card-footer">
                                                {!notif.isRead ? (
                                                    <span className="badge-unread-chip">
                                                        {t('notifications.unread') || 'Unread'}
                                                    </span>
                                                ) : (
                                                    <span className="badge-read-chip">
                                                        {t('notifications.read') || 'Read'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
