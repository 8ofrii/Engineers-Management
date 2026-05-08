// Tiny CSV parser. Egyptian bank exports are usually plain CSV with a header
// row, comma-separated, occasional quoted strings. This handles those plus
// escaped quotes ("" inside a quoted field). No external dependency.
//
// Returns { headers: string[], rows: object[] }. Each row is keyed by the
// (lower-cased, trimmed) header so callers can do a case-insensitive lookup.

const parseLine = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
                else inQuotes = false;
            } else {
                cur += ch;
            }
        } else {
            if (ch === '"') inQuotes = true;
            else if (ch === ',') { out.push(cur); cur = ''; }
            else cur += ch;
        }
    }
    out.push(cur);
    return out.map(s => s.trim());
};

export const parseCsv = (text) => {
    if (!text || typeof text !== 'string') return { headers: [], rows: [] };
    // Normalize line endings; strip BOM that Excel-exported CSVs love to add.
    const cleaned = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleaned.split('\n').filter(l => l.length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const cells = parseLine(lines[i]);
        if (cells.length === 1 && cells[0] === '') continue; // skip blank lines
        const row = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = cells[j] ?? '';
        }
        row.__rowIndex = i;
        rows.push(row);
    }
    return { headers, rows };
};

// Egyptian banks vary on column naming. We accept a list of synonyms per
// canonical field and pick the first match present.
const SYNONYMS = {
    date:        ['date', 'transaction date', 'value date', 'posting date', 'تاريخ', 'تاريخ المعاملة'],
    description: ['description', 'narrative', 'particulars', 'details', 'memo', 'الوصف', 'البيان'],
    debit:       ['debit', 'withdrawal', 'amount out', 'مدين', 'سحب'],
    credit:      ['credit', 'deposit', 'amount in', 'دائن', 'إيداع'],
    amount:      ['amount', 'value', 'المبلغ', 'القيمة'],
    reference:   ['reference', 'ref', 'transaction id', 'مرجع', 'رقم المرجع']
};

const findHeader = (headers, candidates) => {
    for (const c of candidates) {
        const cLower = c.toLowerCase().replace(/\s+/g, '');
        const idx = headers.findIndex(h => {
            const hClean = h.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
            const hCondensed = hClean.replace(/\s+/g, '');
            return hCondensed === cLower || hClean.includes(c.toLowerCase());
        });
        if (idx >= 0) return headers[idx];
    }
    return null;
};

const parseDate = (raw) => {
    if (!raw) return null;
    // Try ISO-ish first
    const iso = new Date(raw);
    if (!isNaN(iso.getTime())) return iso;
    // DD/MM/YYYY (most common in Egypt)
    const m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) {
        const [, d, mo, y] = m;
        const year = y.length === 2 ? 2000 + Number(y) : Number(y);
        const dt = new Date(year, Number(mo) - 1, Number(d));
        if (!isNaN(dt.getTime())) return dt;
    }
    return null;
};

const parseAmount = (raw) => {
    if (raw === '' || raw == null) return null;
    // Strip currency markers, commas, parentheses (some banks use (123) for negatives)
    const cleaned = String(raw)
        .replace(/[٬,\s]/g, '')   // Arabic + Latin thousand separator + spaces
        .replace(/EGP|ج\.م|LE/gi, '')
        .replace(/[()]/g, m => m === '(' ? '-' : ''); // parens → negative
    const n = Number(cleaned);
    return isNaN(n) ? null : n;
};

/**
 * Normalize parsed CSV rows into the shape the bank-statement model expects:
 *   { rawDate, parsedDate, amount, description, reference }
 * Sign convention: positive = money in, negative = money out.
 */
export const normalizeBankRows = (parsed) => {
    const { headers, rows } = parsed;
    const dateKey = findHeader(headers, SYNONYMS.date);
    const descKey = findHeader(headers, SYNONYMS.description);
    const debitKey = findHeader(headers, SYNONYMS.debit);
    const creditKey = findHeader(headers, SYNONYMS.credit);
    const amountKey = findHeader(headers, SYNONYMS.amount);
    const refKey = findHeader(headers, SYNONYMS.reference);

    if (!dateKey) {
        const err = new Error(`CSV is missing a date column. Expected one of: ${SYNONYMS.date.join(', ')}`);
        err.statusCode = 400;
        throw err;
    }
    if (!debitKey && !creditKey && !amountKey) {
        const err = new Error('CSV is missing an amount column (Debit, Credit, or Amount).');
        err.statusCode = 400;
        throw err;
    }

    return rows.map((r, idx) => {
        const rawDate = r[dateKey];
        let amount = null;
        if (amountKey) {
            amount = parseAmount(r[amountKey]);
        } else {
            const debit = parseAmount(r[debitKey]);
            const credit = parseAmount(r[creditKey]);
            // Sum: credits positive, debits negative. If only one side present, use that.
            if (debit != null || credit != null) {
                amount = (credit ?? 0) - (debit ?? 0);
            }
        }
        return {
            rowIndex: r.__rowIndex ?? (idx + 1),
            rawDate,
            parsedDate: parseDate(rawDate),
            amount,
            description: descKey ? r[descKey] : null,
            reference: refKey ? r[refKey] : null
        };
    }).filter(r => r.amount != null && r.amount !== 0);
};
