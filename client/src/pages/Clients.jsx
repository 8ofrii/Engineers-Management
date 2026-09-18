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
    const isArabic = i18n.language === 'ar';
    const [clients, setClients] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);

    // Delete state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState(null);
    const { showAlert } = useAlert();

    useEffect(() => {
        loadClients();
    }, []);

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

    const handleSaveClient = async (clientData) => {
        try {
            if (editingClient) {
                await clientsAPI.update(editingClient.id, clientData);
                showAlert({ type: 'success', title: 'Success', message: 'Client updated successfully.' });
            } else {
                await clientsAPI.create(clientData);
                showAlert({ type: 'success', title: 'Success', message: 'Client created successfully.' });
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
                title: 'Error',
                message: fieldErrors || data?.message || 'Failed to save client. Please try again.'
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
            showAlert({ type: 'success', title: 'Success', message: 'Client deleted successfully.' });
            loadClients();
        } catch (error) {
            console.error('Failed to delete client:', error);
            showAlert({ type: 'error', title: 'Error', message: 'Failed to delete client. Please try again.' });
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
            `}</style>

            <div>
                <div className="flex-between mb-xl">
                    <div>
                        <h1 className="flex gap-md">
                            <Users size={32} />
                            {t('clients.title')}
                        </h1>
                        <p className="text-secondary">{t('clients.subtitle')}</p>
                    </div>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <Plus size={20} />
                        {t('clients.newClient')}
                    </button>
                </div>

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
                ) : (
                    <div className="clients-grid">
                        {clients.map((client) => {
                            const clientPhones = Array.isArray(client.phones) && client.phones.length > 0
                                ? client.phones.filter(Boolean)
                                : (client.phone ? [client.phone] : []);

                            const clientProjects = (Array.isArray(client.projects) && client.projects.length > 0)
                                ? client.projects
                                : projects.filter(p => p.clientId === client.id);

                            return (
                                <div key={client.id} className="card client-card">
                                    {/* 1. Header: Full Name and Status Badge (Buttons moved to bottom!) */}
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
                                        <span className={`badge badge-${client.status?.toLowerCase() === 'active' ? 'success' : 'warning'}`} style={{ flexShrink: 0, fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                                            {t(`clients.status.${client.status?.toLowerCase()}`) || client.status}
                                        </span>
                                    </div>

                                    {/* 2. Face Stats: Phone & Current Project(s) (Email excluded!) */}
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
                                            <FolderKanban size={15} style={{ color: '#10b981', marginTop: '3px', flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                {clientProjects.length > 0 ? (
                                                    <div className="flex flex-col gap-xs">
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                                            {t('clients.currentProject', isArabic ? 'المشروع الحالي:' : 'Current Project:')}
                                                        </div>
                                                        <div className="flex gap-xs flex-wrap">
                                                            {clientProjects.map((proj) => (
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
