import prisma from '../lib/prisma.js';

// @desc    Fund engineer wallet (Tamweel)
// @route   POST /api/custody/transfer
// @access  Private (Admin only)
export const fundEngineer = async (req, res, next) => {
    try {
        const { engineerId, amount, description } = req.body;

        if (!engineerId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Engineer ID and amount are required'
            });
        }

        // Get current engineer balance
        const engineer = await prisma.user.findUnique({
            where: { id: engineerId },
            select: { currentCustodyBalance: true, name: true, role: true }
        });

        if (!engineer) {
            return res.status(404).json({
                success: false,
                message: 'Engineer not found'
            });
        }

        if (engineer.role !== 'ENGINEER' && engineer.role !== 'PROJECT_MANAGER') {
            return res.status(400).json({
                success: false,
                message: 'Can only fund engineers or project managers'
            });
        }

        // Calculate new balance
        const balanceBefore = engineer.currentCustodyBalance;
        const balanceAfter = Number(balanceBefore) + Number(amount);

        // Atomic update
        const result = await prisma.$transaction([
            // Update engineer's custody balance
            prisma.user.update({
                where: { id: engineerId },
                data: {
                    currentCustodyBalance: { increment: amount }
                }
            }),

            // Create custody transfer record
            prisma.custodyTransfer.create({
                data: {
                    type: 'FUNDING',
                    amount: amount,
                    description: description || `Custody funding`,
                    engineerId: engineerId,
                    balanceBefore: balanceBefore,
                    balanceAfter: balanceAfter
                }
            }),

            // Create notification for engineer
            prisma.notification.create({
                data: {
                    userId: engineerId,
                    type: 'INFO',
                    title: 'Custody Funded',
                    message: `You received ${amount} EGP custody top-up. New balance: ${balanceAfter} EGP`,
                    resourceType: 'custody'
                }
            })
        ]);

        res.status(200).json({
            success: true,
            balanceBefore: Number(balanceBefore),
            balanceAfter: balanceAfter,
            transfer: result[1],
            message: `Successfully funded ${engineer.name} with ${amount} EGP`
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get engineer custody balance
// @route   GET /api/custody/balance/:engineerId
// @access  Private
export const getBalance = async (req, res, next) => {
    try {
        const { engineerId } = req.params;

        const engineer = await prisma.user.findUnique({
            where: { id: engineerId },
            select: {
                id: true,
                name: true,
                email: true,
                currentCustodyBalance: true,
                pendingClearance: true
            }
        });

        if (!engineer) {
            return res.status(404).json({
                success: false,
                message: 'Engineer not found'
            });
        }

        const availableBalance = Number(engineer.currentCustodyBalance) - Number(engineer.pendingClearance);

        res.status(200).json({
            success: true,
            data: {
                ...engineer,
                currentCustodyBalance: Number(engineer.currentCustodyBalance),
                pendingClearance: Number(engineer.pendingClearance),
                availableBalance: availableBalance
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get custody transfer history
// @route   GET /api/custody/history/:engineerId
// @access  Private
export const getHistory = async (req, res, next) => {
    try {
        const { engineerId } = req.params;

        const history = await prisma.custodyTransfer.findMany({
            where: { engineerId: engineerId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        res.status(200).json({
            success: true,
            count: history.length,
            data: history
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Return custody (Engineer returns unused cash)
// @route   POST /api/custody/return
// @access  Private (Engineer, Manager)
export const returnCustody = async (req, res, next) => {
    try {
        const { amount, description } = req.body;
        const engineerId = req.user.id;

        if (!amount) {
            return res.status(400).json({
                success: false,
                message: 'Amount is required'
            });
        }

        const engineer = await prisma.user.findUnique({
            where: { id: engineerId },
            select: { currentCustodyBalance: true, pendingClearance: true, name: true }
        });

        const availableBalance = Number(engineer.currentCustodyBalance) - Number(engineer.pendingClearance);

        if (amount > availableBalance) {
            return res.status(400).json({
                success: false,
                message: `Insufficient available balance. Available: ${availableBalance} EGP`,
                availableBalance: availableBalance
            });
        }

        const balanceBefore = engineer.currentCustodyBalance;
        const balanceAfter = Number(balanceBefore) - Number(amount);

        // Atomic update
        const result = await prisma.$transaction([
            prisma.user.update({
                where: { id: engineerId },
                data: {
                    currentCustodyBalance: { decrement: amount }
                }
            }),

            prisma.custodyTransfer.create({
                data: {
                    type: 'RETURN',
                    amount: amount,
                    description: description || 'Custody return',
                    engineerId: engineerId,
                    balanceBefore: balanceBefore,
                    balanceAfter: balanceAfter
                }
            })
        ]);

        res.status(200).json({
            success: true,
            balanceBefore: Number(balanceBefore),
            balanceAfter: balanceAfter,
            transfer: result[1],
            message: `Successfully returned ${amount} EGP`
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get all engineers with custody balances
// @route   GET /api/custody/all
// @access  Private (Admin, Accountant)
export const getAllCustodyBalances = async (req, res, next) => {
    try {
        const engineers = await prisma.user.findMany({
            where: {
                role: {
                    in: ['ENGINEER', 'PROJECT_MANAGER']
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                currentCustodyBalance: true,
                pendingClearance: true
            },
            orderBy: {
                name: 'asc'
            }
        });

        const engineersWithBalance = engineers.map(eng => ({
            ...eng,
            currentCustodyBalance: Number(eng.currentCustodyBalance),
            pendingClearance: Number(eng.pendingClearance),
            availableBalance: Number(eng.currentCustodyBalance) - Number(eng.pendingClearance)
        }));

        const totalCustody = engineersWithBalance.reduce((sum, eng) => sum + eng.currentCustodyBalance, 0);
        const totalPending = engineersWithBalance.reduce((sum, eng) => sum + eng.pendingClearance, 0);

        res.status(200).json({
            success: true,
            count: engineersWithBalance.length,
            data: engineersWithBalance,
            summary: {
                totalCustody,
                totalPending,
                totalAvailable: totalCustody - totalPending
            }
        });

    } catch (error) {
        next(error);
    }
};
