// DB-matching layer for AI-extracted drafts.
//
// The AI returns free-text strings ("Cairo Cement", "أسمنت بورتلاند", "Villa
// project"). The user wants those resolved to existing tenant rows where
// possible — Supplier / Client / Project / Material — with a confidence score
// so the UI can surface "we matched X with 87% confidence — confirm?" prompts.
//
// Algorithm: Arabic-normalized + Bilingual Phonetic + Token Inclusion matcher.

import prisma from '../lib/prisma.js';
import { mapToExactCategory, resolvePaymentMethod } from './aiService.js';

// Common Arabic <-> English construction & Egyptian name transliterations
const TRANSLITERATIONS = {
    // Projects & Locations
    'الرحاب': 'rehab', 'rehab': 'الرحاب', 'al rehab': 'الرحاب', 'al-rehab': 'الرحاب',
    'فيلا': 'villa', 'villa': 'فيلا',
    'زايد': 'zayed', 'zayed': 'زايد', 'sheikh zayed': 'الشيخ زايد',
    'التجمع': 'tagamoa', 'tagamoa': 'التجمع', 'tagamo3': 'التجمع',
    'الشروق': 'shorouk', 'shorouk': 'الشروق',
    'مدينتي': 'madinaty', 'madinaty': 'مدينتي',
    'اكتوبر': 'october', 'october': 'اكتوبر',
    'المعادي': 'maadi', 'maadi': 'المعادي',
    'هليوبوليس': 'heliopolis', 'heliopolis': 'هليوبوليس',
    'عمارة': 'building', 'building': 'عمارة',
    'برج': 'tower', 'tower': 'برج',
    'مول': 'mall', 'mall': 'مول',
    'مدرسة': 'school', 'school': 'مدرسة',
    'مستشفى': 'hospital', 'hospital': 'مستشفى',
    'كمبوند': 'compound', 'compound': 'كمبوند',

    // People & Suppliers
    'حماده': 'hamada', 'حمادة': 'hamada', 'hamada': 'حماده',
    'احمد': 'ahmed', 'ahmed': 'احمد',
    'محمد': 'mohamed', 'mohamed': 'محمد', 'mohammed': 'محمد',
    'علي': 'ali', 'ali': 'علي',
    'حسن': 'hassan', 'hassan': 'حسن',
    'ابراهيم': 'ibrahim', 'ibrahim': 'ابراهيم',
    'محمود': 'mahmoud', 'mahmoud': 'محمود',
    'طارق': 'tarek', 'tarek': 'طارق',
    'خالد': 'khaled', 'khaled': 'خالد',
    'مصطفى': 'mostafa', 'mostafa': 'مصطفى',
    'عز': 'ezz', 'ezz': 'عز',
    'السويدي': 'elsewedy', 'elsewedy': 'السويدي', 'sewedy': 'السويدي',
    'الاهرام': 'ahram', 'ahram': 'الاهرام', 'الأهرام': 'ahram'
};

// ---------- Arabic normalization ----------
const normalizeArabic = (s) => {
    if (!s) return '';
    let str = String(s)
        .toLowerCase()
        .replace(/[ً-ْ]/g, '')           // strip diacritics (tashkeel)
        .replace(/[آأإ]/g, 'ا') // أ إ آ → ا
        .replace(/ة/g, 'ه')               // ة → ه
        .replace(/ي/g, 'ي')               // keep ya as-is
        .replace(/ى/g, 'ي')               // ى → ي
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')          // strip punctuation
        .replace(/\s+/g, ' ')
        .trim();

    return str;
};

const normalizeBilingual = (s) => {
    if (!s) return '';
    let norm = normalizeArabic(s);
    for (const [k, v] of Object.entries(TRANSLITERATIONS)) {
        norm = norm.replace(new RegExp(k, 'g'), v);
    }
    return norm;
};

// ---------- Levenshtein distance ----------
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

const similarityRatio = (a, b) => {
    const na = normalizeBilingual(a);
    const nb = normalizeBilingual(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    const dist = levenshtein(na, nb);
    const maxLen = Math.max(na.length, nb.length);
    return 1 - dist / maxLen;
};

const MIN_CONFIDENCE = 0.45;

const bestMatch = (query, fullText, candidates, getName) => {
    if (!candidates?.length) return null;
    let best = null;

    const qNorm = normalizeBilingual(query || '');
    const fNorm = normalizeBilingual(fullText || '');

    for (const c of candidates) {
        const rawName = getName(c);
        const nameNorm = normalizeBilingual(rawName);

        // 1. Direct Levenshtein similarity on query
        let score = qNorm ? similarityRatio(qNorm, nameNorm) : 0;

        // 2. Token inclusion check (e.g. 'hamada' or 'rehab' present in text)
        const nameTokens = nameNorm.split(/\s+/).filter(t => t.length >= 3);
        for (const token of nameTokens) {
            if ((qNorm && qNorm.includes(token)) || (fNorm && fNorm.includes(token))) {
                score = Math.max(score, 0.92);
            }
        }

        // 3. Candidate name is substring of query or fullText
        if ((qNorm && qNorm.includes(nameNorm)) || (fNorm && fNorm.includes(nameNorm))) {
            score = Math.max(score, 0.95);
        }

        if (!best || score > best.score) {
            best = { candidate: c, score };
        }
    }

    if (!best || best.score < MIN_CONFIDENCE) return null;
    return best;
};

// ---------- Per-entity matchers ----------

export const matchSupplier = async (vendorName, tenantId, fullText = '') => {
    const candidates = await prisma.supplier.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true, company: true, phone: true }
    });
    const m = bestMatch(vendorName, fullText, candidates, c => `${c.name} ${c.company || ''} ${c.phone || ''}`);
    return m ? { id: m.candidate.id, name: m.candidate.name, confidence: round(m.score) } : null;
};

