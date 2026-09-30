// Sentry must be initialized before any module that needs HTTP/express patching.
import './instrument.js';

import express from 'express';
import dotenv from 'dotenv';

// Load env vars at the very top before any other imports
dotenv.config();

import { wrapExpress } from './instrument.js';

import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './lib/prisma.js';
import logger from './lib/logger.js';
import { errorHandler } from './middleware/error.js';

// Import routes
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import clientRoutes from './routes/clients.js';
import supplierRoutes from './routes/suppliers.js';
import workmenRoutes from './routes/workmen.js';
import transactionRoutes from './routes/transactions.js';
import custodyRoutes from './routes/custody.js';
import notificationRoutes from './routes/notifications.js';
import materialBatchRoutes from './routes/materialBatches.js';
import chatRoutes from './routes/chat.js';
import tenantRoutes from './routes/tenant.js';
import userRoutes from './routes/users.js';
import roleRoutes from './routes/roles.js';
import projectCostItemRoutes from './routes/projectCostItems.js';
import categoryRoutes from './routes/categories.js';
import workOrderRoutes from './routes/workOrders.js';
import officeFeeRoutes from './routes/officeFees.js';
import materialRoutes from './routes/materials.js';
import auditLogRoutes from './routes/auditLogs.js';
import { projectDocsRouter, docsRouter } from './routes/documents.js';
import dsrRoutes from './routes/dsr.js';
import invoiceRoutes from './routes/invoices.js';
import aiExtractionRoutes from './routes/aiExtraction.js';
import transactionDraftRoutes from './routes/transactionDrafts.js';
import bankStatementRoutes from './routes/bankStatements.js';
import billingRoutes from './routes/billing.js';
import safeRoutes from './routes/safeRoutes.js';
import reportRoutes from './routes/reports.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { ensureBucketExists, useS3, getS3, BUCKET } from './lib/storage.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy (Render/Heroku/etc.) so rate-limit sees real client IPs
app.set('trust proxy', 1);

// Security headers with Content Security Policy (CSP)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com"],
            connectSrc: ["'self'", "https://hesaby.aimicromind.com", "https://accounts.google.com", "https://*.paymob.com"],
            frameSrc: ["'self'", "https://accept.paymob.com", "https://accounts.google.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"]
        }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Body parser with increased limits for Base64 image uploads
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// CORS: whitelist via CORS_ALLOWED_ORIGINS (comma-separated). In development, fall back to permissive.
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true
}));

// Helper to sanitize client IP from reverse proxy (strips port and ipv6 prefixes)
const getClientIp = (req) => {
    const raw = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    return raw.replace(/^::ffff:/, '').split(':')[0] || '127.0.0.1';
};

// Global rate limiter — generous so normal usage isn't affected.
app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: getClientIp,
    validate: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
}));

// Stricter limiter on auth endpoints to slow brute-force / credential stuffing.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: getClientIp,
    validate: false,
    message: { success: false, message: 'Too many authentication attempts, please try again later.' }
});

// Request logger — assigns each request a unique ID, logs method/url/status/ms.
// Replaces morgan; gives us structured JSON in production for log aggregators.
app.use(pinoHttp({
    logger,
    customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req, res, err) => `${req.method} ${req.url} ${res.statusCode} - ${err?.message}`,
    // Don't log /api/health — it floods the log and tells us nothing.
    autoLogging: { ignore: (req) => req.url === '/api/health' },
    serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode })
    }
}));

// Serve static files (uploads) with strict security headers (prevent inline script execution & XSS)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'");
        const ext = path.extname(filePath).toLowerCase();
        // Allow images, audio, video, and PDF to be streamed / displayed inline
        if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.webm', '.mp3', '.wav', '.m4a', '.ogg', '.aac', '.mp4', '.pdf'].includes(ext)) {
            res.setHeader('Content-Disposition', 'inline');
        } else {
            res.setHeader('Content-Disposition', 'attachment');
        }
    }
}));

// Local disk subfolder resolution fallback: if a file without subfolder was requested (e.g. /uploads/receipt-xxx.png)
app.use('/uploads', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const cleanPath = req.path.replace(/^\/+/, '');
    if (!cleanPath) return next();
    const subdirs = ['receipts', 'audio', 'documents', 'images'];
    for (const sub of subdirs) {
        const candidate = path.join(__dirname, 'uploads', sub, cleanPath);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            const ext = path.extname(candidate).toLowerCase();
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Content-Security-Policy', "default-src 'none'");
            if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.webm', '.mp3', '.wav', '.m4a', '.ogg', '.aac', '.mp4', '.pdf'].includes(ext)) {
                res.setHeader('Content-Disposition', 'inline');
            } else {
                res.setHeader('Content-Disposition', 'attachment');
            }
            return res.sendFile(candidate);
        }
    }
    next();
});

