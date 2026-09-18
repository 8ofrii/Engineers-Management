import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { transactionsAPI, projectsAPI, clientsAPI } from '../services/api';
import { 
    FileText, Download, TrendingUp, TrendingDown, DollarSign, 
    Briefcase, PieChart as PieIcon, BarChart3, Filter, Printer, Calendar
} from 'lucide-react';
import { 
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import { useFormat } from '../utils/format';
import { apiErrorMessage } from '../utils/apiError';
import { exportToXLSX } from '../utils/excelExport';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#64748b'];

export default function Reports() {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { showAlert } = useAlert();
    const { currency: formatCurrency } = useFormat();

    const [transactions, setTransactions] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('ALL');
    const [dateRange, setDateRange] = useState('ALL'); // ALL | THIS_MONTH | THIS_YEAR
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [txRes, projRes] = await Promise.all([
                transactionsAPI.getAll(),
                projectsAPI.getAll()
            ]);
            setTransactions(txRes.data?.data || []);
            setProjects(projRes.data?.data || []);
        } catch (error) {
            console.error('Failed to load report data:', error);
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: apiErrorMessage(error, 'Failed to load report data.') });
        } finally {
            setLoading(false);
        }
    };

    // Filter transactions based on selection
    const filteredTransactions = transactions.filter(t => {
        if (selectedProjectId !== 'ALL' && t.projectId !== selectedProjectId) return false;

        if (dateRange === 'THIS_MONTH') {
            const txDate = new Date(t.transactionDate || t.createdAt);
            const now = new Date();
            if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateRange === 'THIS_YEAR') {
            const txDate = new Date(t.transactionDate || t.createdAt);
            const now = new Date();
            if (txDate.getFullYear() !== now.getFullYear()) return false;
        }

        return true;
    });

    // KPI Calculations
    const approvedIncomes = filteredTransactions
        .filter(t => (t.type === 'INCOME' || t.type === 'income') && (t.status === 'APPROVED' || !t.status))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const approvedExpenses = filteredTransactions
        .filter(t => (t.type === 'EXPENSE' || t.type === 'expense') && (t.status === 'APPROVED' || !t.status))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const netBalance = approvedIncomes - approvedExpenses;

    // Management Fee Profit recognized
    const totalProfitRecognized = filteredTransactions
        .filter(t => t.category === 'MANAGEMENT_FEE_TRANSFER')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Expenses by Category Data for Pie & Bar Charts
    const categoryMap = {};
    filteredTransactions
        .filter(t => (t.type === 'EXPENSE' || t.type === 'expense') && t.category !== 'MANAGEMENT_FEE_TRANSFER')
        .forEach(t => {
            const cat = t.category || 'OTHER';
            categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount || 0);
        });

    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value
    })).sort((a, b) => b.value - a.value);

    // Monthly Cash Flow Data
    const monthlyCashFlowMap = {};
    filteredTransactions.forEach(t => {
        const d = new Date(t.transactionDate || t.createdAt);
        const monthKey = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        if (!monthlyCashFlowMap[monthKey]) {
            monthlyCashFlowMap[monthKey] = { month: monthKey, Income: 0, Expense: 0 };
        }
        if (t.type === 'INCOME') monthlyCashFlowMap[monthKey].Income += Number(t.amount || 0);
        if (t.type === 'EXPENSE') monthlyCashFlowMap[monthKey].Expense += Number(t.amount || 0);
    });
    const cashFlowData = Object.values(monthlyCashFlowMap);

    // Project Performance Breakdown Table
    const projectBreakdown = projects.map(p => {
        const pTx = transactions.filter(t => t.projectId === p.id && t.status === 'APPROVED');
        const pIncome = pTx.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0);
        const pSpent = pTx.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0);
        const pSafe = Number(p.projectSafeBalance || (pIncome - pSpent));
        const pProfit = Number(p.officeRevenue || 0);
        const budget = Number(p.budget || 0);
        const burnRate = budget > 0 ? ((pSpent / budget) * 100).toFixed(1) : '0.0';

        return {
            id: p.id,
            name: p.name,
            budget,
            income: pIncome,
            spent: pSpent,
            safe: pSafe,
            profit: pProfit,
            burnRate
        };
    });

    const handleExportXLSX = () => {
        const projectName = selectedProjectId === 'ALL'
            ? (isArabic ? 'جميع المشاريع' : 'All Projects')
            : projects.find(p => p.id === selectedProjectId)?.name || selectedProjectId;

        // Sheet 1: Executive Summary & KPIs
        const summaryRows = [
            [isArabic ? 'حسابي ERP — التقرير المالي التنفيذي' : 'Hesaby ERP — Executive Financial Report'],
            [isArabic ? 'تاريخ التقرير:' : 'Generated At:', new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US')],
            [isArabic ? 'المشروع المحدد:' : 'Project Filter:', projectName],
            [],
            [isArabic ? 'المؤشر المالي' : 'Financial KPI', isArabic ? 'المبلغ (جنيه مصري)' : 'Amount (EGP)'],
            [isArabic ? 'إجمالي الإيرادات المحصلة' : 'Total Collected Income', Number(approvedIncomes.toFixed(2))],
            [isArabic ? 'إجمالي مصروفات المواقع' : 'Total Site Expenses', Number(approvedExpenses.toFixed(2))],
            [isArabic ? 'صافي السيولة النقدية' : 'Net Operational Cash', Number(netBalance.toFixed(2))],
            [isArabic ? 'أرباح المكتب' : 'Office Profit', Number(totalProfitRecognized.toFixed(2))],
        ];

        // Sheet 2: Project Breakdown
        const breakdownRows = [
            [
                isArabic ? 'اسم المشروع' : 'Project Name',
                isArabic ? 'الميزانية التقديرية' : 'Budget',
                isArabic ? 'إجمالي المقبوضات' : 'Total Income',
                isArabic ? 'المصروف الفعلي' : 'Actual Spent',
                isArabic ? 'رصيد العهدة/الخزينة' : 'Safe Balance',
                isArabic ? 'أرباح المكتب' : 'Office Profit',
                isArabic ? 'نسبة استهلاك الميزانية' : 'Budget Burn Rate %'
            ]
        ];

        projectBreakdown.forEach(p => {
            breakdownRows.push([
                p.name,
                p.budget,
                p.income,
                p.spent,
                p.safe,
                p.profit,
                `${p.burnRate}%`
            ]);
        });

        // Sheet 3: Expenses by Category
        const categoryRows = [
            [
                isArabic ? 'بند التكلفة / التصنيف' : 'Expense Category',
                isArabic ? 'إجمالي المصروف (جنيه)' : 'Total Spent (EGP)',
                isArabic ? 'النسبة من الإجمالي' : 'Share of Total %'
            ]
        ];

        categoryData.forEach(c => {
            const catName = isArabic
                ? (t(`finance.categories.${c.name.toLowerCase().replace(/ /g, '_')}`) || c.name)
                : (c.name);
            const pct = approvedExpenses > 0 ? ((c.value / approvedExpenses) * 100).toFixed(1) : '0.0';
            categoryRows.push([catName, Number(c.value.toFixed(2)), `${pct}%`]);
        });

        exportToXLSX({
            filename: `hesaby-financial-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
            sheets: [
                { sheetName: isArabic ? 'الملخص التنفيذي' : 'Executive Summary', data: summaryRows },
                { sheetName: isArabic ? 'تفاصيل المشاريع' : 'Project Breakdown', data: breakdownRows },
                { sheetName: isArabic ? 'توزيع المصروفات' : 'Expense Categories', data: categoryRows }
            ],
            isRTL: isArabic
        });
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex-center" style={{ minHeight: '60vh' }}>
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="reports-page">
                {/* Header with quick filters and export */}
                <div className="flex-between mb-xl" style={{ flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 className="flex gap-md" style={{ margin: 0 }}>
                            <FileText size={32} />
                            {isArabic ? 'التقارير المالية والتحليلات' : 'Financial Reports & Analytics'}
                        </h1>
                        <p className="text-secondary" style={{ marginTop: 4 }}>
                            {isArabic ? 'تحليل شامل للتدفقات النقدية، المصروفات، وأرباح المشاريع' : 'Comprehensive breakdown of project cashflow, spending distribution, and profit realization.'}
                        </p>
                    </div>

                    <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={() => window.print()}>
                            <Printer size={16} /> {isArabic ? 'طباعة' : 'Print'}
                        </button>
                        <button className="btn btn-primary" onClick={handleExportXLSX}>
                            <Download size={16} /> {isArabic ? 'تصدير إكسيل (XLSX)' : 'Export Excel (XLSX)'}
                        </button>
                    </div>
                </div>

                {/* Filters Ribbon */}
                <div className="card mb-xl" style={{ padding: '16px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                    <div className="flex gap-md" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="flex items-center gap-xs text-secondary" style={{ fontWeight: 600 }}>
                            <Filter size={18} /> {isArabic ? 'تصفية حسب:' : 'Filter by:'}
                        </div>

                        <div style={{ flex: '1 1 220px' }}>
                            <select
                                className="input"
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                style={{ width: '100%' }}
                            >
                                <option value="ALL">{isArabic ? '📂 جميع المشاريع' : '📂 All Projects'}</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ flex: '0 1 180px' }}>
                            <select
                                className="input"
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                style={{ width: '100%' }}
                            >
                                <option value="ALL">{isArabic ? '🗓️ كل الفترات' : '🗓️ All Time'}</option>
                                <option value="THIS_MONTH">{isArabic ? 'هذا الشهر' : 'This Month'}</option>
                                <option value="THIS_YEAR">{isArabic ? 'هذا العام' : 'This Year'}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Top Executive KPI Cards */}
                <div className="grid grid-4 gap-md mb-xl">
                    <div className="card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
                        <div className="flex-between text-secondary mb-xs">
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{isArabic ? 'إجمالي المقبوضات' : 'Total Incomes'}</span>
                            <TrendingUp size={20} style={{ color: '#10b981' }} />
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                            {formatCurrency(approvedIncomes)}
                        </div>
                        <div className="text-secondary text-xs mt-xs">{isArabic ? 'الدفعات المحصلة من العملاء' : 'Collected client disbursements'}</div>
                    </div>

                    <div className="card" style={{ padding: '20px', borderLeft: '4px solid #ef4444' }}>
                        <div className="flex-between text-secondary mb-xs">
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{isArabic ? 'إجمالي المصروفات' : 'Total Expenses'}</span>
                            <TrendingDown size={20} style={{ color: '#ef4444' }} />
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                            {formatCurrency(approvedExpenses)}
                        </div>
                        <div className="text-secondary text-xs mt-xs">{isArabic ? 'الخامات، المصنعيات والمقاولين' : 'Site materials, labor & services'}</div>
                    </div>

                    <div className="card" style={{ padding: '20px', borderLeft: '4px solid #3b82f6' }}>
                        <div className="flex-between text-secondary mb-xs">
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{isArabic ? 'رصيد الخزينة التشغيلية' : 'Net Operational Cash'}</span>
                            <DollarSign size={20} style={{ color: '#3b82f6' }} />
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: netBalance >= 0 ? '#10b981' : '#ef4444' }}>
                            {formatCurrency(netBalance)}
                        </div>
                        <div className="text-secondary text-xs mt-xs">{isArabic ? 'السيولة المتاحة في المواقع' : 'Available working capital'}</div>
                    </div>

                    <div className="card" style={{ padding: '20px', borderLeft: '4px solid #8b5cf6' }}>
                        <div className="flex-between text-secondary mb-xs">
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{isArabic ? 'أرباح المكتب' : 'Office Profit'}</span>
                            <Briefcase size={20} style={{ color: '#8b5cf6' }} />
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#8b5cf6' }}>
                            {formatCurrency(totalProfitRecognized)}
                        </div>
                        <div className="text-secondary text-xs mt-xs">{isArabic ? 'نسبة الإدارة (Cost-Plus)' : 'Management fees & earnings'}</div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-2 gap-lg mb-xl">
                    {/* Monthly Cashflow Bar Chart */}
                    <div className="card" style={{ padding: 20 }}>
                        <div className="flex items-center gap-sm mb-md">
                            <BarChart3 size={20} className="text-primary" />
                            <h3 style={{ margin: 0, fontSize: 16 }}>{isArabic ? 'التدفقات النقدية الشهرية' : 'Monthly Cash Flow'}</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={cashFlowData.length > 0 ? cashFlowData : [{ month: 'Current', Income: approvedIncomes, Expense: approvedExpenses }]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="month" stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" />
                                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
                                <Legend />
                                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Expense Breakdown by Category */}
                    <div className="card" style={{ padding: 20 }}>
                        <div className="flex items-center gap-sm mb-md">
                            <PieIcon size={20} className="text-primary" />
                            <h3 style={{ margin: 0, fontSize: 16 }}>{isArabic ? 'توزيع المصروفات حسب البند' : 'Expense Distribution by Category'}</h3>
                        </div>
                        {categoryData.length === 0 ? (
                            <div className="flex-center text-secondary" style={{ height: 280 }}>
                                {isArabic ? 'لا توجد مصروفات مسجلة' : 'No expenses recorded in this period'}
                            </div>
                        ) : (
                            <div className="grid grid-2" style={{ alignItems: 'center' }}>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={2}>
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ maxHeight: 250, overflowY: 'auto', paddingRight: 8 }}>
                                    {categoryData.map((cat, idx) => (
                                        <div key={idx} className="flex-between py-xs" style={{ borderBottom: '1px solid var(--border-color)', fontSize: 12 }}>
                                            <div className="flex items-center gap-xs">
                                                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></div>
                                                <span style={{ fontWeight: 600 }}>{cat.name}</span>
                                            </div>
                                            <strong>{formatCurrency(cat.value)}</strong>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Project Financial Performance Table */}
                <div className="card" style={{ padding: 20 }}>
                    <div className="flex-between mb-md">
                        <div className="flex items-center gap-sm">
                            <Briefcase size={20} className="text-primary" />
                            <h3 style={{ margin: 0, fontSize: 16 }}>{isArabic ? 'بيان الموقف المالي للمشاريع' : 'Project Financial Performance Table'}</h3>
                        </div>
                        <span className="text-secondary text-xs">{projectBreakdown.length} {isArabic ? 'مشاريع' : 'Projects'}</span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px 8px' }}>{isArabic ? 'المشروع' : 'Project Name'}</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>{isArabic ? 'الميزانية' : 'Budget'}</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>{isArabic ? 'المقبوضات' : 'Income'}</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>{isArabic ? 'المصروف الفعلي' : 'Spent'}</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>{isArabic ? 'رصيد الخزينة' : 'Safe Balance'}</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>{isArabic ? 'أرباح المكتب' : 'Office Profit'}</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'center' }}>{isArabic ? 'نسبة الاستهلاك' : 'Burn Rate'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projectBreakdown.map((p) => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px 8px', fontWeight: 700 }}>{p.name}</td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>{formatCurrency(p.budget)}</td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{formatCurrency(p.income)}</td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>{formatCurrency(p.spent)}</td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: p.safe >= 0 ? 'var(--text-primary)' : '#ef4444' }}>
                                            {formatCurrency(p.safe)}
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right', color: '#8b5cf6', fontWeight: 600 }}>{formatCurrency(p.profit)}</td>
                                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: 6,
                                                background: Number(p.burnRate) > 90 ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-tertiary)',
                                                color: Number(p.burnRate) > 90 ? '#ef4444' : 'var(--text-primary)',
                                                fontWeight: 700, fontSize: 12
                                            }}>
                                                {p.burnRate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

