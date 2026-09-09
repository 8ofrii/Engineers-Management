// PDF generator for invoices. Uses pdfkit with full Arabic (RTL) and Unicode support.
// Returns a Buffer that controllers can either pipe to a response or attach to an email.

import PDFDocument from 'pdfkit';
import { setupDocFonts, formatPdfText, isArabic } from './arabicPdfHelper.js';

const fmtMoney = (amount, currency = 'EGP') => {
    const num = Number(amount || 0);
    return `${num.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

const fmtDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-GB');
};

/**
 * Render an invoice to a PDF buffer with full Arabic / Bilingual support.
 *
 * @param {Object} ctx
 * @param {Object} ctx.invoice  Prisma Invoice record (with `lineItems` array)
 * @param {Object} ctx.client   Client record
 * @param {Object} ctx.tenant   Tenant record (provides company name + logo + address)
 * @param {Object} [ctx.project] Optional project record
 * @returns {Promise<Buffer>}
 */
export const generateInvoicePdf = ({ invoice, client, tenant, project }) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            setupDocFonts(doc);

            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const PRIMARY = '#2563eb';
            const TEXT = '#111827';
            const MUTED = '#6b7280';

            const useFont = (bold = false) => {
                try {
                    doc.font(bold ? 'AppFont-Bold' : 'AppFont');
                } catch {
                    // Fallback if font registration was skipped
                }
            };

            useFont(true);
            // Header — company name + invoice title
            const isArCompany = isArabic(tenant?.name);
            const companyTitle = formatPdfText(tenant?.name || 'Hesaby ERP', doc, 300);
            doc.fillColor(TEXT).fontSize(18).text(companyTitle, 50, 50, {
                width: 300,
                align: isArCompany ? 'right' : 'left'
            });

            useFont(false);
            if (tenant?.address) {
                const isArAddr = isArabic(tenant.address);
                doc.fontSize(9).fillColor(MUTED).text(formatPdfText(tenant.address, doc, 300), 50, 75, {
                    width: 300,
                    align: isArAddr ? 'right' : 'left'
                });
            }
            if (tenant?.email) doc.fontSize(9).fillColor(MUTED).text(tenant.email, 50, 88, { width: 300 });
            if (tenant?.phone) doc.fontSize(9).fillColor(MUTED).text(tenant.phone, 50, 101, { width: 300 });

            useFont(true);
            doc.fillColor(PRIMARY).fontSize(26).text('INVOICE', 400, 50, { align: 'right' });
            useFont(false);
            doc.fontSize(10).fillColor(TEXT).text(invoice.invoiceNumber, 400, 82, { align: 'right' });
            doc.fontSize(9).fillColor(MUTED)
                .text(`Issue date: ${fmtDate(invoice.issueDate)}`, 400, 98, { align: 'right' })
                .text(`Due date: ${fmtDate(invoice.dueDate)}`, 400, 112, { align: 'right' });

            // Bill-to + project box
            doc.moveTo(50, 140).lineTo(545, 140).strokeColor('#e5e7eb').stroke();

            useFont(true);
            doc.fillColor(MUTED).fontSize(9).text('BILL TO', 50, 155);
            const isArClient = isArabic(client?.name);
            doc.fillColor(TEXT).fontSize(11).text(formatPdfText(client?.name || '-', doc, 225), 50, 170, {
                width: 225,
                align: isArClient ? 'right' : 'left'
            });
            useFont(false);
            if (client?.company) {
                const isArClientCo = isArabic(client.company);
                doc.fontSize(10).fillColor(TEXT).text(formatPdfText(client.company, doc, 225), 50, 186, {
                    width: 225,
                    align: isArClientCo ? 'right' : 'left'
                });
            }
            if (client?.email) doc.fontSize(9).fillColor(MUTED).text(client.email, 50, 202);
            if (client?.phone) doc.fontSize(9).fillColor(MUTED).text(client.phone, 50, 216);

            if (project) {
                useFont(true);
                doc.fillColor(MUTED).fontSize(9).text('PROJECT', 320, 155);
                const isArProj = isArabic(project.name);
                doc.fillColor(TEXT).fontSize(11).text(formatPdfText(project.name, doc, 225), 320, 170, {
                    width: 225,
                    align: isArProj ? 'right' : 'left'
                });
                useFont(false);
                if (project.location) {
                    const isArLoc = isArabic(project.location);
                    doc.fontSize(9).fillColor(MUTED).text(formatPdfText(project.location, doc, 225), 320, 190, {
                        width: 225,
                        align: isArLoc ? 'right' : 'left'
                    });
                }
            }

            // Status badge top-right area
            const statusY = 235;
            const statusColor = {
                DRAFT: '#9ca3af',
                SENT: '#2563eb',
                PARTIALLY_PAID: '#f59e0b',
                PAID: '#10b981',
                OVERDUE: '#ef4444',
                CANCELLED: '#6b7280'
            }[invoice.status] || '#6b7280';
            doc.roundedRect(450, statusY, 95, 22, 4).fillColor(statusColor).fill();
            useFont(true);
            doc.fillColor('#ffffff').fontSize(10).text(invoice.status, 450, statusY + 6, { width: 95, align: 'center' });

            // Line items table
            const tableTop = 275;
            doc.moveTo(50, tableTop - 5).lineTo(545, tableTop - 5).strokeColor('#e5e7eb').stroke();
            doc.fillColor(MUTED).fontSize(9)
                .text('DESCRIPTION', 50, tableTop)
                .text('QTY', 300, tableTop, { width: 50, align: 'right' })
                .text('UNIT PRICE', 360, tableTop, { width: 85, align: 'right' })
                .text('TOTAL', 455, tableTop, { width: 90, align: 'right' });
            doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).strokeColor('#e5e7eb').stroke();

            let y = tableTop + 22;
            const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
            useFont(false);

            for (const item of items) {
                if (y > 700) { doc.addPage(); y = 50; }
                const isArDesc = isArabic(item.description);
                const formattedDesc = formatPdfText(item.description || '-', doc, 240);

                doc.fillColor(TEXT).fontSize(10).text(formattedDesc, 50, y, {
                    width: 240,
                    align: isArDesc ? 'right' : 'left'
                });
                doc.text(String(item.quantity ?? '-'), 300, y, { width: 50, align: 'right' });
                doc.text(fmtMoney(item.unitPrice, invoice.currency), 360, y, { width: 85, align: 'right' });
                doc.text(fmtMoney(item.total, invoice.currency), 455, y, { width: 90, align: 'right' });

                const descHeight = doc.heightOfString(formattedDesc, { width: 240 });
                y += Math.max(22, descHeight + 6);
            }

            // Totals box, right-aligned
            y = Math.max(y + 10, 530);
            const totalsX = 330;
            doc.moveTo(totalsX, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
            y += 8;

            const writeTotal = (label, value, bold = false) => {
                useFont(bold);
                doc.fontSize(bold ? 11 : 9.5).fillColor(bold ? TEXT : MUTED);
                doc.text(label, totalsX, y, { width: 110 });
                doc.fillColor(TEXT).text(fmtMoney(value, invoice.currency), totalsX + 110, y, { width: 105, align: 'right' });
                y += bold ? 18 : 16;
            };

            writeTotal('Subtotal', invoice.subtotal);
            if (Number(invoice.discountAmount || 0) > 0) {
                writeTotal('Discount', -Number(invoice.discountAmount));
            }
            if (Number(invoice.taxAmount || 0) > 0) {
                writeTotal(`Tax (${invoice.taxRate}%)`, invoice.taxAmount);
            }
            doc.moveTo(totalsX, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
            y += 6;
            writeTotal('TOTAL DUE', invoice.totalAmount, true);
            if (Number(invoice.paidAmount || 0) > 0) {
                writeTotal('Paid', invoice.paidAmount);
                writeTotal('Balance', Number(invoice.totalAmount) - Number(invoice.paidAmount), true);
            }

            // Notes + terms at the bottom
            if (invoice.notes || invoice.terms) {
                y = Math.max(y + 25, 680);
                if (invoice.notes) {
                    useFont(true);
                    doc.fontSize(9).fillColor(MUTED).text('NOTES', 50, y);
                    useFont(false);
                    const isArNotes = isArabic(invoice.notes);
                    const formattedNotes = formatPdfText(invoice.notes, doc, 495);
                    doc.fontSize(9.5).fillColor(TEXT).text(formattedNotes, 50, y + 14, {
                        width: 495,
                        align: isArNotes ? 'right' : 'left'
                    });
                    y += 14 + doc.heightOfString(formattedNotes, { width: 495 }) + 10;
                }
                if (invoice.terms) {
                    useFont(true);
                    doc.fontSize(9).fillColor(MUTED).text('TERMS', 50, y);
                    useFont(false);
                    const isArTerms = isArabic(invoice.terms);
                    const formattedTerms = formatPdfText(invoice.terms, doc, 495);
                    doc.fontSize(9.5).fillColor(TEXT).text(formattedTerms, 50, y + 14, {
                        width: 495,
                        align: isArTerms ? 'right' : 'left'
                    });
                }
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};
