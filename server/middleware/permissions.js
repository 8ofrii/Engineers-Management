import prisma from '../lib/prisma.js';
import { DEFAULT_PERMISSIONS } from '../constants/permissions.js';

/**
 * Dynamic Permission Checker Middleware
 * Checks if user has a specific permission based on their custom role or legacy role
 * 
 * Usage: checkPermission('financials.view_office_profit')
 */
export const checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            const user = req.user;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // SUPER_ADMIN has all permissions
            if (user.role === 'SUPER_ADMIN') {
                return next();
            }

            let permissions = null;

            // Check if user has a custom role
            if (user.roleId) {
                const role = await prisma.role.findUnique({
                    where: { id: user.roleId }
                });

                if (role) {
                    permissions = role.permissions;
                }
            }

            // Fallback to legacy role permissions
            if (!permissions && user.role) {
                permissions = DEFAULT_PERMISSIONS[user.role];
            }

            // If still no permissions, deny access
            if (!permissions) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Denied: No role assigned'
                });
            }

            // Parse the permission path (e.g., "financials.view_office_profit")
            const hasAccess = getNestedPermission(permissions, requiredPermission);

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Denied: Insufficient permissions',
                    required: requiredPermission
                });
            }

            // Store permissions in request for later use
            req.userPermissions = permissions;

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking permissions'
            });
        }
    };
};

/**
 * Check if user has ANY of the specified permissions
 * Usage: checkAnyPermission(['transactions.create', 'transactions.approve'])
 */
export const checkAnyPermission = (requiredPermissions) => {
    return async (req, res, next) => {
        try {
            const user = req.user;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // SUPER_ADMIN has all permissions
            if (user.role === 'SUPER_ADMIN') {
                return next();
            }

            let permissions = null;

            // Check custom role
            if (user.roleId) {
                const role = await prisma.role.findUnique({
                    where: { id: user.roleId }
                });
                if (role) permissions = role.permissions;
            }

            // Fallback to legacy role
            if (!permissions && user.role) {
                permissions = DEFAULT_PERMISSIONS[user.role];
            }

            if (!permissions) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Denied: No role assigned'
                });
            }

            // Check if user has ANY of the required permissions
            const hasAnyAccess = requiredPermissions.some(perm =>
                getNestedPermission(permissions, perm)
            );

            if (!hasAnyAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Denied: Insufficient permissions',
                    required: requiredPermissions
                });
            }

            req.userPermissions = permissions;
            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking permissions'
            });
        }
    };
};

/**
 * Check approval limit for transactions
 * Usage: checkApprovalLimit(transactionAmount)
 */
export const checkApprovalLimit = async (req, res, next) => {
    try {
        const user = req.user;
        const amount = req.body.amount || req.params.amount;

        if (!amount) {
            return next(); // If no amount, let it pass (will be validated elsewhere)
        }

        // SUPER_ADMIN and ADMIN have unlimited approval
        if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
            return next();
        }

        let permissions = null;

        // Get user permissions
        if (user.roleId) {
            const role = await prisma.role.findUnique({
                where: { id: user.roleId }
            });
            if (role) permissions = role.permissions;
        }

        if (!permissions && user.role) {
            permissions = DEFAULT_PERMISSIONS[user.role];
        }

        if (!permissions) {
            return res.status(403).json({
                success: false,
                message: 'Access Denied: No role assigned'
            });
        }

        // Check approval limit
        const maxLimit = permissions.transactions?.max_approval_limit;

        // null or undefined means unlimited
        if (maxLimit === null || maxLimit === undefined) {
            return next();
        }

        // Check if amount exceeds limit
        if (Number(amount) > maxLimit) {
            return res.status(403).json({
                success: false,
                message: `Amount exceeds your approval limit of ${maxLimit} EGP. Please request approval from a higher authority.`,
                limit: maxLimit,
                amount: Number(amount)
            });
        }

        next();
    } catch (error) {
        console.error('Approval limit check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking approval limit'
        });
    }
};

/**
 * Helper function to get nested permission value
 * Example: getNestedPermission(permissions, 'financials.view_office_profit')
 */
function getNestedPermission(obj, path) {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current[key] === undefined) {
            return false;
        }
        current = current[key];
    }

    return current === true;
}

/**
 * Attach user permissions to request (for conditional rendering in frontend)
 * Usage: Add this middleware to routes that need to return permission info
 */
export const attachPermissions = async (req, res, next) => {
    try {
        const user = req.user;

        if (!user) {
            return next();
        }

        let permissions = null;

        if (user.roleId) {
            const role = await prisma.role.findUnique({
                where: { id: user.roleId }
            });
            if (role) permissions = role.permissions;
        }

        if (!permissions && user.role) {
            permissions = DEFAULT_PERMISSIONS[user.role];
        }

        req.userPermissions = permissions;
        next();
    } catch (error) {
        console.error('Error attaching permissions:', error);
        next(); // Don't block request if permission attachment fails
    }
};
