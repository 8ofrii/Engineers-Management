import express from 'express';
import * as roleController from '../controllers/roleController.js';
import { protect } from '../middleware/auth.js';
import { verifyRole } from '../middleware/roleCheck.js';
import { checkPermission } from '../middleware/permissions.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all roles for tenant
router.get(
    '/',
    checkPermission('admin.manage_roles'),
    roleController.getRoles
);

// Get permission templates (for creating new roles)
router.get(
    '/templates',
    checkPermission('admin.manage_roles'),
    roleController.getPermissionTemplates
);

// Seed default roles (usually called during tenant setup)
router.post(
    '/seed-defaults',
    verifyRole(['ADMIN']),
    roleController.seedDefaultRoles
);

// Get single role
router.get(
    '/:id',
    checkPermission('admin.manage_roles'),
    roleController.getRole
);

// Create new role
router.post(
    '/',
    checkPermission('admin.manage_roles'),
    roleController.createRole
);

// Update role
router.put(
    '/:id',
    checkPermission('admin.manage_roles'),
    roleController.updateRole
);

// Delete role
router.delete(
    '/:id',
    checkPermission('admin.manage_roles'),
    roleController.deleteRole
);

export default router;
