import OpenAI from 'openai';
import fs from 'fs';
import { createRequire } from 'module';
import Tesseract from 'tesseract.js';
import logger from '../lib/logger.js';

const require = createRequire(import.meta.url);
let PDFParseLib = null;
try {
    PDFParseLib = require('pdf-parse');
} catch (_) {}

/**
 * Safely extract text from PDF buffer
 */
async function parsePdfBuffer(buffer) {
    if (!buffer) return '';
    try {
        if (PDFParseLib?.PDFParse) {
            const parser = new PDFParseLib.PDFParse({ data: buffer });
            const res = await parser.getText();
            await parser.destroy().catch(() => {});
            if (res?.text && res.text.trim()) return res.text;
        } else if (typeof PDFParseLib === 'function') {
            const res = await PDFParseLib(buffer);
            if (res?.text && res.text.trim()) return res.text;
        }
    } catch (err) {
        logger.warn({ err }, 'PDF library extraction error, falling back to raw buffer scan');
    }

    // Fallback: extract legible strings from buffer
    try {
        const raw = buffer.toString('utf-8');
        const textParts = raw.match(/[\u0600-\u06FF\w\s.,:/-]{4,}/g);
        if (textParts && textParts.length > 0) {
            return textParts.join(' ');
        }
    } catch (_) {}

    return '';
}

/**
 * Perform high-accuracy Arabic & English OCR on image buffers (receipts, wallet screenshots, invoices)
 */
async function extractTextFromImageBuffer(buffer) {
    if (!buffer) return '';
    try {
        const ret = await Tesseract.recognize(buffer, 'eng+ara');
        return ret?.data?.text || '';
    } catch (err) {
        logger.warn({ err }, 'Tesseract image OCR failed');
        return '';
    }
}

// Lazy initialization for OpenAI if provided
let openai = null;
const getOpenAI = () => {
    if (!openai && process.env.OPENAI_API_KEY) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
};

/**
 * Build dynamic database context (projects, suppliers, materials, categories) to inject into the AI prompt
 */
