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

            // Palette
            const PRIMARY_DARK = '#0f172a'; // Slate 900
            const PRIMARY = '#1e293b';      // Slate 800
            const ACCENT_BLUE = '#2563eb';  // Royal Blue
            const ACCENT_GOLD = '#d97706';  // Amber 600
            const SUCCESS = '#059669';      // Emerald 600
            const DANGER = '#dc2626';       // Red 600
            const TEXT = '#0f172a';         // Slate Dark
            const TEXT_MUTED = '#64748b';   // Slate 500
            const CARD_BG = '#f8fafc';      // Slate 50
            const BORDER = '#e2e8f0';       // Slate 200

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
            let bannerBgColor = PRIMARY_DARK;
            let amountColor = isIncome ? SUCCESS : (isProfit ? '#7c3aed' : PRIMARY_DARK);

            if (isIncome) {
                voucherTitleAr = 'سند قبض مالي معتمد';
                voucherTitleEn = 'OFFICIAL RECEIPT VOUCHER';
            } else if (isProfit) {
                voucherTitleAr = 'إذن تحويل أرباح إدارة';
                voucherTitleEn = 'PROFIT TRANSFER VOUCHER';
            } else if (isCustody) {
                voucherTitleAr = 'إذن تسليم / إخلاء عهدة';
                voucherTitleEn = 'CUSTODY TRANSFER SLIP';
            }

            // 1. Sleek Continuous Top Accent Bar
            const topColor = isIncome ? SUCCESS : (isProfit ? '#7c3aed' : ACCENT_BLUE);
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
                doc.roundedRect(45, compY, emblemSize, emblemSize, 6).fillColor(PRIMARY_DARK).fill();
                useFont(true);
                const initial = (tenant?.name || user?.company || 'H').trim().charAt(0).toUpperCase();
                doc.fillColor('#ffffff').fontSize(18).text(initial, 45, compY + 11, { width: emblemSize, align: 'center', lineBreak: false });
                compX = 45 + emblemSize + 12;
            }

            // Company Info Block
            const maxCompWidth = 240;
            useFont(true);
            doc.fillColor(PRIMARY_DARK).fontSize(13);
            drawPdfText(doc, tenant?.name || user?.company || 'Hesaby ERP', compX, compY, { width: maxCompWidth, lineBreak: false });

            useFont(false);
            let curCompY = compY + 17;
            if (tenant?.address) {
                doc.fontSize(8).fillColor(TEXT_MUTED);
                drawPdfText(doc, tenant.address, compX, curCompY, { width: maxCompWidth, lineBreak: false });
                curCompY += 12;
            }
            if (tenant?.email || user?.email) {
                doc.fontSize(8).fillColor(TEXT_MUTED).text(tenant?.email || user?.email, compX, curCompY, { width: maxCompWidth, lineBreak: false });
                curCompY += 11;
            }
            if (tenant?.phone || user?.phone) {
                doc.fontSize(8).fillColor(TEXT_MUTED).text(tenant?.phone || user?.phone, compX, curCompY, { width: maxCompWidth, lineBreak: false });
            }

            // 3. Document Meta (Top-Right)
            const metaX = 330;
            const metaW = 220;
            useFont(true);
            doc.fillColor(PRIMARY_DARK).fontSize(16);
            drawPdfText(doc, voucherTitleAr, metaX, 40, { align: 'right', width: metaW, lineBreak: false });
            doc.fontSize(9.5).fillColor(TEXT_MUTED);
            doc.text(voucherTitleEn, metaX, 58, { align: 'right', width: metaW, lineBreak: false });

            const refId = tx.id ? tx.id.slice(0, 8).toUpperCase() : 'TX-001';
            doc.fontSize(11).fillColor(topColor);
            doc.text(`REF #${refId}`, metaX, 74, { align: 'right', width: metaW, lineBreak: false });

            useFont(false);
            doc.fontSize(8.5).fillColor(TEXT_MUTED);
            doc.text(fmtDateTime(tx.transactionDate || tx.createdAt), metaX, 90, { align: 'right', width: metaW, lineBreak: false });

            // Status Badge
            const bW = 65, bH = 17, bX = 485, bY = 106;
            const bColor = isApproved ? SUCCESS : (tx.status === 'REJECTED' ? DANGER : ACCENT_GOLD);
            doc.roundedRect(bX, bY, bW, bH, 3.5).fillColor(bColor).fill();
            useFont(true);
            doc.fillColor('#ffffff').fontSize(7.5);
            drawPdfText(doc, isApproved ? 'معتمد' : (tx.status === 'REJECTED' ? 'مرفوض' : 'قيد المراجعة'), bX, bY + 4, { width: bW, align: 'center', lineBreak: false });

            // Divider
            doc.moveTo(45, 132).lineTo(550, 132).lineWidth(1).strokeColor(BORDER).stroke();

            // 4. Hero Amount Banner
            const heroY = 144;
            const heroH = 58;
            doc.roundedRect(45, heroY, 505, heroH, 6).fillColor(CARD_BG).fill();
            doc.roundedRect(45, heroY, 505, heroH, 6).lineWidth(1).strokeColor(BORDER).stroke();

            // Accent strip inside hero card
            doc.rect(45, heroY, 4, heroH).fillColor(topColor).fill();

            useFont(true);
            doc.fontSize(9).fillColor(TEXT_MUTED);
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
                doc.roundedRect(x, y, cardW, cardH, 4).fillColor('#ffffff').fill();
                doc.roundedRect(x, y, cardW, cardH, 4).lineWidth(0.75).strokeColor(BORDER).stroke();

                useFont(false);
                doc.fontSize(7.5).fillColor(TEXT_MUTED);
                drawPdfText(doc, `${labelAr} • ${labelEn}`, x + 10, y + 6, { width: cardW - 20, lineBreak: false });

                useFont(isValBold);
                doc.fontSize(9.5).fillColor(PRIMARY_DARK);
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
            doc.roundedRect(45, descBoxY, 505, descBoxH, 4).fillColor(CARD_BG).fill();
            doc.roundedRect(45, descBoxY, 505, descBoxH, 4).lineWidth(0.75).strokeColor(BORDER).stroke();

            useFont(true);
            doc.fontSize(8.5).fillColor(PRIMARY);
            drawPdfText(doc, 'البيان والغرض من المعاملة • Description & Details:', 57, descBoxY + 8, { lineBreak: false });
            useFont(false);

            doc.fontSize(9).fillColor(TEXT);
            const fullDesc = tx.description || tx.descriptionAr || tx.notes || 'لا توجد ملاحظات إضافية';
            drawPdfText(doc, fullDesc, 57, descBoxY + 24, { width: 480 });

            if (tx.costCenter) {
                doc.fontSize(8).fillColor(TEXT_MUTED);
                drawPdfText(doc, `مركز التكلفة / الموقع: ${tx.costCenter}`, 57, descBoxY + 62, { width: 480, lineBreak: false });
            }

            currentY = descBoxY + descBoxH + 22;

            // 7. Official 3-Party Signatures Block
            const signY = currentY;
            const signColW = 150;
            const signGap = 27;

            const drawSignBlock = (x, titleAr, titleEn, name) => {
                doc.moveTo(x, signY).lineTo(x + signColW, signY).lineWidth(0.75).dash(3, { space: 3 }).strokeColor('#94a3b8').stroke();
                doc.undash();

                useFont(true);
                doc.fontSize(8).fillColor(TEXT_MUTED);
                drawPdfText(doc, `${titleAr}`, x, signY + 6, { width: signColW, align: 'center', lineBreak: false });
                doc.fontSize(7).text(titleEn, x, signY + 18, { width: signColW, align: 'center', lineBreak: false });

                useFont(false);
                doc.fontSize(8.5).fillColor(PRIMARY_DARK);
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
                doc.fontSize(8).fillColor(PRIMARY_DARK);
                drawPdfText(doc, 'إشعار مالي معتمد صادر من نظام حسابي لإدارة المشروعات • Official Verified Financial Slip', 45, footerY + 5, { width: 505, align: 'center', lineBreak: false });
                useFont(false);
                doc.fontSize(7.5).fillColor(TEXT_MUTED).text(
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