export const matchClient = async (clientName, tenantId, fullText = '') => {
    const candidates = await prisma.client.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true, company: true, phone: true }
    });
    const m = bestMatch(clientName, fullText, candidates, c => `${c.name} ${c.company || ''} ${c.phone || ''}`);
    return m ? { id: m.candidate.id, name: m.candidate.name, confidence: round(m.score) } : null;
};

export const matchProject = async (projectName, tenantId, fullText = '') => {
    const candidates = await prisma.project.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true, location: true, client: { select: { name: true } } }
    });
    const m = bestMatch(projectName, fullText, candidates, c => `${c.name} ${c.location || ''} ${c.client?.name || ''}`);
    return m ? { id: m.candidate.id, name: m.candidate.name, confidence: round(m.score) } : null;
};

export const matchMaterial = async (itemName, tenantId, fullText = '') => {
    if (!itemName) return null;
    const candidates = await prisma.material.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true, nameAr: true, unit: true, unitPrice: true }
    });
    const m = bestMatch(itemName, fullText, candidates, c => `${c.name} ${c.nameAr || ''}`);
    return m
        ? { id: m.candidate.id, name: m.candidate.name, unit: m.candidate.unit, unitPrice: m.candidate.unitPrice, confidence: round(m.score) }
        : null;
};

export const matchWorkman = async (workmanName, tenantId, fullText = '') => {
    if (!workmanName && !fullText) return null;
    const candidates = await prisma.workman.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true, nameAr: true, trade: true, customTrade: true, dailyRate: true }
    });
    const m = bestMatch(workmanName, fullText, candidates, c => `${c.name} ${c.nameAr || ''} ${c.trade || ''} ${c.customTrade || ''}`);
    return m
        ? { id: m.candidate.id, name: m.candidate.name, trade: m.candidate.trade || m.candidate.customTrade, dailyRate: m.candidate.dailyRate, confidence: round(m.score) }
        : null;
};

export const matchUser = async (userName, tenantId, fullText = '') => {
    if (!userName && !fullText) return null;
    const candidates = await prisma.user.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, role: true }
    });
    const m = bestMatch(userName, fullText, candidates, c => `${c.name} ${c.role || ''}`);
    return m ? { id: m.candidate.id, name: m.candidate.name, role: m.candidate.role, confidence: round(m.score) } : null;
};

const round = (n) => Math.round(n * 100) / 100;

