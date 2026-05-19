// Same shape as client/src/utils/apiError.js — pulls the most useful
// message out of an axios error for an Alert.

export const apiErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
    const data = err?.response?.data;
    if (Array.isArray(data?.errors) && data.errors.length) {
        return data.errors.map(e => `${e.path}: ${e.message}`).join('\n');
    }
    return data?.message || err?.message || fallback;
};
