import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';

// Must run before any other module that needs HTTP / express instrumentation
// (server.js imports this on its first line).
dotenv.config();

const dsn = process.env.SENTRY_DSN;

if (dsn) {
    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        // Trace sampling: 10% in prod, off in dev/test (cheap to enable later via env)
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
        // Don't capture PII by default — multi-tenant SaaS with PHI-adjacent data
        sendDefaultPii: false
    });
}

export const sentryEnabled = Boolean(dsn);

export const wrapExpress = (app) => {
    if (!sentryEnabled) return;
    Sentry.setupExpressErrorHandler(app);
};