export function buildDynamicContext(context = {}) {
    const lines = [];

    // 1. Projects
    if (Array.isArray(context.projects) && context.projects.length > 0) {
        lines.push(`\n**Company Existing Projects (If the voice/receipt mentions a project name or site location, match it to the exact Project ID):**`);
        for (const p of context.projects) {
            lines.push(`- Project ID: "${p.id}" | Name: "${p.name}"`);
        }
    }

    // 2. Suppliers
    if (Array.isArray(context.suppliers) && context.suppliers.length > 0) {
        lines.push(`\n**Company Existing Suppliers (If the voice/receipt mentions a vendor/supplier/contractor, match it to the exact Supplier ID):**`);
        for (const s of context.suppliers) {
            lines.push(`- Supplier ID: "${s.id}" | Name: "${s.name}"${s.company ? ` (${s.company})` : ''}`);
        }
    }

    // 3. Materials
    if (Array.isArray(context.materials) && context.materials.length > 0) {
        lines.push(`\n**Company Inventory Materials (Match purchased items to these when applicable):**`);
        for (const m of context.materials.slice(0, 40)) {
            lines.push(`- Material: "${m.name}" (${m.unit || 'وحدة'})`);
        }
    }

    // 4. Exact ERP Categories
    lines.push(`
**Allowed Cost Categories (Select the single best exact enum key):**
- PAINTING_MATERIALS (خامات دهانات / بويات / سيلر / معجون / جوتن / سكيب)
- PAINTING_LABOR (مصنعية دهانات / نقاشة / نقاش)
- CEMENT (اسمنت / أسمنت / شيكارة اسمنت)
- SAND (رمل / مقطورة رمل)
- BRICKS (طوب / طوب أحمر / طوب أسمنتي)
- CONCRETE (خرسانات / صب خرسانة / خلاطة / بمب)
- PLASTERING_MATERIALS (خامات محارة / جبس محارة / أديبوند)
- PLASTERING_LABOR (مصنعية محارة / بياض / مبيض محارة)
- PLUMBING_MATERIALS (خامات سباكة / مواسير / محابس / صرف)
- PLUMBING_LABOR (مصنعية سباكة / سباك)
- ELECTRICAL_MATERIALS (خامات كهرباء / اسلاك / مفاتيح / ليد)
- ELECTRICAL_LABOR (مصنعية كهرباء / كهربائي)
- CERAMIC_MATERIALS (خامات سيراميك / بلاط / بورسلين / رخام)
- CERAMIC_LABOR (مصنعية سيراميك / مبلط)
- GYPSUM_MATERIALS (خامات جبس بورد / صاج / الواح)
- GYPSUM_LABOR (مصنعية جبس بورد)
- CARPENTRY_MATERIALS (خامات نجارة / أبواب / شبابيك / خشب)
- CARPENTRY_LABOR (مصنعية نجارة / نجار)
- GENERAL_LABOR (مصنعية عمالة / يوميات عمال / شيالين)
- MASONRY_LABOR (مصنعية بناء / بنا)
- SITE_CLEANING (نظافة / تنظيف موقع)
- STOCKING (تشوين / مشال / ونش تشوين)
- TRANSPORT (نقل / سيارات نقل / مصاريف مشوار)
- DECOR (ديكور / ورق حائط / بديل خشب / بديل رخام)
- DRAWINGS (رسومات هندسية / تصميمات)
- TIPS (اكراميات / شاي وبخشيش)
- INSULATION_LABOR (مصنعية عزل / عزل حمامات واسطح)
- HVAC_PREP (تاسيس تكيف / نحاس تكييف)
- ALUMETAL (الوميتال / قطاعات / زجاج)
- OTHER (أخرى / متنوع)

**Allowed Payment Methods:**
- CASH (نقداً / كاش / دفع يدوي)
- CUSTODY_WALLET (من العهدة / عهدة المهندس)
- BANK_TRANSFER (تحويل بنكي / فودافون كاش / انستاباي / محفظة إلكترونية / تحويل)
- CHECK (شيك)
- CREDIT_CARD (فيزا / كارت / بطاقة بنكية)
- OTHER (أخرى)
`);

    return lines.join('\n');
}

const SYSTEM_PROMPT = `
You are an expert Arabic AI Assistant for an Egyptian Construction ERP (Hesaby).
Your role is to parse spoken voice notes and text from site engineers into structured accounting data.
You natively understand Egyptian Arabic, all regional accents (Cairo, Delta, Upper Egypt, Alexandria), slang, transliterations, Franco-Arab, abbreviations, and informal nicknames.

**Output Schema (Strict JSON):**
{
  "summary": "String (Clear Arabic description of what was purchased or paid)",
  "totalAmount": Number (Total cost or money spent),
  "projectId": "String (The exact matching Project ID UUID from the Company Existing Projects list, or null if not mentioned)",
  "supplierId": "String (The exact matching Supplier ID UUID from the Company Existing Suppliers list, or null if not mentioned)",
  "vendor": "String or null (Vendor, contractor, or supplier name as mentioned)",
  "projectName": "String or null (Project name as mentioned)",
  "category": "Exact enum key from the Allowed Cost Categories list",
  "paymentMethod": "CASH | CUSTODY_WALLET | BANK_TRANSFER | CHECK | CREDIT_CARD | OTHER",
  "is_stock_purchase": Boolean (True for physical building materials. False for labor/services/wages),
  "items": [
    { "name": "String", "quantity": Number, "unit": "String", "unitPrice": Number or null, "total": Number or null }
  ]
}
`;

