// PDF generator for invoices. Uses pdfkit with full Arabic (RTL) and Unicode support.
// Returns a Buffer that controllers can either pipe to a response or attach to an email.

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
    return `${num.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

const fmtDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-GB');
};

/**
 * Resolves a logo buffer from local disk or URL.
 * Returns null if not found or on error.
 */
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
        console.warn('PDF logo load failed:', e.message);
    }
    return null;
}

/**
 * Render an invoice to a PDF buffer with authentic executive invoice styling,
 * cohesive company branding, language-aware typography, and flawless Arabic support.
 *
 * @param {Object} ctx
 * @param {Object} ctx.invoice  Prisma Invoice record (with `lineItems` array)
 * @param {Object} ctx.client   Client record
 * @param {Object} ctx.tenant   Tenant record (provides company name + logo + address)
 * @param {Object} [ctx.project] Optional project record
 * @returns {Promise<Buffer>}
 */
export const generateInvoicePdf = ({ invoice, client, tenant, project }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 45, size: 'A4' });
            setupDocFonts(doc);

            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Palette — Modern Executive Corporate Palette
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
                } catch {
                    // Fallback
                }
            };

            // Detect primary language of the invoice
            const isArDoc = isArabic(client?.name) ||
                            isArabic(project?.name) ||
                            isArabic(invoice.lineItems?.[0]?.description) ||
                            isArabic(invoice.notes);

            const L = isArDoc ? {
                docTitle: invoice.taxRate > 0 ? 'فاتورة ضريبية' : 'فاتورة مبيعات',
                invoiceNo: 'رقم الفاتورة',
                issueDate: 'تاريخ الإصدار',
                dueDate: 'تاريخ الاستحقاق',
                billedTo: 'بيانات العميل',
                projectDetails: 'بيانات المشروع',
                description: 'البيان والمواصفات',
                qty: 'الكمية',
                unitPrice: 'سعر الوحدة',
                total: 'الإجمالي',
                subtotal: 'المجموع الفرعي',
                discount: 'الخصم',
                tax: `ضريبة القيمة المضافة (${invoice.taxRate}%)`,
                totalDue: 'إجمالي المستحق',
                paidAmount: 'المبلغ المسدد',
                balanceDue: 'المبلغ المتبقي',
                notesTitle: 'ملاحظات وشروط السداد',
                defaultTerms: 'يرجى سداد المبلغ المستحق بحلول تاريخ الاستحقاق.',
                thankYou: 'شكراً لتعاملكم معنا',
                officialDoc: 'مستند فاتورة رسمي'
            } : {
                docTitle: invoice.taxRate > 0 ? 'TAX INVOICE' : 'INVOICE',
                invoiceNo: 'Invoice No.',
                issueDate: 'Issue Date',
                dueDate: 'Due Date',
                billedTo: 'BILLED TO',
                projectDetails: 'PROJECT DETAILS',
                description: 'DESCRIPTION',
                qty: 'QTY',
                unitPrice: 'UNIT PRICE',
                total: 'TOTAL',
                subtotal: 'Subtotal',
                discount: 'Discount',
                tax: `Tax (${invoice.taxRate}%)`,
                totalDue: 'TOTAL DUE',
                paidAmount: 'Paid Amount',
                balanceDue: 'Balance Due',
                notesTitle: 'PAYMENT TERMS & NOTES',
                defaultTerms: 'Payment is due within 30 days of invoice date.',
                thankYou: 'Thank you for your business',
                officialDoc: 'Official Invoice Document'
            };

            // 1. Sleek Continuous Top Accent Bar
            doc.rect(45, 24, 505, 3.5).fillColor(PRIMARY_DARK).fill();

            // 2. Resolve & Render Logo / Monogram (Top-Left)
            const logoBuffer = await resolveLogoBuffer(tenant?.logo);
            let compX = 45;
            const compY = 48;
            let logoRendered = false;

            if (logoBuffer) {
                try {
                    const img = doc.openImage(logoBuffer);
                    const maxW = 75;
                    const maxH = 55;
                    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
                    const rW = Math.round(img.width * scale);
                    const rH = Math.round(img.height * scale);

                    doc.save();
                    doc.roundedRect(45, compY, rW, rH, 4).clip();
                    doc.image(img, 45, compY, { width: rW, height: rH });
                    doc.restore();
                    doc.roundedRect(45, compY, rW, rH, 4).lineWidth(0.75).strokeColor(BORDER).stroke();

                    // Place company info immediately next to logo (just 14px gap)
                    compX = 45 + rW + 14;
                    logoRendered = true;
                } catch (imgErr) {
                    logoRendered = false;
                }
            }

            if (!logoRendered) {
                // Render sleek vector monogram emblem
                const emblemSize = 40;
                doc.roundedRect(45, compY, emblemSize, emblemSize, 6).fillColor(PRIMARY_DARK).fill();
                useFont(true);
                const initial = (tenant?.name || 'H').trim().charAt(0).toUpperCase();
                doc.fillColor('#ffffff').fontSize(18).text(initial, 45, compY + 11, { width: emblemSize, align: 'center' });
                compX = 45 + emblemSize + 14;
            }

            // Company Info Block (Tightly grouped)
            const maxCompWidth = 240;
            useFont(true);
            doc.fillColor(PRIMARY_DARK).fontSize(13);
            drawPdfText(doc, tenant?.name || 'Hesaby ERP', compX, compY, { width: maxCompWidth });

            useFont(false);
            let curCompY = compY + 17;

            if (tenant?.address) {
                doc.fontSize(8).fillColor(TEXT_MUTED);
                drawPdfText(doc, tenant.address, compX, curCompY, { width: maxCompWidth });
                curCompY += 12;
            }
            if (tenant?.email) {
                doc.fontSize(8).fillColor(TEXT_MUTED).text(tenant.email, compX, curCompY, { width: maxCompWidth });
                curCompY += 11;
            }
            if (tenant?.phone) {
                doc.fontSize(8).fillColor(TEXT_MUTED).text(tenant.phone, compX, curCompY, { width: maxCompWidth });
            }

            // 3. Document Meta (Top-Right)
            const metaX = 350;
            const metaW = 200;
            useFont(true);
            doc.fillColor(PRIMARY_DARK).fontSize(22);
            drawPdfText(doc, L.docTitle, metaX, 42, { align: 'right', width: metaW });

            doc.fontSize(11).fillColor(ACCENT_BLUE);
            doc.text(`# ${invoice.invoiceNumber}`, metaX, 70, { align: 'right', width: metaW });

            useFont(false);
            doc.fontSize(8.5).fillColor(TEXT_MUTED);
            doc.text(`${L.issueDate}: ${fmtDate(invoice.issueDate)}`, metaX, 88, { align: 'right', width: metaW });
            doc.text(`${L.dueDate}: ${fmtDate(invoice.dueDate)}`, metaX, 101, { align: 'right', width: metaW });

            // Status Badge - ONLY if distinct status (PAID, PARTIAL, OVERDUE).
            // DRAFT/SENT invoices remain clean and unbadged for an official look.
            if (invoice.status === 'PAID') {
                const bW = 60, bH = 18, bX = 490, bY = 117;
                doc.roundedRect(bX, bY, bW, bH, 4).fillColor(SUCCESS).fill();
                useFont(true);
                doc.fillColor('#ffffff').fontSize(8);
                drawPdfText(doc, isArDoc ? 'مسددة' : 'PAID', bX, bY + 4, { width: bW, align: 'center' });
            } else if (invoice.status === 'PARTIALLY_PAID') {
                const bW = 80, bH = 18, bX = 470, bY = 117;
                doc.roundedRect(bX, bY, bW, bH, 4).fillColor(ACCENT_GOLD).fill();
                useFont(true);
                doc.fillColor('#ffffff').fontSize(8);
                drawPdfText(doc, isArDoc ? 'مسدد جزئياً' : 'PARTIAL', bX, bY + 4, { width: bW, align: 'center' });
            } else if (invoice.status === 'OVERDUE') {
                const bW = 70, bH = 18, bX = 480, bY = 117;
                doc.roundedRect(bX, bY, bW, bH, 4).fillColor(DANGER).fill();
                useFont(true);
                doc.fillColor('#ffffff').fontSize(8);
                drawPdfText(doc, isArDoc ? 'متأخرة' : 'OVERDUE', bX, bY + 4, { width: bW, align: 'center' });
            }

            // 4. Client & Project Details (Clean Typography, No bulky boxes)
            const detailsY = 142;
            doc.moveTo(45, detailsY - 10).lineTo(550, detailsY - 10).strokeColor(BORDER).stroke();

            // Left: Billed To
            const col1X = 45;
            const col1W = 245;
            useFont(true);
            doc.fillColor(TEXT_MUTED).fontSize(7.5);
            drawPdfText(doc, L.billedTo, col1X, detailsY, { width: col1W });

            doc.fillColor(PRIMARY_DARK).fontSize(11);
            drawPdfText(doc, client?.name || '-', col1X, detailsY + 14, { width: col1W });

            useFont(false);
            let curClientY = detailsY + 28;
            if (client?.company) {
                doc.fontSize(9).fillColor(PRIMARY);
                drawPdfText(doc, client.company, col1X, curClientY, { width: col1W });
                curClientY += 13;
            }
            if (client?.email) {
                doc.fontSize(8).fillColor(TEXT_MUTED).text(client.email, col1X, curClientY, { width: col1W });
                curClientY += 11;
            }
            if (client?.phone) {
                doc.fontSize(8).fillColor(TEXT_MUTED).text(client.phone, col1X, curClientY, { width: col1W });
            }

            // Right: Project
            const col2X = 310;
            const col2W = 240;
            useFont(true);
            doc.fillColor(TEXT_MUTED).fontSize(7.5);
            drawPdfText(doc, L.projectDetails, col2X, detailsY, { width: col2W });

            if (project) {
                doc.fillColor(PRIMARY_DARK).fontSize(11);
                drawPdfText(doc, project.name, col2X, detailsY + 14, { width: col2W });

                useFont(false);
                let curProjY = detailsY + 28;
                if (project.location) {
                    doc.fontSize(9).fillColor(PRIMARY);
                    drawPdfText(doc, project.location, col2X, curProjY, { width: col2W });
                    curProjY += 13;
                }
                if (project.code) {
                    doc.fontSize(8).fillColor(TEXT_MUTED).text(`Code: ${project.code}`, col2X, curProjY, { width: col2W });
                }
            } else {
                useFont(false);
                doc.fillColor(TEXT_MUTED).fontSize(9);
                drawPdfText(doc, isArDoc ? 'خدمات عامة' : 'General Services', col2X, detailsY + 14, { width: col2W });
            }

            // 5. Line Items Table
            const tableTop = 224;
            doc.roundedRect(45, tableTop, 505, 24, 3).fillColor(PRIMARY_DARK).fill();
            useFont(true);
            doc.fillColor('#ffffff').fontSize(8);
            drawPdfText(doc, L.description, 55, tableTop + 7, { width: 235 });
            drawPdfText(doc, L.qty, 295, tableTop + 7, { width: 45, align: 'right' });
            drawPdfText(doc, L.unitPrice, 345, tableTop + 7, { width: 95, align: 'right' });
            drawPdfText(doc, L.total, 445, tableTop + 7, { width: 95, align: 'right' });

            let y = tableTop + 26;
            const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
            useFont(false);

            items.forEach((item, idx) => {
                if (y > 680) {
                    doc.addPage();
                    y = 50;
                    doc.roundedRect(45, y, 505, 22, 3).fillColor(PRIMARY_DARK).fill();
                    useFont(true);
                    doc.fillColor('#ffffff').fontSize(8);
                    drawPdfText(doc, L.description, 55, y + 6, { width: 235 });
                    drawPdfText(doc, L.qty, 295, y + 6, { width: 45, align: 'right' });
                    drawPdfText(doc, L.unitPrice, 345, y + 6, { width: 95, align: 'right' });
                    drawPdfText(doc, L.total, 445, y + 6, { width: 95, align: 'right' });
                    y += 24;
                    useFont(false);
                }

                const descText = item.description || '-';
                const isItemAr = isArabic(descText);
                const descWidth = 235;
                const formattedDesc = isItemAr ? formatPdfText(descText, doc, descWidth) : descText;
                const descHeight = doc.heightOfString(formattedDesc, { width: descWidth, features: isItemAr ? [] : undefined });
                const rowHeight = Math.max(26, descHeight + 10);

                if (idx % 2 === 1) {
                    doc.rect(45, y, 505, rowHeight).fillColor(CARD_BG).fill();
                }

                doc.fillColor(TEXT).fontSize(9);
                drawPdfText(doc, descText, 55, y + 5, { width: descWidth, align: isItemAr ? 'right' : 'left' });
                doc.fontSize(9).text(String(item.quantity ?? '-'), 295, y + 5, { width: 45, align: 'right' });
                doc.text(fmtMoney(item.unitPrice, invoice.currency), 345, y + 5, { width: 95, align: 'right' });
                useFont(true);
                doc.text(fmtMoney(item.total, invoice.currency), 445, y + 5, { width: 95, align: 'right' });
                useFont(false);

                doc.moveTo(45, y + rowHeight).lineTo(550, y + rowHeight).strokeColor('#f1f5f9').stroke();
                y += rowHeight;
            });

            // 6. Summary Totals & Notes Section
            y = Math.max(y + 20, 500);
            if (y > 660) {
                doc.addPage();
                y = 50;
            }

            const totalsBoxX = 315;
            const totalsBoxW = 235;
            const totalsStartY = y;
            const totalsH = 135;

            // Totals Box Container
            doc.roundedRect(totalsBoxX, totalsStartY, totalsBoxW, totalsH, 6).fillColor(CARD_BG).fill();
            doc.roundedRect(totalsBoxX, totalsStartY, totalsBoxW, totalsH, 6).lineWidth(1).strokeColor(BORDER).stroke();

            let totalLineY = totalsStartY + 10;
            const writeTotalRow = (label, value, isBold = false, valColor = TEXT) => {
                useFont(isBold);
                doc.fontSize(isBold ? 10 : 8.5).fillColor(isBold ? TEXT : TEXT_MUTED);
                drawPdfText(doc, label, totalsBoxX + 12, totalLineY, { width: 110 });
                doc.fillColor(valColor).text(fmtMoney(value, invoice.currency), totalsBoxX + 120, totalLineY, {
                    width: totalsBoxW - 132,
                    align: 'right'
                });
                totalLineY += isBold ? 18 : 16;
            };

            writeTotalRow(L.subtotal, invoice.subtotal);
            if (Number(invoice.discountAmount || 0) > 0) {
                writeTotalRow(L.discount, -Number(invoice.discountAmount), false, DANGER);
            }
            if (Number(invoice.taxAmount || 0) > 0) {
                writeTotalRow(L.tax, invoice.taxAmount);
            }

            // TOTAL DUE Highlight Banner (34px height, perfectly centered!)
            const dueBannerH = 34;
            doc.roundedRect(totalsBoxX + 6, totalLineY, totalsBoxW - 12, dueBannerH, 4).fillColor(PRIMARY_DARK).fill();
            useFont(true);
            doc.fillColor('#ffffff').fontSize(10);
            drawPdfText(doc, L.totalDue, totalsBoxX + 14, totalLineY + 10, { width: 105 });
            doc.fillColor('#f59e0b').fontSize(11.5).text(fmtMoney(invoice.totalAmount, invoice.currency), totalsBoxX + 115, totalLineY + 9, {
                width: totalsBoxW - 125,
                align: 'right'
            });
            totalLineY += dueBannerH + 8;

            if (Number(invoice.paidAmount || 0) > 0) {
                writeTotalRow(L.paidAmount, invoice.paidAmount, false, SUCCESS);
                const balance = Number(invoice.totalAmount) - Number(invoice.paidAmount);
                writeTotalRow(L.balanceDue, balance, true, balance > 0 ? '#f59e0b' : SUCCESS);
            }

            // Notes / Terms / Signature (Left Section)
            const notesBoxX = 45;
            const notesBoxW = 255;
            // Clean 3px accent line on the left
            doc.rect(notesBoxX, totalsStartY, 3, totalsH).fillColor(PRIMARY_DARK).fill();

            useFont(true);
            doc.fillColor(PRIMARY).fontSize(8);
            drawPdfText(doc, L.notesTitle, notesBoxX + 12, totalsStartY + 4, { width: notesBoxW - 16 });
            useFont(false);

            let notesContentY = totalsStartY + 18;
            if (invoice.notes) {
                doc.fontSize(8).fillColor(TEXT);
                drawPdfText(doc, invoice.notes, notesBoxX + 12, notesContentY, { width: notesBoxW - 16 });
                notesContentY += 22;
            }
            if (invoice.terms) {
                useFont(true);
                doc.fontSize(7.5).fillColor(TEXT_MUTED).text('TERMS & CONDITIONS:', notesBoxX + 12, notesContentY, { width: notesBoxW - 16 });
                useFont(false);
                doc.fontSize(8).fillColor(TEXT);
                drawPdfText(doc, invoice.terms, notesBoxX + 12, notesContentY + 10, { width: notesBoxW - 16 });
            } else if (!invoice.notes) {
                doc.fontSize(8).fillColor(TEXT_MUTED);
                drawPdfText(doc, L.defaultTerms, notesBoxX + 12, notesContentY, { width: notesBoxW - 16 });
            }

            // Authorized Signature
            const sigY = totalsStartY + totalsH - 24;
            useFont(false);
            doc.fontSize(8).fillColor(TEXT_MUTED).text('Authorized Signature: _______________________', notesBoxX + 12, sigY);

            // 7. Official Footer
            const footerY = 780;
            doc.moveTo(45, footerY).lineTo(550, footerY).strokeColor(BORDER).stroke();
            useFont(true);
            doc.fontSize(8).fillColor(PRIMARY_DARK);
            drawPdfText(doc, `${L.thankYou} • شكراً لتعاملكم معنا`, 45, footerY + 8, { width: 505, align: 'center' });
            useFont(false);
            doc.fontSize(7.5).fillColor(TEXT_MUTED).text(
                `${tenant?.name || 'Hesaby ERP'} • ${L.officialDoc} • Page 1 of 1`,
                45, footerY + 22,
                { width: 505, align: 'center' }
            );

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

