// Map OpenAI SDK + Prisma errors to a clear HTTP response.
//
// Without this every AI failure looks like an opaque 500 to the user. We want:
//   - OpenAI quota exhausted   → 503 AI_QUOTA_EXHAUSTED
//   - OpenAI rate-limited      → 429 AI_RATE_LIMITED
//   - OpenAI bad audio/image   → 422 AI_INPUT_REJECTED
//   - OpenAI auth failed       → 503 AI_AUTH_FAILED
//   - Prisma table missing     → 503 DB_SCHEMA_OUT_OF_SYNC (P2021)
//   - Prisma column missing    → 503 DB_SCHEMA_OUT_OF_SYNC (P2022)
//   - Other Prisma error       → 500 DB_ERROR with Prisma code
//   - Everything else          → 502 AI_SERVICE_ERROR
//
// The OpenAI v6 SDK exposes `error.status`, `error.code`, and `error.error`.
// Prisma exposes `error.name === 'PrismaClientKnownRequestError'` and `error.code`.

const isPrismaError = (err) =>
    err?.name === 'PrismaClientKnownRequestError' ||
    err?.name === 'PrismaClientValidationError' ||
    err?.name === 'PrismaClientInitializationError' ||
    /^P\d{4}$/.test(err?.code || '');

export const aiErrorResponse = (err) => {
    // Schema-sync errors get the most informative message — the operator
    // knows exactly what to do (run prisma db push / migrate deploy).
    if (isPrismaError(err)) {
        if (err.code === 'P2021' || err.code === 'P2022') {
            const what = err.code === 'P2021' ? 'table' : 'column';
            return {
                statusCode: 503,
                body: {
                    success: false,
                    code: 'DB_SCHEMA_OUT_OF_SYNC',
                    message: `Database is missing a ${what} the code expects. Administrator: run \`prisma db push\` or \`prisma migrate deploy\` against the production database.`,
                    prismaCode: err.code,
                    prismaMeta: err.meta
                }
            };
        }
        return {
            statusCode: 500,
            body: {
                success: false,
                code: 'DB_ERROR',
                message: `Database error (${err.code || 'unknown'}). The administrator has been notified.`,
                prismaCode: err.code
            }
        };
    }

    const status = err?.status;
    const code = err?.code || err?.error?.code;
    const upstreamMsg = err?.error?.message || err?.message;

    if (status === 429 && code === 'insufficient_quota') {
        return {
            statusCode: 503,
            body: {
                success: false,
                code: 'AI_QUOTA_EXHAUSTED',
                message: 'AI service is unavailable (quota exhausted). Please contact your administrator.'
            }
        };
    }
    if (status === 429) {
        return {
            statusCode: 429,
            body: {
                success: false,
                code: 'AI_RATE_LIMITED',
                message: 'AI service is busy. Please wait a moment and try again.'
            }
        };
    }
    if (status === 400 || status === 422) {
        return {
            statusCode: 422,
            body: {
                success: false,
                code: 'AI_INPUT_REJECTED',
                message: upstreamMsg || 'AI service rejected the input. Try a clearer recording or photo.'
            }
        };
    }
    if (status === 401 || status === 403) {
        return {
            statusCode: 503,
            body: {
                success: false,
                code: 'AI_AUTH_FAILED',
                message: 'AI service authentication failed. Please contact your administrator.'
            }
        };
    }
    return {
        statusCode: 502,
        body: {
            success: false,
            code: 'AI_SERVICE_ERROR',
            message: 'AI service error. Please try again in a moment.'
        }
    };
};
