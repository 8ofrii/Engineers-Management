import prisma from './prisma.js';
import logger from './logger.js';

// Field names that must NEVER appear in the audit log even if a controller
// accidentally passes them in. Defense in depth — we still expect controllers
// to pass clean snapshots, but this is the last line.
const REDACT_FIELDS = new Set([
    'password',
    'newPassword',
    'currentPassword',
    'verificationCode',
    'resetPasswordToken',
    'verificationExpires',
    'resetPasswordExpire'
]);

const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (REDACT_FIELDS.has(k)) continue;
        out[k] = sanitize(v);
    }
    return out;
};

/**
 * Persist an audit-log entry. Fire-and-forget by design: a failed audit
 * write should never break the caller's flow. We log the failure but
 * don't throw.
 *
 * @param {Object} params
 * @param {string} params.action     CREATE | UPDATE | DELETE | APPROVE | REJECT | FUND | RETURN | ROLE_CHANGE | LOGIN | INVITE
 * @param {string} params.entity     Project | Client | Transaction | User | Role | Custody | ...
 * @param {string} params.entityId
 * @param {string} params.userId     The actor (req.user.id)
 * @param {string} [params.tenantId]
 * @param {Object} [params.before]   Snapshot before the change
 * @param {Object} [params.after]    Snapshot after the change
 * @param {Object} [params.metadata] Optional extras (reason, ip, etc.)
 */
export const audit = async (params) => {
    try {
        await prisma.auditLog.create({
            data: {
                action: params.action,
                entity: params.entity,
                entityId: params.entityId,
                userId: params.userId,
                tenantId: params.tenantId || null,
                before: params.before ? sanitize(params.before) : null,
                after: params.after ? sanitize(params.after) : null,
                metadata: params.metadata || null
            }
        });
    } catch (err) {
        logger.warn({ err, params: { action: params.action, entity: params.entity, entityId: params.entityId } },
            'Audit log write failed');
    }
};

/**
 * Sugar for the most common pattern: "I just did X to entity Y, log it."
 */
export const auditFromReq = (req, params) => audit({
    ...params,
    userId: req.user?.id,
    tenantId: req.user?.tenantId,
    metadata: {
        ...(params.metadata || {}),
        ip: req.ip,
        userAgent: req.headers['user-agent']?.slice(0, 200)
    }
});
