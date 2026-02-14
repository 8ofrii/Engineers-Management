import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { materialUsageAPI, projectsAPI } from '../services/api';
import { Package, Search, Filter, ArrowRight, History } from 'lucide-react';
import Layout from '../components/Layout';

export default function Inventory() {
    const { t } = useTranslation();
    const [batches, setBatches] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [batchesRes, projectsRes] = await Promise.all([
                materialUsageAPI.getBatches({ status: 'AVAILABLE,PARTIALLY_USED' }),
                projectsAPI.getAll()
            ]);
            setBatches(batchesRes.data.data || []);
            setProjects(projectsRes.data.data || []);
        } catch (error) {
            console.error("Failed to load inventory data", error);
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
                </div>

                {/* Filters */}
                <div className="card mb-xl" style={{ padding: 'var(--spacing-md)' }}>
                    <div className="flex gap-md flex-wrap">
                        <div className="flex-1 min-w-[200px] relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={18} />
                            <input
                                type="text"
                                placeholder={t('common.search') || 'بحث...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ paddingLeft: '40px', width: '100%' }}
                            />
                        </div>
                        <div className="min-w-[200px]">
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                style={{ width: '100%' }}
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
                ) : filteredBatches.length === 0 ? (
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
                                                <h4 className="m-0">{item.description}</h4>
                                                <span className={`badge ${item.status === 'AVAILABLE' ? 'badge-success' : 'badge-warning'}`}>
                                                    {t(`inventory.status.${item.status.toLowerCase()}`) || item.status}
                                                </span>
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
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