const RECEIPT_SYSTEM_PROMPT = `
You are an expert financial OCR extraction engine for an Egyptian Construction ERP system (Hesaby).
Your role is to extract structured accounting data from receipts, invoices, and mobile wallet records (Vodafone Cash, InstaPay, Bank transfers).

**Output Schema (Strict JSON):**
{
  "summary": "String (Detailed Arabic description of the transaction)",
  "totalAmount": Number (Final total amount paid/deducted),
  "subtotal": Number or null,
  "taxAmount": Number or null,
  "currency": "EGP",
  "projectId": "String (The exact matching Project ID UUID from Company Existing Projects, or null if not mentioned)",
  "supplierId": "String (The exact matching Supplier ID UUID from Company Existing Suppliers, or null if not mentioned)",
  "vendor": "String or null (Merchant name, recipient name, or recipient phone)",
  "projectName": "String or null (Project name)",
  "category": "Exact enum key from Allowed Cost Categories",
  "paymentMethod": "CASH | CUSTODY_WALLET | BANK_TRANSFER | CHECK | CREDIT_CARD | OTHER",
  "transactionDate": "YYYY-MM-DD",
  "items": [
    { "name": "String", "quantity": Number, "unit": "String or null", "unitPrice": Number or null, "total": Number or null }
  ],
  "confidence": "high | medium | low"
}
`;

/**
 * Map detected Arabic/English terms to exact ERP category keys
 */
export function mapToExactCategory(category, items = [], fullText = '') {
    const text = [
        category,
        fullText,
        ...items.map(i => i?.name || '')
    ].filter(Boolean).join(' ').toLowerCase();

    // Specific materials & labors
    if (text.includes('دهان') || text.includes('بويات') || text.includes('بوية') || text.includes('paint')) {
        return (text.includes('مصنع') || text.includes('شغل') || text.includes('عمال')) ? 'PAINTING_LABOR' : 'PAINTING_MATERIALS';
    }
    if (text.includes('اسمنت') || text.includes('إسمنت') || text.includes('cement')) return 'CEMENT';
    if (text.includes('رمل') || text.includes('sand')) return 'SAND';
    if (text.includes('طوب') || text.includes('brick')) return 'BRICKS';
    if (text.includes('خرسان') || text.includes('concrete')) return 'CONCRETE';
    if (text.includes('محار') || text.includes('plaster')) {
        return (text.includes('مصنع') || text.includes('شغل') || text.includes('عمال')) ? 'PLASTERING_LABOR' : 'PLASTERING_MATERIALS';
    }
    if (text.includes('سباك') || text.includes('plumbing') || text.includes('مواسير')) {
        return (text.includes('مصنع') || text.includes('شغل') || text.includes('عمال')) ? 'PLUMBING_LABOR' : 'PLUMBING_MATERIALS';
    }
    if (text.includes('كهربا') || text.includes('electric') || text.includes('اسلاك') || text.includes('سلك')) {
        return (text.includes('مصنع') || text.includes('شغل') || text.includes('عمال')) ? 'ELECTRICAL_LABOR' : 'ELECTRICAL_MATERIALS';
    }
    if (text.includes('سيراميك') || text.includes('بورسلين') || text.includes('بلاط') || text.includes('ceramic')) {
        return (text.includes('مصنع') || text.includes('شغل') || text.includes('عمال')) ? 'CERAMIC_LABOR' : 'CERAMIC_MATERIALS';
    }
    if (text.includes('جبس') || text.includes('gypsum')) {
        return (text.includes('مصنع') || text.includes('شغل') || text.includes('عمال')) ? 'GYPSUM_LABOR' : 'GYPSUM_MATERIALS';
    }
    if (text.includes('نجار') || text.includes('خشب') || text.includes('carpentry')) {
        return (text.includes('مصنع') || text.includes('شغل') || text.includes('عمال')) ? 'CARPENTRY_LABOR' : 'CARPENTRY_MATERIALS';
    }
    if (text.includes('نظاف') || text.includes('cleaning')) return 'SITE_CLEANING';
    if (text.includes('تشوين') || text.includes('مشال') || text.includes('handling')) return 'STOCKING';
    if (text.includes('نقل') || text.includes('transport') || text.includes('توصيل')) return 'TRANSPORT';
    if (text.includes('ديكور') || text.includes('decor')) return 'DECOR';
    if (text.includes('رسومات') || text.includes('تصميم') || text.includes('drawing')) return 'DRAWINGS';
    if (text.includes('اكرام') || text.includes('بخشيش') || text.includes('tip')) return 'TIPS';
    if (text.includes('عزل') || text.includes('insulation')) return 'INSULATION_LABOR';
    if (text.includes('تكييف') || text.includes('تكيف') || text.includes('hvac')) return 'HVAC_PREP';
    if (text.includes('الوميتال') || text.includes('alumetal') || text.includes('المنيوم')) return 'ALUMETAL';
    if (text.includes('مصنعي') || text.includes('عمال') || text.includes('يومي') || text.includes('labor') || text.includes('wages')) return 'GENERAL_LABOR';

    return 'OTHER';
}

