// Map OpenAI SDK errors to a clear HTTP response.
//
// Without this every AI failure looks like an opaque 500 to the user. We want:
//   - quota exhausted   → 503, "AI service unavailable. Contact administrator."
//   - rate-limited      → 429, "Too many requests, please wait a moment."
//   - bad audio/image   → 422, the SDK's message
//   - everything else   → 502, "AI service error"
//
// The OpenAI v6 SDK exposes `error.status`, `error.code`, and `error.error`
// (the upstream error object). We pattern-match those.

export const aiErrorResponse = (err) => {
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
