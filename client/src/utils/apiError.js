// Centralized helper: pulls the most useful message out of an axios error
// (or any rejection) for the user-facing alert.
//
// Priority order:
//   1. Server's per-field Zod errors → joined "field: message" lines
//   2. Server's top-level message
//   3. Network/JS error message
//   4. Caller-provided fallback
//
// Use everywhere we catch a thrown rejection from an api.* call so users
// see actionable messages instead of "Something went wrong, please try again."

export const apiErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
    const data = err?.response?.data;
    if (Array.isArray(data?.errors) && data.errors.length) {
        return data.errors.map(e => `${e.path}: ${e.message}`).join('\n');
    }
    return data?.message || err?.message || fallback;
};
