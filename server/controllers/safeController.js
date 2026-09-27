import prisma from '../lib/prisma.js';
import { auditFromReq } from '../lib/audit.js';

/**
 * @desc    Get all company safes for current tenant with live balances and stats
 * @route   GET /api/safes
 * @access  Private
 */

/**
 * Helper to compute custody inflows, outflows, and transaction counts
 */
async function getCustodyFlows(userId, tenantId) {
    const [expenses, returns, fundings, incomes, txCount] = await Promise.all([
        prisma.transaction.aggregate({
            where: {
                tenantId,
                status: 'APPROVED',
                type: 'EXPENSE',
                OR: [
                    { custodyWalletId: userId },
                    { payerUserId: userId, paymentMethod: 'CUSTODY_WALLET' },
                    { createdBy: userId, paymentMethod: 'CUSTODY_WALLET', custodyWalletId: null, payerUserId: null }
                ]
            },
            _sum: { amount: true }
        }),
        prisma.custodyTransfer.aggregate({
            where: {
                tenantId,
                engineerId: userId,
                type: { in: ['RETURN', 'SETTLEMENT'] },
                relatedTransactionId: null
            },
            _sum: { amount: true }
        }),
        prisma.custodyTransfer.aggregate({
            where: {
                tenantId,
                engineerId: userId,
                type: 'FUNDING'
            },
            _sum: { amount: true }
        }),
        prisma.transaction.aggregate({
            where: {
                tenantId,
                status: 'APPROVED',
                type: 'INCOME',
                OR: [
                    { custodyWalletId: userId },
                    { payerUserId: userId, paymentMethod: 'CUSTODY_WALLET' }
                ]
            },
            _sum: { amount: true }
        }),
        prisma.transaction.count({
            where: {
                tenantId,
                status: 'APPROVED',
                OR: [
                    { custodyWalletId: userId },
                    { payerUserId: userId, paymentMethod: 'CUSTODY_WALLET' },
                    { createdBy: userId, paymentMethod: 'CUSTODY_WALLET', custodyWalletId: null, payerUserId: null }
                ]
            }
        })
    ]);

    const totalExpense = Number(expenses._sum.amount || 0) + Number(returns._sum.amount || 0);
    const totalIncome = Number(fundings._sum.amount || 0) + Number(incomes._sum.amount || 0);

    return { totalIncome, totalExpense, transactionCount: txCount };
}

