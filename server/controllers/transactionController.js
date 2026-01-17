import prisma from '../lib/prisma.js';

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
export const getTransactions = async (req, res, next) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                createdBy: req.user.id
            },
            include: {
                project: true,
                supplier: true,
                client: true
            },
            orderBy: {
                transactionDate: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            count: transactions.length,
            data: transactions
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get transaction stats
// @route   GET /api/transactions/stats
// @access  Private
export const getStats = async (req, res, next) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                createdBy: req.user.id
            }
        });

        // Group by type
        const byType = transactions.reduce((acc, t) => {
            const existing = acc.find(item => item._id === t.type);
            if (existing) {
                existing.total += Number(t.amount);
            } else {
                acc.push({ _id: t.type, total: Number(t.amount) });
            }
            return acc;
        }, []);

        // Group by category
        const byCategory = transactions.reduce((acc, t) => {
            const existing = acc.find(item => item._id === t.category);
            if (existing) {
                existing.total += Number(t.amount);
            } else {
                acc.push({ _id: t.category, total: Number(t.amount) });
            }
            return acc;
        }, []);

        res.status(200).json({
            success: true,
            data: {
                byType,
                byCategory
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
export const getTransaction = async (req, res, next) => {
    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id: req.params.id },
            include: {
                project: true,
                supplier: true,
                client: true
            }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        res.status(200).json({
            success: true,
            data: transaction
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create transaction
// @route   POST /api/transactions
// @access  Private
export const createTransaction = async (req, res, next) => {
    try {
        const transaction = await prisma.transaction.create({
            data: {
                ...req.body,
                createdBy: req.user.id
            },
            include: {
                project: true,
                supplier: true,
                client: true
            }
        });

        res.status(201).json({
            success: true,
            data: transaction
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
export const updateTransaction = async (req, res, next) => {
    try {
        const transaction = await prisma.transaction.update({
            where: { id: req.params.id },
            data: req.body,
            include: {
                project: true,
                supplier: true,
                client: true
            }
        });

        res.status(200).json({
            success: true,
            data: transaction
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
export const deleteTransaction = async (req, res, next) => {
    try {
        await prisma.transaction.delete({
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