// S3 / MinIO Object Storage Streaming Fallback
// When media is persisted in MinIO/S3, transparently stream it through /uploads/*
app.use('/uploads', async (req, res, next) => {
    if (!useS3 || (req.method !== 'GET' && req.method !== 'HEAD')) {
        return next();
    }
    try {
        const key = decodeURIComponent(req.path.replace(/^\/+/, ''));
        if (!key) return next();

        const getObjectParams = {
            Bucket: BUCKET,
            Key: key
        };

        if (req.headers.range) {
            getObjectParams.Range = req.headers.range;
        }

        const s3Response = await getS3().send(new GetObjectCommand(getObjectParams));

        if (s3Response.ContentRange) {
            res.status(206);
            res.setHeader('Content-Range', s3Response.ContentRange);
        } else {
            res.status(200);
        }

        res.setHeader('Accept-Ranges', 'bytes');
        if (s3Response.ContentType) res.setHeader('Content-Type', s3Response.ContentType);
        if (s3Response.ContentLength) res.setHeader('Content-Length', s3Response.ContentLength);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'");

        const ext = path.extname(key).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.webm', '.mp3', '.wav', '.m4a', '.ogg', '.aac', '.mp4', '.pdf'].includes(ext)) {
            res.setHeader('Content-Disposition', 'inline');
        } else {
            res.setHeader('Content-Disposition', 'attachment');
        }

        if (req.method === 'HEAD') {
            return res.end();
        }

        s3Response.Body.pipe(res);
    } catch (err) {
        if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }
        return next(err);
    }
});

// Mount routers
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/workmen', workmenRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/custody', custodyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/material-batches', materialBatchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/project-cost-items', projectCostItemRoutes); // V1.2: Work Orders (Legacy)
app.use('/api/work-orders', workOrderRoutes); // V2: Work Orders (New)
app.use('/api/office-fees', officeFeeRoutes); // V2: Office Fee Configuration
app.use('/api/categories', categoryRoutes); // V1.2: Arabic Categories
app.use('/api/materials', materialRoutes); // Added Materials route
app.use('/api/audit-logs', auditLogRoutes); // Phase 1: audit trail
app.use('/api/project-documents', projectDocsRouter); // Phase 3: list/upload by project
app.use('/api/documents', docsRouter);                // Phase 3: delete by document id
app.use('/api/dsr', dsrRoutes);                       // Phase 4: Daily Site Reports
app.use('/api/invoices', invoiceRoutes);              // Phase 5: Invoicing + PDF
app.use('/api/ai', aiExtractionRoutes);               // Phase 7: AI extraction (voice + receipt → draft)
app.use('/api/transaction-drafts', transactionDraftRoutes); // Phase 7: draft review queue
app.use('/api/bank-statements', bankStatementRoutes);       // Phase 6.3: bank reconciliation
app.use('/api/billing', billingRoutes);                     // Phase 6.4: Paymob subscriptions
app.use('/api/safes', safeRoutes);                         // Company Safes & Treasury
app.use('/api/reports', reportRoutes);                     // Financial Reports & PDF Export

// Health check endpoint with active database ping
app.get('/api/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({
            success: true,
            status: 'healthy',
            database: 'connected',
            message: 'Server and Database are operational',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        logger.error({ err }, 'Health check failed: Database unreachable');
        res.status(503).json({
            success: false,
            status: 'degraded',
            database: 'disconnected',
            message: 'Database connection error',
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Sentry must wrap errors BEFORE the app's own handler, so it sees raw exceptions.
wrapExpress(app);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, 'Server ready');
    ensureBucketExists().catch((err) => {
        logger.warn({ err: err.message }, 'MinIO/S3 bucket verification deferred');
    });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
    logger.info({ signal }, 'Graceful shutdown signal received — closing connections');
    try {
        server.close();
        await prisma.$disconnect();
        logger.info('Database connections closed cleanly');
    } catch (err) {
        logger.error({ err }, 'Error during database disconnect');
    }
    process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGUSR2', async () => {
    // Nodemon restart signal
    try {
        await prisma.$disconnect();
    } catch {}
    process.kill(process.pid, 'SIGUSR2');
});

// Crash hard on unhandled rejections — better than zombie state.
process.on('unhandledRejection', async (err) => {
    logger.fatal({ err }, 'Unhandled promise rejection — shutting down');
    try { await prisma.$disconnect(); } catch {}
    server.close(() => process.exit(1));
});

process.on('uncaughtException', async (err) => {
    logger.fatal({ err }, 'Uncaught exception — shutting down');
    try { await prisma.$disconnect(); } catch {}
    process.exit(1);
});
