import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { clientsAPI } from '../services/api';
import { Users, Plus, Mail, Phone, Building2 } from 'lucide-react';
import Layout from '../components/Layout';

export default function Clients() {
    const { t } = useTranslation();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

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
                    <button className="btn btn-primary">
                        <Plus size={20} />
                        {t('clients.newClient')}
                    </button>
                </div>

                {clients.length === 0 ? (
                    <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                        <Users size={64} style={{ margin: '0 auto var(--spacing-lg)', color: 'var(--text-tertiary)' }} />
                        <h3>{t('clients.noClients')}</h3>
                        <p className="text-secondary">{t('clients.addFirst')}</p>
                        <button className="btn btn-primary mt-lg">
                            <Plus size={20} />
                            {t('clients.newClient')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-3">
                        {clients.map((client) => (
                            <div key={client._id} className="card">
                                <div className="flex-between mb-md">
                                    <h3>{client.name}</h3>
                                    <span className={`badge badge-${client.status === 'active' ? 'success' : 'warning'}`}>
                                        {t(`clients.status.${client.status}`)}
                                    </span>
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
        </Layout>
    );
}
