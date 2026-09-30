import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { suppliersAPI, projectsAPI, transactionsAPI } from '../services/api';
import { Package, Plus, Mail, Phone, Pencil, Trash2, Search, Tag, Building2, Wallet, ChevronDown, X } from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import AddSupplierModal from '../components/AddSupplierModal';
import { apiErrorMessage } from '../utils/apiError';
import { useFormat, getLocalizedName, getLocalizedSubName } from '../utils/format';

export default function Suppliers() {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar' || i18n.language?.startsWith('ar');
    const { showAlert } = useAlert();
    const { currency: formatCurrency } = useFormat();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const [filterProjectId, setFilterProjectId] = useState('ALL');
    const [projects, setProjects] = useState([]);
    const [supplierProjectMap, setSupplierProjectMap] = useState({}); // supplierId -> Set of projectIds
    const filterRef = useRef(null);

    useEffect(() => {
        loadSuppliers();
        loadProjects();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
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

    const loadProjects = async () => {
        try {
            const [projRes, txRes] = await Promise.all([
                projectsAPI.getAll(),
                transactionsAPI.getAll()
            ]);
            setProjects(projRes.data.data || []);
            // Build a map: supplierId -> [projectId]
            const map = {};
            (txRes.data.data || []).forEach(tx => {
                if (tx.supplierId && tx.projectId) {
                    if (!map[tx.supplierId]) map[tx.supplierId] = new Set();
                    map[tx.supplierId].add(tx.projectId);
                }
            });
            setSupplierProjectMap(map);
        } catch (e) {
            console.error('Failed to load projects or transactions mapping:', e);
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
            message: `${t('common.deleteConfirmMessage')} "${getLocalizedName(supplier, isArabic)}"?`,
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

    // Toggle category filter
    const toggleCategory = (cat) => {
        if (cat === 'ALL') {
            setSelectedCategories([]);
        } else {
            setSelectedCategories(prev =>
                prev.includes(cat)
                    ? prev.filter(c => c !== cat)
                    : [...prev, cat]
            );
        }
    };

    // Dynamic category list
    const baseCategories = [
        'CONCRETE', 'STEEL', 'CEMENT', 'BRICKS', 'SAND',
        'ELECTRICAL', 'PLUMBING', 'PAINT', 'WOOD', 'TOOLS',
        'MATERIALS', 'EQUIPMENT', 'SERVICES', 'LABOR', 'OTHER'
    ];

    const customCategories = Array.from(new Set(
        suppliers
            .filter(s => s.category === 'OTHER' && s.customCategory)
            .map(s => s.customCategory.trim().toUpperCase())
    ));

    const categoryList = ['ALL', ...baseCategories, ...customCategories];

    const filteredSuppliers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return suppliers.filter(s => {
            // Project filter
            const projMatch = filterProjectId === 'ALL' ||
                (supplierProjectMap[s.id] && supplierProjectMap[s.id].has(filterProjectId)) ||
                (Array.isArray(s.transactions) && s.transactions.some(t => t.projectId === filterProjectId));

            // Category filter
            const sCats = Array.isArray(s.categories) && s.categories.length > 0
                ? s.categories
                : (s.category ? [s.category] : []);
            
            const catMatch = selectedCategories.length === 0 ||
                sCats.some(c => selectedCategories.includes(c)) ||
                (s.category === 'OTHER' && s.customCategory && selectedCategories.includes(s.customCategory.trim().toUpperCase()));

            // Search query
            let searchMatch = true;
            if (q) {
                const matchName = (s.name || '').toLowerCase().includes(q) || (s.nameAr || '').toLowerCase().includes(q);
                const matchCompany = (s.company || '').toLowerCase().includes(q);
                const matchEmail = (s.email || '').toLowerCase().includes(q);
                const matchPhone = (s.phone || '').toLowerCase().includes(q) || (Array.isArray(s.phones) && s.phones.some(p => (p || '').toLowerCase().includes(q)));
                const matchCategory = (s.category || '').toLowerCase().includes(q) ||
                    (Array.isArray(s.categories) && s.categories.some(c => (c || '').toLowerCase().includes(q) || (t(`suppliers.categories.${c}`) || '').toLowerCase().includes(q)));
                const matchItems = Array.isArray(s.suppliedItems) && s.suppliedItems.some(item => (item || '').toLowerCase().includes(q));
                searchMatch = matchName || matchCompany || matchEmail || matchPhone || matchCategory || matchItems;
            }

            return projMatch && catMatch && searchMatch;
        });
    }, [suppliers, searchQuery, filterProjectId, selectedCategories, supplierProjectMap, t]);

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
                    min-height: 240px;
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
                .supplier-card-subname {
                    display: block;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-top: 3px;
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

                .supplier-kpi-box {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(16, 185, 129, 0.08);
                    border: 1px solid rgba(16, 185, 129, 0.22);
                    border-radius: 8px;
                    padding: 8px 12px;
                    margin-top: 4px;
                }
                body.light-mode .supplier-kpi-box {
                    background: rgba(16, 185, 129, 0.07);
                    border-color: rgba(16, 185, 129, 0.25);
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

                {/* Filters Row: Project Filter + Category Filter + Search Input */}
                <div className="mb-lg flex gap-md flex-wrap" style={{ alignItems: 'flex-end' }}>
                    {/* 1. Project filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', flex: '1 1 220px', maxWidth: '300px' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {isArabic ? 'المشروع' : 'Project'}
                        </label>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <select
                                value={filterProjectId}
                                onChange={e => setFilterProjectId(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '42px',
                                    padding: isArabic ? '0 14px 0 36px' : '0 36px 0 14px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    outline: 'none',
                                    cursor: 'pointer',
                                    appearance: 'none',
                                    WebkitAppearance: 'none'
                                }}
                            >
                                <option value="ALL">{isArabic ? 'جميع المشاريع' : 'All Projects'}</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {getLocalizedName(p, isArabic)}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} style={{
                                position: 'absolute',
                                [isArabic ? 'left' : 'right']: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                                color: 'var(--text-secondary)'
                            }} />
                        </div>
                    </div>

                    {/* 2. Category filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', flex: '1 1 220px', maxWidth: '300px', position: 'relative' }} ref={filterRef}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {isArabic ? 'المجال / الفئة' : 'Category / Field'}
                        </label>
                        <div 
                            style={{ 
                                width: '100%',
                                height: '42px',
                                padding: isArabic ? '0 14px 0 36px' : '0 36px 0 14px',
                                border: '1px solid var(--border-color)', 
                                borderRadius: '10px', 
                                background: 'var(--bg-tertiary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: '0.9rem',
                                boxSizing: 'border-box',
                                position: 'relative'
                            }}
                            onClick={(e) => {
                                if (!e.target.closest('.chip-remove')) {
                                    setIsFilterDropdownOpen(!isFilterDropdownOpen);
                                }
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1
                            }}>
                                {selectedCategories.length === 0 ? (
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                        {isArabic ? 'جميع المجالات والفئات' : 'All Categories'}
                                    </span>
                                ) : selectedCategories.length === 1 ? (
                                    <span 
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '2px 8px',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: 600
                                        }}
                                    >
                                        {baseCategories.includes(selectedCategories[0]) ? t(`suppliers.categories.${selectedCategories[0]}`, selectedCategories[0]) : selectedCategories[0]}
                                        <span 
                                            className="chip-remove"
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                cursor: 'pointer', 
                                                opacity: 0.7
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleCategory(selectedCategories[0]);
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                            onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                                        >
                                            <X size={11} />
                                        </span>
                                    </span>
                                ) : (
                                    <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '13px' }}>
                                        {isArabic ? `${selectedCategories.length} فئات محددة` : `${selectedCategories.length} categories selected`}
                                    </span>
                                )}
                            </div>
                            <ChevronDown size={16} style={{
                                position: 'absolute',
                                [isArabic ? 'left' : 'right']: '12px',
                                top: '50%',
                                transform: isFilterDropdownOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
                                transition: 'transform 0.2s',
                                color: 'var(--text-secondary)',
                                pointerEvents: 'none'
                            }} />
                        </div>

                        {isFilterDropdownOpen && (
                            <div 
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: '4px',
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    boxShadow: 'var(--shadow-md, 0 8px 24px rgba(0,0,0,0.25))',
                                    zIndex: 100,
                                    maxHeight: '300px',
                                    overflowY: 'auto'
                                }}
                            >
                                {categoryList.map(cat => {
                                    const isActive = cat === 'ALL'
                                        ? selectedCategories.length === 0
                                        : selectedCategories.includes(cat);
                                    
                                    return (
                                        <div 
                                            key={cat}
                                            onClick={() => {
                                                toggleCategory(cat);
                                            }}
                                            style={{
                                                padding: '10px 16px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                borderBottom: '1px solid var(--border-color)',
                                                background: isActive ? 'var(--bg-tertiary)' : 'transparent'
                                            }}
                                        >
                                            <input 
                                                type="checkbox" 
                                                checked={isActive}
                                                onChange={() => {}}
                                                style={{ pointerEvents: 'none' }}
                                            />
                                            <span style={{ fontSize: '0.88rem' }}>
                                                {cat === 'ALL' 
                                                    ? (isArabic ? 'جميع المجالات والفئات' : 'All Categories') 
                                                    : (baseCategories.includes(cat) ? t(`suppliers.categories.${cat}`, cat) : cat)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 3. Search Bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 240px', minWidth: '220px' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {isArabic ? 'البحث السريع' : 'Search'}
                        </label>
                        <div style={{ position: 'relative', width: '100%' }}>
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
                                placeholder={t('suppliers.placeholders.search', isArabic ? 'بحث باسم المورد أو الأصناف...' : 'Search by name or items...')}
                                style={{
                                    width: '100%',
                                    height: '42px',
                                    padding: isArabic ? '0 42px 0 14px' : '0 14px 0 42px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>
                    </div>
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
                ) : filteredSuppliers.length === 0 ? (
                    <div className="card text-center" style={{ padding: 'var(--spacing-xl)' }}>
                        <p className="text-secondary">
                            {isArabic 
                                ? `لا توجد نتائج مطابقة لمعايير البحث والفلترة` 
                                : `No suppliers match the selected filters`}
                        </p>
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

                            // Calculate total paid (global vs per selected project)
                            const displayedTotalPaid = filterProjectId === 'ALL'
                                ? (supplier.totalPaid || 0)
                                : ((supplier.transactions || []).filter(t => t.projectId === filterProjectId).reduce((sum, t) => sum + Number(t.amount || 0), 0));

                            return (
                                <div key={supplier.id} className="card supplier-card">
                                    {/* 1. Header: Name, Arabic Subname, Company, Primary Category Badge */}
                                    <div className="supplier-card-header">
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 className="supplier-card-name" title={getLocalizedName(supplier, isArabic)}>
                                                {getLocalizedName(supplier, isArabic)}
                                            </h3>
                                            {getLocalizedSubName(supplier, isArabic) && (
                                                <span className="supplier-card-subname">
                                                    {getLocalizedSubName(supplier, isArabic)}
                                                </span>
                                            )}
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

                                    {/* 2. Body Details: Additional Category Chips, Supplied Items, Phone, Email, Total Paid KPI */}
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
                                        {supplier.email && supplier.email.trim() && supplier.email !== '-' && (
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

                                        {/* Total Paid KPI Box */}
                                        <div className="supplier-kpi-box">
                                            <Wallet size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                                            <div>
                                                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                                                    {isArabic ? 'إجمالي المدفوع' : 'TOTAL PAID'}
                                                </div>
                                                <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem', lineHeight: 1.2 }}>
                                                    {formatCurrency(displayedTotalPaid)}
                                                </div>
                                            </div>
                                        </div>
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
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedSupplier(null);
                    }}
                    onSave={handleSaveSupplier}
                    initialData={selectedSupplier}
                />
            </div>
        </Layout>
    );
}

