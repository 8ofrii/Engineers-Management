import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { suppliersAPI } from '../services/api';
import { Package, Plus, Mail, Phone, Pencil, Trash2, Search, Tag, Building2 } from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import AddSupplierModal from '../components/AddSupplierModal';
import { apiErrorMessage } from '../utils/apiError';

export default function Suppliers() {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
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
            <style>{`
                .suppliers-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: var(--spacing-lg);
                }
                @media (max-width: 1100px) {
                    .suppliers-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
                @media (max-width: 650px) {
                    .suppliers-grid {
                        grid-template-columns: 1fr;
                    }
                }

                .supplier-card {
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
                .supplier-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                }

                .supplier-card-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 14px;
                }
                .supplier-card-name {
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    line-height: 1.35;
                    margin: 0;
                    word-break: break-word;
                }
                .supplier-card-company {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-top: 4px;
                }

                .supplier-card-stats {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 16px;
                    flex: 1;
                }

                .supplier-stat-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                }

                .supplier-category-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 10px;
                    border-radius: 9999px;
                    font-size: 0.72rem;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                    line-height: 1;
                    background: rgba(255, 90, 31, 0.12);
                    border: 1px solid rgba(255, 90, 31, 0.28);
                    color: var(--color-primary, #ff5a1f);
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                body.light-mode .supplier-category-badge {
                    background: rgba(194, 65, 12, 0.1);
                    border-color: rgba(194, 65, 12, 0.25);
                    color: #c2410c;
                }

                .supplier-category-chip {
                    display: inline-flex;
                    align-items: center;
                    padding: 2px 8px;
                    border-radius: 9999px;
                    font-size: 0.72rem;
                    font-weight: 600;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border-color);
                    color: var(--text-secondary);
                }

                .supplier-item-tag {
                    display: inline-flex;
                    align-items: center;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border-color);
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .supplier-phone-pill {
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
                .supplier-phone-pill:hover {
                    background: rgba(255, 255, 255, 0.12);
                    border-color: rgba(255, 255, 255, 0.22);
                }
                body.light-mode .supplier-phone-pill {
                    background: var(--bg-tertiary);
                    border-color: var(--border-color);
                    color: var(--text-primary);
                }
                body.light-mode .supplier-phone-pill:hover {
                    background: var(--bg-primary);
                    border-color: var(--border-color-light);
                }

                .supplier-email-link {
                    font-size: 0.82rem;
                    color: var(--text-secondary);
                    text-decoration: none;
                    word-break: break-all;
                    transition: color 0.15s ease;
                }
                .supplier-email-link:hover {
                    color: var(--text-primary);
                    text-decoration: underline;
                }

                .supplier-card-footer {
                    margin-top: auto;
                    padding-top: 14px;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 8px;
                }
                .supplier-action-btn {
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
                .supplier-action-btn:hover {
                    color: var(--text-primary);
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.2);
                }
                .supplier-action-btn.delete {
                    color: #f87171;
                    border-color: rgba(239, 68, 68, 0.25);
                    background: rgba(239, 68, 68, 0.05);
                }
                .supplier-action-btn.delete:hover {
                    background: rgba(239, 68, 68, 0.15);
                    border-color: rgba(239, 68, 68, 0.45);
                    color: #ef4444;
                }
                body.light-mode .supplier-action-btn {
                    border-color: var(--border-color);
                    background: var(--bg-tertiary);
                    color: var(--text-secondary);
                }
                body.light-mode .supplier-action-btn:hover {
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    border-color: var(--border-color-light);
                }
                body.light-mode .supplier-action-btn.delete {
                    color: #dc2626;
                    border-color: rgba(220, 38, 38, 0.28);
                    background: rgba(220, 38, 38, 0.06);
                }
                body.light-mode .supplier-action-btn.delete:hover {
                    background: rgba(220, 38, 38, 0.12);
                    border-color: rgba(220, 38, 38, 0.5);
                }
            `}</style>

            <div>
                <div className="flex-between mb-xl flex-wrap gap-md">
                    <div>
                        <h1 className="flex gap-md items-center">
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
                        <Search
                            size={18}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                [isArabic ? 'right' : 'left']: '14px',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-tertiary)',
                                pointerEvents: 'none'
                            }}
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('suppliers.placeholders.search', isArabic ? 'بحث باسم المورد أو مجالات التوريد أو الأصناف المحددة...' : 'Search by supplier name, categories, or items...')}
                            style={{
                                width: '100%',
                                padding: isArabic ? '10px 42px 10px 14px' : '10px 14px 10px 42px',
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
                        <p className="text-secondary">{isArabic ? `لا توجد نتائج مطابقة لبحثك: "${searchQuery}"` : `No results matching: "${searchQuery}"`}</p>
                    </div>
                ) : (
                    <div className="suppliers-grid">
                        {filteredSuppliers.map((supplier) => {
                            const cats = Array.isArray(supplier.categories) && supplier.categories.length > 0
                                ? supplier.categories
                                : (supplier.category ? [supplier.category] : []);

                            const supplierPhones = Array.isArray(supplier.phones) && supplier.phones.length > 0
                                ? supplier.phones.filter(Boolean)
                                : (supplier.phone ? [supplier.phone] : []);

                            return (
                                <div key={supplier.id} className="card supplier-card">
                                    {/* 1. Header: Name, Company, Primary Category Badge */}
                                    <div className="supplier-card-header">
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 className="supplier-card-name" title={supplier.name}>
                                                {supplier.name}
                                            </h3>
                                            {supplier.company && (
                                                <div className="supplier-card-company">
                                                    <Building2 size={13} style={{ flexShrink: 0 }} />
                                                    <span className="truncate">{supplier.company}</span>
                                                </div>
                                            )}
                                        </div>
                                        {cats.length > 0 && (
                                            <span
                                                className="supplier-category-badge"
                                                title={cats.map(c => t(`suppliers.categories.${c}`, c)).join(', ')}
                                            >
                                                {t(`suppliers.categories.${cats[0]}`, cats[0])}
                                                {cats.length > 1 && ` +${cats.length - 1}`}
                                            </span>
                                        )}
                                    </div>

                                    {/* 2. Body Details: Additional Category Chips, Supplied Items, Phone, Email */}
                                    <div className="supplier-card-stats">
                                        {/* Multi-Categories chips if more than 1 */}
                                        {cats.length > 1 && (
                                            <div className="flex gap-xs flex-wrap items-center">
                                                {cats.slice(1).map((c, i) => (
                                                    <span key={i} className="supplier-category-chip">
                                                        {t(`suppliers.categories.${c}`, c)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Supplied Items Tags */}
                                        {Array.isArray(supplier.suppliedItems) && supplier.suppliedItems.length > 0 && (
                                            <div className="flex gap-xs items-center flex-wrap" style={{ fontSize: '0.78rem' }}>
                                                <Tag size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                                                {supplier.suppliedItems.map((item, idx) => (
                                                    <span key={idx} className="supplier-item-tag">
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Phone Numbers */}
                                        {supplierPhones.length > 0 && (
                                            <div className="supplier-stat-row">
                                                <Phone size={15} style={{ color: 'var(--text-tertiary)', marginTop: '3px', flexShrink: 0 }} />
                                                <div className="flex gap-xs flex-wrap items-center">
                                                    {supplierPhones.map((p, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={`tel:${p}`}
                                                            className="supplier-phone-pill"
                                                            title={isArabic ? 'اتصال بالهاتف' : 'Call phone'}
                                                        >
                                                            {p}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Email (only if present, no empty '-') */}
                                        {supplier.email && supplier.email.trim() && (
                                            <div className="supplier-stat-row">
                                                <Mail size={15} style={{ color: 'var(--text-tertiary)', marginTop: '3px', flexShrink: 0 }} />
                                                <a
                                                    href={`mailto:${supplier.email}`}
                                                    className="supplier-email-link"
                                                    title={supplier.email}
                                                >
                                                    {supplier.email}
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Card Footer: Bottom Action Buttons */}
                                    <div className="supplier-card-footer">
                                        <button
                                            className="supplier-action-btn edit"
                                            onClick={() => handleOpenModal(supplier)}
                                            title={t('common.edit')}
                                        >
                                            <Pencil size={13} />
                                            <span>{t('common.edit', 'Edit')}</span>
                                        </button>
                                        <button
                                            className="supplier-action-btn delete"
                                            onClick={() => handleDeleteClick(supplier)}
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
