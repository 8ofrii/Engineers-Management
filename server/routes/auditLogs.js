import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { listAuditLogs, getEntityAuditLogs } from '../controllers/auditLogController.js';

const router = express.Router();

router.use(protect);

// Listing all logs is super-admin only — it's basically the activity feed for the
// whole tenant and includes every actor's actions.
router.get(
    '/',
    authorize('SUPER_ADMIN'),
    listAuditLogs
);

// History for a specific resource — any authenticated tenant member can see it
// for resources they have access to (the controller is tenant-scoped).
router.get(
    '/:entity/:entityId',
    validate({
        params: z.object({
            entity: z.string().min(1).max(50),
            entityId: z.string().uuid('Invalid id')
        })
    }),
    getEntityAuditLogs
);

export default router;
