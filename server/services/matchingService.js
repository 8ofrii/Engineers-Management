// DB-matching layer for AI-extracted drafts.
//
// The AI returns free-text strings ("Cairo Cement", "أسمنت بورتلاند", "Villa
// project"). The user wants those resolved to existing tenant rows where
// possible — Supplier / Client / Project / Material — with a confidence score
// so the UI can surface "we matched X with 87% confidence — confirm?" prompts.
//
// Algorithm: Arabic-normalized Levenshtein-based similarity ratio. Cheap,
// pure-JS, dependency-free, good enough for v1. We can upgrade to pg_trgm or
// vector embeddings later if precision becomes a problem.

import prisma from '../lib/prisma.js';

// ---------- Arabic normalization ----------
// Several characters have multiple visual forms that mean the same thing in
// most contexts (alef variants, tah marbuta, etc.). Normalizing them before
// comparison lets "شركة" match "شركه" and "أحمد" match "احمد".
const normalizeArabic = (s) => {
    if (!s) return '';
    return String(s)
        .toLowerCase()
        .replace(/[ً-ْ]/g, '')           // strip diacritics (tashkeel)
        .replace(/[آأإ]/g, 'ا') // أ إ آ → ا
        .replace(/ة/g, 'ه')               // ة → ه
        .replace(/ي/g, 'ي')               // keep ya as-is
        .replace(/ى/g, 'ي')               // ى → ي
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')          // strip punctuation
        .replace(/\s+/g, ' ')
        .trim();
};

// ---------- Levenshtein distance (iterative, O(n*m) memory-light) ----------
const levenshtein = (a, b) => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    let curr = new Array(b.length + 1);
    for (let i = 1; i <= a.length; i++) {
        curr[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
    }
    return prev[b.length];
};

// 1.0 = identical, 0.0 = nothing in common
const similarityRatio = (a, b) => {
    const na = normalizeArabic(a);
    const nb = normalizeArabic(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    const dist = levenshtein(na, nb);
    const maxLen = Math.max(na.length, nb.length);
    return 1 - dist / maxLen;
};

const MIN_CONFIDENCE = 0.5; // below this, no match (free-text string passes through)

const bestMatch = (query, candidates, getName) => {
    if (!query || !candidates?.length) return null;
    let best = null;
    for (const c of candidates) {
        const name = getName(c);
        const score = similarityRatio(query, name);
        if (!best || score > best.score) best = { candidate: c, score };
    }
    if (!best || best.score < MIN_CONFIDENCE) return null;
    return best;
};

// ---------- Per-entity matchers ----------
// Each returns either { id, name, confidence } or null.
// The Json `matchedDraft` will store these alongside the original AI string so
// the UI can render "Cairo Cement → Cairo Cement Co (matched 92%) [change]".

export const matchSupplier = async (vendorName, tenantId) => {
    if (!vendorName) return null;
    const candidates = await prisma.supplier.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true }
    });
    const m = bestMatch(vendorName, candidates, c => c.name);
    return m ? { id: m.candidate.id, name: m.candidate.name, confidence: round(m.score) } : null;
};

export const matchClient = async (clientName, tenantId) => {
    if (!clientName) return null;
    const candidates = await prisma.client.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true, company: true }
    });
    // Match against name OR company so "Cairo Real Estate" matches a client whose
    // primary contact is "Ahmed" but whose company is "Cairo Real Estate Dev"
    const m = bestMatch(clientName, candidates, c => `${c.name} ${c.company || ''}`);
    return m ? { id: m.candidate.id, name: m.candidate.name, confidence: round(m.score) } : null;
};

export const matchProject = async (projectName, tenantId) => {
    if (!projectName) return null;
    const candidates = await prisma.project.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true }
    });
    const m = bestMatch(projectName, candidates, c => c.name);
    return m ? { id: m.candidate.id, name: m.candidate.name, confidence: round(m.score) } : null;
};

export const matchMaterial = async (itemName, tenantId) => {
    if (!itemName) return null;
    const candidates = await prisma.material.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true, unit: true }
    });
    const m = bestMatch(itemName, candidates, c => c.name);
    return m
        ? { id: m.candidate.id, name: m.candidate.name, unit: m.candidate.unit, confidence: round(m.score) }
        : null;
};

const round = (n) => Math.round(n * 100) / 100;

// ---------- Top-level: take a raw AI extraction and produce a matched draft ----------
//
// Returns { draft, matches } where:
//   draft  — the values to show in the form (with matched IDs where found)
//   matches — per-field match metadata for the UI to render confidence pills
export const matchExtractionToTenant = async (extraction, source, tenantId) => {
    const isReceipt = source === 'RECEIPT';

    const supplierMatch = await matchSupplier(extraction.vendor, tenantId);
    const projectMatch = extraction.project_name
        ? await matchProject(extraction.project_name, tenantId)
        : null;
    const clientMatch = extraction.client_name
        ? await matchClient(extraction.client_name, tenantId)
        : null;

    // Match each line item to a Material if possible
    const items = Array.isArray(extraction.items) ? extraction.items : [];
    const matchedItems = await Promise.all(items.map(async (it) => {
        const materialMatch = await matchMaterial(it.name, tenantId);
        return {
            ...it,
            materialMatch
        };
    }));

    return {
        draft: {
            type: 'EXPENSE',
            amount: isReceipt ? (extraction.totalAmount ?? null) : (extraction.amount ?? null),
            subtotal: extraction.subtotal ?? null,
            taxAmount: extraction.taxAmount ?? null,
            currency: extraction.currency ?? 'EGP',
            transactionDate: extraction.transactionDate ?? null,
            category: extraction.category ?? 'OTHER',
            description: extraction.summary ?? '',
            // Resolved IDs (null when no confident match) — UI can use these to
            // pre-select dropdowns; they fall back to free-text otherwise.
            supplierId: supplierMatch?.id ?? null,
            clientId: clientMatch?.id ?? null,
            projectId: projectMatch?.id ?? null,
            isStockPurchase: !!extraction.is_stock_purchase,
            items: matchedItems
        },
        matches: {
            vendor: { raw: extraction.vendor ?? null, ...supplierMatch ? { matched: supplierMatch } : { matched: null } },
            client: { raw: extraction.client_name ?? null, matched: clientMatch },
            project: { raw: extraction.project_name ?? null, matched: projectMatch },
            items: matchedItems.map(it => ({ raw: it.name, matched: it.materialMatch }))
        }
    };
};

export const _internals = { normalizeArabic, levenshtein, similarityRatio, bestMatch };
