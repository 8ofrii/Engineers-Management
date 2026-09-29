// Voucher PDF generator for transactions.
// Produces an authentic, high-resolution official financial voucher (سند صرف / سند قبض معتمد)
// with bilingual Arabic/English typography, company branding, and guaranteed 1-page layout.

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupDocFonts, drawPdfText, formatPdfText, isArabic } from './arabicPdfHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const fmtMoney = (amount, currency = 'EGP') => {
    const num = Number(amount || 0);
    return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

const fmtDateTime = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

async function resolveLogoBuffer(logoPath) {
    if (!logoPath || typeof logoPath !== 'string') return null;
    try {
        if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const res = await fetch(logoPath, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const arrayBuf = await res.arrayBuffer();
                return Buffer.from(arrayBuf);
            }
            return null;
        }

        const cleanPath = logoPath.replace(/^\//, '');
        const candidatePaths = [
            path.join(rootDir, cleanPath),
            path.join(rootDir, 'uploads', 'images', path.basename(cleanPath)),
            path.join(rootDir, 'uploads', 'avatars', path.basename(cleanPath)),
            path.join(rootDir, 'uploads', path.basename(cleanPath)),
            path.join(rootDir, '../client/public', path.basename(cleanPath))
        ];

        for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
                return fs.readFileSync(p);
            }
        }
    } catch (e) {
        console.warn('Voucher logo load failed:', e.message);
    }
    return null;
}

/**
 * Generates an official executive Transaction Voucher PDF.
 *
 * @param {Object} ctx
 * @param {Object} ctx.transaction Prisma Transaction record (with relations)
 * @param {Object} ctx.tenant Tenant record
 * @param {Object} [ctx.user] Current requesting user
 * @returns {Promise<Buffer>}
 */
