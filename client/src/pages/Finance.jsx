import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transactionsAPI, workmenAPI, projectsAPI } from '../services/api';
import { Plus, Wallet, FileText, Filter, Pencil, Trash2, X } from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import AddTransactionModal from '../components/AddTransactionModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

export default function Finance() {
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const [searchParams, setSearchParams] = useSearchParams();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    // Filter states (basic implementation, can be expanded)
    const [filterType, setFilterType] = useState('ALL'); // ALL, INCOME, EXPENSE
    const [filterProjectId, setFilterProjectId] = useState(null);
    const [filterProjectName, setFilterProjectName] = useState(null);

    // Delete state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState(null);
    const [workmen, setWorkmen] = useState([]);
    const [projects, setProjects] = useState([]);
    const [filterWorkmanId, setFilterWorkmanId] = useState('ALL');

    // Handle URL params for project filtering
    useEffect(() => {
        const projectId = searchParams.get('projectId');
        const projectName = searchParams.get('projectName');
        if (projectId) {
            setFilterProjectId(projectId);
            setFilterProjectName(projectName);
        }
    }, [searchParams]);

    useEffect(() => {
        loadTransactions();
        loadWorkmen();
        loadProjects();
    }, [filterType, filterProjectId, filterWorkmanId]);

    const loadTransactions = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterType !== 'ALL') params.type = filterType;

            const response = await transactionsAPI.getAll(params);
            let allTx = response?.data?.data || [];

            // Filter by type
            if (filterType !== 'ALL') {
                allTx = allTx.filter(tx => tx.type === filterType);
            }

            // Filter by project
            if (filterProjectId) {
                allTx = allTx.filter(tx => tx.projectId === filterProjectId);
            }

            // Filter by workman
            if (filterWorkmanId !== 'ALL') {
                allTx = allTx.filter(tx => tx.workmanId === filterWorkmanId);
            }

            setTransactions(allTx);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadWorkmen = async () => {
        try {
            const res = await workmenAPI.getAll();
            setWorkmen(res.data.data || []);
        } catch (error) {
            console.error('Failed to load workmen:', error);
        }
    };

    const loadProjects = async () => {
        try {
            const res = await projectsAPI.getAll();
            setProjects(res.data.data || []);
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    };

    const clearProjectFilter = () => {
        setFilterProjectId(null);
        setFilterProjectName(null);
        setSearchParams({});
    };

    // handleSaveTransaction removed as AddTransactionModal handles API calls directly layer

    const handleDeleteClick = (tx) => {
        setTransactionToDelete(tx);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!transactionToDelete) return;
        // Optional: set a local loading state here if the Modal supported it
        // The modal stays open during await, so user sees it.
        try {
            await transactionsAPI.delete(transactionToDelete.id);
            await loadTransactions(); // Wait for reload
            setIsDeleteModalOpen(false);
            setTransactionToDelete(null);
        } catch (error) {
            console.error('Failed to delete transaction:', error);
            showAlert({ type: 'error', title: t('common.error'), message: t('common.deleteFailed') || 'Failed to delete' });
            // Keep modal open on error? Or close?
            // Usually keep open to retry, but for now we close to avoid stuck state
            setIsDeleteModalOpen(false);
        }
    };

    const openCreateModal = () => {
        setEditingTransaction(null);
        setIsModalOpen(true);
    };

    const openEditModal = (tx) => {
        setEditingTransaction(tx);
        setIsModalOpen(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <Layout>
            <div className="container">
                {/* Header Section */}
                <div className="flex-between mb-xl">
                    <div>
                        <h1 className="flex gap-md">
                            <Wallet size={32} />
                            {t('finance.title')}
                        </h1>
                        <p className="text-secondary">{t('finance.subtitle')}</p>

                        {/* Project Filter Badge */}
                        {filterProjectId && filterProjectName && (
                            <div style={{
                                marginTop: 'var(--spacing-md)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-sm)',
                                padding: '8px 16px',
                                background: 'hsla(220, 80%, 45%, 0.1)',
                                color: 'var(--color-primary)',
                                borderRadius: 'var(--radius-full)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: '600',
                                border: '1px solid hsla(220, 80%, 45%, 0.2)'
                            }}>
                                <Filter size={16} />
                                <span>{t('finance.filteringBy')}: {filterProjectName}</span>
                                <button
                                    onClick={clearProjectFilter}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-primary)',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderRadius: 'var(--radius-sm)',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'hsla(220, 80%, 45%, 0.1)'}
                                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                    title={t('common.clear')}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <Plus size={20} />
                        {t('finance.newTransaction')}
                    </button>
                </div>

                {/* Filters Section - Enhanced Design */}
                <div className="card" style={{
                    padding: 'var(--spacing-sm) var(--spacing-lg)',
                    marginBottom: 'var(--spacing-xl)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                }}>
                    <div className="flex gap-lg items-center flex-wrap" style={{ justifyContent: 'flex-end', width: '100%' }}>

                        {/* Dropdowns Filter */}
                        <div className="flex gap-md items-center" style={{ flexGrow: 1 }}>
                            <select
                                value={filterProjectId || 'ALL'}
                                onChange={(e) => {
                                    setFilterProjectId(e.target.value === 'ALL' ? null : e.target.value);
                                    setFilterProjectName(e.target.options[e.target.selectedIndex].text);
                                }}
                                className="select"
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)',
                                    width: '180px',
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <option value="ALL">{t('common.allProjects') || 'المشاريع (الكل)'}</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>

                            <select
                                value={filterWorkmanId}
                                onChange={(e) => setFilterWorkmanId(e.target.value)}
                                className="select"
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)',
                                    width: '180px',
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <option value="ALL">{t('labor.title') || 'العمال والصنايعية'}</option>
                                {workmen.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Type Filter */}
                        <div className="flex gap-md items-center">
                            <div className="flex gap-md">
                                <button
                                    className={`btn btn-sm ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setFilterType('ALL')}
                                    style={{
                                        borderRadius: 'var(--radius-full)',
                                        padding: '4px 16px',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: '600',
                                        transition: 'all var(--transition-base)'
                                    }}
                                >
                                    {t('common.all')}
                                </button>
                                <button
                                    className={`btn btn-sm ${filterType === 'INCOME' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setFilterType('INCOME')}
                                    style={{
                                        borderRadius: 'var(--radius-full)',
                                        padding: '4px 16px',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: '600',
                                        transition: 'all var(--transition-base)'
                                    }}
                                >
                                    {t('finance.income')}
                                </button>
                                <button
                                    className={`btn btn-sm ${filterType === 'EXPENSE' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setFilterType('EXPENSE')}
                                    style={{
                                        borderRadius: 'var(--radius-full)',
                                        padding: '4px 16px',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: '600',
                                        transition: 'all var(--transition-base)'
                                    }}
                                >
                                    {t('finance.expense')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex-center" style={{ minHeight: '40vh' }}>
                        <div className="spinner"></div>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                        <FileText size={64} style={{ margin: '0 auto var(--spacing-lg)', color: 'var(--text-tertiary)' }} />
                        <h3>{t('reports.noData')}</h3>
                        <p className="text-secondary">{t('reports.addTransactions')}</p>
                        <button className="btn btn-primary mt-lg" onClick={openCreateModal}>
                            <Plus size={20} />
                            {t('finance.newTransaction')}
                        </button>
                    </div>
                ) : (
                    <div className="finance-content">
                        <style>
                            {`
                                .project-group {
                                    margin-bottom: var(--spacing-2xl);
                                }
                                .project-header {
                                    background: linear-gradient(135deg, var(--color-primary) 0%, hsl(220, 70%, 50%) 100%);
                                    padding: 16px 24px;
                                    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    box-shadow: 0 2px 8px hsla(220, 80%, 45%, 0.2);
                                }
                                .project-title {
                                    margin: 0;
                                    font-size: 1.125rem;
                                    font-weight: 700;
                                    color: white;
                                }
                                .project-summary {
                                    font-size: 0.875rem;
                                    color: rgba(255, 255, 255, 0.95);
                                    font-weight: 600;
                                }
                                .transaction-table {
                                    width: 100%;\r
                                    border-collapse: collapse;
                                    background: var(--bg-secondary);
                                    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
                                    overflow: hidden;
                                    box-shadow: var(--shadow-sm);
                                }
                                .transaction-table th {
                                    padding: 16px 14px;
                                    text-align: center;
                                    font-size: 0.8125rem;
                                    color: var(--text-secondary);
                                    background: var(--bg-tertiary);
                                    border-bottom: 2px solid var(--border-color);
                                    font-weight: 700;
                                    text-transform: uppercase;
                                    letter-spacing: 0.5px;
                                }
                                .transaction-table td {
                                    padding: 16px 14px;
                                    text-align: center;
                                    font-size: 0.875rem;
                                    border-bottom: 1px solid var(--border-color);
                                    color: var(--text-primary);
                                    transition: all var(--transition-fast);
                                }
                                .transaction-table tbody tr {
                                    transition: all var(--transition-fast);
                                }
                                .transaction-table tbody tr:hover {
                                    background: var(--bg-elevated);
                                    transform: scale(1.005);
                                    box-shadow: 0 2px 8px hsla(220, 80%, 45%, 0.08);
                                }
                                .transaction-table tbody tr:last-child td {
                                    border-bottom: none;
                                }
                                .btn-icon-sm {
                                    background: var(--bg-tertiary);
                                    border: 1px solid var(--border-color);
                                    color: var(--text-primary);
                                    padding: 8px;
                                    border-radius: var(--radius-md);
                                    cursor: pointer;
                                    display: inline-flex;
                                    align-items: center;
                                    justify-content: center;
                                    transition: all var(--transition-base);
                                }
                                .btn-icon-sm:hover {
                                    background: var(--color-primary);
                                    color: white;
                                    border-color: var(--color-primary);
                                    transform: translateY(-2px);
                                    box-shadow: 0 4px 8px hsla(220, 80%, 45%, 0.3);
                                }
                                .btn-icon-sm.text-danger:hover {
                                    background: var(--color-danger);
                                    border-color: var(--color-danger);
                                    box-shadow: 0 4px 8px hsla(0, 85%, 60%, 0.3);
                                }
                                .truncate {
                                    white-space: nowrap;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
                                }
                            `}
                        </style>

                        {/* Grouping Logic */}
                        {(() => {
                            // If filterProjectId is set, we don't need to group (or we group by Category/Band)
                            // If NOT set, group by Project
                            const groups = transactions.reduce((acc, tx) => {
                                const key = tx.project?.name || t('common.unassigned') || 'Unassigned';
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(tx);
                                return acc;
                            }, {});

                            return Object.entries(groups).map(([projectName, txs]) => {
                                const totalAmount = txs.reduce((sum, tx) => sum + (tx.type === 'INCOME' ? Number(tx.amount) : -Number(tx.amount)), 0);

                                return (
                                    <div key={projectName} className="project-group" style={{ overflow: 'hidden' }}>
                                        <div className="project-header">
                                            <h3 className="project-title">{projectName}</h3>
                                            <div className="project-summary">
                                                {t('finance.projectNet') || 'صافي المشروع'}:
                                                <span style={{
                                                    marginLeft: '8px',
                                                    fontWeight: 'bold',
                                                    color: totalAmount >= 0 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 200, 200, 1)'
                                                }}>
                                                    {totalAmount.toLocaleString()} EGP
                                                </span>
                                            </div>
                                        </div>
                                        <table className="transaction-table">
                                            <thead>
                                                <tr>
                                                    <th>{t('common.date')}</th>
                                                    <th>{t('common.type')}</th>
                                                    <th>{t('finance.category')}</th>
                                                    <th>{t('finance.description')}</th>
                                                    <th>{t('finance.amount')}</th>
                                                    <th>{t('common.status')}</th>
                                                    <th style={{ width: '120px' }}>{t('common.actions')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {txs.map((tx) => (
                                                    <tr key={tx.id}>
                                                        <td style={{ fontWeight: '500' }}>{formatDate(tx.transactionDate)}</td>
                                                        <td>
                                                            <span className={`badge ${tx.type === 'INCOME' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                                                                {tx.type === 'INCOME' ? t('finance.income') : t('finance.expense')}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontWeight: '500' }}>{t(`finance.categories.${tx.category?.toLowerCase()}`) || tx.category}</td>
                                                        <td style={{ maxWidth: '250px' }} className="truncate" title={tx.description}>
                                                            {tx.description}
                                                            {tx.projectCostItem && (
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '4px', fontWeight: '600' }}>
                                                                    #{tx.projectCostItem.name}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                                            {Number(tx.amount).toLocaleString()} EGP
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${tx.status === 'APPROVED' ? 'badge-success' : tx.status === 'PENDING_APPROVAL' ? 'badge-warning' : 'badge-secondary'}`} style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                                                                {t(`finance.status.${tx.status}`) || tx.status?.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="flex gap-sm justify-center">
                                                                <button className="btn-icon-sm" onClick={() => openEditModal(tx)} title={t('common.edit')}>
                                                                    <Pencil size={16} />
                                                                </button>
                                                                <button className="btn-icon-sm text-danger" onClick={() => handleDeleteClick(tx)} title={t('common.delete')}>
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                )}
            </div>

            <AddTransactionModal
                isOpen={isModalOpen}
                initialData={editingTransaction}
                onClose={() => setIsModalOpen(false)}
                onSubmit={loadTransactions}
                user={JSON.parse(localStorage.getItem('user'))}
            />

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                itemName="this transaction"
                title={t('common.deleteConfirmTitle')}
                message={t('common.deleteConfirmMessage')}
            />
        </Layout>
    );
}