/**
 * Detect payment method from text and extracted fields
 */
export function resolvePaymentMethod(data = {}, fullText = '') {
    const text = [
        data.paymentMethod,
        data.payment_method,
        data.payment,
        fullText
    ].filter(Boolean).join(' ').toLowerCase();

    if (text.includes('كاش') || text.includes('نقدا') || text.includes('نقد') || text.includes('cash')) {
        return 'CASH';
    }
    if (text.includes('عهدة') || text.includes('عهده') || text.includes('custody')) {
        return 'CUSTODY_WALLET';
    }
    if (text.includes('تحويل') || text.includes('فودافون كاش') || text.includes('انستاباي') || text.includes('instapay') || text.includes('بنك') || text.includes('bank') || text.includes('transfer')) {
        return 'BANK_TRANSFER';
    }
    if (text.includes('شيك') || text.includes('check') || text.includes('cheque')) {
        return 'CHECK';
    }
    if (text.includes('فيزا') || text.includes('كارت') || text.includes('بطاقة') || text.includes('card') || text.includes('credit')) {
        return 'CREDIT_CARD';
    }
    return 'CASH';
}

/**
 * Normalize whatever the LLM returned into standard TransactionDraft format
 */
/**
 * Normalize whatever the LLM returned into standard TransactionDraft format
 */
