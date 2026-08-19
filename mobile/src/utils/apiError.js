import i18n from '../i18n';

export const apiErrorMessage = (err, fallback) => {
    const isArabic = i18n.language === 'ar';
    const defaultFallback = fallback || (isArabic ? 'حدث خطأ ما، يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.');

    if (!err) return defaultFallback;

    // Network / Offline errors
    if (err.message === 'Network Error' || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') {
        return isArabic
            ? 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.'
            : 'Unable to connect to server. Please check your internet connection.';
    }

    if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
        return isArabic
            ? 'انتهت مهلة الطلب. يرجى إعادة المحاولة.'
            : 'Request timed out. Please try again.';
    }

    const data = err.response?.data;
    if (Array.isArray(data?.errors) && data.errors.length) {
        return data.errors.map(e => `${e.path || ''}: ${e.message}`).join('\n');
    }

    return data?.message || err.message || defaultFallback;
};
