import prisma from '../lib/prisma.js';
import { generateFinancialReportPdf } from '../lib/reportPdf.js';
import { ARABIC_CATEGORIES } from '../constants/arabicCategories.js';

// Category dictionary lookup
const catLookup = {};
ARABIC_CATEGORIES.forEach(c => {
    catLookup[c.key] = c;
    catLookup[c.key.toLowerCase()] = c;
});

/**
 * @desc    Generate and stream an Executive Financial Report PDF
 * @route   GET /api/reports/financial-pdf
 * @access  Private (Authenticated tenant users)
 */
export const getFinancialReportPdf = async (req, res, next) => {
    try {
        const tenantId = req.user.tenantId;
        const { projectId, dateRange, lang } = req.query;
        const isArabic = lang ? lang.startsWith('ar') : true;

        // 1. Fetch Tenant & User Details
        const [tenant, projects, transactions] = await Promise.all([
            prisma.tenant.findUnique({ where: { id: tenantId } }),
            prisma.project.findMany({
                where: { tenantId },
                orderBy: { name: 'asc' }
            }),
            prisma.transaction.findMany({
                where: {
                    tenantId,
                    status: 'APPROVED'
                }
            })
        ]);

        // Resolve branding
        let companyName = tenant?.name;
        if (!companyName || companyName === 'Demo Construction Co.') {
            if (req.user?.company && req.user.company !== 'Demo Construction Co.') {
                companyName = req.user.company;
            }
        }
        companyName = companyName || req.user?.company || 'Hesaby ERP';
        const companyLogo = tenant?.logo || req.user?.companyLogo || null;

        // 2. Filter Transactions based on Project and Date Range
        const selectedProj = (projectId && projectId !== 'ALL') ? projects.find(p => p.id === projectId) : null;

        const filteredTx = transactions.filter(t => {
            if (selectedProj && t.projectId !== selectedProj.id) return false;

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

        // 3. Compute Executive Financial KPIs
        const approvedIncomes = filteredTx
            .filter(t => t.type === 'INCOME' || t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const approvedExpenses = filteredTx
            .filter(t => (t.type === 'EXPENSE' || t.type === 'expense') && t.category !== 'MANAGEMENT_FEE_TRANSFER')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const totalProfitRecognized = filteredTx
            .filter(t => t.category === 'MANAGEMENT_FEE_TRANSFER')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const netBalance = approvedIncomes - approvedExpenses - totalProfitRecognized;

        // 4. Expenses by Category Data
        const categoryMap = {};
        filteredTx
            .filter(t => (t.type === 'EXPENSE' || t.type === 'expense') && t.category !== 'MANAGEMENT_FEE_TRANSFER')
            .forEach(t => {
                const cat = t.category || 'OTHER';
                categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount || 0);
            });

        const categoryData = Object.entries(categoryMap).map(([rawKey, val]) => {
            const entry = catLookup[rawKey] || catLookup[rawKey.toLowerCase()];
            let label = rawKey;
            if (entry) {
                label = isArabic ? entry.ar : entry.en;
            } else {
                label = rawKey.replace(/_/g, ' ');
            }
            const pct = approvedExpenses > 0 ? ((val / approvedExpenses) * 100).toFixed(1) + '%' : '0.0%';
            return {
                name: label,
                value: val,
                pct
            };
        }).sort((a, b) => b.value - a.value);

        // 5. Project Performance Breakdown Table
        const targetProjects = selectedProj ? [selectedProj] : projects;
        const projectBreakdown = targetProjects.map(p => {
            const pTx = transactions.filter(t => t.projectId === p.id);
            const pIncome = pTx.filter(t => t.type === 'INCOME' || t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
            const pSpent = pTx.filter(t => (t.type === 'EXPENSE' || t.type === 'expense') && t.category !== 'MANAGEMENT_FEE_TRANSFER').reduce((s, t) => s + Number(t.amount || 0), 0);
            const pProfit = pTx.filter(t => t.category === 'MANAGEMENT_FEE_TRANSFER').reduce((s, t) => s + Number(t.amount || 0), 0);
            const pSafe = p.projectSafeBalance != null ? Number(p.projectSafeBalance) : (pIncome - pSpent - pProfit);
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

        // 6. Scope metadata
        const scopeProjectName = selectedProj
            ? selectedProj.name
            : (isArabic ? 'كافة المشاريع' : 'All Projects');

        const scopeDateLabel = dateRange === 'THIS_MONTH'
            ? (isArabic ? 'هذا الشهر' : 'This Month')
            : dateRange === 'THIS_YEAR'
            ? (isArabic ? 'هذا العام' : 'This Year')
            : (isArabic ? 'كل الفترات' : 'All Time');

        // 7. Generate PDF
        const buffer = await generateFinancialReportPdf({
            tenant: {
                ...tenant,
                name: companyName,
                logo: companyLogo,
                email: tenant?.email || req.user?.email || '',
                phone: tenant?.phone || req.user?.phone || '',
                address: tenant?.address || ''
            },
            user: {
                name: req.user?.name,
                email: req.user?.email,
                role: req.user?.role
            },
            scope: {
                projectName: scopeProjectName,
                dateRangeLabel: scopeDateLabel,
                isAllProjects: !selectedProj
            },
            kpis: {
                approvedIncomes,
                approvedExpenses,
                totalProfitRecognized,
                netBalance
            },
            categoryData,
            projectBreakdown,
            isArabic
        });

        const dateSlug = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="hesaby-financial-report-${dateSlug}.pdf"`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};