export const getSafes = async (req, res, next) => {
    try {
        const tenantId = req.user.tenantId;
        const { includeInactive } = req.query;

        const where = { tenantId };
        if (includeInactive !== 'true') {
            where.isActive = true;
        }

        const safes = await prisma.companySafe.findMany({
            where,
            orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'asc' }
            ],
            include: {
                assignedUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        profilePicture: true
                    }
                },
                _count: {
                    select: {
                        transactions: true,
                        transfersFrom: true,
                        transfersTo: true
                    }
                }
            }
        });

        // Compute inflow, outflow, and transfers for each safe to determine reconciled real-time balance
        const enrichedSafes = await Promise.all(safes.map(async (safe) => {
            const [inflows, outflows, transfersIn, transfersOut] = await Promise.all([
                prisma.transaction.aggregate({
                    where: {
                        safeId: safe.id,
                        status: 'APPROVED',
                        type: 'INCOME',
                        tenantId
                    },
                    _sum: { amount: true }
                }),
                prisma.transaction.aggregate({
                    where: {
                        safeId: safe.id,
                        status: 'APPROVED',
                        type: 'EXPENSE',
                        tenantId
                    },
                    _sum: { amount: true }
                }),
                prisma.safeTransfer.aggregate({
                    where: {
                        toSafeId: safe.id,
                        tenantId
                    },
                    _sum: { amount: true }
                }),
                prisma.safeTransfer.aggregate({
                    where: {
                        fromSafeId: safe.id,
                        tenantId
                    },
                    _sum: { amount: true }
                })
            ]);

            const totalIn = Number(inflows._sum.amount || 0);
            const totalOut = Number(outflows._sum.amount || 0);
            const totalTrIn = Number(transfersIn._sum.amount || 0);
            const totalTrOut = Number(transfersOut._sum.amount || 0);
            const initial = Number(safe.initialBalance || 0);

            // Reconciled real-time balance: Initial + Inflows - Outflows + Transfers In - Transfers Out
            const reconciledBalance = initial + totalIn - totalOut + totalTrIn - totalTrOut;

            // Automatically keep safe.balance in sync in database if drift occurred
            if (Number(safe.balance) !== reconciledBalance) {
                await prisma.companySafe.update({
                    where: { id: safe.id },
                    data: { balance: reconciledBalance }
                }).catch(err => console.error(`Error auto-syncing safe ${safe.id} balance:`, err));
            }

            return {
                ...safe,
                totalIncome: totalIn,
                totalExpense: totalOut,
                balance: reconciledBalance,
                initialBalance: initial
            };
        }));

        // Fetch active tenant members to present custodies on the same plane as safes
        const usersWithCustody = await prisma.user.findMany({
            where: {
                tenantId,
                isActive: true
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                profilePicture: true,
                currentCustodyBalance: true
            },
            orderBy: { name: 'asc' }
        });

        const custodyEntities = await Promise.all(usersWithCustody.map(async (u) => {
            const flows = await getCustodyFlows(u.id, tenantId);
            return {
                id: `custody_${u.id}`,
                userId: u.id,
                name: `عهدة: ${u.name || u.email}`,
                nameAr: `عهدة: ${u.name || u.email}`,
                type: 'CUSTODY',
                accountNumber: null,
                bankName: null,
                balance: Number(u.currentCustodyBalance || 0),
                totalIncome: flows.totalIncome,
                totalExpense: flows.totalExpense,
                initialBalance: 0,
                currency: 'EGP',
                isDefault: false,
                isActive: true,
                isCustody: true,
                assignedUserId: u.id,
                assignedUser: {
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    profilePicture: u.profilePicture
                },
                _count: {
                    transactions: flows.transactionCount,
                    transfersFrom: 0,
                    transfersTo: 0
                }
            };
        }));

        const allSafesAndCustodies = [...enrichedSafes, ...custodyEntities];

        res.status(200).json({
            success: true,
            count: allSafesAndCustodies.length,
            data: allSafesAndCustodies
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single safe by ID
 * @route   GET /api/safes/:id
 * @access  Private
 */
export const getSafeById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        if (id && id.startsWith('custody_')) {
            const userId = id.replace('custody_', '');
            const user = await prisma.user.findFirst({
                where: { id: userId, tenantId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    profilePicture: true,
                    currentCustodyBalance: true
                }
            });
            if (!user) {
                return res.status(404).json({ success: false, message: 'Custody account user not found' });
            }
            const flows = await getCustodyFlows(user.id, tenantId);
            return res.status(200).json({
                success: true,
                data: {
                    id: `custody_${user.id}`,
                    userId: user.id,
                    name: `عهدة: ${user.name || user.email}`,
                    nameAr: `عهدة: ${user.name || user.email}`,
                    type: 'CUSTODY',
                    balance: Number(user.currentCustodyBalance || 0),
                    totalIncome: flows.totalIncome,
                    totalExpense: flows.totalExpense,
                    currency: 'EGP',
                    isCustody: true,
                    isActive: true,
                    assignedUser: user
                }
            });
        }

        const safe = await prisma.companySafe.findFirst({
            where: { id, tenantId },
            include: {
                assignedUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        profilePicture: true
                    }
                },
                transactions: {
                    take: 10,
                    orderBy: { transactionDate: 'desc' },
                    include: {
                        user: { select: { id: true, name: true } },
                        project: { select: { id: true, name: true } }
                    }
                }
            }
        });

        if (!safe) {
            return res.status(404).json({
                success: false,
                message: 'Company safe not found'
            });
        }

        const [inflows, outflows, transfersIn, transfersOut] = await Promise.all([
            prisma.transaction.aggregate({
                where: { safeId: safe.id, status: 'APPROVED', type: 'INCOME', tenantId },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { safeId: safe.id, status: 'APPROVED', type: 'EXPENSE', tenantId },
                _sum: { amount: true }
            }),
            prisma.safeTransfer.aggregate({
                where: { toSafeId: safe.id, tenantId },
                _sum: { amount: true }
            }),
            prisma.safeTransfer.aggregate({
                where: { fromSafeId: safe.id, tenantId },
                _sum: { amount: true }
            })
        ]);

        const totalIn = Number(inflows._sum.amount || 0);
        const totalOut = Number(outflows._sum.amount || 0);
        const totalTrIn = Number(transfersIn._sum.amount || 0);
        const totalTrOut = Number(transfersOut._sum.amount || 0);
        const initial = Number(safe.initialBalance || 0);
        const reconciledBalance = initial + totalIn - totalOut + totalTrIn - totalTrOut;

        res.status(200).json({
            success: true,
            data: {
                ...safe,
                totalIncome: totalIn,
                totalExpense: totalOut,
                balance: reconciledBalance,
                initialBalance: initial
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create new company safe
 * @route   POST /api/safes
 * @access  Private (Admin, SuperAdmin, Manager, Accountant)
 */
export const createSafe = async (req, res, next) => {
    try {
        const tenantId = req.user.tenantId;
        const {
            name,
            nameAr,
            type,
            accountNumber,
            bankName,
            initialBalance,
            currency,
            isDefault,
            description,
            assignedUserId
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Safe name is required'
            });
        }

        let cleanAssignedUserId = null;
        if (assignedUserId && typeof assignedUserId === 'string' && assignedUserId.trim()) {
            const memberId = assignedUserId.trim();
            const member = await prisma.user.findFirst({
                where: { id: memberId, tenantId }
            });
            if (!member) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected company member not found'
                });
            }
            cleanAssignedUserId = memberId;
        }

        const startBal = Number(initialBalance) || 0;

        const result = await prisma.$transaction(async (tx) => {
            // If this safe is marked default, unset default on other safes
            if (isDefault) {
                await tx.companySafe.updateMany({
                    where: { tenantId, isDefault: true },
                    data: { isDefault: false }
                });
            }

            const newSafe = await tx.companySafe.create({
                data: {
                    name: name.trim(),
                    nameAr: nameAr ? nameAr.trim() : null,
                    type: type || 'CASH_SAFE',
                    accountNumber: accountNumber ? accountNumber.trim() : null,
                    bankName: bankName ? bankName.trim() : null,
                    initialBalance: startBal,
                    balance: startBal,
                    currency: currency || 'EGP',
                    isDefault: Boolean(isDefault),
                    description: description ? description.trim() : null,
                    assignedUserId: cleanAssignedUserId,
                    tenantId
                },
                include: {
                    assignedUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            profilePicture: true
                        }
                    }
                }
            });

            return newSafe;
        });

        await auditFromReq(req, {
            action: 'CREATE',
            entity: 'CompanySafe',
            entityId: result.id,
            after: {
                name: result.name,
                type: result.type,
                balance: Number(result.balance)
            }
        });

        res.status(201).json({
            success: true,
            data: result,
            message: 'Company safe created successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update company safe
 * @route   PUT /api/safes/:id
 * @access  Private (Admin, SuperAdmin, Manager)
 */
export const updateSafe = async (req, res, next) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const {
            name,
            nameAr,
            type,
            accountNumber,
            bankName,
            description,
            isActive,
            isDefault,
            assignedUserId
        } = req.body;

        const existingSafe = await prisma.companySafe.findFirst({
            where: { id, tenantId }
        });

        if (!existingSafe) {
            return res.status(404).json({
                success: false,
                message: 'Company safe not found'
            });
        }

        let assignedUserUpdate;
        if (assignedUserId !== undefined) {
            if (assignedUserId && typeof assignedUserId === 'string' && assignedUserId.trim()) {
                const memberId = assignedUserId.trim();
                const member = await prisma.user.findFirst({
                    where: { id: memberId, tenantId }
                });
                if (!member) {
                    return res.status(400).json({
                        success: false,
                        message: 'Selected company member not found'
                    });
                }
                assignedUserUpdate = memberId;
            } else {
                assignedUserUpdate = null;
            }
        }

        const updated = await prisma.$transaction(async (tx) => {
            if (isDefault) {
                await tx.companySafe.updateMany({
                    where: { tenantId, id: { not: id }, isDefault: true },
                    data: { isDefault: false }
                });
            }

            const updateData = {
                name: name !== undefined ? name.trim() : existingSafe.name,
                nameAr: nameAr !== undefined ? (nameAr ? nameAr.trim() : null) : existingSafe.nameAr,
                type: type !== undefined ? type : existingSafe.type,
                accountNumber: accountNumber !== undefined ? (accountNumber ? accountNumber.trim() : null) : existingSafe.accountNumber,
                bankName: bankName !== undefined ? (bankName ? bankName.trim() : null) : existingSafe.bankName,
                description: description !== undefined ? (description ? description.trim() : null) : existingSafe.description,
                isActive: isActive !== undefined ? Boolean(isActive) : existingSafe.isActive,
                isDefault: isDefault !== undefined ? Boolean(isDefault) : existingSafe.isDefault
            };

            if (assignedUserId !== undefined) {
                updateData.assignedUserId = assignedUserUpdate;
            }

            return tx.companySafe.update({
                where: { id },
                data: updateData,
                include: {
                    assignedUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            profilePicture: true
                        }
                    }
                }
            });
        });

        await auditFromReq(req, {
            action: 'UPDATE',
            entity: 'CompanySafe',
            entityId: id,
            before: { name: existingSafe.name, isActive: existingSafe.isActive },
            after: { name: updated.name, isActive: updated.isActive }
        });

        res.status(200).json({
            success: true,
            data: updated,
            message: 'Company safe updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete or deactivate company safe
 * @route   DELETE /api/safes/:id
 * @access  Private (Admin, SuperAdmin)
 */
export const deleteSafe = async (req, res, next) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        const safe = await prisma.companySafe.findFirst({
            where: { id, tenantId },
            include: {
                _count: {
                    select: {
                        transactions: true,
                        transfersFrom: true,
                        transfersTo: true
                    }
                }
            }
        });

        if (!safe) {
            return res.status(404).json({
                success: false,
                message: 'Company safe not found'
            });
        }

        const totalUsage = safe._count.transactions + safe._count.transfersFrom + safe._count.transfersTo;

        if (totalUsage > 0) {
            // Cannot hard delete -> soft delete / deactivate
            const deactivated = await prisma.companySafe.update({
                where: { id },
                data: { isActive: false }
            });

            return res.status(200).json({
                success: true,
                data: deactivated,
                message: 'Safe has transaction history and has been deactivated instead of deleted.'
            });
        }

        await prisma.companySafe.delete({
            where: { id }
        });

        await auditFromReq(req, {
            action: 'DELETE',
            entity: 'CompanySafe',
            entityId: id,
            before: { name: safe.name }
        });

        res.status(200).json({
            success: true,
            message: 'Company safe deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Internal transfer between two company safes
 * @route   POST /api/safes/transfers
 * @access  Private (Admin, SuperAdmin, Manager, Accountant)
 */
export const transferBetweenSafes = async (req, res, next) => {
    try {
        const tenantId = req.user.tenantId;
        const { fromSafeId, toSafeId, amount, notes, transferDate } = req.body;

        const transferAmount = Number(amount);
        if (!transferAmount || transferAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid positive amount is required'
            });
        }

        if (!fromSafeId || !toSafeId) {
            return res.status(400).json({
                success: false,
                message: 'Source and destination safes/custodies are required'
            });
        }

        if (fromSafeId === toSafeId) {
            return res.status(400).json({
                success: false,
                message: 'Source and destination cannot be the same'
            });
        }

        const fromIsCustody = String(fromSafeId).startsWith('custody_');
        const toIsCustody = String(toSafeId).startsWith('custody_');
        const fromUserId = fromIsCustody ? String(fromSafeId).replace('custody_', '') : null;
        const toUserId = toIsCustody ? String(toSafeId).replace('custody_', '') : null;

        const receiptUrl = req.file
            ? (req.file.key ? `/uploads/${req.file.key}` : (req.file.location || `/uploads/receipts/${req.file.filename}`))
            : (req.body.receiptUrl ? String(req.body.receiptUrl).trim() : null);

        // Case 1: Custody to Custody Handover
        if (fromIsCustody && toIsCustody) {
            const [fromUser, toUser] = await Promise.all([
                prisma.user.findFirst({ where: { id: fromUserId, tenantId, isActive: true } }),
                prisma.user.findFirst({ where: { id: toUserId, tenantId, isActive: true } })
            ]);

            if (!fromUser) return res.status(404).json({ success: false, message: 'Source custody member not found' });
            if (!toUser) return res.status(404).json({ success: false, message: 'Destination custody member not found' });

            const result = await prisma.$transaction(async (tx) => {
                const updatedFrom = await tx.user.update({
                    where: { id: fromUserId },
                    data: { currentCustodyBalance: { decrement: transferAmount } }
                });

                const updatedTo = await tx.user.update({
                    where: { id: toUserId },
                    data: { currentCustodyBalance: { increment: transferAmount } }
                });

                await tx.custodyTransfer.create({
                    data: {
                        type: 'CLEARANCE',
                        amount: transferAmount,
                        description: notes ? `تحويل عهدة إلى ${toUser.name}: ${notes}` : `تحويل عهدة إلى ${toUser.name}`,
                        engineerId: fromUserId,
                        balanceBefore: fromUser.currentCustodyBalance,
                        balanceAfter: updatedFrom.currentCustodyBalance,
                        tenantId
                    }
                });

                await tx.custodyTransfer.create({
                    data: {
                        type: 'FUNDING',
                        amount: transferAmount,
                        description: notes ? `استلام عهدة من ${fromUser.name}: ${notes}` : `استلام عهدة من ${fromUser.name}`,
                        engineerId: toUserId,
                        balanceBefore: toUser.currentCustodyBalance,
                        balanceAfter: updatedTo.currentCustodyBalance,
                        tenantId
                    }
                });

                return { fromBalance: updatedFrom.currentCustodyBalance, toBalance: updatedTo.currentCustodyBalance };
            });

            await auditFromReq(req, {
                action: 'TRANSFER_CUSTODY',
                entity: 'CustodyTransfer',
                after: { from: fromUser.name, to: toUser.name, amount: transferAmount }
            });

            return res.status(201).json({
                success: true,
                message: 'Custody transfer completed successfully',
                data: result
            });
        }

        // Case 2: Safe to Custody (Funding Custody from Safe)
        if (!fromIsCustody && toIsCustody) {
            const [fromSafe, toUser] = await Promise.all([
                prisma.companySafe.findFirst({ where: { id: fromSafeId, tenantId, isActive: true } }),
                prisma.user.findFirst({ where: { id: toUserId, tenantId, isActive: true } })
            ]);

            if (!fromSafe) return res.status(404).json({ success: false, message: 'Source safe not found or inactive' });
            if (!toUser) return res.status(404).json({ success: false, message: 'Destination custody member not found' });

            const result = await prisma.$transaction(async (tx) => {
                const updatedFrom = await tx.companySafe.update({
                    where: { id: fromSafeId },
                    data: { balance: { decrement: transferAmount } }
                });

                const updatedTo = await tx.user.update({
                    where: { id: toUserId },
                    data: { currentCustodyBalance: { increment: transferAmount } }
                });

                const custodyTransferRecord = await tx.custodyTransfer.create({
                    data: {
                        type: 'FUNDING',
                        amount: transferAmount,
                        description: notes ? `تغذية عهدة من ${fromSafe.name}: ${notes}` : `تغذية عهدة من ${fromSafe.name}`,
                        engineerId: toUserId,
                        balanceBefore: toUser.currentCustodyBalance,
                        balanceAfter: updatedTo.currentCustodyBalance,
                        tenantId
                    }
                });

                const txOut = await tx.transaction.create({
                    data: {
                        type: 'EXPENSE',
                        category: 'CUSTODY_TRANSFER',
                        amount: transferAmount,
                        description: notes ? `تغذية عهدة (${toUser.name}): ${notes}` : `تغذية عهدة: ${toUser.name} من ${fromSafe.name}`,
                        status: 'APPROVED',
                        createdBy: req.user.id,
                        transactionDate: transferDate ? new Date(transferDate) : new Date(),
                        paymentMethod: 'CASH',
                        safeId: fromSafeId,
                        transactionTo: toUser.name,
                        toEngineerId: toUserId,
                        receiptPhotoUrl: receiptUrl,
                        tenantId
                    }
                });

                await tx.notification.create({
                    data: {
                        userId: toUserId,
                        type: 'INFO',
                        title: 'Custody Funded / تغذية عهدة',
                        message: `تم تحويل ${transferAmount} ج.م إلى عهدتك من [${fromSafe.name}]. الرصيد الجديد: ${updatedTo.currentCustodyBalance} ج.م`,
                        resourceType: 'custody',
                        tenantId
                    }
                }).catch(() => {});

                return { transferRecord: txOut, custodyTransferRecord, fromBalance: updatedFrom.balance, toBalance: updatedTo.currentCustodyBalance };
            });

            await auditFromReq(req, {
                action: 'SAFE_TO_CUSTODY_TRANSFER',
                entity: 'CustodyTransfer',
                after: { fromSafe: fromSafe.name, toMember: toUser.name, amount: transferAmount }
            });

            return res.status(201).json({
                success: true,
                message: 'Custody funded successfully from safe',
                data: result
            });
        }

        // Case 3: Custody to Safe (Returning Custody to Safe)
        if (fromIsCustody && !toIsCustody) {
            const [fromUser, toSafe] = await Promise.all([
                prisma.user.findFirst({ where: { id: fromUserId, tenantId, isActive: true } }),
                prisma.companySafe.findFirst({ where: { id: toSafeId, tenantId, isActive: true } })
            ]);

            if (!fromUser) return res.status(404).json({ success: false, message: 'Source custody member not found' });
            if (!toSafe) return res.status(404).json({ success: false, message: 'Destination safe not found or inactive' });

            const result = await prisma.$transaction(async (tx) => {
                const updatedFrom = await tx.user.update({
                    where: { id: fromUserId },
                    data: { currentCustodyBalance: { decrement: transferAmount } }
                });

                const updatedTo = await tx.companySafe.update({
                    where: { id: toSafeId },
                    data: { balance: { increment: transferAmount } }
                });

                const custodyTransferRecord = await tx.custodyTransfer.create({
                    data: {
                        type: 'RETURN',
                        amount: transferAmount,
                        description: notes ? `توريد عهدة إلى ${toSafe.name}: ${notes}` : `توريد عهدة إلى ${toSafe.name}`,
                        engineerId: fromUserId,
                        balanceBefore: fromUser.currentCustodyBalance,
                        balanceAfter: updatedFrom.currentCustodyBalance,
                        tenantId
                    }
                });

                const txIn = await tx.transaction.create({
                    data: {
                        type: 'INCOME',
                        category: 'CUSTODY_TRANSFER',
                        amount: transferAmount,
                        description: notes ? `توريد عهدة من (${fromUser.name}): ${notes}` : `توريد عهدة من: ${fromUser.name} إلى ${toSafe.name}`,
                        status: 'APPROVED',
                        createdBy: req.user.id,
                        transactionDate: transferDate ? new Date(transferDate) : new Date(),
                        paymentMethod: 'CASH',
                        safeId: toSafeId,
                        transactionFrom: fromUser.name,
                        receiptPhotoUrl: receiptUrl,
                        tenantId
                    }
                });

                return { transferRecord: txIn, custodyTransferRecord, fromBalance: updatedFrom.currentCustodyBalance, toBalance: updatedTo.balance };
            });

            await auditFromReq(req, {
                action: 'CUSTODY_TO_SAFE_TRANSFER',
                entity: 'CustodyTransfer',
                after: { fromMember: fromUser.name, toSafe: toSafe.name, amount: transferAmount }
            });

            return res.status(201).json({
                success: true,
                message: 'Custody returned successfully to safe',
                data: result
            });
        }

        // Case 4: Safe to Safe (Original behavior)
        const [fromSafe, toSafe] = await Promise.all([
            prisma.companySafe.findFirst({ where: { id: fromSafeId, tenantId, isActive: true } }),
            prisma.companySafe.findFirst({ where: { id: toSafeId, tenantId, isActive: true } })
        ]);

        if (!fromSafe) {
            return res.status(404).json({ success: false, message: 'Source safe not found or inactive' });
        }
        if (!toSafe) {
            return res.status(404).json({ success: false, message: 'Destination safe not found or inactive' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const updatedFrom = await tx.companySafe.update({
                where: { id: fromSafeId },
                data: { balance: { decrement: transferAmount } }
            });

            const updatedTo = await tx.companySafe.update({
                where: { id: toSafeId },
                data: { balance: { increment: transferAmount } }
            });

            const transferRecord = await tx.safeTransfer.create({
                data: {
                    amount: transferAmount,
                    fromSafeId,
                    toSafeId,
                    notes: notes ? notes.trim() : null,
                    receiptUrl,
                    transferDate: transferDate ? new Date(transferDate) : new Date(),
                    createdBy: req.user.id,
                    tenantId
                },
                include: {
                    fromSafe: { select: { id: true, name: true, nameAr: true } },
                    toSafe: { select: { id: true, name: true, nameAr: true } },
                    user: { select: { id: true, name: true } }
                }
            });

            return { transferRecord, fromBalance: updatedFrom.balance, toBalance: updatedTo.balance };
        });

        await auditFromReq(req, {
            action: 'TRANSFER_SAFE',
            entity: 'SafeTransfer',
            entityId: result.transferRecord.id,
            after: {
                fromSafe: fromSafe.name,
                toSafe: toSafe.name,
                amount: transferAmount,
                hasReceipt: Boolean(receiptUrl)
            }
        });

        res.status(201).json({
            success: true,
            data: result.transferRecord,
            message: 'Transfer completed successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const getSafeTransfers = async (req, res, next) => {
    try {
        const tenantId = req.user.tenantId;
        const { limit = 50 } = req.query;

        const transfers = await prisma.safeTransfer.findMany({
            where: { tenantId },
            take: Number(limit),
            orderBy: { transferDate: 'desc' },
            include: {
                fromSafe: { select: { id: true, name: true, nameAr: true, type: true } },
                toSafe: { select: { id: true, name: true, nameAr: true, type: true } },
                user: { select: { id: true, name: true } }
            }
        });

        res.status(200).json({
            success: true,
            count: transfers.length,
            data: transfers
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get chronological statement / ledger for a safe with running balance
 * @route   GET /api/safes/:id/statement
 * @access  Private
 */
export const getSafeStatement = async (req, res, next) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const { dateFrom, dateTo } = req.query;

        // Support Member Custody Statement
        if (id && id.startsWith('custody_')) {
            const userId = id.replace('custody_', '');
            const user = await prisma.user.findFirst({
                where: { id: userId, tenantId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    currentCustodyBalance: true
                }
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'Custody account user not found' });
            }

            const ctWhere = { engineerId: userId, tenantId };
            if (dateFrom) ctWhere.createdAt = { gte: new Date(dateFrom) };
            if (dateTo) ctWhere.createdAt = { ...(ctWhere.createdAt || {}), lte: new Date(`${dateTo}T23:59:59.999Z`) };

            const custodyTransfers = await prisma.custodyTransfer.findMany({
                where: ctWhere,
                orderBy: { createdAt: 'asc' }
            });

            const txWhere = {
                tenantId,
                status: 'APPROVED',
                OR: [
                    { payerUserId: userId, paymentMethod: 'CUSTODY_WALLET' },
                    { custodyWalletId: userId },
                    { createdBy: userId, paymentMethod: 'CUSTODY_WALLET', custodyWalletId: null, payerUserId: null },
                    { toEngineerId: userId, category: 'CUSTODY_TRANSFER' },
                    { transactionFrom: user.name, category: 'CUSTODY_TRANSFER' }
                ]
            };
            if (dateFrom) txWhere.transactionDate = { gte: new Date(dateFrom) };
            if (dateTo) txWhere.transactionDate = { ...(txWhere.transactionDate || {}), lte: new Date(`${dateTo}T23:59:59.999Z`) };

            const txs = await prisma.transaction.findMany({
                where: txWhere,
                orderBy: { transactionDate: 'asc' },
                include: {
                    project: { select: { id: true, name: true } },
                    user: { select: { id: true, name: true } },
                    workman: { select: { id: true, name: true } },
                    supplier: { select: { id: true, name: true } },
                    client: { select: { id: true, name: true } }
                }
            });

            const ledger = [];

            custodyTransfers.forEach(ct => {
                const isFunding = ct.type === 'FUNDING';
                ledger.push({
                    id: ct.id,
                    date: ct.createdAt,
                    type: isFunding ? 'TRANSFER_IN' : 'TRANSFER_OUT',
                    inflow: isFunding ? Number(ct.amount) : 0,
                    outflow: !isFunding ? Number(ct.amount) : 0,
                    description: ct.description || (isFunding ? 'تغذية عهدة' : 'تسوية عهدة'),
                    reference: `CT-${ct.id.slice(0, 6)}`,
                    category: ct.type,
                    projectName: 'العهدة المالية',
                    partyName: user.name,
                    userName: user.name,
                    receiptUrl: null
                });
            });

            txs.forEach(t => {
                const isCustodyExpense = t.type === 'EXPENSE' && (
                    t.paymentMethod === 'CUSTODY_WALLET' ||
                    t.custodyWalletId === userId ||
                    (t.payerUserId === userId && t.paymentMethod === 'CUSTODY_WALLET')
                );
                if (isCustodyExpense) {
                    ledger.push({
                        id: t.id,
                        date: t.transactionDate,
                        type: 'EXPENSE',
                        inflow: 0,
                        outflow: Number(t.amount),
                        description: t.description || 'مصروف موقع من العهدة',
                        reference: t.invoiceNumber || t.id.slice(0, 8),
                        category: t.category,
                        projectName: t.project?.name || null,
                        partyName: t.client?.name || t.supplier?.name || t.workman?.name || null,
                        userName: user.name,
                        receiptUrl: t.receiptPhotoUrl || null
                    });
                }
            });

            ledger.sort((a, b) => new Date(a.date) - new Date(b.date));

            let runningBalance = 0;
            const entriesWithBalance = ledger.map(entry => {
                runningBalance += (entry.inflow - entry.outflow);
                return {
                    ...entry,
                    balanceAfter: runningBalance
                };
            });

            const totalInflow = ledger.reduce((sum, item) => sum + item.inflow, 0);
            const totalOutflow = ledger.reduce((sum, item) => sum + item.outflow, 0);

            return res.status(200).json({
                success: true,
                data: {
                    safe: {
                        id: `custody_${user.id}`,
                        name: `عهدة: ${user.name || user.email}`,
                        nameAr: `عهدة: ${user.name || user.email}`,
                        type: 'CUSTODY',
                        currency: 'EGP',
                        balance: Number(user.currentCustodyBalance || 0),
                        assignedUser: user
                    },
                    openingBalance: 0,
                    closingBalance: Number(user.currentCustodyBalance || 0),
                    totalInflow,
                    totalOutflow,
                    netChange: totalInflow - totalOutflow,
                    transactions: entriesWithBalance
                }
            });
        }

        const safe = await prisma.companySafe.findFirst({
            where: { id, tenantId },
            include: {
                assignedUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        if (!safe) {
            return res.status(404).json({
                success: false,
                message: 'Company safe not found'
            });
        }

        // 1. Fetch approved transactions tied to this safe
        const txWhere = {
            safeId: id,
            status: 'APPROVED',
            tenantId
        };
        if (dateFrom) txWhere.transactionDate = { gte: new Date(dateFrom) };
        if (dateTo) {
            txWhere.transactionDate = {
                ...(txWhere.transactionDate || {}),
                lte: new Date(`${dateTo}T23:59:59.999Z`)
            };
        }

        const transactions = await prisma.transaction.findMany({
            where: txWhere,
            orderBy: { transactionDate: 'asc' },
            include: {
                project: { select: { id: true, name: true } },
                user: { select: { id: true, name: true } },
                workman: { select: { id: true, name: true } },
                supplier: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } }
            }
        });

        // 2. Fetch transfers in
        const transferInWhere = {
            toSafeId: id,
            tenantId
        };
        if (dateFrom) transferInWhere.transferDate = { gte: new Date(dateFrom) };
        if (dateTo) transferInWhere.transferDate = { ...(transferInWhere.transferDate || {}), lte: new Date(`${dateTo}T23:59:59.999Z`) };

        const transfersIn = await prisma.safeTransfer.findMany({
            where: transferInWhere,
            orderBy: { transferDate: 'asc' },
            include: {
                fromSafe: { select: { id: true, name: true, nameAr: true } },
                user: { select: { id: true, name: true } }
            }
        });

        // 3. Fetch transfers out
        const transferOutWhere = {
            fromSafeId: id,
            tenantId
        };
        if (dateFrom) transferOutWhere.transferDate = { gte: new Date(dateFrom) };
        if (dateTo) transferOutWhere.transferDate = { ...(transferOutWhere.transferDate || {}), lte: new Date(`${dateTo}T23:59:59.999Z`) };

        const transfersOut = await prisma.safeTransfer.findMany({
            where: transferOutWhere,
            orderBy: { transferDate: 'asc' },
            include: {
                toSafe: { select: { id: true, name: true, nameAr: true } },
                user: { select: { id: true, name: true } }
            }
        });

        // 4. Map to unified ledger records
        const ledger = [];

        transactions.forEach(t => {
            const isIncome = t.type === 'INCOME';
            ledger.push({
                id: t.id,
                date: t.transactionDate,
                type: isIncome ? 'INCOME' : 'EXPENSE',
                inflow: isIncome ? Number(t.amount) : 0,
                outflow: !isIncome ? Number(t.amount) : 0,
                description: t.description || (isIncome ? 'إيراد' : 'مصروف'),
                reference: t.invoiceNumber || t.id.slice(0, 8),
                category: t.category,
                projectName: t.project?.name || (t.isOfficeExpense ? 'المكتب الرئيسي' : null),
                partyName: t.client?.name || t.supplier?.name || t.workman?.name || null,
                userName: t.user?.name || null,
                receiptUrl: t.receiptPhotoUrl || null
            });
        });

        transfersIn.forEach(tr => {
            ledger.push({
                id: tr.id,
                date: tr.transferDate,
                type: 'TRANSFER_IN',
                inflow: Number(tr.amount),
                outflow: 0,
                description: `تحويل وارد من [${tr.fromSafe?.name || 'خزينة أخرى'}]${tr.notes ? ` - ${tr.notes}` : ''}`,
                reference: `TR-${tr.id.slice(0, 6)}`,
                category: 'INTERNAL_TRANSFER',
                projectName: 'تحويل داخلي',
                partyName: tr.fromSafe?.name,
                userName: tr.user?.name || null,
                receiptUrl: tr.receiptUrl || null
            });
        });

        transfersOut.forEach(tr => {
            ledger.push({
                id: tr.id,
                date: tr.transferDate,
                type: 'TRANSFER_OUT',
                inflow: 0,
                outflow: Number(tr.amount),
                description: `تحويل صادر إلى [${tr.toSafe?.name || 'خزينة أخرى'}]${tr.notes ? ` - ${tr.notes}` : ''}`,
                reference: `TR-${tr.id.slice(0, 6)}`,
                category: 'INTERNAL_TRANSFER',
                projectName: 'تحويل داخلي',
                partyName: tr.toSafe?.name,
                userName: tr.user?.name || null,
                receiptUrl: tr.receiptUrl || null
            });
        });

        // 5. Sort chronologically
        ledger.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 6. Calculate running balance starting from initialBalance
        let runningBalance = Number(safe.initialBalance || 0);
        const entriesWithBalance = ledger.map(entry => {
            runningBalance += (entry.inflow - entry.outflow);
            return {
                ...entry,
                balanceAfter: runningBalance
            };
        });

        res.status(200).json({
            success: true,
            data: {
                safe: {
                    id: safe.id,
                    name: safe.name,
                    nameAr: safe.nameAr,
                    type: safe.type,
                    bankName: safe.bankName,
                    accountNumber: safe.accountNumber,
                    currentBalance: runningBalance,
                    initialBalance: Number(safe.initialBalance),
                    currency: safe.currency
                },
                statement: entriesWithBalance.reverse() // Most recent first for display
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get Office Finances summary KPI metrics and recent transactions
 * @route   GET /api/safes/office-summary
 * @access  Private
 */
export const getOfficeFinancesSummary = async (req, res, next) => {
    try {
        const tenantId = req.user.tenantId;

        // 1. Office Profits:
        // A) Management fees recognized from projects
        const feeTxs = await prisma.transaction.aggregate({
            where: {
                tenantId,
                status: 'APPROVED',
                category: 'MANAGEMENT_FEE_TRANSFER'
            },
            _sum: { amount: true }
        });
        const totalManagementFees = Number(feeTxs._sum.amount || 0);

        // B) Any direct office income (income with isOfficeExpense: true or no projectId)
        const directOfficeIncome = await prisma.transaction.aggregate({
            where: {
                tenantId,
                status: 'APPROVED',
                type: 'INCOME',
                OR: [
                    { isOfficeExpense: true },
                    { projectId: null }
                ]
            },
            _sum: { amount: true }
        });
        const totalDirectIncome = Number(directOfficeIncome._sum.amount || 0);
        const totalOfficeProfit = totalManagementFees + totalDirectIncome;

        // 2. Office Expenses:
        // Any approved expense marked isOfficeExpense: true OR has no projectId
        const officeExpensesAgg = await prisma.transaction.aggregate({
            where: {
                tenantId,
                status: 'APPROVED',
                type: 'EXPENSE',
                category: { not: 'MANAGEMENT_FEE_TRANSFER' },
                OR: [
                    { isOfficeExpense: true },
                    { projectId: null }
                ]
            },
            _sum: { amount: true }
        });
        const totalOfficeExpenses = Number(officeExpensesAgg._sum.amount || 0);

        // Net Operating Profit
        const netOfficeProfit = totalOfficeProfit - totalOfficeExpenses;

        // 3. Total Liquidity in Company Safes:
        const activeSafes = await prisma.companySafe.findMany({
            where: { tenantId, isActive: true },
            select: { balance: true }
        });
        const totalLiquidFunds = activeSafes.reduce((sum, s) => sum + Number(s.balance || 0), 0);

        // 4. Breakdown of Office Expenses by category
        const officeExpenses = await prisma.transaction.findMany({
            where: {
                tenantId,
                status: 'APPROVED',
                type: 'EXPENSE',
                category: { not: 'MANAGEMENT_FEE_TRANSFER' },
                OR: [
                    { isOfficeExpense: true },
                    { projectId: null }
                ]
            },
            select: { category: true, amount: true }
        });

        const categoryBreakdownMap = {};
        officeExpenses.forEach(tx => {
            const cat = tx.category || 'OTHER';
            categoryBreakdownMap[cat] = (categoryBreakdownMap[cat] || 0) + Number(tx.amount || 0);
        });

        const categoryBreakdown = Object.entries(categoryBreakdownMap)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);

        // 5. Recent Office Transactions (last 25)
        const recentOfficeTransactions = await prisma.transaction.findMany({
            where: {
                tenantId,
                OR: [
                    { isOfficeExpense: true },
                    { projectId: null },
                    { category: 'MANAGEMENT_FEE_TRANSFER' }
                ]
            },
            take: 25,
            orderBy: { transactionDate: 'desc' },
            include: {
                user: { select: { id: true, name: true } },
                safe: { select: { id: true, name: true, nameAr: true } },
                project: { select: { id: true, name: true } }
            }
        });

        res.status(200).json({
            success: true,
            data: {
                totalOfficeProfit,
                totalManagementFees,
                totalDirectIncome,
                totalOfficeExpenses,
                netOfficeProfit,
                totalLiquidFunds,
                categoryBreakdown,
                recentTransactions: recentOfficeTransactions
            }
        });
    } catch (error) {
        next(error);
    }
};
