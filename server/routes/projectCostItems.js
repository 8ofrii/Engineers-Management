import express from 'express';
import * as projectCostItemController from '../controllers/projectCostItemController.js';
import { protect } from '../middleware/auth.js';
import { verifyRole } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all cost items (with optional filtering)
router.get('/', projectCostItemController.getAllProjectCostItems);

// Get all cost items for a specific project
router.get('/project/:projectId', projectCostItemController.getProjectCostItems);

// Create new cost item (Managers & Admins only)
router.post(
    '/',
    verifyRole(['PROJECT_MANAGER', 'ADMIN']),
    projectCostItemController.createProjectCostItem
);

// Get single cost item
router.get('/:id', projectCostItemController.getProjectCostItem);

// Update cost item (Managers & Admins only)
router.put(
    '/:id',
    verifyRole(['PROJECT_MANAGER', 'ADMIN']),
    projectCostItemController.updateProjectCostItem
);

// Delete cost item (Admins only)
router.delete(
    '/:id',
    verifyRole(['ADMIN']),
    projectCostItemController.deleteProjectCostItem
);

export default router;
