import prisma from '../lib/prisma.js';
import { auditFromReq } from '../lib/audit.js';

// @desc    Get all materials
// @route   GET /api/materials
// @access  Private
export const getMaterials = async (req, res, next) => {
    try {
        const materials = await prisma.material.findMany({
            where: {
                tenantId: req.user.tenantId,
                deletedAt: null
            },
            include: {
                supplier: {
                    select: { name: true }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        res.status(200).json({
            success: true,
            count: materials.length,
            data: materials
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single material
// @route   GET /api/materials/:id
// @access  Private
export const getMaterial = async (req, res, next) => {
    try {
        const material = await prisma.material.findFirst({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId,
                deletedAt: null
            }
        });

        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material not found or unauthorized'
            });
        }

        res.status(200).json({
            success: true,
            data: material
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create material
// @route   POST /api/materials
// @access  Private
export const createMaterial = async (req, res, next) => {
    try {
        const material = await prisma.material.create({
            data: {
                ...req.body,
                tenantId: req.user.tenantId
            }
        });

        await auditFromReq(req, {
            action: 'CREATE',
            entity: 'Material',
            entityId: material.id,
            after: material
        });

        res.status(201).json({
            success: true,
            data: material
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update material
// @route   PUT /api/materials/:id
// @access  Private
export const updateMaterial = async (req, res, next) => {
    try {
        const before = await prisma.material.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }
        });

        if (!before) {
            return res.status(404).json({
                success: false,
                message: 'Material not found or unauthorized'
            });
        }

        const material = await prisma.material.update({
            where: { id: req.params.id },
            data: req.body
        });

        await auditFromReq(req, {
            action: 'UPDATE',
            entity: 'Material',
            entityId: material.id,
            before,
            after: material
        });

        res.status(200).json({
            success: true,
            data: material
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Restore a soft-deleted material.
// @route   PUT /api/materials/:id/restore
// @access  Private (Admin / Super Admin)
export const restoreMaterial = async (req, res, next) => {
    try {
        const material = await prisma.material.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: { not: null } }
        });

        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Soft-deleted material not found'
            });
        }

        const restored = await prisma.material.update({
            where: { id: req.params.id },
            data: { deletedAt: null }
        });

        await auditFromReq(req, {
            action: 'RESTORE',
            entity: 'Material',
            entityId: restored.id,
            after: restored
        });

        res.status(200).json({ success: true, data: restored });
    } catch (error) {
        next(error);
    }
};

// @desc    Soft-delete material
// @route   DELETE /api/materials/:id
// @access  Private
export const deleteMaterial = async (req, res, next) => {
    try {
        const before = await prisma.material.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }
        });

        if (!before) {
            return res.status(404).json({
                success: false,
                message: 'Material not found or unauthorized'
            });
        }

        await prisma.material.update({
            where: { id: req.params.id },
            data: { deletedAt: new Date() }
        });

        await auditFromReq(req, {
            action: 'DELETE',
            entity: 'Material',
            entityId: before.id,
            before
        });

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Recharge/Add stock to existing material & record financial transaction
// @route   POST /api/materials/:id/recharge
// @access  Private
export const rechargeMaterial = async (req, res, next) => {
    try {
        const {
            quantity,
            notes,
            projectId,
            unitPrice,
            paymentMethod,
            payerUserId,
            costCenter,
            supplierName,
            createTransaction
        } = req.body;

        const addQty = Number(quantity);
        if (!addQty || addQty <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid positive quantity to recharge'
            });
        }

        const material = await prisma.material.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }
        });

        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material not found or unauthorized'
            });
        }

        const effectivePrice = (unitPrice !== undefined && unitPrice !== null && unitPrice !== '')
            ? Number(unitPrice)
            : (Number(material.unitPrice) || 0);
        const totalCost = addQty * effectivePrice;
        const actualPayer = payerUserId || req.user.id;

        const { updatedMaterial, transactionRecord } = await prisma.$transaction(async (tx) => {
            const mat = await tx.material.update({
                where: { id: material.id },
                data: {
                    stockLevel: { increment: addQty },
                    ...(effectivePrice > 0 ? { unitPrice: effectivePrice } : {})
                }
            });

            // 1. Create a financial expense transaction if total cost > 0 and not explicitly disabled
            let createdTx = null;
            if (createTransaction !== false && totalCost > 0) {
                createdTx = await tx.transaction.create({
                    data: {
                        tenantId: req.user.tenantId,
                        projectId: projectId || null,
                        type: 'EXPENSE',
                        category: 'MATERIALS',
                        amount: totalCost,
                        description: notes || `شحن رصيد مخزن: ${material.nameAr || material.name} (+${addQty} ${material.unit} @ ${effectivePrice} EGP)`,
                        costCenter: costCenter || (projectId ? 'المشروع' : 'المخزن الرئيسي'),
                        paymentMethod: paymentMethod || 'CUSTODY_WALLET',
                        transactionTo: supplierName || 'شراء خامات مخزنية',
                        payerUserId: actualPayer,
                        status: 'APPROVED',
                        createdBy: req.user.id,
                        transactionDate: new Date()
                    }
                });

                // Deduct from project safe if allocated to a specific project
                if (projectId) {
                    await tx.project.update({
                        where: { id: projectId, tenantId: req.user.tenantId },
                        data: {
                            projectSafeBalance: { decrement: totalCost },
                            actualCost: { increment: totalCost }
                        }
                    });
                }
            }

            // 2. If a project is selected, also create a material batch for site usage tracking
            if (projectId) {
                await tx.materialBatch.create({
                    data: {
                        projectId,
                        materialId: material.id,
                        originalReceiptId: createdTx?.id || null,
                        description: `${material.nameAr || material.name} (+${addQty} ${material.unit})`,
                        initialValue: totalCost,
                        remainingValue: totalCost,
                        status: 'AVAILABLE',
                        recordedBy: actualPayer,
                        tenantId: req.user.tenantId
                    }
                });
            }

            return { updatedMaterial: mat, transactionRecord: createdTx };
        });

        await auditFromReq(req, {
            action: 'UPDATE',
            entity: 'Material',
            entityId: material.id,
            before: material,
            after: updatedMaterial,
            metadata: {
                rechargedQuantity: addQty,
                unitPrice: effectivePrice,
                totalCost,
                transactionId: transactionRecord?.id,
                notes,
                projectId
            }
        });

        res.status(200).json({
            success: true,
            data: updatedMaterial,
            transaction: transactionRecord,
            message: `Successfully recharged ${addQty} ${material.unit} to ${material.nameAr || material.name}${totalCost > 0 ? ` (Recorded Expense: ${totalCost.toLocaleString()} EGP)` : ''}`
        });
    } catch (error) {
        next(error);
    }
};
