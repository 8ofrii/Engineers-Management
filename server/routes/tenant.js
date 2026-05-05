import express from 'express';
import {
    getTenant,
    updateTenant,
    getApprovalThresholds,
    updateApprovalThresholds
} from '../controllers/tenantController.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { updateTenantSchema } from '../schemas/tenant.schema.js';
import { getTenantAiUsage } from '../lib/aiUsage.js';

const router = express.Router();

router.use(protect); // Protect all routes

router.get('/', getTenant);
router.put('/', upload.single('logo'), validate({ body: updateTenantSchema }), updateTenant);

// Phase 2 — multi-level approval thresholds (admin only).
router.get('/approval-thresholds', authorize('ADMIN', 'SUPER_ADMIN'), getApprovalThresholds);
router.put('/approval-thresholds', authorize('ADMIN', 'SUPER_ADMIN'), updateApprovalThresholds);

// Phase 7 — current month's AI extraction usage. Admins/managers can plan
// budget; the controller already enforces the cap independently.
router.get('/ai-usage', authorize('ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER'), async (req, res) => {
    const usage = await getTenantAiUsage(req.user.tenantId);
    res.json({ success: true, data: usage });
});

export default router;