export function normalizeExtractedData(data, rawText = '', context = {}) {
    if (!data) return null;

    // 1. Total Amount
    let totalAmount = data.totalAmount ?? data.amount ?? data.total ?? null;
    if (typeof totalAmount === 'object' && totalAmount !== null) {
        totalAmount = totalAmount.value ?? totalAmount.amount ?? null;
    }
    if (typeof totalAmount === 'string') {
        totalAmount = parseFloat(totalAmount.replace(/[^0-9.]/g, '')) || null;
    }

    let feeAmount = data.taxAmount ?? data.fees ?? data.fee ?? null;
    if (typeof feeAmount === 'object' && feeAmount !== null) {
        feeAmount = feeAmount.value ?? null;
    }
    if (typeof feeAmount === 'string') {
        feeAmount = parseFloat(feeAmount.replace(/[^0-9.]/g, '')) || null;
    }

    // 2. Vendor / Recipient & Supplier ID
    let vendor = data.vendor || data.merchant_name || data.recipient_name || data.supplier || data.supplierName || null;
    if (!vendor && data.to) {
        const toName = typeof data.to === 'object' ? data.to.name : data.to;
        const toPhone = typeof data.to === 'object' ? data.to.phone_number : null;
        vendor = toName ? `${toName}${toPhone && toName !== toPhone ? ` (${toPhone})` : ''}` : null;
    }
    if (!vendor && data.recipient) {
        vendor = typeof data.recipient === 'object' ? (data.recipient.name || data.recipient.phone_number) : data.recipient;
    }
    const supplierId = data.supplierId || data.supplier_id || null;

    // 3. Project Name & Project ID
    const projectName = data.projectName || data.project || data.project_name || null;
    const projectId = data.projectId || data.project_id || null;

    // 4. Line Items
    let items = Array.isArray(data.items) ? data.items : [];
    if (items.length === 0 && data.material) {
        const mat = typeof data.material === 'object' ? data.material : { name: String(data.material) };
        items = [{
            name: mat.name || 'مادة مشتراة',
            quantity: mat.quantity || 1,
            unit: mat.unit || 'وحدة',
            unitPrice: mat.unitPrice || (totalAmount && mat.quantity ? totalAmount / mat.quantity : null),
            total: mat.total || totalAmount
        }];
    }
    if (items.length === 0 && (data.transfer_amount?.value || totalAmount)) {
        items = [{
            name: `تحويل محفظة إلكترونية${data.to?.name ? ` إلى ${data.to.name}` : ''}`,
            quantity: 1,
            unit: 'عملية',
            unitPrice: data.transfer_amount?.value ?? totalAmount,
            total: data.transfer_amount?.value ?? totalAmount
        }];
    }

    // 5. Category Normalization (Fine-grained)
    const category = mapToExactCategory(data.category, items, `${rawText} ${data.summary || ''} ${data.description || ''}`);

    // 6. Payment Method
    const paymentMethod = resolvePaymentMethod(data, `${rawText} ${data.summary || ''} ${data.description || ''}`);

    // 7. Transaction Date
    let rawDate = data.transaction_date || data.transactionDate || data.date || null;
    let transactionDate = new Date().toISOString().split('T')[0];
    if (rawDate) {
        if (typeof rawDate === 'string' && rawDate.includes('T')) {
            transactionDate = rawDate.split('T')[0];
        } else {
            const parsed = new Date(rawDate);
            if (!isNaN(parsed.getTime())) {
                transactionDate = parsed.toISOString().split('T')[0];
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
                transactionDate = rawDate;
            }
        }
    }

    // 8. Summary / Description
    let summary = data.description || data.summary || '';
    if (!summary) {
        if (data.transaction_type === 'money_transfer' || data.to || data.from) {
            const senderStr = data.from?.phone_number ? ` من ${data.from.phone_number}` : '';
            const receiverStr = data.to?.name ? ` إلى ${data.to.name}` : (data.to?.phone_number ? ` إلى ${data.to.phone_number}` : '');
            const txIdStr = data.transaction_id ? ` (رقم العملية: ${data.transaction_id})` : '';
            summary = `تحويل فودافون كاش بقيمة ${totalAmount || 0} ج.م${receiverStr}${senderStr}${txIdStr}`;
        } else if (vendor) {
            summary = `فاتورة / إيصال مع ${vendor} بمبلغ ${totalAmount ? totalAmount.toLocaleString() + ' ج.م' : 'غير محدد'}`;
        } else {
            summary = `إيصال مستخرج بمبلغ ${totalAmount ? totalAmount.toLocaleString() + ' ج.م' : 'غير محدد'}`;
        }
    }

    return {
        vendor,
        supplierId,
        projectName,
        projectId,
        totalAmount,
        subtotal: data.subtotal ?? (data.transfer_amount?.value ?? totalAmount),
        taxAmount: feeAmount,
        currency: data.currency || (data.transfer_amount?.currency || 'EGP'),
        transactionDate,
        category,
        paymentMethod,
        is_stock_purchase: !!data.is_stock_purchase,
        items,
        summary,
        confidence: data.confidence || 'high'
    };
}

/**
 * Safely parse JSON from any LLM response format (including markdown code fences).
 */
function extractJsonFromText(rawText) {
    if (!rawText) return null;
    if (typeof rawText === 'object') return rawText;

    try {
        return JSON.parse(rawText);
    } catch (_) {}

    const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
        try {
            return JSON.parse(fenceMatch[1]);
        } catch (_) {}
    }

    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
            return JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
        } catch (_) {}
    }

    return null;
}

/**
 * Call the MicroMind / GPT 5.6 Luna Pro agent backend for extraction with live company context
 */
