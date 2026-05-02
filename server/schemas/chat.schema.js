import { z } from 'zod';

// POST /api/chat/message accepts either a text message or an audio file.
// We can't enforce "one or the other" here because the audio file is checked
// via req.file (after multer) — the controller does its own check.
// Cap at ~10k chars to prevent absurdly large prompts hitting OpenAI.
export const sendMessageSchema = z.object({
    message: z.string().max(10000).optional()
});
