import express from 'express';
import * as materialBatchController from '../controllers/materialBatchController.js';
import { protect } from '../middleware/auth.js';
import { verifyRole } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get available stock for a project
router.get(
    '/project/:projectId',
    materialBatchController.getAvailableStock
);

// Consume material batch
router.post(
    '/:id/consume',
    verifyRole(['ENGINEER', 'PROJECT_MANAGER', 'ADMIN']),
    materialBatchController.consumeBatch
);

// Get all batches
router.get('/', materialBatchController.getAllBatches);

// Get single batch
router.get('/:id', materialBatchController.getBatch);

export default router;
