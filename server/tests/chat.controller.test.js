// Regression test for chatController.sendMessage.
//
// Three real bugs landed in this controller across two sessions:
//   1. Wrote `type:` to a column called `messageType` → P2 validation error
//   2. Returned a flat response shape that broke the FE's
//      `data.data.userMessage` / `data.data.aiResponse` access pattern
//   3. Wrote `intent: 'CREATE_TRANSACTION'` into a `MessageIntent` enum
//      that doesn't include that value → another P2 validation error
//
// All three would have been caught by an integration test that just
// asserts the controller's prisma writes use the right field names AND
// the response shape matches what the FE expects. That's this test.

import { describe, test, expect, beforeEach, vi } from 'vitest';

const prismaMock = {
    chatMessage: { create: vi.fn() }
};
vi.mock('../lib/prisma.js', () => ({ default: prismaMock }));

const aiServiceMock = {
    processVoiceNote: vi.fn()
};
vi.mock('../services/aiService.js', () => aiServiceMock);

// We don't actually call OpenAI in this test — mock the SDK so even if
// a future code path leaks past the mocked aiService it doesn't network.
vi.mock('openai', () => ({
    default: class { constructor() {} }
}));

vi.mock('fs', () => ({
    default: { existsSync: () => false, unlinkSync: () => {} },
    existsSync: () => false,
    unlinkSync: () => {}
}));

const { sendMessage } = await import('../controllers/chatController.js');

const buildReqRes = (overrides = {}) => {
    const status = vi.fn(function () { return this; });
    const json = vi.fn(function () { return this; });
    const res = { status, json };
    const req = {
        body: {},
        user: { id: 'user-1', tenantId: 'tenant-1' },
        ...overrides
    };
    return { req, res };
};

beforeEach(() => {
    vi.clearAllMocks();
    // Default: prisma.chatMessage.create echoes back what was passed,
    // with a stable id/timestamp so we can assert response shape.
    prismaMock.chatMessage.create.mockImplementation(({ data }) =>
        Promise.resolve({ ...data, id: `msg-${Math.random()}`, createdAt: new Date('2026-01-01') })
    );
});

describe('chatController.sendMessage — voice path', () => {
    test('writes messageType (not type) on the user-message row', async () => {
        aiServiceMock.processVoiceNote.mockResolvedValueOnce({
            raw_text: 'gebna 50 shkarat asmant',
            parsed_data: {
                summary: 'شراء أسمنت',
                amount: 25000,
                vendor: 'Cairo Cement',
                category: 'MATERIALS',
                is_stock_purchase: true,
                items: [{ name: 'cement', quantity: 50, unit: 'shkara' }]
            }
        });

        const { req, res } = buildReqRes({ file: { path: '/tmp/v.webm' } });
        await sendMessage(req, res, () => {});

        // First create() call is the user message
        const firstCall = prismaMock.chatMessage.create.mock.calls[0][0].data;
        expect(firstCall).toHaveProperty('messageType', 'AUDIO');
        expect(firstCall).not.toHaveProperty('type'); // the historical bug
        expect(firstCall).toHaveProperty('tenantId', 'tenant-1');
    });

    test('writes a valid MessageIntent enum value, not the FE action key', async () => {
        aiServiceMock.processVoiceNote.mockResolvedValueOnce({
            raw_text: 'gebna 50 shkarat asmant',
            parsed_data: {
                summary: 'شراء أسمنت',
                amount: 25000,
                category: 'MATERIALS',
                items: []
            }
        });

        const { req, res } = buildReqRes({ file: { path: '/tmp/v.webm' } });
        await sendMessage(req, res, () => {});

        // Second create() is the AI message — it must store a valid enum
        const aiCall = prismaMock.chatMessage.create.mock.calls[1][0].data;
        const VALID_INTENTS = ['ADD_TRANSACTION', 'ADD_PROJECT', 'ADD_CLIENT', 'ADD_SUPPLIER',
            'ADD_MATERIAL', 'ADD_WORKMAN', 'QUERY', 'GENERAL'];
        expect(VALID_INTENTS).toContain(aiCall.intent);
        // Specifically: voice with parsed_data → CREATE_TRANSACTION FE action → ADD_TRANSACTION DB intent
        expect(aiCall.intent).toBe('ADD_TRANSACTION');
        // FE-facing toolData.action must still be CREATE_TRANSACTION (chat.jsx confirm flow)
        expect(aiCall.extractedData.action).toBe('CREATE_TRANSACTION');
    });

    test('returns the { userMessage, aiResponse } shape the FE expects', async () => {
        aiServiceMock.processVoiceNote.mockResolvedValueOnce({
            raw_text: 'voice content',
            parsed_data: { summary: 's', amount: 100, category: 'OTHER', items: [] }
        });

        const { req, res } = buildReqRes({ file: { path: '/tmp/v.webm' } });
        await sendMessage(req, res, () => {});

        const payload = res.json.mock.calls[0][0];
        expect(payload.success).toBe(true);
        expect(payload.data).toHaveProperty('userMessage.id');
        expect(payload.data).toHaveProperty('userMessage.content');
        expect(payload.data).toHaveProperty('userMessage.createdAt');
        expect(payload.data).toHaveProperty('aiResponse.id');
        expect(payload.data).toHaveProperty('aiResponse.content');
        expect(payload.data).toHaveProperty('aiResponse.createdAt');
        expect(payload.data).toHaveProperty('transcript', 'voice content');
        expect(payload.data).toHaveProperty('extractedData.action', 'CREATE_TRANSACTION');
    });

    test('maps OpenAI quota errors to a clear 503 (not a generic 500)', async () => {
        const quotaErr = Object.assign(new Error('insufficient_quota'), {
            status: 429,
            code: 'insufficient_quota'
        });
        aiServiceMock.processVoiceNote.mockRejectedValueOnce(quotaErr);

        const { req, res } = buildReqRes({ file: { path: '/tmp/v.webm' } });
        await sendMessage(req, res, () => {});

        expect(res.status).toHaveBeenCalledWith(503);
        const body = res.json.mock.calls[0][0];
        expect(body).toHaveProperty('code', 'AI_QUOTA_EXHAUSTED');
        expect(body.message).toMatch(/quota|administrator/i);
    });
});
