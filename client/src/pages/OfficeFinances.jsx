import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Building2,
    Wallet,
    TrendingUp,
    TrendingDown,
    Plus,
    ArrowRightLeft,
    FileText,
    Download,
    CreditCard,
    Smartphone,
    UserCheck,
    Search,
    Filter,
    Calendar,
    X,
    Pencil,
    Trash2,
    CheckCircle,
    AlertCircle,
    Eye
} from 'lucide-react';
import Layout from '../components/Layout';
import { safesAPI, transactionsAPI } from '../services/api';
import { useAlert } from '../context/AlertContext';
import { useFormat } from '../utils/format';
import { exportToXLSX } from '../utils/excelExport';
import AddTransactionModal from '../components/AddTransactionModal';
import TransactionDetailModal from '../components/TransactionDetailModal';

export default function OfficeFinances() {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { showAlert } = useAlert();
    const { currency: fmtCurrency, date: fmtDate } = useFormat();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Data states
    const [summary, setSummary] = useState(null);
    const [safes, setSafes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filtering & search
    const [safeTypeFilter, setSafeTypeFilter] = useState('ALL');
    const [txSearch, setTxSearch] = useState('');
    const [txCategoryFilter, setTxCategoryFilter] = useState('ALL');

    // Modals
    const [isAddSafeModalOpen, setIsAddSafeModalOpen] = useState(false);
    const [editingSafe, setEditingSafe] = useState(null);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferSourceSafeId, setTransferSourceSafeId] = useState('');
    const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
    const [selectedSafeForStatement, setSelectedSafeForStatement] = useState(null);
    const [statementData, setStatementData] = useState(null);
    const [statementLoading, setStatementLoading] = useState(false);
    const [statementDateFrom, setStatementDateFrom] = useState('');
    const [statementDateTo, setStatementDateTo] = useState('');

    // Transaction modal state (for "+ تسجيل مصروف مكتب")
    const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
    const [selectedTxDetail, setSelectedTxDetail] = useState(null);
    const [isTxDetailOpen, setIsTxDetailOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [summaryRes, safesRes] = await Promise.all([
                safesAPI.getOfficeFinancesSummary(),
                safesAPI.list({ includeInactive: false })
            ]);

            if (summaryRes?.data?.data) {
                setSummary(summaryRes.data.data);
            }
            if (safesRes?.data?.data) {
                setSafes(safesRes.data.data);
            }
        } catch (error) {
            console.error('Error loading office finances:', error);
            showAlert('error', isArabic ? 'فشل تحميل بيانات ماليات المقر' : 'Failed to load office finances data');
        } finally {
            setLoading(false);
        }
    };

    // Open Statement modal for a safe
    const handleOpenStatement = async (safe) => {
        setSelectedSafeForStatement(safe);
        setIsStatementModalOpen(true);
        setStatementDateFrom('');
        setStatementDateTo('');
        await fetchStatement(safe.id);
    };

    const fetchStatement = async (safeId, from = '', to = '') => {
        try {
            setStatementLoading(true);
            const params = {};
            if (from) params.dateFrom = from;
            if (to) params.dateTo = to;
            const res = await safesAPI.getStatement(safeId, params);
            if (res?.data?.data) {
                setStatementData(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching statement:', error);
            showAlert('error', isArabic ? 'فشل تحميل كشف الحساب' : 'Failed to fetch statement');
        } finally {
            setStatementLoading(false);
        }
    };

    const handleExportStatement = () => {
        if (!statementData || !statementData.statement || statementData.statement.length === 0) {
            showAlert('warning', isArabic ? 'لا توجد حركات للتصدير' : 'No transactions to export');
            return;
        }

        const rows = statementData.statement.map((item, idx) => ({
            '#': idx + 1,
            [isArabic ? 'التاريخ' : 'Date']: fmtDate(item.date),
            [isArabic ? 'النوع' : 'Type']: item.type === 'INCOME' ? (isArabic ? 'إيراد' : 'Income')
                : item.type === 'EXPENSE' ? (isArabic ? 'مصروف' : 'Expense')
                : item.type === 'TRANSFER_IN' ? (isArabic ? 'تحويل وارد' : 'Transfer In')
                : (isArabic ? 'تحويل صادر' : 'Transfer Out'),
            [isArabic ? 'وارد (+)' : 'Inflow (+)']: item.inflow > 0 ? item.inflow : 0,
            [isArabic ? 'منصرف (-)' : 'Outflow (-)']: item.outflow > 0 ? item.outflow : 0,
            [isArabic ? 'الرصيد بعد الحركة' : 'Balance After']: item.balanceAfter,
            [isArabic ? 'البيان' : 'Description']: item.description,
            [isArabic ? 'المرجع / الفاتورة' : 'Reference']: item.reference || '-',
            [isArabic ? 'الجهة / المشروع' : 'Party / Project']: item.projectName || item.partyName || '-'
        }));

        exportToXLSX(rows, `كشف_حساب_${statementData.safe.name}_${new Date().toISOString().slice(0, 10)}`);
    };

    // Filter safes
    const filteredSafes = safes.filter(s => {
        if (safeTypeFilter === 'ALL') return true;
        return s.type === safeTypeFilter;
    });

    // Filter recent transactions
    const recentTxs = summary?.recentTransactions || [];
    const filteredTxs = recentTxs.filter(tx => {
        if (txCategoryFilter !== 'ALL') {
            if (tx.category !== txCategoryFilter) return false;
        }
        if (txSearch.trim()) {
            const q = txSearch.toLowerCase();
            const desc = (tx.description || '').toLowerCase();
            const amount = String(tx.amount || '');
            const safeName = (tx.safe?.name || '').toLowerCase();
            const projectName = (tx.project?.name || '').toLowerCase();
            if (!desc.includes(q) && !amount.includes(q) && !safeName.includes(q) && !projectName.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const getSafeTypeBadge = (type) => {
        switch (type) {
            case 'BANK_ACCOUNT':
                return { label: isArabic ? 'حساب بنكي' : 'Bank Account', color: '#2563eb', icon: CreditCard };
            case 'MOBILE_WALLET':
                return { label: isArabic ? 'محفظة إلكترونية' : 'Mobile Wallet', color: '#8b5cf6', icon: Smartphone };
            case 'OWNER_ACCOUNT':
                return { label: isArabic ? 'حساب شريك / مدير' : 'Owner / Manager', color: '#059669', icon: UserCheck };
            default:
                return { label: isArabic ? 'خزينة نقدية (كاش)' : 'Cash Safe', color: '#d97706', icon: Wallet };
        }
    };

    return (
        <Layout>
            <div className="office-finances-page" style={{ paddingBottom: '60px' }}>
                {/* Sub-Tab Navigation Switcher */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: 'var(--spacing-lg)',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '12px'
                }}>
                    <Link
                        to="/finance"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 18px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            textDecoration: 'none',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--text-primary)';
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-secondary)';
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                    >
                        <Wallet size={18} />
                        <span>{isArabic ? 'المعاملات المحاسبية' : 'Accounting & Expenses'}</span>
                    </Link>
                    <Link
                        to="/office-finances"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 18px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            textDecoration: 'none',
                            background: 'var(--color-primary)',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)'
                        }}
                    >
                        <Building2 size={18} />
                        <span>{isArabic ? 'ماليات المقر والخزائن' : 'Office Finances & Safes'}</span>
                    </Link>
                </div>

                {/* Header Section */}
                <div className="flex-between mb-xl" style={{ flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 className="flex gap-md" style={{ alignItems: 'center', margin: 0 }}>
                            <Building2 size={32} style={{ color: 'var(--color-primary)' }} />
                            <span>{isArabic ? 'ماليات المقر وخزائن الشركة' : 'Office Finances & Company Safes'}</span>
                        </h1>
                        <p className="text-secondary" style={{ marginTop: '6px', fontSize: '0.95rem' }}>
                            {isArabic
                                ? 'المركز المالي الموحد لمصروفات وأرباح المقر الرئيسي وإدارة خزائن وسيولة الشركة'
                                : 'Consolidated headquarters financial hub, recognized profits, office expenses, and company safes'}
                        </p>
                    </div>

                    {/* Quick Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setTransferSourceSafeId('');
                                setIsTransferModalOpen(true);
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: 'var(--radius-md)' }}
                        >
                            <ArrowRightLeft size={18} />
                            <span>{isArabic ? 'تحويل بين الخزائن' : 'Transfer Safes'}</span>
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setEditingSafe(null);
                                setIsAddSafeModalOpen(true);
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: 'var(--radius-md)' }}
                        >
                            <Plus size={18} />
                            <span>{isArabic ? 'إضافة خزينة جديدة' : 'Add Safe'}</span>
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => setIsAddTxModalOpen(true)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)' }}
                        >
                            <Plus size={18} />
                            <span>{isArabic ? 'تسجيل مصروف مكتب' : 'Add Office Expense'}</span>
                        </button>
                    </div>
                </div>

                {/* ========================================================= */}
                {/* SECTION 1 (TOP HALF): OFFICE FINANCIALS & PROFIT/LOSS     */}
                {/* ========================================================= */}
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                            {isArabic ? '📊 المركز المالي للمقر الرئيسي' : 'Office Profit & Loss Overview'}
                        </h2>
                    </div>

                    {/* 4 Premium KPI Stat Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '16px',
                        marginBottom: '24px'
                    }}>
                        {/* 1. Total Office Profit */}
                        <div className="card" style={{
                            padding: '20px',
                            background: 'linear-gradient(145deg, var(--bg-surface), rgba(16, 185, 129, 0.05))',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {isArabic ? 'إجمالي أرباح المقر' : 'Total Office Profits'}
                                </span>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '8px',
                                    background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <TrendingUp size={20} />
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.5px' }}>
                                    {fmtCurrency(summary?.totalOfficeProfit || 0)}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                    {isArabic ? `أتعاب إدارة: ${fmtCurrency(summary?.totalManagementFees || 0)}` : `Fees: ${fmtCurrency(summary?.totalManagementFees || 0)}`}
                                </div>
                            </div>
                        </div>

                        {/* 2. Total Office Expenses */}
                        <div className="card" style={{
                            padding: '20px',
                            background: 'linear-gradient(145deg, var(--bg-surface), rgba(239, 68, 68, 0.05))',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {isArabic ? 'إجمالي مصروفات المقر' : 'Total Office Expenses'}
                                </span>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '8px',
                                    background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <TrendingDown size={20} />
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ef4444', letterSpacing: '-0.5px' }}>
                                    {fmtCurrency(summary?.totalOfficeExpenses || 0)}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                    {isArabic ? 'إيجار، فواتير، رواتب، مستلزمات المقر' : 'Rent, utilities, salaries, office supplies'}
                                </div>
                            </div>
                        </div>

                        {/* 3. Net Office Profit */}
                        <div className="card" style={{
                            padding: '20px',
                            background: (summary?.netOfficeProfit || 0) >= 0
                                ? 'linear-gradient(145deg, var(--bg-surface), rgba(59, 130, 246, 0.05))'
                                : 'linear-gradient(145deg, var(--bg-surface), rgba(239, 68, 68, 0.05))',
                            border: (summary?.netOfficeProfit || 0) >= 0
                                ? '1px solid rgba(59, 130, 246, 0.25)'
                                : '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {isArabic ? 'صافي أرباح المقر' : 'Net Office Profit'}
                                </span>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '8px',
                                    background: (summary?.netOfficeProfit || 0) >= 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: (summary?.netOfficeProfit || 0) >= 0 ? '#3b82f6' : '#ef4444',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Building2 size={20} />
                                </div>
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '1.65rem',
                                    fontWeight: 800,
                                    color: (summary?.netOfficeProfit || 0) >= 0 ? '#3b82f6' : '#ef4444',
                                    letterSpacing: '-0.5px'
                                }}>
                                    {fmtCurrency(summary?.netOfficeProfit || 0)}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                    {(summary?.netOfficeProfit || 0) >= 0
                                        ? (isArabic ? 'فائض تشغيلي في أرباح المقر' : 'Operating surplus')
                                        : (isArabic ? 'عجز تشغيلي في أرباح المقر' : 'Operating deficit')}
                                </div>
                            </div>
                        </div>

                        {/* 4. Total Liquid Funds across Safes */}
                        <div className="card" style={{
                            padding: '20px',
                            background: 'linear-gradient(145deg, var(--bg-surface), rgba(139, 92, 246, 0.05))',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {isArabic ? 'إجمالي السيولة في الخزائن' : 'Total Cash & Liquid Funds'}
                                </span>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '8px',
                                    background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Wallet size={20} />
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#8b5cf6', letterSpacing: '-0.5px' }}>
                                    {fmtCurrency(summary?.totalLiquidFunds || 0)}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                    {isArabic ? `موزعة على ${safes.length} خزينة وحساب` : `Across ${safes.length} safes & accounts`}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Category Breakdown Tags */}
                    {summary?.categoryBreakdown && summary.categoryBreakdown.length > 0 && (
                        <div style={{
                            background: 'var(--bg-secondary)',
                            padding: '14px 18px',
                            borderRadius: '10px',
                            border: '1px solid var(--border-color)',
                            marginBottom: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            flexWrap: 'wrap'
                        }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Filter size={15} />
                                {isArabic ? 'تصنيفات مصروفات المقر:' : 'Expense Breakdown:'}
                            </span>
                            {summary.categoryBreakdown.map(item => (
                                <span
                                    key={item.category}
                                    style={{
                                        fontSize: '0.8rem',
                                        padding: '4px 10px',
                                        borderRadius: 'var(--radius-full)',
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span>{t(`finance.categories.${item.category.toLowerCase()}`) || item.category}:</span>
                                    <span style={{ color: '#ef4444' }}>{fmtCurrency(item.amount)}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Recent Office Transactions Table */}
                    <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                                {isArabic ? 'آخر معاملات المقر وأرباح الإدارة' : 'Recent Office Transactions & Fee Transfers'}
                            </h3>

                            {/* Search & Filter */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', top: '10px', [isArabic ? 'right' : 'left']: '10px', color: 'var(--text-tertiary)' }} />
                                    <input
                                        type="text"
                                        placeholder={isArabic ? 'بحث في معاملات المقر...' : 'Search office txs...'}
                                        value={txSearch}
                                        onChange={(e) => setTxSearch(e.target.value)}
                                        style={{
                                            padding: '6px 12px',
                                            [isArabic ? 'paddingRight' : 'paddingLeft']: '32px',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-tertiary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.85rem',
                                            width: '200px'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {filteredTxs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)' }}>
                                {isArabic ? 'لا توجد معاملات مسجلة للمقر حالياً' : 'No office transactions found'}
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>{isArabic ? 'التاريخ' : 'Date'}</th>
                                            <th>{isArabic ? 'البيان' : 'Description'}</th>
                                            <th>{isArabic ? 'التصنيف' : 'Category'}</th>
                                            <th>{isArabic ? 'المبلغ' : 'Amount'}</th>
                                            <th>{isArabic ? 'الخزينة المرتبطة' : 'Linked Safe'}</th>
                                            <th>{isArabic ? 'المسجل' : 'Recorded By'}</th>
                                            <th>{isArabic ? 'الحالة' : 'Status'}</th>
                                            <th>{isArabic ? 'إجراء' : 'Action'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTxs.map(tx => {
                                            const isFee = tx.category === 'MANAGEMENT_FEE_TRANSFER';
                                            const isIncome = tx.type === 'INCOME';
                                            return (
                                                <tr key={tx.id}>
                                                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                                        {fmtDate(tx.transactionDate || tx.createdAt)}
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                            {tx.description}
                                                        </div>
                                                        {tx.project && (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                                                                📁 {tx.project.name}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            background: isFee ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-tertiary)',
                                                            color: isFee ? '#10b981' : 'var(--text-primary)',
                                                            border: '1px solid var(--border-color)',
                                                            fontWeight: 600
                                                        }}>
                                                            {isFee ? (isArabic ? 'أتعاب إدارة' : 'Management Fee') : (t(`finance.categories.${tx.category?.toLowerCase()}`) || tx.category)}
                                                        </span>
                                                    </td>
                                                    <td style={{
                                                        fontWeight: 700,
                                                        color: isFee || isIncome ? '#10b981' : '#ef4444',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {isFee || isIncome ? '+' : '-'}{fmtCurrency(tx.amount)}
                                                    </td>
                                                    <td style={{ fontSize: '0.85rem' }}>
                                                        {tx.safe ? (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                <Wallet size={14} style={{ color: 'var(--color-primary)' }} />
                                                                {tx.safe.name}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                                        )}
                                                    </td>
                                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        {tx.user?.name || '-'}
                                                    </td>
                                                    <td>
                                                        <span className={`badge badge-${tx.status?.toLowerCase()}`}>
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="btn btn-sm btn-ghost"
                                                            onClick={() => {
                                                                setSelectedTxDetail(tx);
                                                                setIsTxDetailOpen(true);
                                                            }}
                                                            style={{ padding: '4px 8px' }}
                                                            title={isArabic ? 'تفاصيل المعاملة' : 'View details'}
                                                        >
                                                            <Eye size={15} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* ========================================================= */}
                {/* SECTION 2 (BOTTOM HALF): COMPANY SAFES & TREASURY ACCOUNTS */}
                {/* ========================================================= */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                                {isArabic ? '🏦 خزائن الشركة والحسابات المالية' : 'Company Safes & Treasury Accounts'}
                            </h2>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {isArabic
                                    ? 'الحسابات البنكية والخزائن النقدية والمحافظ التي تودع وتصرف منها أموال الشركة'
                                    : 'Physical cash safes, corporate bank accounts, and mobile wallets'}
                            </p>
                        </div>

                        {/* Safe Type Filter Switcher */}
                        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <button
                                className={`btn btn-sm ${safeTypeFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setSafeTypeFilter('ALL')}
                                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                            >
                                {isArabic ? 'الكل' : 'All'}
                            </button>
                            <button
                                className={`btn btn-sm ${safeTypeFilter === 'CASH_SAFE' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setSafeTypeFilter('CASH_SAFE')}
                                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                            >
                                {isArabic ? 'خزائن كاش' : 'Cash'}
                            </button>
                            <button
                                className={`btn btn-sm ${safeTypeFilter === 'BANK_ACCOUNT' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setSafeTypeFilter('BANK_ACCOUNT')}
                                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                            >
                                {isArabic ? 'بنوك' : 'Banks'}
                            </button>
                            <button
                                className={`btn btn-sm ${safeTypeFilter === 'MOBILE_WALLET' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setSafeTypeFilter('MOBILE_WALLET')}
                                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                            >
                                {isArabic ? 'محافظ' : 'Wallets'}
                            </button>
                            <button
                                className={`btn btn-sm ${safeTypeFilter === 'OWNER_ACCOUNT' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setSafeTypeFilter('OWNER_ACCOUNT')}
                                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                            >
                                {isArabic ? 'شركاء/مديرين' : 'Partners'}
                            </button>
                        </div>
                    </div>

                    {/* Safes Cards Grid */}
                    {filteredSafes.length === 0 ? (
                        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                            <Building2 size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                            <p style={{ fontSize: '1rem', margin: '0 0 12px' }}>
                                {isArabic ? 'لا توجد خزائن مطابقة في هذا التصنيف' : 'No safes found in this category'}
                            </p>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                    setEditingSafe(null);
                                    setIsAddSafeModalOpen(true);
                                }}
                            >
                                <Plus size={16} />
                                <span>{isArabic ? 'إضافة أول خزينة' : 'Add First Safe'}</span>
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                            gap: '20px'
                        }}>
                            {filteredSafes.map(safe => {
                                const badgeInfo = getSafeTypeBadge(safe.type);
                                const IconComponent = badgeInfo.icon;
                                const isPositive = Number(safe.balance) >= 0;

                                return (
                                    <div
                                        key={safe.id}
                                        className="card"
                                        style={{
                                            padding: '20px',
                                            borderRadius: '14px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-surface)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            transition: 'transform 0.2s, box-shadow 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        {/* Top bar with Safe Type & Default Badge */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    background: `${badgeInfo.color}18`,
                                                    color: badgeInfo.color,
                                                    fontSize: '0.78rem',
                                                    fontWeight: 700
                                                }}>
                                                    <IconComponent size={14} />
                                                    {badgeInfo.label}
                                                </span>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {safe.isDefault && (
                                                        <span style={{
                                                            fontSize: '0.72rem',
                                                            padding: '2px 8px',
                                                            borderRadius: 'var(--radius-full)',
                                                            background: 'rgba(59, 130, 246, 0.15)',
                                                            color: '#3b82f6',
                                                            fontWeight: 700
                                                        }}>
                                                            {isArabic ? 'الخزينة الافتراضية' : 'Default'}
                                                        </span>
                                                    )}
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => {
                                                            setEditingSafe(safe);
                                                            setIsAddSafeModalOpen(true);
                                                        }}
                                                        style={{ padding: '4px', color: 'var(--text-tertiary)' }}
                                                        title={isArabic ? 'تعديل الخزينة' : 'Edit Safe'}
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Safe Name */}
                                            <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                {safe.name}
                                            </h3>

                                            {/* Bank Name / Account number */}
                                            {(safe.bankName || safe.accountNumber) && (
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                                                    {safe.bankName && <span>🏦 {safe.bankName}</span>}
                                                    {safe.bankName && safe.accountNumber && <span> • </span>}
                                                    {safe.accountNumber && <span>رقم: {safe.accountNumber}</span>}
                                                </div>
                                            )}

                                            {/* Live Balance */}
                                            <div style={{
                                                padding: '12px 16px',
                                                borderRadius: '10px',
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                marginBottom: '16px'
                                            }}>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                                    {isArabic ? 'الرصيد المتاح الحالي' : 'Current Available Balance'}
                                                </div>
                                                <div style={{
                                                    fontSize: '1.75rem',
                                                    fontWeight: 900,
                                                    color: isPositive ? '#10b981' : '#ef4444',
                                                    letterSpacing: '-0.5px',
                                                    marginTop: '2px'
                                                }}>
                                                    {fmtCurrency(safe.balance)}
                                                </div>
                                            </div>

                                            {/* Mini In/Out flows */}
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '8px',
                                                fontSize: '0.8rem',
                                                marginBottom: '16px'
                                            }}>
                                                <div style={{ padding: '6px 10px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px' }}>
                                                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem' }}>
                                                        {isArabic ? 'إجمالي الوارد' : 'Total In'}:
                                                    </span>
                                                    <span style={{ fontWeight: 700, color: '#10b981' }}>
                                                        +{fmtCurrency(safe.totalIncome || 0)}
                                                    </span>
                                                </div>
                                                <div style={{ padding: '6px 10px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '6px' }}>
                                                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem' }}>
                                                        {isArabic ? 'إجمالي المنصرف' : 'Total Out'}:
                                                    </span>
                                                    <span style={{ fontWeight: 700, color: '#ef4444' }}>
                                                        -{fmtCurrency(safe.totalExpense || 0)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '8px',
                                            borderTop: '1px solid var(--border-color)',
                                            paddingTop: '14px'
                                        }}>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => handleOpenStatement(safe)}
                                                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600 }}
                                            >
                                                <FileText size={15} />
                                                <span>{isArabic ? 'كشف حساب' : 'Statement'}</span>
                                            </button>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => {
                                                    setTransferSourceSafeId(safe.id);
                                                    setIsTransferModalOpen(true);
                                                }}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                title={isArabic ? 'تحويل من/إلى هذه الخزينة' : 'Transfer'}
                                            >
                                                <ArrowRightLeft size={15} />
                                                <span>{isArabic ? 'تحويل' : 'Transfer'}</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ========================================================= */}
                {/* MODAL 1: CREATE / EDIT SAFE                               */}
                {/* ========================================================= */}
                {isAddSafeModalOpen && (
                    <CreateEditSafeModal
                        safe={editingSafe}
                        onClose={() => {
                            setIsAddSafeModalOpen(false);
                            setEditingSafe(null);
                        }}
                        onSuccess={() => {
                            setIsAddSafeModalOpen(false);
                            setEditingSafe(null);
                            loadData();
                        }}
                    />
                )}

                {/* ========================================================= */}
                {/* MODAL 2: TRANSFER BETWEEN SAFES                           */}
                {/* ========================================================= */}
                {isTransferModalOpen && (
                    <TransferSafeModal
                        safes={safes}
                        initialSourceSafeId={transferSourceSafeId}
                        onClose={() => setIsTransferModalOpen(false)}
                        onSuccess={() => {
                            setIsTransferModalOpen(false);
                            loadData();
                        }}
                    />
                )}

                {/* ========================================================= */}
                {/* MODAL 3: STATEMENT / LEDGER FOR A SAFE                    */}
                {/* ========================================================= */}
                {isStatementModalOpen && selectedSafeForStatement && (
                    <SafeStatementModal
                        safe={selectedSafeForStatement}
                        statementData={statementData}
                        loading={statementLoading}
                        dateFrom={statementDateFrom}
                        dateTo={statementDateTo}
                        setDateFrom={setStatementDateFrom}
                        setDateTo={setStatementDateTo}
                        onFilter={() => fetchStatement(selectedSafeForStatement.id, statementDateFrom, statementDateTo)}
                        onExport={handleExportStatement}
                        onClose={() => {
                            setIsStatementModalOpen(false);
                            setSelectedSafeForStatement(null);
                            setStatementData(null);
                        }}
                    />
                )}

                {/* ========================================================= */}
                {/* MODAL 4: RECORD OFFICE EXPENSE                            */}
                {/* ========================================================= */}
                {isAddTxModalOpen && (
                    <AddTransactionModal
                        isOpen={isAddTxModalOpen}
                        onClose={() => setIsAddTxModalOpen(false)}
                        onSubmit={() => {
                            setIsAddTxModalOpen(false);
                            loadData();
                            showAlert('success', isArabic ? 'تم تسجيل المعاملة بنجاح' : 'Transaction recorded successfully');
                        }}
                        initialData={{ isOfficeExpense: true, mode: 'EXPENSE' }}
                        user={user}
                    />
                )}

                {/* ========================================================= */}
                {/* MODAL 5: TRANSACTION DETAIL                               */}
                {/* ========================================================= */}
                {isTxDetailOpen && selectedTxDetail && (
                    <TransactionDetailModal
                        isOpen={isTxDetailOpen}
                        onClose={() => {
                            setIsTxDetailOpen(false);
                            setSelectedTxDetail(null);
                        }}
                        transaction={selectedTxDetail}
                    />
                )}
            </div>
        </Layout>
    );
}

// -------------------------------------------------------------
// SUBCOMPONENT: Create / Edit Safe Modal
// -------------------------------------------------------------
function CreateEditSafeModal({ safe, onClose, onSuccess }) {
    const { i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { showAlert } = useAlert();

    const [name, setName] = useState(safe?.name || '');
    const [nameAr, setNameAr] = useState(safe?.nameAr || '');
    const [type, setType] = useState(safe?.type || 'CASH_SAFE');
    const [bankName, setBankName] = useState(safe?.bankName || '');
    const [accountNumber, setAccountNumber] = useState(safe?.accountNumber || '');
    const [initialBalance, setInitialBalance] = useState(safe ? String(safe.initialBalance || 0) : '0');
    const [description, setDescription] = useState(safe?.description || '');
    const [isDefault, setIsDefault] = useState(Boolean(safe?.isDefault));
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            showAlert('warning', isArabic ? 'يرجى إدخال اسم الخزينة' : 'Safe name is required');
            return;
        }

        try {
            setLoading(true);
            const payload = {
                name: name.trim(),
                nameAr: nameAr ? nameAr.trim() : null,
                type,
                bankName: bankName ? bankName.trim() : null,
                accountNumber: accountNumber ? accountNumber.trim() : null,
                description: description ? description.trim() : null,
                isDefault
            };

            if (safe) {
                await safesAPI.update(safe.id, payload);
                showAlert('success', isArabic ? 'تم تحديث بيانات الخزينة بنجاح' : 'Safe updated successfully');
            } else {
                payload.initialBalance = Number(initialBalance) || 0;
                await safesAPI.create(payload);
                showAlert('success', isArabic ? 'تم إنشاء الخزينة بنجاح' : 'Safe created successfully');
            }
            onSuccess();
        } catch (error) {
            console.error('Save safe error:', error);
            showAlert('error', error.response?.data?.message || (isArabic ? 'فشل حفظ الخزينة' : 'Failed to save safe'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '100%' }}>
                <div className="modal-header">
                    <h2>
                        {safe
                            ? (isArabic ? 'تعديل بيانات الخزينة' : 'Edit Safe')
                            : (isArabic ? 'إضافة خزينة / حساب مالي جديد' : 'Add New Safe / Account')}
                    </h2>
                    <button className="btn-close" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Name */}
                        <div className="form-group">
                            <label style={{ fontWeight: 600 }}>{isArabic ? 'اسم الخزينة / الحساب' : 'Safe / Account Name'} *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={isArabic ? 'مثال: الخزينة الرئيسية، بنك CIB، فودافون كاش' : 'e.g. Main Safe, CIB Bank, Vodafone Cash'}
                                required
                            />
                        </div>

                        {/* Type */}
                        <div className="form-group">
                            <label style={{ fontWeight: 600 }}>{isArabic ? 'نوع الخزينة / الحساب' : 'Type'} *</label>
                            <select value={type} onChange={(e) => setType(e.target.value)}>
                                <option value="CASH_SAFE">{isArabic ? '💵 خزينة نقدية (كاش)' : 'Cash Safe'}</option>
                                <option value="BANK_ACCOUNT">{isArabic ? '🏦 حساب بنكي للشركة' : 'Company Bank Account'}</option>
                                <option value="MOBILE_WALLET">{isArabic ? '📱 محفظة إلكترونية (إنستاباي / فودافون كاش)' : 'Mobile Wallet / InstaPay'}</option>
                                <option value="OWNER_ACCOUNT">{isArabic ? '👤 حساب جاري شريك أو مدير' : 'Owner / Manager Account'}</option>
                                <option value="OTHER">{isArabic ? '📦 أخرى' : 'Other'}</option>
                            </select>
                        </div>

                        {/* Bank Name if Bank */}
                        {type === 'BANK_ACCOUNT' && (
                            <div className="form-group">
                                <label style={{ fontWeight: 600 }}>{isArabic ? 'اسم البنك' : 'Bank Name'}</label>
                                <input
                                    type="text"
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                    placeholder={isArabic ? 'مثال: البنك الأهلي المصري، CIB' : 'e.g. National Bank of Egypt'}
                                />
                            </div>
                        )}

                        {/* Account Number / Phone */}
                        {(type === 'BANK_ACCOUNT' || type === 'MOBILE_WALLET') && (
                            <div className="form-group">
                                <label style={{ fontWeight: 600 }}>
                                    {type === 'MOBILE_WALLET'
                                        ? (isArabic ? 'رقم المحفظة / عنوان إنستاباي' : 'Wallet / InstaPay IPA')
                                        : (isArabic ? 'رقم الحساب / الآيبان IBAN' : 'Account / IBAN Number')}
                                </label>
                                <input
                                    type="text"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    placeholder={type === 'MOBILE_WALLET' ? '01xxxxxxxxx / username@instapay' : 'EGxxxxxxxxxxxxxxxxxxxx'}
                                />
                            </div>
                        )}

                        {/* Initial Balance (Only for new safe) */}
                        {!safe && (
                            <div className="form-group">
                                <label style={{ fontWeight: 600 }}>{isArabic ? 'الرصيد الافتتاحي (ج.م)' : 'Opening Balance (EGP)'}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={initialBalance}
                                    onChange={(e) => setInitialBalance(e.target.value)}
                                    placeholder="0.00"
                                />
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                                    {isArabic ? 'الرصيد الموجود في الخزينة عند بدء التسجيل' : 'Current funds inside this safe at start'}
                                </span>
                            </div>
                        )}

                        {/* Description */}
                        <div className="form-group">
                            <label style={{ fontWeight: 600 }}>{isArabic ? 'ملاحظات / وصف' : 'Description / Notes'}</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                placeholder={isArabic ? 'أي تفاصيل إضافية عن هذه الخزينة...' : 'Optional details...'}
                            />
                        </div>

                        {/* Is Default */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                                <input
                                    type="checkbox"
                                    checked={isDefault}
                                    onChange={(e) => setIsDefault(e.target.checked)}
                                    style={{ width: '16px', height: '16px' }}
                                />
                                <span>{isArabic ? 'تعيين كخزينة افتراضية للمعاملات' : 'Set as default company safe'}</span>
                            </label>
                        </div>
                    </div>

                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ الخزينة' : 'Save Safe')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// -------------------------------------------------------------
// SUBCOMPONENT: Transfer Between Safes Modal
// -------------------------------------------------------------
function TransferSafeModal({ safes, initialSourceSafeId, onClose, onSuccess }) {
    const { i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { showAlert } = useAlert();
    const { currency: fmtCurrency } = useFormat();

    const [fromSafeId, setFromSafeId] = useState(initialSourceSafeId || (safes[0]?.id || ''));
    const [toSafeId, setToSafeId] = useState(safes.find(s => s.id !== (initialSourceSafeId || safes[0]?.id))?.id || '');
    const [amount, setAmount] = useState('');
    const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const sourceSafe = safes.find(s => s.id === fromSafeId);
    const destSafe = safes.find(s => s.id === toSafeId);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) {
            showAlert('warning', isArabic ? 'يرجى إدخال مبلغ تحويل صحيح' : 'Please enter valid transfer amount');
            return;
        }

        if (!fromSafeId || !toSafeId) {
            showAlert('warning', isArabic ? 'يرجى تحديد الخزينة المحول منها والمحول إليها' : 'Source and destination safes are required');
            return;
        }

        if (fromSafeId === toSafeId) {
            showAlert('warning', isArabic ? 'لا يمكن التحويل لنفس الخزينة' : 'Cannot transfer to the same safe');
            return;
        }

        try {
            setLoading(true);
            await safesAPI.transfer({
                fromSafeId,
                toSafeId,
                amount: numAmount,
                transferDate,
                notes: notes.trim() || undefined
            });

            showAlert('success', isArabic ? 'تم التحويل بنجاح بين الخزائن' : 'Transfer completed successfully');
            onSuccess();
        } catch (error) {
            console.error('Transfer safe error:', error);
            showAlert('error', error.response?.data?.message || (isArabic ? 'فشل إتمام التحويل' : 'Failed to transfer'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%' }}>
                <div className="modal-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowRightLeft size={20} style={{ color: 'var(--color-primary)' }} />
                        <span>{isArabic ? 'تحويل أموال بين خزائن الشركة' : 'Internal Safe Transfer'}</span>
                    </h2>
                    <button className="btn-close" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Source Safe */}
                        <div className="form-group">
                            <label style={{ fontWeight: 600 }}>{isArabic ? 'من الخزينة / الحساب (المصدر)' : 'From Safe / Account'} *</label>
                            <select
                                value={fromSafeId}
                                onChange={(e) => setFromSafeId(e.target.value)}
                                required
                            >
                                <option value="">-- {isArabic ? 'اختر الخزينة' : 'Select Source'} --</option>
                                {safes.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({fmtCurrency(s.balance)})
                                    </option>
                                ))}
                            </select>
                            {sourceSafe && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '3px', display: 'block' }}>
                                    {isArabic ? 'الرصيد المتاح حالياً:' : 'Available:'} <strong style={{ color: Number(sourceSafe.balance) >= 0 ? '#10b981' : '#ef4444' }}>{fmtCurrency(sourceSafe.balance)}</strong>
                                </span>
                            )}
                        </div>

                        {/* Destination Safe */}
                        <div className="form-group">
                            <label style={{ fontWeight: 600 }}>{isArabic ? 'إلى الخزينة / الحساب (الوجهة)' : 'To Safe / Account'} *</label>
                            <select
                                value={toSafeId}
                                onChange={(e) => setToSafeId(e.target.value)}
                                required
                            >
                                <option value="">-- {isArabic ? 'اختر الخزينة' : 'Select Destination'} --</option>
                                {safes.filter(s => s.id !== fromSafeId).map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({fmtCurrency(s.balance)})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Amount */}
                        <div className="form-group">
                            <label style={{ fontWeight: 600 }}>{isArabic ? 'المبلغ المراد تحويله (ج.م)' : 'Transfer Amount (EGP)'} *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                                style={{ fontSize: '1.2rem', fontWeight: 700 }}
                            />
                        </div>

                        {/* Date */}
                        <div className="form-group">
                            <label style={{ fontWeight: 600 }}>{isArabic ? 'تاريخ التحويل' : 'Transfer Date'}</label>
                            <input
                                type="date"
                                value={transferDate}
                                onChange={(e) => setTransferDate(e.target.value)}
                            />
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label style={{ fontWeight: 600 }}>{isArabic ? 'سبب التحويل / ملاحظات' : 'Notes / Reason'}</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                placeholder={isArabic ? 'مثال: تغذية الخزينة النقدية من البنك، تحويل عهدة...' : 'e.g. Cash replenishment from bank'}
                            />
                        </div>
                    </div>

                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? (isArabic ? 'جاري التحويل...' : 'Transferring...') : (isArabic ? 'تأكيد التحويل' : 'Confirm Transfer')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// -------------------------------------------------------------
// SUBCOMPONENT: Safe Statement / Running Ledger Modal
// -------------------------------------------------------------
function SafeStatementModal({
    safe,
    statementData,
    loading,
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    onFilter,
    onExport,
    onClose
}) {
    const { i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { currency: fmtCurrency, date: fmtDate } = useFormat();

    const statement = statementData?.statement || [];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                    <div>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <FileText size={22} style={{ color: 'var(--color-primary)' }} />
                            <span>{isArabic ? `كشف حساب: ${safe.name}` : `Statement: ${safe.name}`}</span>
                        </h2>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {isArabic ? 'الرصيد الافتتاحي:' : 'Opening:'} {fmtCurrency(statementData?.safe?.initialBalance || 0)} • {isArabic ? 'الرصيد الحالي:' : 'Current Balance:'} <strong style={{ color: Number(statementData?.safe?.currentBalance || 0) >= 0 ? '#10b981' : '#ef4444' }}>{fmtCurrency(statementData?.safe?.currentBalance || 0)}</strong>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button className="btn btn-secondary btn-sm" onClick={onExport} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Download size={15} />
                            <span>{isArabic ? 'تصدير Excel' : 'Export Excel'}</span>
                        </button>
                        <button className="btn-close" onClick={onClose}><X size={20} /></button>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div style={{
                    padding: '12px 20px',
                    background: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                        <span>{isArabic ? 'من:' : 'From:'}</span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                        <span>{isArabic ? 'إلى:' : 'To:'}</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}
                        />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={onFilter} style={{ padding: '4px 12px', fontSize: '0.82rem' }}>
                        {isArabic ? 'تصفية' : 'Filter'}
                    </button>
                    {(dateFrom || dateTo) && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                                setDateFrom('');
                                setDateTo('');
                                onFilter();
                            }}
                            style={{ padding: '4px 8px', fontSize: '0.82rem' }}
                        >
                            {isArabic ? 'مسح' : 'Clear'}
                        </button>
                    )}
                </div>

                {/* Statement Table */}
                <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                            {isArabic ? 'جاري تحميل كشف الحساب...' : 'Loading statement...'}
                        </div>
                    ) : statement.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                            {isArabic ? 'لا توجد حركات مسجلة على هذه الخزينة في هذه الفترة' : 'No transactions recorded for this period'}
                        </div>
                    ) : (
                        <table className="table" style={{ margin: 0, width: '100%' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 2 }}>
                                <tr>
                                    <th>{isArabic ? 'التاريخ' : 'Date'}</th>
                                    <th>{isArabic ? 'البيان' : 'Description'}</th>
                                    <th>{isArabic ? 'المشروع / الجهة' : 'Party / Project'}</th>
                                    <th style={{ color: '#10b981' }}>{isArabic ? 'وارد (+)' : 'Inflow (+)'}</th>
                                    <th style={{ color: '#ef4444' }}>{isArabic ? 'منصرف (-)' : 'Outflow (-)'}</th>
                                    <th>{isArabic ? 'الرصيد' : 'Running Balance'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statement.map(item => (
                                    <tr key={item.id}>
                                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                                            {fmtDate(item.date)}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                                                {item.description}
                                            </div>
                                            {item.reference && (
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                                    مرجع: {item.reference}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                            {item.projectName || item.partyName || '-'}
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap' }}>
                                            {item.inflow > 0 ? `+${fmtCurrency(item.inflow)}` : '-'}
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#ef4444', whiteSpace: 'nowrap' }}>
                                            {item.outflow > 0 ? `-${fmtCurrency(item.outflow)}` : '-'}
                                        </td>
                                        <td style={{
                                            fontWeight: 800,
                                            color: item.balanceAfter >= 0 ? 'var(--text-primary)' : '#ef4444',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {fmtCurrency(item.balanceAfter)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onClose}>
                        {isArabic ? 'إغلاق' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
}
