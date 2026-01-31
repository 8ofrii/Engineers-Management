import prisma from '../lib/prisma.js';
import { DEFAULT_PERMISSIONS, SYSTEM_ROLES } from '../constants/permissions.js';

// @desc    Get all roles for tenant
// @route   GET /api/roles
// @access  Private (Admin only)
export const getRoles = async (req, res, next) => {
    try {
        const tenantId = req.user.tenantId;

        const roles = await prisma.role.findMany({
            where: { tenantId },
            include: {
                _count: {
                    select: { users: true }
                }
            },
            orderBy: [
                { isSystem: 'desc' }, // System roles first
                { createdAt: 'asc' }
            ]
        });

        res.status(200).json({
            success: true,
            data: roles
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single role
// @route   GET /api/roles/:id
// @access  Private (Admin only)
export const getRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        const role = await prisma.role.findFirst({
            where: {
                id,
                tenantId
            },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        res.status(200).json({
            success: true,
            data: role
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new role
// @route   POST /api/roles
// @access  Private (Admin only)
export const createRole = async (req, res, next) => {
    try {
        const { name, description, permissions } = req.body;
        const tenantId = req.user.tenantId;

        // Validate required fields
        if (!name || !permissions) {
            return res.status(400).json({
                success: false,
                message: 'Name and permissions are required'
            });
        }

        // Check if role name already exists for this tenant
        const existing = await prisma.role.findFirst({
            where: {
                tenantId,
                name
            }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'A role with this name already exists'
            });
        }

        // Create role
        const role = await prisma.role.create({
            data: {
                name,
                description,
                permissions,
                isSystem: false, // Custom roles are never system roles
                tenantId
            }
        });

        res.status(201).json({
            success: true,
            data: role
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update role
// @route   PUT /api/roles/:id
// @access  Private (Admin only)
export const updateRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;
        const tenantId = req.user.tenantId;

        // Find role
        const role = await prisma.role.findFirst({
            where: {
                id,
                tenantId
            }
        });

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        // Prevent editing system roles' core permissions
        // (Allow editing description but not permissions for system roles)
        if (role.isSystem && permissions) {
            return res.status(403).json({
                success: false,
                message: 'Cannot modify permissions of system roles. Create a custom role instead.'
            });
        }

        // Check name uniqueness if name is being changed
        if (name && name !== role.name) {
            const existing = await prisma.role.findFirst({
                where: {
                    tenantId,
                    name,
                    id: { not: id }
                }
            });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'A role with this name already exists'
                });
            }
        }

        // Update role
        const updated = await prisma.role.update({
            where: { id },
            data: {
                name: name || undefined,
                description: description !== undefined ? description : undefined,
                permissions: permissions || undefined
            }
        });

        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete role
// @route   DELETE /api/roles/:id
// @access  Private (Admin only)
export const deleteRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        // Find role
        const role = await prisma.role.findFirst({
            where: {
                id,
                tenantId
            },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        // Prevent deleting system roles
        if (role.isSystem) {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete system roles'
            });
        }

        // Prevent deleting roles that have users
        if (role._count.users > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete role. ${role._count.users} user(s) are assigned to this role. Please reassign them first.`
            });
        }

        // Delete role
        await prisma.role.delete({
            where: { id }
        });

        res.status(200).json({
            success: true,
            message: 'Role deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create default system roles for a tenant
// @route   POST /api/roles/seed-defaults
// @access  Private (Admin only) - Usually called during tenant creation
export const seedDefaultRoles = async (req, res, next) => {
    try {
        const tenantId = req.user.tenantId;

        // Check if roles already exist
        const existing = await prisma.role.findFirst({
            where: { tenantId }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Default roles already exist for this tenant'
            });
        }

        // Create all default roles
        const rolesToCreate = Object.keys(DEFAULT_PERMISSIONS).map(roleName => ({
            name: roleName,
            description: `System default ${roleName} role`,
            permissions: DEFAULT_PERMISSIONS[roleName],
            isSystem: true,
            tenantId
        }));

        const roles = await prisma.role.createMany({
            data: rolesToCreate
        });

        res.status(201).json({
            success: true,
            message: `Created ${roles.count} default roles`,
            data: roles
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get permission templates (for UI)
// @route   GET /api/roles/templates
// @access  Private (Admin only)
export const getPermissionTemplates = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            data: DEFAULT_PERMISSIONS
        });
    } catch (error) {
        next(error);
    }
};
