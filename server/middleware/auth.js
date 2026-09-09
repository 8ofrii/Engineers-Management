import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Reject challenge tokens or tokens with non-session purpose (fixes 2FA challenge bypass)
        if (decoded.purpose && decoded.purpose !== 'session') {
            return res.status(401).json({
                success: false,
                message: 'Invalid session token purpose'
            });
        }

        req.user = await prisma.user.findUnique({ where: { id: decoded.id } });

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!req.user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User account is deactivated'
            });
        }

        // Token Revocation / Session Invalidation on Password Change (VULN-MED-03)
        if (req.user.passwordChangedAt) {
            const changedTimestamp = Math.floor(new Date(req.user.passwordChangedAt).getTime() / 1000);
            if (decoded.iat && decoded.iat < changedTimestamp) {
                return res.status(401).json({
                    success: false,
                    message: 'Session invalidated due to password change. Please log in again.'
                });
            }
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};