// ---------- Top-level: take a raw AI extraction and produce a matched draft ----------
export const matchExtractionToTenant = async (extraction, source, tenantId, userId = null, rawText = '') => {
    const ext = extraction || {};
    const fullText = [
        rawText,
        ext.summary,
        ext.description,
        ext.transcript,
        ext.vendor,
        ext.clientName,
        ext.projectName,
        ext.project_name,
        ext.workmanName
    ].filter(Boolean).join(' ');

    // 1. Supplier / Vendor matching
    const vendorQuery = ext.vendor || ext.supplier || ext.supplierName || ext.merchant_name || '';
    let supplierMatch = null;
    if (ext.supplierId) {
        const directSupplier = await prisma.supplier.findFirst({
            where: { id: ext.supplierId, tenantId, deletedAt: null },
            select: { id: true, name: true }
        });
        if (directSupplier) {
            supplierMatch = { id: directSupplier.id, name: directSupplier.name, confidence: 1.0 };
        }
    }
    if (!supplierMatch && (vendorQuery || fullText)) {
        supplierMatch = await matchSupplier(vendorQuery, tenantId, fullText);
    }

    // 2. Project matching
    const projectQuery = ext.projectName || ext.project || ext.project_name || '';
    let projectMatch = null;
    if (ext.projectId) {
        const directProject = await prisma.project.findFirst({
            where: { id: ext.projectId, tenantId, deletedAt: null },
            select: { id: true, name: true }
        });
        if (directProject) {
            projectMatch = { id: directProject.id, name: directProject.name, confidence: 1.0 };
        }
    }
    if (!projectMatch && (projectQuery || fullText)) {
        projectMatch = await matchProject(projectQuery, tenantId, fullText);
    }

    // 3. Client matching
    const clientQuery = ext.clientName || ext.client || ext.client_name || '';
    let clientMatch = null;
    if (ext.clientId) {
        const directClient = await prisma.client.findFirst({
            where: { id: ext.clientId, tenantId, deletedAt: null },
            select: { id: true, name: true }
        });
        if (directClient) {
            clientMatch = { id: directClient.id, name: directClient.name, confidence: 1.0 };
        }
    }
    if (!clientMatch && (clientQuery || fullText)) {
        clientMatch = await matchClient(clientQuery, tenantId, fullText);
    }

    // 4. Workman / Laborer matching
    const workmanQuery = ext.workmanName || ext.workman || ext.technician || ext.craftsman || '';
    let workmanMatch = null;
    if (ext.workmanId) {
        const directWorkman = await prisma.workman.findFirst({
            where: { id: ext.workmanId, tenantId, deletedAt: null },
            select: { id: true, name: true, trade: true, dailyRate: true }
        });
        if (directWorkman) {
            workmanMatch = { id: directWorkman.id, name: directWorkman.name, trade: directWorkman.trade, confidence: 1.0 };
        }
    }
    if (!workmanMatch && (workmanQuery || fullText)) {
        workmanMatch = await matchWorkman(workmanQuery, tenantId, fullText);
    }

    // 5. Payer / Custody Holder matching
    let payerUserMatch = null;
    if (ext.payerUserId) {
        const directUser = await prisma.user.findFirst({
            where: { id: ext.payerUserId, tenantId, isActive: true },
            select: { id: true, name: true, role: true }
        });
        if (directUser) {
            payerUserMatch = { id: directUser.id, name: directUser.name, role: directUser.role, confidence: 1.0 };
        }
    }

    // 6. Match line items
    const items = Array.isArray(ext.items) ? ext.items : [];
    const matchedItems = await Promise.all(items.map(async (it) => {
        let materialMatch = null;
        if (it?.materialId) {
            const directMat = await prisma.material.findFirst({
                where: { id: it.materialId, tenantId, deletedAt: null },
                select: { id: true, name: true, unit: true, unitPrice: true }
            });
            if (directMat) {
                materialMatch = { id: directMat.id, name: directMat.name, unit: directMat.unit, unitPrice: directMat.unitPrice, confidence: 1.0 };
            }
        }
        if (!materialMatch && it?.name) {
            materialMatch = await matchMaterial(it.name, tenantId, fullText);
        }
        return {
            ...it,
            materialId: materialMatch?.id ?? it?.materialId ?? null,
            materialMatch
        };
    }));

    // Fine-grained category and payment method
    const category = mapToExactCategory(ext.category, items, fullText);
    const paymentMethod = ext.paymentMethod || resolvePaymentMethod(ext, fullText);

    // Resolve transaction type (EXPENSE or INCOME)
    let type = 'EXPENSE';
    if (ext.transactionType === 'REVENUE' || ext.transactionType === 'INCOME' || (clientMatch && (category === 'CLIENT_PAYMENT' || fullText.includes('استلام دفعة') || fullText.includes('تحصيل من العميل')))) {
        type = 'INCOME';
    }

    return {
        draft: {
            type,
            amount: ext.totalAmount ?? ext.amount ?? null,
            subtotal: ext.subtotal ?? null,
            taxAmount: ext.taxAmount ?? null,
            currency: ext.currency ?? 'EGP',
            transactionDate: ext.transactionDate ?? new Date().toISOString().slice(0, 10),
            category,
            paymentMethod,
            payerUserId: payerUserMatch?.id || userId || null,
            description: ext.summary ?? ext.description ?? '',
            // Resolved IDs pre-fill the form cleanly
            supplierId: supplierMatch?.id ?? null,
            clientId: clientMatch?.id ?? null,
            projectId: projectMatch?.id ?? null,
            workmanId: workmanMatch?.id ?? null,
            isStockPurchase: !!ext.is_stock_purchase,
            items: matchedItems
        },
        matches: {
            vendor: { raw: vendorQuery || null, ...supplierMatch ? { matched: supplierMatch } : { matched: null } },
            client: { raw: clientQuery || null, matched: clientMatch },
            project: { raw: projectQuery || null, matched: projectMatch },
            workman: { raw: workmanQuery || null, matched: workmanMatch },
            payerUser: { raw: ext.payerUserId || null, matched: payerUserMatch },
            items: matchedItems.map(it => ({ raw: it?.name || null, matched: it?.materialMatch }))
        }
    };
};

export const _internals = { normalizeArabic, normalizeBilingual, levenshtein, similarityRatio, bestMatch };