export const generateVoucherPdf = ({ transaction, tenant, user }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                autoFirstPage: true,
                bufferPages: true,
                size: 'A4',
                margins: { top: 35, bottom: 25, left: 45, right: 45 }
            });
            setupDocFonts(doc);

            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Hesaby Webpage Light Mode Palette (Warm Cafe & Ember & Emerald)
            const BRAND_EMBER = '#c2410c';     // Primary Brand Accent (Warm Terracotta / Ember)
            const BRAND_EMBER_DARK = '#9a3412';// Deep Terracotta
            const BRAND_EMBER_LIGHT = '#ea580c';// Vibrant Ember
            const BRAND_GOLD = '#d97706';      // Warm Gold / Amber
            const SUCCESS = '#065f46';         // Deep Forest Emerald
            const SUCCESS_VIBRANT = '#047857'; // Vibrant Emerald for Amount
            const DANGER = '#991b1b';          // Deep Crimson
            const TEXT_PRIMARY = '#1c1710';    // Deep Espresso
            const TEXT_SECONDARY = '#6b5f4d';  // Warm Coffee
            const TEXT_MUTED = '#8c7e6c';      // Muted Sand
            const BG_WARM_CARD = '#fdfaf2';    // Elevated card background (warm ivory)
            const BG_WARM_SUBTLE = '#f7f1e5';  // Secondary container / hero background
            const BORDER = '#d8cbaf';          // Warm Sandstone border
            const BORDER_LIGHT = '#e5dcce';    // Subtle divider

            const useFont = (bold = false) => {
                try {
                    doc.font(bold ? 'AppFont-Bold' : 'AppFont');
                } catch {}
            };

            const tx = transaction;
            const isIncome = tx.type === 'INCOME';
            const isProfit = tx.category === 'MANAGEMENT_FEE_TRANSFER';
            const isCustody = tx.category === 'CUSTODY_TRANSFER';
            const isApproved = tx.status === 'APPROVED';

            // Resolve Voucher Title, Top Accent & Prominent Badges
            let voucherTitleAr = 'سند صرف معتمد (مصروفات)';
            let voucherTitleEn = 'OFFICIAL PAYMENT VOUCHER (EXPENSE)';
            let topColor = BRAND_EMBER;
            let amountColor = DANGER;

            if (isIncome) {
                voucherTitleAr = 'سند قبض مالي معتمد (إيراد)';
                voucherTitleEn = 'OFFICIAL RECEIPT VOUCHER (INCOME)';
                topColor = SUCCESS;
                amountColor = SUCCESS_VIBRANT;
            } else if (isProfit) {
                voucherTitleAr = 'إذن تحويل أرباح إدارة';
                voucherTitleEn = 'PROFIT TRANSFER VOUCHER';
                topColor = '#155e75';
                amountColor = '#155e75';
            } else if (isCustody) {
                voucherTitleAr = 'إذن تسليم / إخلاء عهدة';
                voucherTitleEn = 'CUSTODY TRANSFER SLIP';
                topColor = BRAND_GOLD;
                amountColor = BRAND_EMBER_DARK;
            }

            // 1. Sleek Continuous Top Accent Bar
            doc.rect(45, 24, 505, 3.5).fillColor(topColor).fill();

            // 2. Company Logo & Branding (Top-Left)
            const logoBuffer = await resolveLogoBuffer(tenant?.logo || user?.companyLogo);
            let compX = 45;
            const compY = 44;
            let logoRendered = false;

            if (logoBuffer) {
                try {
                    const img = doc.openImage(logoBuffer);
                    const maxW = 75;
                    const maxH = 50;
                    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
                    const rW = Math.round(img.width * scale);
                    const rH = Math.round(img.height * scale);

                    doc.save();
                    doc.roundedRect(45, compY, rW, rH, 4).clip();
                    doc.image(img, 45, compY, { width: rW, height: rH });
                    doc.restore();
                    doc.roundedRect(45, compY, rW, rH, 4).lineWidth(0.75).strokeColor(BORDER).stroke();

                    compX = 45 + rW + 12;
                    logoRendered = true;
                } catch {
                    logoRendered = false;
                }
            }

            if (!logoRendered) {
                const emblemSize = 40;
                doc.roundedRect(45, compY, emblemSize, emblemSize, 6).fillColor(topColor).fill();
                useFont(true);
                const initial = (tenant?.name || user?.company || 'H').trim().charAt(0).toUpperCase();
                doc.fillColor('#ffffff').fontSize(18).text(initial, 45, compY + 11, { width: emblemSize, align: 'center', lineBreak: false });
                compX = 45 + emblemSize + 12;
            }

            // Company Info Block
            const maxCompWidth = 240;
            useFont(true);
            doc.fillColor(TEXT_PRIMARY).fontSize(13);
            drawPdfText(doc, tenant?.name || user?.company || 'Hesaby ERP', compX, compY, { width: maxCompWidth, lineBreak: false });

            useFont(false);
            let curCompY = compY + 17;
            if (tenant?.address) {
                doc.fontSize(8).fillColor(TEXT_SECONDARY);
                drawPdfText(doc, tenant.address, compX, curCompY, { width: maxCompWidth, lineBreak: false });
                curCompY += 12;
            }
            if (tenant?.email || user?.email) {
                doc.fontSize(8).fillColor(TEXT_SECONDARY).text(tenant?.email || user?.email, compX, curCompY, { width: maxCompWidth, lineBreak: false });
                curCompY += 11;
            }
            if (tenant?.phone || user?.phone) {
                doc.fontSize(8).fillColor(TEXT_SECONDARY).text(tenant?.phone || user?.phone, compX, curCompY, { width: maxCompWidth, lineBreak: false });
            }

            // 3. Document Meta (Top-Right)
            const metaX = 320;
            const metaW = 230;
            useFont(true);
            doc.fillColor(TEXT_PRIMARY).fontSize(15);
            drawPdfText(doc, voucherTitleAr, metaX, 35, { align: 'right', width: metaW, lineBreak: false });
            doc.fontSize(8).fillColor(TEXT_SECONDARY);
            doc.text(voucherTitleEn, metaX, 54, { align: 'right', width: metaW, lineBreak: false });

            const refId = tx.id ? tx.id.slice(0, 8).toUpperCase() : 'TX-001';
            doc.fontSize(10.5).fillColor(topColor);
            doc.text(`REF #${refId}`, metaX, 70, { align: 'right', width: metaW, lineBreak: false });

            useFont(false);
            doc.fontSize(8).fillColor(TEXT_MUTED);
            doc.text(fmtDateTime(tx.transactionDate || tx.createdAt), metaX, 86, { align: 'right', width: metaW, lineBreak: false });

            // Dual Badges Row: Transaction Type Pill + Approval Status Badge
            const badgesY = 104;
            const bH = 18;

            // 1. Approval Status Badge (Far Right)
            const bW_Status = 62;
            const bX_Status = 488;
            const badgeConfig = isApproved
                ? { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46', label: 'معتمد' }
                : (tx.status === 'REJECTED'
                    ? { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', label: 'مرفوض' }
                    : { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', label: 'قيد المراجعة' });

            doc.roundedRect(bX_Status, badgesY, bW_Status, bH, 4).fillColor(badgeConfig.bg).fill();
            doc.roundedRect(bX_Status, badgesY, bW_Status, bH, 4).lineWidth(0.75).strokeColor(badgeConfig.border).stroke();
            useFont(true);
            doc.fillColor(badgeConfig.text).fontSize(7.5);
            drawPdfText(doc, badgeConfig.label, bX_Status, badgesY + 4, { width: bW_Status, align: 'center', lineBreak: false });

            // 2. High-Visibility Transaction Type Pill Badge (Beside Status)
            const typeBadgeConfig = isIncome
                ? { bg: '#ecfdf5', border: '#10b981', text: '#047857', label: 'سند قبض • إيراد معتمد' }
                : (isProfit
                    ? { bg: '#ecfeff', border: '#06b6d4', text: '#0e7490', label: 'إذن تحويل أرباح' }
                    : (isCustody
                        ? { bg: '#fffbeb', border: '#f59e0b', text: '#b45309', label: 'تسليم / إخلاء عهدة' }
                        : { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c', label: 'سند صرف • مصروفات' }));

            const bW_Type = 126;
            const bX_Type = bX_Status - bW_Type - 6; // 488 - 126 - 6 = 356
            doc.roundedRect(bX_Type, badgesY, bW_Type, bH, 4).fillColor(typeBadgeConfig.bg).fill();
            doc.roundedRect(bX_Type, badgesY, bW_Type, bH, 4).lineWidth(0.75).strokeColor(typeBadgeConfig.border).stroke();
            useFont(true);
            doc.fillColor(typeBadgeConfig.text).fontSize(7.5);
            drawPdfText(doc, typeBadgeConfig.label, bX_Type, badgesY + 4, { width: bW_Type, align: 'center', lineBreak: false });

            // Divider
            doc.moveTo(45, 132).lineTo(550, 132).lineWidth(1).strokeColor(BORDER).stroke();

            // 4. Hero Amount Banner
            const heroY = 144;
            const heroH = 58;
            doc.roundedRect(45, heroY, 505, heroH, 6).fillColor(BG_WARM_CARD).fill();
            doc.roundedRect(45, heroY, 505, heroH, 6).lineWidth(1).strokeColor(BORDER).stroke();

            // Accent strip inside hero card
            doc.rect(45, heroY, 4, heroH).fillColor(topColor).fill();

            useFont(true);
            doc.fontSize(9.5).fillColor(topColor);
            const amountHeader = isIncome
                ? 'المبلغ المقبوض / المحصل (إيراد وارد معتمد):'
                : (isProfit ? 'مبلغ الأرباح المحولة:' : (isCustody ? 'مبلغ العهدة النقدية المنصرفة:' : 'المبلغ المصروف / المسدد:'));
            drawPdfText(doc, amountHeader, 60, heroY + 11, { lineBreak: false });

            useFont(false);
            doc.fontSize(8).fillColor(TEXT_MUTED);
            const amountSub = isIncome
                ? 'Total Received Revenue in Egyptian Pounds (EGP)'
                : (isProfit ? 'Profit Distribution Amount in Egyptian Pounds (EGP)' : 'Amount Disbursed in Egyptian Pounds (EGP)');
            doc.text(amountSub, 60, heroY + 28, { lineBreak: false });

            useFont(true);
            doc.fillColor(amountColor).fontSize(20);
            doc.text(fmtMoney(tx.amount), 250, heroY + 16, { width: 285, align: 'right', lineBreak: false });

            // 5. Two-Column Structured Details Grid
            let currentY = heroY + heroH + 14;
            const cardW = 245;
            const cardH = 44;
            const col1 = 45;
            const col2 = 305;

            const drawFieldCard = (x, y, labelAr, labelEn, value, isValBold = true) => {
                doc.roundedRect(x, y, cardW, cardH, 4).fillColor(BG_WARM_CARD).fill();
                doc.roundedRect(x, y, cardW, cardH, 4).lineWidth(0.75).strokeColor(BORDER).stroke();

                useFont(false);
                doc.fontSize(7.5).fillColor(TEXT_SECONDARY);
                drawPdfText(doc, `${labelAr} • ${labelEn}`, x + 10, y + 6, { width: cardW - 20, lineBreak: false });

                useFont(isValBold);
                doc.fontSize(9.5).fillColor(TEXT_PRIMARY);
                drawPdfText(doc, value || '-', x + 10, y + 21, { width: cardW - 20, lineBreak: false });
            };

            // Row 1: Project & Category
            const projName = tx.project?.name || (isIncome
                ? (tx.isOfficeExpense ? 'إيرادات عامة / المقر الرئيسي' : 'إيراد عام / غير مقيد بمشروع')
                : (isProfit
                    ? 'أرباح إدارة المشروعات'
                    : (tx.isOfficeExpense ? 'المقر الرئيسي / مصاريف إدارية' : 'مصروف عام')));
            drawFieldCard(col1, currentY, 'المشروع / الموقع', 'Project', projName);

            const getCategoryLabel = () => {
                const cat = (tx.category || '').toUpperCase();
                const categoryMap = {
                    PAYMENT: isIncome ? 'دفعة عميل / تحصيل إيراد' : 'سداد دفعة / صرف مالي',
                    MATERIAL: 'توريد خامات ومواد',
                    EQUIPMENT: 'معدات وإيجارات',
                    LABOR: 'مصنعيات وأجور عمال',
                    SUBCONTRACTOR: 'مقاولو باطن',
                    SALARY: 'رواتب وبدلات',
                    RENT: 'إيجارات',
                    UTILITIES: 'فواتير ومرافق',
                    OFFICE: 'مصاريف إدارية ومكتبية',
                    GOVERNMENT: 'رسوم حكومية وتراخيص',
                    TRANSPORTATION: 'نقل ومشاوير',
                    MARKETING: 'تسويق وإعلانات',
                    MAINTENANCE: 'صيانة وتشغيل',
                    CONSULTING: 'استشارات هندسية',
                    FINANCIAL: 'رسوم بنكية ومصرفية',
                    PETTY_CASH: 'نثريات وبوفيه',
                    CUSTODY_TRANSFER: 'حركة تسليم عهدة',
                    MANAGEMENT_FEE_TRANSFER: 'تحويل أرباح إدارة',
                    OTHER: isIncome ? 'إيرادات متنوعة' : 'مصروفات أخرى'
                };
                return categoryMap[cat] || tx.category || (isIncome ? 'إيراد عام' : 'عام');
            };
            const catLabelAr = isIncome ? 'نوع الإيراد / التصنيف' : 'بند التكلفة / التصنيف';
            const catLabelEn = isIncome ? 'Revenue Category' : 'Cost Item / Category';
            drawFieldCard(col2, currentY, catLabelAr, catLabelEn, getCategoryLabel());
            currentY += cardH + 10;

            // Row 2: Party (Sender / Client for Income vs Beneficiary for Expense) & Safe / Account
            let partyLabelAr, partyLabelEn, partyVal;
            if (isIncome) {
                partyLabelAr = 'المسلِّم / العميل (القائم بالسداد)';
                partyLabelEn = 'Paid By / Client (Sender)';
                if (tx.client) {
                    const clientComp = tx.client.company ? ` — ${tx.client.company}` : '';
                    partyVal = `${tx.client.name}${clientComp}`;
                } else {
                    partyVal = tx.transactionFrom || tx.paidByClientContact || tx.beneficiary || 'عميل نقدي / غير مسجل';
                }
            } else if (isProfit) {
                partyLabelAr = 'المستفيد / جهة التحويل';
                partyLabelEn = 'Beneficiary / Transferred To';
                partyVal = tx.beneficiary || 'حساب أرباح الإدارة';
            } else if (isCustody) {
                partyLabelAr = 'المستلم للعهدة';
                partyLabelEn = 'Custodian / Recipient';
                partyVal = tx.beneficiary || tx.workman?.name || tx.toEngineer?.name || tx.payer?.name || '-';
            } else {
                partyLabelAr = 'المستلم / المستفيد (يصرف إلى)';
                partyLabelEn = 'Beneficiary / Payee';
                partyVal = tx.beneficiary || tx.supplier?.name || tx.workman?.name || tx.transactionTo || '-';
            }
            drawFieldCard(col1, currentY, partyLabelAr, partyLabelEn, partyVal);

            // Safe / Account and Payment Method
            const methodMap = {
                CASH: 'نقدي',
                BANK_TRANSFER: 'تحويل بنكي',
                CHECK: 'شيك بنكي',
                CREDIT_CARD: 'بطاقة ائتمان',
                WALLET: 'محفظة إلكترونية',
                INSTAPAY: 'انستاباي',
                VODAFONE_CASH: 'فودافون كاش',
                ETISALAT_CASH: 'اتصالات كاش',
                ORANGE_CASH: 'أورنج كاش'
            };
            const methodStr = methodMap[tx.paymentMethod] || tx.paymentMethod || 'نقدي';
            const safeText = tx.safe?.name ? `${tx.safe.name} — ${methodStr}` : methodStr;
            const safeLabelAr = isIncome ? 'أودع في / طريقة التحصيل' : 'الخزينة / طريقة السداد';
            const safeLabelEn = isIncome ? 'Deposited To / Method' : 'Paid From / Method';
            drawFieldCard(col2, currentY, safeLabelAr, safeLabelEn, safeText);
            currentY += cardH + 10;

            // Row 3: Staff Officer & Financial Approval
            const recorderLabelAr = isIncome ? 'المستلم / محرر السند' : 'مسؤول الصرف / القيد';
            const recorderLabelEn = isIncome ? 'Received By / Cashier' : 'Disbursed By / Recorder';
            const recorderVal = isIncome
                ? (tx.user?.name || user?.name || '-')
                : (tx.payer?.name || tx.user?.name || user?.name || '-');
            drawFieldCard(col1, currentY, recorderLabelAr, recorderLabelEn, recorderVal);

            const approverText = tx.approver?.name
                ? `${tx.approver.name} (${fmtDateTime(tx.approvedAt)})`
                : (isApproved ? 'الإدارة المالية (معتمد رسمي)' : 'قيد المراجعة والاعتماد');
            drawFieldCard(col2, currentY, 'الاعتماد المالي', 'Financial Approval', approverText);
            currentY += cardH + 14;

            // 6. Description & Specifications Section
            const descBoxY = currentY;
            const descBoxH = 85;
            doc.roundedRect(45, descBoxY, 505, descBoxH, 4).fillColor(BG_WARM_SUBTLE).fill();
            doc.roundedRect(45, descBoxY, 505, descBoxH, 4).lineWidth(0.75).strokeColor(BORDER).stroke();

            useFont(true);
            doc.fontSize(8.5).fillColor(topColor);
            const descHeader = isIncome
                ? 'البيان والغرض من التحصيل • Receipt Purpose & Notes:'
                : 'البيان والغرض من المعاملة • Description & Details:';
            drawPdfText(doc, descHeader, 57, descBoxY + 8, { lineBreak: false });
            useFont(false);

            doc.fontSize(9).fillColor(TEXT_PRIMARY);
            let fullDesc = tx.description || tx.descriptionAr || '';
            if (tx.notes && tx.notes !== fullDesc) {
                fullDesc = fullDesc ? `${fullDesc} — ملاحظات: ${tx.notes}` : tx.notes;
            }
            if (!fullDesc) fullDesc = 'لا توجد ملاحظات إضافية';
            drawPdfText(doc, fullDesc, 57, descBoxY + 24, { width: 480 });

            if (tx.costCenter) {
                doc.fontSize(8).fillColor(TEXT_SECONDARY);
                drawPdfText(doc, `مركز التكلفة / الموقع: ${tx.costCenter}`, 57, descBoxY + 62, { width: 480, lineBreak: false });
            }

            currentY = descBoxY + descBoxH + 22;

            // 7. Official 3-Party Signatures Block
            const signY = currentY;
            const signColW = 150;
            const signGap = 27;

            const drawSignBlock = (x, titleAr, titleEn, name) => {
                doc.moveTo(x, signY).lineTo(x + signColW, signY).lineWidth(0.75).dash(3, { space: 3 }).strokeColor(BORDER).stroke();
                doc.undash();

                useFont(true);
                doc.fontSize(8).fillColor(TEXT_SECONDARY);
                drawPdfText(doc, `${titleAr}`, x, signY + 6, { width: signColW, align: 'center', lineBreak: false });
                doc.fontSize(7).text(titleEn, x, signY + 18, { width: signColW, align: 'center', lineBreak: false });

                useFont(false);
                doc.fontSize(8.5).fillColor(TEXT_PRIMARY);
                drawPdfText(doc, name || '____________________', x, signY + 44, { width: signColW, align: 'center', lineBreak: false });
            };

            if (isIncome) {
                // Col 1: Depositor / Payer (Client)
                const depositorName = tx.client?.name || tx.transactionFrom || tx.beneficiary || '____________________';
                drawSignBlock(45, 'المسلِّم / القائم بالسداد', 'Depositor / Payer (Client)', depositorName);

                // Col 2: Received By / Cashier (Company Staff)
                drawSignBlock(45 + signColW + signGap, 'المستلم / أمين الخزينة', 'Received By / Cashier', tx.user?.name || user?.name || 'Authorized');

                // Col 3: Financial Management Approval
                drawSignBlock(45 + (signColW + signGap) * 2, 'اعتماد الإدارة المالية', 'Financial Management', tx.approver?.name || (isApproved ? 'الإدارة المالية' : '____________________'));
            } else if (isProfit) {
                drawSignBlock(45, 'مسؤول التحويل', 'Transferred By', tx.user?.name || user?.name || 'Authorized');
                drawSignBlock(45 + signColW + signGap, 'المستلم / الشريك أو الإدارة', 'Received By / Partner', tx.beneficiary || '____________________');
                drawSignBlock(45 + (signColW + signGap) * 2, 'اعتماد الإدارة المالية', 'Financial Management', tx.approver?.name || (isApproved ? 'الإدارة المالية' : '____________________'));
            } else if (isCustody) {
                drawSignBlock(45, 'المسلِّم / أمين الخزينة', 'Issued By / Cashier', tx.user?.name || user?.name || 'Authorized');
                drawSignBlock(45 + signColW + signGap, 'المستلم للعهدة', 'Custodian / Recipient', tx.beneficiary || tx.workman?.name || '____________________');
                drawSignBlock(45 + (signColW + signGap) * 2, 'اعتماد الإدارة المالية', 'Financial Management', tx.approver?.name || (isApproved ? 'الإدارة المالية' : '____________________'));
            } else {
                // Expense
                drawSignBlock(45, 'المحاسب المسؤول / الصراف', 'Accountant / Cashier', tx.payer?.name || tx.user?.name || user?.name || 'Authorized');
                drawSignBlock(45 + signColW + signGap, 'المستلم / المستفيد', 'Beneficiary / Recipient', partyVal !== '-' ? partyVal : '____________________');
                drawSignBlock(45 + (signColW + signGap) * 2, 'اعتماد الإدارة المالية', 'Financial Management', tx.approver?.name || (isApproved ? 'الإدارة المالية' : '____________________'));
            }

            // 8. Official Footer on buffered pages
            const range = doc.bufferedPageRange();
            for (let i = range.start; i < range.start + range.count; i++) {
                doc.switchToPage(i);
                const footerY = 770;
                doc.moveTo(45, footerY).lineTo(550, footerY).lineWidth(0.75).strokeColor(BORDER).stroke();
                useFont(true);
                doc.fontSize(8).fillColor(TEXT_PRIMARY);
                const footerSlipText = isIncome
                    ? 'إشعار تحصيل مالي معتمد صادر من نظام حسابي لإدارة المشروعات • Official Verified Income Receipt Slip'
                    : 'إشعار مالي معتمد صادر من نظام حسابي لإدارة المشروعات • Official Verified Financial Slip';
                drawPdfText(doc, footerSlipText, 45, footerY + 5, { width: 505, align: 'center', lineBreak: false });
                useFont(false);
                doc.fontSize(7.5).fillColor(TEXT_SECONDARY).text(
                    `${tenant?.name || user?.company || 'Hesaby ERP'} • Ref #${refId} • Page ${i + 1} of ${range.count}`,
                    45, footerY + 17,
                    { width: 505, align: 'center', lineBreak: false }
                );
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};
