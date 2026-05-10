// Regression tests for transactionApprovalController (extracted in c48f3c1).
//
// Focus: guard clauses + multi-tenant isolation + the approval-threshold
// authorization branch. These are the first lines of defense against money
// being moved by the wrong actor or against the wrong record.
//
// We deliberately do NOT exercise the full prisma.$transaction() body of
// approveTransaction here — that path has six "LINK" steps (status update,
// project safe deduction, profit transfer, work-order rollup, custody
// clearance, material batch creation, negative-safe alert) that each
// deserve dedicated unit tests with a real DB. This file covers the
// fast-failing surface that a bad request would hit first.
//
// Reference: tests/chat.controller.test.js for the established mock pattern.

import { describe, test, expect, beforeEach, vi } from 'vitest';

const prismaMock = {
    transaction: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn()
    },
    notification: { create: vi.fn() },
    user: { update: vi.fn() },
    tenant: { findUnique: vi.fn() },
    $transaction: vi.fn()
};
vi.mock('../lib/prisma.js', () => ({ default: prismaMock }));

// auditFromReq is fire-and-forget — we don't assert on it, just stub it
// so the controllers don't throw when they emit audit entries.
vi.mock('../lib/audit.js', () => ({
    auditFromReq: vi.fn().mockResolvedValue(undefined)
}));

const {
    getPendingApprovals,
    submitTransaction,
    approveTransaction,
    rejectTransaction
} = await import('../controllers/transactionApprovalController.js');

const buildReqRes = (overrides = {}) => {
    const status = vi.fn(function () { return this; });
    const json = vi.fn(function () { return this; });
    const res = { status, json };
    const req = {
        body: {},
        params: {},
        user: { id: 'user-mgr', tenantId: 'tenant-1', role: 'PROJECT_MANAGER', name: 'Mgr' },
        ...overrides
    };
    return { req, res };
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe('getPendingApprovals', () => {
    test('filters by status=PENDING_APPROVAL AND tenantId (multi-tenant isolation)', async () => {
        prismaMock.transaction.findMany.mockResolvedValueOnce([]);

        const { req, res } = buildReqRes();
        await getPendingApprovals(req, res, () => {});

        expect(prismaMock.transaction.findMany).toHaveBeenCalledTimes(1);
        const where = prismaMock.transaction.findMany.mock.calls[0][0].where;
        expect(where.status).toBe('PENDING_APPROVAL');
        // Critical: a missing tenantId filter would expose other tenants' queues.
        expect(where.tenantId).toBe('tenant-1');
    });

    test('responds with { success, count, data } shape', async () => {
        const fake = [{ id: 't1' }, { id: 't2' }];
        prismaMock.transaction.findMany.mockResolvedValueOnce(fake);

        const { req, res } = buildReqRes();
        await getPendingApprovals(req, res, () => {});

        const payload = res.json.mock.calls[0][0];
        expect(payload.success).toBe(true);
        expect(payload.count).toBe(2);
        expect(payload.data).toBe(fake);
    });
});

describe('submitTransaction', () => {
    test('returns 404 when transaction not found in tenant', async () => {
        prismaMock.transaction.findFirst.mockResolvedValueOnce(null);

        const { req, res } = buildReqRes({ params: { id: 'tx-missing' } });
        await submitTransaction(req, res, () => {});

        expect(res.status).toHaveBeenCalledWith(404);
        // The findFirst call must scope by tenantId or it leaks across tenants.
        const where = prismaMock.transaction.findFirst.mock.calls[0][0].where;
        expect(where.tenantId).toBe('tenant-1');
    });

    test('rejects with 400 when status is not DRAFT', async () => {
        prismaMock.transaction.findFirst.mockResolvedValueOnce({
            id: 'tx-1',
            status: 'APPROVED',  // wrong state
            createdBy: 'user-mgr',
            project: { engineerId: 'eng-1' }
        });

        const { req, res } = buildReqRes({ params: { id: 'tx-1' } });
        await submitTransaction(req, res, () => {});

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].message).toMatch(/draft/i);
    });

    test('rejects with 403 when caller did not create the transaction', async () => {
        prismaMock.transaction.findFirst.mockResolvedValueOnce({
            id: 'tx-1',
            status: 'DRAFT',
            createdBy: 'someone-else',  // not req.user.id
            project: { engineerId: 'eng-1' }
        });

        const { req, res } = buildReqRes({ params: { id: 'tx-1' } });
        await submitTransaction(req, res, () => {});

        expect(res.status).toHaveBeenCalledWith(403);
    });
});

