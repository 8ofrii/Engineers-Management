import prisma from '../lib/prisma.js';

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res, next) => {
    try {
        // Enforce Tenant Isolation
        const whereClause = {
            tenantId: req.user.tenantId
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

        res.status(200).json({
            success: true,
            count: projects.length,
            data: projects
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
                tenantId: req.user.tenantId
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
        const project = await prisma.project.create({
            data: {
                name: req.body.name,
                description: req.body.description,
                status: req.body.status,
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
                engineerId: req.user.id,
                tenantId: req.user.tenantId // Critical: Assign to Tenant
            },
            include: {
                client: true
            }
        });

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
                tenantId: req.user.tenantId
            }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check ownership
        if (project.engineerId !== req.user.id && req.user.role !== 'ADMIN') {
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

        const updatedProject = await prisma.project.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                client: true
            }
        });

        res.status(200).json({
            success: true,
            data: updatedProject
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
export const deleteProject = async (req, res, next) => {
    try {
        const project = await prisma.project.findFirst({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId
            }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check ownership
        if (project.engineerId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this project'
            });
        }

        await prisma.project.delete({
            where: { id: req.params.id }
        });

        res.status(200).json({
            success: true,
            data: {}
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

        const project = await prisma.project.findUnique({
            where: { id },
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

