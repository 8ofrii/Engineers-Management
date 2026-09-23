import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { suppliersAPI } from '../services/api';
import { Package, Plus, Mail, Phone, Edit2, Trash2, Search, Tag } from 'lucide-react';
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
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        try {
            const response = await suppliersAPI.getAll();
            setSuppliers(response.data.data || []);
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

    const filteredSuppliers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return suppliers;
        return suppliers.filter(s => {
            const matchName = (s.name || '').toLowerCase().includes(q);
            const matchCompany = (s.company || '').toLowerCase().includes(q);
            const matchEmail = (s.email || '').toLowerCase().includes(q);
            const matchPhone = (s.phone || '').toLowerCase().includes(q) || (Array.isArray(s.phones) && s.phones.some(p => (p || '').toLowerCase().includes(q)));
            const matchCategory = (s.category || '').toLowerCase().includes(q) ||
                (Array.isArray(s.categories) && s.categories.some(c => (c || '').toLowerCase().includes(q) || (t(`suppliers.categories.${c}`) || '').toLowerCase().includes(q)));
            const matchItems = Array.isArray(s.suppliedItems) && s.suppliedItems.some(item => (item || '').toLowerCase().includes(q));
            return matchName || matchCompany || matchEmail || matchPhone || matchCategory || matchItems;
        });
    }, [suppliers, searchQuery, t]);

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

                {/* Search Bar */}
                {suppliers.length > 0 && (
                    <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '500px' }}>
                        <Search size={18} style={{ position: 'absolute', top: '12px', right: '14px', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('suppliers.placeholders.search', 'بحث باسم المورد أو مجالات التوريد أو الأصناف المحددة...')}
                            style={{
                                width: '100%',
                                padding: '10px 40px 10px 14px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>
                )}

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
                ) : filteredSuppliers.length === 0 ? (
                    <div className="card text-center" style={{ padding: 'var(--spacing-xl)' }}>
                        <p className="text-secondary">لا توجد نتائج مطابقة لبحثك: "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="grid grid-3">
                        {filteredSuppliers.map((supplier) => (
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

                                {/* Multi-Categories Badges */}
                                {(() => {
                                    const cats = Array.isArray(supplier.categories) && supplier.categories.length > 0
                                        ? supplier.categories
                                        : (supplier.category ? [supplier.category] : []);
                                    if (cats.length === 0) return null;
                                    return (
                                        <div className="flex gap-xs mb-sm" style={{ flexWrap: 'wrap' }}>
                                            {cats.map((c, i) => (
                                                <span key={i} className="badge badge-primary" style={{ display: 'inline-block', fontSize: '0.78rem' }}>
                                                    {t(`suppliers.categories.${c}`, c)}
                                                </span>
                                            ))}
                                        </div>
                                    );
                                })()}

                                {/* Supplied Items Tags */}
                                {Array.isArray(supplier.suppliedItems) && supplier.suppliedItems.length > 0 && (
                                    <div className="flex gap-xs mb-md" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                                        <Tag size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                                        {supplier.suppliedItems.map((item, idx) => (
                                            <span
                                                key={idx}
                                                style={{
                                                    background: 'var(--bg-tertiary, rgba(0,0,0,0.04))',
                                                    border: '1px solid var(--border-color)',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-secondary)'
                                                }}
                                            >
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-sm mb-sm text-secondary">
                                    <Mail size={16} />
                                    <span>{supplier.email || '-'}</span>
                                </div>
                                {(() => {
                                    const supplierPhones = Array.isArray(supplier.phones) && supplier.phones.length > 0
                                        ? supplier.phones.filter(Boolean)
                                        : (supplier.phone ? [supplier.phone] : []);
                                    if (supplierPhones.length === 0) return null;
                                    return (
                                        <div className="flex gap-sm text-secondary" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                            <Phone size={16} style={{ marginTop: '3px', flexShrink: 0 }} />
                                            <div className="flex gap-xs" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                                                {supplierPhones.map((p, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={`tel:${p}`}
                                                        style={{
                                                            direction: 'ltr',
                                                            display: 'inline-block',
                                                            color: 'inherit',
                                                            textDecoration: 'none',
                                                            background: 'var(--bg-secondary)',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: 500
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                                    >
                                                        {p}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
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
