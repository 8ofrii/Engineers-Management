// Voice-driven transaction parsing endpoints. Extracted from
// transactionController.js so the latter can stay focused on CRUD +
// approval flow without dragging in the OpenAI SDK and fs handles.
//
// Two endpoints live here:
//
//   POST /api/transactions/analyze   → analyzeTransaction
//     Engineer records audio, server forwards to aiService.processVoiceNote
//     (which wraps Whisper + GPT extraction), returns the parsed JSON.
//     No DB write; the FE turns the result into a real transaction.
//     Currently called by client AddTransactionModal.jsx (transactionsAPI.analyze).
//
//   POST /api/transactions/ai-parse  → parseVoiceNote
//     Older direct-OpenAI variant of the same idea (Whisper inline, then
//     GPT-4o-mini with a hardcoded system prompt). No FE callers as of
//     this writing — kept for backward compatibility; consider deletion
//     after confirming no mobile/integration uses it.
//
// Note: a more capable sibling, aiExtractionController.extractFromVoice,
// already persists a TransactionDraft, enforces an AI budget, and runs
// the matching service. Future work should consolidate these three
// endpoints into one canonical pipeline.

import fs from 'fs';
import OpenAI from 'openai';
import * as aiService from '../services/aiService.js';
import { getTenantMasterDataContext } from './aiExtractionController.js';
import logger from '../lib/logger.js';

// Lazy initialization to ensure env vars are loaded
let openai = null;
const getOpenAI = () => {
    if (!openai) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
};

// @desc    Analyze voice note with AI (Returns JSON, no DB save)
// @route   POST /api/transactions/analyze
// @access  Private (Engineer, Manager, Admin)
export const analyzeTransaction = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No audio file provided'
            });
        }

        const companyContext = await getTenantMasterDataContext(req.user?.tenantId);
        const result = await aiService.processVoiceNote(req.file.path, req.body.transcript || '', companyContext);

        // Cleanup: Delete file after processing
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        // Cleanup file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        next(error);
    }
};

// @desc    Parse voice note with AI (Staging - No DB save)
// @route   POST /api/transactions/ai-parse
// @access  Private (Engineer, Manager, Admin)
export const parseVoiceNote = async (req, res, next) => {
    try {
        const { textInput, projectId } = req.body;
        const audioFile = req.file;

        // Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                success: false,
                message: 'OpenAI API key not configured.'
            });
        }

        let rawText = textInput;

        // Step 1: If audio file provided, transcribe with Whisper
        if (audioFile) {
            try {
                const client = getOpenAI();
                const transcription = await client.audio.transcriptions.create({
                    file: fs.createReadStream(audioFile.path),
                    model: "whisper-1",
                    language: "ar" // Target Egyptian Arabic
                });
                rawText = transcription.text;

                // Cleanup uploaded file
                fs.unlinkSync(audioFile.path);
            } catch (error) {
                logger.error({ err: error }, 'Whisper transcription failed');
                return res.status(500).json({
                    success: false,
                    message: 'Whisper transcription failed',
                    error: error.message
                });
            }
        }

        if (!rawText) {
            return res.status(400).json({
                success: false,
                message: 'Either audio file or textInput is required'
            });
        }

        // Step 2: Extract structured data with GPT-4o-mini
        try {
            const client = getOpenAI();
            const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{
                    role: "system",
                    content: `You are a financial assistant for a construction company in Egypt.
                    Extract transaction details from the provided text (can be Arabic, English, or mixed).

                    Available categories: MATERIALS, LABOR, EQUIPMENT, TRANSPORTATION, SERVICES, UTILITIES, PERMITS, OTHER

                    Identify if it's an EXPENSE or INCOME. Default to EXPENSE if buying/paying for things.

                    Return ONLY a JSON object:
                    {
                      "type": "EXPENSE" | "INCOME",
                      "amount": number,
                      "category": "one of the available categories",
                      "description": "Short clean description in Arabic",
                      "vendor": "Vendor name if mentioned, otherwise null"
                    }`
                }, {
                    role: "user",
                    content: rawText
                }],
                response_format: { type: "json_object" }
            });

            const extracted = JSON.parse(completion.choices[0].message.content);

            res.status(200).json({
                success: true,
                message: 'AI parsed successfully',
                data: {
                    rawText: rawText,
                    extracted: extracted,
                    projectId: projectId,
                    status: 'DRAFT'
                }
            });

        } catch (error) {
            logger.error({ err: error }, 'GPT Extraction Error');
            return res.status(500).json({
                success: false,
                message: 'AI extraction failed',
                error: error.message
            });
        }

    } catch (error) {
        next(error);
    }
};
