import { useState, useEffect, Fragment } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transactionsAPI, workmenAPI, projectsAPI } from '../services/api';
import { Plus, Wallet, FileText, Filter, Pencil, Trash2, X, CheckCircle, XCircle, Clock, Paperclip, Download, RotateCcw, CornerDownRight, Eye, Mic, Image as ImageIcon, Sparkles } from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import AddTransactionModal from '../components/AddTransactionModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import RefundConfirmationModal from '../components/RefundConfirmationModal';
import TransactionDetailModal from '../components/TransactionDetailModal';
import { useFormat } from '../utils/format';
import { exportToXLSX } from '../utils/excelExport';

export default function Finance() {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { showAlert } = useAlert();
    const { currency: fmtCurrency } = useFormat();
    const [searchParams, setSearchParams] = useSearchParams();
    const [transactions, setTransactions] = useState([]);
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Filter states (basic implementation, can be expanded)
    const [filterType, setFilterType] = useState('ALL'); // ALL, INCOME, EXPENSE, PENDING, MY_LEDGER
    const [filterProjectId, setFilterProjectId] = useState(null);
    const [filterProjectName, setFilterProjectName] = useState(null);

    // Delete state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState(null);

    // Refund state
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [transactionToRefund, setTransactionToRefund] = useState(null);
    const [isRefunding, setIsRefunding] = useState(false);

    // Detail & Media Evidence state
    const [selectedDetailTx, setSelectedDetailTx] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const handleOpenDetail = (tx) => {
        setSelectedDetailTx(tx);
        setIsDetailModalOpen(true);
    };

    const [workmen, setWorkmen] = useState([]);
    const [projects, setProjects] = useState([]);
    const [filterWorkmanId, setFilterWorkmanId] = useState('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

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
    }, [filterType, filterProjectId, filterWorkmanId, dateFrom, dateTo]);

    const loadTransactions = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterType !== 'ALL' && filterType !== 'COMPANY_SHARE' && filterType !== 'MY_LEDGER') {
                params.type = filterType;
            }

            const response = await transactionsAPI.getAll(params);
            let allTx = response?.data?.data || [];

            // If MY_LEDGER is selected, filter everything where user is involved
            if (filterType === 'MY_LEDGER') {
                allTx = allTx.filter(tx => tx.creator?.id === user.id || tx.payerUserId === user.id || tx.toEngineerId === user.id);
            } else if (filterType === 'COMPANY_SHARE') {
                // Specifically filter auto-added management fees / company share transactions
                allTx = allTx.filter(tx => 
                    tx.category === 'MANAGEMENT_FEE_TRANSFER' || 
                    (tx.description && (
                        tx.description.toLowerCase().includes('management fee') ||
                        tx.description.includes('أتعاب الإدارة') ||
                        tx.description.includes('أتعاب') ||
                        tx.description.includes('نسبة الشركة')
                    ))
                );
            } else if (filterType === 'EXPENSE') {
                // Pure site expenses (exclude internal management fee ledger records)
                allTx = allTx.filter(tx => tx.type === 'EXPENSE' && tx.category !== 'MANAGEMENT_FEE_TRANSFER');
            } else if (filterType === 'INCOME') {
                allTx = allTx.filter(tx => tx.type === 'INCOME');
            }

            // Filter by project
            if (filterProjectId) {
                allTx = allTx.filter(tx => tx.projectId === filterProjectId);
            }

            // Filter by workman
            if (filterWorkmanId !== 'ALL') {
                allTx = allTx.filter(tx => tx.workmanId === filterWorkmanId);
            }

            // Filter by date range
            if (dateFrom) allTx = allTx.filter(tx => (tx.transactionDate || tx.createdAt || '') >= dateFrom);
            if (dateTo)   allTx = allTx.filter(tx => (tx.transactionDate || tx.createdAt || '').slice(0, 10) <= dateTo);

            // Show all transactions in the table (approved, pending, income, expense) with their real status badge
            setTransactions(allTx);

            // If manager/admin, load pending separately for quick action banner
            if (user.role === 'PROJECT_MANAGER' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
                const pendingRes = await transactionsAPI.getPending();
                setPendingTransactions(pendingRes?.data?.data || []);
            }

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

    const handleRefundClick = (tx) => {
        setTransactionToRefund(tx);
        setIsRefundModalOpen(true);
    };

    const handleConfirmRefund = async () => {
        if (!transactionToRefund) return;
        try {
            setIsRefunding(true);
            await transactionsAPI.refund(transactionToRefund.id);
            showAlert({
                type: 'success',
                title: t('common.success') || (isArabic ? 'تم بنجاح' : 'Success'),
                message: t('finance.refundSuccess') || (isArabic ? 'تم استرداد وإلغاء المعاملة بنجاح' : 'Transaction refunded and cancelled successfully')
            });
            setIsRefundModalOpen(false);
            setTransactionToRefund(null);
            await loadTransactions();
        } catch (error) {
            console.error('Failed to refund transaction:', error);
            showAlert({
                type: 'error',
                title: t('common.error') || (isArabic ? 'خطأ' : 'Error'),
                message: error.response?.data?.message || t('finance.refundFailed') || (isArabic ? 'فشل في استرداد وإلغاء المعاملة' : 'Failed to refund transaction')
            });
        } finally {
            setIsRefunding(false);
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

    const handleApprove = async (id) => {
        try {
            await transactionsAPI.approve(id);
            showAlert({ type: 'success', title: t('common.success'), message: t('finance.approvedSuccess') || 'Transaction approved successfully' });
            loadTransactions();
        } catch (error) {
            showAlert({ type: 'error', title: t('common.error'), message: error.response?.data?.message || 'Failed to approve' });
        }
    };

    const handleReject = async (id) => {
        const reason = prompt(t('finance.rejectReason') || 'Please enter rejection reason:');
        if (reason === null) return; // User cancelled
        try {
            await transactionsAPI.reject(id, reason || 'No reason provided');
            showAlert({ type: 'success', title: t('common.success'), message: t('finance.rejectedSuccess') || 'Transaction rejected' });
            loadTransactions();
        } catch (error) {
            showAlert({ type: 'error', title: t('common.error'), message: error.response?.data?.message || 'Failed to reject' });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '-';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    };

    const handleExportTransactionsXLSX = () => {
        if (!transactions || transactions.length === 0) {
            showAlert({
                type: 'info',
                title: isArabic ? 'لا توجد بيانات' : 'No Data',
                message: isArabic ? 'لا توجد معاملات متاحة للتصدير' : 'No transactions available to export'
            });
            return;
        }

        const rows = [
            [
                isArabic ? 'التاريخ' : 'Date',
                isArabic ? 'نوع المعاملة' : 'Type',
                isArabic ? 'المشروع' : 'Project',
                isArabic ? 'التصنيف' : 'Category',
                isArabic ? 'البيان / الوصف' : 'Description',
                isArabic ? 'البند المرتبط' : 'Cost Item / Band',
                isArabic ? 'الجهة الدافعة / العميل' : 'Payer / Client',
                isArabic ? 'المستفيد' : 'Beneficiary',
                isArabic ? 'المستلم / باليد' : 'Recipient / Handed to',
                isArabic ? 'طريقة الدفع' : 'Payment Method',
                isArabic ? 'المبلغ (جنيه)' : 'Amount (EGP)',
                isArabic ? 'الحالة' : 'Status',
                isArabic ? 'الخزينة / الحساب' : 'Physical Account / Safe',
                isArabic ? 'مركز التكلفة' : 'Cost Center',
                isArabic ? 'المسجل بواسطة' : 'Created By'
            ]
        ];

        transactions.forEach(tx => {
            const txType = tx.category === 'MANAGEMENT_FEE_TRANSFER'
                ? (isArabic ? 'ارباح المكتب' : 'Office Profit')
                : (tx.type === 'INCOME' ? (isArabic ? 'إيراد' : 'Income') : (isArabic ? 'مصروف' : 'Expense'));

            const status = tx.status === 'APPROVED'
                ? (isArabic ? 'معتمد' : 'Approved')
                : (tx.status === 'CANCELLED'
                    ? (isArabic ? 'مسترد / ملغي' : 'Refunded / Cancelled')
                    : (tx.status === 'REJECTED' ? (isArabic ? 'مرفوض' : 'Rejected') : (isArabic ? 'بانتظار الاعتماد' : 'Pending')));

            const pMethod = tx.paymentMethod === 'BANK_TRANSFER'
                ? (isArabic ? 'تحويل بنكي / إنستاباي' : 'Bank Transaction / InstaPay')
                : (tx.paymentMethod === 'CASH'
                    ? (isArabic ? 'نقداً (كاش)' : 'Cash')
                    : (tx.paymentMethod === 'CHECK'
                        ? (isArabic ? 'شيك' : 'Check')
                        : (tx.paymentMethod === 'CUSTODY_WALLET' ? (isArabic ? 'عهدة مهندس' : 'Custody Wallet') : (tx.paymentMethod || ''))));

            const catLabel = isArabic
                ? (t(`finance.categories.${tx.category?.toLowerCase()}`) || tx.category || '')
                : (tx.category || '');

            const beneficiaryVal = tx.type === 'INCOME'
                ? (tx.client?.name || tx.project?.client?.name || '')
                : (tx.beneficiary || tx.supplier?.name || tx.workman?.name || '');

            rows.push([
                formatDate(tx.transactionDate || tx.createdAt),
                txType,
                tx.project?.name || (isArabic ? 'عام / غير محدد' : 'General'),
                catLabel,
                tx.description || '',
                tx.projectCostItem?.name || '',
                tx.paidByClientContact || tx.transactionFrom || tx.payer?.name || tx.user?.name || '',
                beneficiaryVal,
                tx.transactionTo || '',
                pMethod,
                Number(Number(tx.amount || 0).toFixed(2)),
                status,
                tx.physicalAccount || '',
                tx.costCenter || '',
                tx.creator?.name || ''
            ]);
        });

        exportToXLSX({
            filename: `hesaby-transactions-${new Date().toISOString().slice(0, 10)}.xlsx`,
            sheets: [
                {
                    sheetName: isArabic ? 'سجل المعاملات' : 'Transactions',
                    data: rows
                }
            ],
            isRTL: isArabic
        });
    };

    const renderPaymentMethod = (method, txOrUrl = null) => {
        if (!method) return <span className="text-secondary">-</span>;
        let label = method;
        let methodClass = 'custody';
        let icon = '💼';

        switch (method) {
            case 'BANK_TRANSFER':
                label = t('finance.methods.bankTransfer') || (isArabic ? 'تحويل بنكي' : 'Bank Transfer');
                methodClass = 'bank';
                icon = '🏦';
                break;
            case 'CASH':
                label = t('finance.methods.cash') || (isArabic ? 'نقداً (كاش)' : 'Cash');
                methodClass = 'cash';
                icon = '💵';
                break;
            case 'CHECK':
                label = t('finance.methods.check') || (isArabic ? 'شيك' : 'Check');
                methodClass = 'check';
                icon = '🧾';
                break;
            case 'CREDIT_CARD':
                label = t('finance.methods.creditCard') || (isArabic ? 'بطاقة ائتمان' : 'Credit Card');
                methodClass = 'card';
                icon = '💳';
                break;
            case 'CUSTODY_WALLET':
                label = t('finance.methods.custodyWallet') || (isArabic ? 'عهدة مهندس' : 'Custody Wallet');
                methodClass = 'custody';
                icon = '💼';
                break;
            default:
                label = method;
                methodClass = 'custody';
                icon = '💼';
        }

        const txObj = typeof txOrUrl === 'object' && txOrUrl !== null ? txOrUrl : null;
        const legacyUrl = typeof txOrUrl === 'string' ? txOrUrl : (txObj?.receiptPhotoUrl || null);
        const hasVoice = Boolean(txObj?.voiceNoteUrl);
        const hasReceipt = Boolean(legacyUrl);
        const hasAi = Boolean(txObj?.aiRawText || txObj?.aiExtractedData);

        return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                <span className={`badge-method-pill ${methodClass}`}>
                    <span>{icon}</span>
                    <span>{label}</span>
                </span>

                {/* Voice Note Pill */}
                {hasVoice && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(txObj);
                        }}
                        className="badge-media-btn voice"
                        title={isArabic ? 'استماع للملاحظة الصوتية وتفاصيلها' : 'Play Voice Note & Details'}
                    >
                        <Mic size={12} />
                        <span>{isArabic ? 'صوتي' : 'Voice'}</span>
                    </button>
                )}

                {/* Receipt Photo Pill */}
                {hasReceipt && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (txObj) {
                                handleOpenDetail(txObj);
                            } else {
                                window.open(legacyUrl.startsWith('http') ? legacyUrl : `/uploads/${legacyUrl.replace(/^(\/?uploads\/|\/+)/, '')}`, '_blank');
                            }
                        }}
                        className="badge-media-btn receipt"
                        title={isArabic ? 'معاينة الإيصال وتفاصيله' : 'View Receipt & Details'}
                    >
                        <ImageIcon size={12} />
                        <span>{isArabic ? 'إيصال' : 'Receipt'}</span>
                    </button>
                )}

                {/* AI Extracted Text Pill */}
                {!hasVoice && !hasReceipt && hasAi && txObj && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(txObj);
                        }}
                        className="badge-media-btn ai"
                        title={isArabic ? 'بيانات مستخرجة بالذكاء الاصطناعي' : 'AI Extracted'}
                    >
                        <Sparkles size={11} />
                        <span>AI</span>
                    </button>
                )}
            </div>
        );
    };

    const renderPayerOrClient = (tx) => {
        if (tx.type === 'INCOME') {
            const clientName = tx.client?.name || tx.project?.client?.name || '';
            const payerRep = tx.paidByClientContact || (tx.transactionFrom && tx.transactionFrom !== clientName ? tx.transactionFrom : '');
            return (
                <div style={{ lineHeight: 1.35 }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.84rem' }} className="truncate">
                        {clientName || payerRep || '-'}
                    </div>
                    {clientName && payerRep && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }} className="truncate">
                            {isArabic ? 'المفوض:' : 'By:'} {payerRep}
                        </div>
                    )}
                </div>
            );
        } else {
            const payer = tx.payer?.name || tx.user?.name || '';
            const beneficiary = tx.beneficiary || tx.supplier?.name || tx.workman?.name || '';
            const recipient = tx.transactionTo || '';
            return (
                <div style={{ lineHeight: 1.35 }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.84rem' }} className="truncate">
                        {payer || beneficiary || recipient || '-'}
                    </div>
                    {beneficiary && payer && beneficiary !== payer && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }} className="truncate">
                            ↳ {isArabic ? 'المستفيد:' : 'To:'} <span style={{ color: 'var(--text-primary)' }}>{beneficiary}</span>
                        </div>
                    )}
                    {recipient && recipient !== beneficiary && recipient !== payer && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }} className="truncate">
                            🤝 {recipient}
                        </div>
                    )}
                </div>
            );
        }
    };

    const organizeTransactionsWithFees = (rawTxs, isAllTab) => {
        if (!isAllTab) {
            return rawTxs.map(tx => ({ ...tx, nestedFees: [] }));
        }

        // Separate management fees from other transactions
        const feeTxs = rawTxs.filter(tx => tx.category === 'MANAGEMENT_FEE_TRANSFER');
        const nonFeeTxs = rawTxs.filter(tx => tx.category !== 'MANAGEMENT_FEE_TRANSFER');

        const structured = nonFeeTxs.map(tx => ({
            ...tx,
            nestedFees: []
        }));

        const matchedFeeIds = new Set();

        // 1. Primary match: PARENT_TX:<id> in notes
        feeTxs.forEach(feeTx => {
            let parentId = null;
            if (feeTx.notes) {
                const match = feeTx.notes.match(/PARENT_TX:([a-zA-Z0-9_-]+)/);
                if (match) parentId = match[1];
            }

            if (parentId) {
                const parent = structured.find(p => p.id === parentId);
                if (parent) {
                    parent.nestedFees.push(feeTx);
                    matchedFeeIds.add(feeTx.id);
                }
            }
        });

        // 2. Fallback heuristic for legacy/seed data: match parent expense by exact amount in description
        feeTxs.forEach(feeTx => {
            if (matchedFeeIds.has(feeTx.id)) return;

            if (feeTx.description) {
                const candidate = structured.find(p => {
                    if (p.type !== 'EXPENSE' || (p.nestedFees && p.nestedFees.length > 0)) return false;
                    const pAmt = Number(p.amount);
                    if (isNaN(pAmt) || pAmt <= 0) return false;
                    const desc = feeTx.description;
                    return (
                        desc.includes(`${pAmt} EGP`) ||
                        desc.includes(`${Math.round(pAmt)} EGP`) ||
                        desc.includes(`${pAmt.toLocaleString()} EGP`) ||
                        desc.includes(`${pAmt.toFixed(2)} EGP`)
                    );
                });
                if (candidate) {
                    candidate.nestedFees.push(feeTx);
                    matchedFeeIds.add(feeTx.id);
                }
            }
        });

        // 3. Keep orphan fees at top-level so no transactions are hidden or lost
        const orphanFees = feeTxs
            .filter(feeTx => !matchedFeeIds.has(feeTx.id))
            .map(feeTx => ({ ...feeTx, nestedFees: [] }));

        return [...structured, ...orphanFees].sort((a, b) => 
            new Date(b.transactionDate || b.createdAt) - new Date(a.transactionDate || a.createdAt)
        );
    };

    return (
        <Layout>
            <div className="finance-page">
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
                    <div className="flex gap-sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={handleExportTransactionsXLSX}
                            disabled={transactions.length === 0}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            title={isArabic ? 'تصدير المعاملات المعروضة حالياً إلى ملف إكسيل' : 'Export current transactions to Excel'}
                        >
                            <Download size={18} />
                            {isArabic ? 'تصدير إكسيل (XLSX)' : 'Export Excel (XLSX)'}
                        </button>
                        <button className="btn btn-primary" onClick={openCreateModal}>
                            <Plus size={20} />
                            {t('finance.newTransaction')}
                        </button>
                    </div>
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
                        <div className="flex gap-md items-center" style={{ flexGrow: 1, flexWrap: 'wrap' }}>
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

                            {/* Date range picker (#11) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                    {isArabic ? 'من' : t('common.from', 'From')}:
                                </span>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={e => setDateFrom(e.target.value)}
                                    style={{
                                        padding: '5px 8px', borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                                        fontSize: '0.8rem'
                                    }}
                                />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                    {isArabic ? 'إلى' : t('common.to', 'To')}:
                                </span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={e => setDateTo(e.target.value)}
                                    style={{
                                        padding: '5px 8px', borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                                        fontSize: '0.8rem'
                                    }}
                                />
                                {(dateFrom || dateTo) && (
                                    <button
                                        className="btn btn-sm"
                                        onClick={() => { setDateFrom(''); setDateTo(''); }}
                                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                        title={isArabic ? 'مسح التواريخ' : 'Clear dates'}
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
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
                                <button
                                    className={`btn btn-sm ${filterType === 'COMPANY_SHARE' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setFilterType('COMPANY_SHARE')}
                                    style={{
                                        borderRadius: 'var(--radius-full)',
                                        padding: '4px 16px',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: '600',
                                        transition: 'all var(--transition-base)',
                                        ...(filterType === 'COMPANY_SHARE' ? {
                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                            borderColor: '#10b981',
                                            color: '#ffffff'
                                        } : {})
                                    }}
                                >
                                    {t('finance.companyShare') || (isArabic ? 'ارباح المكتب' : 'Office Profit')}
                                </button>
                                <button
                                    className={`btn btn-sm ${filterType === 'MY_LEDGER' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setFilterType('MY_LEDGER')}
                                    style={{
                                        borderRadius: 'var(--radius-full)',
                                        padding: '4px 16px',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: '600',
                                        transition: 'all var(--transition-base)'
                                    }}
                                >
                                    {t('finance.myLedger') || 'عهدتي'}
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
                                    background: var(--bg-tertiary);
                                    border-bottom: 1px solid var(--border-color);
                                    padding: 16px 24px;
                                    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
                                }
                                .project-title {
                                    margin: 0;
                                    font-size: 1.125rem;
                                    font-weight: 700;
                                    color: var(--text-primary);
                                }
                                .project-summary {
                                    font-size: 0.875rem;
                                    color: var(--text-secondary);
                                    font-weight: 600;
                                }
                                .project-group {
                                    background: var(--bg-secondary);
                                    border: 1px solid var(--border-color);
                                    border-radius: var(--radius-lg);
                                    overflow: hidden;
                                    margin-bottom: var(--spacing-xl);
                                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                                }
                                .project-header {
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    padding: 14px 20px;
                                    background: var(--bg-tertiary);
                                    border-bottom: 1px solid var(--border-color);
                                }
                                .transaction-table {
                                    width: 100%;
                                    border-collapse: collapse;
                                    background: transparent;
                                }
                                .transaction-table th {
                                    padding: 12px 14px;
                                    font-size: 0.72rem;
                                    color: var(--text-secondary);
                                    background: rgba(255, 255, 255, 0.02);
                                    border-bottom: 1px solid var(--border-color);
                                    font-weight: 700;
                                    text-transform: uppercase;
                                    letter-spacing: 0.05em;
                                    white-space: nowrap;
                                }
                                .transaction-table td {
                                    padding: 12px 14px;
                                    font-size: 0.85rem;
                                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                                    color: var(--text-primary);
                                    vertical-align: middle;
                                }
                                .transaction-table tbody tr.tx-row {
                                    transition: background 0.15s ease;
                                }
                                .transaction-table tbody tr.tx-row:hover {
                                    background: rgba(255, 255, 255, 0.035);
                                }

                                /* Standardized Type Pills */
                                .badge-type-pill {
                                    display: inline-flex;
                                    align-items: center;
                                    justify-content: center;
                                    height: 24px;
                                    min-width: 76px;
                                    padding: 0 8px;
                                    font-size: 0.68rem;
                                    font-weight: 700;
                                    letter-spacing: 0.04em;
                                    border-radius: 6px;
                                    text-transform: uppercase;
                                }
                                .badge-type-pill.expense {
                                    background: rgba(239, 68, 68, 0.12);
                                    color: #f87171;
                                    border: 1px solid rgba(239, 68, 68, 0.28);
                                }
                                .badge-type-pill.income {
                                    background: rgba(16, 185, 129, 0.12);
                                    color: #34d399;
                                    border: 1px solid rgba(16, 185, 129, 0.28);
                                }
                                .badge-type-pill.profit {
                                    background: rgba(6, 182, 212, 0.12);
                                    color: #22d3ee;
                                    border: 1px solid rgba(6, 182, 212, 0.28);
                                }

                                /* Standardized Method Badges */
                                .badge-method-pill {
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 5px;
                                    height: 24px;
                                    padding: 0 8px;
                                    font-size: 0.72rem;
                                    font-weight: 500;
                                    border-radius: 6px;
                                    white-space: nowrap;
                                    border: 1px solid transparent;
                                }
                                .badge-method-pill.bank {
                                    background: rgba(59, 130, 246, 0.12);
                                    color: #60a5fa;
                                    border-color: rgba(59, 130, 246, 0.25);
                                }
                                .badge-method-pill.cash {
                                    background: rgba(245, 158, 11, 0.12);
                                    color: #fbbf24;
                                    border-color: rgba(245, 158, 11, 0.25);
                                }
                                .badge-method-pill.check {
                                    background: rgba(168, 85, 247, 0.12);
                                    color: #c084fc;
                                    border-color: rgba(168, 85, 247, 0.25);
                                }
                                .badge-method-pill.card {
                                    background: rgba(99, 102, 241, 0.12);
                                    color: #818cf8;
                                    border-color: rgba(99, 102, 241, 0.25);
                                }
                                .badge-method-pill.custody {
                                    background: rgba(148, 163, 184, 0.12);
                                    color: #cbd5e1;
                                    border-color: rgba(148, 163, 184, 0.25);
                                }

                                /* Standardized Media Evidence Buttons */
                                .badge-media-btn {
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 4px;
                                    height: 24px;
                                    padding: 0 7px;
                                    font-size: 0.7rem;
                                    font-weight: 600;
                                    border-radius: 5px;
                                    cursor: pointer;
                                    transition: all 0.15s ease;
                                    white-space: nowrap;
                                }
                                .badge-media-btn.voice {
                                    background: rgba(168, 85, 247, 0.15);
                                    color: #c084fc;
                                    border: 1px solid rgba(168, 85, 247, 0.35);
                                }
                                .badge-media-btn.voice:hover {
                                    background: rgba(168, 85, 247, 0.28);
                                    transform: translateY(-1px);
                                }
                                .badge-media-btn.receipt {
                                    background: rgba(59, 130, 246, 0.15);
                                    color: #60a5fa;
                                    border: 1px solid rgba(59, 130, 246, 0.35);
                                }
                                .badge-media-btn.receipt:hover {
                                    background: rgba(59, 130, 246, 0.28);
                                    transform: translateY(-1px);
                                }
                                .badge-media-btn.ai {
                                    background: rgba(99, 102, 241, 0.12);
                                    color: #a5b4fc;
                                    border: 1px solid rgba(99, 102, 241, 0.3);
                                }

                                /* Cost-plus Indicator Tag */
                                .fee-included-tag {
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 3px;
                                    font-size: 0.65rem;
                                    font-weight: 700;
                                    padding: 1px 6px;
                                    border-radius: 4px;
                                    background: rgba(16, 185, 129, 0.12);
                                    color: #34d399;
                                    border: 1px solid rgba(16, 185, 129, 0.3);
                                    margin-top: 3px;
                                }

                                /* Parent & Nested Fee Row Architecture */
                                .parent-with-fee {
                                    border-bottom: 1px dashed rgba(16, 185, 129, 0.25) !important;
                                }
                                .parent-with-fee td {
                                    border-bottom: 1px dashed rgba(16, 185, 129, 0.25) !important;
                                }
                                .parent-with-fee td:first-child {
                                    border-inline-start: 3px solid #10b981 !important;
                                }
                                .nested-fee-row {
                                    background: rgba(16, 185, 129, 0.025) !important;
                                }
                                .nested-fee-row:hover {
                                    background: rgba(16, 185, 129, 0.055) !important;
                                }
                                .nested-fee-row td {
                                    padding-top: 3px !important;
                                    padding-bottom: 3px !important;
                                    height: 28px !important;
                                    border-bottom: 1px solid var(--border-color) !important;
                                    font-size: 0.72rem !important;
                                    line-height: 1.2 !important;
                                }
                                .nested-fee-row td:first-child {
                                    border-inline-start: 3px solid #10b981 !important;
                                }
                                .nested-fee-category {
                                    color: #10b981;
                                    font-weight: 600;
                                    font-size: 0.72rem !important;
                                }
                                .nested-fee-amount {
                                    color: #10b981;
                                    font-weight: 600;
                                    font-size: 0.74rem !important;
                                }
                                .nested-fee-tree {
                                    color: #10b981;
                                }
                                .nested-fee-row .tx-action-group {
                                    padding: 1px 2px;
                                    border-radius: 4px;
                                    gap: 2px;
                                    background: rgba(0, 0, 0, 0.15);
                                }
                                .nested-fee-row .tx-action-btn {
                                    width: 20px;
                                    height: 20px;
                                    border-radius: 4px;
                                    opacity: 0.75;
                                }
                                .nested-fee-row .tx-action-btn:hover {
                                    opacity: 1;
                                }

                                /* Project Summary & Net Values */
                                .project-net-val {
                                    margin-left: 8px;
                                    margin-right: 8px;
                                    font-weight: 800;
                                }
                                .project-net-val.positive {
                                    color: #34d399;
                                }
                                .project-net-val.negative {
                                    color: #f87171;
                                }

                                /* Table Amount */
                                .tx-amount.income {
                                    color: #34d399;
                                }
                                .tx-amount.expense {
                                    color: var(--text-primary);
                                }

                                /* Standardized Action Button Group */
                                .tx-action-group {
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 3px;
                                    background: rgba(255, 255, 255, 0.02);
                                    padding: 2px 4px;
                                    border-radius: 8px;
                                    border: 1px solid rgba(255, 255, 255, 0.06);
                                }
                                .tx-action-btn {
                                    width: 28px;
                                    height: 28px;
                                    border-radius: 6px;
                                    display: inline-flex;
                                    align-items: center;
                                    justify-content: center;
                                    background: transparent;
                                    border: 1px solid transparent;
                                    color: var(--text-secondary);
                                    cursor: pointer;
                                    transition: all 0.15s ease;
                                }
                                .tx-action-btn:hover {
                                    background: rgba(255, 255, 255, 0.08);
                                    color: var(--text-primary);
                                }
                                .tx-action-btn.view:hover {
                                    color: var(--color-primary);
                                    background: rgba(0, 113, 227, 0.15);
                                    border-color: rgba(0, 113, 227, 0.3);
                                }
                                .tx-action-btn.edit:hover {
                                    color: #60a5fa;
                                    background: rgba(59, 130, 246, 0.15);
                                    border-color: rgba(59, 130, 246, 0.3);
                                }
                                .tx-action-btn.refund:hover {
                                    color: #fbbf24;
                                    background: rgba(245, 158, 11, 0.15);
                                    border-color: rgba(245, 158, 11, 0.3);
                                }
                                .tx-action-btn.delete:hover {
                                    color: #f87171;
                                    background: rgba(239, 68, 68, 0.15);
                                    border-color: rgba(239, 68, 68, 0.3);
                                }
                                .tx-action-btn.approve:hover {
                                    color: #34d399;
                                    background: rgba(16, 185, 129, 0.15);
                                    border-color: rgba(16, 185, 129, 0.3);
                                }
                                .tx-action-btn.reject:hover {
                                    color: #f87171;
                                    background: rgba(239, 68, 68, 0.15);
                                    border-color: rgba(239, 68, 68, 0.3);
                                }

                                /* =========================================================
                                   LIGHT MODE (HIGH CONTRAST — NO LIGHT TEXT ON LIGHT BG!)
                                   ========================================================= */
                                body.light-mode .project-header {
                                    background: #f5eedf !important;
                                    border-bottom: 1px solid #d8cbaf !important;
                                }
                                body.light-mode .project-title {
                                    color: #1c1710 !important;
                                }
                                body.light-mode .project-summary {
                                    color: #4a3f31 !important;
                                    font-weight: 700 !important;
                                }
                                body.light-mode .project-net-val.positive {
                                    color: #065f46 !important;
                                    font-weight: 800 !important;
                                }
                                body.light-mode .project-net-val.negative {
                                    color: #991b1b !important;
                                    font-weight: 800 !important;
                                }

                                /* Light Mode Table Headers & Cells */
                                body.light-mode .transaction-table th {
                                    background: #ede4d0 !important;
                                    color: #3b3123 !important;
                                    border-bottom: 2px solid #cfbe9f !important;
                                    font-weight: 800 !important;
                                }
                                body.light-mode .transaction-table td {
                                    border-bottom: 1px solid #e5dcce !important;
                                    color: #1c1710 !important;
                                }
                                body.light-mode .transaction-table tbody tr.tx-row:hover {
                                    background: rgba(60, 45, 20, 0.035) !important;
                                }
                                body.light-mode .tx-amount.income {
                                    color: #065f46 !important;
                                    font-weight: 800 !important;
                                }
                                body.light-mode .tx-amount.expense {
                                    color: #1c1710 !important;
                                    font-weight: 800 !important;
                                }

                                /* Light Mode Type Pills — Deep Saturated Contrast */
                                body.light-mode .badge-type-pill.expense {
                                    background: #fee2e2 !important;
                                    color: #991b1b !important;
                                    border: 1px solid #fca5a5 !important;
                                    font-weight: 800 !important;
                                }
                                body.light-mode .badge-type-pill.income {
                                    background: #d1fae5 !important;
                                    color: #065f46 !important;
                                    border: 1px solid #6ee7b7 !important;
                                    font-weight: 800 !important;
                                }
                                body.light-mode .badge-type-pill.profit {
                                    background: #cffafe !important;
                                    color: #155e75 !important;
                                    border: 1px solid #67e8f9 !important;
                                    font-weight: 800 !important;
                                }

                                /* Light Mode Payment Method Badges */
                                body.light-mode .badge-method-pill.bank {
                                    background: #dbeafe !important;
                                    color: #1e40af !important;
                                    border: 1px solid #93c5fd !important;
                                    font-weight: 700 !important;
                                }
                                body.light-mode .badge-method-pill.cash {
                                    background: #fef3c7 !important;
                                    color: #854d0e !important;
                                    border: 1px solid #fde68a !important;
                                    font-weight: 700 !important;
                                }
                                body.light-mode .badge-method-pill.check {
                                    background: #f3e8ff !important;
                                    color: #6b21a8 !important;
                                    border: 1px solid #d8b4fe !important;
                                    font-weight: 700 !important;
                                }
                                body.light-mode .badge-method-pill.card {
                                    background: #e0e7ff !important;
                                    color: #3730a3 !important;
                                    border: 1px solid #a5b4fc !important;
                                    font-weight: 700 !important;
                                }
                                body.light-mode .badge-method-pill.custody {
                                    background: #e2e8f0 !important;
                                    color: #1e293b !important;
                                    border: 1px solid #cbd5e1 !important;
                                    font-weight: 700 !important;
                                }

                                /* Light Mode Media Buttons */
                                body.light-mode .badge-media-btn.voice {
                                    background: #f3e8ff !important;
                                    color: #6b21a8 !important;
                                    border: 1px solid #d8b4fe !important;
                                    font-weight: 700 !important;
                                }
                                body.light-mode .badge-media-btn.voice:hover {
                                    background: #e9d5ff !important;
                                }
                                body.light-mode .badge-media-btn.receipt {
                                    background: #dbeafe !important;
                                    color: #1e40af !important;
                                    border: 1px solid #93c5fd !important;
                                    font-weight: 700 !important;
                                }
                                body.light-mode .badge-media-btn.receipt:hover {
                                    background: #bfdbfe !important;
                                }
                                body.light-mode .badge-media-btn.ai {
                                    background: #e0e7ff !important;
                                    color: #3730a3 !important;
                                    border: 1px solid #a5b4fc !important;
                                    font-weight: 700 !important;
                                }

                                /* Light Mode Nested Fees */
                                body.light-mode .parent-with-fee {
                                    border-bottom: 1px dashed rgba(5, 150, 105, 0.3) !important;
                                }
                                body.light-mode .parent-with-fee td {
                                    border-bottom: 1px dashed rgba(5, 150, 105, 0.3) !important;
                                }
                                body.light-mode .parent-with-fee td:first-child {
                                    border-inline-start: 3px solid #059669 !important;
                                }
                                body.light-mode .nested-fee-row {
                                    background: rgba(16, 185, 129, 0.035) !important;
                                }
                                body.light-mode .nested-fee-row:hover {
                                    background: rgba(16, 185, 129, 0.07) !important;
                                }
                                body.light-mode .nested-fee-row td:first-child {
                                    border-inline-start: 3px solid #059669 !important;
                                }
                                body.light-mode .fee-included-tag {
                                    background: #d1fae5 !important;
                                    color: #065f46 !important;
                                    border: 1px solid #6ee7b7 !important;
                                    font-weight: 700 !important;
                                }
                                body.light-mode .nested-fee-category {
                                    color: #065f46 !important;
                                    font-weight: 600 !important;
                                    font-size: 0.72rem !important;
                                }
                                body.light-mode .nested-fee-amount {
                                    color: #065f46 !important;
                                    font-weight: 700 !important;
                                    font-size: 0.74rem !important;
                                }
                                body.light-mode .nested-fee-tree {
                                    color: #059669 !important;
                                }
                                body.light-mode .nested-fee-row .tx-action-group {
                                    background: rgba(0, 0, 0, 0.04);
                                }

                                /* Light Mode Status Badges */
                                body.light-mode .badge.badge-success {
                                    background: #d1fae5 !important;
                                    color: #065f46 !important;
                                    border: 1px solid #a7f3d0 !important;
                                    font-weight: 700 !important;
                                }
                                body.light-mode .badge.badge-warning {
                                    background: #fef3c7 !important;
                                    color: #92400e !important;
                                    border: 1px solid #fde68a !important;
                                    font-weight: 700 !important;
                                }
                                body.light-mode .badge.badge-danger {
                                    background: #fee2e2 !important;
                                    color: #991b1b !important;
                                    border: 1px solid #fca5a5 !important;
                                    font-weight: 700 !important;
                                }
                                body.light-mode .badge.badge-secondary {
                                    background: #e2e8f0 !important;
                                    color: #334155 !important;
                                    border: 1px solid #cbd5e1 !important;
                                    font-weight: 700 !important;
                                }

                                /* Light Mode Action Buttons */
                                body.light-mode .tx-action-group {
                                    background: rgba(60, 45, 20, 0.04) !important;
                                    border-color: rgba(60, 45, 20, 0.12) !important;
                                }
                                body.light-mode .tx-action-btn {
                                    color: #574e3f !important;
                                }
                                body.light-mode .tx-action-btn:hover {
                                    background: rgba(60, 45, 20, 0.08) !important;
                                    color: #1c1710 !important;
                                }
                                body.light-mode .tx-action-btn.view:hover {
                                    background: #dbeafe !important;
                                    color: #1e40af !important;
                                    border-color: #93c5fd !important;
                                }
                                body.light-mode .tx-action-btn.edit:hover {
                                    background: #e0e7ff !important;
                                    color: #3730a3 !important;
                                    border-color: #a5b4fc !important;
                                }
                                body.light-mode .tx-action-btn.refund:hover {
                                    background: #fef3c7 !important;
                                    color: #92400e !important;
                                    border-color: #fde68a !important;
                                }
                                body.light-mode .tx-action-btn.delete:hover {
                                    background: #fee2e2 !important;
                                    color: #991b1b !important;
                                    border-color: #fca5a5 !important;
                                }
                                body.light-mode .tx-action-btn.approve:hover {
                                    background: #d1fae5 !important;
                                    color: #065f46 !important;
                                    border-color: #6ee7b7 !important;
                                }
                                body.light-mode .tx-action-btn.reject:hover {
                                    background: #fee2e2 !important;
                                    color: #991b1b !important;
                                    border-color: #fca5a5 !important;
                                }

                                .truncate {
                                    white-space: nowrap;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
                                }
                            `}
                        </style>

                        {/* Pending Approvals Section (Managers Only) */}
                        {filterType !== 'MY_LEDGER' && pendingTransactions.length > 0 && !!user?.role?.match(/MANAGER|ADMIN/) && (
                            <div className="project-group mb-xl" style={{ overflow: 'hidden', borderInlineStart: '4px solid var(--color-warning)' }}>
                                <div className="project-header" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                    <h3 className="project-title flex gap-sm items-center" style={{ color: 'var(--text-primary)' }}>
                                        <Clock size={20} className="text-warning" />
                                        {t('finance.pendingApprovals') || 'موافقات معلقة'}
                                        <span className="badge badge-warning" style={{ borderRadius: '50%', padding: '2px 8px' }}>{pendingTransactions.length}</span>
                                    </h3>
                                </div>
                                <div style={{ overflowX: 'auto', width: '100%' }}>
                                    <table className="transaction-table">
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'start', width: '105px' }}>{t('common.date')}</th>
                                                <th style={{ textAlign: 'start', width: '130px' }}>{t('finance.project')}</th>
                                                <th style={{ textAlign: 'start', width: '135px' }}>{t('finance.category')}</th>
                                                <th style={{ textAlign: 'start' }}>{t('finance.description')}</th>
                                                <th style={{ textAlign: 'start', width: '165px' }}>{t('finance.payerContact') || (isArabic ? 'الدافع / جهة الاتصال' : 'Payer / Contact')}</th>
                                                <th style={{ textAlign: 'start', width: '145px' }}>{t('finance.paymentMethod') || (isArabic ? 'طريقة الدفع' : 'Payment Method')}</th>
                                                <th style={{ textAlign: 'end', width: '130px' }}>{t('finance.amount')}</th>
                                                <th style={{ textAlign: 'start', width: '110px' }}>{t('finance.createdBy') || (isArabic ? 'بواسطة' : 'Created By')}</th>
                                                <th style={{ textAlign: 'center', width: '115px' }}>{t('common.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingTransactions.map((tx) => (
                                                <tr key={tx.id} className="tx-row" style={{ background: 'hsla(38, 92%, 50%, 0.05)' }}>
                                                    <td style={{ textAlign: 'start', fontWeight: '500', fontSize: '0.82rem' }}>{formatDate(tx.transactionDate)}</td>
                                                    <td style={{ textAlign: 'start' }}>{tx.project?.name || '-'}</td>
                                                    <td style={{ textAlign: 'start', fontWeight: '600' }}>{t(`finance.categories.${tx.category?.toLowerCase()}`) || tx.category}</td>
                                                    <td style={{ textAlign: 'start', maxWidth: '220px' }} className="truncate" title={tx.description}>{tx.description}</td>
                                                    <td style={{ textAlign: 'start', maxWidth: '165px' }}>
                                                        {renderPayerOrClient(tx)}
                                                    </td>
                                                    <td style={{ textAlign: 'start' }}>
                                                         {renderPaymentMethod(tx.paymentMethod, tx)}
                                                     </td>
                                                     <td style={{ textAlign: 'end', fontWeight: '700', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>
                                                         {fmtCurrency(tx.amount)}
                                                     </td>
                                                     <td style={{ textAlign: 'start' }}>{tx.creator?.name || '-'}</td>
                                                     <td style={{ textAlign: 'center' }}>
                                                         <div className="tx-action-group">
                                                             <button
                                                                 className="tx-action-btn view"
                                                                 onClick={() => handleOpenDetail(tx)}
                                                                 title={isArabic ? 'عرض التفاصيل وأدلة الإثبات' : 'View Details & Evidence'}
                                                             >
                                                                 <Eye size={15} />
                                                             </button>
                                                             <button
                                                                 className="tx-action-btn approve"
                                                                 onClick={() => handleApprove(tx.id)}
                                                                 title={t('common.approve') || 'Approve'}
                                                             >
                                                                 <CheckCircle size={15} />
                                                             </button>
                                                             <button
                                                                 className="tx-action-btn reject"
                                                                 onClick={() => handleReject(tx.id)}
                                                                 title={t('common.reject') || 'Reject'}
                                                             >
                                                                 <XCircle size={15} />
                                                             </button>
                                                         </div>
                                                     </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Grouping Logic for Approved/Income Transactions */}
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
                                const totalAmount = txs.reduce((sum, tx) => {
                                    if (tx.status === 'CANCELLED') return sum; // Refunded transactions do not affect net total
                                    if (filterType === 'MY_LEDGER') {
                                        // Custody logic:
                                        // User received money (Transfer TO me) -> + Balance
                                        // User spent money (Expense FROM me) -> - Balance
                                        let impact = 0;
                                        if (tx.type === 'EXPENSE' && tx.category === 'CUSTODY_TRANSFER' && tx.toEngineerId === user.id) {
                                            impact = Number(tx.amount); // I received custody
                                        } else if (tx.type === 'EXPENSE' && tx.category === 'CUSTODY_TRANSFER' && tx.creator?.id === user.id) {
                                            impact = -Number(tx.amount); // I sent custody
                                        } else if (tx.type === 'EXPENSE' && tx.payerUserId === user.id) {
                                            impact = -Number(tx.amount); // I paid an expense
                                        } else if (tx.type === 'INCOME' && tx.payerUserId === user.id) {
                                            // Edge case: I received income into my custody directly
                                            impact = Number(tx.amount);
                                        }
                                        return sum + impact;
                                    } else if (filterType === 'COMPANY_SHARE') {
                                        return sum + Number(tx.amount || 0);
                                    } else {
                                        // Standard project logic
                                        return sum + (tx.type === 'INCOME' ? Number(tx.amount) : -Number(tx.amount));
                                    }
                                }, 0);

                                return (
                                    <div key={projectName} className="project-group" style={{ overflow: 'hidden' }}>
                                        <div className="project-header">
                                            <h3 className="project-title">
                                                {/* #14 — Clickable project name link */}
                                                {txs[0]?.project?.id ? (
                                                    <Link
                                                        to={`/projects/${txs[0].project.id}`}
                                                        style={{
                                                             color: 'var(--color-primary)',
                                                            textDecoration: 'none',
                                                            borderBottom: '1px dashed var(--color-primary)',
                                                            paddingBottom: 2
                                                        }}
                                                        title={`Go to project: ${projectName}`}
                                                    >
                                                        {projectName}
                                                    </Link>
                                                ) : projectName}</h3>
                                            <div className="project-summary">
                                                {filterType === 'MY_LEDGER'
                                                    ? (t('finance.myNetCustody') || 'صافي العهدة')
                                                    : filterType === 'COMPANY_SHARE'
                                                    ? (t('finance.totalCompanyShare') || (isArabic ? 'إجمالي ارباح المكتب' : 'Total Office Profit'))
                                                    : (t('finance.projectNet') || 'صافي المشروع')}:
                                                <span className={`project-net-val ${totalAmount >= 0 ? 'positive' : 'negative'}`}>
                                                    {fmtCurrency(Math.abs(totalAmount))}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ overflowX: 'auto', width: '100%' }}>
                                            <table className="transaction-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ textAlign: 'start', width: '105px' }}>{t('common.date')}</th>
                                                        <th style={{ textAlign: 'center', width: '92px' }}>{t('common.type')}</th>
                                                        <th style={{ textAlign: 'start', width: '135px' }}>{t('finance.category')}</th>
                                                        <th style={{ textAlign: 'start' }}>{t('finance.description')}</th>
                                                        <th style={{ textAlign: 'start', width: '165px' }}>{t('finance.payerContact') || (isArabic ? 'الدافع / جهة الاتصال' : 'Payer / Contact')}</th>
                                                        <th style={{ textAlign: 'start', width: '145px' }}>{t('finance.paymentMethod') || (isArabic ? 'طريقة الدفع' : 'Payment Method')}</th>
                                                        <th style={{ textAlign: 'end', width: '130px' }}>{t('finance.amount')}</th>
                                                        <th style={{ textAlign: 'center', width: '95px' }}>{t('common.status')}</th>
                                                        <th style={{ textAlign: 'center', width: '115px' }}>{t('common.actions')}</th>
                                                    </tr>
                                                </thead>
                                                 <tbody>
                                                    {(() => {
                                                        const displayTxs = organizeTransactionsWithFees(txs, filterType === 'ALL');
                                                        return displayTxs.map((tx) => {
                                                            const isCancelled = tx.status === 'CANCELLED';
                                                            const hasNestedFees = tx.nestedFees && tx.nestedFees.length > 0;
                                                            const catLabel = t(`finance.categories.${tx.category?.toLowerCase()}`) || tx.category || '';
                                                            const isDescDuplicate = !tx.description || tx.description.trim().toLowerCase() === catLabel.trim().toLowerCase();

                                                            return (
                                                                <Fragment key={tx.id}>
                                                                    <tr
                                                                        key={tx.id}
                                                                        className={`tx-row ${hasNestedFees ? 'parent-with-fee' : ''}`}
                                                                        style={isCancelled ? { opacity: 0.6, background: 'rgba(255, 255, 255, 0.01)' } : undefined}
                                                                    >
                                                                        {/* 1. Date */}
                                                                        <td style={{ textAlign: 'start', fontWeight: '500', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                                                                            <span dir="ltr" style={{ unicodeBidi: 'plaintext' }}>
                                                                                {formatDate(tx.transactionDate || tx.createdAt)}
                                                                            </span>
                                                                        </td>

                                                                        {/* 2. Type */}
                                                                        <td style={{ textAlign: 'center' }}>
                                                                            {tx.category === 'MANAGEMENT_FEE_TRANSFER' ? (
                                                                                <span className="badge-type-pill profit">
                                                                                    {isArabic ? 'أرباح مكتب' : 'PROFIT'}
                                                                                </span>
                                                                            ) : (
                                                                                <span className={`badge-type-pill ${tx.type === 'INCOME' ? 'income' : 'expense'}`}>
                                                                                    {tx.type === 'INCOME' ? (isArabic ? 'إيراد' : 'INCOME') : (isArabic ? 'مصروف' : 'EXPENSE')}
                                                                                </span>
                                                                            )}
                                                                        </td>

                                                                        {/* 3. Category */}
                                                                        <td style={{ textAlign: 'start', fontWeight: '600', fontSize: '0.84rem' }}>
                                                                            <div className="truncate" title={catLabel}>
                                                                                {catLabel}
                                                                            </div>
                                                                        </td>

                                                                        {/* 4. Description */}
                                                                        <td style={{ textAlign: 'start', maxWidth: '240px' }}>
                                                                            <div
                                                                                className="truncate"
                                                                                style={{
                                                                                    color: isDescDuplicate ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                                                                    textDecoration: isCancelled ? 'line-through' : 'none'
                                                                                }}
                                                                                title={tx.description || ''}
                                                                            >
                                                                                {isDescDuplicate ? '—' : tx.description}
                                                                            </div>
                                                                            <div className="flex items-center gap-xs flex-wrap" style={{ marginTop: '2px' }}>
                                                                                {tx.projectCostItem && (
                                                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: '600' }}>
                                                                                        #{tx.projectCostItem.name}
                                                                                    </span>
                                                                                )}
                                                                                {hasNestedFees && (
                                                                                    <span className="fee-included-tag" title={isArabic ? 'يتضمن أتعاب إدارة كوست بلس (+10%)' : 'Includes Cost-Plus Fee (+10%)'}>
                                                                                        {isArabic ? '+10% أتعاب' : '+10% Fee'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>

                                                                        {/* 5. Payer / Contact */}
                                                                        <td style={{ textAlign: 'start', maxWidth: '165px' }}>
                                                                            {renderPayerOrClient(tx)}
                                                                        </td>

                                                                        {/* 6. Payment Method & Media */}
                                                                        <td style={{ textAlign: 'start' }}>
                                                                            {renderPaymentMethod(tx.paymentMethod, tx)}
                                                                        </td>

                                                                        {/* 7. Amount */}
                                                                        <td style={{ textAlign: 'end', fontWeight: '700', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                                                            <span className={`tx-amount ${tx.type === 'INCOME' ? 'income' : 'expense'}`}>
                                                                                {tx.type === 'INCOME' ? '+ ' : ''}{fmtCurrency(tx.amount)}
                                                                            </span>
                                                                        </td>

                                                                        {/* 8. Status */}
                                                                        <td style={{ textAlign: 'center' }}>
                                                                            <span className={`badge ${tx.status === 'APPROVED' ? 'badge-success' : tx.status === 'PENDING_APPROVAL' ? 'badge-warning' : 'badge-secondary'}`} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px' }}>
                                                                                {t(`finance.status.${tx.status}`) || (tx.status === 'CANCELLED' ? (isArabic ? 'مسترد' : 'Refunded') : tx.status)}
                                                                            </span>
                                                                        </td>

                                                                        {/* 9. Actions */}
                                                                        <td style={{ textAlign: 'center' }}>
                                                                            <div className="tx-action-group">
                                                                                <button
                                                                                    className="tx-action-btn view"
                                                                                    onClick={() => handleOpenDetail(tx)}
                                                                                    title={isArabic ? 'عرض التفاصيل وأدلة الإثبات' : 'View Details & Evidence'}
                                                                                >
                                                                                    <Eye size={15} />
                                                                                </button>
                                                                                {isCancelled ? (
                                                                                    <button
                                                                                        className="tx-action-btn delete"
                                                                                        onClick={() => handleDeleteClick(tx)}
                                                                                        title={t('common.deletePermanently') || (isArabic ? 'حذف نهائي' : 'Delete Permanently')}
                                                                                    >
                                                                                        <Trash2 size={15} />
                                                                                    </button>
                                                                                ) : (
                                                                                    <>
                                                                                        <button
                                                                                            className="tx-action-btn edit"
                                                                                            onClick={() => openEditModal(tx)}
                                                                                            title={t('common.edit')}
                                                                                        >
                                                                                            <Pencil size={15} />
                                                                                        </button>
                                                                                        <button
                                                                                            className="tx-action-btn refund"
                                                                                            onClick={() => handleRefundClick(tx)}
                                                                                            title={t('finance.refund') || (isArabic ? 'استرداد وإلغاء' : 'Refund & Cancel')}
                                                                                        >
                                                                                            <RotateCcw size={15} />
                                                                                        </button>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>

                                                                    {/* Nested Cost-Plus Child Fee Rows */}
                                                                    {hasNestedFees && tx.nestedFees.map((feeTx) => {
                                                                        const isFeeCancelled = feeTx.status === 'CANCELLED';
                                                                        return (
                                                                            <tr
                                                                                key={feeTx.id}
                                                                                className="nested-fee-row"
                                                                                style={isFeeCancelled ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}
                                                                            >
                                                                                {/* 1. Date with Tree Branch Connector */}
                                                                                <td style={{ textAlign: 'start', whiteSpace: 'nowrap', paddingInlineStart: '32px' }}>
                                                                                    <div className="flex items-center gap-xs nested-fee-tree">
                                                                                        <CornerDownRight
                                                                                            size={11}
                                                                                            strokeWidth={2.5}
                                                                                            style={{
                                                                                                flexShrink: 0,
                                                                                                transform: isArabic ? 'scaleX(-1)' : 'none'
                                                                                            }}
                                                                                        />
                                                                                        <span dir="ltr" style={{ unicodeBidi: 'plaintext', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                                                                            {formatDate(feeTx.transactionDate || feeTx.createdAt)}
                                                                                        </span>
                                                                                    </div>
                                                                                </td>

                                                                                {/* 2. Type: Office Profit Micro Pill */}
                                                                                <td style={{ textAlign: 'center' }}>
                                                                                    <span className="badge-type-pill profit" style={{ height: '16px', fontSize: '0.56rem', minWidth: 'auto', padding: '0 5px', fontWeight: '700', borderRadius: '3px', lineHeight: '16px' }}>
                                                                                        {isArabic ? 'أرباح مكتب' : 'PROFIT'}
                                                                                    </span>
                                                                                </td>

                                                                                {/* 3. Category: Cost-Plus Fee with Sub-tree Indicator */}
                                                                                <td style={{ textAlign: 'start', fontSize: '0.71rem' }} className="nested-fee-category">
                                                                                    <span style={{ opacity: 0.55, marginInlineEnd: '4px' }}>↳</span>
                                                                                    {isArabic ? 'أتعاب كوست بلس (+10%)' : 'Cost-Plus Fee (+10%)'}
                                                                                </td>

                                                                                {/* 4. Description: Subordinate Auto-deducted Note */}
                                                                                <td style={{ textAlign: 'start', fontSize: '0.68rem', color: 'var(--text-tertiary)', fontStyle: 'italic', maxWidth: '240px' }}>
                                                                                    <div className="truncate" title={feeTx.description}>
                                                                                        {isArabic ? 'خصم تلقائي لأرباح المكتب من الخزينة' : 'Auto-deducted office fee from safe'}
                                                                                    </div>
                                                                                </td>

                                                                                {/* 5. Safe Routing */}
                                                                                <td style={{ textAlign: 'start', fontSize: '0.66rem', color: 'var(--text-tertiary)', maxWidth: '165px' }}>
                                                                                    <div className="truncate">
                                                                                        {isArabic ? 'خزينة المشروع ➔ أرباح المكتب' : 'Project Safe ➔ Office'}
                                                                                    </div>
                                                                                </td>

                                                                                {/* 6. Method */}
                                                                                <td style={{ textAlign: 'start' }}>
                                                                                    <span className="badge-method-pill custody" style={{ height: '16px', fontSize: '0.58rem', padding: '0 5px', borderRadius: '3px', lineHeight: '16px' }}>
                                                                                        {isArabic ? 'تحويل أرباح' : 'Profit Transfer'}
                                                                                    </span>
                                                                                </td>

                                                                                {/* 7. Amount: Compact Emerald Right-Aligned */}
                                                                                <td style={{ textAlign: 'end', fontWeight: '600', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontSize: '0.74rem' }}>
                                                                                    <span className="nested-fee-amount">
                                                                                        + {fmtCurrency(feeTx.amount)}
                                                                                    </span>
                                                                                </td>

                                                                                {/* 8. Status */}
                                                                                <td style={{ textAlign: 'center' }}>
                                                                                    <span className={`badge ${feeTx.status === 'APPROVED' ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '0.56rem', padding: '1px 5px', height: '14px', borderRadius: '3px', display: 'inline-flex', alignItems: 'center' }}>
                                                                                        {t(`finance.status.${feeTx.status}`) || feeTx.status}
                                                                                    </span>
                                                                                </td>

                                                                                {/* 9. Actions */}
                                                                                <td style={{ textAlign: 'center' }}>
                                                                                    <div className="tx-action-group">
                                                                                        {isFeeCancelled ? (
                                                                                            <button
                                                                                                className="tx-action-btn delete"
                                                                                                onClick={() => handleDeleteClick(feeTx)}
                                                                                                title={t('common.deletePermanently')}
                                                                                            >
                                                                                                <Trash2 size={11} />
                                                                                            </button>
                                                                                        ) : (
                                                                                            <>
                                                                                                <button
                                                                                                    className="tx-action-btn edit"
                                                                                                    onClick={() => openEditModal(feeTx)}
                                                                                                    title={t('common.edit')}
                                                                                                >
                                                                                                    <Pencil size={11} />
                                                                                                </button>
                                                                                                <button
                                                                                                    className="tx-action-btn refund"
                                                                                                    onClick={() => handleRefundClick(feeTx)}
                                                                                                    title={t('finance.refund') || 'Refund'}
                                                                                                >
                                                                                                    <RotateCcw size={11} />
                                                                                                </button>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </Fragment>
                                                            );
                                                        });
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
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
                itemName={t('finance.newTransaction')}
                title={t('common.deleteConfirmTitle')}
                message={t('common.deleteConfirmMessage')}
            />

            <RefundConfirmationModal
                isOpen={isRefundModalOpen}
                onClose={() => {
                    if (!isRefunding) {
                        setIsRefundModalOpen(false);
                        setTransactionToRefund(null);
                    }
                }}
                onConfirm={handleConfirmRefund}
                transaction={transactionToRefund}
                isLoading={isRefunding}
            />

            <TransactionDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedDetailTx(null);
                }}
                transaction={selectedDetailTx}
                onEdit={(tx) => openEditModal(tx)}
                onRefund={(tx) => handleRefundClick(tx)}
                canEdit={user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER' || user?.id === selectedDetailTx?.createdBy}
            />
        </Layout>
    );
}
