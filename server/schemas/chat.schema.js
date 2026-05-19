import { z } from 'zod';

// POST /api/chat/message accepts either a text message or an audio file.
// We can't enforce "one or the other" here because the audio file is checked
// via req.file (after multer) — the controller does its own check.
// Cap at ~10k chars to prevent absurdly large prompts hitting OpenAI.
//
// `history` is an optional rolling window of recent turns the FE passes back
// so the model has memory across messages. We cap at 12 turns × 2k chars
// each to keep token cost bounded.
const historyMessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(2000)
});

export const sendMessageSchema = z.object({
    message: z.string().max(10000).optional(),
    history: z.array(historyMessageSchema).max(12).optional()
});
