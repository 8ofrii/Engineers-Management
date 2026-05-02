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

const router = express.Router();

router.use(protect); // Protect all routes

router.get('/', getTenant);
router.put('/', upload.single('logo'), validate({ body: updateTenantSchema }), updateTenant);

// Phase 2 — multi-level approval thresholds (admin only).
router.get('/approval-thresholds', authorize('ADMIN', 'SUPER_ADMIN'), getApprovalThresholds);
router.put('/approval-thresholds', authorize('ADMIN', 'SUPER_ADMIN'), updateApprovalThresholds);

export default router;
