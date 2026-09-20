import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../context/AlertContext';
import { clientsAPI, projectsAPI } from '../services/api';
import { Users, Plus, Phone, Building2, Pencil, Trash2, FolderKanban } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import AddClientModal from '../components/AddClientModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

export default function Clients() {
    const { t, i18n } = useTranslation();
    const { showAlert } = useAlert();
    const isArabic = i18n.language === 'ar';
    const [clients, setClients] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState(null);
    const [editingClient, setEditingClient] = useState(null);

    // Status filter
    const [statusFilter, setStatusFilter] = useState('ALL');

    const loadClients = async () => {
        try {
            const [clientsRes, projectsRes] = await Promise.allSettled([
                clientsAPI.getAll(),
                projectsAPI.getAll()
            ]);
            if (clientsRes.status === 'fulfilled') {
                setClients(clientsRes.value.data.data || []);
            }
            if (projectsRes.status === 'fulfilled') {
                setProjects(projectsRes.value.data.data || []);
            }
        } catch (error) {
            console.error('Failed to load clients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClients();
    }, []);


    const handleSaveClient = async (clientData) => {
        try {
            if (editingClient) {
                await clientsAPI.update(editingClient.id, clientData);
                showAlert({ type: 'success', title: isArabic ? 'تم بنجاح' : 'Success', message: isArabic ? 'تم تعديل العميل بنجاح.' : 'Client updated successfully.' });
            } else {
                await clientsAPI.create(clientData);
                showAlert({ type: 'success', title: isArabic ? 'تم بنجاح' : 'Success', message: isArabic ? 'تمت إضافة العميل بنجاح.' : 'Client created successfully.' });
            }
            loadClients();
        } catch (error) {
            console.error('Failed to save client:', error);
            const data = error.response?.data;
            const fieldErrors = Array.isArray(data?.errors) && data.errors.length
                ? data.errors.map(e => `${e.path}: ${e.message}`).join('\n')
                : null;
            showAlert({
                type: 'error',
                title: isArabic ? 'خطأ' : 'Error',
                message: fieldErrors || data?.message || (isArabic ? 'فشل حفظ العميل. يرجى المحاولة مرة أخرى.' : 'Failed to save client. Please try again.')
            });
        }
    };

    const handleDeleteClick = (client) => {
        setClientToDelete(client);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!clientToDelete) return;
        try {
            await clientsAPI.delete(clientToDelete.id);
            showAlert({ type: 'success', title: isArabic ? 'تم بنجاح' : 'Success', message: isArabic ? 'تم حذف العميل بنجاح.' : 'Client deleted successfully.' });
            loadClients();
        } catch (error) {
            console.error('Failed to delete client:', error);
            showAlert({ type: 'error', title: isArabic ? 'خطأ' : 'Error', message: isArabic ? 'فشل حذف العميل. يرجى المحاولة مرة أخرى.' : 'Failed to delete client. Please try again.' });
        } finally {
            setClientToDelete(null);
        }
    };

    const openCreateModal = () => {
        setEditingClient(null);
        setIsModalOpen(true);
    };

    const openEditModal = (client) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex-center" style={{ minHeight: '60vh' }}>
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    const getClientIsActive = (client) => {
        const clientProjects = (Array.isArray(client.projects) && client.projects.length > 0)
            ? client.projects
            : projects.filter(p => p.clientId === client.id);
        return clientProjects.some(p => ['PLANNING', 'IN_PROGRESS', 'ON_HOLD'].includes(p.status));
    };

    const activeCount = clients.filter(getClientIsActive).length;
    const inactiveCount = clients.length - activeCount;

    const filteredClients = clients.filter(c => {
        if (statusFilter === 'ALL') return true;
        const isActive = getClientIsActive(c);
        return statusFilter === 'ACTIVE' ? isActive : !isActive;
    });

    return (
        <Layout>
            <style>{`
                .clients-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: var(--spacing-lg);
                }
                @media (max-width: 1100px) {
                    .clients-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
                @media (max-width: 650px) {
                    .clients-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .client-card {
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 20px;
                    min-height: 220px;
                    border-radius: 12px;
                    background: var(--bg-card, #141416);
                    border: 1px solid var(--border-color);
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                }
                .client-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
                }
                .client-card-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 16px;
                }
                .client-card-name {
                    font-size: 1.18rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    line-height: 1.35;
                    margin: 0;
                    word-break: break-word;
                }
                .client-card-company {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-top: 4px;
                }
                .client-card-stats {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    margin-bottom: 18px;
                    flex: 1;
                }
                .client-stat-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                }
                .client-phone-pill {
                    display: inline-block;
                    direction: ltr;
                    unicode-bidi: isolate;
                    color: var(--text-primary);
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 3px 10px;
                    border-radius: 6px;
                    font-size: 0.82rem;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.15s ease;
                }
                .client-phone-pill:hover {
                    background: rgba(255, 255, 255, 0.12);
                    border-color: rgba(255, 255, 255, 0.22);
                }
                body.light-mode .client-phone-pill {
                    background: #f1f5f9;
                    border-color: #cbd5e1;
                    color: #0f172a;
                }
                body.light-mode .client-phone-pill:hover {
                    background: #e2e8f0;
                }
                .client-project-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 6px;
                    background: rgba(16, 185, 129, 0.12);
                    border: 1px solid rgba(16, 185, 129, 0.28);
                    color: #34d399;
                    font-size: 0.82rem;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.15s ease;
                }
                .client-project-pill:hover {
                    background: rgba(16, 185, 129, 0.22);
                    border-color: rgba(16, 185, 129, 0.45);
                    transform: translateY(-1px);
                }
                body.light-mode .client-project-pill {
                    background: #ecfdf5;
                    border-color: #a7f3d0;
                    color: #065f46;
                }
                body.light-mode .client-project-pill:hover {
                    background: #d1fae5;
                }
                .client-card-footer {
                    margin-top: auto;
                    padding-top: 14px;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 8px;
                }
                .client-action-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 14px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    border-radius: 6px;
                    border: 1px solid var(--border-color);
                    background: rgba(255, 255, 255, 0.03);
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .client-action-btn:hover {
                    color: var(--text-primary);
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.2);
                }
                .client-action-btn.delete {
                    color: #f87171;
                    border-color: rgba(239, 68, 68, 0.25);
                    background: rgba(239, 68, 68, 0.05);
                }
                .client-action-btn.delete:hover {
                    background: rgba(239, 68, 68, 0.15);
                    border-color: rgba(239, 68, 68, 0.45);
                    color: #ef4444;
                }
                body.light-mode .client-action-btn {
                    border-color: #cbd5e1;
                    background: #f8fafc;
                    color: #475569;
                }
                body.light-mode .client-action-btn:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }
                body.light-mode .client-action-btn.delete {
                    color: #dc2626;
                    border-color: #fca5a5;
                    background: #fef2f2;
                }
                body.light-mode .client-action-btn.delete:hover {
                    background: #fee2e2;
                }

                .status-indicator-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    display: inline-block;
                    flex-shrink: 0;
                }
                .status-indicator-dot.active {
                    background-color: #10b981;
                    box-shadow: 0 0 6px rgba(16, 185, 129, 0.7);
                }
                .status-indicator-dot.inactive {
                    background-color: #94a3b8;
                }

                .client-static-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 9999px;
                    font-size: 0.72rem;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                    line-height: 1;
                    flex-shrink: 0;
                    user-select: none;
                }
                .client-static-badge.active {
                    background: rgba(16, 185, 129, 0.12);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    color: #34d399;
                }
                .client-static-badge.inactive {
                    background: rgba(148, 163, 184, 0.1);
                    border: 1px solid rgba(148, 163, 184, 0.25);
                    color: #94a3b8;
                }
                body.light-mode .client-static-badge.active {
                    background: #ecfdf5;
                    border-color: #a7f3d0;
                    color: #065f46;
                }
                body.light-mode .client-static-badge.inactive {
                    background: #f1f5f9;
                    border-color: #cbd5e1;
                    color: #475569;
                }

                /* Filter Bar */
                .client-filter-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }
                .client-filter-tabs {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(255, 255, 255, 0.03);
                    padding: 4px;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                }
                body.light-mode .client-filter-tabs {
                    background: #f8fafc;
                    border-color: #e2e8f0;
                }
                .filter-tab {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    background: transparent;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .filter-tab:hover {
                    color: var(--text-primary);
                }
                .filter-tab.active {
                    background: var(--bg-card, #27272a);
                    color: var(--text-primary);
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
                }
                body.light-mode .filter-tab.active {
                    background: #ffffff;
                    color: #0f172a;
                    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
                }
                .filter-count {
                    display: inline-block;
                    padding: 1px 6px;
                    border-radius: 9999px;
                    font-size: 0.7rem;
                    background: rgba(255, 255, 255, 0.08);
                }
                body.light-mode .filter-count {
                    background: #e2e8f0;
                }

                .client-project-pill.completed {
                    background: rgba(148, 163, 184, 0.1);
                    border-color: rgba(148, 163, 184, 0.25);
                    color: #94a3b8;
                }
                body.light-mode .client-project-pill.completed {
                    background: #f1f5f9;
                    border-color: #cbd5e1;
                    color: #64748b;
                }

            `}</style>

            <div>
                <div className="flex-between mb-lg" style={{ flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 className="flex gap-md">
                            <Users size={32} />
                            {t('clients.title')}
                        </h1>
                        <p className="text-secondary">{t('clients.subtitle')}</p>
                    </div>
                    <div>
                        <button className="btn btn-primary" onClick={openCreateModal}>
                            <Plus size={20} />
                            {t('clients.newClient')}
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                {clients.length > 0 && (
                    <div className="client-filter-bar">
                        <div className="client-filter-tabs">
                            <button
                                type="button"
                                className={`filter-tab ${statusFilter === 'ALL' ? 'active' : ''}`}
                                onClick={() => setStatusFilter('ALL')}
                            >
                                {t('clients.filterAll', isArabic ? 'الكل' : 'All')}
                                <span className="filter-count">{clients.length}</span>
                            </button>
                            <button
                                type="button"
                                className={`filter-tab ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
                                onClick={() => setStatusFilter('ACTIVE')}
                            >
                                <span className="status-indicator-dot active" />
                                {t('clients.filterActive', isArabic ? 'النشطون' : 'Active')}
                                <span className="filter-count">{activeCount}</span>
                            </button>
                            <button
                                type="button"
                                className={`filter-tab ${statusFilter === 'INACTIVE' ? 'active' : ''}`}
                                onClick={() => setStatusFilter('INACTIVE')}
                            >
                                <span className="status-indicator-dot inactive" />
                                {t('clients.filterInactive', isArabic ? 'غير النشطين' : 'Inactive')}
                                <span className="filter-count">{inactiveCount}</span>
                            </button>
                        </div>
                    </div>
                )}

                {clients.length === 0 ? (
                    <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                        <Users size={64} style={{ margin: '0 auto var(--spacing-lg)', color: 'var(--text-tertiary)' }} />
                        <h3>{t('clients.noClients')}</h3>
                        <p className="text-secondary">{t('clients.addFirst')}</p>
                        <button className="btn btn-primary mt-lg" onClick={openCreateModal}>
                            <Plus size={20} />
                            {t('clients.newClient')}
                        </button>
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                        <Users size={48} style={{ margin: '0 auto var(--spacing-md)', color: 'var(--text-tertiary)' }} />
                        <h3>{isArabic ? 'لا توجد نتائج مطابقة' : 'No matching clients'}</h3>
                        <p className="text-secondary">
                            {isArabic ? 'لا يوجد عملاء بالحالة المحددة.' : 'There are no clients with the selected status filter.'}
                        </p>
                        <button className="btn btn-secondary mt-md" onClick={() => setStatusFilter('ALL')}>
                            {isArabic ? 'عرض كل العملاء' : 'View all clients'}
                        </button>
                    </div>
                ) : (
                    <div className="clients-grid">
                        {filteredClients.map((client) => {
                            const normStatus = (client.status || 'INACTIVE').toUpperCase();

                            const clientPhones = Array.isArray(client.phones) && client.phones.length > 0
                                ? client.phones.filter(Boolean)
                                : (client.phone ? [client.phone] : []);

                            const clientProjects = (Array.isArray(client.projects) && client.projects.length > 0)
                                ? client.projects
                                : projects.filter(p => p.clientId === client.id);

                            const activeProjects = clientProjects.filter(p => ['PLANNING', 'IN_PROGRESS', 'ON_HOLD'].includes(p.status));
                            const completedProjects = clientProjects.filter(p => p.status === 'COMPLETED' || p.status === 'CANCELLED');
                            const isActive = activeProjects.length > 0;

                            return (
                                <div key={client.id} className="card client-card">
                                    {/* 1. Header: Full Name and Status Badge */}
                                    <div className="client-card-header">
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 className="client-card-name" title={client.name}>
                                                {client.name}
                                            </h3>
                                            {client.company && (
                                                <div className="client-card-company">
                                                    <Building2 size={13} style={{ flexShrink: 0 }} />
                                                    <span className="truncate">{client.company}</span>
                                                </div>
                                            )}
                                        </div>

                                        <span className={`client-static-badge ${isActive ? 'active' : 'inactive'}`}>
                                            <span className={`status-indicator-dot ${isActive ? 'active' : 'inactive'}`} />
                                            <span>
                                                {isActive
                                                    ? (isArabic ? 'نشط' : 'Active')
                                                    : (isArabic ? 'غير نشط' : 'Inactive')}
                                            </span>
                                        </span>
                                    </div>

                                    {/* 2. Face Stats: Phone & Current Project(s) */}
                                    <div className="client-card-stats">
                                        {/* Phone Numbers */}
                                        <div className="client-stat-row">
                                            <Phone size={15} style={{ color: 'var(--text-tertiary)', marginTop: '3px', flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                {clientPhones.length > 0 ? (
                                                    <div className="flex gap-xs flex-wrap items-center">
                                                        {clientPhones.map((p, idx) => (
                                                            <a
                                                                key={idx}
                                                                href={`tel:${p}`}
                                                                className="client-phone-pill"
                                                                title={isArabic ? 'اتصال بالهاتف' : 'Call phone'}
                                                            >
                                                                {p}
                                                            </a>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                                                        {isArabic ? 'لا يوجد هاتف' : 'No phone'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Current Project(s) Assigned/Belonging to Client */}
                                        <div className="client-stat-row">
                                            <FolderKanban
                                                size={15}
                                                style={{
                                                    color: activeProjects.length > 0 ? '#10b981' : 'var(--text-tertiary)',
                                                    marginTop: '3px',
                                                    flexShrink: 0
                                                }}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                {activeProjects.length > 0 ? (
                                                    <div className="flex flex-col gap-xs">
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                                            {t('clients.currentProject', isArabic ? 'المشروع الحالي:' : 'Current Project:')}
                                                        </div>
                                                        <div className="flex gap-xs flex-wrap">
                                                            {activeProjects.map((proj) => (
                                                                <Link
                                                                    key={proj.id}
                                                                    to={`/projects/${proj.id}`}
                                                                    className="client-project-pill"
                                                                    title={proj.name}
                                                                >
                                                                    <span className="truncate" style={{ maxWidth: '200px' }}>
                                                                        {proj.name}
                                                                    </span>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : completedProjects.length > 0 ? (
                                                    <div className="flex flex-col gap-xs">
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                                            {isArabic ? 'المشاريع السابقة:' : 'Past Projects:'}
                                                        </div>
                                                        <div className="flex gap-xs flex-wrap">
                                                            {completedProjects.map((proj) => (
                                                                <Link
                                                                    key={proj.id}
                                                                    to={`/projects/${proj.id}`}
                                                                    className="client-project-pill completed"
                                                                    title={proj.name}
                                                                >
                                                                    <span className="truncate" style={{ maxWidth: '200px' }}>
                                                                        {proj.name}
                                                                    </span>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '2px' }}>
                                                            {t('clients.currentProject', isArabic ? 'المشروع الحالي:' : 'Current Project:')}
                                                        </div>
                                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                                            {t('clients.noProject', isArabic ? 'لا يوجد مشروع حالي' : 'No current project')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Bottom of the Box: Edit & Delete Buttons */}
                                    <div className="client-card-footer">
                                        <button
                                            className="client-action-btn edit"
                                            onClick={() => openEditModal(client)}
                                            title={t('common.edit')}
                                        >
                                            <Pencil size={13} />
                                            <span>{t('common.edit', 'Edit')}</span>
                                        </button>
                                        <button
                                            className="client-action-btn delete"
                                            onClick={() => handleDeleteClick(client)}
                                            title={t('common.delete')}
                                        >
                                            <Trash2 size={13} />
                                            <span>{t('common.delete', 'Delete')}</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <AddClientModal
                isOpen={isModalOpen}
                initialData={editingClient}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSaveClient}
            />

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                itemName={clientToDelete?.name}
                title={t('common.deleteConfirmTitle')}
                message={t('common.deleteConfirmMessage')}
            />
        </Layout>
    );
}
