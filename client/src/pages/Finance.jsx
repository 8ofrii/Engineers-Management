import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transactionsAPI } from '../services/api';
import { Plus, Wallet, FileText, Filter, Pencil, Trash2, X } from 'lucide-react';
import Layout from '../components/Layout';
import AddTransactionModal from '../components/AddTransactionModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

export default function Finance() {
    const { t } = useTranslation();
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
            alert(t('common.deleteFailed') || 'Failed to delete');
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
            <div>
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
                                marginTop: 'var(--spacing-sm)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)',
                                padding: '6px 12px',
                                background: 'var(--color-primary)',
                                color: 'white',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)'
                            }}>
                                <Filter size={14} />
                                <span>{t('finance.filteringBy')}: {filterProjectName}</span>
                                <button
                                    onClick={clearProjectFilter}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
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

                {/* Filters */}
                <div className="flex gap-md items-center flex-wrap">
                    <div className="flex gap-md items-center">
                        <Filter size={20} className="text-secondary" />
                        <span className="text-secondary font-medium">{t('common.filter')}:</span>
                        <div className="flex gap-sm">
                            <button
                                className={`btn btn-sm ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFilterType('ALL')}
                            >
                                {t('common.all')}
                            </button>
                            <button
                                className={`btn btn-sm ${filterType === 'INCOME' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFilterType('INCOME')}
                            >
                                {t('finance.income')}
                            </button>
                            <button
                                className={`btn btn-sm ${filterType === 'EXPENSE' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFilterType('EXPENSE')}
                            >
                                {t('finance.expense')}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-md items-center ml-auto">
                        <span className="text-secondary font-medium">{t('labor.title')}:</span>
                        <select
                            value={filterWorkmanId}
                            onChange={(e) => setFilterWorkmanId(e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}
                        >
                            <option value="ALL">{t('common.all')}</option>
                            {workmen.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
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
                                    margin-bottom: var(--spacing-xl);
                                }
                                .project-header {
                                    background: var(--bg-tertiary);
                                    padding: 12px 20px;
                                    border-radius: var(--radius-md) var(--radius-md) 0 0;
                                    border-bottom: 2px solid var(--color-primary);
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                }
                                .project-title {
                                    margin: 0;
                                    font-size: 1.1rem;
                                    font-weight: 700;
                                    color: var(--text-primary);
                                }
                                .transaction-table {
                                    width: 100%;
                                    border-collapse: collapse;
                                    background: var(--bg-secondary);
                                    border-radius: 0 0 var(--radius-md) var(--radius-md);
                                    overflow: hidden;
                                }
                                .transaction-table th {
                                    padding: 14px;
                                    text-align: center;
                                    font-size: 0.85rem;
                                    color: var(--text-secondary);
                                    background: rgba(0,0,0,0.05);
                                    border-bottom: 1px solid var(--border-color);
                                    font-weight: 600;
                                }
                                .transaction-table td {
                                    padding: 14px;
                                    text-align: center;
                                    font-size: 0.9rem;
                                    border-bottom: 1px solid var(--border-color);
                                    color: var(--text-primary);
                                }
                                .transaction-table tr:hover td {
                                    background: var(--bg-elevated);
                                }
                                .project-summary {
                                    font-size: 0.85rem;
                                    color: var(--text-secondary);
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
                                    <div key={projectName} className="project-group card" style={{ padding: 0, overflow: 'hidden' }}>
                                        <div className="project-header">
                                            <h3 className="project-title">{projectName}</h3>
                                            <div className="project-summary">
                                                {t('finance.projectNet') || 'صافي المشروع'}:
                                                <span style={{
                                                    marginLeft: '8px',
                                                    fontWeight: 'bold',
                                                    color: totalAmount >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
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
                                                    <th style={{ width: '100px' }}>{t('common.actions')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {txs.map((tx) => (
                                                    <tr key={tx.id}>
                                                        <td>{formatDate(tx.transactionDate)}</td>
                                                        <td>
                                                            <span className={`badge ${tx.type === 'INCOME' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                                                                {tx.type === 'INCOME' ? t('finance.income') : t('finance.expense')}
                                                            </span>
                                                        </td>
                                                        <td>{t(`finance.categories.${tx.category?.toLowerCase()}`) || tx.category}</td>
                                                        <td style={{ maxWidth: '250px' }} className="truncate" title={tx.description}>
                                                            {tx.description}
                                                            {tx.projectCostItem && (
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '2px' }}>
                                                                    #{tx.projectCostItem.name}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ fontWeight: 700 }}>
                                                            {Number(tx.amount).toLocaleString()} EGP
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${tx.status === 'APPROVED' ? 'badge-success' : tx.status === 'PENDING_APPROVAL' ? 'badge-warning' : 'badge-secondary'}`} style={{ fontSize: '0.7rem' }}>
                                                                {t(`finance.status.${tx.status}`) || tx.status?.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="flex gap-sm justify-center">
                                                                <button className="btn-icon-sm" onClick={() => openEditModal(tx)} title={t('common.edit')}>
                                                                    <Pencil size={14} />
                                                                </button>
                                                                <button className="btn-icon-sm text-danger" onClick={() => handleDeleteClick(tx)} title={t('common.delete')}>
                                                                    <Trash2 size={14} />
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
