import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { suppliersAPI } from '../services/api';
import { Package, Plus, Mail, Phone } from 'lucide-react';
import Layout from '../components/Layout';

export default function Suppliers() {
    const { t } = useTranslation();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        try {
            const response = await suppliersAPI.getAll();
            setSuppliers(response.data.data);
        } catch (error) {
            console.error('Failed to load suppliers:', error);
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
                            <Package size={32} />
                            {t('suppliers.title')}
                        </h1>
                        <p className="text-secondary">{t('suppliers.subtitle')}</p>
                    </div>
                    <button className="btn btn-primary">
                        <Plus size={20} />
                        {t('suppliers.newSupplier')}
                    </button>
                </div>

                {suppliers.length === 0 ? (
                    <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                        <Package size={64} style={{ margin: '0 auto var(--spacing-lg)', color: 'var(--text-tertiary)' }} />
                        <h3>{t('suppliers.noSuppliers')}</h3>
                        <p className="text-secondary">{t('suppliers.addFirst')}</p>
                        <button className="btn btn-primary mt-lg">
                            <Plus size={20} />
                            {t('suppliers.newSupplier')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-3">
                        {suppliers.map((supplier) => (
                            <div key={supplier._id} className="card">
                                <div className="flex-between mb-md">
                                    <h3>{supplier.name}</h3>
                                    <span className="badge badge-primary">{supplier.category}</span>
                                </div>
                                <div className="flex gap-sm mb-sm text-secondary">
                                    <Mail size={16} />
                                    <span>{supplier.email}</span>
                                </div>
                                <div className="flex gap-sm text-secondary">
                                    <Phone size={16} />
                                    <span>{supplier.phone}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