async function callMicroMindExtraction(prompt, context = {}) {
    const apiUrl = process.env.MICROMIND_API_URL;
    if (!apiUrl || !prompt) return null;

    try {
        const dynamicContextText = buildDynamicContext(context);
        const payload = {
            question: `${SYSTEM_PROMPT}\n${dynamicContextText}\n\nSite Engineer input text/document:\n"""\n${prompt}\n"""\n\nReturn strict JSON matching the schema.`
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            logger.warn({ status: response.status }, 'MicroMind API responded with non-200');
            return null;
        }

        const data = await response.json();
        const rawContent = data.text || data.response || data.answer || data.data || (typeof data === 'string' ? data : JSON.stringify(data));
        const rawParsed = extractJsonFromText(rawContent);
        return normalizeExtractedData(rawParsed, prompt, context);
    } catch (err) {
        logger.warn({ err }, 'Failed to call MicroMind API');
        return null;
    }
}

/**
 * Heuristic fallback parser for text extracted from PDF or OCR.
 */
function extractHeuristicsFromText(text) {
    if (!text || typeof text !== 'string') return null;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    let vendor = null;
    let totalAmount = null;
    let subtotal = null;
    let taxAmount = null;
    let transactionDate = null;
    let category = 'SERVICES';
    let items = [];

    // Find date (YYYY-MM-DD, DD/MM/YYYY, etc.)
    const dateMatch = text.match(/\b(202\d[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01]))\b/) ||
                      text.match(/\b((?:0?[1-9]|[12]\d|3[01])\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s+(202\d))\b/i) ||
                      text.match(/\b((?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])[-/.](202\d))\b/);
    if (dateMatch) {
        transactionDate = new Date().toISOString().split('T')[0];
    }

    // Find Total Amount
    const totalMatch = text.match(/(?:total|amount|المجموع|الإجمالي|الاجمالي|صافي|net|deducted|egp|ج\.م|le)\s*[:=]?\s*([0-9]+(?:[,.][0-9]{1,2})?)/i);
    if (totalMatch) {
        totalAmount = parseFloat(totalMatch[1].replace(',', ''));
    }

    // Find phone numbers (e.g. 010... or 015...)
    const phones = text.match(/01[0125][0-9]{8}/g) || [];
    if (phones.length > 0) {
        vendor = phones[phones.length - 1]; // recipient phone
    }

    return {
        vendor,
        totalAmount,
        subtotal,
        taxAmount,
        currency: 'EGP',
        transactionDate: transactionDate || new Date().toISOString().split('T')[0],
        category,
        items,
        summary: `إيصال مستخرج بمبلغ ${totalAmount ? totalAmount.toLocaleString() + ' ج.م' : 'غير محدد'}`,
        confidence: totalAmount ? 'medium' : 'low'
    };
}

/**
 * Extract structured transaction data from a receipt/invoice image or PDF document.
 * @param {Buffer} imageBuffer - Image or PDF bytes
 * @param {string} mimeType - MIME type (e.g. 'image/jpeg', 'application/pdf')
 * @param {object} context - Company context (projects, suppliers, materials)
 * @returns {Promise<object>} parsed_data matching the receipt schema
 */
