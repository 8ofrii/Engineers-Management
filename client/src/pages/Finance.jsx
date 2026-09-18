import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transactionsAPI, workmenAPI, projectsAPI } from '../services/api';
import { Plus, Wallet, FileText, Filter, Pencil, Trash2, X, CheckCircle, XCircle, Clock, Paperclip, Download, RotateCcw } from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import AddTransactionModal from '../components/AddTransactionModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import RefundConfirmationModal from '../components/RefundConfirmationModal';
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
                isArabic ? 'المستلم / إلى' : 'Recipient / To',
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

            rows.push([
                formatDate(tx.transactionDate || tx.createdAt),
                txType,
                tx.project?.name || (isArabic ? 'عام / غير محدد' : 'General'),
                catLabel,
                tx.description || '',
                tx.projectCostItem?.name || '',
                tx.paidByClientContact || tx.transactionFrom || tx.client?.name || '',
                tx.transactionTo || tx.workman?.name || '',
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

    const renderPaymentMethod = (method, receiptUrl = null) => {
        if (!method) return <span className="text-secondary">-</span>;
        let label = method;
        const badgeStyle = { fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', fontWeight: '500' };

        let badgeEl = null;
        switch (method) {
            case 'BANK_TRANSFER':
                label = t('finance.methods.bankTransfer') || (isArabic ? 'تحويل بنكي / إنستاباي' : 'Bank Transaction / InstaPay');
                badgeEl = <span className="badge badge-primary" style={badgeStyle}>🏦 {label}</span>;
                break;
            case 'CASH':
                label = t('finance.methods.cash') || (isArabic ? 'نقداً (كاش)' : 'Cash');
                badgeEl = <span className="badge badge-success" style={badgeStyle}>💵 {label}</span>;
                break;
            case 'CHECK':
                label = t('finance.methods.check') || (isArabic ? 'شيك' : 'Check');
                badgeEl = <span className="badge badge-warning" style={badgeStyle}>📝 {label}</span>;
                break;
            case 'CREDIT_CARD':
                label = t('finance.methods.creditCard') || (isArabic ? 'بطاقة ائتمان' : 'Credit Card');
                badgeEl = <span className="badge badge-secondary" style={badgeStyle}>💳 {label}</span>;
                break;
            case 'CUSTODY_WALLET':
                label = t('finance.methods.custodyWallet') || (isArabic ? 'عهدة مهندس' : 'Custody Wallet');
                badgeEl = <span className="badge badge-secondary" style={badgeStyle}>💼 {label}</span>;
                break;
            default:
                badgeEl = <span className="badge badge-secondary" style={badgeStyle}>{label}</span>;
        }

        return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {badgeEl}
                {receiptUrl && (
                    <a
                        href={receiptUrl.startsWith('http') ? receiptUrl : `/uploads/${receiptUrl.replace(/^(\/|uploads\/)/, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        title={isArabic ? 'عرض المرفق / الإيصال' : 'View Attachment / Receipt'}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 6px',
                            fontSize: '0.7rem',
                            background: 'hsla(220, 80%, 50%, 0.12)',
                            color: 'var(--color-primary)',
                            border: '1px solid var(--color-primary)',
                            borderRadius: '5px',
                            textDecoration: 'none',
                            fontWeight: '600'
                        }}
                    >
                        <Paperclip size={12} />
                        {isArabic ? 'مرفق' : 'Receipt'}
                    </a>
                )}
            </div>
        );
    };

    const renderPayerOrClient = (tx) => {
        if (tx.type === 'INCOME') {
            const clientName = tx.client?.name || tx.project?.client?.name || '';
            const payerRep = tx.paidByClientContact || (tx.transactionFrom && tx.transactionFrom !== clientName ? tx.transactionFrom : '');
            if (clientName && payerRep) {
                return (
                    <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{clientName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span>👤 {isArabic ? 'المفوض:' : 'By:'} {payerRep}</span>
                        </div>
                    </div>
                );
            }
            if (clientName) return <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{clientName}</span>;
            if (payerRep) return <span style={{ fontWeight: '600' }}>{payerRep}</span>;
            return <span className="text-secondary">-</span>;
        } else {
            const payer = tx.payer?.name || tx.user?.name || '';
            const recipient = tx.supplier?.name || tx.transactionTo || '';
            return (
                <div>
                    {payer && <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{payer}</div>}
                    {recipient && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isArabic ? 'إلى:' : 'To:'} {recipient}</div>}
                    {!payer && !recipient && <span className="text-secondary">-</span>}
                </div>
            );
        }
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
                                                <th>{t('common.date')}</th>
                                                <th>{t('finance.project')}</th>
                                                <th>{t('finance.category')}</th>
                                                <th>{t('finance.description')}</th>
                                                <th>{t('finance.payerContact') || (isArabic ? 'الدافع / جهة الاتصال' : 'Payer / Client Contact')}</th>
                                                <th>{t('finance.paymentMethod') || (isArabic ? 'طريقة الدفع' : 'Payment Method')}</th>
                                                <th>{t('finance.amount')}</th>
                                                <th>{t('finance.createdBy') || (isArabic ? 'بواسطة' : 'Created By')}</th>
                                                <th style={{ width: '120px' }}>{t('common.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingTransactions.map((tx) => (
                                                <tr key={tx.id} style={{ background: 'hsla(38, 92%, 50%, 0.05)' }}>
                                                    <td style={{ fontWeight: '500' }}>{formatDate(tx.transactionDate)}</td>
                                                    <td>{tx.project?.name || '-'}</td>
                                                    <td style={{ fontWeight: '500' }}>{t(`finance.categories.${tx.category?.toLowerCase()}`) || tx.category}</td>
                                                    <td style={{ maxWidth: '200px' }} className="truncate" title={tx.description}>{tx.description}</td>
                                                    <td style={{ maxWidth: '180px' }} className="truncate">
                                                        {renderPayerOrClient(tx)}
                                                    </td>
                                                    <td>
                                                        {renderPaymentMethod(tx.paymentMethod, tx.receiptPhotoUrl)}
                                                    </td>
                                                    <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                                        {fmtCurrency(tx.amount)}
                                                    </td>
                                                    <td>{tx.creator?.name || '-'}</td>
                                                    <td>
                                                        <div className="flex gap-sm justify-center">
                                                            <button className="btn-icon-sm" style={{ color: 'var(--color-success)', borderColor: 'var(--color-success)' }} onClick={() => handleApprove(tx.id)} title={t('common.approve') || 'Approve'}>
                                                                <CheckCircle size={16} />
                                                            </button>
                                                            <button className="btn-icon-sm" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => handleReject(tx.id)} title={t('common.reject') || 'Reject'}>
                                                                <XCircle size={16} />
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
                                                <span style={{
                                                    marginLeft: '8px',
                                                    marginRight: '8px',
                                                    fontWeight: 'bold',
                                                    color: (filterType === 'COMPANY_SHARE' || totalAmount >= 0) ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 200, 200, 1)'
                                                }}>
                                                    {fmtCurrency(Math.abs(totalAmount))}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ overflowX: 'auto', width: '100%' }}>
                                            <table className="transaction-table">
                                                <thead>
                                                    <tr>
                                                        <th>{t('common.date')}</th>
                                                        <th>{t('common.type')}</th>
                                                        <th>{t('finance.category')}</th>
                                                        <th>{t('finance.description')}</th>
                                                        <th>{t('finance.payerContact') || (isArabic ? 'الدافع / جهة الاتصال' : 'Payer / Client Contact')}</th>
                                                        <th>{t('finance.paymentMethod') || (isArabic ? 'طريقة الدفع' : 'Payment Method')}</th>
                                                        <th>{t('finance.amount')}</th>
                                                        <th>{t('common.status')}</th>
                                                        <th style={{ width: '120px' }}>{t('common.actions')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {txs.map((tx) => {
                                                        const isCancelled = tx.status === 'CANCELLED';
                                                        return (
                                                        <tr key={tx.id} style={isCancelled ? { opacity: 0.65, background: 'hsla(0, 0%, 50%, 0.05)' } : undefined}>
                                                            <td style={{ fontWeight: '500', whiteSpace: 'nowrap' }}>
                                                                <span dir="ltr" style={{ unicodeBidi: 'plaintext', display: 'inline-block' }}>
                                                                    {formatDate(tx.transactionDate)}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {tx.category === 'MANAGEMENT_FEE_TRANSFER' ? (
                                                                    <span className="badge" style={{ fontSize: '0.7rem', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 700 }}>
                                                                        {t('finance.companyShare') || (isArabic ? 'ارباح المكتب' : 'Office Profit')}
                                                                    </span>
                                                                ) : (
                                                                    <span className={`badge ${tx.type === 'INCOME' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                                                                        {tx.type === 'INCOME' ? t('finance.income') : t('finance.expense')}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td style={{ fontWeight: '500' }}>{t(`finance.categories.${tx.category?.toLowerCase()}`) || tx.category}</td>
                                                            <td style={{ maxWidth: '220px', textDecoration: isCancelled ? 'line-through' : 'none' }} className="truncate" title={tx.description}>
                                                                {tx.description}
                                                                {tx.projectCostItem && (
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '4px', fontWeight: '600' }}>
                                                                        #{tx.projectCostItem.name}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td style={{ maxWidth: '180px' }} className="truncate">
                                                                {renderPayerOrClient(tx)}
                                                            </td>
                                                            <td>
                                                                {renderPaymentMethod(tx.paymentMethod, tx.receiptPhotoUrl)}
                                                            </td>
                                                            <td style={{ fontWeight: '700', color: 'var(--text-primary)', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                                                {fmtCurrency(tx.amount)}
                                                            </td>
                                                            <td>
                                                                <span className={`badge ${tx.status === 'APPROVED' ? 'badge-success' : tx.status === 'PENDING_APPROVAL' ? 'badge-warning' : tx.status === 'CANCELLED' ? 'badge-secondary' : 'badge-secondary'}`} style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                                                                    {t(`finance.status.${tx.status}`) || (tx.status === 'CANCELLED' ? (isArabic ? 'مسترد / ملغي' : 'Refunded / Cancelled') : tx.status?.replace('_', ' '))}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div className="flex gap-sm justify-center">
                                                                    {isCancelled ? (
                                                                        <button className="btn-icon-sm text-danger" onClick={() => handleDeleteClick(tx)} title={t('common.deletePermanently') || (isArabic ? 'حذف نهائي من السجل' : 'Delete Permanently')}>
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    ) : (
                                                                        <>
                                                                            <button className="btn-icon-sm" onClick={() => openEditModal(tx)} title={t('common.edit')}>
                                                                                <Pencil size={16} />
                                                                            </button>
                                                                            <button className="btn-icon-sm" style={{ color: '#d97706', borderColor: '#d97706' }} onClick={() => handleRefundClick(tx)} title={t('finance.refund') || (isArabic ? 'استرداد وإلغاء' : 'Refund & Cancel')}>
                                                                                <RotateCcw size={16} />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        );
                                                    })}
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
        </Layout>
    );
}
