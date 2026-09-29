import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import logger from '../lib/logger.js';

export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Server Error';
    let extra = {};

    // Zod errors that bubble up past route-level validate() (rare, but possible
    // if a controller calls schema.parse manually).
    if (err instanceof ZodError) {
        statusCode = 400;
        message = 'Validation failed';
        extra.errors = err.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    }

    // Prisma: record not found on update/delete
    else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002': // Unique constraint violation
                statusCode = 409;
                message = 'A record with this value already exists';
                extra.fields = err.meta?.target;
                break;
            case 'P2003': // Foreign key constraint
                statusCode = 400;
                message = 'Referenced record does not exist';
                break;
            case 'P2025': // Record to update/delete not found
                statusCode = 404;
                message = 'Record not found';
                break;
            case 'P2014': // Required relation violation
                statusCode = 400;
                message = 'Invalid relation';
                break;
            default:
                statusCode = 400;
                message = `Database error (${err.code})`;
        }
    }

    // Prisma: malformed query (programmer error)
    else if (err instanceof Prisma.PrismaClientValidationError) {
        statusCode = 400;
        message = 'Invalid query';
    }

    // CORS rejection (thrown synchronously from the cors origin callback)
    else if (err.message?.startsWith('Origin') && err.message?.includes('not allowed by CORS')) {
        statusCode = 403;
    }

    // Multer upload errors (file size, file type limits)
    else if (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = err.code === 'LIMIT_FILE_SIZE'
            ? 'One or more files exceed the maximum file size limit (50 MB).'
            : `Upload error: ${err.message}`;
    }

    if (statusCode >= 500) {
        // Use pino-http's per-request logger if available so the log line
        // carries the same request ID as the access log.
        const log = req.log || logger;
        log.error({ err, statusCode, path: req.originalUrl }, 'Server error');
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...extra,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