export const processReceiptImage = async (imageBuffer, mimeType, context = {}) => {
    let documentText = '';

    // Step 1: High-accuracy OCR / Document text extraction
    if (mimeType === 'application/pdf') {
        documentText = await parsePdfBuffer(imageBuffer);
    } else if (mimeType && mimeType.startsWith('image/')) {
        documentText = await extractTextFromImageBuffer(imageBuffer);
    } else {
        // Try both
        documentText = await extractTextFromImageBuffer(imageBuffer);
        if (!documentText) {
            documentText = await parsePdfBuffer(imageBuffer);
        }
    }

    logger.info({ textLength: documentText?.length || 0 }, 'Document/Receipt OCR text extraction completed');

    // Step 2: Primary Option: Call MicroMind Agent (GPT 5.6 Luna Pro) with dynamic context
    if (process.env.MICROMIND_API_URL && documentText) {
        try {
            const parsed = await callMicroMindExtraction(documentText, context);
            if (parsed && (parsed.totalAmount !== null || parsed.vendor !== null)) {
                return parsed;
            }
        } catch (err) {
            logger.warn({ err }, 'MicroMind extraction failed, falling back to local extractor');
        }
    }

    // Step 3: Secondary Option: OpenAI if configured
    if (process.env.OPENAI_API_KEY) {
        try {
            const client = getOpenAI();
            if (client) {
                const dynamicContextText = buildDynamicContext(context);
                const completion = await client.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: `${RECEIPT_SYSTEM_PROMPT}\n${dynamicContextText}` },
                        {
                            role: 'user',
                            content: `Extract structured receipt/invoice transaction details from this text:\n\n${documentText || '(No text extracted)'}`
                        }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.1
                });

                const parsed = JSON.parse(completion.choices[0].message.content);
                return normalizeExtractedData(parsed, documentText, context);
            }
        } catch (aiErr) {
            logger.warn({ err: aiErr }, 'OpenAI receipt extraction failed, falling back to local extractor');
        }
    }

    // Step 4: Fallback: Heuristic extraction from document text
    if (documentText) {
        const heuristic = extractHeuristicsFromText(documentText);
        if (heuristic) return heuristic;
    }

    // Step 5: Clean draft structure fallback
    return {
        vendor: null,
        totalAmount: null,
        subtotal: null,
        taxAmount: null,
        currency: 'EGP',
        transactionDate: new Date().toISOString().split('T')[0],
        category: 'SERVICES',
        items: [],
        summary: 'إيصال / فاتورة مرفقة — يرجى مراجعة وتأكيد البيانات المالية',
        confidence: 'medium'
    };
};

/**
 * Process a voice note file to transcribe and extract structured financial data.
 * @param {string} filePath - Absolute path to the audio file.
 * @param {string} clientTranscript - Spoken text from client
 * @param {object} context - Company context (projects, suppliers, materials)
 * @returns {Promise<{raw_text: string, parsed_data: object}>}
 */
export const processVoiceNote = async (filePath, clientTranscript = '', context = {}) => {
    let transcriptText = clientTranscript?.trim() || '';

    // Step 1: If client didn't supply live transcript, try OpenAI Whisper if configured
    if (!transcriptText && process.env.OPENAI_API_KEY) {
        try {
            const client = getOpenAI();
            if (client && fs.existsSync(filePath)) {
                const transcription = await client.audio.transcriptions.create({
                    file: fs.createReadStream(filePath),
                    model: "whisper-1",
                    language: "ar",
                    prompt: "Construction, EGP, geneh, musanaiyah, kharsana, mahara, tashweeb"
                });
                transcriptText = transcription?.text || '';
            }
        } catch (error) {
            logger.warn({ err: error }, 'Whisper voice transcription failed');
        }
    }

    // Step 2: Primary Option: Call MicroMind Agent (GPT 5.6 Luna Pro) with dynamic context!
    if (process.env.MICROMIND_API_URL && transcriptText) {
        try {
            const parsed = await callMicroMindExtraction(transcriptText, context);
            if (parsed) {
                return {
                    raw_text: transcriptText,
                    parsed_data: parsed
                };
            }
        } catch (err) {
            logger.warn({ err }, 'MicroMind voice extraction fallback');
        }
    }

    // Step 3: Heuristic extraction from transcript if available
    if (transcriptText) {
        const heuristic = extractHeuristicsFromText(transcriptText);
        if (heuristic) {
            return {
                raw_text: transcriptText,
                parsed_data: heuristic
            };
        }
    }

    return {
        raw_text: transcriptText || "تسجيل صوتي للموقع",
        parsed_data: {
            summary: transcriptText ? `تسجيل صوتي: ${transcriptText}` : "تسجيل صوتي مرفق — يرجى مراجعة وتأكيد البيانات",
            amount: 0,
            vendor: null,
            category: "SERVICES",
            is_stock_purchase: false,
            items: [],
            confidence: "medium"
        }
    };
};