describe('approveTransaction', () => {
    test('rejects with 400 when transaction is not in PENDING_APPROVAL state', async () => {
        prismaMock.transaction.findFirst.mockResolvedValueOnce({
            id: 'tx-1',
            status: 'DRAFT',  // not pending
            amount: 100,
            type: 'EXPENSE',
            user: {},
            project: {},
            projectCostItem: null
        });

        const { req, res } = buildReqRes({ params: { id: 'tx-1' } });
        await approveTransaction(req, res, () => {});

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 403 with requiredRole + callerRole when caller cannot meet threshold', async () => {
        // ENGINEER tries to approve a 100,000 EGP expense — defaults require
        // PROJECT_MANAGER+ for that tier. ensureCanApprove throws
        // InsufficientApprovalRankError, which the controller catches and
        // converts to a 403 with structured fields the FE displays.
        prismaMock.transaction.findFirst.mockResolvedValueOnce({
            id: 'tx-1',
            status: 'PENDING_APPROVAL',
            amount: 100000,
            type: 'EXPENSE',
            user: {},
            project: {},
            projectCostItem: null
        });
        prismaMock.tenant.findUnique.mockResolvedValueOnce({
            approvalThresholds: null  // use defaults from lib/approvalThresholds.js
        });

        const { req, res } = buildReqRes({
            params: { id: 'tx-1' },
            user: { id: 'eng-1', tenantId: 'tenant-1', role: 'ENGINEER', name: 'Eng' }
        });
        await approveTransaction(req, res, () => {});

        expect(res.status).toHaveBeenCalledWith(403);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(false);
        // Structured fields the FE uses to render the upgrade prompt.
        expect(body).toHaveProperty('requiredRole');
        expect(body).toHaveProperty('callerRole', 'ENGINEER');
    });

    test('returns 404 when transaction not found in tenant', async () => {
        prismaMock.transaction.findFirst.mockResolvedValueOnce(null);

        const { req, res } = buildReqRes({ params: { id: 'tx-missing' } });
        await approveTransaction(req, res, () => {});

        expect(res.status).toHaveBeenCalledWith(404);
        // Same multi-tenant guarantee as submit/reject.
        const where = prismaMock.transaction.findFirst.mock.calls[0][0].where;
        expect(where.tenantId).toBe('tenant-1');
    });
});

describe('rejectTransaction', () => {
    test('rejects with 400 when transaction is not in PENDING_APPROVAL state', async () => {
        prismaMock.transaction.findFirst.mockResolvedValueOnce({
            id: 'tx-1',
            status: 'APPROVED',  // already done
            amount: 500,
            createdBy: 'eng-1'
        });

        const { req, res } = buildReqRes({
            params: { id: 'tx-1' },
            body: { reason: 'no receipt' }
        });
        await rejectTransaction(req, res, () => {});

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 when transaction not found in tenant', async () => {
        prismaMock.transaction.findFirst.mockResolvedValueOnce(null);

        const { req, res } = buildReqRes({
            params: { id: 'tx-missing' },
            body: { reason: 'gone' }
        });
        await rejectTransaction(req, res, () => {});

        expect(res.status).toHaveBeenCalledWith(404);
        const where = prismaMock.transaction.findFirst.mock.calls[0][0].where;
        expect(where.tenantId).toBe('tenant-1');
    });
});
