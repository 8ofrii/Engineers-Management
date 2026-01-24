import prisma from '../lib/prisma.js';

/**
 * Role-Based Access Control Middleware
 * Checks if the authenticated user has the required role
 */
export const verifyRole = (allowedRoles) => {
    return (req, res, next) => {
        // req.user is set by the JWT authentication middleware
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access Denied. You do not have permission to perform this action.",
                requiredRoles: allowedRoles,
                yourRole: req.user.role
            });
        }

        next();
    };
};

/**
 * Resource Ownership Check
 * Ensures user can only access their own resources
 */
export const verifyOwnership = (resourceType) => {
    return async (req, res, next) => {
        const resourceId = req.params.id || req.params.engineerId;
        const userId = req.user.id;

        try {
            let resource;

            switch (resourceType) {
                case 'transaction':
                    resource = await prisma.transaction.findUnique({
                        where: { id: resourceId },
                        select: { createdBy: true }
                    });

                    if (!resource) {
                        return res.status(404).json({
                            success: false,
                            message: "Resource not found"
                        });
                    }

                    if (resource.createdBy !== userId && req.user.role !== 'ADMIN' && req.user.role !== 'PROJECT_MANAGER') {
                        return res.status(403).json({
                            success: false,
                            message: "Not authorized to access this resource"
                        });
                    }
                    break;

                case 'custody':
                    // Engineers can only view their own custody
                    if (resourceId !== userId && req.user.role !== 'ADMIN' && req.user.role !== 'ACCOUNTANT') {
                        return res.status(403).json({
                            success: false,
                            message: "Not authorized to view this custody account"
                        });
                    }
                    break;

                default:
                    break;
            }

            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Authorization check failed"
            });
        }
    };
};
