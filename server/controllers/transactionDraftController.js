import prisma from '../lib/prisma.js';
import { auditFromReq } from '../lib/audit.js';
import { deleteByUrl } from '../lib/storage.js';
import logger from '../lib/logger.js';
import { matchExtractionToTenant } from '../services/matchingService.js';

// Tenant-scoped lookup with the standard 404-don't-leak-existence pattern.
const findOwn = (id, req) => prisma.transactionDraft.findFirst({
    where: { id, tenantId: req.user.tenantId }
});

/**
 * GET /api/transaction-drafts
 *   Engineers only see their own drafts. Manager/admin see all in the tenant.
 *   Defaults to status=PENDING_REVIEW so the queue stays focused.
 */
export const listDrafts = async (req, res) => {
    const { status = 'PENDING_REVIEW', source, limit = 50 } = req.query;
    const isElevated = ['ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT'].includes(req.user.role);

    const where = {
        tenantId: req.user.tenantId,
        ...(status && status !== 'ALL' ? { status } : {}),
        ...(source ? { source } : {}),
        ...(isElevated ? {} : { createdById: req.user.id })
    };

    const drafts = await prisma.transactionDraft.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(limit) || 50, 200),
        include: {
            createdBy: { select: { id: true, name: true, email: true } }
        }
    });
    res.json({ success: true, count: drafts.length, data: drafts });
};

/**
 * GET /api/transaction-drafts/:id
 */
export const getDraft = async (req, res) => {
    const draft = await findOwn(req.params.id, req);
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });

    // Engineers can only see their own drafts (managers/admins/accountants see all)
    if (
        !['ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT'].includes(req.user.role) &&
        draft.createdById !== req.user.id
    ) {
        return res.status(404).json({ success: false, message: 'Draft not found' });
    }

    res.json({ success: true, data: draft });
};

/**
 * PUT /api/transaction-drafts/:id
 *   User can edit the matched fields before committing. We only let them
 *   touch matchedDraft — the original media + raw AI output are immutable.
 */
export const updateDraft = async (req, res) => {
    const draft = await findOwn(req.params.id, req);
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
    if (draft.status !== 'PENDING_REVIEW') {
        return res.status(400).json({ success: false, message: 'Only pending drafts can be edited' });
    }
    if (draft.createdById !== req.user.id &&
        !['ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'You cannot edit another user\'s draft' });
    }

    const { matchedDraft } = req.body;
    if (!matchedDraft || typeof matchedDraft !== 'object') {
        return res.status(400).json({ success: false, message: 'matchedDraft (object) required' });
    }

    const updated = await prisma.transactionDraft.update({
        where: { id: draft.id },
        data: { matchedDraft }
    });

    auditFromReq(req, {
        action: 'UPDATE',
        entity: 'TransactionDraft',
        entityId: draft.id,
        before: { matchedDraft: draft.matchedDraft },
        after: { matchedDraft: updated.matchedDraft }
    });

    res.json({ success: true, data: updated });
};

/**
 * POST /api/transaction-drafts/:id/rematch
 *   Re-runs the matching service against the (possibly newly added) tenant
 *   data. Useful if the user just created a Supplier that the original
 *   extraction couldn't find a match for.
 */
export const rematchDraft = async (req, res) => {
    const draft = await findOwn(req.params.id, req);
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
    if (draft.status !== 'PENDING_REVIEW') {
        return res.status(400).json({ success: false, message: 'Only pending drafts can be rematched' });
    }

    const matched = await matchExtractionToTenant(draft.rawExtraction, draft.source, req.user.tenantId);

    const updated = await prisma.transactionDraft.update({
        where: { id: draft.id },
        data: { matchedDraft: matched.draft }
    });
    res.json({
        success: true,
        data: { ...updated, matches: matched.matches }
    });
};

/**
 * POST /api/transaction-drafts/:id/commit
 *   Links a freshly-created Transaction to its source draft and marks the
 *   draft COMMITTED. The transaction itself is created via the regular
 *   POST /api/transactions endpoint so the V1.2 profit-engine logic runs
 *   once and only once. We just record the link here.
 */
export const commitDraft = async (req, res) => {
    const draft = await findOwn(req.params.id, req);
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
    if (draft.status !== 'PENDING_REVIEW') {
        return res.status(400).json({ success: false, message: 'Draft already committed or discarded' });
    }
    if (draft.createdById !== req.user.id &&
        !['ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'You cannot commit another user\'s draft' });
    }

    const { transactionId } = req.body;
    if (!transactionId) {
        return res.status(400).json({ success: false, message: 'transactionId required' });
    }

    // Make sure the transaction exists in this tenant — closes the door on a
    // user committing a foreign tenant's transaction id.
    const tx = await prisma.transaction.findFirst({
        where: { id: transactionId, tenantId: req.user.tenantId }
    });
    if (!tx) {
        return res.status(400).json({ success: false, message: 'Transaction not found in your tenant' });
    }

    const updated = await prisma.transactionDraft.update({
        where: { id: draft.id },
        data: {
            status: 'COMMITTED',
            committedTransactionId: tx.id,
            committedAt: new Date()
        }
    });

    auditFromReq(req, {
        action: 'COMMIT',
        entity: 'TransactionDraft',
        entityId: draft.id,
        metadata: { transactionId: tx.id }
    });

    res.json({ success: true, data: updated });
};

/**
 * DELETE /api/transaction-drafts/:id
 *   Soft-discard. Hard-delete is admin-only. Discarding cleans up the
 *   stored audio/image so we don't keep orphan media.
 */
export const discardDraft = async (req, res) => {
    const draft = await findOwn(req.params.id, req);
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
    if (draft.createdById !== req.user.id &&
        !['ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'You cannot discard another user\'s draft' });
    }

    // Best-effort media cleanup (don't fail the discard if storage is flaky)
    if (draft.originalMediaUrl) {
        await deleteByUrl(draft.originalMediaUrl).catch(err =>
            logger.warn({ err, draftId: draft.id }, 'Failed to delete draft media — orphan possible'));
    }

    const updated = await prisma.transactionDraft.update({
        where: { id: draft.id },
        data: { status: 'DISCARDED', discardedAt: new Date(), originalMediaUrl: null }
    });

    auditFromReq(req, {
        action: 'DISCARD',
        entity: 'TransactionDraft',
        entityId: draft.id
    });

    res.json({ success: true, data: updated });
};
