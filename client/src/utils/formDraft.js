/**
 * Form Draft Persistence Utilities
 * Saves form input to browser localStorage so users don't lose typed data
 * if they mistakenly close the modal, hit Cancel, or refresh the page.
 */

export function saveFormDraft(storageKey, data) {
    if (!storageKey || !data) return;
    try {
        const hasContent = Object.entries(data).some(([key, val]) => {
            if (['status', 'unit', 'projectType'].includes(key)) {
                return false;
            }
            if (typeof val === 'string' && val.trim().length > 0) return true;
            if (typeof val === 'number' && val !== 0 && !isNaN(val)) return true;
            if (Array.isArray(val) && val.length > 0) return true;
            return false;
        });

        if (hasContent) {
            localStorage.setItem(storageKey, JSON.stringify({
                data,
                savedAt: Date.now()
            }));
        } else {
            localStorage.removeItem(storageKey);
        }
    } catch (e) {
        console.warn(`[Draft] Failed to save draft for ${storageKey}:`, e);
    }
}

export function getFormDraft(storageKey) {
    if (!storageKey) return null;
    try {
        const item = localStorage.getItem(storageKey);
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (!parsed || !parsed.data) return null;
        return parsed.data;
    } catch (e) {
        console.warn(`[Draft] Failed to load draft for ${storageKey}:`, e);
        return null;
    }
}

export function clearFormDraft(storageKey) {
    if (!storageKey) return;
    try {
        localStorage.removeItem(storageKey);
    } catch (e) {
        console.warn(`[Draft] Failed to clear draft for ${storageKey}:`, e);
    }
}
