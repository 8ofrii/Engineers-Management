import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { suppliersAPI } from '../services/api';
import { Package, Plus, Mail, Phone, Edit2, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import AddSupplierModal from '../components/AddSupplierModal';
import { apiErrorMessage } from '../utils/apiError';

export default function Suppliers() {
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        try {
            const response = await suppliersAPI.getAll();
            setSuppliers(response.data.data);
        } catch (error) {
            console.error('Failed to load suppliers:', error);
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: apiErrorMessage(error, 'Failed to load suppliers.') });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (supplier = null) => {
        setSelectedSupplier(supplier);
        setModalOpen(true);
    };

    const handleSaveSupplier = async (data) => {
        try {
            if (selectedSupplier) {
                await suppliersAPI.update(selectedSupplier.id, data);
                showAlert({ type: 'success', title: t('common.success', 'Success'), message: t('suppliers.success.updated', 'Supplier updated successfully.') });
            } else {
                await suppliersAPI.create(data);
                showAlert({ type: 'success', title: t('common.success', 'Success'), message: t('suppliers.success.created', 'Supplier created successfully.') });
            }
            await loadSuppliers();
        } catch (error) {
            console.error('Failed to save supplier:', error);
            throw error;
        }
    };

    const handleDeleteClick = (supplier) => {
        showAlert({
            type: 'warning',
            title: t('common.deleteConfirmTitle'),
            message: `${t('common.deleteConfirmMessage')} "${supplier.name}"?`,
            showCancel: true,
            confirmText: t('common.delete'),
            onConfirm: async () => {
                try {
                    await suppliersAPI.delete(supplier.id);
                    showAlert({ type: 'success', title: t('common.deleted', 'Deleted'), message: t('suppliers.success.deleted', 'Supplier deleted successfully') });
                    loadSuppliers();
                } catch (error) {
                    console.error('Failed to delete supplier:', error);
                    showAlert({ type: 'error', title: t('common.error', 'Error'), message: apiErrorMessage(error, 'Failed to delete supplier.') });
                }
            }
        });
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
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={20} />
                        {t('suppliers.newSupplier')}
                    </button>
                </div>

                {suppliers.length === 0 ? (
                    <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                        <Package size={64} style={{ margin: '0 auto var(--spacing-lg)', color: 'var(--text-tertiary)' }} />
                        <h3>{t('suppliers.noSuppliers')}</h3>
                        <p className="text-secondary">{t('suppliers.addFirst')}</p>
                        <button className="btn btn-primary mt-lg" onClick={() => handleOpenModal()}>
                            <Plus size={20} />
                            {t('suppliers.newSupplier')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-3">
                        {suppliers.map((supplier) => (
                            <div key={supplier.id} className="card">
                                <div className="flex-between mb-md">
                                    <h3 style={{ margin: 0 }}>{supplier.name}</h3>
                                    <div className="flex gap-sm">
                                        <button
                                            onClick={() => handleOpenModal(supplier)}
                                            className="btn-icon"
                                            style={{ padding: '4px', color: 'var(--text-secondary)' }}
                                            title={t('common.edit')}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(supplier)}
                                            className="btn btn-secondary"
                                            style={{ padding: '4px 8px', color: '#ef4444', borderColor: '#ef4444', background: 'transparent' }}
                                            title={t('common.delete')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <span className="badge badge-primary mb-md" style={{ display: 'inline-block' }}>
                                    {t(`suppliers.categories.${supplier.category}`, supplier.category)}
                                </span>

                                <div className="flex gap-sm mb-sm text-secondary">
                                    <Mail size={16} />
                                    <span>{supplier.email || '-'}</span>
                                </div>
                                <div className="flex gap-sm text-secondary">
                                    <Phone size={16} />
                                    <span>{supplier.phone}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <AddSupplierModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSaveSupplier}
                    initialData={selectedSupplier}
                />
            </div>
        </Layout>
    );
}
