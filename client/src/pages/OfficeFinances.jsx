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
    User,
    Search,
    Filter,
    Calendar,
    X,
    Pencil,
    Trash2,
    CheckCircle,
    AlertCircle,
    Eye,
    Folder,
    UploadCloud,
    Paperclip,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import Layout from '../components/Layout';
import { safesAPI, transactionsAPI, userAPI } from '../services/api';
import { useAlert } from '../context/AlertContext';
import { useFormat } from '../utils/format';
import { exportToXLSX } from '../utils/excelExport';
import AddTransactionModal from '../components/AddTransactionModal';
import TransactionDetailModal from '../components/TransactionDetailModal';
import '../components/Modal.css';

export default function OfficeFinances() {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { showAlert } = useAlert();
    const { currency: fmtCurrency, date: fmtDate } = useFormat();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Robust date formatter fallback
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '-';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    };
    const displayDate = fmtDate || formatDate;

    // Natural language formatter for office transactions & fee transfers
    const formatOfficeTxDescription = (tx) => {
        if (!tx?.description) return isArabic ? 'معاملة مالية' : 'Transaction';
        if (tx.category === 'MANAGEMENT_FEE_TRANSFER') {
            const match = tx.description.match(/Cost-Plus Management Fee \((\d+(?:\.\d+)?)%\) on ([\d,]+(?:\.\d+)?)\s*EGP(?: expense(?:\s*\((.*?)\))?)?/i);
            if (match) {
                const [, pct, expAmt, innerDesc] = match;
                const formattedAmt = Number(expAmt.replace(/,/g, '')).toLocaleString();
                const subText = innerDesc && innerDesc.trim() ? ` - ${innerDesc.trim()}` : '';
                return isArabic
                    ? `أتعاب إدارة كوست بلس (${pct}%) على مصروف ${formattedAmt} ج.م${subText}`
                    : `Cost-Plus Fee (${pct}%) on ${formattedAmt} EGP${subText}`;
            }
            return isArabic ? 'أتعاب إدارة كوست بلس' : 'Cost-Plus Management Fee';
        }
        return tx.description;
    };

    // Data states
    const [summary, setSummary] = useState(null);
    const [safes, setSafes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filtering & search
    const [safeTypeFilter, setSafeTypeFilter] = useState('ALL');
    const [txSearch, setTxSearch] = useState('');
    const [txCategoryFilter, setTxCategoryFilter] = useState('ALL');
    const [isTxExpanded, setIsTxExpanded] = useState(false);

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
            showAlert({ type: 'error', message: isArabic ? 'فشل تحميل بيانات ماليات المقر' : 'Failed to load office finances data' });
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
            showAlert({ type: 'error', message: isArabic ? 'فشل تحميل كشف الحساب' : 'Failed to fetch statement' });
        } finally {
            setStatementLoading(false);
        }
    };

    const handleExportStatement = () => {
        if (!statementData || !statementData.statement || statementData.statement.length === 0) {
            showAlert({ type: 'warning', message: isArabic ? 'لا توجد حركات للتصدير' : 'No transactions to export' });
            return;
        }

        const safeName = statementData.safe?.name || '';
        const openingBal = Number(statementData.openingBalance || 0);
        const currentBal = Number(statementData.currentBalance || 0);

        const rows = [
            [`${isArabic ? 'حسابي ERP — كشف حساب الخزينة:' : 'Hesaby ERP — Safe Statement:'} ${safeName}`],
            [`${isArabic ? 'الرصيد الافتتاحي:' : 'Opening Balance:'} ${openingBal.toLocaleString()} EGP | ${isArabic ? 'الرصيد الحالي:' : 'Current Balance:'} ${currentBal.toLocaleString()} EGP | ${isArabic ? 'تاريخ التصدير:' : 'Exported:'} ${new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-GB')}`],
            [],
            [
                '#',
                isArabic ? 'التاريخ' : 'Date',
                isArabic ? 'النوع' : 'Type',
                isArabic ? 'وارد (+)' : 'Inflow (+)',
                isArabic ? 'منصرف (-)' : 'Outflow (-)',
                isArabic ? 'الرصيد بعد الحركة' : 'Balance After',
                isArabic ? 'البيان' : 'Description',
                isArabic ? 'المرجع / الفاتورة' : 'Reference',
                isArabic ? 'الجهة / المشروع' : 'Party / Project'
            ]
        ];

        let totalInflow = 0;
        let totalOutflow = 0;

        statementData.statement.forEach((item, idx) => {
            const inf = item.inflow > 0 ? Number(item.inflow) : 0;
            const outf = item.outflow > 0 ? Number(item.outflow) : 0;
            totalInflow += inf;
            totalOutflow += outf;

            rows.push([
                idx + 1,
                displayDate(item.date),
                item.type === 'INCOME' ? (isArabic ? 'إيراد' : 'Income')
                    : item.type === 'EXPENSE' ? (isArabic ? 'مصروف' : 'Expense')
                    : item.type === 'TRANSFER_IN' ? (isArabic ? 'تحويل وارد' : 'Transfer In')
                    : (isArabic ? 'تحويل صادر' : 'Transfer Out'),
                inf,
                outf,
                Number(Number(item.balanceAfter || 0).toFixed(2)),
                item.description || '',
                item.reference || '-',
                item.projectName || item.partyName || '-'
            ]);
        });

        // Grand Total row
        rows.push([
            isArabic ? 'الإجمالي الكلي' : 'Grand Total',
            '',
            `${statementData.statement.length} ${isArabic ? 'حركة مسجلة' : 'items'}`,
            Number(totalInflow.toFixed(2)),
            Number(totalOutflow.toFixed(2)),
            Number(currentBal.toFixed(2)),
            '',
            '',
            ''
        ]);

        exportToXLSX({
            filename: `statement-${statementData.safe?.name || 'safe'}-${new Date().toISOString().slice(0, 10)}.xlsx`,
            sheets: [
                {
                    sheetName: isArabic ? 'كشف الحساب' : 'Statement',
                    data: rows
                }
            ],
            isRTL: isArabic
        });
    };

    // Filter safes
    const filteredSafes = safes.filter(s => {
        if (safeTypeFilter === 'ALL') return true;
        return s.type === safeTypeFilter;
    });

    // Filter recent transactions
    const recentTxs = summary?.recentTransactions || [];
    const filteredTxs = recentTxs.filter(tx => {
        if (txCategoryFilter === 'MANAGEMENT_FEE_TRANSFER') {
            if (tx.category !== 'MANAGEMENT_FEE_TRANSFER') return false;
        } else if (txCategoryFilter === 'EXPENSES_ONLY') {
            if (tx.category === 'MANAGEMENT_FEE_TRANSFER') return false;
        } else if (txCategoryFilter !== 'ALL') {
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

    const displayedTxs = isTxExpanded ? filteredTxs : filteredTxs.slice(0, 5);

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

                
                <style>{`
                        .office-finances-page {
                            --bg-surface: var(--bg-elevated, var(--bg-secondary));
                        }
                        body.light-mode .office-finances-page {
                            --bg-surface: #fdfaf2;
                        }

                        .office-finances-page .tx-table-card {
                            background: var(--bg-surface);
                            border: 1px solid var(--border-color);
                            border-radius: 14px;
                            padding: 24px;
                            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                        }
                        body.light-mode .office-finances-page .tx-table-card {
                            background: #fdfaf2;
                            border-color: #d8cbaf;
                            box-shadow: 0 4px 20px rgba(60, 45, 20, 0.06);
                        }
                        .office-finances-page .tx-table-container {
                            overflow-x: auto;
                            width: 100%;
                            border-radius: 10px;
                            border: 1px solid var(--border-color);
                            background: var(--bg-secondary);
                        }
                        body.light-mode .office-finances-page .tx-table-container {
                            border-color: #d8cbaf;
                            background: #fdfaf2;
                        }
                        .office-finances-page .office-tx-table {
                            width: 100%;
                            border-collapse: separate;
                            border-spacing: 0;
                            text-align: start;
                        }
                        .office-finances-page .office-tx-table th {
                            padding: 14px 18px;
                            font-size: 0.74rem;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                            color: var(--text-secondary);
                            background: var(--bg-tertiary);
                            border-bottom: 1px solid var(--border-color);
                            white-space: nowrap;
                        }
                        body.light-mode .office-finances-page .office-tx-table th {
                            background: #eee5d1;
                            color: #6b5f4d;
                            border-bottom-color: #d8cbaf;
                        }
                        .office-finances-page .office-tx-table td {
                            padding: 14px 18px;
                            font-size: 0.86rem;
                            color: var(--text-primary);
                            border-bottom: 1px solid var(--border-color);
                            vertical-align: middle;
                        }
                        body.light-mode .office-finances-page .office-tx-table td {
                            color: #1c1710;
                            border-bottom-color: #e5dcc7;
                        }
                        .office-finances-page .office-tx-table tbody tr {
                            transition: background 0.15s ease;
                        }
                        .office-finances-page .office-tx-table tbody tr:hover {
                            background: rgba(255, 255, 255, 0.03);
                        }
                        body.light-mode .office-finances-page .office-tx-table tbody tr:hover {
                            background: rgba(60, 45, 20, 0.03);
                        }
                        .office-finances-page .office-tx-table tbody tr:last-child td {
                            border-bottom: none;
                        }
                        .office-finances-page .safe-badge-pill {
                            display: inline-flex;
                            align-items: center;
                            gap: 7px;
                            padding: 4px 10px;
                            border-radius: 6px;
                            background: rgba(245, 158, 11, 0.1);
                            border: 1px solid rgba(245, 158, 11, 0.25);
                            color: #f59e0b;
                            font-size: 0.82rem;
                            font-weight: 600;
                            white-space: nowrap;
                            max-width: 220px;
                        }
                        body.light-mode .office-finances-page .safe-badge-pill {
                            background: rgba(194, 65, 12, 0.08);
                            border-color: rgba(194, 65, 12, 0.25);
                            color: #c2410c;
                        }
                        .office-finances-page .status-badge-pill {
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            padding: 4px 10px;
                            border-radius: 9999px;
                            font-size: 0.72rem;
                            font-weight: 700;
                            letter-spacing: 0.04em;
                            text-transform: uppercase;
                            white-space: nowrap;
                        }
                        .office-finances-page .status-badge-pill.approved {
                            background: rgba(16, 185, 129, 0.12);
                            color: #10b981;
                            border: 1px solid rgba(16, 185, 129, 0.3);
                        }
                        .office-finances-page .status-badge-pill.pending {
                            background: rgba(245, 158, 11, 0.12);
                            color: #f59e0b;
                            border: 1px solid rgba(245, 158, 11, 0.3);
                        }
                        .office-finances-page .status-badge-pill.rejected {
                            background: rgba(239, 68, 68, 0.12);
                            color: #ef4444;
                            border: 1px solid rgba(239, 68, 68, 0.3);
                        }
                        .office-finances-page .status-badge-pill .dot {
                            width: 6px;
                            height: 6px;
                            border-radius: 50%;
                            background: currentColor;
                        }
                        .office-finances-page .tx-action-btn-circle {
                            width: 32px;
                            height: 32px;
                            border-radius: 8px;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            background: var(--bg-tertiary);
                            border: 1px solid var(--border-color);
                            color: var(--text-secondary);
                            cursor: pointer;
                            transition: all 0.15s ease;
                        }
                        .office-finances-page .tx-action-btn-circle:hover {
                            background: rgba(255, 90, 31, 0.12);
                            border-color: var(--color-primary);
                            color: var(--color-primary-light, #ff8a50);
                            transform: translateY(-1px);
                        }
                        body.light-mode .office-finances-page .tx-action-btn-circle {
                            background: #eee5d1;
                            border-color: #d8cbaf;
                            color: #6b5f4d;
                        }
                        body.light-mode .office-finances-page .tx-action-btn-circle:hover {
                            background: rgba(194, 65, 12, 0.12);
                            border-color: #c2410c;
                            color: #c2410c;
                        }

                        /* Safe Card Container & Actions */
                        .office-finances-page .safe-card {
                            background: var(--bg-surface);
                            border: 1px solid var(--border-color);
                            border-radius: 14px;
                            padding: 20px;
                            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
                            transition: transform 0.2s, box-shadow 0.2s;
                        }
                        body.light-mode .office-finances-page .safe-card {
                            background: #fdfaf2;
                            border-color: #d8cbaf;
                            box-shadow: 0 8px 24px rgba(60, 45, 20, 0.08);
                        }
                        .office-finances-page .safe-card-balance-box {
                            padding: 12px 16px;
                            border-radius: 10px;
                            background: var(--bg-secondary);
                            border: 1px solid var(--border-color);
                            margin-bottom: 16px;
                        }
                        body.light-mode .office-finances-page .safe-card-balance-box {
                            background: #f7f1e5;
                            border-color: #d8cbaf;
                        }
                        .office-finances-page .safe-edit-btn {
                            width: 32px;
                            height: 32px;
                            border-radius: 8px;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            background: var(--bg-tertiary);
                            border: 1px solid var(--border-color);
                            color: var(--text-secondary);
                            cursor: pointer;
                            transition: all 0.15s ease;
                        }
                        .office-finances-page .safe-edit-btn:hover {
                            background: rgba(255, 90, 31, 0.12);
                            border-color: var(--color-primary);
                            color: var(--color-primary-light, #ff8a50);
                            transform: translateY(-1px);
                        }
                        body.light-mode .office-finances-page .safe-edit-btn {
                            background: #eee5d1;
                            border-color: #d8cbaf;
                            color: #6b5f4d;
                        }
                        body.light-mode .office-finances-page .safe-edit-btn:hover {
                            background: rgba(194, 65, 12, 0.12);
                            border-color: #c2410c;
                            color: #c2410c;
                        }
                        .office-finances-page .safe-action-btn {
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            gap: 7px;
                            padding: 8px 14px;
                            border-radius: 8px;
                            font-size: 0.84rem;
                            font-weight: 600;
                            border: 1px solid var(--border-color);
                            background: var(--bg-secondary);
                            color: var(--text-primary);
                            cursor: pointer;
                            transition: all 0.15s ease;
                        }
                        .office-finances-page .safe-action-btn:hover {
                            background: var(--bg-tertiary);
                            border-color: var(--color-primary);
                            color: var(--color-primary-light, #ff8a50);
                            transform: translateY(-1px);
                        }
                        body.light-mode .office-finances-page .safe-action-btn {
                            background: #fdfaf2;
                            border-color: #d8cbaf;
                            color: #1c1710;
                        }
                        body.light-mode .office-finances-page .safe-action-btn:hover {
                            background: #eee5d1;
                            border-color: #c2410c;
                            color: #c2410c;
                        }
                        .office-finances-page .safe-action-btn.statement {
                            flex: 1;
                        }

                        /* Solid Modal Overlay & Containers (Dark & Light) */
                        .modal-overlay {
                            position: fixed;
                            inset: 0;
                            background: rgba(0, 0, 0, 0.75);
                            backdrop-filter: blur(8px);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 1050;
                            padding: 20px;
                        }
                        body.light-mode .modal-overlay {
                            background: rgba(28, 23, 16, 0.55);
                        }
                        .modal-container.office-modal {
                            background: var(--bg-elevated, #17171d) !important;
                            border: 1px solid var(--border-color) !important;
                            border-radius: 16px !important;
                            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6) !important;
                            color: var(--text-primary) !important;
                            overflow: hidden;
                            max-height: 90vh;
                            display: flex;
                            flex-direction: column;
                        }
                        body.light-mode .modal-container.office-modal {
                            background: #fdfaf2 !important;
                            border-color: #d8cbaf !important;
                            box-shadow: 0 25px 60px rgba(60, 45, 20, 0.22) !important;
                            color: #1c1710 !important;
                        }
                        .modal-container.office-modal .modal-header {
                            background: var(--bg-elevated, #17171d) !important;
                            border-bottom: 1px solid var(--border-color) !important;
                            padding: 20px 24px;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                        }
                        body.light-mode .modal-container.office-modal .modal-header {
                            background: #fdfaf2 !important;
                            border-bottom-color: #d8cbaf !important;
                        }
                        .modal-container.office-modal .modal-header h2 {
                            color: var(--text-primary) !important;
                            margin: 0;
                        }
                        body.light-mode .modal-container.office-modal .modal-header h2 {
                            color: #1c1710 !important;
                        }
                        .modal-container.office-modal .modal-close {
                            width: 32px;
                            height: 32px;
                            border-radius: 8px;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            background: var(--bg-tertiary);
                            border: 1px solid var(--border-color);
                            color: var(--text-secondary);
                            cursor: pointer;
                            transition: all 0.15s ease;
                        }
                        .modal-container.office-modal .modal-close:hover {
                            background: rgba(239, 68, 68, 0.15);
                            border-color: rgba(239, 68, 68, 0.35);
                            color: #ef4444;
                            transform: translateY(-1px);
                        }
                        body.light-mode .modal-container.office-modal .modal-close {
                            background: #eee5d1 !important;
                            border-color: #d8cbaf !important;
                            color: #6b5f4d !important;
                        }
                        body.light-mode .modal-container.office-modal .modal-close:hover {
                            background: rgba(239, 68, 68, 0.12) !important;
                            border-color: rgba(239, 68, 68, 0.3) !important;
                            color: #ef4444 !important;
                        }
                        .modal-container.office-modal .modal-body {
                            background: var(--bg-elevated, #17171d) !important;
                            color: var(--text-primary) !important;
                            padding: 24px;
                            overflow-y: auto;
                        }
                        body.light-mode .modal-container.office-modal .modal-body {
                            background: #fdfaf2 !important;
                            color: #1c1710 !important;
                        }
                        .modal-container.office-modal .modal-footer {
                            background: var(--bg-secondary, #0e0e12) !important;
                            border-top: 1px solid var(--border-color) !important;
                            padding: 16px 24px;
                            display: flex;
                            align-items: center;
                            justify-content: flex-end;
                            gap: 12px;
                        }
                        body.light-mode .modal-container.office-modal .modal-footer {
                            background: #f7f1e5 !important;
                            border-top-color: #d8cbaf !important;
                        }
                        .modal-container.office-modal .form-group label {
                            font-size: 0.86rem;
                            font-weight: 600;
                            color: var(--text-primary);
                            margin-bottom: 6px;
                            display: block;
                        }
                        body.light-mode .modal-container.office-modal .form-group label {
                            color: #1c1710 !important;
                        }
                        .modal-container.office-modal input:not([type="checkbox"]),
                        .modal-container.office-modal select,
                        .modal-container.office-modal textarea {
                            background: var(--bg-secondary) !important;
                            border: 1px solid var(--border-color) !important;
                            color: var(--text-primary) !important;
                            border-radius: 8px !important;
                            padding: 10px 14px !important;
                            outline: none;
                            width: 100%;
                            font-size: 0.9rem;
                            transition: border-color 0.2s, box-shadow 0.2s;
                        }
                        .modal-container.office-modal input[type="checkbox"] {
                            width: 18px !important;
                            height: 18px !important;
                            cursor: pointer;
                            accent-color: var(--color-primary);
                        }
                        .modal-container.office-modal select option {
                            background: var(--bg-secondary);
                            color: var(--text-primary);
                        }
                        .modal-container.office-modal input:focus,
                        .modal-container.office-modal select:focus,
                        .modal-container.office-modal textarea:focus {
                            border-color: var(--color-primary) !important;
                            box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.16) !important;
                        }
                        body.light-mode .modal-container.office-modal input:not([type="checkbox"]),
                        body.light-mode .modal-container.office-modal select,
                        body.light-mode .modal-container.office-modal textarea {
                            background: #ffffff !important;
                            border-color: #d8cbaf !important;
                            color: #1c1710 !important;
                        }
                        body.light-mode .modal-container.office-modal select option {
                            background: #ffffff !important;
                            color: #1c1710 !important;
                        }
                        body.light-mode .modal-container.office-modal input:focus,
                        body.light-mode .modal-container.office-modal select:focus,
                        body.light-mode .modal-container.office-modal textarea:focus {
                            border-color: #c2410c !important;
                            box-shadow: 0 0 0 3px rgba(194, 65, 12, 0.16) !important;
                        }

                        /* Safe Statement Toolbar & Table */
                        .statement-filter-toolbar {
                            padding: 12px 24px;
                            background: var(--bg-secondary);
                            border-bottom: 1px solid var(--border-color);
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            flex-wrap: wrap;
                        }
                        body.light-mode .statement-filter-toolbar {
                            background: #f7f1e5 !important;
                            border-bottom-color: #d8cbaf !important;
                        }
                        .statement-filter-toolbar input[type="date"] {
                            padding: 6px 10px;
                            border-radius: 8px;
                            border: 1px solid var(--border-color);
                            background: var(--bg-tertiary);
                            color: var(--text-primary);
                            font-size: 0.84rem;
                            outline: none;
                        }
                        body.light-mode .statement-filter-toolbar input[type="date"] {
                            background: #ffffff !important;
                            border-color: #d8cbaf !important;
                            color: #1c1710 !important;
                        }
                        .statement-table th {
                            background: var(--bg-tertiary) !important;
                            color: var(--text-secondary);
                            border-bottom: 1px solid var(--border-color);
                        }
                        body.light-mode .statement-table th {
                            background: #eee5d1 !important;
                            color: #6b5f4d !important;
                            border-bottom-color: #d8cbaf !important;
                        }
                        .statement-table td {
                            border-bottom: 1px solid var(--border-color);
                            color: var(--text-primary);
                        }
                        body.light-mode .statement-table td {
                            border-bottom-color: #e5dcc7 !important;
                            color: #1c1710 !important;
                        }
                        .statement-table tbody tr:hover {
                            background: rgba(255, 255, 255, 0.035) !important;
                        }
                        body.light-mode .statement-table tbody tr:hover {
                            background: rgba(60, 45, 20, 0.04) !important;
                        }
                        .statement-project-pill {
                            display: inline-flex;
                            align-items: center;
                            gap: 4px;
                            padding: 2px 8px;
                            border-radius: 6px;
                            background: var(--bg-tertiary);
                            border: 1px solid var(--border-color);
                            font-size: 0.78rem;
                            color: var(--text-secondary);
                        }
                        body.light-mode .statement-project-pill {
                            background: #eee5d1 !important;
                            border-color: #d8cbaf !important;
                            color: #6b5f4d !important;
                        }
                    `}</style>

                {/* ========================================================= */}
                {/* SECTION 1: COMPANY SAFES & TREASURY ACCOUNTS */}
                {/* ========================================================= */}
                <div style={{ marginBottom: '40px' }}>
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
                                        className="card safe-card"
                                        style={{
                                            padding: '20px',
                                            borderRadius: '14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'none';
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
                                                        className="safe-edit-btn"
                                                        onClick={() => {
                                                            setEditingSafe(safe);
                                                            setIsAddSafeModalOpen(true);
                                                        }}
                                                        title={isArabic ? 'تعديل بيانات الخزينة' : 'Edit Safe'}
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Safe Name */}
                                            <h3 style={{
                                                margin: '0 0 10px',
                                                fontSize: '1.18rem',
                                                fontWeight: 800,
                                                color: 'var(--text-primary)',
                                                minHeight: '1.75rem',
                                                lineHeight: 1.3
                                            }}>
                                                {safe.name}
                                            </h3>

                                            {/* Live Balance Box - Positioned immediately under Safe Name for exact vertical alignment across all cards */}
                                            <div className="safe-card-balance-box" style={{ marginBottom: '12px' }}>
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

                                            {/* Safe Metadata Strip (Bank / Account / Custodian) - Consistent min-height slot for vertical parity */}
                                            <div style={{
                                                minHeight: '34px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                flexWrap: 'wrap',
                                                marginBottom: '14px'
                                            }}>
                                                {safe.bankName && (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        background: 'var(--bg-tertiary)',
                                                        border: '1px solid var(--border-color)',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 600,
                                                        color: 'var(--text-secondary)'
                                                    }}>
                                                        <Building2 size={12} style={{ color: 'var(--color-primary)' }} />
                                                        <span dir="auto">{safe.bankName}</span>
                                                    </span>
                                                )}
                                                {safe.accountNumber && (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        background: 'var(--bg-tertiary)',
                                                        border: '1px solid var(--border-color)',
                                                        fontSize: '0.75rem',
                                                        fontFamily: 'monospace',
                                                        color: 'var(--text-secondary)'
                                                    }} dir="ltr">
                                                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>{isArabic ? 'رقم:' : 'Acc:'}</span>
                                                        <span>{safe.accountNumber}</span>
                                                    </span>
                                                )}
                                                {safe.assignedUser && (
                                                    <div style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        background: 'rgba(59, 130, 246, 0.08)',
                                                        border: '1px solid rgba(59, 130, 246, 0.22)',
                                                        fontSize: '0.76rem',
                                                        color: 'var(--text-primary)'
                                                    }}>
                                                        <User size={12} style={{ color: '#3b82f6' }} />
                                                        <span dir="auto">
                                                            <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                                                {isArabic ? 'المسؤول:' : 'Custodian:'}
                                                            </span>{' '}
                                                            <strong>{safe.assignedUser.name}</strong>
                                                        </span>
                                                    </div>
                                                )}
                                                {!safe.bankName && !safe.accountNumber && !safe.assignedUser && (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        background: 'var(--bg-tertiary)',
                                                        border: '1px solid var(--border-color)',
                                                        fontSize: '0.75rem',
                                                        color: 'var(--text-tertiary)'
                                                    }}>
                                                        <Wallet size={12} style={{ opacity: 0.7 }} />
                                                        <span>{isArabic ? 'خزينة نقدية ورقية بالمقر' : 'HQ Operational Cash Vault'}</span>
                                                    </span>
                                                )}
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
                                                className="safe-action-btn statement"
                                                onClick={() => handleOpenStatement(safe)}
                                            >
                                                <FileText size={15} />
                                                <span>{isArabic ? 'كشف حساب' : 'Statement'}</span>
                                            </button>
                                            <button
                                                className="safe-action-btn transfer"
                                                onClick={() => {
                                                    setTransferSourceSafeId(safe.id);
                                                    setIsTransferModalOpen(true);
                                                }}
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
                {/* SECTION 1 (TOP HALF): OFFICE FINANCIALS & PROFIT/LOSS     */}
                {/* ========================================================= */}
                <div style={{ marginBottom: '36px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                            {isArabic ? '📊 المركز المالي للمقر الرئيسي' : 'Office Profit & Loss Overview'}
                        </h2>
                    </div>

                    {/* 3 Core Office P&L Stat Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '20px',
                        marginBottom: '28px'
                    }}>
                        {/* 1. Total Office Profit */}
                        <div className="card" style={{
                            padding: '22px 24px',
                            background: 'linear-gradient(145deg, var(--bg-elevated, var(--bg-secondary)), rgba(16, 185, 129, 0.06))',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            borderRadius: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {isArabic ? 'إجمالي أرباح المقر' : 'Total Office Profits'}
                                </span>
                                <div style={{
                                    width: '38px', height: '38px', borderRadius: '10px',
                                    background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <TrendingUp size={20} />
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.5px' }}>
                                    {fmtCurrency(summary?.totalOfficeProfit || 0)}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                    {isArabic ? `أتعاب إدارة: ${fmtCurrency(summary?.totalManagementFees || 0)}` : `Fees: ${fmtCurrency(summary?.totalManagementFees || 0)}`}
                                </div>
                            </div>
                        </div>

                        {/* 2. Total Office Expenses */}
                        <div className="card" style={{
                            padding: '22px 24px',
                            background: 'linear-gradient(145deg, var(--bg-elevated, var(--bg-secondary)), rgba(239, 68, 68, 0.06))',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {isArabic ? 'إجمالي مصروفات المقر' : 'Total Office Expenses'}
                                </span>
                                <div style={{
                                    width: '38px', height: '38px', borderRadius: '10px',
                                    background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <TrendingDown size={20} />
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ef4444', letterSpacing: '-0.5px' }}>
                                    {fmtCurrency(summary?.totalOfficeExpenses || 0)}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                    {isArabic ? 'إيجار، فواتير، رواتب، مستلزمات المقر' : 'Rent, utilities, salaries, office supplies'}
                                </div>
                            </div>
                        </div>

                        {/* 3. Net Office Profit */}
                        <div className="card" style={{
                            padding: '22px 24px',
                            background: (summary?.netOfficeProfit || 0) >= 0
                                ? 'linear-gradient(145deg, var(--bg-elevated, var(--bg-secondary)), rgba(59, 130, 246, 0.06))'
                                : 'linear-gradient(145deg, var(--bg-elevated, var(--bg-secondary)), rgba(239, 68, 68, 0.06))',
                            border: (summary?.netOfficeProfit || 0) >= 0
                                ? '1px solid rgba(59, 130, 246, 0.3)'
                                : '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {isArabic ? 'صافي أرباح المقر' : 'Net Office Profit'}
                                </span>
                                <div style={{
                                    width: '38px', height: '38px', borderRadius: '10px',
                                    background: (summary?.netOfficeProfit || 0) >= 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: (summary?.netOfficeProfit || 0) >= 0 ? '#3b82f6' : '#ef4444',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Building2 size={20} />
                                </div>
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '1.85rem',
                                    fontWeight: 800,
                                    color: (summary?.netOfficeProfit || 0) >= 0 ? '#3b82f6' : '#ef4444',
                                    letterSpacing: '-0.5px'
                                }}>
                                    {fmtCurrency(summary?.netOfficeProfit || 0)}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                    {(summary?.netOfficeProfit || 0) >= 0
                                        ? (isArabic ? 'فائض تشغيلي في أرباح المقر' : 'Operating surplus')
                                        : (isArabic ? 'عجز تشغيلي في أرباح المقر' : 'Operating deficit')}
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

                    {/* Scoped CSS for Table, Safe Cards, Modals & Badges */}
                </div>

                {/* Recent Office Transactions Table */}
                    <div className="card tx-table-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                                    {isArabic ? 'آخر معاملات المقر وأرباح الإدارة' : 'Recent Office Transactions & Fee Transfers'}
                                </h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                    {isArabic ? 'سجل الإيرادات وأتعاب الإدارة المحولة ومصروفات المقر التشغيلية' : 'Audit trail of recognized profits, fee transfers, and operational office expenses'}
                                    {filteredTxs.length > 5 && !isTxExpanded && (
                                        <span style={{
                                            display: 'inline-block',
                                            marginRight: isArabic ? '8px' : 0,
                                            marginLeft: isArabic ? 0 : '8px',
                                            fontSize: '0.75rem',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            background: 'var(--bg-tertiary)',
                                            color: 'var(--color-primary)',
                                            fontWeight: 700,
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            {isArabic ? `(معروض أول 5 من ${filteredTxs.length})` : `(Showing first 5 of ${filteredTxs.length})`}
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* Search & Filter */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <select
                                    value={txCategoryFilter}
                                    onChange={(e) => setTxCategoryFilter(e.target.value)}
                                    style={{
                                        padding: '7px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-tertiary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.84rem',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="ALL">{isArabic ? 'جميع المعاملات' : 'All Transactions'}</option>
                                    <option value="MANAGEMENT_FEE_TRANSFER">{isArabic ? 'أرباح إدارة المشروعات' : 'Management Fees'}</option>
                                    <option value="EXPENSES_ONLY">{isArabic ? 'مصروفات المقر فقط' : 'Office Expenses Only'}</option>
                                </select>
                                <div style={{ position: 'relative' }}>
                                    <Search size={15} style={{ position: 'absolute', top: '10px', [isArabic ? 'right' : 'left']: '10px', color: 'var(--text-tertiary)' }} />
                                    <input
                                        type="text"
                                        placeholder={isArabic ? 'بحث في معاملات المقر...' : 'Search office txs...'}
                                        value={txSearch}
                                        onChange={(e) => setTxSearch(e.target.value)}
                                        style={{
                                            padding: '7px 12px',
                                            [isArabic ? 'paddingRight' : 'paddingLeft']: '32px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-tertiary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.84rem',
                                            width: '210px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {filteredTxs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                                <AlertCircle size={28} style={{ margin: '0 auto 8px', opacity: 0.5, display: 'block' }} />
                                <div>{isArabic ? 'لا توجد معاملات مسجلة للمقر حالياً' : 'No office transactions found'}</div>
                            </div>
                        ) : (
                            <div className="tx-table-container">
                                <table className="office-tx-table">
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'start', width: '125px', minWidth: '125px' }}>{isArabic ? 'التاريخ' : 'Date'}</th>
                                            <th style={{ textAlign: 'start', minWidth: '280px' }}>{isArabic ? 'البيان' : 'Description'}</th>
                                            <th style={{ textAlign: 'start', width: '150px', minWidth: '150px' }}>{isArabic ? 'التصنيف' : 'Category'}</th>
                                            <th style={{ textAlign: isArabic ? 'left' : 'right', width: '140px', minWidth: '140px' }}>{isArabic ? 'المبلغ' : 'Amount'}</th>
                                            <th style={{ textAlign: 'start', width: '210px', minWidth: '210px' }}>{isArabic ? 'الخزينة المرتبطة' : 'Linked Safe'}</th>
                                            <th style={{ textAlign: 'start', width: '150px', minWidth: '150px' }}>{isArabic ? 'المسجل' : 'Recorded By'}</th>
                                            <th style={{ textAlign: 'center', width: '110px', minWidth: '110px' }}>{isArabic ? 'الحالة' : 'Status'}</th>
                                            <th style={{ textAlign: 'center', width: '70px', minWidth: '70px' }}>{isArabic ? 'إجراء' : 'Action'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedTxs.map(tx => {
                                            const isFee = tx.category === 'MANAGEMENT_FEE_TRANSFER';
                                            const isIncome = tx.type === 'INCOME';
                                            return (
                                                <tr key={tx.id}>
                                                    <td style={{ textAlign: 'start', whiteSpace: 'nowrap' }}>
                                                        <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                                                            {displayDate(tx.transactionDate || tx.createdAt)}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'start' }}>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: '1.4' }}>
                                                            {formatOfficeTxDescription(tx)}
                                                        </div>
                                                        {tx.project && (
                                                            <div style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '5px',
                                                                fontSize: '0.74rem',
                                                                fontWeight: 600,
                                                                color: 'var(--color-primary)',
                                                                background: 'rgba(59, 130, 246, 0.1)',
                                                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                                                padding: '2px 8px',
                                                                borderRadius: '6px',
                                                                marginTop: '5px'
                                                            }}>
                                                                <Folder size={12} />
                                                                <span>{tx.project.name}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'start' }}>
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            fontSize: '0.78rem',
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            background: isFee ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-tertiary)',
                                                            color: isFee ? '#10b981' : 'var(--text-primary)',
                                                            border: isFee ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                                                            fontWeight: 600,
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {isFee && <TrendingUp size={13} />}
                                                            <span>
                                                                {isFee
                                                                    ? (isArabic ? 'أتعاب إدارة' : 'Management Fee')
                                                                    : ((tx.category === 'OTHER' && tx.description && (tx.description.startsWith('Other - ') || tx.description.startsWith('أخرى - ')))
                                                                        ? tx.description.split(':')[0].trim()
                                                                        : (t(`finance.categories.${tx.category?.toLowerCase()}`) || tx.category))}
                                                            </span>
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: isArabic ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                                                        <span dir="ltr" style={{
                                                            fontWeight: 800,
                                                            fontSize: '0.94rem',
                                                            fontVariantNumeric: 'tabular-nums',
                                                            color: isFee || isIncome ? '#10b981' : '#ef4444'
                                                        }}>
                                                            {isFee || isIncome ? '+' : '-'}{fmtCurrency(tx.amount)}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'start' }}>
                                                        {tx.safe ? (
                                                            <span className="safe-badge-pill">
                                                                <Wallet size={14} style={{ flexShrink: 0 }} />
                                                                <span dir="auto" style={{ unicodeBidi: 'plaintext', color: 'var(--text-primary)' }}>
                                                                    {tx.safe.name}
                                                                </span>
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'start' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                borderRadius: '50%',
                                                                background: 'rgba(59, 130, 246, 0.15)',
                                                                color: '#3b82f6',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 700,
                                                                flexShrink: 0
                                                            }}>
                                                                {(tx.user?.name || 'U').charAt(0).toUpperCase()}
                                                            </div>
                                                            <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                                                {tx.user?.name || '-'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={`status-badge-pill ${tx.status?.toLowerCase() || 'pending'}`}>
                                                            <span className="dot" />
                                                            <span>
                                                                {tx.status === 'APPROVED'
                                                                    ? (isArabic ? 'معتمد' : 'APPROVED')
                                                                    : tx.status === 'REJECTED'
                                                                    ? (isArabic ? 'مرفوض' : 'REJECTED')
                                                                    : (isArabic ? 'معلق' : 'PENDING')}
                                                            </span>
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            className="tx-action-btn-circle"
                                                            onClick={() => {
                                                                setSelectedTxDetail(tx);
                                                                setIsTxDetailOpen(true);
                                                            }}
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
                    
                        {/* Expand / Collapse Button if more than 5 transactions */}
                        {filteredTxs.length > 5 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                paddingTop: '16px',
                                marginTop: '16px',
                                borderTop: '1px solid var(--border-color)'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setIsTxExpanded(!isTxExpanded)}
                                    className="btn btn-secondary"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '0.88rem',
                                        fontWeight: 600,
                                        padding: '9px 24px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        border: '1px solid var(--border-color)',
                                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
                                    }}
                                >
                                    {isTxExpanded ? (
                                        <>
                                            <ChevronUp size={16} />
                                            <span>
                                                {isArabic
                                                    ? 'عرض أقل (أول 5 معاملات فقط)'
                                                    : 'Show Less (First 5 Only)'}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown size={16} />
                                            <span>
                                                {isArabic
                                                    ? `عرض جميع المعاملات (${filteredTxs.length})`
                                                    : `Show All Transactions (${filteredTxs.length})`}
                                            </span>
                                        </>
                                    )}
                                </button>
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
                            showAlert({ type: 'success', message: isArabic ? 'تم تسجيل المعاملة بنجاح' : 'Transaction recorded successfully' });
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
    const [assignedUserId, setAssignedUserId] = useState(safe?.assignedUserId || safe?.assignedUser?.id || '');
    const [companyUsers, setCompanyUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const loadUsers = async () => {
            try {
                setLoadingUsers(true);
                const res = await userAPI.getAll();
                if (isMounted && res.data?.data) {
                    const currentAssignedId = safe?.assignedUserId || safe?.assignedUser?.id;
                    setCompanyUsers(res.data.data.filter(u => u.isActive !== false || u.id === currentAssignedId));
                }
            } catch (err) {
                console.error('Failed to fetch company members:', err);
            } finally {
                if (isMounted) setLoadingUsers(false);
            }
        };
        loadUsers();
        return () => { isMounted = false; };
    }, [safe]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            showAlert({ type: 'warning', message: isArabic ? 'يرجى إدخال اسم الخزينة' : 'Safe name is required' });
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
                isDefault,
                assignedUserId: assignedUserId || null
            };

            if (safe) {
                await safesAPI.update(safe.id, payload);
                showAlert({ type: 'success', message: isArabic ? 'تم تحديث بيانات الخزينة بنجاح' : 'Safe updated successfully' });
            } else {
                payload.initialBalance = Number(initialBalance) || 0;
                await safesAPI.create(payload);
                showAlert({ type: 'success', message: isArabic ? 'تم إنشاء الخزينة بنجاح' : 'Safe created successfully' });
            }
            onSuccess();
        } catch (error) {
            console.error('Save safe error:', error);
            showAlert({ type: 'error', message: error.response?.data?.message || (isArabic ? 'فشل حفظ الخزينة' : 'Failed to save safe') });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container office-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', width: '100%' }}>
                <div className="modal-header">
                    <h2>
                        {safe
                            ? (isArabic ? 'تعديل بيانات الخزينة' : 'Edit Safe')
                            : (isArabic ? 'إضافة خزينة / حساب مالي جديد' : 'Add New Safe / Account')}
                    </h2>
                    <button className="modal-close" onClick={onClose} title={isArabic ? 'إغلاق' : 'Close'}><X size={18} /></button>
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

                        {/* Assigned Member / Custodian (Optional) */}
                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ fontWeight: 600, margin: 0 }}>
                                    {isArabic ? 'العضو المسؤول عن الخزينة (اختياري)' : 'Assigned Member / Custodian'}
                                </label>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                    {isArabic ? 'اختياري' : 'Optional'}
                                </span>
                            </div>
                            <select
                                value={assignedUserId}
                                onChange={(e) => setAssignedUserId(e.target.value)}
                                disabled={loadingUsers}
                            >
                                <option value="">
                                    {loadingUsers
                                        ? (isArabic ? 'جاري تحميل قائمة الأعضاء...' : 'Loading members...')
                                        : (isArabic ? '— بدون تعيين (خزينة عامة للشركة) —' : '— None / General Company Safe —')}
                                </option>
                                {companyUsers.map((u) => {
                                    const roleName = u.customRole?.name || u.role?.replace(/_/g, ' ');
                                    return (
                                        <option key={u.id} value={u.id}>
                                            {u.name} {roleName ? `(${roleName})` : ''}
                                        </option>
                                    );
                                })}
                            </select>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                                {isArabic
                                    ? 'يمكنك ربط الخزينة أو العهدة النقدية بأحد موظفي أو مسؤولي الشركة أو تركها عامة'
                                    : 'Optionally link this safe or cash account to a specific company employee or leave unassigned'}
                            </span>
                        </div>

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
    const [attachmentFile, setAttachmentFile] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);

    const sourceSafe = safes.find(s => s.id === fromSafeId);
    const destSafe = safes.find(s => s.id === toSafeId);

    const handleFileSelection = (file) => {
        if (!file) return;
        if (file.size > 25 * 1024 * 1024) {
            showAlert({
                type: 'warning',
                message: isArabic ? 'الحد الأقصى لحجم الملف هو 25 ميجابايت' : 'Maximum allowed file size is 25 MB'
            });
            return;
        }
        setAttachmentFile(file);
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => setAttachmentPreview(ev.target.result);
            reader.readAsDataURL(file);
        } else {
            setAttachmentPreview(null);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        handleFileSelection(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer?.files?.[0];
        handleFileSelection(file);
    };

    const handleRemoveFile = () => {
        setAttachmentFile(null);
        setAttachmentPreview(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) {
            showAlert({ type: 'warning', message: isArabic ? 'يرجى إدخال مبلغ تحويل صحيح' : 'Please enter valid transfer amount' });
            return;
        }

        if (!fromSafeId || !toSafeId) {
            showAlert({ type: 'warning', message: isArabic ? 'يرجى تحديد الخزينة المحول منها والمحول إليها' : 'Source and destination safes are required' });
            return;
        }

        if (fromSafeId === toSafeId) {
            showAlert({ type: 'warning', message: isArabic ? 'لا يمكن التحويل لنفس الخزينة' : 'Cannot transfer to the same safe' });
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('fromSafeId', fromSafeId);
            formData.append('toSafeId', toSafeId);
            formData.append('amount', numAmount);
            formData.append('transferDate', transferDate);
            if (notes.trim()) {
                formData.append('notes', notes.trim());
            }
            if (attachmentFile) {
                formData.append('file', attachmentFile);
            }

            await safesAPI.transfer(formData);

            showAlert({ type: 'success', message: isArabic ? 'تم التحويل بنجاح بين الخزائن' : 'Transfer completed successfully' });
            onSuccess();
        } catch (error) {
            console.error('Transfer safe error:', error);
            showAlert({ type: 'error', message: error.response?.data?.message || (isArabic ? 'فشل إتمام التحويل' : 'Failed to transfer') });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container office-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', width: '100%' }}>
                <div className="modal-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowRightLeft size={20} style={{ color: 'var(--color-primary)' }} />
                        <span>{isArabic ? 'تحويل أموال بين خزائن الشركة' : 'Internal Safe Transfer'}</span>
                    </h2>
                    <button className="modal-close" onClick={onClose} title={isArabic ? 'إغلاق' : 'Close'}><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {/* Source Safe */}
                        <div className="form-group">
                            <label>{isArabic ? 'من الخزينة / الحساب (المصدر)' : 'From Safe / Account'} *</label>
                            <select
                                value={fromSafeId}
                                onChange={(e) => setFromSafeId(e.target.value)}
                                required
                            >
                                <option value="">-- {isArabic ? 'اختر الخزينة' : 'Select Source'} --</option>
                                {safes.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}  —  [{fmtCurrency(s.balance)}]
                                    </option>
                                ))}
                            </select>
                            {sourceSafe && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{isArabic ? 'الرصيد المتاح حالياً:' : 'Available:'}</span>
                                    <strong style={{ color: Number(sourceSafe.balance) >= 0 ? '#10b981' : '#ef4444' }}>
                                        {fmtCurrency(sourceSafe.balance)}
                                    </strong>
                                </div>
                            )}
                        </div>

                        {/* Destination Safe */}
                        <div className="form-group">
                            <label>{isArabic ? 'إلى الخزينة / الحساب (الوجهة)' : 'To Safe / Account'} *</label>
                            <select
                                value={toSafeId}
                                onChange={(e) => setToSafeId(e.target.value)}
                                required
                            >
                                <option value="">-- {isArabic ? 'اختر الخزينة' : 'Select Destination'} --</option>
                                {safes.filter(s => s.id !== fromSafeId).map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}  —  [{fmtCurrency(s.balance)}]
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Amount */}
                        <div className="form-group">
                            <label>{isArabic ? 'المبلغ المراد تحويله (ج.م)' : 'Transfer Amount (EGP)'} *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                                style={{ fontSize: '1.25rem', fontWeight: 800 }}
                            />
                        </div>

                        {/* Date */}
                        <div className="form-group">
                            <label>{isArabic ? 'تاريخ التحويل' : 'Transfer Date'}</label>
                            <input
                                type="date"
                                value={transferDate}
                                onChange={(e) => setTransferDate(e.target.value)}
                            />
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label>{isArabic ? 'سبب التحويل / ملاحظات' : 'Notes / Reason'}</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                placeholder={isArabic ? 'مثال: تغذية الخزينة النقدية من البنك، تحويل عهدة...' : 'e.g. Cash replenishment from bank'}
                            />
                        </div>

                        {/* Optional Receipt / Bank Transfer Statement Upload */}
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                <Paperclip size={15} style={{ color: 'var(--color-primary)' }} />
                                <span>{isArabic ? 'إيصال أو إشعار التحويل البنكي (اختياري)' : 'Receipt or Transfer Statement (Optional)'}</span>
                            </label>

                            {attachmentFile ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-color)',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                        {attachmentPreview ? (
                                            <img
                                                src={attachmentPreview}
                                                alt="Receipt preview"
                                                style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)', flexShrink: 0 }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: '42px',
                                                height: '42px',
                                                borderRadius: '6px',
                                                background: 'rgba(255, 90, 31, 0.12)',
                                                border: '1px solid rgba(255, 90, 31, 0.25)',
                                                color: 'var(--color-primary)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <FileText size={18} />
                                                <span style={{ fontSize: '0.6rem', fontWeight: 700, marginTop: '2px' }}>
                                                    {(attachmentFile.name.split('.').pop() || 'FILE').toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                            <div className="truncate" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                                {attachmentFile.name}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                                {attachmentFile.size > 1024 * 1024
                                                    ? `${(attachmentFile.size / (1024 * 1024)).toFixed(2)} MB`
                                                    : `${(attachmentFile.size / 1024).toFixed(1)} KB`}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveFile}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-tertiary)',
                                            cursor: 'pointer',
                                            padding: '6px',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        title={isArabic ? 'حذف الملف' : 'Remove file'}
                                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <label
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '16px 20px',
                                        border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                        borderRadius: '10px',
                                        background: isDragging ? 'rgba(255, 90, 31, 0.05)' : 'var(--bg-tertiary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        textAlign: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />
                                    <UploadCloud size={24} style={{ color: isDragging ? 'var(--color-primary)' : 'var(--text-tertiary)' }} />
                                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {isArabic ? 'انقر لرفع ملف أو اسحبه إلى هنا' : 'Click to upload or drag & drop'}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                        {isArabic ? 'صورة إيصال (PNG, JPG, WebP) أو مستند PDF (حتى 25 ميجابايت)' : 'Receipt image (PNG, JPG, WebP) or PDF (up to 25 MB)'}
                                    </div>
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', fontWeight: 600 }}>
                            {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: 700 }}>
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
    const displayDate = fmtDate || ((d) => {
        if (!d) return '-';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return '-';
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    });

    const statement = statementData?.statement || [];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container office-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '960px', width: '100%', maxHeight: '90vh' }}>
                <div className="modal-header">
                    <div>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.25rem' }}>
                            <FileText size={22} style={{ color: 'var(--color-primary)' }} />
                            <span dir="auto">{isArabic ? `كشف حساب: ${safe.name}` : `Statement: ${safe.name}`}</span>
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.84rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                            <span>
                                {isArabic ? 'الرصيد الافتتاحي:' : 'Opening:'}{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>{fmtCurrency(statementData?.safe?.initialBalance || 0)}</strong>
                            </span>
                            <span style={{ color: 'var(--border-color)' }}>•</span>
                            <span>
                                {isArabic ? 'الرصيد الحالي:' : 'Current Balance:'}{' '}
                                <strong style={{ color: Number(statementData?.safe?.currentBalance || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                                    {fmtCurrency(statementData?.safe?.currentBalance || 0)}
                                </strong>
                            </span>
                            {(safe.assignedUser || statementData?.safe?.assignedUser) && (
                                <>
                                    <span style={{ color: 'var(--border-color)' }}>•</span>
                                    <span>
                                        {isArabic ? 'المسؤول:' : 'Custodian:'}{' '}
                                        <strong style={{ color: '#3b82f6' }}>
                                            {(safe.assignedUser || statementData?.safe?.assignedUser).name}
                                        </strong>
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button className="btn btn-secondary btn-sm" onClick={onExport} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px' }}>
                            <Download size={15} />
                            <span>{isArabic ? 'تصدير Excel' : 'Export Excel'}</span>
                        </button>
                        <button className="modal-close" onClick={onClose} title={isArabic ? 'إغلاق' : 'Close'}><X size={18} /></button>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="statement-filter-toolbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{isArabic ? 'من:' : 'From:'}</span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{isArabic ? 'إلى:' : 'To:'}</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={onFilter} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 600 }}>
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
                            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '0.84rem' }}
                        >
                            {isArabic ? 'مسح' : 'Clear'}
                        </button>
                    )}
                </div>

                {/* Statement Table */}
                <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
                            {isArabic ? 'جاري تحميل كشف الحساب...' : 'Loading statement...'}
                        </div>
                    ) : statement.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
                            <AlertCircle size={32} style={{ margin: '0 auto 10px', opacity: 0.4, display: 'block' }} />
                            <div>{isArabic ? 'لا توجد حركات مسجلة على هذه الخزينة في هذه الفترة' : 'No transactions recorded for this period'}</div>
                        </div>
                    ) : (
                        <table className="office-tx-table statement-table">
                            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                <tr>
                                    <th style={{ textAlign: 'start', width: '120px', minWidth: '120px' }}>{isArabic ? 'التاريخ' : 'Date'}</th>
                                    <th style={{ textAlign: 'start', minWidth: '260px' }}>{isArabic ? 'البيان' : 'Description'}</th>
                                    <th style={{ textAlign: 'start', width: '140px', minWidth: '140px' }}>{isArabic ? 'المشروع / الجهة' : 'Party / Project'}</th>
                                    <th style={{ textAlign: isArabic ? 'left' : 'right', width: '130px', minWidth: '130px', color: '#10b981' }}>{isArabic ? 'وارد (+)' : 'Inflow (+)'}</th>
                                    <th style={{ textAlign: isArabic ? 'left' : 'right', width: '130px', minWidth: '130px', color: '#ef4444' }}>{isArabic ? 'منصرف (-)' : 'Outflow (-)'}</th>
                                    <th style={{ textAlign: isArabic ? 'left' : 'right', width: '150px', minWidth: '150px' }}>{isArabic ? 'الرصيد' : 'Running Balance'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statement.map(item => (
                                    <tr key={item.id}>
                                        <td style={{ textAlign: 'start', whiteSpace: 'nowrap' }}>
                                            <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                                                {displayDate(item.date)}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'start' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem', lineHeight: '1.4' }}>
                                                {item.description}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '3px' }}>
                                                {item.reference && (
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                                        {isArabic ? 'مرجع:' : 'Ref:'} {item.reference}
                                                    </span>
                                                )}
                                                {item.receiptUrl && (
                                                    <a
                                                        href={item.receiptUrl.startsWith('http') ? item.receiptUrl : `/uploads/${item.receiptUrl.replace(/^(\/?uploads\/|\/+)/, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '0.72rem',
                                                            color: 'var(--color-primary)',
                                                            background: 'rgba(255, 90, 31, 0.08)',
                                                            padding: '2px 8px',
                                                            borderRadius: '5px',
                                                            border: '1px solid rgba(255, 90, 31, 0.22)',
                                                            textDecoration: 'none',
                                                            fontWeight: 600
                                                        }}
                                                        title={isArabic ? 'عرض المستند أو الإيصال المرفق' : 'View attached receipt / statement'}
                                                    >
                                                        <Paperclip size={12} />
                                                        <span>{isArabic ? 'عرض الإيصال' : 'View Receipt'}</span>
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'start' }}>
                                            {item.projectName || item.partyName ? (
                                                <span className="statement-project-pill">
                                                    {item.projectName || item.partyName}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: isArabic ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                                            {item.inflow > 0 ? (
                                                <span dir="ltr" style={{ fontWeight: 800, color: '#10b981', fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
                                                    +{fmtCurrency(item.inflow)}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: isArabic ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                                            {item.outflow > 0 ? (
                                                <span dir="ltr" style={{ fontWeight: 800, color: '#ef4444', fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
                                                    -{fmtCurrency(item.outflow)}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: isArabic ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                                            <span dir="ltr" style={{
                                                fontWeight: 800,
                                                fontSize: '0.92rem',
                                                fontVariantNumeric: 'tabular-nums',
                                                color: item.balanceAfter >= 0 ? 'var(--text-primary)' : '#ef4444'
                                            }}>
                                                {fmtCurrency(item.balanceAfter)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', fontWeight: 600 }}>
                        {isArabic ? 'إغلاق' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
}
