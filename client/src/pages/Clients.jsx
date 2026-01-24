import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { clientsAPI } from '../services/api';
import { Users, Plus, Mail, Phone, Building2, Pencil, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import AddClientModal from '../components/AddClientModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

export default function Clients() {
    const { t } = useTranslation();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);

    // Delete state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState(null);

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        try {
            const response = await clientsAPI.getAll();
            setClients(response.data.data);
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
            } else {
                await clientsAPI.create(clientData);
            }
            loadClients();
        } catch (error) {
            console.error('Failed to save client:', error);
            alert('Failed to save client. Please try again.');
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
            loadClients();
        } catch (error) {
            console.error('Failed to delete client:', error);
            alert('Failed to delete client. Please try again.');
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
                    <div className="grid grid-3">
                        {clients.map((client) => (
                            <div key={client.id} className="card">
                                <div className="flex-between mb-md">
                                    <h3>{client.name}</h3>
                                    <div className="flex gap-sm">
                                        <span className={`badge badge-${client.status === 'active' ? 'success' : 'warning'}`}>
                                            {t(`clients.status.${client.status}`)}
                                        </span>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            style={{ padding: '4px 8px' }}
                                            onClick={() => openEditModal(client)}
                                            title={t('common.edit')}
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            style={{ padding: '4px 8px', color: '#ef4444', borderColor: '#ef4444' }}
                                            onClick={() => handleDeleteClick(client)}
                                            title={t('common.delete')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                {client.company && (
                                    <div className="flex gap-sm mb-sm text-secondary">
                                        <Building2 size={16} />
                                        <span>{client.company}</span>
                                    </div>
                                )}
                                <div className="flex gap-sm mb-sm text-secondary">
                                    <Mail size={16} />
                                    <span>{client.email}</span>
                                </div>
                                <div className="flex gap-sm text-secondary">
                                    <Phone size={16} />
                                    <span>{client.phone}</span>
                                </div>
                            </div>
                        ))}
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
