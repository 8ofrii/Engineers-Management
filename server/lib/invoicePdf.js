// PDF generator for invoices. Uses pdfkit (pure-JS, no Chromium required).
// Returns a Buffer that controllers can either pipe to a response or attach
// to an email.

import PDFDocument from 'pdfkit';

const fmtMoney = (amount, currency = 'EGP') => {
    const num = Number(amount || 0);
    return `${num.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

const fmtDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-GB');
};

/**
 * Render an invoice to a PDF buffer.
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
            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const PRIMARY = '#2563eb';
            const TEXT = '#111827';
            const MUTED = '#6b7280';

            // Header — company name + invoice title
            doc.fillColor(TEXT).fontSize(20).text(tenant?.name || 'Company', 50, 50, { width: 300 });
            if (tenant?.address) doc.fontSize(9).fillColor(MUTED).text(tenant.address, 50, 75, { width: 300 });
            if (tenant?.email) doc.fontSize(9).fillColor(MUTED).text(tenant.email, 50, 88, { width: 300 });
            if (tenant?.phone) doc.fontSize(9).fillColor(MUTED).text(tenant.phone, 50, 101, { width: 300 });

            doc.fillColor(PRIMARY).fontSize(28).text('INVOICE', 400, 50, { align: 'right' });
            doc.fontSize(10).fillColor(TEXT).text(invoice.invoiceNumber, 400, 85, { align: 'right' });
            doc.fontSize(9).fillColor(MUTED)
                .text(`Issue date: ${fmtDate(invoice.issueDate)}`, 400, 105, { align: 'right' })
                .text(`Due date: ${fmtDate(invoice.dueDate)}`, 400, 119, { align: 'right' });

            // Bill-to + project box
            doc.moveTo(50, 150).lineTo(545, 150).strokeColor('#e5e7eb').stroke();

            doc.fillColor(MUTED).fontSize(9).text('BILL TO', 50, 165);
            doc.fillColor(TEXT).fontSize(11).text(client?.name || '-', 50, 180);
            if (client?.company) doc.fontSize(10).text(client.company, 50, 196);
            if (client?.email) doc.fontSize(9).fillColor(MUTED).text(client.email, 50, 212);
            if (client?.phone) doc.fontSize(9).fillColor(MUTED).text(client.phone, 50, 226);

            if (project) {
                doc.fillColor(MUTED).fontSize(9).text('PROJECT', 320, 165);
                doc.fillColor(TEXT).fontSize(11).text(project.name, 320, 180, { width: 225 });
                if (project.location) doc.fontSize(9).fillColor(MUTED).text(project.location, 320, 200, { width: 225 });
            }

            // Status badge top-right area
            const statusY = 245;
            const statusColor = {
                DRAFT: '#9ca3af',
                SENT: '#2563eb',
                PARTIALLY_PAID: '#f59e0b',
                PAID: '#10b981',
                OVERDUE: '#ef4444',
                CANCELLED: '#6b7280'
            }[invoice.status] || '#6b7280';
            doc.roundedRect(450, statusY, 95, 22, 4).fillColor(statusColor).fill();
            doc.fillColor('#ffffff').fontSize(11).text(invoice.status, 450, statusY + 6, { width: 95, align: 'center' });

            // Line items table
            const tableTop = 290;
            doc.moveTo(50, tableTop - 5).lineTo(545, tableTop - 5).strokeColor('#e5e7eb').stroke();
            doc.fillColor(MUTED).fontSize(9)
                .text('DESCRIPTION', 50, tableTop)
                .text('QTY', 320, tableTop, { width: 50, align: 'right' })
                .text('UNIT PRICE', 380, tableTop, { width: 70, align: 'right' })
                .text('TOTAL', 460, tableTop, { width: 85, align: 'right' });
            doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).strokeColor('#e5e7eb').stroke();

            let y = tableTop + 22;
            const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
            for (const item of items) {
                if (y > 720) { doc.addPage(); y = 50; }
                doc.fillColor(TEXT).fontSize(10).text(item.description || '-', 50, y, { width: 260 });
                doc.text(String(item.quantity ?? '-'), 320, y, { width: 50, align: 'right' });
                doc.text(fmtMoney(item.unitPrice, invoice.currency), 380, y, { width: 70, align: 'right' });
                doc.text(fmtMoney(item.total, invoice.currency), 460, y, { width: 85, align: 'right' });
                y += 22;
            }

            // Totals box, right-aligned
            y = Math.max(y + 10, 540);
            const totalsX = 350;
            doc.moveTo(totalsX, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
            y += 8;

            const writeTotal = (label, value, bold = false) => {
                doc.fontSize(bold ? 12 : 10).fillColor(bold ? TEXT : MUTED);
                doc.text(label, totalsX, y, { width: 110 });
                doc.fillColor(TEXT).text(fmtMoney(value, invoice.currency), totalsX + 110, y, { width: 85, align: 'right' });
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
                y = Math.max(y + 30, 700);
                if (invoice.notes) {
                    doc.fontSize(9).fillColor(MUTED).text('NOTES', 50, y);
                    doc.fontSize(10).fillColor(TEXT).text(invoice.notes, 50, y + 14, { width: 495 });
                    y += 14 + doc.heightOfString(invoice.notes, { width: 495 }) + 10;
                }
                if (invoice.terms) {
                    doc.fontSize(9).fillColor(MUTED).text('TERMS', 50, y);
                    doc.fontSize(10).fillColor(TEXT).text(invoice.terms, 50, y + 14, { width: 495 });
                }
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};
