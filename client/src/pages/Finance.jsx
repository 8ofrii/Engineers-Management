import { useState, useEffect, Fragment } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transactionsAPI, workmenAPI, projectsAPI, suppliersAPI, userAPI, clientsAPI } from '../services/api';
import { Plus, Wallet, FileText, Filter, Pencil, Trash2, X, CheckCircle, XCircle, Clock, Paperclip, Download, RotateCcw, CornerDownRight, Eye, Mic, Image as ImageIcon, Sparkles, Building2, Printer, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import AddTransactionModal from '../components/AddTransactionModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import RefundConfirmationModal from '../components/RefundConfirmationModal';
import TransactionDetailModal from '../components/TransactionDetailModal';
import TransactionActionsMenu from '../components/TransactionActionsMenu';
import { useFormat, cleanTransactionDescription, getLocalizedName } from '../utils/format';
import { exportToXLSX } from '../utils/excelExport';
import { apiErrorMessage } from '../utils/apiError';
import { parseReceiptUrls } from '../utils/media';
import { sortTransactionList as sortTxList } from '../utils/transactionSort';

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

    // Sorting state (default: date desc - newest first upon app load)
    const [sortField, setSortField] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            // Default newest first for date, highest first for amount; A-Z ascending for text
            setSortOrder(field === 'date' || field === 'amount' ? 'desc' : 'asc');
        }
    };

    // Delete state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState(null);

    // Refund state
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [transactionToRefund, setTransactionToRefund] = useState(null);
    const [isRefunding, setIsRefunding] = useState(false);

    // Detail & Media Evidence state
    const [selectedDetailTx, setSelectedDetailTx] = useState(null);

    // Export PDF & Print states
    const [exportingPdf, setExportingPdf] = useState(false);
    const [printingPdf, setPrintingPdf] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const handleOpenDetail = (tx) => {
        setSelectedDetailTx(tx);
        setIsDetailModalOpen(true);
    };

    const [workmen, setWorkmen] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [filterPaidById, setFilterPaidById] = useState('ALL'); // 'ALL', 'ALL_MEMBERS', 'ALL_CLIENTS', 'MEMBER:<id>', 'CLIENT:<id>'
    const [filterPaidToId, setFilterPaidToId] = useState('ALL'); // 'ALL', 'ALL_MEMBERS', 'ALL_WORKMEN', 'ALL_SUPPLIERS', 'MEMBER:<id>', 'WORKMAN:<id>', 'SUPPLIER:<id>'
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
        loadWorkmen();
        loadSuppliers();
        loadProjects();
        loadUsers();
        loadClients();
    }, []);

    useEffect(() => {
        loadTransactions();
    }, [filterType, filterProjectId, filterPaidById, filterPaidToId, dateFrom, dateTo]);

    const getPaidByBadgeLabel = () => {
        if (!filterPaidById || filterPaidById === 'ALL') return '';
        if (filterPaidById === 'ALL_MEMBERS') return isArabic ? 'كل أعضاء الشركة' : 'All Company Members';
        if (filterPaidById === 'ALL_CLIENTS') return isArabic ? 'كل العملاء' : 'All Clients';
        if (filterPaidById.startsWith('MEMBER:')) {
            const uid = filterPaidById.replace('MEMBER:', '');
            const u = users.find(x => x.id === uid);
            if (!u) return uid;
            const roleKey = (u.role || '').toUpperCase();
            const role = isArabic 
                ? (t('teamManagement.roles.' + roleKey) || u.role) 
                : (t('teamManagement.roles.' + roleKey, { lng: 'en' }) || u.role);
            return u.name + (role ? ' (' + role + ')' : '');
        }
        if (filterPaidById.startsWith('CLIENT:')) {
            const cid = filterPaidById.replace('CLIENT:', '');
            const c = clients.find(x => x.id === cid);
            return c ? c.name : cid;
        }
        const u = users.find(x => x.id === filterPaidById);
        if (u) return u.name;
        const c = clients.find(x => x.id === filterPaidById);
        if (c) return c.name;
        return filterPaidById;
    };

    const getPaidToBadgeLabel = () => {
        if (!filterPaidToId || filterPaidToId === 'ALL') return '';
        if (filterPaidToId === 'ALL_MEMBERS') return isArabic ? 'كل أعضاء الشركة' : 'All Company Members';
        if (filterPaidToId === 'ALL_WORKMEN') return isArabic ? 'كل العمال ومقاولو الباطن' : 'All Labor & Subcontractors';
        if (filterPaidToId === 'ALL_SUPPLIERS') return isArabic ? 'كل الموردين والشركات' : 'All Suppliers & Vendors';
        if (filterPaidToId.startsWith('MEMBER:')) {
            const uid = filterPaidToId.replace('MEMBER:', '');
            const u = users.find(x => x.id === uid);
            if (!u) return uid;
            const roleKey = (u.role || '').toUpperCase();
            const role = isArabic 
                ? (t('teamManagement.roles.' + roleKey) || u.role) 
                : (t('teamManagement.roles.' + roleKey, { lng: 'en' }) || u.role);
            return u.name + (role ? ' (' + role + ')' : '');
        }
        if (filterPaidToId.startsWith('WORKMAN:')) {
            const wid = filterPaidToId.replace('WORKMAN:', '');
            const w = workmen.find(x => x.id === wid);
            if (!w) return wid;
            const tradeKey = (w.trade || '').toUpperCase();
            const trade = isArabic 
                ? (t('labor.trades.' + tradeKey) || w.trade) 
                : (t('labor.trades.' + tradeKey, { lng: 'en' }) || w.trade);
            return w.name + (trade ? ' (' + trade + ')' : '');
        }
        if (filterPaidToId.startsWith('SUPPLIER:')) {
            const sid = filterPaidToId.replace('SUPPLIER:', '');
            const s = suppliers.find(x => x.id === sid);
            return s ? s.name : sid;
        }
        const u = users.find(x => x.id === filterPaidToId);
        if (u) return u.name;
        const w = workmen.find(x => x.id === filterPaidToId);
        if (w) return w.name;
        const s = suppliers.find(x => x.id === filterPaidToId);
        if (s) return s.name;
        return filterPaidToId;
    };

    const isClientIncomeTransaction = (tx) => {
        if (tx.type !== 'INCOME') return false;
        return Boolean(
            tx.clientId ||
            tx.client ||
            tx.paidByClientContact ||
            tx.project?.clientId ||
            (tx.category && ['CLIENT_PAYMENT', 'PAYMENT', 'PROJECT_FUNDING', 'INVOICE_PAYMENT'].includes(tx.category)) ||
            (tx.description && (
                tx.description.includes('دفعة عميل') ||
                tx.description.toLowerCase().includes('client payment') ||
                tx.description.toLowerCase().includes('customer payment')
            ))
        );
    };

    const matchesPaidBy = (tx, paidByFilter) => {
        if (!paidByFilter || paidByFilter === 'ALL') return true;

        const isClientIncome = isClientIncomeTransaction(tx);

        if (paidByFilter === 'ALL_MEMBERS') {
            if (isClientIncome) return false;
            if (tx.type === 'EXPENSE') return true;
            return Boolean(tx.payerUserId || tx.payer);
        }

        if (paidByFilter === 'ALL_CLIENTS') {
            if (isClientIncome) return true;
            return Boolean(tx.clientId || tx.client || tx.paidByClientContact || tx.project?.clientId);
        }

        if (paidByFilter.startsWith('MEMBER:')) {
            const targetId = paidByFilter.replace('MEMBER:', '');

            // CRITICAL: Client income payments are paid by clients, NOT company members!
            if (isClientIncome) return false;

            if (tx.payerUserId === targetId || tx.payer?.id === targetId) return true;

            // For EXPENSES only: if no explicit payerUserId, fall back to creator
            if (tx.type === 'EXPENSE' && (tx.createdBy === targetId || tx.user?.id === targetId)) {
                return true;
            }

            if (tx.type === 'EXPENSE') {
                const u = users.find(x => x.id === targetId);
                if (u) {
                    const uName = (u.name || '').trim().toLowerCase();
                    const from = (tx.transactionFrom || '').trim().toLowerCase();
                    if (uName && from && from.includes(uName)) return true;
                }
            }
            return false;
        }

        if (paidByFilter.startsWith('CLIENT:')) {
            const targetId = paidByFilter.replace('CLIENT:', '');
            if (tx.clientId === targetId || tx.client?.id === targetId) return true;
            if (tx.project?.clientId === targetId) return true;
            const c = clients.find(x => x.id === targetId);
            if (c) {
                const cName = (c.name || '').trim().toLowerCase();
                const from = (tx.transactionFrom || '').trim().toLowerCase();
                const contact = (tx.paidByClientContact || '').trim().toLowerCase();
                const b = (tx.beneficiary || '').trim().toLowerCase();
                const desc = (tx.description || '').trim().toLowerCase();
                if (cName && (
                    (from && from.includes(cName)) ||
                    (contact && contact.includes(cName)) ||
                    (tx.type === 'INCOME' && ((b && b.includes(cName)) || (desc && desc.includes(cName))))
                )) {
                    return true;
                }
            }
            return false;
        }

        if (paidByFilter === tx.payerUserId) return true;
        if (tx.type === 'EXPENSE' && paidByFilter === tx.createdBy) return true;
        if (paidByFilter === tx.clientId) return true;
        return false;
    };

    const matchesPaidTo = (tx, paidToFilter) => {
        if (!paidToFilter || paidToFilter === 'ALL') return true;

        if (tx.type === 'INCOME') {
            if (paidToFilter === 'ALL_WORKMEN' || paidToFilter.startsWith('WORKMAN:') ||
                paidToFilter === 'ALL_SUPPLIERS' || paidToFilter.startsWith('SUPPLIER:')) {
                return false;
            }
        }

        if (paidToFilter === 'ALL_MEMBERS') {
            if (tx.toEngineerId || tx.toEngineer) return true;
            if (tx.category === 'CUSTODY_TRANSFER' || tx.category === 'MANAGEMENT_FEE_TRANSFER') return true;
            const b = (tx.beneficiary || '').trim().toLowerCase();
            const to = (tx.transactionTo || '').trim().toLowerCase();
            return users.some(u => {
                const n = (u.name || '').trim().toLowerCase();
                return n && (b.includes(n) || to.includes(n));
            });
        }

        if (paidToFilter === 'ALL_WORKMEN') {
            return Boolean(
                tx.workmanId || 
                tx.workman || 
                (tx.category && ['LABOR', 'WORKMANSHIP', 'LABOR_WAGES', 'MASONRY_LABOR', 'GENERAL_LABOR', 'CONTRACTING'].includes(tx.category))
            );
        }

        if (paidToFilter === 'ALL_SUPPLIERS') {
            return Boolean(
                tx.supplierId || 
                tx.supplier || 
                (tx.category && ['MATERIALS', 'SUPPLIERS', 'MATERIALS_PURCHASE', 'EQUIPMENT', 'BRICKS', 'STEEL', 'CEMENT', 'STOCKING'].includes(tx.category))
            );
        }

        if (paidToFilter.startsWith('MEMBER:')) {
            const targetId = paidToFilter.replace('MEMBER:', '');
            if (tx.toEngineerId === targetId || tx.toEngineer?.id === targetId) return true;
            const u = users.find(x => x.id === targetId);
            if (u) {
                const uName = (u.name || '').trim().toLowerCase();
                const b = (tx.beneficiary || '').trim().toLowerCase();
                const to = (tx.transactionTo || '').trim().toLowerCase();
                if (uName && (b.includes(uName) || to.includes(uName))) return true;
            }
            return false;
        }

        if (paidToFilter.startsWith('WORKMAN:')) {
            const targetId = paidToFilter.replace('WORKMAN:', '');
            if (tx.workmanId === targetId || tx.workman?.id === targetId) return true;
            const w = workmen.find(x => x.id === targetId);
            if (w) {
                const wName = (w.name || '').trim().toLowerCase();
                const wNameAr = (w.nameAr || '').trim().toLowerCase();
                const b = (tx.beneficiary || '').trim().toLowerCase();
                const to = (tx.transactionTo || '').trim().toLowerCase();
                const wkName = (tx.workman?.name || '').trim().toLowerCase();
                if (wName && (b.includes(wName) || to.includes(wName) || wkName.includes(wName))) return true;
                if (wNameAr && (b.includes(wNameAr) || to.includes(wNameAr))) return true;
            }
            return false;
        }

        if (paidToFilter.startsWith('SUPPLIER:')) {
            const targetId = paidToFilter.replace('SUPPLIER:', '');
            if (tx.supplierId === targetId || tx.supplier?.id === targetId) return true;
            const s = suppliers.find(x => x.id === targetId);
            if (s) {
                const sName = (s.name || '').trim().toLowerCase();
                const sNameAr = (s.nameAr || '').trim().toLowerCase();
                const sCompany = (s.company || '').trim().toLowerCase();
                const b = (tx.beneficiary || '').trim().toLowerCase();
                const to = (tx.transactionTo || '').trim().toLowerCase();
                const spName = (tx.supplier?.name || '').trim().toLowerCase();
                const spNameAr = (tx.supplier?.nameAr || '').trim().toLowerCase();
                if (sName && (b.includes(sName) || to.includes(sName) || spName.includes(sName))) return true;
                if (sNameAr && (b.includes(sNameAr) || to.includes(sNameAr) || spNameAr.includes(sNameAr))) return true;
                if (sCompany && (b.includes(sCompany) || to.includes(sCompany))) return true;
            }
            return false;
        }

        if (tx.toEngineerId === paidToFilter || tx.workmanId === paidToFilter || tx.supplierId === paidToFilter) return true;
        return false;
    };

    const loadTransactions = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterType !== 'ALL' && filterType !== 'COMPANY_SHARE' && filterType !== 'MY_LEDGER' && !(filterType === 'INCOME' && filterProjectId === 'OFFICE')) {
                params.type = filterType;
            }
            if (filterProjectId) {
                params.filterProjectId = filterProjectId;
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
                allTx = allTx.filter(tx => tx.type === 'INCOME' || (filterProjectId === 'OFFICE' && tx.category === 'MANAGEMENT_FEE_TRANSFER'));
            }

            // Filter by project
            if (filterProjectId) {
                if (filterProjectId === 'OFFICE') {
                    allTx = allTx.filter(tx => tx.isOfficeExpense || !tx.projectId || tx.category === 'MANAGEMENT_FEE_TRANSFER');
                } else {
                    allTx = allTx.filter(tx => tx.projectId === filterProjectId);
                }
            }

            // Filter by Paid by (Company member / Client)
            if (filterPaidById && filterPaidById !== 'ALL') {
                allTx = allTx.filter(tx => matchesPaidBy(tx, filterPaidById));
            }

            // Filter by Paid to (Company member / Workman / Supplier)
            if (filterPaidToId && filterPaidToId !== 'ALL') {
                allTx = allTx.filter(tx => matchesPaidTo(tx, filterPaidToId));
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

    const loadSuppliers = async () => {
        try {
            const res = await suppliersAPI.getAll();
            setSuppliers(res.data?.data || []);
        } catch (error) {
            console.error('Failed to load suppliers:', error);
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

    const loadUsers = async () => {
        try {
            const res = await userAPI.getAll();
            setUsers(res.data?.data || res.data || []);
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    };

    const loadClients = async () => {
        try {
            const res = await clientsAPI.getAll();
            setClients(res.data?.data || res.data || []);
        } catch (error) {
            console.error('Failed to load clients:', error);
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

        const companyName = user?.company || user?.tenant?.name || 'Hesaby ERP';
        const titleBanner = `${companyName} — ${isArabic ? 'سجل المعاملات والقيود المالية المعتمد' : 'Official Financial Transactions Register'}`;
        
        const compMeta = [
            user?.email,
            user?.phone,
            isArabic ? 'نظام حسابي لإدارة المقاولات والمشاريع' : 'Hesaby ERP Construction Management'
        ].filter(Boolean).join(' • ');

        const projectName = filterProjectId === 'OFFICE'
            ? (isArabic ? 'المقر الرئيسي (مصروفات عامة)' : 'HQ / Office Expenses')
            : (filterProjectId
                ? (projects.find(p => p.id === filterProjectId)?.name || filterProjectName || filterProjectId)
                : (isArabic ? 'كافة المشاريع' : 'All Projects'));

        const dateRange = (dateFrom && dateTo)
            ? `${dateFrom} ${isArabic ? 'إلى' : 'to'} ${dateTo}`
            : (dateFrom ? `${isArabic ? 'من' : 'From'} ${dateFrom}` : (dateTo ? `${isArabic ? 'حتى' : 'Until'} ${dateTo}` : (isArabic ? 'كل الفترات' : 'All Time')));

        const paidByBadge = getPaidByBadgeLabel();
        const paidByText = paidByBadge ? ` | ${isArabic ? 'الدافع:' : 'Paid by:'} ${paidByBadge}` : '';
        const paidToBadge = getPaidToBadgeLabel();
        const paidToText = paidToBadge ? ` | ${isArabic ? 'المدفوع له:' : 'Paid to:'} ${paidToBadge}` : '';

        const scopeLine = `${isArabic ? 'نطاق التقرير:' : 'Scope:'} ${projectName}${paidByText}${paidToText} | ${isArabic ? 'الفترة:' : 'Period:'} ${dateRange} | ${isArabic ? 'تاريخ التصدير:' : 'Exported:'} ${new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-GB')} | ${isArabic ? 'المسؤول:' : 'By:'} ${user?.name || ''}`;

        // Compute KPIs for sheet summary
        const approvedIncomes = transactions
            .filter(t => (t.type === 'INCOME' || t.type === 'income') && (t.status === 'APPROVED' || !t.status))
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const approvedExpenses = transactions
            .filter(t => (t.type === 'EXPENSE' || t.type === 'expense') && (t.status === 'APPROVED' || !t.status) && t.category !== 'MANAGEMENT_FEE_TRANSFER')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const totalProfit = transactions
            .filter(t => t.category === 'MANAGEMENT_FEE_TRANSFER' && (t.status === 'APPROVED' || !t.status))
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const netCash = approvedIncomes - approvedExpenses - totalProfit;

        const makeRow = () => new Array(16).fill('');

        const r0 = makeRow(); r0[0] = titleBanner;
        const r1 = makeRow(); r1[0] = compMeta;
        const r2 = makeRow(); r2[0] = scopeLine;
        const r3 = makeRow(); // blank spacer

        // KPI Summary Ribbon
        const r4 = makeRow();
        r4[0] = isArabic ? 'الملخص المالي والسيولة النقدية' : 'Executive Financial Summary & Cash Flow Overview';

        // KPI Row 1: Income (cols 0-2 & 3) | Profit (cols 4-5 & 6)
        const r5 = makeRow();
        r5[0] = isArabic ? 'إجمالي المقبوضات المحصلة' : 'Total Collected Income';
        r5[3] = Number(approvedIncomes.toFixed(2));
        r5[4] = isArabic ? 'أرباح الشركة المحققة' : 'Recognized Office Profit';
        r5[6] = Number(totalProfit.toFixed(2));

        // KPI Row 2: Expenses (cols 0-2 & 3) | Net Cash (cols 4-5 & 6)
        const r6 = makeRow();
        r6[0] = isArabic ? 'إجمالي مصروفات المواقع والمقر' : 'Total Site & Office Expenses';
        r6[3] = Number(approvedExpenses.toFixed(2));
        r6[4] = isArabic ? 'صافي السيولة النقدية التشغيلية' : 'Net Operational Cash Flow';
        r6[6] = Number(netCash.toFixed(2));

        // KPI Row 3: Count
        const r7 = makeRow();
        r7[0] = isArabic ? 'إجمالي عدد القيود المسجلة' : 'Total Registered Transactions';
        r7[3] = transactions.length;

        const r8 = makeRow(); // blank spacer

        // Table Header (row 9)
        const r9 = [
            isArabic ? 'م' : '#',
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
        ];

        const rows = [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9];

        let totalAmountSum = 0;
        transactions.forEach((tx, idx) => {
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

            const catLabel = (tx.category === 'OTHER' && tx.description && (tx.description.startsWith('Other - ') || tx.description.startsWith('أخرى - ')))
                ? tx.description.split(':')[0].trim()
                : (isArabic
                    ? (t(`finance.categories.${tx.category?.toLowerCase()}`) || tx.category || '')
                    : (tx.category || ''));

            const beneficiaryVal = tx.type === 'INCOME'
                ? (getLocalizedName(tx.client, isArabic) || getLocalizedName(tx.project?.client, isArabic) || '')
                : (tx.beneficiary || getLocalizedName(tx.supplier, isArabic) || getLocalizedName(tx.workman, isArabic) || '');

            const numAmount = Number(Number(tx.amount || 0).toFixed(2));
            totalAmountSum += numAmount;

            rows.push([
                idx + 1,
                formatDate(tx.transactionDate || tx.createdAt),
                txType,
                getLocalizedName(tx.project, isArabic) || (isArabic ? 'عام / المقر' : 'General / HQ'),
                catLabel,
                tx.description || '',
                getLocalizedName(tx.projectCostItem, isArabic) || '',
                tx.paidByClientContact || tx.transactionFrom || getLocalizedName(tx.payer, isArabic) || getLocalizedName(tx.user, isArabic) || '',
                beneficiaryVal,
                tx.transactionTo || '',
                pMethod,
                numAmount,
                status,
                tx.physicalAccount || '',
                tx.costCenter || '',
                getLocalizedName(tx.creator, isArabic) || ''
            ]);
        });

        // Grand Total Summary Row with exact 16 columns and aligned Amount (col 11)
        const grandTotalRow = makeRow();
        grandTotalRow[0] = isArabic ? 'الإجمالي الكلي' : 'Grand Total';
        grandTotalRow[4] = `${transactions.length} ${isArabic ? 'معاملة مسجلة' : 'transactions'}`;
        grandTotalRow[11] = Number(totalAmountSum.toFixed(2));
        rows.push(grandTotalRow);

        const customMerges = [
            // Top Banners across all 16 columns
            { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 15 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 15 } },
            // Executive Summary Title Ribbon
            { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } },
            // KPI Row 5: Income label (A-C) | Profit label (E-F)
            { s: { r: 5, c: 0 }, e: { r: 5, c: 2 } },
            { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
            // KPI Row 6: Expenses label (A-C) | Net Cash label (E-F)
            { s: { r: 6, c: 0 }, e: { r: 6, c: 2 } },
            { s: { r: 6, c: 4 }, e: { r: 6, c: 5 } },
            // KPI Row 7: Count label (A-C)
            { s: { r: 7, c: 0 }, e: { r: 7, c: 2 } }
        ];

        exportToXLSX({
            filename: `hesaby-transactions-${new Date().toISOString().slice(0, 10)}.xlsx`,
            sheets: [
                {
                    sheetName: isArabic ? 'سجل المعاملات' : 'Transactions',
                    data: rows,
                    customMerges
                }
            ],
            isRTL: isArabic
        });
    };

    const handleExportTransactionsPDF = async (mode = 'download') => {
        if (!transactions || transactions.length === 0) {
            showAlert({
                type: 'info',
                title: isArabic ? 'لا توجد بيانات' : 'No Data',
                message: isArabic ? 'لا توجد معاملات متاحة للتصدير أو الطباعة' : 'No transactions available to export or print'
            });
            return;
        }

        if (mode === 'print') setPrintingPdf(true);
        else setExportingPdf(true);

        try {
            let filterWorkmanIdToSend = null;
            let filterSupplierIdToSend = null;
            if (filterPaidToId.startsWith('WORKMAN:')) {
                filterWorkmanIdToSend = filterPaidToId.replace('WORKMAN:', '');
            } else if (filterPaidToId.startsWith('SUPPLIER:')) {
                filterSupplierIdToSend = filterPaidToId.replace('SUPPLIER:', '');
            } else if (filterPaidToId !== 'ALL' && filterPaidToId !== 'ALL_WORKMEN' && filterPaidToId !== 'ALL_SUPPLIERS') {
                if (workmen.some(w => w.id === filterPaidToId)) filterWorkmanIdToSend = filterPaidToId;
                else if (suppliers.some(s => s.id === filterPaidToId)) filterSupplierIdToSend = filterPaidToId;
            }

            const payload = {
                transactionIds: transactions.map(t => t.id),
                filterProjectId,
                filterType,
                filterPaidById,
                filterPaidToId,
                filterWorkmanId: filterWorkmanIdToSend,
                filterSupplierId: filterSupplierIdToSend,
                filterPayeeId: filterPaidToId,
                dateFrom,
                dateTo,
                lang: i18n.language
            };

            const blob = await transactionsAPI.downloadLedgerPdf(payload);
            const url = window.URL.createObjectURL(blob);
            const dateSlug = new Date().toISOString().slice(0, 10);

            if (mode === 'print') {
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed';
                iframe.style.right = '0';
                iframe.style.bottom = '0';
                iframe.style.width = '0';
                iframe.style.height = '0';
                iframe.style.border = '0';
                iframe.src = url;
                document.body.appendChild(iframe);

                iframe.onload = () => {
                    setTimeout(() => {
                        try {
                            iframe.contentWindow?.focus();
                            iframe.contentWindow?.print();
                        } catch {
                            window.open(url, '_blank');
                        }
                        setTimeout(() => {
                            try {
                                document.body.removeChild(iframe);
                                window.URL.revokeObjectURL(url);
                            } catch {}
                        }, 60000);
                    }, 350);
                };
            } else {
                const a = document.createElement('a');
                a.href = url;
                a.download = `hesaby-transactions-ledger-${dateSlug}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => window.URL.revokeObjectURL(url), 2000);
            }
        } catch (error) {
            console.error('Failed to export transactions PDF:', error);
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: apiErrorMessage(error, isArabic ? 'فشل في استخراج ملف PDF' : 'Failed to export PDF')
            });
        } finally {
            setExportingPdf(false);
            setPrintingPdf(false);
        }
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
        const receiptUrls = parseReceiptUrls(legacyUrl);
        const hasVoice = Boolean(txObj?.voiceNoteUrl);
        const hasReceipt = receiptUrls.length > 0;
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

                {/* Receipt Media Pill (Supports single & multiple attachments) */}
                {hasReceipt && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (txObj) {
                                handleOpenDetail(txObj);
                            } else if (receiptUrls[0]) {
                                window.open(receiptUrls[0], '_blank');
                            }
                        }}
                        className="badge-media-btn receipt"
                        title={isArabic ? (receiptUrls.length > 1 ? `معاينة المرفقات (${receiptUrls.length}) وتفاصيلها` : 'معاينة الإيصال وتفاصيله') : (receiptUrls.length > 1 ? `View Attachments (${receiptUrls.length}) & Details` : 'View Receipt & Details')}
                    >
                        <ImageIcon size={12} />
                        <span>
                            {receiptUrls.length > 1
                                ? `${receiptUrls.length} ${isArabic ? 'مرفقات' : 'files'}`
                                : (isArabic ? 'إيصال' : 'Receipt')}
                        </span>
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

    const getFeePercent = (tx, feeTx = null) => {
        // 1. Try extracting percentage from description e.g. "(15%)" or "(10%)"
        if (feeTx?.description) {
            const match = feeTx.description.match(/\((\d+(?:\.\d+)?)%\)/);
            if (match) return match[1];
        }
        if (tx?.description) {
            const match = tx.description.match(/\((\d+(?:\.\d+)?)%\)/);
            if (match) return match[1];
        }
        // 2. Try calculating percentage from fee amount / expense amount
        if (feeTx && tx && Number(tx.amount) > 0) {
            const pct = Math.round((Number(feeTx.amount) / Number(tx.amount)) * 100);
            if (!isNaN(pct) && pct > 0) return pct;
        }
        if (tx?.nestedFees && tx.nestedFees.length > 0 && Number(tx.amount) > 0) {
            const feeAmt = Number(tx.nestedFees[0].amount);
            const pct = Math.round((feeAmt / Number(tx.amount)) * 100);
            if (!isNaN(pct) && pct > 0) return pct;
        }
        // 3. Lookup project management fee percent
        const proj = tx?.project || (tx?.projectId ? projects.find(p => p.id === tx.projectId) : null);
        if (proj?.managementFeePercent !== undefined && proj?.managementFeePercent !== null) {
            return proj.managementFeePercent;
        }
        return 10;
    };

    const renderPayerOrClient = (tx) => {
        if (tx.category === 'MANAGEMENT_FEE_TRANSFER') {
            const projName = getLocalizedName(tx.project, isArabic) || 'الجزار2';
            return (
                <div style={{ lineHeight: 1.35 }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.84rem' }} className="truncate">
                        {isArabic ? `خزينة ${projName}` : `${projName} Safe`}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '2px', fontWeight: '600' }} className="truncate">
                        {isArabic ? '➔ أرباح المقر الرئيسي' : '➔ HQ Office Profit'}
                    </div>
                </div>
            );
        }

        if (tx.type === 'INCOME') {
            const clientName = getLocalizedName(tx.client, isArabic) || getLocalizedName(tx.project?.client, isArabic) || '';
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
            const payer = getLocalizedName(tx.payer, isArabic) || getLocalizedName(tx.user, isArabic) || '';
            const beneficiary = tx.beneficiary || getLocalizedName(tx.supplier, isArabic) || getLocalizedName(tx.workman, isArabic) || '';
            const recipient = tx.transactionTo || '';
            return (
                <div style={{ lineHeight: 1.35 }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.84rem' }} className="truncate">
                        {payer || beneficiary || recipient || '-'}
                    </div>
                    {beneficiary && payer && beneficiary !== payer && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }} className="truncate">
                            <span style={{ display: 'inline-block', transform: isArabic ? 'scaleX(-1)' : 'none', marginInlineEnd: '4px', opacity: 0.75 }}>↳</span>
                            {isArabic ? 'المستفيد:' : 'To:'} <span style={{ color: 'var(--text-primary)' }}>{beneficiary}</span>
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

    const sortTransactionList = (list, field = 'date', order = 'desc') =>
        sortTxList(list, field, order, { isArabic, t });


    const renderSortableHeader = (field, label, { align = 'start', width } = {}) => {
        const isActive = sortField === field;
        return (
            <th
                key={field}
                onClick={() => handleSort(field)}
                style={{
                    textAlign: align,
                    width: width || 'auto',
                    cursor: 'pointer',
                    userSelect: 'none',
                    position: 'relative'
                }}
                className={`sortable-th ${isActive ? 'active-sort' : ''}`}
                title={isArabic 
                    ? `ترتيب حسب ${label} (${isActive ? (sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي') : 'انقر للترتيب'})` 
                    : `Sort by ${label} (${isActive ? (sortOrder === 'asc' ? 'Ascending' : 'Descending') : 'Click to sort'})`}
            >
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    justifyContent: align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start',
                    width: '100%'
                }}>
                    <span style={{ fontWeight: isActive ? '800' : '700' }}>{label}</span>
                    <span
                        className={`sort-icon-indicator ${isActive ? 'active' : 'muted'}`}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            color: isActive ? 'var(--color-primary)' : 'currentColor',
                            opacity: isActive ? 1 : 0.35,
                            transition: 'opacity 0.15s ease'
                        }}
                    >
                        {isActive ? (
                            sortOrder === 'asc' ? <ArrowUp size={13} strokeWidth={2.5} /> : <ArrowDown size={13} strokeWidth={2.5} />
                        ) : (
                            <ArrowUpDown size={12} strokeWidth={1.8} />
                        )}
                    </span>
                </div>
            </th>
        );
    };

    const organizeTransactionsWithFees = (rawTxs, isAllTab) => {
        if (!isAllTab) {
            const unnested = rawTxs.map(tx => ({ ...tx, nestedFees: [] }));
            return sortTransactionList(unnested, sortField, sortOrder);
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

        return sortTransactionList([...structured, ...orphanFees], sortField, sortOrder);
    };

    return (
        <Layout>
            <div className="finance-page">
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
                            background: 'var(--color-primary)',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)'
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
                        <Building2 size={18} />
                        <span>{isArabic ? 'ماليات المقر والخزائن' : 'Office Finances & Safes'}</span>
                    </Link>
                </div>

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

                        {/* Paid By Filter Badge */}
                        {filterPaidById && filterPaidById !== 'ALL' && (
                            <div style={{
                                marginTop: 'var(--spacing-md)',
                                marginInlineStart: 'var(--spacing-sm)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-sm)',
                                padding: '8px 16px',
                                background: 'rgba(37, 99, 235, 0.12)',
                                color: '#2563eb',
                                borderRadius: 'var(--radius-full)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: '600',
                                border: '1px solid rgba(37, 99, 235, 0.28)'
                            }}>
                                <Filter size={16} />
                                <span>{isArabic ? 'الدافع:' : 'Paid by:'} {getPaidByBadgeLabel()}</span>
                                <button
                                    onClick={() => setFilterPaidById('ALL')}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#2563eb',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderRadius: 'var(--radius-sm)',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(37, 99, 235, 0.2)'}
                                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                    title={t('common.clear')}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        {/* Paid To Filter Badge */}
                        {filterPaidToId && filterPaidToId !== 'ALL' && (
                            <div style={{
                                marginTop: 'var(--spacing-md)',
                                marginInlineStart: 'var(--spacing-sm)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-sm)',
                                padding: '8px 16px',
                                background: 'rgba(245, 158, 11, 0.12)',
                                color: '#d97706',
                                borderRadius: 'var(--radius-full)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: '600',
                                border: '1px solid rgba(245, 158, 11, 0.28)'
                            }}>
                                <Filter size={16} />
                                <span>{isArabic ? 'المدفوع له:' : 'Paid to:'} {getPaidToBadgeLabel()}</span>
                                <button
                                    onClick={() => setFilterPaidToId('ALL')}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#d97706',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderRadius: 'var(--radius-sm)',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(245, 158, 11, 0.2)'}
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
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleExportTransactionsPDF('download')}
                            disabled={transactions.length === 0 || exportingPdf}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            title={isArabic ? 'تصدير سجل المعاملات كملف PDF معتمد' : 'Export official transactions ledger as PDF'}
                        >
                            {exportingPdf ? (
                                <span className="spinner" style={{ width: 16, height: 16, margin: 0, borderWidth: 2 }} />
                            ) : (
                                <FileText size={18} />
                            )}
                            {isArabic ? (exportingPdf ? 'جاري التصدير...' : 'تصدير PDF') : (exportingPdf ? 'Exporting...' : 'Export PDF')}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleExportTransactionsPDF('print')}
                            disabled={transactions.length === 0 || printingPdf}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            title={isArabic ? 'طباعة مباشرة A4 لسجل المعاملات' : 'Print A4 Transactions Ledger'}
                        >
                            {printingPdf ? (
                                <span className="spinner" style={{ width: 16, height: 16, margin: 0, borderWidth: 2 }} />
                            ) : (
                                <Printer size={18} />
                            )}
                            {isArabic ? (printingPdf ? 'جاري الفتح...' : 'طباعة') : (printingPdf ? 'Opening...' : 'Print')}
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
                                <option value="OFFICE">🏢 {isArabic ? 'المكتب / المقر الرئيسي' : 'Office / Headquarters'}</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{getLocalizedName(p, isArabic)}</option>
                                ))}
                            </select>

                            {/* 1. Paid By Filter Dropdown */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <select
                                    value={filterPaidById}
                                    onChange={(e) => setFilterPaidById(e.target.value)}
                                    className="select"
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 'var(--font-size-sm)',
                                        minWidth: '185px',
                                        maxWidth: '240px',
                                        background: 'var(--bg-tertiary)',
                                        border: filterPaidById !== 'ALL' ? '1px solid #2563eb' : '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                    title={isArabic ? 'تصفية حسب الدافع (أعضاء الشركة أو العملاء)' : 'Filter by Payer (Company Members or Clients)'}
                                >
                                    <option value="ALL">
                                        {isArabic ? 'الدافع: الكل' : 'Paid by: All'}
                                    </option>

                                    <optgroup label={isArabic ? '⚡ تصفية سريعة' : '⚡ Quick Filter'}>
                                        <option value="ALL_MEMBERS">
                                            {isArabic ? '👥 كل أعضاء الشركة' : '👥 All Company Members'}
                                        </option>
                                        <option value="ALL_CLIENTS">
                                            {isArabic ? '🏢 كل العملاء' : '🏢 All Clients'}
                                        </option>
                                    </optgroup>

                                    {users.length > 0 && (
                                        <optgroup label={(isArabic ? '👥 أعضاء الشركة' : '👥 Company Members') + ' (' + users.length + ')'}>
                                            {users.map(u => {
                                                const roleKey = (u.role || '').toUpperCase();
                                                const roleName = isArabic 
                                                    ? (t('teamManagement.roles.' + roleKey) || u.role) 
                                                    : (t('teamManagement.roles.' + roleKey, { lng: 'en' }) || u.role);
                                                return (
                                                    <option key={'paid-by-member-' + u.id} value={'MEMBER:' + u.id}>
                                                        {getLocalizedName(u, isArabic)}{roleName ? ' (' + roleName + ')' : ''}
                                                    </option>
                                                );
                                            })}
                                        </optgroup>
                                    )}

                                    {clients.length > 0 && (
                                        <optgroup label={(isArabic ? '🏢 العملاء' : '🏢 Clients') + ' (' + clients.length + ')'}>
                                            {clients.map(c => {
                                                const extra = c.company || c.phone || '';
                                                return (
                                                    <option key={'paid-by-client-' + c.id} value={'CLIENT:' + c.id}>
                                                        {getLocalizedName(c, isArabic)}{extra ? ' (' + extra + ')' : ''}
                                                    </option>
                                                );
                                            })}
                                        </optgroup>
                                    )}
                                </select>
                                {filterPaidById !== 'ALL' && (
                                    <button
                                        className="btn btn-sm"
                                        onClick={() => setFilterPaidById('ALL')}
                                        style={{ padding: '4px 6px', fontSize: '0.75rem', height: '28px' }}
                                        title={isArabic ? 'إلغاء تصفية الدافع' : 'Clear payer filter'}
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* 2. Paid To Filter Dropdown */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <select
                                    value={filterPaidToId}
                                    onChange={(e) => setFilterPaidToId(e.target.value)}
                                    className="select"
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 'var(--font-size-sm)',
                                        minWidth: '185px',
                                        maxWidth: '240px',
                                        background: 'var(--bg-tertiary)',
                                        border: filterPaidToId !== 'ALL' ? '1px solid #d97706' : '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                    title={isArabic ? 'تصفية حسب المدفوع له (أعضاء الشركة، العمال، أو الموردين)' : 'Filter by Payee (Company Members, Laborers, or Suppliers)'}
                                >
                                    <option value="ALL">
                                        {isArabic ? 'المدفوع له: الكل' : 'Paid to: All'}
                                    </option>

                                    <optgroup label={isArabic ? '⚡ تصفية سريعة' : '⚡ Quick Filter'}>
                                        <option value="ALL_MEMBERS">
                                            {isArabic ? '👥 كل أعضاء الشركة' : '👥 All Company Members'}
                                        </option>
                                        <option value="ALL_WORKMEN">
                                            {isArabic ? '👷 كل العمال ومقاولو الباطن' : '👷 All Labor & Subcontractors'}
                                        </option>
                                        <option value="ALL_SUPPLIERS">
                                            {isArabic ? '🏢 كل الموردين والشركات' : '🏢 All Suppliers & Vendors'}
                                        </option>
                                    </optgroup>

                                    {users.length > 0 && (
                                        <optgroup label={(isArabic ? '👥 أعضاء الشركة' : '👥 Company Members') + ' (' + users.length + ')'}>
                                            {users.map(u => {
                                                const roleKey = (u.role || '').toUpperCase();
                                                const roleName = isArabic 
                                                    ? (t('teamManagement.roles.' + roleKey) || u.role) 
                                                    : (t('teamManagement.roles.' + roleKey, { lng: 'en' }) || u.role);
                                                return (
                                                    <option key={'paid-to-member-' + u.id} value={'MEMBER:' + u.id}>
                                                        {u.name}{roleName ? ' (' + roleName + ')' : ''}
                                                    </option>
                                                );
                                            })}
                                        </optgroup>
                                    )}

                                    {workmen.length > 0 && (
                                        <optgroup label={(isArabic ? '👷 العمال ومقاولو الباطن' : '👷 Labor & Subcontractors') + ' (' + workmen.length + ')'}>
                                            {workmen.map(w => {
                                                const tradeKey = (w.trade || '').toUpperCase();
                                                const tradeName = isArabic 
                                                    ? (t('labor.trades.' + tradeKey) || w.trade) 
                                                    : (t('labor.trades.' + tradeKey, { lng: 'en' }) || w.trade);
                                                return (
                                                    <option key={'paid-to-workman-' + w.id} value={'WORKMAN:' + w.id}>
                                                        {getLocalizedName(w, isArabic)}{tradeName ? ' (' + tradeName + ')' : ''}
                                                    </option>
                                                );
                                            })}
                                        </optgroup>
                                    )}

                                    {suppliers.length > 0 && (
                                        <optgroup label={(isArabic ? '🏢 الموردون والشركات' : '🏢 Suppliers & Vendors') + ' (' + suppliers.length + ')'}>
                                            {suppliers.map(s => {
                                                let catDisplay = '';
                                                if (s.categories && s.categories.length > 0) {
                                                    catDisplay = s.categories.slice(0, 2).map(c => {
                                                        const cKey = (c || '').toUpperCase();
                                                        return isArabic ? (t('suppliers.categories.' + cKey) || c) : (t('suppliers.categories.' + cKey, { lng: 'en' }) || c);
                                                    }).join(', ');
                                                } else if (s.category) {
                                                    const cKey = (s.category || '').toUpperCase();
                                                    catDisplay = isArabic ? (t('suppliers.categories.' + cKey) || s.category) : (t('suppliers.categories.' + cKey, { lng: 'en' }) || s.category);
                                                }
                                                return (
                                                    <option key={'paid-to-supplier-' + s.id} value={'SUPPLIER:' + s.id}>
                                                        {getLocalizedName(s, isArabic)}{catDisplay ? ' (' + catDisplay + ')' : ''}
                                                    </option>
                                                );
                                            })}
                                        </optgroup>
                                    )}
                                </select>
                                {filterPaidToId !== 'ALL' && (
                                    <button
                                        className="btn btn-sm"
                                        onClick={() => setFilterPaidToId('ALL')}
                                        style={{ padding: '4px 6px', fontSize: '0.75rem', height: '28px' }}
                                        title={isArabic ? 'إلغاء تصفية المدفوع له' : 'Clear payee filter'}
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

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

                                /* Sortable Table Headers */
                                .sortable-th {
                                    cursor: pointer;
                                    user-select: none;
                                    transition: background-color 0.15s ease, color 0.15s ease;
                                }
                                .sortable-th:hover {
                                    background: rgba(37, 99, 235, 0.1) !important;
                                    color: var(--color-primary) !important;
                                }
                                .sortable-th:hover .sort-icon-indicator {
                                    opacity: 0.9 !important;
                                    color: var(--color-primary) !important;
                                }
                                .sortable-th.active-sort {
                                    background: rgba(37, 99, 235, 0.08) !important;
                                    color: var(--color-primary) !important;
                                }
                                .sortable-th.active-sort .sort-icon-indicator {
                                    color: var(--color-primary) !important;
                                    opacity: 1 !important;
                                }

                                body.light-mode .sortable-th:hover {
                                    background: #e2d5bd !important;
                                    color: #9a3412 !important;
                                }
                                body.light-mode .sortable-th:hover .sort-icon-indicator {
                                    color: #9a3412 !important;
                                    opacity: 0.95 !important;
                                }
                                body.light-mode .sortable-th.active-sort {
                                    background: #dfcfb2 !important;
                                    color: #9a3412 !important;
                                }
                                body.light-mode .sortable-th.active-sort .sort-icon-indicator {
                                    color: #9a3412 !important;
                                    opacity: 1 !important;
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
                                                {renderSortableHeader('date', t('common.date'), { align: 'start', width: '105px' })}
                                                {renderSortableHeader('project', t('finance.project'), { align: 'start', width: '130px' })}
                                                {renderSortableHeader('category', t('finance.category'), { align: 'start', width: '135px' })}
                                                {renderSortableHeader('description', t('finance.description'), { align: 'start' })}
                                                {renderSortableHeader('payer', t('finance.payerContact') || (isArabic ? 'الدافع / جهة الاتصال' : 'Payer / Contact'), { align: 'start', width: '165px' })}
                                                {renderSortableHeader('paymentMethod', t('finance.paymentMethod') || (isArabic ? 'طريقة الدفع' : 'Payment Method'), { align: 'start', width: '145px' })}
                                                {renderSortableHeader('amount', t('finance.amount'), { align: 'end', width: '130px' })}
                                                {renderSortableHeader('createdBy', t('finance.createdBy') || (isArabic ? 'بواسطة' : 'Created By'), { align: 'start', width: '110px' })}
                                                <th style={{ textAlign: 'center', width: '115px' }}>{t('common.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortTransactionList(pendingTransactions, sortField, sortOrder).map((tx) => (
                                                <tr key={tx.id} className="tx-row" style={{ background: 'hsla(38, 92%, 50%, 0.05)' }}>
                                                    <td style={{ textAlign: 'start', fontWeight: '500', fontSize: '0.82rem' }}>{formatDate(tx.transactionDate)}</td>
                                                    <td style={{ textAlign: 'start' }}>
                                                        {getLocalizedName(tx.project, isArabic) || (tx.isOfficeExpense || !tx.projectId ? (isArabic ? '🏢 مصروفات المقر' : '🏢 Office & HQ') : '-')}
                                                    </td>
                                                    <td style={{ textAlign: 'start', fontWeight: '600' }}>
                                                        {(tx.category === 'OTHER' && tx.description && (tx.description.startsWith('Other - ') || tx.description.startsWith('أخرى - ')))
                                                            ? tx.description.split(':')[0].trim()
                                                            : (t(`finance.categories.${tx.category?.toLowerCase()}`) || tx.category)}
                                                    </td>
                                                    <td style={{ textAlign: 'start', maxWidth: '220px' }} className="truncate" title={cleanTransactionDescription(tx.description)}>{cleanTransactionDescription(tx.description)}</td>
                                                    <td style={{ textAlign: 'start', maxWidth: '165px' }}>
                                                        {renderPayerOrClient(tx)}
                                                    </td>
                                                    <td style={{ textAlign: 'start' }}>
                                                         {renderPaymentMethod(tx.paymentMethod, tx)}
                                                     </td>
                                                     <td style={{ textAlign: 'end', fontWeight: '700', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                                         <div>{fmtCurrency(tx.amount)}</div>
                                                         {Boolean(tx.totalDueAmount && Number(tx.totalDueAmount) !== Number(tx.amount)) && (
                                                             <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'flex-end' }}>
                                                                 {Number(tx.totalDueAmount) > Number(tx.amount) ? (
                                                                     <span style={{
                                                                         fontSize: '0.68rem',
                                                                         fontWeight: 700,
                                                                         padding: '1px 6px',
                                                                         borderRadius: '4px',
                                                                         background: 'rgba(245, 158, 11, 0.15)',
                                                                         color: '#d97706',
                                                                         border: '1px solid rgba(245, 158, 11, 0.3)',
                                                                         display: 'inline-flex',
                                                                         alignItems: 'center',
                                                                         gap: '2px'
                                                                     }} title={isArabic ? `إجمالي المستحق: ${fmtCurrency(tx.totalDueAmount)} | متبقي غير مسوى: ${fmtCurrency(Number(tx.totalDueAmount) - Number(tx.amount))}` : `Total Due: ${fmtCurrency(tx.totalDueAmount)} | Remaining: ${fmtCurrency(Number(tx.totalDueAmount) - Number(tx.amount))}`}>
                                                                         <span>⚠️</span>
                                                                         <span>{isArabic ? `باقي: ${fmtCurrency(Number(tx.totalDueAmount) - Number(tx.amount))}` : `Due: ${fmtCurrency(Number(tx.totalDueAmount) - Number(tx.amount))}`}</span>
                                                                     </span>
                                                                 ) : (
                                                                     <span style={{
                                                                         fontSize: '0.68rem',
                                                                         fontWeight: 700,
                                                                         padding: '1px 6px',
                                                                         borderRadius: '4px',
                                                                         background: 'rgba(59, 130, 246, 0.15)',
                                                                         color: '#2563eb',
                                                                         border: '1px solid rgba(59, 130, 246, 0.3)',
                                                                         display: 'inline-flex',
                                                                         alignItems: 'center',
                                                                         gap: '2px'
                                                                     }} title={isArabic ? `إجمالي المستحق: ${fmtCurrency(tx.totalDueAmount)} | دفعة زائدة: ${fmtCurrency(Number(tx.amount) - Number(tx.totalDueAmount))}` : `Total Due: ${fmtCurrency(tx.totalDueAmount)} | Overpaid: ${fmtCurrency(Number(tx.amount) - Number(tx.totalDueAmount))}`}>
                                                                         <span>ℹ️</span>
                                                                         <span>{isArabic ? `زائد: ${fmtCurrency(Number(tx.amount) - Number(tx.totalDueAmount))}` : `Over: ${fmtCurrency(Number(tx.amount) - Number(tx.totalDueAmount))}`}</span>
                                                                     </span>
                                                                 )}
                                                             </div>
                                                         )}
                                                     </td>
                                                     <td style={{ textAlign: 'start' }}>{getLocalizedName(tx.creator, isArabic) || '-'}</td>
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
                            const groupMap = new Map();
                            const sortedTransactions = sortTransactionList(transactions, sortField, sortOrder);

                            sortedTransactions.forEach((tx) => {
                                const isOffice = Boolean(filterProjectId === 'OFFICE' || tx.isOfficeExpense || !tx.projectId || !tx.project);
                                const groupKey = isOffice ? '__OFFICE__' : (tx.project?.id || tx.project?.name || '__UNASSIGNED__');

                                if (!groupMap.has(groupKey)) {
                                    let displayName;
                                    if (isOffice) {
                                        displayName = isArabic ? 'المقر الرئيسي والمكتب (أرباح ومصروفات)' : 'Headquarters & Office Finances';
                                    } else if (tx.project) {
                                        displayName = getLocalizedName(tx.project, isArabic);
                                    } else {
                                        displayName = t('common.unassigned') || (isArabic ? 'غير محدد' : 'Unassigned');
                                    }

                                    groupMap.set(groupKey, {
                                        groupKey,
                                        isOffice,
                                        project: tx.project || null,
                                        displayName,
                                        txs: []
                                    });
                                }

                                groupMap.get(groupKey).txs.push(tx);
                            });

                            return Array.from(groupMap.values()).map((group) => {
                                const { groupKey, isOffice, project, displayName, txs } = group;
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
                                    } else if (isOffice) {
                                        // Office HQ logic: Recognized management fees and direct incomes are (+), office expenses are (-)
                                        if (tx.category === 'MANAGEMENT_FEE_TRANSFER' || tx.type === 'INCOME') {
                                            return sum + Number(tx.amount || 0);
                                        } else {
                                            return sum - Number(tx.amount || 0);
                                        }
                                    } else {
                                        // Standard project logic
                                        return sum + (tx.type === 'INCOME' ? Number(tx.amount) : -Number(tx.amount));
                                    }
                                }, 0);

                                return (
                                    <div key={groupKey} className="project-group" style={{ overflow: 'hidden' }}>
                                        <div className="project-header">
                                            <h3 className="project-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {isOffice ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                        <Building2 size={18} style={{ color: 'var(--color-primary)' }} />
                                                        <span>{displayName}</span>
                                                    </span>
                                                ) : project?.id ? (
                                                    <Link
                                                        to={`/projects/${project.id}`}
                                                        style={{
                                                            color: 'var(--color-primary)',
                                                            textDecoration: 'none',
                                                            borderBottom: '1px dashed var(--color-primary)',
                                                            paddingBottom: 2
                                                        }}
                                                        title={`Go to project: ${displayName}`}
                                                    >
                                                        {displayName}
                                                    </Link>
                                                ) : (
                                                    displayName
                                                )}
                                            </h3>
                                            <div className="project-summary">
                                                {filterType === 'MY_LEDGER'
                                                    ? (t('finance.myNetCustody') || 'صافي العهدة')
                                                    : filterType === 'COMPANY_SHARE'
                                                    ? (t('finance.totalCompanyShare') || (isArabic ? 'إجمالي أرباح المكتب' : 'Total Office Profit'))
                                                    : isOffice
                                                    ? (isArabic ? 'صافي أرباح وإيرادات المقر' : 'Net HQ Profit & Income')
                                                    : (t('finance.projectNet') || 'صافي المشروع')}:
                                                <span className={`project-net-val ${totalAmount >= 0 ? 'positive' : 'negative'}`}>
                                                    {totalAmount < 0 ? '- ' : '+ '}{fmtCurrency(Math.abs(totalAmount))}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ overflowX: 'auto', width: '100%' }}>
                                            <table className="transaction-table">
                                                <thead>
                                                    <tr>
                                                        {renderSortableHeader('date', t('common.date'), { align: 'start', width: '105px' })}
                                                        {renderSortableHeader('type', t('common.type'), { align: 'center', width: '92px' })}
                                                        {renderSortableHeader('category', t('finance.category'), { align: 'start', width: '135px' })}
                                                        {renderSortableHeader('description', t('finance.description'), { align: 'start' })}
                                                        {renderSortableHeader('payer', t('finance.payerContact') || (isArabic ? 'الدافع / جهة الاتصال' : 'Payer / Contact'), { align: 'start', width: '165px' })}
                                                        {renderSortableHeader('paymentMethod', t('finance.paymentMethod') || (isArabic ? 'طريقة الدفع' : 'Payment Method'), { align: 'start', width: '145px' })}
                                                        {renderSortableHeader('amount', t('finance.amount'), { align: 'end', width: '130px' })}
                                                        {renderSortableHeader('status', t('common.status'), { align: 'center', width: '95px' })}
                                                        <th style={{ textAlign: 'center', width: '80px' }}>{t('common.actions')}</th>
                                                    </tr>
                                                </thead>
                                                 <tbody>
                                                    {(() => {
                                                        const displayTxs = organizeTransactionsWithFees(txs, filterType === 'ALL');
                                                        return displayTxs.map((tx) => {
                                                            const isCancelled = tx.status === 'CANCELLED';
                                                            const hasNestedFees = tx.nestedFees && tx.nestedFees.length > 0;
                                                            const catLabel = (tx.category === 'OTHER' && tx.description && (tx.description.startsWith('Other - ') || tx.description.startsWith('أخرى - ')))
                                                                ? tx.description.split(':')[0].trim()
                                                                : (t(`finance.categories.${tx.category?.toLowerCase()}`) || tx.category || '');
                                                            const cleanDesc = cleanTransactionDescription(tx.description);
                                                    const isDescDuplicate = !cleanDesc || cleanDesc.trim().toLowerCase() === catLabel.trim().toLowerCase();

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
                                                                                <span className="badge-type-pill profit" title={isArabic ? 'أرباح مستحقة للمقر' : 'HQ Profit'}>
                                                                                    {isArabic ? (isOffice ? 'إيراد أرباح' : 'أرباح مكتب') : 'PROFIT'}
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
                                                                                {tx.category === 'MANAGEMENT_FEE_TRANSFER' ? (() => {
                                                                                    const feePct = getFeePercent(tx);
                                                                                    return isArabic ? `أتعاب كوست بلس (+${feePct}%)` : `Cost-Plus Fee (+${feePct}%)`;
                                                                                })() : catLabel}
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
                                                                                {hasNestedFees && (() => {
                                                                                    const feePct = getFeePercent(tx, tx.nestedFees?.[0]);
                                                                                    return (
                                                                                        <span className="fee-included-tag" title={isArabic ? `يتضمن أتعاب إدارة كوست بلس (+${feePct}%)` : `Includes Cost-Plus Fee (+${feePct}%)`}>
                                                                                            {isArabic ? `+${feePct}% أتعاب` : `+${feePct}% Fee`}
                                                                                        </span>
                                                                                    );
                                                                                })()}
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
                                                                            <span className={`tx-amount ${(tx.type === 'INCOME' || (isOffice && tx.category === 'MANAGEMENT_FEE_TRANSFER')) ? 'income' : 'expense'}`}>
                                                                                {(tx.type === 'INCOME' || (isOffice && tx.category === 'MANAGEMENT_FEE_TRANSFER')) ? '+ ' : ''}{fmtCurrency(tx.amount)}
                                                                            </span>
                                                                            {Boolean(tx.totalDueAmount && Number(tx.totalDueAmount) !== Number(tx.amount)) && (
                                                                                <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'flex-end' }}>
                                                                                    {Number(tx.totalDueAmount) > Number(tx.amount) ? (
                                                                                        <span style={{
                                                                                            fontSize: '0.68rem',
                                                                                            fontWeight: 700,
                                                                                            padding: '1px 6px',
                                                                                            borderRadius: '4px',
                                                                                            background: 'rgba(245, 158, 11, 0.15)',
                                                                                            color: '#d97706',
                                                                                            border: '1px solid rgba(245, 158, 11, 0.3)',
                                                                                            display: 'inline-flex',
                                                                                            alignItems: 'center',
                                                                                            gap: '2px'
                                                                                        }} title={isArabic ? `إجمالي المستحق: ${fmtCurrency(tx.totalDueAmount)} | متبقي غير مسوى: ${fmtCurrency(Number(tx.totalDueAmount) - Number(tx.amount))}` : `Total Due: ${fmtCurrency(tx.totalDueAmount)} | Remaining: ${fmtCurrency(Number(tx.totalDueAmount) - Number(tx.amount))}`}>
                                                                                            <span>⚠️</span>
                                                                                            <span>{isArabic ? `باقي: ${fmtCurrency(Number(tx.totalDueAmount) - Number(tx.amount))}` : `Due: ${fmtCurrency(Number(tx.totalDueAmount) - Number(tx.amount))}`}</span>
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span style={{
                                                                                            fontSize: '0.68rem',
                                                                                            fontWeight: 700,
                                                                                            padding: '1px 6px',
                                                                                            borderRadius: '4px',
                                                                                            background: 'rgba(59, 130, 246, 0.15)',
                                                                                            color: '#2563eb',
                                                                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                                                                            display: 'inline-flex',
                                                                                            alignItems: 'center',
                                                                                            gap: '2px'
                                                                                        }} title={isArabic ? `إجمالي المستحق: ${fmtCurrency(tx.totalDueAmount)} | دفعة زائدة: ${fmtCurrency(Number(tx.amount) - Number(tx.totalDueAmount))}` : `Total Due: ${fmtCurrency(tx.totalDueAmount)} | Overpaid: ${fmtCurrency(Number(tx.amount) - Number(tx.totalDueAmount))}`}>
                                                                                            <span>ℹ️</span>
                                                                                            <span>{isArabic ? `زائد: ${fmtCurrency(Number(tx.amount) - Number(tx.totalDueAmount))}` : `Over: ${fmtCurrency(Number(tx.amount) - Number(tx.totalDueAmount))}`}</span>
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </td>

                                                                        {/* 8. Status */}
                                                                        <td style={{ textAlign: 'center' }}>
                                                                            <span className={`badge ${tx.status === 'APPROVED' ? 'badge-success' : tx.status === 'PENDING_APPROVAL' ? 'badge-warning' : 'badge-secondary'}`} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px' }}>
                                                                                {t(`finance.status.${tx.status}`) || (tx.status === 'CANCELLED' ? (isArabic ? 'مسترد' : 'Refunded') : tx.status)}
                                                                            </span>
                                                                        </td>

                                                                        {/* 9. Actions */}
                                                                        <td style={{ textAlign: 'center', width: '80px' }}>
                                                                            <TransactionActionsMenu
                                                                                tx={tx}
                                                                                isCancelled={isCancelled}
                                                                                onOpenDetail={handleOpenDetail}
                                                                                onEdit={openEditModal}
                                                                                onRefund={handleRefundClick}
                                                                                onDelete={handleDeleteClick}
                                                                                isArabic={isArabic}
                                                                                t={t}
                                                                            />
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
                                                                                    <span style={{ opacity: 0.55, marginInlineEnd: '4px', display: 'inline-block', transform: isArabic ? 'scaleX(-1)' : 'none' }}>↳</span>
                                                                                    {(() => {
                                                                                        const feePct = getFeePercent(tx, feeTx);
                                                                                        return isArabic ? `أتعاب كوست بلس (+${feePct}%)` : `Cost-Plus Fee (+${feePct}%)`;
                                                                                    })()}
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
                                                                                <td style={{ textAlign: 'center', width: '80px' }}>
                                                                                    <TransactionActionsMenu
                                                                                        tx={feeTx}
                                                                                        isCancelled={isFeeCancelled}
                                                                                        onOpenDetail={handleOpenDetail}
                                                                                        onEdit={openEditModal}
                                                                                        onRefund={handleRefundClick}
                                                                                        onDelete={handleDeleteClick}
                                                                                        isArabic={isArabic}
                                                                                        t={t}
                                                                                        size="small"
                                                                                    />
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
