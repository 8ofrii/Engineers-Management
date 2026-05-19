import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import * as ctrl from '../controllers/aiExtractionController.js';
import { protect } from '../middleware/auth.js';
import { audioUpload, receiptMemoryUpload } from '../middleware/upload.js';

const router = express.Router();

// AI calls are expensive (~$0.001-0.03 per request) and slow (~2-5s).
// Tighter per-user limiter than the global 1000/15min. ipKeyGenerator is
// required by express-rate-limit v8 for correct IPv6 normalization on the
// pre-auth fallback.
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60, // 60 extractions per 15 min per user
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || ipKeyGenerator(req),
    message: { success: false, message: 'AI extraction rate limit reached. Try again in a few minutes.' }
});

router.use(protect);
router.use(aiLimiter);

router.post('/extract/voice', audioUpload.single('audio'), ctrl.extractFromVoice);
router.post('/extract/receipt', receiptMemoryUpload.single('image'), ctrl.extractFromReceipt);

export default router;
