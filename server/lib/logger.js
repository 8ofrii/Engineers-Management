import pino from 'pino';

// Pretty output in dev, JSON in production. JSON is what log aggregators
// (Render, Datadog, Logtail) want to ingest.
const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    base: { service: 'engineers-management-api' },
    redact: {
        // Defense-in-depth: never let secrets land in logs even if a bug
        // accidentally logs req.headers or a user object.
        paths: [
            'password',
            '*.password',
            'newPassword',
            '*.newPassword',
            'currentPassword',
            '*.currentPassword',
            'authorization',
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]'
        ],
        censor: '[REDACTED]'
    },
    transport: isDev
        ? {
              target: 'pino-pretty',
              options: {
                  colorize: true,
                  translateTime: 'HH:MM:ss.l',
                  ignore: 'pid,hostname,service',
                  singleLine: false
              }
          }
        : undefined
});

export default logger;
