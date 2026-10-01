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
 * Build dynamic database context (projects, clients, suppliers, materials, workmen, users, categories) to inject into the AI prompt
 */
export function buildDynamicContext(context = {}) {
    const lines = [];

    // 1. Projects (المشاريع المسجلة)
    if (Array.isArray(context.projects) && context.projects.length > 0) {
        lines.push(`\n**Company Existing Projects (المشاريع المسجلة بالشركة - Match mentioned project or site to exact Project ID):**`);
        for (const p of context.projects) {
            const clientPart = p.client?.name ? ` | Client: "${p.client.name}"` : '';
            const codePart = p.code ? ` | Code: "${p.code}"` : '';
            const locPart = p.location ? ` | Location: "${p.location}"` : '';
            lines.push(`- Project ID: "${p.id}" | Name: "${p.name}"${codePart}${locPart}${clientPart}`);
        }
    }

    // 2. Clients (العملاء المسجلين)
    if (Array.isArray(context.clients) && context.clients.length > 0) {
        lines.push(`\n**Company Existing Clients (العملاء المسجلين بالشركة - Match mentioned customer/client to exact Client ID):**`);
        for (const c of context.clients) {
            const compPart = c.company ? ` (${c.company})` : '';
            const phonePart = c.phone ? ` | Phone: "${c.phone}"` : '';
            lines.push(`- Client ID: "${c.id}" | Name: "${c.name}"${compPart}${phonePart}`);
        }
    }

    // 3. Suppliers & Subcontractors (الموردين ومقاولي الباطن)
    if (Array.isArray(context.suppliers) && context.suppliers.length > 0) {
        lines.push(`\n**Company Existing Suppliers (الموردين وتجار الخامات ومقاولي الباطن - Match vendor/supplier to exact Supplier ID):**`);
        for (const s of context.suppliers) {
            const compPart = s.company ? ` (${s.company})` : '';
            const phonePart = s.phone ? ` | Phone: "${s.phone}"` : '';
            lines.push(`- Supplier ID: "${s.id}" | Name: "${s.name}"${compPart}${phonePart}`);
        }
    }

    // 4. Materials (أصناف الخامات والمواد بالمخزن)
    if (Array.isArray(context.materials) && context.materials.length > 0) {
        lines.push(`\n**Company Inventory Materials (أصناف المواد والخامات - Match purchased items to these exact names and Material IDs):**`);
        for (const m of context.materials.slice(0, 50)) {
            const unitPart = m.unit ? ` (${m.unit})` : '';
            const pricePart = m.unitPrice ? ` | Price: ${m.unitPrice} EGP` : '';
            const arPart = m.nameAr && m.nameAr !== m.name ? ` / ${m.nameAr}` : '';
            lines.push(`- Material ID: "${m.id}" | Name: "${m.name}"${arPart}${unitPart}${pricePart}`);
        }
    }

    // 5. Craftsmen & Laborers (الصنايعية والعمال المسجلين)
    if (Array.isArray(context.workmen) && context.workmen.length > 0) {
        lines.push(`\n**Company Craftsmen & Laborers (الصنايعية والعمال المسجلين - Match labor/wages to exact Workman ID):**`);
        for (const w of context.workmen.slice(0, 40)) {
            const tradePart = (w.trade || w.customTrade) ? ` [${w.trade || w.customTrade}]` : '';
            const wagePart = w.dailyRate ? ` | Daily Rate: ${w.dailyRate} EGP` : '';
            const phonePart = w.phone ? ` | Phone: "${w.phone}"` : '';
            lines.push(`- Workman ID: "${w.id}" | Name: "${w.name}"${tradePart}${wagePart}${phonePart}`);
        }
    }

    // 6. Engineers & Staff / Custody Holders (فريق العمل ومسؤولي العهد)
    if (Array.isArray(context.users) && context.users.length > 0) {
        lines.push(`\n**Company Engineers & Team Members (فريق العمل ومسؤولي العهد - Match payer/custody to exact User ID):**`);
        for (const u of context.users.slice(0, 30)) {
            lines.push(`- User ID: "${u.id}" | Name: "${u.name}" (${u.role || 'Staff'})`);
        }
    }

    // 7. Exact ERP Categories
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
- CLIENT_PAYMENT (دفعة عميل / إيراد وارد / تحصيل من العميل)
- OFFICE_EXPENSES (مصاريف مقر الشركة / مصاريف إدارية / إيجار المقر / كهرباء المقر / بوفيه المقر / أدوات مكتبية)
- SITE_OVERHEAD (مصاريف موقع / حراسة / غفير / بوفيه موقع)
- EQUIPMENT_RENTAL (إيجار معدات / خلاطة / ونش / لودر / حفار)
- SUBCONTRACTOR (مقاول باطن / مقاولات متخصصة)
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

**CRITICAL MATCHING INSTRUCTIONS:**
- Always match spoken project names or site locations to the exact matching "Project ID" UUID from Company Existing Projects.
- Always match spoken vendors, shops, or suppliers to the exact matching "Supplier ID" UUID from Company Existing Suppliers.
- Always match spoken clients or customers to the exact matching "Client ID" UUID from Company Existing Clients.
- Always match spoken craftsmen, technicians, or laborers to the exact matching "Workman ID" UUID from Company Existing Craftsmen.
- Always match purchased items to the exact matching "Material ID" UUID from Company Inventory Materials when applicable.

**Output Schema (Strict JSON):**
{
  "summary": "String (Clear Arabic description of what was purchased or paid)",
  "totalAmount": Number (Total cost or money spent),
  "transactionType": "EXPENSE | REVENUE (EXPENSE for spending, labor, materials; REVENUE for client payments or deposits)",
  "projectId": "String (Exact matching Project ID UUID from Company Existing Projects list, or null if not mentioned)",
  "projectName": "String or null (Project name or location as mentioned)",
  "supplierId": "String (Exact matching Supplier ID UUID from Company Existing Suppliers list, or null if not mentioned)",
  "vendor": "String or null (Vendor, contractor, or supplier name as mentioned)",
  "clientId": "String (Exact matching Client ID UUID from Company Existing Clients list, or null if not mentioned)",
  "clientName": "String or null (Client name as mentioned)",
  "workmanId": "String (Exact matching Workman ID UUID from Company Existing Craftsmen list, or null if not mentioned)",
  "workmanName": "String or null (Workman or technician name as mentioned)",
  "payerUserId": "String (Exact matching User ID UUID from Company Team list if mentioned, or null)",
  "category": "Exact enum key from Allowed Cost Categories list",
  "paymentMethod": "CASH | CUSTODY_WALLET | BANK_TRANSFER | CHECK | CREDIT_CARD | OTHER",
  "is_stock_purchase": Boolean (True for physical building materials. False for labor/services/wages),
  "isOfficeExpense": Boolean (True if this is an office/headquarters overhead expense, like office rent, office electricity, office buffet/tea, admin supplies; False for site construction projects),
  "cleanedTranscript": "String (Accurate verbatim Egyptian Arabic transcript of what was spoken, fixing phonetic speech-to-text slips or misheard words e.g. correcting 'تم' to 'طن' before materials and numbers like 'طن أسمنت', and restoring proper names of suppliers like 'عبده رزق' and projects to their true spelling as registered in company master data, keeping the user's natural spoken words and numbers intact)",
  "items": [
    { "name": "String", "materialId": "String or null", "quantity": Number, "unit": "String", "unitPrice": Number or null, "total": Number or null }
  ]
}
`;

const RECEIPT_SYSTEM_PROMPT = `
You are an expert financial OCR extraction engine for an Egyptian Construction ERP system (Hesaby).
Your role is to extract structured accounting data from receipts, invoices, and mobile wallet records (Vodafone Cash, InstaPay, Bank transfers).

**CRITICAL MATCHING INSTRUCTIONS:**
- Match merchant, recipient, or vendor to exact "Supplier ID" UUID from Company Existing Suppliers.
- Match project mentions to exact "Project ID" UUID from Company Existing Projects.
- Match client mentions to exact "Client ID" UUID from Company Existing Clients.
- Match purchased items to exact "Material ID" UUID from Company Inventory Materials when applicable.

**Output Schema (Strict JSON):**
{
  "summary": "String (Detailed Arabic description of the transaction)",
  "totalAmount": Number (Final total amount paid/deducted),
  "subtotal": Number or null,
  "taxAmount": Number or null,
  "currency": "EGP",
  "transactionType": "EXPENSE | REVENUE",
  "projectId": "String (Exact matching Project ID UUID from Company Existing Projects, or null if not mentioned)",
  "projectName": "String or null (Project name)",
  "supplierId": "String (Exact matching Supplier ID UUID from Company Existing Suppliers, or null if not mentioned)",
  "vendor": "String or null (Merchant name, recipient name, or recipient phone)",
  "clientId": "String (Exact matching Client ID UUID from Company Existing Clients, or null if not mentioned)",
  "clientName": "String or null (Client name)",
  "category": "Exact enum key from Allowed Cost Categories",
  "isOfficeExpense": Boolean (True if office overhead; False for site construction projects),
  "paymentMethod": "CASH | CUSTODY_WALLET | BANK_TRANSFER | CHECK | CREDIT_CARD | OTHER",
  "transactionDate": "YYYY-MM-DD",
  "items": [
    { "name": "String", "materialId": "String or null", "quantity": Number, "unit": "String or null", "unitPrice": Number or null, "total": Number or null }
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
    if (typeof data === 'string') {
        data = { summary: data };
    }

    // 1. Total Amount
    let totalAmount = data.totalAmount ?? data.amount ?? data.total ?? data.answer ?? null;
    if (typeof totalAmount === 'object' && totalAmount !== null) {
        totalAmount = totalAmount.value ?? totalAmount.amount ?? null;
    }
    if (typeof totalAmount === 'string') {
        totalAmount = parseFloat(totalAmount.replace(/[^0-9.]/g, '')) || null;
    }
    // Fallback regex amount extraction from text if not in structured field
    if (totalAmount === null) {
        const fullSource = `${rawText} ${data.summary || ''} ${data.description || ''}`;
        const numMatch = fullSource.match(/(?:مبلغ|قيمة|بقيمة|بمبلغ|total|amount|صافي)?\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:جنيه|ج\.م|egp|le)?/i);
        if (numMatch && numMatch[1]) {
            totalAmount = parseFloat(numMatch[1].replace(',', '')) || null;
        }
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
    let supplierId = data.supplierId || data.supplier_id || null;
    if (!vendor && Array.isArray(context.suppliers)) {
        const fullSource = `${rawText} ${data.summary || ''}`;
        for (const s of context.suppliers) {
            if (s.name && fullSource.includes(s.name)) {
                vendor = s.name;
                supplierId = s.id;
                break;
            }
        }
    }

    // 3. Project Name & Project ID
    let projectName = data.projectName || data.project || data.project_name || null;
    let projectId = data.projectId || data.project_id || null;
    if (!projectName && Array.isArray(context.projects)) {
        const fullSource = `${rawText} ${data.summary || ''}`;
        for (const p of context.projects) {
            if (p.name && fullSource.includes(p.name)) {
                projectName = p.name;
                projectId = p.id;
                break;
            }
        }
    }

    // 4. Client Name & Client ID
    let clientName = data.clientName || data.client || data.client_name || null;
    let clientId = data.clientId || data.client_id || null;
    if (!clientName && Array.isArray(context.clients)) {
        const fullSource = `${rawText} ${data.summary || ''}`;
        for (const c of context.clients) {
            if (c.name && fullSource.includes(c.name)) {
                clientName = c.name;
                clientId = c.id;
                break;
            }
        }
    }

    // 5. Workman / Craftsman & Workman ID
    let workmanName = data.workmanName || data.workman || data.technician || data.craftsman || null;
    let workmanId = data.workmanId || data.workman_id || null;
    if (!workmanName && Array.isArray(context.workmen)) {
        const fullSource = `${rawText} ${data.summary || ''}`;
        for (const w of context.workmen) {
            if (w.name && fullSource.includes(w.name)) {
                workmanName = w.name;
                workmanId = w.id;
                break;
            }
        }
    }

    // 6. Payer / Custody User ID
    const payerUserId = data.payerUserId || data.payer_user_id || data.engineerId || null;

    // 7. Transaction Type (EXPENSE or REVENUE)
    let transactionType = data.transactionType || data.type || data.source || null;
    if (!transactionType) {
        if (data.category === 'CLIENT_PAYMENT' || rawText.includes('استلام دفعة') || rawText.includes('تحصيل من العميل')) {
            transactionType = 'REVENUE';
        } else {
            transactionType = 'EXPENSE';
        }
    }

    // 8. Line Items
    let items = Array.isArray(data.items) ? data.items : [];
    if (items.length === 0 && data.material) {
        const mat = typeof data.material === 'object' ? data.material : { name: String(data.material) };
        items = [{
            name: mat.name || 'مادة مشتراة',
            materialId: mat.materialId || mat.id || null,
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

    // 9. Category Normalization (Fine-grained)
    const category = mapToExactCategory(data.category, items, `${rawText} ${data.summary || ''} ${data.description || ''}`);

    // 10. Payment Method
    const paymentMethod = resolvePaymentMethod(data, `${rawText} ${data.summary || ''} ${data.description || ''}`);

    // 11. Transaction Date
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

    // 12. Summary / Description
    let summary = data.description || data.summary || '';
    if (!summary) {
        if (data.transaction_type === 'money_transfer' || data.to || data.from) {
            const senderStr = data.from?.phone_number ? ` من ${data.from.phone_number}` : '';
            const receiverStr = data.to?.name ? ` إلى ${data.to.name}` : (data.to?.phone_number ? ` إلى ${data.to.phone_number}` : '');
            const txIdStr = data.transaction_id ? ` (رقم العملية: ${data.transaction_id})` : '';
            summary = `تحويل فودافون كاش بقيمة ${totalAmount || 0} ج.م${receiverStr}${senderStr}${txIdStr}`;
        } else if (vendor) {
            summary = `فاتورة / إيصال مع ${vendor} بمبلغ ${totalAmount ? totalAmount.toLocaleString() + ' ج.م' : 'غير محدد'}`;
        } else if (workmanName) {
            summary = `مصنعية / أجر ${workmanName} بمبلغ ${totalAmount ? totalAmount.toLocaleString() + ' ج.م' : 'غير محدد'}`;
        } else if (clientName) {
            summary = `دفعة من العميل ${clientName} بمبلغ ${totalAmount ? totalAmount.toLocaleString() + ' ج.م' : 'غير محدد'}`;
        } else {
            summary = `إيصال مستخرج بمبلغ ${totalAmount ? totalAmount.toLocaleString() + ' ج.م' : 'غير محدد'}`;
        }
    }

    return {
        vendor,
        supplierId,
        projectName,
        projectId,
        clientName,
        clientId,
        workmanName,
        workmanId,
        payerUserId,
        transactionType,
        totalAmount,
        subtotal: data.subtotal ?? (data.transfer_amount?.value ?? totalAmount),
        taxAmount: feeAmount,
        currency: data.currency || (data.transfer_amount?.currency || 'EGP'),
        transactionDate,
        category,
        paymentMethod,
        is_stock_purchase: !!data.is_stock_purchase,
        isOfficeExpense: Boolean(data.isOfficeExpense || data.is_office_expense || data.category === 'OFFICE_EXPENSES'),
        cleanedTranscript: (typeof (data.cleanedTranscript || data.cleaned_transcript || data.verbatimTranscript) === 'string' && (data.cleanedTranscript || data.cleaned_transcript || data.verbatimTranscript).trim())
            ? (data.cleanedTranscript || data.cleaned_transcript || data.verbatimTranscript).trim()
            : null,
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
 * Call the MicroMind Voice Workflow (prediction/5da17804-194a-4aad-a7af-9041e768426c)
 * Sends raw audio buffer / file directly to the MicroMind workflow (OpenAI Whisper + Gemini 3.8 Flash).
 * Also accepts an optional fallback text prompt if audio is not available.
 * 
 * @param {Buffer|string} audioBufferOrPath - Audio file buffer or absolute path to audio file on disk, OR text prompt.
 * @param {string} [mimeType='audio/webm'] - MIME type of the audio
 * @param {object} [context={}] - Company context (projects, suppliers, materials, etc.)
 * @param {string} [optionalTranscript=''] - Optional text transcript if already available
 */
export async function callMicroMindVoiceExtraction(audioBufferOrPath, mimeType = 'audio/webm', context = {}, optionalTranscript = '') {
    const apiUrl = process.env.MICROMIND_VOICE_API_URL || "https://core.aimicromind.com/api/v1/prediction/5da17804-194a-4aad-a7af-9041e768426c";
    if (!apiUrl || !audioBufferOrPath) return null;

    try {
        let audioBuffer = null;
        let actualMime = typeof mimeType === 'string' && mimeType.includes('/') ? mimeType : 'audio/webm';
        let textPrompt = '';

        if (Buffer.isBuffer(audioBufferOrPath)) {
            audioBuffer = audioBufferOrPath;
        } else if (typeof audioBufferOrPath === 'string') {
            // Check if it's an existing file path
            if (fs.existsSync(audioBufferOrPath)) {
                try {
                    const stat = fs.statSync(audioBufferOrPath);
                    if (stat.isFile()) {
                        audioBuffer = fs.readFileSync(audioBufferOrPath);
                        const ext = path.extname(audioBufferOrPath).toLowerCase();
                        if (ext === '.mp4' || ext === '.m4a') actualMime = 'audio/mp4';
                        else if (ext === '.wav') actualMime = 'audio/wav';
                        else if (ext === '.ogg') actualMime = 'audio/ogg';
                        else if (ext === '.mp3') actualMime = 'audio/mpeg';
                        else if (ext === '.aac') actualMime = 'audio/aac';
                        else if (ext === '.webm') actualMime = 'audio/webm';
                    }
                } catch (_) {}
            }
            if (!audioBuffer) {
                // It was passed as a text prompt directly (for backward compatibility)
                textPrompt = audioBufferOrPath;
                if (typeof mimeType === 'object' && mimeType !== null) {
                    context = mimeType;
                }
            }
        }

        const dynamicContextText = buildDynamicContext(context);
        const question = `قم باستخراج بيانات المعاملة المالية من التسجيل الصوتي بدقة متناهية في صيغة JSON تحتوي على:
{
  "totalAmount": number,
  "amount": number,
  "vendor": string or null,
  "category": string,
  "paymentMethod": string,
  "projectName": string or null,
  "workmanName": string or null,
  "summary": string,
  "cleanedTranscript": string,
  "is_stock_purchase": boolean,
  "items": [{"name": string, "quantity": number, "unitPrice": number, "total": number}]
}
${optionalTranscript || textPrompt ? `\nتفريغ صوتي أولي أو نص إضافي:\n"""${optionalTranscript || textPrompt}"""` : ''}
${dynamicContextText}`;

        const payload = {
            question,
            overrideConfig: {
                vars: {
                    masterData: dynamicContextText,
                    companyContext: dynamicContextText
                }
            },
            masterData: {
                projects: (context.projects || []).map(p => ({ id: p.id, name: p.name, location: p.location, client: p.client?.name })),
                clients: (context.clients || []).map(c => ({ id: c.id, name: c.name, company: c.company, phone: c.phone })),
                suppliers: (context.suppliers || []).map(s => ({ id: s.id, name: s.name, company: s.company, phone: s.phone })),
                materials: (context.materials || []).map(m => ({ id: m.id, name: m.name, nameAr: m.nameAr, unit: m.unit, unitPrice: m.unitPrice })),
                workmen: (context.workmen || []).map(w => ({ id: w.id, name: w.name, trade: w.trade || w.customTrade, dailyRate: w.dailyRate })),
                users: (context.users || []).map(u => ({ id: u.id, name: u.name, role: u.role }))
            }
        };

        if (audioBuffer) {
            const extMatch = actualMime.includes('mp4') ? 'mp4'
                : actualMime.includes('wav') ? 'wav'
                : actualMime.includes('ogg') ? 'ogg'
                : actualMime.includes('mpeg') || actualMime.includes('mp3') ? 'mp3'
                : actualMime.includes('aac') ? 'aac'
                : 'webm';

            payload.uploads = [{
                data: `data:${actualMime};base64,${audioBuffer.toString('base64')}`,
                type: 'file',
                name: `voice.${extMatch}`,
                mime: actualMime
            }];
        }

        logger.info({ apiUrl, hasAudio: !!audioBuffer, actualMime, bufferSize: audioBuffer?.length }, 'Calling MicroMind Voice Workflow');

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            logger.warn({ status: response.status, errText }, 'MicroMind Voice API responded with non-200');
            return null;
        }

        const data = await response.json();
        
        // MicroMind returns JSON directly in data.json or via text/answer fields
        let rawParsed = null;
        if (data.json && typeof data.json === 'object') {
            if (data.json.answer) {
                rawParsed = extractJsonFromText(data.json.answer);
            } else {
                rawParsed = data.json;
            }
        }
        
        if (!rawParsed) {
            const rawContent = data.text || data.response || data.answer || (typeof data === 'string' ? data : JSON.stringify(data));
            rawParsed = extractJsonFromText(rawContent);
        }

        if (rawParsed) {
            return normalizeExtractedData(rawParsed, optionalTranscript || textPrompt || rawParsed.cleanedTranscript || 'تسجيل صوتي من الموقع', context);
        }
    } catch (err) {
        logger.warn({ err }, 'Failed to call MicroMind Voice API');
    }
    return null;
}

/**
 * Call the MicroMind Image Workflow (prediction/ad975b06-b1d3-4862-8018-87e3e79517af)
 * Accepts image bytes and optional voice/text clarification.
 */
export async function callMicroMindImageExtraction(imageBuffer, mimeType, context = {}, clarificationText = '') {
    const apiUrl = process.env.MICROMIND_IMAGE_API_URL || "https://core.aimicromind.com/api/v1/prediction/ad975b06-b1d3-4862-8018-87e3e79517af";
    if (!apiUrl || !imageBuffer) return null;

    try {
        const dynamicContextText = buildDynamicContext(context);
        const question = `قم باستخراج بيانات الفاتورة أو الإيصال المرفق بدقة في صيغة JSON تحتوي على:
{
  "totalAmount": number,
  "amount": number,
  "subtotal": number or null,
  "taxAmount": number or null,
  "vendor": string or null,
  "category": string,
  "paymentMethod": string,
  "transactionDate": "YYYY-MM-DD",
  "projectName": string or null,
  "summary": string,
  "items": [{"name": string, "quantity": number, "unitPrice": number, "total": number}]
}
${clarificationText ? `\nتوضيح إضافي مرفق مع الفاتورة / الإيصال:\n"""${clarificationText}"""` : ''}
${dynamicContextText}`;

        const base64Data = `data:${mimeType || 'image/jpeg'};base64,${imageBuffer.toString('base64')}`;
        const payload = {
            question,
            overrideConfig: {
                vars: {
                    masterData: dynamicContextText,
                    companyContext: dynamicContextText
                }
            },
            masterData: {
                projects: (context.projects || []).map(p => ({ id: p.id, name: p.name, location: p.location, client: p.client?.name })),
                clients: (context.clients || []).map(c => ({ id: c.id, name: c.name, company: c.company, phone: c.phone })),
                suppliers: (context.suppliers || []).map(s => ({ id: s.id, name: s.name, company: s.company, phone: s.phone })),
                materials: (context.materials || []).map(m => ({ id: m.id, name: m.name, nameAr: m.nameAr, unit: m.unit, unitPrice: m.unitPrice })),
                workmen: (context.workmen || []).map(w => ({ id: w.id, name: w.name, trade: w.trade || w.customTrade, dailyRate: w.dailyRate })),
                users: (context.users || []).map(u => ({ id: u.id, name: u.name, role: u.role }))
            },
            uploads: [{
                data: base64Data,
                type: 'file',
                name: 'receipt.jpg',
                mime: mimeType || 'image/jpeg'
            }]
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            logger.warn({ status: response.status }, 'MicroMind Image API responded with non-200');
            return null;
        }

        const data = await response.json();
        const rawContent = data.json?.answer || data.text || data.response || data.answer || (typeof data === 'string' ? data : JSON.stringify(data));
        const rawParsed = extractJsonFromText(rawContent);
        if (rawParsed) {
            return normalizeExtractedData(rawParsed, clarificationText || 'إيصال مرفق', context);
        }
    } catch (err) {
        logger.warn({ err }, 'Failed to call MicroMind Image API');
    }
    return null;
}

/**
 * Call the MicroMind / GPT 5.6 Luna Pro agent backend for extraction with live company master data
 */
async function callMicroMindExtraction(prompt, context = {}) {
    const apiUrl = process.env.MICROMIND_API_URL;
    if (!apiUrl || !prompt) return null;

    try {
        const dynamicContextText = buildDynamicContext(context);
        const payload = {
            question: `${SYSTEM_PROMPT}\n${dynamicContextText}\n\nSite Engineer input text/document:\n"""\n${prompt}\n"""\n\nReturn strict JSON matching the schema.`,
            masterData: {
                projects: (context.projects || []).map(p => ({ id: p.id, name: p.name, location: p.location, client: p.client?.name })),
                clients: (context.clients || []).map(c => ({ id: c.id, name: c.name, company: c.company, phone: c.phone })),
                suppliers: (context.suppliers || []).map(s => ({ id: s.id, name: s.name, company: s.company, phone: s.phone })),
                materials: (context.materials || []).map(m => ({ id: m.id, name: m.name, nameAr: m.nameAr, unit: m.unit, unitPrice: m.unitPrice })),
                workmen: (context.workmen || []).map(w => ({ id: w.id, name: w.name, trade: w.trade || w.customTrade, dailyRate: w.dailyRate })),
                users: (context.users || []).map(u => ({ id: u.id, name: u.name, role: u.role }))
            }
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
 * @param {string} clarificationText - Optional spoken voice note transcript or text clarifying the image
 * @returns {Promise<object>} parsed_data matching the receipt schema
 */
export const processReceiptImage = async (imageBuffer, mimeType, context = {}, clarificationText = '') => {
    // Step 1: Direct Primary Option: Call MicroMind Image Workflow (with optional voice clarification)
    if (imageBuffer && mimeType && mimeType.startsWith('image/')) {
        try {
            const parsed = await callMicroMindImageExtraction(imageBuffer, mimeType, context, clarificationText);
            if (parsed && (parsed.totalAmount !== null || parsed.vendor !== null || parsed.summary)) {
                logger.info({ totalAmount: parsed.totalAmount, vendor: parsed.vendor }, 'MicroMind Image Workflow successfully extracted receipt details');
                return parsed;
            }
        } catch (err) {
            logger.warn({ err }, 'MicroMind Image extraction error, falling back to OCR pipeline');
        }
    }

    let documentText = '';

    // Step 2: High-accuracy OCR / Document text extraction
    if (mimeType === 'application/pdf') {
        documentText = await parsePdfBuffer(imageBuffer);
    } else if (mimeType && mimeType.startsWith('image/')) {
        documentText = await extractTextFromImageBuffer(imageBuffer);
    } else {
        documentText = await extractTextFromImageBuffer(imageBuffer);
        if (!documentText) {
            documentText = await parsePdfBuffer(imageBuffer);
        }
    }

    logger.info({ textLength: documentText?.length || 0 }, 'Document/Receipt OCR text extraction completed');

    // Combine OCR text with voice clarification if provided
    const combinedText = [clarificationText, documentText].filter(Boolean).join('\n\n');

    // Step 3: Call MicroMind Agent with OCR text
    if (process.env.MICROMIND_API_URL && combinedText) {
        try {
            const parsed = await callMicroMindExtraction(combinedText, context);
            if (parsed && (parsed.totalAmount !== null || parsed.vendor !== null)) {
                return parsed;
            }
        } catch (err) {
            logger.warn({ err }, 'MicroMind OCR extraction failed, falling back to secondary extractor');
        }
    }

    // Step 3: Secondary Option: OpenAI if configured
    if (process.env.OPENAI_API_KEY) {
        try {
            const client = getOpenAI();
            if (client) {
                const dynamicContextText = buildDynamicContext(context);
                const extractionModel = process.env.OPENAI_EXTRACTION_MODEL || 'gpt-6-luna';
                const completion = await client.chat.completions.create({
                    model: extractionModel,
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
 * Build dynamic Whisper prompt biased towards Egyptian construction vocabulary,
 * units of measure (طن، متر، شيكارة، نقلة), and the tenant's actual registered suppliers and projects.
 */
export function buildWhisperPrompt(context = {}) {
    const baseTerms = "تسجيل صوتي لملاحظات ومصروفات موقع بالعامية المصرية: طن، متر، شيكارة، نقلة، لوح، لتر، يومية، جنيه، ألف، دفعة، مصنعية، توريد، تشوين، نولون، أسمنت، حديد، رمل، سن، طوب، سيراميك، سباكة، كهرباء، دهانات، خرسانة، محارة، عهدة، كاش، تحويل، فودافون كاش، انستاباي";
    
    const entities = [];
    if (Array.isArray(context.suppliers)) {
        for (const s of context.suppliers) {
            if (s.name && typeof s.name === 'string') {
                const clean = s.name.trim();
                if (clean && clean.length <= 25 && !entities.includes(clean)) {
                    entities.push(clean);
                }
            }
            if (entities.length >= 12) break;
        }
    }
    if (Array.isArray(context.projects)) {
        for (const p of context.projects) {
            if (p.name && typeof p.name === 'string') {
                const clean = p.name.trim();
                if (clean && clean.length <= 25 && !entities.includes(clean)) {
                    entities.push(clean);
                }
            }
            if (entities.length >= 20) break;
        }
    }
    if (Array.isArray(context.materials)) {
        for (const m of context.materials) {
            const clean = (m.nameAr || m.name || '').trim();
            if (clean && clean.length <= 20 && !entities.includes(clean)) {
                entities.push(clean);
            }
            if (entities.length >= 26) break;
        }
    }

    if (entities.length > 0) {
        return `${baseTerms} | موردين ومشاريع: ${entities.join('، ')}`;
    }
    return baseTerms;
}

/**
 * Process a voice note file to transcribe and extract structured financial data.
 * @param {string} filePath - Absolute path to the audio file.
 * @param {string} clientTranscript - Spoken text from client
 * @param {object} context - Company context (projects, suppliers, materials)
 * @returns {Promise<{raw_text: string, parsed_data: object}>}
 */
export const processVoiceNote = async (filePath, clientTranscript = '', context = {}, mimeType = '') => {
    logger.info({ filePath, hasClientTranscript: !!clientTranscript }, 'Processing voice note with AI pipeline');

    // Step 1: Primary Option — Send raw audio directly to MicroMind Voice Workflow (prediction/5da17804-194a-4aad-a7af-9041e768426c)
    // The MicroMind workflow has OpenAI Whisper + Gemini 3.8 Flash, processing Egyptian dialect accurately in one step.
    if (filePath && fs.existsSync(filePath)) {
        try {
            const parsed = await callMicroMindVoiceExtraction(filePath, mimeType, context, clientTranscript);
            if (parsed && (parsed.totalAmount !== null || parsed.vendor !== null || parsed.summary || parsed.cleanedTranscript)) {
                logger.info({ totalAmount: parsed.totalAmount, vendor: parsed.vendor }, 'MicroMind Voice Workflow successfully parsed transaction from raw audio');
                const finalTranscript = parsed.cleanedTranscript || parsed.summary || clientTranscript || 'تسجيل صوتي لموقع العمل';
                return {
                    raw_text: finalTranscript,
                    parsed_data: parsed
                };
            }
        } catch (err) {
            logger.warn({ err }, 'MicroMind dedicated voice extraction failed, falling back to local Whisper/agent pipeline');
        }
    }

    let transcriptText = '';

    // Step 2: Fallback — Server-side Whisper-1 transcription directly from raw audio file
    if (process.env.OPENAI_API_KEY && filePath && fs.existsSync(filePath)) {
        try {
            const client = getOpenAI();
            if (client) {
                const whisperPrompt = buildWhisperPrompt(context);
                logger.info({ filePath, promptLength: whisperPrompt.length }, 'Initiating fallback Whisper-1 voice transcription on server');
                const transcription = await client.audio.transcriptions.create({
                    file: fs.createReadStream(filePath),
                    model: "whisper-1",
                    language: "ar",
                    temperature: 0,
                    prompt: whisperPrompt
                });
                if (transcription?.text && transcription.text.trim()) {
                    transcriptText = transcription.text.trim();
                    logger.info({ transcriptText }, 'Whisper-1 successfully transcribed audio');
                }
            }
        } catch (error) {
            logger.warn({ err: error }, 'Whisper voice transcription fallback failed, attempting client fallback');
        }
    }

    // Step 2b: Fallback to client transcript only if Whisper failed or was unavailable
    if (!transcriptText && typeof clientTranscript === 'string' && clientTranscript !== 'undefined' && clientTranscript !== 'null' && clientTranscript.trim()) {
        transcriptText = clientTranscript.trim();
    }

    // Step 3: If we have transcript text from fallback, try MicroMind text extraction
    if (transcriptText) {
        try {
            const parsed = await callMicroMindVoiceExtraction(transcriptText, 'text/plain', context);
            if (parsed && (parsed.totalAmount !== null || parsed.vendor !== null || parsed.summary)) {
                logger.info({ totalAmount: parsed.totalAmount, vendor: parsed.vendor }, 'MicroMind Voice Workflow text fallback parsed transaction');
                const finalTranscript = parsed.cleanedTranscript || transcriptText;
                return {
                    raw_text: finalTranscript,
                    parsed_data: parsed
                };
            }
        } catch (err) {
            logger.warn({ err }, 'MicroMind Voice Workflow text fallback failed');
        }

        // Try general MicroMind agent if available
        if (process.env.MICROMIND_API_URL) {
            try {
                const parsed = await callMicroMindExtraction(transcriptText, context);
                if (parsed) {
                    const finalTranscript = parsed.cleanedTranscript || transcriptText;
                    return {
                        raw_text: finalTranscript,
                        parsed_data: parsed
                    };
                }
            } catch (err) {
                logger.warn({ err }, 'MicroMind general voice extraction fallback');
            }
        }

        // Secondary Option: OpenAI (defaulting to gpt-6-luna) with complete dynamic company context
        if (process.env.OPENAI_API_KEY) {
            try {
                const client = getOpenAI();
                if (client) {
                    const dynamicContextText = buildDynamicContext(context);
                    const extractionModel = process.env.OPENAI_EXTRACTION_MODEL || 'gpt-6-luna';
                    const completion = await client.chat.completions.create({
                        model: extractionModel,
                        messages: [
                            { role: 'system', content: `${SYSTEM_PROMPT}\n${dynamicContextText}` },
                            {
                                role: 'user',
                                content: `Extract structured construction transaction details and restore the verbatim spoken transcript from this site voice note:\n\n"${transcriptText}"`
                            }
                        ],
                        response_format: { type: 'json_object' },
                        temperature: 0.1
                    });

                    const parsed = JSON.parse(completion.choices[0].message.content);
                    const normalized = normalizeExtractedData(parsed, transcriptText, context);
                    if (normalized) {
                        const finalTranscript = normalized.cleanedTranscript || transcriptText;
                        return {
                            raw_text: finalTranscript,
                            parsed_data: normalized
                        };
                    }
                }
            } catch (aiErr) {
                logger.warn({ err: aiErr }, 'OpenAI voice extraction fallback failed');
            }
        }

        // Heuristic extraction fallback
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
