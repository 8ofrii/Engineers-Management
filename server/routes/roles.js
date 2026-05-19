import express from 'express';
import * as roleController from '../controllers/roleController.js';
import { protect } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import { validate } from '../middleware/validate.js';
import { createRoleSchema, updateRoleSchema, idParamSchema } from '../schemas/roles.schema.js';

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
    checkPermission('admin.manage_roles'),
    roleController.seedDefaultRoles
);

// Get single role
router.get(
    '/:id',
    checkPermission('admin.manage_roles'),
    validate({ params: idParamSchema }),
    roleController.getRole
);

// Create new role
router.post(
    '/',
    checkPermission('admin.manage_roles'),
    validate({ body: createRoleSchema }),
    roleController.createRole
);

// Update role
router.put(
    '/:id',
    checkPermission('admin.manage_roles'),
    validate({ params: idParamSchema, body: updateRoleSchema }),
    roleController.updateRole
);

// Delete role
router.delete(
    '/:id',
    checkPermission('admin.manage_roles'),
    validate({ params: idParamSchema }),
    roleController.deleteRole
);

export default router;
