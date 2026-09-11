import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Search, ArrowRight, History, Plus, Trash2, Pencil, X, AlertTriangle } from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import AddMaterialModal from '../components/AddMaterialModal';
import InventoryUsageModal from '../components/InventoryUsageModal';
import { materialsAPI, projectsAPI, materialUsageAPI } from '../services/api';
import { useFormat } from '../utils/format';
import { apiErrorMessage } from '../utils/apiError';

export default function Inventory() {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar' || i18n.language?.startsWith('ar');
    const { showAlert } = useAlert();
    const { currency: formatCurrency } = useFormat();
    const [batches, setBatches] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('all');
    const [viewMode, setViewMode] = useState('BATCHES'); // BATCHES | MATERIALS
    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
    const [usageProjectId, setUsageProjectId] = useState(null);
    const [usageBatchId, setUsageBatchId] = useState(null);

    // Recharge Material Stock State
    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
    const [rechargingMaterial, setRechargingMaterial] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [rechargeForm, setRechargeForm] = useState({
        quantity: '',
        unitPrice: '',
        projectId: '',
        paymentMethod: 'CUSTODY_WALLET',
        supplierName: '',
        createTransaction: true,
        notes: ''
    });
    const [rechargeLoading, setRechargeLoading] = useState(false);

    const openEditMaterial = (material) => {
        setEditingMaterial(material);
        setIsMaterialModalOpen(true);
    };

    const openRechargeModal = (material) => {
        setRechargingMaterial(material);
        setRechargeForm({
            quantity: '',
            unitPrice: material.unitPrice ? material.unitPrice.toString() : '',
            projectId: '',
            paymentMethod: 'CUSTODY_WALLET',
            supplierName: '',
            createTransaction: true,
            notes: ''
        });
        setIsRechargeModalOpen(true);
    };

    const handleRechargeSubmit = async (e) => {
        e.preventDefault();
        if (!rechargingMaterial) return;

        const qty = parseFloat(rechargeForm.quantity);
        if (!qty || qty <= 0) {
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: isAr ? 'يرجى إدخال كمية صحيحة أكبر من صفر' : 'Please enter a valid quantity greater than 0' });
            return;
        }

        const price = rechargeForm.unitPrice ? parseFloat(rechargeForm.unitPrice) : (rechargingMaterial.unitPrice || 0);
        const totalAmount = qty * price;

        setRechargeLoading(true);
        try {
            const res = await materialsAPI.recharge(rechargingMaterial.id, {
                quantity: qty,
                unitPrice: price > 0 ? price : undefined,
                projectId: rechargeForm.projectId || undefined,
                paymentMethod: rechargeForm.paymentMethod,
                supplierName: rechargeForm.supplierName || undefined,
                createTransaction: rechargeForm.createTransaction,
                notes: rechargeForm.notes || undefined
            });

            showAlert({
                type: 'success',
                title: t('common.success', 'Success'),
                message: isAr
                    ? `تم شحن رصيد ${rechargingMaterial.nameAr || rechargingMaterial.name} بإضافة ${qty} ${rechargingMaterial.unit}${totalAmount > 0 && rechargeForm.createTransaction ? ` وتسجيل معاملة مصروف بقيمة ${formatCurrency(totalAmount)}` : ''} بنجاح!`
                    : `Successfully recharged ${qty} ${rechargingMaterial.unit} to ${rechargingMaterial.name}${totalAmount > 0 && rechargeForm.createTransaction ? ` and recorded an expense of ${formatCurrency(totalAmount)}` : ''}!`
            });

            setIsRechargeModalOpen(false);
            setRechargingMaterial(null);
            loadData();
        } catch (error) {
            console.error("Failed to recharge material", error);
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: apiErrorMessage(error, 'Failed to recharge material stock') });
        } finally {
            setRechargeLoading(false);
        }
    };

    const handleDeleteMaterial = (material) => {
        showAlert({
            type: 'warning',
            title: t('common.deleteConfirmTitle', 'Delete?'),
            message: `${t('common.deleteConfirmMessage', 'Permanently delete')} "${material.nameAr || material.name}"?`,
            showCancel: true,
            confirmText: t('common.delete', 'Delete'),
            onConfirm: async () => {
                try {
                    await materialsAPI.delete(material.id);
                    showAlert({ type: 'success', title: t('common.success', 'Deleted'), message: t('inventory.materialDeleted', 'Material deleted') });
                    loadData();
                } catch (error) {
                    showAlert({ type: 'error', title: t('common.error', 'Error'), message: apiErrorMessage(error, 'Failed to delete material.') });
                }
            }
        });
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [batchesRes, projectsRes, materialsRes] = await Promise.all([
                materialUsageAPI.getBatches({ status: 'AVAILABLE,PARTIALLY_USED' }),
                projectsAPI.getAll(),
                materialsAPI.getAll()
            ]);
            setBatches(batchesRes.data.data || []);
            setProjects(projectsRes.data.data || []);
            setMaterials(materialsRes.data.data || []);
        } catch (error) {
            console.error("Failed to load inventory data", error);
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: apiErrorMessage(error, 'Failed to load inventory data.') });
        } finally {
            setLoading(false);
        }
    };

    const filteredBatches = batches.filter(batch => {
        const matchesSearch = (batch.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (batch.project?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesProject = selectedProjectId === 'all' || batch.projectId === selectedProjectId;
        return matchesSearch && matchesProject;
    });

    const filteredMaterials = materials.filter(material => {
        return material.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            material.nameAr?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Grouping logic if 'all projects' is selected
    const groupedInventory = filteredBatches.reduce((acc, batch) => {
        const projectName = batch.project?.name || 'Unassigned';
        if (!acc[projectName]) acc[projectName] = [];
        acc[projectName].push(batch);
        return acc;
    }, {});

    const handleDeleteBatch = (batchId, batchDescription) => {
        showAlert({
            type: 'warning',
            title: t('common.deleteConfirmTitle'),
            message: `${t('common.deleteConfirmMessage')} "${batchDescription}"?`,
            showCancel: true,
            confirmText: t('common.delete'),
            onConfirm: async () => {
                try {
                    await materialUsageAPI.deleteBatch(batchId);
                    showAlert({ type: 'success', title: 'Deleted', message: 'Batch deleted successfully' });
                    loadData();
                } catch (error) {
                    console.error('Failed to delete batch:', error);
                    showAlert({ type: 'error', title: t('common.error', 'Error'), message: apiErrorMessage(error, 'Failed to delete batch.') });
                }
            }
        });
    };

    return (
        <Layout>
            <div className="inventory-page">
                <div className="flex-between mb-xl">
                    <div>
                        <div className="app-eyebrow">{isAr ? 'المخزون' : 'Inventory'}</div>
                        <h1 className="app-title" style={{ fontSize: '1.9rem' }}>
                            <Package size={28} />
                            {t('inventory.title') || 'المخزون'}
                        </h1>
                        <p className="app-sub">{t('inventory.subtitle') || 'إدارة ومتابعة المواد في المخازن والمواقع'}</p>
                    </div>
                    <div className="flex gap-md" style={{ alignItems: 'center' }}>
                        <div className="tab-group">
                            <button
                                className={`btn btn-sm ${viewMode === 'BATCHES' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setViewMode('BATCHES')}
                            >
                                {t('inventory.batches') || 'الاستهلاكات والمواقع'}
                            </button>
                            <button
                                className={`btn btn-sm ${viewMode === 'MATERIALS' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setViewMode('MATERIALS')}
                            >
                                {t('inventory.rawMaterials') || 'الخامات والرصيد'}
                            </button>
                        </div>
                        {viewMode === 'MATERIALS' && (
                            <button className="btn btn-primary btn-sm flex gap-sm" onClick={() => setIsMaterialModalOpen(true)}>
                                <Plus size={16} />
                                {isAr ? 'إضافة خامة جديدة' : 'Add Raw Material'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="card mb-xl" style={{ padding: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 250px', position: 'relative' }}>
                            <Search style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} size={18} />
                            <input
                                type="text"
                                placeholder={t('common.search') || 'بحث...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    padding: '10px 12px',
                                    paddingInlineStart: '42px',
                                    width: '100%',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    outline: 'none',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)'
                                }}
                            />
                        </div>
                        {viewMode === 'BATCHES' && (
                            <div style={{ flex: '0 1 250px', minWidth: '200px' }}>
                                <select
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '10px',
                                        outline: 'none',
                                        backgroundColor: 'var(--bg-tertiary)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    <option value="all">{t('inventory.allProjects') || 'جميع المشاريع'}</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex-center py-2xl">
                        <div className="spinner"></div>
                    </div>
                ) : viewMode === 'BATCHES' ? (
                    filteredBatches.length === 0 ? (
                        <div className="card text-center py-2xl">
                            <Package size={48} className="text-tertiary mx-auto mb-md" />
                            <p className="text-secondary">{t('inventory.noItems') || 'لا توجد بنود في المخزون حالياً'}</p>
                        </div>
                    ) : (
                        <div className="inventory-groups">
                            {Object.entries(groupedInventory).map(([projectName, items]) => (
                                <div key={projectName} className="inventory-section mb-xl">
                                    <h3 className="section-title flex items-center gap-sm mb-md">
                                        <ArrowRight size={18} className="text-primary" style={isAr ? { transform: 'scaleX(-1)' } : {}} />
                                        {projectName}
                                        <span className="badge badge-secondary ml-sm">{items.length} {t('inventory.items') || 'بنود'}</span>
                                    </h3>
                                    <div className="grid grid-3 gap-md">
                                        {items.map(item => (
                                            <div key={item.id} className="card inventory-card">
                                                <div className="flex-between mb-sm">
                                                    <h4 className="m-0" style={{ paddingRight: '12px' }}>{item.description}</h4>
                                                    <div className="flex gap-sm">
                                                        <span className={`badge ${item.status === 'AVAILABLE' ? 'badge-success' : 'badge-warning'}`}>
                                                            {t(`inventory.status.${item.status.toLowerCase()}`) || item.status}
                                                        </span>
                                                        {/* Low remaining value warning badge (#7) */}
                                                        {item.initialValue > 0 && (item.remainingValue / item.initialValue) < 0.15 && (
                                                            <span style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                                background: '#fef2f2', color: '#ef4444',
                                                                border: '1px solid #fecaca', borderRadius: 6,
                                                                padding: '2px 7px', fontSize: 11, fontWeight: 700
                                                            }}><AlertTriangle size={11} /> {t('inventory.lowStock', 'Low')}</span>
                                                        )}
                                                        <button
                                                            className="icon-btn danger"
                                                            onClick={() => handleDeleteBatch(item.id, item.description)}
                                                            title={t('common.delete')}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="inventory-metrics grid grid-2 gap-sm my-md">
                                                    <div className="metric">
                                                        <div className="text-tertiary text-xs">{t('inventory.initialValue') || 'القيمة الأصلية'}</div>
                                                        <div className="font-bold">{formatCurrency(item.initialValue)}</div>
                                                    </div>
                                                    <div className="metric">
                                                        <div className="text-tertiary text-xs">{t('inventory.remainingValue') || 'القيمة المتبقية'}</div>
                                                        <div className="font-bold text-primary">{formatCurrency(item.remainingValue)}</div>
                                                    </div>
                                                </div>
                                                <div className="progress-bar-container">
                                                    <div
                                                        className="progress-bar"
                                                        style={{ width: `${(item.remainingValue / item.initialValue) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex-between mt-md text-xs text-secondary">
                                                    <span className="flex items-center gap-xs">
                                                        <History size={12} />
                                                        {new Date(item.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <span>{((item.remainingValue / item.initialValue) * 100).toFixed(0)}% {t('inventory.remaining') || 'متبقي'}</span>
                                                </div>
                                                <button
                                                    className="btn btn-primary full-width mt-md"
                                                    style={{ display: 'flex', justifyContent: 'center', padding: '8px' }}
                                                    onClick={() => {
                                                        setUsageProjectId(item.projectId);
                                                        setUsageBatchId(item.id);
                                                        setIsUsageModalOpen(true);
                                                    }}
                                                >
                                                    {t('inventory.recordUsage') || 'تسجيل استهلاك'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="materials-grid">
                        {filteredMaterials.length === 0 ? (
                            <div className="card text-center py-2xl">
                                <Package size={48} className="text-tertiary mx-auto mb-md" />
                                <p className="text-secondary">{isAr ? 'لا توجد خامات مسجلة حالياً' : 'No raw materials registered yet'}</p>
                                <button className="btn btn-primary mt-md" onClick={() => setIsMaterialModalOpen(true)}>
                                    <Plus size={18} />
                                    {isAr ? 'إضافة خامة جديدة' : 'Add Raw Material'}
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-4 gap-md">
                                {filteredMaterials.map(material => {
                                    const stock = Number(material.stockLevel || 0);
                                    const reorder = material.reorderLevel !== null && material.reorderLevel !== undefined && material.reorderLevel !== '' ? Number(material.reorderLevel) : null;
                                    const isLowStock = reorder !== null && reorder > 0 ? stock <= reorder : (stock === 0 && material.reorderLevel !== null);

                                    return (
                                        <div key={material.id} className="card material-card" style={{
                                            borderLeft: isLowStock ? '3px solid #ef4444' : '3px solid #10b981',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}>
                                            <div className="flex-between mb-xs" style={{ alignItems: 'flex-start', gap: 8 }}>
                                                <h4 style={{ margin: 0, flex: 1, minWidth: 0 }}>{material.nameAr || material.name}</h4>
                                                <div className="flex gap-xs" style={{ flexShrink: 0 }}>
                                                    {isLowStock && (
                                                        <span style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                                            background: '#ef4444', color: 'white',
                                                            borderRadius: 6, padding: '2px 8px',
                                                            fontSize: 10, fontWeight: 700
                                                        }}><AlertTriangle size={11} /> {t('inventory.lowStock', 'LOW')}</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="icon-btn"
                                                        title={t('common.edit', 'Edit')}
                                                        onClick={() => openEditMaterial(material)}
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="icon-btn danger"
                                                        title={t('common.delete', 'Delete')}
                                                        onClick={() => handleDeleteMaterial(material)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex-between text-xs text-tertiary mb-md">
                                                <span>{material.name}</span>
                                                <span className="badge badge-info">{material.unit}</span>
                                            </div>

                                            <div className="flex-between mb-sm" style={{ background: 'var(--bg-tertiary)', padding: '8px 10px', borderRadius: '6px' }}>
                                                <span className="text-secondary" style={{ fontSize: '0.85rem' }}>{isAr ? 'الرصيد المتوفر:' : 'Stock Level:'}</span>
                                                <span className={`font-bold ${isLowStock ? 'text-danger' : 'text-primary'}`} style={{ fontSize: '1.05rem' }}>
                                                    {stock} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>{material.unit}</span>
                                                </span>
                                            </div>

                                            <div className="flex-between text-xs text-secondary mb-sm">
                                                <span>{isAr ? 'سعر الوحدة:' : 'Unit Price:'}</span>
                                                <span className="font-bold">{formatCurrency(material.unitPrice)} / {material.unit}</span>
                                            </div>

                                            {reorder !== null && reorder > 0 && (
                                                <div className="flex-between text-xs text-tertiary mb-md">
                                                    <span>{isAr ? 'حد التنبيه:' : 'Alert Level:'}</span>
                                                    <span>{reorder} {material.unit}</span>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm full-width mt-auto"
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', fontSize: '0.85rem' }}
                                                onClick={() => openRechargeModal(material)}
                                            >
                                                <Plus size={15} />
                                                <span>{isAr ? 'شحن رصيد الخامة' : 'Recharge Stock'}</span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <AddMaterialModal
                isOpen={isMaterialModalOpen}
                onClose={() => { setIsMaterialModalOpen(false); setEditingMaterial(null); }}
                initialData={editingMaterial}
                onSave={async (data) => {
                    try {
                        if (editingMaterial) {
                            await materialsAPI.update(editingMaterial.id, data);
                            showAlert({ type: 'success', title: t('common.success', 'Success'), message: t('inventory.materialUpdated', 'Material updated successfully') });
                        } else {
                            await materialsAPI.create(data);
                            showAlert({ type: 'success', title: t('common.success', 'Success'), message: t('inventory.materialAdded', 'Material added successfully') });
                        }
                        setIsMaterialModalOpen(false);
                        setEditingMaterial(null);
                        loadData();
                    } catch (error) {
                        console.error("Failed to save material", error);
                        showAlert({ type: 'error', title: t('common.error', 'Error'), message: apiErrorMessage(error, 'Failed to save material') });
                    }
                }}
            />

            {/* Quick Recharge Material Stock Modal */}
            {isRechargeModalOpen && rechargingMaterial && (
                <div className="modal-overlay" onClick={() => setIsRechargeModalOpen(false)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>
                                {isAr ? `شحن رصيد: ${rechargingMaterial.nameAr || rechargingMaterial.name}` : `Recharge: ${rechargingMaterial.name}`}
                            </h2>
                            <button className="modal-close" onClick={() => setIsRechargeModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleRechargeSubmit} className="modal-body">
                            <div className="form-section">
                                <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{isAr ? 'الرصيد الحالي:' : 'Current Stock:'}</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '1.1rem' }}>
                                        {rechargingMaterial.stockLevel || 0} {rechargingMaterial.unit}
                                    </span>
                                </div>

                                <div className="form-group mb-md">
                                    <label>{isAr ? `الكمية المضافة (+ ${rechargingMaterial.unit})` : `Quantity to Add (+ ${rechargingMaterial.unit})`} <span className="required">*</span></label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        autoFocus
                                        value={rechargeForm.quantity}
                                        onChange={(e) => setRechargeForm(prev => ({ ...prev, quantity: e.target.value }))}
                                        placeholder="0.00"
                                        style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                                    />
                                </div>

                                <div className="form-group mb-md">
                                    <label>{isAr ? 'سعر الوحدة للشحنة (EGP)' : 'Unit Price (EGP)'}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={rechargeForm.unitPrice}
                                        onChange={(e) => setRechargeForm(prev => ({ ...prev, unitPrice: e.target.value }))}
                                        placeholder={rechargingMaterial.unitPrice ? rechargingMaterial.unitPrice.toString() : '0.00'}
                                    />
                                </div>

                                {/* Live Total Cost Card */}
                                {(() => {
                                    const qty = parseFloat(rechargeForm.quantity) || 0;
                                    const price = rechargeForm.unitPrice !== '' ? (parseFloat(rechargeForm.unitPrice) || 0) : (rechargingMaterial.unitPrice || 0);
                                    const total = qty * price;
                                    return (
                                        <div style={{ background: 'rgba(255, 90, 31, 0.07)', border: '1px solid rgba(255, 90, 31, 0.28)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                    {isAr ? 'إجمالي تكلفة الشحنة:' : 'Total Batch Cost:'}
                                                </span>
                                                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                                                    {formatCurrency(total)}
                                                </span>
                                            </div>
                                            {total > 0 && (
                                                <label className="flex items-center gap-sm cursor-pointer" style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={rechargeForm.createTransaction}
                                                        onChange={(e) => setRechargeForm(prev => ({ ...prev, createTransaction: e.target.checked }))}
                                                        style={{ accentColor: 'var(--color-primary)' }}
                                                    />
                                                    <span>{isAr ? 'تسجيل معاملة مصروف مالي تلقائياً في السجل' : 'Record financial expense transaction automatically'}</span>
                                                </label>
                                            )}
                                        </div>
                                    );
                                })()}

                                {rechargeForm.createTransaction && (
                                    <div className="form-group mb-md">
                                        <label>{isAr ? 'طريقة الدفع' : 'Payment Method'}</label>
                                        <select
                                            value={rechargeForm.paymentMethod}
                                            onChange={(e) => setRechargeForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                        >
                                            <option value="CUSTODY_WALLET">{isAr ? 'عهدة المهندس (Custody Wallet)' : 'Custody Wallet'}</option>
                                            <option value="CASH">{isAr ? 'نقدي (Cash)' : 'Cash'}</option>
                                            <option value="BANK_TRANSFER">{isAr ? 'تحويل بنكي (Bank Transfer)' : 'Bank Transfer'}</option>
                                            <option value="CHECK">{isAr ? 'شيك (Check)' : 'Check'}</option>
                                            <option value="CREDIT_CARD">{isAr ? 'بطاقة ائتمان (Card)' : 'Credit Card'}</option>
                                        </select>
                                    </div>
                                )}

                                <div className="form-group mb-md">
                                    <label>{isAr ? 'تخصيص لمشروع محدد (اختياري)' : 'Allocate to Project (Optional)'}</label>
                                    <select
                                        value={rechargeForm.projectId}
                                        onChange={(e) => setRechargeForm(prev => ({ ...prev, projectId: e.target.value }))}
                                    >
                                        <option value="">-- {isAr ? 'المخزن العام (بدون مشروع محدد)' : 'General Warehouse (No Project)'} --</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group mb-md">
                                    <label>{isAr ? 'اسم المورد / المحل (اختياري)' : 'Supplier / Vendor (Optional)'}</label>
                                    <input
                                        type="text"
                                        value={rechargeForm.supplierName}
                                        onChange={(e) => setRechargeForm(prev => ({ ...prev, supplierName: e.target.value }))}
                                        placeholder={isAr ? 'مثال: شركة السويس للأسمنت / تاجر الحديد' : 'e.g. Suez Cement Co. / Vendor'}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>{isAr ? 'ملاحظات / رقم إذن التوريد' : 'Notes / Delivery Note #'}</label>
                                    <input
                                        type="text"
                                        value={rechargeForm.notes}
                                        onChange={(e) => setRechargeForm(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder={isAr ? 'مثال: توريد دفعة حديد جديدة' : 'e.g. Batch delivery note'}
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsRechargeModalOpen(false)}>
                                    {t('common.cancel', 'إلغاء')}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={rechargeLoading}>
                                    {rechargeLoading ? (isAr ? 'جاري الشحن...' : 'Recharging...') : (isAr ? 'تأكيد الشحن' : 'Confirm Recharge')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <InventoryUsageModal
                open={isUsageModalOpen}
                onClose={() => setIsUsageModalOpen(false)}
                projectId={usageProjectId}
                preselectedBatchId={usageBatchId}
                onSuccess={() => {
                    showAlert({ type: 'success', title: 'Success', message: 'Usage recorded successfully' });
                    loadData();
                }}
            />

            <style>{`
                .inventory-card, .material-card {
                    padding: var(--spacing-md);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                }
                .inventory-card:hover, .material-card:hover {
                    border-color: rgba(255, 90, 31, 0.4);
                    box-shadow: 0 14px 34px -18px rgba(0, 0, 0, 0.65), 0 0 26px -12px rgba(255, 90, 31, 0.3);
                }
                .progress-bar-container {
                    height: 6px;
                    background: var(--bg-tertiary);
                    border-radius: 3px;
                    overflow: hidden;
                }
                .progress-bar {
                    height: 100%;
                    background: var(--color-primary);
                    transition: width 0.3s ease;
                }
                .section-title {
                    border-bottom: 2px solid var(--bg-tertiary);
                    padding-bottom: var(--spacing-sm);
                }
            `}</style>
        </Layout>
    );
}
