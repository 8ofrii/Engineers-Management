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

            // Hesaby Webpage Light Mode Palette (Warm Cafe & Ember)
            const BRAND_EMBER = '#c2410c';     // Primary Brand Accent (Warm Terracotta / Ember)
            const BRAND_EMBER_DARK = '#9a3412';// Deep Terracotta
            const BRAND_EMBER_LIGHT = '#ea580c';// Vibrant Ember
            const BRAND_GOLD = '#d97706';      // Warm Gold / Amber
            const SUCCESS = '#065f46';         // Deep Forest Emerald
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

            // Resolve Voucher Title
            let voucherTitleAr = 'سند صرف معتمد';
            let voucherTitleEn = 'OFFICIAL PAYMENT VOUCHER';
            let topColor = BRAND_EMBER;
            let amountColor = TEXT_PRIMARY;

            if (isIncome) {
                voucherTitleAr = 'سند قبض مالي معتمد';
                voucherTitleEn = 'OFFICIAL RECEIPT VOUCHER';
                topColor = SUCCESS;
                amountColor = SUCCESS;
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
                doc.roundedRect(45, compY, emblemSize, emblemSize, 6).fillColor(BRAND_EMBER).fill();
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
            const metaX = 330;
            const metaW = 220;
            useFont(true);
            doc.fillColor(TEXT_PRIMARY).fontSize(16);
            drawPdfText(doc, voucherTitleAr, metaX, 40, { align: 'right', width: metaW, lineBreak: false });
            doc.fontSize(9.5).fillColor(TEXT_SECONDARY);
            doc.text(voucherTitleEn, metaX, 58, { align: 'right', width: metaW, lineBreak: false });

            const refId = tx.id ? tx.id.slice(0, 8).toUpperCase() : 'TX-001';
            doc.fontSize(11).fillColor(topColor);
            doc.text(`REF #${refId}`, metaX, 74, { align: 'right', width: metaW, lineBreak: false });

            useFont(false);
            doc.fontSize(8.5).fillColor(TEXT_MUTED);
            doc.text(fmtDateTime(tx.transactionDate || tx.createdAt), metaX, 90, { align: 'right', width: metaW, lineBreak: false });

            // Status Badge (Webpage Pill Style)
            const bW = 68, bH = 18, bX = 482, bY = 106;
            const badgeConfig = isApproved
                ? { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46', label: 'معتمد' }
                : (tx.status === 'REJECTED'
                    ? { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', label: 'مرفوض' }
                    : { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', label: 'قيد المراجعة' });

            doc.roundedRect(bX, bY, bW, bH, 4).fillColor(badgeConfig.bg).fill();
            doc.roundedRect(bX, bY, bW, bH, 4).lineWidth(0.75).strokeColor(badgeConfig.border).stroke();
            useFont(true);
            doc.fillColor(badgeConfig.text).fontSize(7.5);
            drawPdfText(doc, badgeConfig.label, bX, bY + 4, { width: bW, align: 'center', lineBreak: false });

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
            doc.fontSize(9).fillColor(TEXT_SECONDARY);
            drawPdfText(doc, isIncome ? 'المبلغ المستلم / المحصل:' : (isProfit ? 'مبلغ الأرباح المحولة:' : 'المبلغ المصروف / المسدد:'), 60, heroY + 12, { lineBreak: false });
            useFont(false);
            doc.fontSize(8).fillColor(TEXT_MUTED);
            doc.text('Amount in Egyptian Pounds', 60, heroY + 28, { lineBreak: false });

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
            const projName = tx.project?.name || (tx.isOfficeExpense ? 'المقر الرئيسي / المكتب الإداري' : 'مصروف عام');
            drawFieldCard(col1, currentY, 'المشروع / الموقع', 'Project', projName);
            drawFieldCard(col2, currentY, 'بند التكلفة / التصنيف', 'Category', tx.category || 'عام');
            currentY += cardH + 10;

            // Row 2: Beneficiary & Safe / Payment Method
            const beneficiaryText = tx.beneficiary || tx.supplier?.name || tx.workman?.name || tx.client?.name || '-';
            const safeText = tx.safe?.name ? `${tx.safe.name} (${tx.paymentMethod || 'CASH'})` : (tx.paymentMethod || 'CASH');
            drawFieldCard(col1, currentY, 'المستلم / المستفيد', 'Beneficiary', beneficiaryText);
            drawFieldCard(col2, currentY, 'الخزينة / طريقة السداد', 'Safe / Payment', safeText);
            currentY += cardH + 10;

            // Row 3: Paid By & Approved By
            const payerText = tx.payer?.name || tx.user?.name || '-';
            const approverText = tx.approver?.name ? `${tx.approver.name} (${fmtDateTime(tx.approvedAt)})` : (isApproved ? 'إدارة الشركة' : 'قيد الاعتماد');
            drawFieldCard(col1, currentY, 'مسؤول الصرف / القيد', 'Recorded By', payerText);
            drawFieldCard(col2, currentY, 'الاعتماد المالي', 'Financial Approval', approverText);
            currentY += cardH + 14;

            // 6. Description & Specifications Section
            const descBoxY = currentY;
            const descBoxH = 85;
            doc.roundedRect(45, descBoxY, 505, descBoxH, 4).fillColor(BG_WARM_SUBTLE).fill();
            doc.roundedRect(45, descBoxY, 505, descBoxH, 4).lineWidth(0.75).strokeColor(BORDER).stroke();

            useFont(true);
            doc.fontSize(8.5).fillColor(BRAND_EMBER);
            drawPdfText(doc, 'البيان والغرض من المعاملة • Description & Details:', 57, descBoxY + 8, { lineBreak: false });
            useFont(false);

            doc.fontSize(9).fillColor(TEXT_PRIMARY);
            const fullDesc = tx.description || tx.descriptionAr || tx.notes || 'لا توجد ملاحظات إضافية';
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

            drawSignBlock(45, 'المحاسب المسؤول / الصراف', 'Accountant / Cashier', tx.user?.name || user?.name || 'Authorized');
            drawSignBlock(45 + signColW + signGap, 'المستلم / المستفيد', 'Beneficiary / Recipient', beneficiaryText !== '-' ? beneficiaryText : '____________________');
            drawSignBlock(45 + (signColW + signGap) * 2, 'اعتماد الإدارة المالية', 'Financial Management', tx.approver?.name || (isApproved ? 'الإدارة المالية' : '____________________'));

            // 8. Official Footer on buffered pages
            const range = doc.bufferedPageRange();
            for (let i = range.start; i < range.start + range.count; i++) {
                doc.switchToPage(i);
                const footerY = 770;
                doc.moveTo(45, footerY).lineTo(550, footerY).lineWidth(0.75).strokeColor(BORDER).stroke();
                useFont(true);
                doc.fontSize(8).fillColor(TEXT_PRIMARY);
                drawPdfText(doc, 'إشعار مالي معتمد صادر من نظام حسابي لإدارة المشروعات • Official Verified Financial Slip', 45, footerY + 5, { width: 505, align: 'center', lineBreak: false });
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
