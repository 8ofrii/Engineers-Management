// PDF generator for invoices. Uses pdfkit with full Arabic (RTL) and Unicode support.
// Returns a Buffer that controllers can either pipe to a response or attach to an email.

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupDocFonts, formatPdfText, isArabic } from './arabicPdfHelper.js';

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
        // 1. Remote HTTP/HTTPS URL
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

        // 2. Local relative path (e.g. /uploads/images/xyz.png)
        const cleanPath = logoPath.replace(/^\//, '');
        const candidatePaths = [
            path.join(rootDir, cleanPath),
            path.join(rootDir, 'uploads', 'images', path.basename(cleanPath)),
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
 * Render an invoice to a PDF buffer with executive styling, company branding,
 * and full Arabic / Bilingual support.
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

            // Palette — Modern Executive Slate & Gold/Amber theme
            const PRIMARY_DARK = '#0f172a'; // Deep Slate Navy
            const PRIMARY = '#1e293b';      // Slate Card Header
            const ACCENT_GOLD = '#f59e0b';  // Warm Amber / Gold
            const SUCCESS = '#10b981';      // Emerald Green
            const DANGER = '#ef4444';       // Coral Red
            const TEXT = '#0f172a';         // Slate Dark
            const TEXT_MUTED = '#64748b';   // Secondary Muted
            const CARD_BG = '#f8fafc';      // Soft fill
            const BORDER = '#e2e8f0';       // Border line

            const useFont = (bold = false) => {
                try {
                    doc.font(bold ? 'AppFont-Bold' : 'AppFont');
                } catch {
                    // Fallback
                }
            };

            // 1. Top Decorative Accent Banner
            doc.rect(45, 22, 505, 5).fillColor(PRIMARY_DARK).fill();
            doc.rect(45, 27, 160, 2).fillColor(ACCENT_GOLD).fill();

            // 2. Resolve & Render Logo / Monogram (Top-Left)
            const logoBuffer = await resolveLogoBuffer(tenant?.logo);
            let imageRendered = false;
            if (logoBuffer) {
                try {
                    doc.image(logoBuffer, 45, 38, { fit: [130, 48], align: 'left' });
                    imageRendered = true;
                } catch (imgErr) {
                    imageRendered = false;
                }
            }

            if (!imageRendered) {
                // Render elegant vector monogram emblem
                doc.roundedRect(45, 38, 44, 44, 8).fillColor(PRIMARY_DARK).fill();
                doc.roundedRect(45, 38, 44, 44, 8).lineWidth(1.5).strokeColor(ACCENT_GOLD).stroke();
                useFont(true);
                const initial = (tenant?.name || 'H').trim().charAt(0).toUpperCase();
                doc.fillColor(ACCENT_GOLD).fontSize(20).text(initial, 45, 50, { width: 44, align: 'center' });
            }

            // Company info block (beside or below emblem)
            const companyX = imageRendered ? 185 : 98;
            const companyY = 40;
            const companyWidth = imageRendered ? 170 : 255;
            const isArCompany = isArabic(tenant?.name);
            const companyTitle = formatPdfText(tenant?.name || 'Hesaby Construction ERP', doc, companyWidth);

            useFont(true);
            doc.fillColor(TEXT).fontSize(14).text(companyTitle, companyX, companyY, {
                width: companyWidth,
                align: isArCompany ? 'right' : 'left'
            });

            useFont(false);
            let currentCompanyY = companyY + doc.heightOfString(companyTitle, { width: companyWidth }) + 4;

            if (tenant?.address) {
                const isArAddr = isArabic(tenant.address);
                doc.fontSize(8.5).fillColor(TEXT_MUTED).text(formatPdfText(tenant.address, doc, companyWidth), companyX, currentCompanyY, {
                    width: companyWidth,
                    align: isArAddr ? 'right' : 'left'
                });
                currentCompanyY += 12;
            }
            if (tenant?.email) {
                doc.fontSize(8.5).fillColor(TEXT_MUTED).text(tenant.email, companyX, currentCompanyY, { width: companyWidth });
                currentCompanyY += 12;
            }
            if (tenant?.phone) {
                doc.fontSize(8.5).fillColor(TEXT_MUTED).text(tenant.phone, companyX, currentCompanyY, { width: companyWidth });
            }

            // 3. Document Meta (Top-Right)
            useFont(true);
            doc.fillColor(PRIMARY_DARK).fontSize(24).text('INVOICE', 370, 38, { align: 'right', width: 180 });
            doc.fillColor(ACCENT_GOLD).fontSize(11).text(formatPdfText('فاتورة مبيعات', doc, 180), 370, 64, { align: 'right', width: 180 });

            // Status Badge
            const statusColor = {
                DRAFT: '#64748b',
                SENT: '#0284c7',
                PARTIALLY_PAID: '#f59e0b',
                PAID: '#10b981',
                OVERDUE: '#ef4444',
                CANCELLED: '#94a3b8'
            }[invoice.status] || '#64748b';

            const badgeWidth = 90;
            const badgeHeight = 20;
            const badgeX = 460;
            const badgeY = 80;
            doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 4).fillColor(statusColor).fill();
            useFont(true);
            doc.fillColor('#ffffff').fontSize(8.5).text(invoice.status.replace(/_/g, ' '), badgeX, badgeY + 5, {
                width: badgeWidth,
                align: 'center'
            });

            useFont(true);
            doc.fontSize(10).fillColor(TEXT).text(invoice.invoiceNumber, 370, 106, { align: 'right', width: 180 });
            useFont(false);
            doc.fontSize(8.5).fillColor(TEXT_MUTED)
                .text(`Issue date: ${fmtDate(invoice.issueDate)}`, 370, 120, { align: 'right', width: 180 })
                .text(`Due date: ${fmtDate(invoice.dueDate)}`, 370, 133, { align: 'right', width: 180 });

            // 4. Dual Cards for Bill-To and Project Details
            const cardY = 156;
            const cardH = 88;
            const cardW = 246;

            // Card 1: Bill To
            doc.roundedRect(45, cardY, cardW, cardH, 6).fillColor(CARD_BG).fill();
            doc.roundedRect(45, cardY, cardW, cardH, 6).lineWidth(1).strokeColor(BORDER).stroke();

            useFont(true);
            doc.fillColor(ACCENT_GOLD).fontSize(8).text('BILL TO / العميل', 57, cardY + 10, { width: cardW - 24 });
            const isArClient = isArabic(client?.name);
            doc.fillColor(TEXT).fontSize(11).text(formatPdfText(client?.name || '-', doc, cardW - 24), 57, cardY + 24, {
                width: cardW - 24,
                align: isArClient ? 'right' : 'left'
            });

            useFont(false);
            let clientSubY = cardY + 40;
            if (client?.company) {
                const isArClientCo = isArabic(client.company);
                doc.fontSize(9.5).fillColor(PRIMARY).text(formatPdfText(client.company, doc, cardW - 24), 57, clientSubY, {
                    width: cardW - 24,
                    align: isArClientCo ? 'right' : 'left'
                });
                clientSubY += 14;
            }
            if (client?.email) {
                doc.fontSize(8.5).fillColor(TEXT_MUTED).text(client.email, 57, clientSubY, { width: cardW - 24 });
                clientSubY += 13;
            }
            if (client?.phone) {
                doc.fontSize(8.5).fillColor(TEXT_MUTED).text(client.phone, 57, clientSubY, { width: cardW - 24 });
            }

            // Card 2: Project Details
            const projCardX = 304;
            doc.roundedRect(projCardX, cardY, cardW, cardH, 6).fillColor(CARD_BG).fill();
            doc.roundedRect(projCardX, cardY, cardW, cardH, 6).lineWidth(1).strokeColor(BORDER).stroke();

            useFont(true);
            doc.fillColor(ACCENT_GOLD).fontSize(8).text('PROJECT / بيانات المشروع', projCardX + 12, cardY + 10, { width: cardW - 24 });
            if (project) {
                const isArProj = isArabic(project.name);
                doc.fillColor(TEXT).fontSize(11).text(formatPdfText(project.name, doc, cardW - 24), projCardX + 12, cardY + 24, {
                    width: cardW - 24,
                    align: isArProj ? 'right' : 'left'
                });
                useFont(false);
                let projSubY = cardY + 40;
                if (project.location) {
                    const isArLoc = isArabic(project.location);
                    doc.fontSize(9).fillColor(TEXT_MUTED).text(formatPdfText(project.location, doc, cardW - 24), projCardX + 12, projSubY, {
                        width: cardW - 24,
                        align: isArLoc ? 'right' : 'left'
                    });
                    projSubY += 14;
                }
                if (project.code) {
                    doc.fontSize(8.5).fillColor(TEXT_MUTED).text(`Code: ${project.code}`, projCardX + 12, projSubY, { width: cardW - 24 });
                }
            } else {
                useFont(false);
                doc.fillColor(TEXT_MUTED).fontSize(9.5).text('General Services / خدمات عامة', projCardX + 12, cardY + 28);
            }

            // 5. Line Items Table
            const tableTop = 260;
            // Header Bar
            doc.roundedRect(45, tableTop, 505, 24, 4).fillColor(PRIMARY_DARK).fill();
            useFont(true);
            doc.fillColor('#ffffff').fontSize(8.5)
                .text('DESCRIPTION / البيان', 55, tableTop + 7, { width: 235 })
                .text('QTY / الكمية', 295, tableTop + 7, { width: 45, align: 'right' })
                .text('UNIT PRICE / سعر الوحدة', 345, tableTop + 7, { width: 95, align: 'right' })
                .text('TOTAL / الإجمالي', 445, tableTop + 7, { width: 95, align: 'right' });

            let y = tableTop + 27;
            const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
            useFont(false);

            items.forEach((item, idx) => {
                if (y > 690) {
                    doc.addPage();
                    y = 50;
                    // Draw mini header on next page
                    doc.roundedRect(45, y, 505, 20, 4).fillColor(PRIMARY_DARK).fill();
                    useFont(true);
                    doc.fillColor('#ffffff').fontSize(8)
                        .text('DESCRIPTION', 55, y + 6, { width: 235 })
                        .text('QTY', 295, y + 6, { width: 45, align: 'right' })
                        .text('UNIT PRICE', 345, y + 6, { width: 95, align: 'right' })
                        .text('TOTAL', 445, y + 6, { width: 95, align: 'right' });
                    y += 24;
                    useFont(false);
                }

                const isArDesc = isArabic(item.description);
                const formattedDesc = formatPdfText(item.description || '-', doc, 235);
                const descHeight = doc.heightOfString(formattedDesc, { width: 235 });
                const rowHeight = Math.max(24, descHeight + 10);

                // Alternating zebra row background
                if (idx % 2 === 1) {
                    doc.rect(45, y - 2, 505, rowHeight).fillColor(CARD_BG).fill();
                }

                doc.fillColor(TEXT).fontSize(9.5).text(formattedDesc, 55, y + 3, {
                    width: 235,
                    align: isArDesc ? 'right' : 'left'
                });
                doc.fontSize(9.5).text(String(item.quantity ?? '-'), 295, y + 3, { width: 45, align: 'right' });
                doc.text(fmtMoney(item.unitPrice, invoice.currency), 345, y + 3, { width: 95, align: 'right' });
                useFont(true);
                doc.text(fmtMoney(item.total, invoice.currency), 445, y + 3, { width: 95, align: 'right' });
                useFont(false);

                // Row bottom separator line
                doc.moveTo(45, y + rowHeight - 2).lineTo(550, y + rowHeight - 2).strokeColor('#f1f5f9').stroke();
                y += rowHeight;
            });

            // 6. Summary Totals Card (Right) & Notes/Terms Card (Left)
            y = Math.max(y + 14, 520);
            if (y > 670) {
                doc.addPage();
                y = 50;
            }

            const totalsBoxX = 315;
            const totalsBoxW = 235;
            const totalsStartY = y;

            // Totals Box Container
            doc.roundedRect(totalsBoxX, totalsStartY, totalsBoxW, 140, 6).fillColor(CARD_BG).fill();
            doc.roundedRect(totalsBoxX, totalsStartY, totalsBoxW, 140, 6).lineWidth(1).strokeColor(BORDER).stroke();

            let totalLineY = totalsStartY + 10;
            const writeTotalRow = (label, value, isBold = false, valColor = TEXT) => {
                useFont(isBold);
                doc.fontSize(isBold ? 10.5 : 9).fillColor(isBold ? TEXT : TEXT_MUTED);
                doc.text(label, totalsBoxX + 12, totalLineY, { width: 110 });
                doc.fillColor(valColor).text(fmtMoney(value, invoice.currency), totalsBoxX + 120, totalLineY, {
                    width: totalsBoxW - 132,
                    align: 'right'
                });
                totalLineY += isBold ? 20 : 17;
            };

            writeTotalRow('Subtotal / المجموع الفرعي', invoice.subtotal);
            if (Number(invoice.discountAmount || 0) > 0) {
                writeTotalRow('Discount / الخصم', -Number(invoice.discountAmount), false, DANGER);
            }
            if (Number(invoice.taxAmount || 0) > 0) {
                writeTotalRow(`Tax / الضريبة (${invoice.taxRate}%)`, invoice.taxAmount);
            }

            // TOTAL DUE Highlight Banner
            const dueBannerH = 28;
            doc.roundedRect(totalsBoxX + 8, totalLineY, totalsBoxW - 16, dueBannerH, 4).fillColor(PRIMARY_DARK).fill();
            useFont(true);
            doc.fillColor('#ffffff').fontSize(10).text('TOTAL DUE / الإجمالي المستحق', totalsBoxX + 16, totalLineY + 8, { width: 110 });
            doc.fillColor(ACCENT_GOLD).fontSize(11).text(fmtMoney(invoice.totalAmount, invoice.currency), totalsBoxX + 120, totalLineY + 8, {
                width: totalsBoxW - 136,
                align: 'right'
            });
            totalLineY += dueBannerH + 10;

            if (Number(invoice.paidAmount || 0) > 0) {
                writeTotalRow('Paid / المسدد', invoice.paidAmount, false, SUCCESS);
                const balance = Number(invoice.totalAmount) - Number(invoice.paidAmount);
                writeTotalRow('Balance / المتبقي', balance, true, balance > 0 ? ACCENT_GOLD : SUCCESS);
            }

            // Notes / Terms / Bank Details (Left Card)
            const notesBoxX = 45;
            const notesBoxW = 255;
            doc.roundedRect(notesBoxX, totalsStartY, notesBoxW, 140, 6).fillColor(CARD_BG).fill();
            doc.roundedRect(notesBoxX, totalsStartY, notesBoxW, 140, 6).lineWidth(1).strokeColor(BORDER).stroke();

            useFont(true);
            doc.fillColor(PRIMARY).fontSize(8.5).text('PAYMENT INSTRUCTIONS & NOTES / ملاحظات الفاتورة', notesBoxX + 12, totalsStartY + 10, { width: notesBoxW - 24 });
            useFont(false);

            let notesContentY = totalsStartY + 26;
            if (invoice.notes) {
                const isArNotes = isArabic(invoice.notes);
                const formattedNotes = formatPdfText(invoice.notes, doc, notesBoxW - 24);
                doc.fontSize(8.5).fillColor(TEXT).text(formattedNotes, notesBoxX + 12, notesContentY, {
                    width: notesBoxW - 24,
                    align: isArNotes ? 'right' : 'left'
                });
                notesContentY += doc.heightOfString(formattedNotes, { width: notesBoxW - 24 }) + 8;
            }
            if (invoice.terms) {
                useFont(true);
                doc.fontSize(8).fillColor(TEXT_MUTED).text('TERMS & CONDITIONS:', notesBoxX + 12, notesContentY, { width: notesBoxW - 24 });
                useFont(false);
                const isArTerms = isArabic(invoice.terms);
                const formattedTerms = formatPdfText(invoice.terms, doc, notesBoxW - 24);
                doc.fontSize(8.5).fillColor(TEXT).text(formattedTerms, notesBoxX + 12, notesContentY + 12, {
                    width: notesBoxW - 24,
                    align: isArTerms ? 'right' : 'left'
                });
            }

            // 7. Official Footer
            const footerY = 780;
            doc.moveTo(45, footerY).lineTo(550, footerY).strokeColor(BORDER).stroke();
            useFont(true);
            doc.fontSize(8.5).fillColor(PRIMARY_DARK).text(
                formatPdfText('شكراً لتعاملكم معنا — Thank you for your business', doc, 505),
                45, footerY + 8,
                { width: 505, align: 'center' }
            );
            useFont(false);
            doc.fontSize(7.5).fillColor(TEXT_MUTED).text(
                `${tenant?.name || 'Hesaby ERP'} • Official Invoice Document • Page 1 of 1`,
                45, footerY + 22,
                { width: 505, align: 'center' }
            );

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};
