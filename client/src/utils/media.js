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
    if (!url || typeof url !== 'string') return null;
    let clean = url.trim().replace(/^["'\[\]]+|["'\[\]]+$/g, '').trim();
    if (!clean) return null;
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('blob:') || clean.startsWith('data:')) {
        return clean;
    }
    clean = clean.replace(/^(\/?uploads\/|\/+)/, '');
    if (clean.startsWith('receipt-') && !clean.startsWith('receipts/')) {
        return `/uploads/receipts/${clean}`;
    }
    if (clean.startsWith('voice-') && !clean.startsWith('audio/')) {
        return `/uploads/audio/${clean}`;
    }
    if (clean.startsWith('doc-') && !clean.startsWith('documents/')) {
        return `/uploads/documents/${clean}`;
    }
    if (clean.startsWith('img-') && !clean.startsWith('images/')) {
        return `/uploads/images/${clean}`;
    }
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
 * [{ id, url, label, name, ext, isImg, isPdf, isSpreadsheet, isDoc, isExisting }]
 */
export const parseReceiptAttachments = (val) => {
    if (!val) return [];
    let items = [];

    if (Array.isArray(val)) {
        items = val;
    } else if (typeof val === 'string') {
        let trimmed = val.trim();
        if (!trimmed) return [];
        // Handle escaped or double-encoded strings
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            try {
                const unquoted = JSON.parse(trimmed);
                if (typeof unquoted === 'string') trimmed = unquoted.trim();
            } catch (e) {}
        }
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    items = parsed;
                }
            } catch (e) {
                try {
                    const inner = trimmed.slice(1, -1).trim();
                    const parts = inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
                    items = parts;
                } catch (err) {
                    items = [trimmed];
                }
            }
        } else {
            items = [trimmed];
        }
    }

    return items.map((item, index) => {
        if (!item) return null;
        if (typeof item === 'string') {
            const cleanStr = item.trim().replace(/^["'\[\]]+|["'\[\]]+$/g, '').trim();
            if (!cleanStr) return null;
            const resolved = resolveMediaUrl(cleanStr);
            if (!resolved) return null;
            const meta = getFileCategory(resolved);
            return {
                id: `att-exist-${index}-${resolved}`,
                url: resolved,
                label: '',
                name: meta.name,
                ext: meta.ext,
                isImg: meta.isImg,
                isPdf: meta.isPdf,
                isSpreadsheet: meta.isSpreadsheet,
                isDoc: meta.isDoc,
                isExisting: true
            };
        }
        if (typeof item === 'object' && item.url) {
            const cleanUrl = String(item.url).trim().replace(/^["'\[\]]+|["'\[\]]+$/g, '').trim();
            if (!cleanUrl) return null;
            const resolved = resolveMediaUrl(cleanUrl);
            if (!resolved) return null;
            const meta = getFileCategory(item.name || resolved);
            return {
                id: item.id || `att-exist-${index}-${resolved}`,
                url: resolved,
                label: typeof item.label === 'string' ? item.label : '',
                name: item.name || meta.name,
                size: item.size || null,
                ext: meta.ext,
                isImg: meta.isImg,
                isPdf: meta.isPdf,
                isSpreadsheet: meta.isSpreadsheet,
                isDoc: meta.isDoc,
                isExisting: true
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
    let clean = String(filenameOrUrl).trim().replace(/^["'\[\]]+|["'\[\]]+$/g, '').trim();
    clean = clean.split('?')[0];
    const parts = clean.split('/');
    const rawName = decodeURIComponent(parts[parts.length - 1] || clean);
    const ext = (rawName.split('.').pop() || '').replace(/["'\[\]]+$/g, '').toLowerCase();

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

