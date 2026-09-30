import prisma from '../lib/prisma.js';
import { auditFromReq } from '../lib/audit.js';
import { getPlan } from '../lib/plans.js';
import { syncClientStatus } from './clientController.js';

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res, next) => {
    try {
        // Enforce Tenant Isolation + hide soft-deleted
        const whereClause = {
            tenantId: req.user.tenantId,
            deletedAt: null
        };

        // If Engineer, show only assigned projects?
        // Or all company projects? Usually Engineeers see only theirs.
        // Let's keep logic: if ENGINEER, see only own projects.
        // If ADMIN/Manager, see all tenant projects.
        if (req.user.role === 'ENGINEER') {
            whereClause.engineerId = req.user.id;
        }

        const projects = await prisma.project.findMany({
            where: whereClause,
            include: {
                client: true,
                engineer: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Reconcile project ledger metrics to guarantee 100% mathematical accuracy across ERP
        const txAggregates = await prisma.transaction.groupBy({
            by: ['projectId', 'type', 'category'],
            where: {
                tenantId: req.user.tenantId,
                status: 'APPROVED',
                projectId: { not: null }
            },
            _sum: {
                amount: true
            }
        });

        const projectLedgerMap = {};
        txAggregates.forEach(agg => {
            if (!agg.projectId) return;
            if (!projectLedgerMap[agg.projectId]) {
                projectLedgerMap[agg.projectId] = { siteCost: 0, profit: 0, income: 0, hasTx: true };
            }
            const amt = Number(agg._sum.amount || 0);
            if (agg.type === 'INCOME') {
                projectLedgerMap[agg.projectId].income += amt;
            } else if (agg.type === 'EXPENSE') {
                if (agg.category === 'MANAGEMENT_FEE_TRANSFER') {
                    projectLedgerMap[agg.projectId].profit += amt;
                } else {
                    projectLedgerMap[agg.projectId].siteCost += amt;
                }
            }
        });

        const reconciledProjects = projects.map(p => {
            const ledger = projectLedgerMap[p.id];
            if (ledger && ledger.hasTx) {
                const officeProfit = ledger.profit || ((ledger.siteCost * Number(p.managementFeePercent || 0)) / 100);
                // Project safe balance represents net available funds: Total Income - (Total Site Expenses + Office Profit)
                const safeBal = ledger.income - (ledger.siteCost + officeProfit);
                p.actualCost = ledger.siteCost;
                p.officeRevenue = officeProfit;
                p.projectSafeBalance = safeBal;

                p.totalPaid = ledger.income;

                // If project is still in progress but completionPercent was set to 100%, dynamically calculate it from executed budget
                if (p.status === 'IN_PROGRESS' && p.completionPercent === 100) {
                    const totalContract = Number(p.totalContractValue || p.budget || 0);
                    p.completionPercent = totalContract > 0
                        ? Math.min(99, Math.round(((p.actualCost + p.officeRevenue) / totalContract) * 100))
                        : 0;
                }
            } else {
                p.totalPaid = 0;
                p.actualCost = 0;
                p.officeRevenue = 0;
                p.projectSafeBalance = 0;
            }
            return p;
        });

        res.status(200).json({
            success: true,
            count: reconciledProjects.length,
            data: reconciledProjects
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
export const getProject = async (req, res, next) => {
    try {
        // Use findFirst to enforce tenantId check alongside ID
        const project = await prisma.project.findFirst({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId,
                deletedAt: null
            },
            include: {
                client: true,
                engineer: true,
                notes: true
            }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check ownership (Engineer specific)
        if (req.user.role === 'ENGINEER' && project.engineerId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this project'
            });
        }

        // Reconcile single project ledger metrics
        const pAggs = await prisma.transaction.groupBy({
            by: ['type', 'category'],
            where: {
                projectId: project.id,
                tenantId: req.user.tenantId,
                status: 'APPROVED'
            },
            _sum: {
                amount: true
            }
        });

        if (pAggs.length > 0) {
            let siteCost = 0;
            let profit = 0;
            let income = 0;
            pAggs.forEach(agg => {
                const amt = Number(agg._sum.amount || 0);
                if (agg.type === 'INCOME') {
                    income += amt;
                } else if (agg.type === 'EXPENSE') {
                    if (agg.category === 'MANAGEMENT_FEE_TRANSFER') {
                        profit += amt;
                    } else {
                        siteCost += amt;
                    }
                }
            });
            project.actualCost = siteCost;
            const officeProfit = profit || ((siteCost * Number(project.managementFeePercent || 0)) / 100);
            project.officeRevenue = officeProfit;
            project.projectSafeBalance = income - (siteCost + officeProfit);
            project.totalPaid = income;

            if (project.status === 'IN_PROGRESS' && project.completionPercent === 100) {
                const totalContract = Number(project.totalContractValue || project.budget || 0);
                project.completionPercent = totalContract > 0
                    ? Math.min(99, Math.round(((project.actualCost + project.officeRevenue) / totalContract) * 100))
                    : 0;
            }
        } else {
            project.totalPaid = 0;
            project.actualCost = 0;
            project.officeRevenue = 0;
            project.projectSafeBalance = 0;
        }

        res.status(200).json({
            success: true,
            data: project
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Private
export const createProject = async (req, res, next) => {
    try {
        // Enforce Plan Capacity Limits
        const [sub, tenant, activeProjectCount] = await Promise.all([
            prisma.subscription.findFirst({
                where: { tenantId: req.user.tenantId, status: 'ACTIVE' },
                select: { plan: true }
            }),
            prisma.tenant.findUnique({
                where: { id: req.user.tenantId },
                select: { subscriptionPlan: true }
            }),
            prisma.project.count({
                where: { tenantId: req.user.tenantId, deletedAt: null }
            })
        ]);

        const planKey = sub?.plan || tenant?.subscriptionPlan || 'FREE';
        const plan = getPlan(planKey);
        if (plan.limits.maxProjects !== -1 && activeProjectCount >= plan.limits.maxProjects) {
            return res.status(403).json({
                success: false,
                code: 'PROJECT_LIMIT_REACHED',
                message: `You have reached the maximum limit of ${plan.limits.maxProjects} project(s) for the ${plan.name}. Please upgrade your plan in Billing to create more projects.`,
                limit: plan.limits.maxProjects,
                current: activeProjectCount
            });
        }

        const status = req.body.status || 'PLANNING';
        const completionPercent = status === 'COMPLETED'
            ? 100
            : (req.body.completionPercent !== undefined ? Math.min(100, Math.max(0, parseInt(req.body.completionPercent, 10) || 0)) : 0);

        const project = await prisma.project.create({
            data: {
                name: req.body.name,
                nameAr: req.body.nameAr || null,
                description: req.body.description,
                status: status,
                completionPercent: completionPercent,
                projectType: req.body.projectType,
                location: req.body.location,
                startDate: new Date(req.body.startDate),
                endDate: req.body.endDate ? new Date(req.body.endDate) : null,
                budget: req.body.budget ? parseFloat(req.body.budget) : 0,
                revenueModel: req.body.revenueModel,
                managementFeePercent: req.body.managementFeePercent ? parseFloat(req.body.managementFeePercent) : 0,
                totalContractValue: req.body.totalContractValue ? parseFloat(req.body.totalContractValue) : 0,
                paymentTerms: req.body.paymentTerms,
                clientId: req.body.clientId,
                engineerId: req.body.engineerId || req.user.id,
                tenantId: req.user.tenantId // Critical: Assign to Tenant
            },
            include: {
                client: true,
                engineer: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        await auditFromReq(req, {
            action: 'CREATE',
            entity: 'Project',
            entityId: project.id,
            after: project
        });

        // Auto-sync client status based on project state
        if (project.clientId) {
            await syncClientStatus(project.clientId, req.user.tenantId);
        }

        res.status(201).json({
            success: true,
            data: project
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
export const updateProject = async (req, res, next) => {
    try {
        const project = await prisma.project.findFirst({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId,
                deletedAt: null
            }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check ownership or managerial authorization
        const isAuthorized =
            project.engineerId === req.user.id ||
            ['ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER'].includes(req.user.role);

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this project'
            });
        }

        const updateData = { ...req.body };

        // Remove nested objects (like client) if they are passed solely for UI display
        delete updateData.client;
        delete updateData.engineer;
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        // Ensure proper types
        if (updateData.startDate) {
            updateData.startDate = new Date(updateData.startDate);
        } else {
            delete updateData.startDate; // Don't try to validat empty string
        }

        if (updateData.endDate) {
            updateData.endDate = new Date(updateData.endDate);
        } else {
            // If explicit empty string is passed, it might mean "clear date", but for now safer to ignore or set null if schema allows
            if (updateData.endDate === '') updateData.endDate = null;
            else delete updateData.endDate;
        }
        if (updateData.budget !== undefined && updateData.budget !== '') {
            updateData.budget = parseFloat(updateData.budget);
        } else if (updateData.budget === '') {
            updateData.budget = 0;
        }

        if (updateData.managementFeePercent !== undefined && updateData.managementFeePercent !== '') {
            updateData.managementFeePercent = parseFloat(updateData.managementFeePercent);
        } else if (updateData.managementFeePercent === '') {
            updateData.managementFeePercent = 0;
        }

        if (updateData.totalContractValue !== undefined && updateData.totalContractValue !== '') {
            updateData.totalContractValue = parseFloat(updateData.totalContractValue);
        } else if (updateData.totalContractValue === '') {
            updateData.totalContractValue = 0;
        }

        if (updateData.status === 'COMPLETED') {
            updateData.completionPercent = 100;
        } else if (updateData.completionPercent !== undefined && updateData.completionPercent !== '') {
            updateData.completionPercent = Math.min(100, Math.max(0, parseInt(updateData.completionPercent, 10) || 0));
        }

        const updatedProject = await prisma.project.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                client: true
            }
        });

        await auditFromReq(req, {
            action: 'UPDATE',
            entity: 'Project',
            entityId: updatedProject.id,
            before: project,
            after: updatedProject
        });

        // Auto-sync client status for updated client and old client if changed
        if (updatedProject.clientId) {
            await syncClientStatus(updatedProject.clientId, req.user.tenantId);
        }
        if (project.clientId && project.clientId !== updatedProject.clientId) {
            await syncClientStatus(project.clientId, req.user.tenantId);
        }

        res.status(200).json({
            success: true,
            data: updatedProject
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Restore a soft-deleted project.
// @route   PUT /api/projects/:id/restore
// @access  Private (Admin / Super Admin)
export const restoreProject = async (req, res, next) => {
    try {
        const project = await prisma.project.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: { not: null } }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Soft-deleted project not found'
            });
        }

        const restored = await prisma.project.update({
            where: { id: req.params.id },
            data: { deletedAt: null }
        });

        await auditFromReq(req, {
            action: 'RESTORE',
            entity: 'Project',
            entityId: restored.id,
            after: restored
        });

        // Auto-sync client status on restore
        if (restored.clientId) {
            await syncClientStatus(restored.clientId, req.user.tenantId);
        }

        res.status(200).json({ success: true, data: restored });
    } catch (error) {
        next(error);
    }
};

// @desc    Soft-delete project (sets deletedAt; cascade-deletes left intact for restore)
// @route   DELETE /api/projects/:id
// @access  Private
export const deleteProject = async (req, res, next) => {
    try {
        const project = await prisma.project.findFirst({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId,
                deletedAt: null
            }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check ownership or managerial authorization
        const isAuthorized =
            project.engineerId === req.user.id ||
            ['ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER'].includes(req.user.role);

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this project'
            });
        }

        const deleteTransactions = req.query.deleteTransactions === 'true' || req.body?.deleteTransactions === true;
        let deletedTransactionCount = 0;

        if (deleteTransactions) {
            // Delete related transactions
            const txResult = await prisma.transaction.deleteMany({
                where: {
                    projectId: project.id,
                    tenantId: req.user.tenantId
                }
            });
            deletedTransactionCount = txResult.count;

            // Also clean up project cost items
            await prisma.projectCostItem.deleteMany({
                where: { projectId: project.id }
            });

            // Clean up project category fees
            await prisma.projectCategoryFee.deleteMany({
                where: { projectId: project.id }
            });

            // Clean up project documents
            await prisma.document.deleteMany({
                where: { projectId: project.id }
            });
        }

        await prisma.project.update({
            where: { id: req.params.id },
            data: { deletedAt: new Date() }
        });

        await auditFromReq(req, {
            action: 'DELETE',
            entity: 'Project',
            entityId: project.id,
            before: { ...project, deletedTransactionsCount: deletedTransactionCount }
        });

        // Auto-sync client status on soft delete
        if (project.clientId) {
            await syncClientStatus(project.clientId, req.user.tenantId);
        }

        res.status(200).json({
            success: true,
            data: {
                deletedTransactionsCount: deletedTransactionCount
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get project financials (for dashboard charts)
// @route   GET /api/projects/:id/financials
// @access  Private (Admin, Manager, Accountant)
export const getProjectFinancials = async (req, res, next) => {
    try {
        const { id } = req.params;

        const project = await prisma.project.findFirst({
            where: {
                id,
                tenantId: req.user.tenantId
            },
            include: {
                transactions: {
                    where: {
                        status: 'APPROVED',
                        paymentMethod: 'CUSTODY_WALLET'
                    },
                    select: {
                        createdBy: true,
                        amount: true
                    }
                }
            }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Reconcile project ledger metrics to guarantee actualCost excludes office profits
        const pAggs = await prisma.transaction.groupBy({
            by: ['type', 'category'],
            where: {
                projectId: project.id,
                tenantId: req.user.tenantId,
                status: 'APPROVED'
            },
            _sum: {
                amount: true
            }
        });

        if (pAggs.length > 0) {
            let siteCost = 0;
            let profit = 0;
            let income = 0;
            pAggs.forEach(agg => {
                const amt = Number(agg._sum.amount || 0);
                if (agg.type === 'INCOME') {
                    income += amt;
                } else if (agg.type === 'EXPENSE') {
                    if (agg.category === 'MANAGEMENT_FEE_TRANSFER') {
                        profit += amt;
                    } else {
                        siteCost += amt;
                    }
                }
            });
            project.actualCost = siteCost;
            const officeProfit = profit || ((siteCost * Number(project.managementFeePercent || 0)) / 100);
            project.officeRevenue = officeProfit;
            project.projectSafeBalance = income - (siteCost + officeProfit);
        } else {
            project.actualCost = 0;
            project.officeRevenue = 0;
            project.projectSafeBalance = 0;
        }

        // Calculate custody holdings for this project
        // Sum all approved custody transactions grouped by engineer
        const custodyByEngineer = {};
        project.transactions.forEach(tx => {
            if (!custodyByEngineer[tx.createdBy]) {
                custodyByEngineer[tx.createdBy] = 0;
            }
            custodyByEngineer[tx.createdBy] += Number(tx.amount);
        });

        const totalCustodyHoldings = Object.values(custodyByEngineer).reduce((sum, val) => sum + val, 0);

        // Calculate burn rate (percentage of ops fund used)
        const opsUsed = Number(project.actualCost);
        const opsTotal = Number(project.operationalFund) + opsUsed; // Total that was available
        const burnRate = opsTotal > 0 ? ((opsUsed / opsTotal) * 100).toFixed(2) : 0;

        // Calculate remaining budget
        const totalBudget = Number(project.budget);
        const totalSpent = Number(project.actualCost);
        const remainingBudget = totalBudget - totalSpent;

        res.status(200).json({
            success: true,
            data: {
                // Main financial metrics
                totalBudget: totalBudget,
                operationalFund: Number(project.operationalFund),    // Blue Bar - Money available for ops
                officeRevenue: Number(project.officeRevenue),        // Green Bar - Company profit
                actualCost: Number(project.actualCost),              // Red Bar - Money spent
                custodyHoldings: totalCustodyHoldings,               // Yellow Bar - Money in engineers' hands

                // Additional metrics
                remainingBudget: remainingBudget,
                burnRate: `${burnRate}%`,

                // Project details
                projectName: project.name,
                revenueModel: project.revenueModel,
                managementFeePercent: Number(project.managementFeePercent || 0),

                // Chart data structure
                chartData: {
                    labels: ['Operational Fund', 'Office Revenue', 'Actual Cost', 'Custody Holdings'],
                    values: [
                        Number(project.operationalFund),
                        Number(project.officeRevenue),
                        Number(project.actualCost),
                        totalCustodyHoldings
                    ],
                    colors: ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'] // Blue, Green, Red, Yellow
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

