import express from 'express';
import { getProjects, getProject, createProject, updateProject, deleteProject, getProjectFinancials } from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';
import { verifyRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createProjectSchema, updateProjectSchema, idParamSchema } from '../schemas/projects.schema.js';

const router = express.Router();

router.route('/')
    .get(protect, getProjects)
    .post(protect, validate({ body: createProjectSchema }), createProject);

// Get project financials (Admin, Manager, Accountant)
router.get(
    '/:id/financials',
    protect,
    validate({ params: idParamSchema }),
    verifyRole(['ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT']),
    getProjectFinancials
);

router.route('/:id')
    .get(protect, validate({ params: idParamSchema }), getProject)
    .put(protect, validate({ params: idParamSchema, body: updateProjectSchema }), updateProject)
    .delete(protect, validate({ params: idParamSchema }), deleteProject);

export default router;

