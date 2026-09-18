import fs from 'fs';
import * as aiService from '../services/aiService.js';
import { matchExtractionToTenant } from '../services/matchingService.js';
import { uploadBuffer, uploadFile } from '../lib/storage.js';
import prisma from '../lib/prisma.js';
import { auditFromReq } from '../lib/audit.js';
import logger from '../lib/logger.js';
import { aiErrorResponse } from '../lib/aiErrors.js';
import { enforceAiBudget } from '../lib/aiUsage.js';

/**
 * Fetch complete tenant master data context for AI prompt injection and entity matching:
 * - Projects (id, name, code, location, linked client)
 * - Clients (id, name, company, phone)
 * - Suppliers (id, name, company, phone)
 * - Materials (id, name, nameAr, unit, unitPrice)
 * - Workmen / Laborers / Craftsmen (id, name, nameAr, trade, customTrade, phone, dailyRate)
 * - Users / Engineers (id, name, role)
 */
export const getTenantMasterDataContext = async (tenantId) => {
    if (!tenantId) return {};

    try {
        const [projects, clients, suppliers, materials, workmen, users] = await Promise.all([
            prisma.project.findMany({
                where: { tenantId, deletedAt: null },
                select: {
                    id: true,
                    name: true,
                    location: true,
                    client: { select: { id: true, name: true } }
                },
                take: 100
            }),
            prisma.client.findMany({
                where: { tenantId, deletedAt: null },
                select: { id: true, name: true, company: true, phone: true },
                take: 100
            }),
            prisma.supplier.findMany({
                where: { tenantId, deletedAt: null },
                select: { id: true, name: true, company: true, phone: true },
                take: 100
            }),
            prisma.material.findMany({
                where: { tenantId, deletedAt: null },
                select: { id: true, name: true, nameAr: true, unit: true, unitPrice: true },
                take: 100
            }),
            prisma.workman.findMany({
                where: { tenantId, deletedAt: null },
                select: { id: true, name: true, nameAr: true, trade: true, customTrade: true, phone: true, dailyRate: true },
                take: 100
            }),
            prisma.user.findMany({
                where: { tenantId, isActive: true },
                select: { id: true, name: true, role: true },
                take: 50
            })
        ]);

        return { projects, clients, suppliers, materials, workmen, users };
    } catch (err) {
        logger.warn({ err, tenantId }, 'Failed to fetch tenant master data context for AI');
        return {};
    }
};

/**
 * POST /api/ai/extract/voice
 * Multipart audio in field "audio". Persists a TransactionDraft and returns it
 * with the matched fields + S3 URL of the audio (so user can replay before
 * committing).
 */
export const extractFromVoice = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Audio file is required (field "audio")' });
    }
    const filePath = req.file.path;

    try {
        // Step 0 — protect the bill: refuse if this tenant has hit the monthly cap
        await enforceAiBudget(req.user.tenantId);

        // Fetch comprehensive master data context (projects, clients, suppliers, materials, workmen, users)
        const companyContext = await getTenantMasterDataContext(req.user.tenantId);

        // Step 1 — AI: transcribe + extract with full company context
        const clientTranscript = req.body.transcript || '';
        const aiResult = await aiService.processVoiceNote(filePath, clientTranscript, companyContext);

        // Step 2 — Persist the audio so the user can replay it later
        const audioUrl = await uploadFile(filePath, req.file.mimetype, 'audio/voice-drafts');

        // Step 3 — Match extraction against tenant DB (vendor, project, items, etc.)
        const matched = await matchExtractionToTenant(aiResult.parsed_data, 'VOICE', req.user.tenantId, req.user.id, aiResult.raw_text);

        // Step 4 — Persist the draft
        const draft = await prisma.transactionDraft.create({
            data: {
                tenantId: req.user.tenantId,
                createdById: req.user.id,
                source: 'VOICE',
                originalMediaUrl: audioUrl,
                originalMediaMime: req.file.mimetype,
                transcript: aiResult.raw_text,
                rawExtraction: aiResult.parsed_data,
                matchedDraft: matched.draft,
                confidence: aiResult.parsed_data?.confidence ?? null
            }
        });

        auditFromReq(req, {
            action: 'AI_EXTRACT',
            entity: 'TransactionDraft',
            entityId: draft.id,
            metadata: {
                source: 'voice',
                provider: 'micromind:gpt-5.6-luna-pro',
                category: matched.draft.category,
                amount: matched.draft.amount,
                bytes: req.file.size
            }
        });

        return res.status(201).json({
            success: true,
            draft: {
                ...draft,
                matches: matched.matches
            }
        });
    } catch (err) {
        if (err.code === 'AI_BUDGET_EXHAUSTED') {
            return res.status(429).json({
                success: false,
                code: 'AI_BUDGET_EXHAUSTED',
                message: `Monthly AI budget exhausted (${err.usage.count}/${err.usage.cap}). Contact your administrator.`,
                usage: err.usage
            });
        }
        logger.error({ err, code: err?.code, status: err?.status }, 'AI voice extraction failed');
        const { statusCode, body } = aiErrorResponse(err);
        return res.status(statusCode).json(body);
    } finally {
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
    }
};

/**
 * POST /api/ai/extract/receipt
 * Multipart image in field "image". Image is read from memory, sent to GPT-4o / MicroMind
 * vision, then persisted to S3 alongside the draft so user can re-view it.
 */
export const extractFromReceipt = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Image file is required (field "image")' });
    }

    try {
        await enforceAiBudget(req.user.tenantId);

        // Fetch comprehensive master data context
        const companyContext = await getTenantMasterDataContext(req.user.tenantId);

        const parsed = await aiService.processReceiptImage(req.file.buffer, req.file.mimetype, companyContext);
        const imageUrl = await uploadBuffer(req.file.buffer, req.file.mimetype, 'images/receipt-drafts');
        const matched = await matchExtractionToTenant(parsed, 'RECEIPT', req.user.tenantId, req.user.id, parsed?.description || parsed?.summary || '');

        const draft = await prisma.transactionDraft.create({
            data: {
                tenantId: req.user.tenantId,
                createdById: req.user.id,
                source: 'RECEIPT',
                originalMediaUrl: imageUrl,
                originalMediaMime: req.file.mimetype,
                rawExtraction: parsed,
                matchedDraft: matched.draft,
                confidence: parsed?.confidence ?? null
            }
        });

        auditFromReq(req, {
            action: 'AI_EXTRACT',
            entity: 'TransactionDraft',
            entityId: draft.id,
            metadata: {
                source: 'receipt',
                provider: 'openai:gpt-4o-mini-vision',
                category: matched.draft.category,
                amount: matched.draft.amount,
                vendor: matched.draft.supplierId ? 'matched' : 'unmatched',
                bytes: req.file.size
            }
        });

        return res.status(201).json({
            success: true,
            draft: {
                ...draft,
                matches: matched.matches
            }
        });
    } catch (err) {
        if (err.code === 'AI_BUDGET_EXHAUSTED') {
            return res.status(429).json({
                success: false,
                code: 'AI_BUDGET_EXHAUSTED',
                message: `Monthly AI budget exhausted (${err.usage.count}/${err.usage.cap}). Contact your administrator.`,
                usage: err.usage
            });
        }
        logger.error({ err, code: err?.code, status: err?.status }, 'AI receipt extraction failed');
        const { statusCode, body } = aiErrorResponse(err);
        return res.status(statusCode).json(body);
    }
};
