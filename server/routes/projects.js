import express from 'express';
import { getProjects, getProject, createProject, updateProject, deleteProject, getProjectFinancials } from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';
import { verifyRole } from '../middleware/rbac.js';

const router = express.Router();

router.route('/')
    .get(protect, getProjects)
    .post(protect, createProject);

// Get project financials (Admin, Manager, Accountant)
router.get(
    '/:id/financials',
    protect,
    verifyRole(['ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT']),
    getProjectFinancials
);

router.route('/:id')
    .get(protect, getProject)
    .put(protect, updateProject)
    .delete(protect, deleteProject);

export default router;

