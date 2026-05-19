import prisma from '../lib/prisma.js';

// @desc    List audit-log entries for the caller's tenant.
// @route   GET /api/audit-logs
// @access  Private (Admin / Super Admin)
//
// Query params:
//   entity, entityId, action, userId       — exact-match filters
//   limit  (1..200, default 50)
//   cursor (audit-log id to start after, for pagination)
export const listAuditLogs = async (req, res, next) => {
    try {
        const { entity, entityId, action, userId } = req.query;
        const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
        const cursor = req.query.cursor;

        const where = { tenantId: req.user.tenantId };
        if (entity) where.entity = String(entity);
        if (entityId) where.entityId = String(entityId);
        if (action) where.action = String(action);
        if (userId) where.userId = String(userId);

        const logs = await prisma.auditLog.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true, role: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
        });

        const nextCursor = logs.length === limit ? logs[logs.length - 1].id : null;

        res.status(200).json({
            success: true,
            count: logs.length,
            nextCursor,
            data: logs
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get audit history for a specific entity (any tenant member can see
//          history of resources they have access to).
// @route   GET /api/audit-logs/:entity/:entityId
// @access  Private
export const getEntityAuditLogs = async (req, res, next) => {
    try {
        const { entity, entityId } = req.params;
        const logs = await prisma.auditLog.findMany({
            where: {
                tenantId: req.user.tenantId,
                entity,
                entityId
            },
            include: {
                user: { select: { id: true, name: true, email: true, role: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        next(error);
    }
};
