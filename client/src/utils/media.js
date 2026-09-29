/**
 * Media and attachment utilities for Hesaby ERP.
 * Handles storage limits, multi-file parsing, format validation, and URL resolution.
 */

// Max total storage limit per transaction (50 MB)
export const MAX_TRANSACTION_STORAGE_BYTES = 50 * 1024 * 1024; // 50 MB

export const ACCEPTED_RECEIPT_MIME_TYPES = "image/*,application/pdf,.csv,.xlsx,.xls,.doc,.docx,.txt,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

/**
 * Resolves media URLs (whether absolute S3, relative /uploads/, or data/blob URLs).
 */
export const resolveMediaUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
        return url;
    }
    const clean = url.replace(/^(\/?uploads\/|\/+)/, '');
    return `/uploads/${clean}`;
};

/**
 * Parses transaction receiptPhotoUrl which can be:
 * - A single URL string ("/uploads/receipts/...")
 * - A JSON stringified array of URLs or attachment objects:
 *     '["/uploads/..."]' OR '[{"url":"/uploads/...","label":"Supplier Invoice","name":"rec.png"}]'
 * - An array of URLs or attachment objects directly
 * - null / undefined / empty string
 * 
 * Returns an array of rich attachment objects:
 * [{ id, url, label, name, ext, isImg, isPdf, isSpreadsheet, isDoc }]
 */
export const parseReceiptAttachments = (val) => {
    if (!val) return [];
    let items = [];

    if (Array.isArray(val)) {
        items = val;
    } else if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    items = parsed;
                }
            } catch (e) {
                items = [trimmed];
            }
        } else {
            items = [trimmed];
        }
    }

    return items.map((item, index) => {
        if (!item) return null;
        if (typeof item === 'string') {
            const resolved = resolveMediaUrl(item);
            if (!resolved) return null;
            const meta = getFileCategory(resolved);
            return {
                id: `att-${index}-${resolved}`,
                url: resolved,
                label: '',
                name: meta.name,
                ext: meta.ext,
                isImg: meta.isImg,
                isPdf: meta.isPdf,
                isSpreadsheet: meta.isSpreadsheet,
                isDoc: meta.isDoc
            };
        }
        if (typeof item === 'object' && item.url) {
            const resolved = resolveMediaUrl(item.url);
            if (!resolved) return null;
            const meta = getFileCategory(item.name || resolved);
            return {
                id: item.id || `att-${index}-${resolved}`,
                url: resolved,
                label: typeof item.label === 'string' ? item.label : '',
                name: item.name || meta.name,
                size: item.size || null,
                ext: meta.ext,
                isImg: meta.isImg,
                isPdf: meta.isPdf,
                isSpreadsheet: meta.isSpreadsheet,
                isDoc: meta.isDoc
            };
        }
        return null;
    }).filter(Boolean);
};

/**
 * Returns an array of plain string URLs for backward compatibility.
 */
export const parseReceiptUrls = (val) => {
    return parseReceiptAttachments(val).map(a => a.url);
};

/**
 * Formats byte size into human readable string (B, KB, MB, GB).
 */
export const formatBytes = (bytes, decimals = 1) => {
    if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * Analyzes filename or URL to determine category and extension.
 */
export const getFileCategory = (filenameOrUrl) => {
    if (!filenameOrUrl) {
        return { name: '', ext: 'FILE', isImg: false, isPdf: false, isSpreadsheet: false, isDoc: false };
    }
    const clean = filenameOrUrl.split('?')[0];
    const parts = clean.split('/');
    const rawName = decodeURIComponent(parts[parts.length - 1] || clean);
    const ext = (rawName.split('.').pop() || '').toLowerCase();

    const isImg = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'bmp', 'svg'].includes(ext);
    const isPdf = ext === 'pdf';
    const isSpreadsheet = ['csv', 'xlsx', 'xls'].includes(ext);
    const isDoc = ['doc', 'docx', 'txt', 'rtf'].includes(ext);

    return {
        name: rawName,
        ext: ext.toUpperCase() || 'FILE',
        isImg,
        isPdf,
        isSpreadsheet,
        isDoc
    };
};
