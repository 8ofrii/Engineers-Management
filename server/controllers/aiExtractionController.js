import fs from 'fs';
import * as aiService from '../services/aiService.js';
import { auditFromReq } from '../lib/audit.js';
import logger from '../lib/logger.js';

// Map the AI's high-level category enum onto a transaction-form `type`.
// Specific Arabic sub-category is left for the user to pick — AI can't reliably
// hit 1-of-25 fine-grained categories, but high-level intent is solid.
const draftFromVoice = (parsed) => ({
    type: 'EXPENSE',
    amount: parsed?.amount ?? null,
    category: parsed?.category ?? 'OTHER',
    description: parsed?.summary ?? '',
    payee: parsed?.vendor ?? null,
    vendor: parsed?.vendor ?? null,
    isStockPurchase: !!parsed?.is_stock_purchase,
    items: Array.isArray(parsed?.items) ? parsed.items : []
});

const draftFromReceipt = (parsed) => ({
    type: 'EXPENSE',
    amount: parsed?.totalAmount ?? null,
    subtotal: parsed?.subtotal ?? null,
    taxAmount: parsed?.taxAmount ?? null,
    currency: parsed?.currency ?? 'EGP',
    transactionDate: parsed?.transactionDate ?? null,
    category: parsed?.category ?? 'OTHER',
    description: parsed?.summary ?? '',
    payee: parsed?.vendor ?? null,
    vendor: parsed?.vendor ?? null,
    items: Array.isArray(parsed?.items) ? parsed.items : []
});

/**
 * POST /api/ai/extract/voice — multipart audio → draft transaction JSON.
 * Audio file is deleted after processing regardless of outcome.
 */
export const extractFromVoice = async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Audio file is required (field "audio")' });
    }
    const filePath = req.file.path;

    try {
        const result = await aiService.processVoiceNote(filePath);
        const draft = draftFromVoice(result.parsed_data);

        // Audit the AI call. Don't store raw transcript — could contain PII.
        // We log only metadata: did it work, what category was inferred, file size.
        auditFromReq(req, {
            action: 'AI_EXTRACT',
            entity: 'TransactionDraft',
            entityId: 'voice',
            metadata: {
                source: 'voice',
                provider: 'openai:whisper-1+gpt-4o-mini',
                category: draft.category,
                amount: draft.amount,
                durationBytes: req.file.size
            }
        });

        return res.json({
            success: true,
            source: 'voice',
            rawText: result.raw_text,
            draft
        });
    } catch (err) {
        logger.error({ err }, 'AI voice extraction failed');
        return res.status(500).json({ success: false, message: 'Voice extraction failed' });
    } finally {
        // Belt and braces — chatController already does this, but if anything
        // before the await throws, we'd otherwise leak the temp file.
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
    }
};

/**
 * POST /api/ai/extract/receipt — multipart image → draft transaction JSON.
 * Image is held in memory only; never written to disk or S3.
 */
export const extractFromReceipt = async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Image file is required (field "image")' });
    }

    try {
        const parsed = await aiService.processReceiptImage(req.file.buffer, req.file.mimetype);
        const draft = draftFromReceipt(parsed);

        auditFromReq(req, {
            action: 'AI_EXTRACT',
            entity: 'TransactionDraft',
            entityId: 'receipt',
            metadata: {
                source: 'receipt',
                provider: 'openai:gpt-4o-mini-vision',
                category: draft.category,
                amount: draft.amount,
                vendor: draft.vendor,
                confidence: parsed?.confidence ?? null,
                imageBytes: req.file.size
            }
        });

        return res.json({
            success: true,
            source: 'receipt',
            confidence: parsed?.confidence ?? 'medium',
            draft
        });
    } catch (err) {
        logger.error({ err }, 'AI receipt extraction failed');
        return res.status(500).json({ success: false, message: 'Receipt extraction failed' });
    }
};
