import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Search, Filter, ArrowRight, History, Plus, Settings, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import AddMaterialModal from '../components/AddMaterialModal';
import InventoryUsageModal from '../components/InventoryUsageModal';
import { materialsAPI, projectsAPI, materialUsageAPI } from '../services/api';

export default function Inventory() {
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const [batches, setBatches] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('all');
    const [viewMode, setViewMode] = useState('BATCHES'); // BATCHES | MATERIALS
    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
    const [usageProjectId, setUsageProjectId] = useState(null);

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
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: 'Failed to load inventory data.' });
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP'
        }).format(amount);
    };

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
                    showAlert({ type: 'error', title: 'Error', message: 'Failed to delete batch' });
                }
            }
        });
    };

    return (
        <Layout>
            <div className="inventory-page">
                <div className="flex-between mb-xl">
                    <div>
                        <h1 className="flex gap-md">
                            <Package size={32} />
                            {t('inventory.title') || 'المخزون'}
                        </h1>
                        <p className="text-secondary">{t('inventory.subtitle') || 'إدارة ومتابعة المواد في المخازن والمواقع'}</p>
                    </div>
                    <div className="flex gap-md">
                        <div className="tab-group" style={{ background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '8px' }}>
                            <button
                                className={`btn btn-sm ${viewMode === 'BATCHES' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setViewMode('BATCHES')}
                            >
                                {t('inventory.batches') || 'الاستهلاكات'}
                            </button>
                            <button
                                className={`btn btn-sm ${viewMode === 'MATERIALS' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setViewMode('MATERIALS')}
                            >
                                {t('inventory.rawMaterials') || 'الخامات'}
                            </button>
                        </div>
                        {viewMode === 'MATERIALS' && (
                            <button className="btn btn-primary flex gap-sm" onClick={() => setIsMaterialModalOpen(true)}>
                                <Plus size={18} />
                                {t('common.add')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="card mb-xl" style={{ padding: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 250px', position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} size={18} />
                            <input
                                type="text"
                                placeholder={t('common.search') || 'بحث...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    padding: '10px 10px 10px 42px',
                                    width: '100%',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    outline: 'none',
                                    backgroundColor: 'transparent'
                                }}
                            />
                        </div>
                        <div style={{ flex: '0 1 250px', minWidth: '200px' }}>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    outline: 'none',
                                    backgroundColor: 'transparent'
                                }}
                            >
                                <option value="all">{t('inventory.allProjects') || 'جميع المشاريع'}</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
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
                                        <ArrowRight size={18} className="text-primary" />
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
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={() => handleDeleteBatch(item.id, item.description)}
                                                            style={{ padding: '4px 8px', color: '#ef4444', borderColor: '#ef4444', background: 'transparent' }}
                                                            title={t('common.delete')}
                                                        >
                                                            <Trash2 size={16} />
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
                                <p className="text-secondary">{t('inventory.noItems')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-4 gap-md">
                                {filteredMaterials.map(material => (
                                    <div key={material.id} className="card material-card">
                                        <h4 className="mb-xs">{material.nameAr || material.name}</h4>
                                        <div className="flex-between text-xs text-tertiary mb-md">
                                            <span>{material.name}</span>
                                            <span className="badge badge-info">{material.unit}</span>
                                        </div>
                                        <div className="flex-between mb-sm">
                                            <span className="text-secondary">Stock Level:</span>
                                            <span className={`font-bold ${Number(material.stockLevel) <= Number(material.reorderLevel) ? 'text-danger' : ''}`}>
                                                {material.stockLevel}
                                            </span>
                                        </div>
                                        <div className="flex-between">
                                            <span className="text-secondary">Unit Price:</span>
                                            <span className="font-bold">{formatCurrency(material.unitPrice)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <AddMaterialModal
                isOpen={isMaterialModalOpen}
                onClose={() => setIsMaterialModalOpen(false)}
                onSave={async (data) => {
                    try {
                        await materialsAPI.create(data);
                        showAlert({ type: 'success', title: 'Success', message: 'Material added successfully' });
                        setIsMaterialModalOpen(false);
                        loadData();
                    } catch (error) {
                        console.error("Failed to add material", error);
                        showAlert({ type: 'error', title: 'Error', message: 'Failed to add material' });
                    }
                }}
            />

            <InventoryUsageModal
                open={isUsageModalOpen}
                onClose={() => setIsUsageModalOpen(false)}
                projectId={usageProjectId}
                onSuccess={() => {
                    showAlert({ type: 'success', title: 'Success', message: 'Usage recorded successfully' });
                    loadData();
                }}
            />

            <style>{`
                .inventory-card {
                    padding: var(--spacing-md);
                    border: 1px solid var(--border-color);
                    transition: transform 0.2s, border-color 0.2s;
                }
                .inventory-card:hover {
                    transform: translateY(-2px);
                    border-color: var(--color-primary);
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
