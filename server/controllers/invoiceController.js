import prisma from '../lib/prisma.js';
import { auditFromReq } from '../lib/audit.js';
import { generateInvoicePdf } from '../lib/invoicePdf.js';
import sendEmail from '../utils/sendEmail.js';
import logger from '../lib/logger.js';

const D = (n) => Number(n || 0);

// Compute subtotal / tax / total from line items + tax/discount inputs.
const computeTotals = (lineItems, taxRate, discountAmount) => {
    const items = (lineItems || []).map(item => {
        const qty = D(item.quantity);
        const unitPrice = D(item.unitPrice);
        const total = D(item.total != null ? item.total : qty * unitPrice);
        return { ...item, quantity: qty, unitPrice, total };
    });
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const discount = D(discountAmount);
    const afterDiscount = Math.max(0, subtotal - discount);
    const tax = afterDiscount * (D(taxRate) / 100);
    const total = afterDiscount + tax;
    return { items, subtotal, discount, taxAmount: tax, total };
};

// Generate next invoice number for a tenant: INV-YYYY-NNNN (4-digit pad).
const nextInvoiceNumber = async (tenantId) => {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const last = await prisma.invoice.findFirst({
        where: { tenantId, invoiceNumber: { startsWith: prefix } },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true }
    });
    let nextNum = 1;
    if (last?.invoiceNumber) {
        const match = last.invoiceNumber.match(/-(\d+)$/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

const decimalsToNumbers = (inv) => ({
    ...inv,
    subtotal: D(inv.subtotal),
    taxRate: D(inv.taxRate),
    taxAmount: D(inv.taxAmount),
    discountAmount: D(inv.discountAmount),
    totalAmount: D(inv.totalAmount),
    paidAmount: D(inv.paidAmount)
});

// @desc    List invoices (filterable). Engineers see own; everyone else sees tenant.
// @route   GET /api/invoices?status=&clientId=&projectId=
// @access  Private
export const listInvoices = async (req, res, next) => {
    try {
        const { status, clientId, projectId } = req.query;
        const where = { tenantId: req.user.tenantId };
        if (status) where.status = String(status);
        if (clientId) where.clientId = String(clientId);
        if (projectId) where.projectId = String(projectId);
        if (req.user.role === 'ENGINEER') where.createdBy = req.user.id;

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                client: { select: { id: true, name: true, company: true, email: true } },
                project: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 200
        });

        res.status(200).json({
            success: true,
            count: invoices.length,
            data: invoices.map(decimalsToNumbers)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get a single invoice with line items.
// @route   GET /api/invoices/:id
// @access  Private (tenant member)
export const getInvoice = async (req, res, next) => {
    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: {
                client: true,
                project: { select: { id: true, name: true, location: true } },
                creator: { select: { id: true, name: true, email: true } }
            }
        });
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
        res.status(200).json({ success: true, data: decimalsToNumbers(invoice) });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a DRAFT invoice. Auto-generates invoice number.
// @route   POST /api/invoices
// @access  Private (PROJECT_MANAGER+; engineers can draft if they created the project)
export const createInvoice = async (req, res, next) => {
    try {
        const {
            clientId, projectId, dueDate, lineItems, taxRate = 0,
            discountAmount = 0, notes, terms, currency = 'EGP'
        } = req.body;

        // Confirm client belongs to tenant
        const client = await prisma.client.findFirst({
            where: { id: clientId, tenantId: req.user.tenantId, deletedAt: null }
        });
        if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

        if (projectId) {
            const project = await prisma.project.findFirst({
                where: { id: projectId, tenantId: req.user.tenantId, deletedAt: null }
            });
            if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const totals = computeTotals(lineItems, taxRate, discountAmount);
        if (totals.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Invoice must have at least one line item' });
        }

        const invoiceNumber = await nextInvoiceNumber(req.user.tenantId);

        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                tenantId: req.user.tenantId,
                clientId,
                projectId: projectId || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                lineItems: totals.items,
                subtotal: totals.subtotal,
                taxRate: D(taxRate),
                taxAmount: totals.taxAmount,
                discountAmount: totals.discount,
                totalAmount: totals.total,
                paidAmount: 0,
                currency,
                notes: notes || null,
                terms: terms || null,
                status: 'DRAFT',
                createdBy: req.user.id
            }
        });

        await auditFromReq(req, {
            action: 'CREATE',
            entity: 'Invoice',
            entityId: invoice.id,
            after: { invoiceNumber, clientId, projectId, totalAmount: invoice.totalAmount, status: 'DRAFT' }
        });

        res.status(201).json({ success: true, data: decimalsToNumbers(invoice) });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a DRAFT invoice. Sent/paid invoices are locked.
// @route   PUT /api/invoices/:id
// @access  Private (creator + admin/manager)
export const updateInvoice = async (req, res, next) => {
    try {
        const before = await prisma.invoice.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId }
        });
        if (!before) return res.status(404).json({ success: false, message: 'Invoice not found' });
        if (before.status !== 'DRAFT') {
            return res.status(400).json({ success: false, message: `Cannot edit a ${before.status} invoice` });
        }

        const {
            clientId, projectId, dueDate, lineItems, taxRate, discountAmount,
            notes, terms, currency
        } = req.body;

        const data = {};
        if (clientId !== undefined) data.clientId = clientId;
        if (projectId !== undefined) data.projectId = projectId || null;
        if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
        if (notes !== undefined) data.notes = notes;
        if (terms !== undefined) data.terms = terms;
        if (currency !== undefined) data.currency = currency;

        // Recompute totals if line items / tax / discount changed
        if (lineItems !== undefined || taxRate !== undefined || discountAmount !== undefined) {
            const items = lineItems !== undefined ? lineItems : before.lineItems;
            const tr = taxRate !== undefined ? taxRate : before.taxRate;
            const da = discountAmount !== undefined ? discountAmount : before.discountAmount;
            const totals = computeTotals(items, tr, da);
            data.lineItems = totals.items;
            data.subtotal = totals.subtotal;
            data.taxRate = D(tr);
            data.taxAmount = totals.taxAmount;
            data.discountAmount = totals.discount;
            data.totalAmount = totals.total;
        }

        const updated = await prisma.invoice.update({ where: { id: req.params.id }, data });

        await auditFromReq(req, {
            action: 'UPDATE',
            entity: 'Invoice',
            entityId: updated.id,
            before: { totalAmount: before.totalAmount, status: before.status },
            after: { totalAmount: updated.totalAmount, status: updated.status }
        });

        res.status(200).json({ success: true, data: decimalsToNumbers(updated) });
    } catch (error) {
        next(error);
    }
};

// @desc    Generate + return PDF for an invoice.
// @route   GET /api/invoices/:id/pdf
// @access  Private (tenant member)
export const getInvoicePdf = async (req, res, next) => {
    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: { client: true, project: true }
        });
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

        const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });

        let companyName = tenant?.name;
        if (!companyName || companyName === 'Demo Construction Co.') {
            if (req.user?.company && req.user.company !== 'Demo Construction Co.') {
                companyName = req.user.company;
            }
        }
        companyName = companyName || req.user?.company || 'Hesaby ERP';

        const buffer = await generateInvoicePdf({
            invoice: { ...invoice, lineItems: invoice.lineItems || [] },
            client: invoice.client,
            tenant: {
                ...tenant,
                name: companyName,
                email: tenant?.email || req.user?.email || '',
                phone: tenant?.phone || req.user?.phone || '',
                address: tenant?.address || ''
            },
            project: invoice.project
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

// @desc    Send invoice via email (with PDF attachment) and flip status to SENT.
// @route   POST /api/invoices/:id/send
// @access  Private (creator + manager/admin)
//
// Body: { to?: string, message?: string }
// `to` defaults to client.email if not provided.
export const sendInvoice = async (req, res, next) => {
    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: { client: true, project: true }
        });
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
        if (invoice.status === 'CANCELLED') {
            return res.status(400).json({ success: false, message: 'Cannot send a cancelled invoice' });
        }

        const recipient = req.body?.to || invoice.client?.email;
        if (!recipient) {
            return res.status(400).json({ success: false, message: 'No recipient email; provide `to` in body or set client email' });
        }

        const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });

        // Resolve personalized company name & sender details
        let companyName = tenant?.name;
        if (!companyName || companyName === 'Demo Construction Co.') {
            if (req.user?.company && req.user.company !== 'Demo Construction Co.') {
                companyName = req.user.company;
            }
        }
        companyName = companyName || req.user?.company || 'Hesaby ERP';

        const companyEmail = tenant?.email || req.user?.email || '';
        const companyPhone = tenant?.phone || req.user?.phone || '';
        const companyAddress = tenant?.address || '';
        const senderName = req.user?.name || 'Hesaby Representative';
        const senderRole = (req.user?.role || 'PROJECT_MANAGER').replace(/_/g, ' ');

        const buffer = await generateInvoicePdf({
            invoice: { ...invoice, lineItems: invoice.lineItems || [] },
            client: invoice.client,
            tenant: { ...tenant, name: companyName, email: companyEmail, phone: companyPhone, address: companyAddress },
            project: invoice.project
        });

        const customMessage = req.body?.message;
        const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
        const fmtCurrency = (val) => Number(val || 0).toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const issueDateStr = invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('en-GB') : '-';
        const dueDateStr = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : '-';

        const lineItemsRows = lineItems.map((item, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 12px 16px; font-size: 14px; color: #1e293b; font-weight: 500;">
                    ${item.description || 'Item'}
                </td>
                <td style="padding: 12px 16px; font-size: 14px; color: #475569; text-align: center;">
                    ${item.quantity || 1}
                </td>
                <td style="padding: 12px 16px; font-size: 14px; color: #475569; text-align: right;">
                    ${fmtCurrency(item.unitPrice)} ${invoice.currency}
                </td>
                <td style="padding: 12px 16px; font-size: 14px; color: #0f172a; font-weight: 700; text-align: right;">
                    ${fmtCurrency(item.total || (item.quantity * item.unitPrice))} ${invoice.currency}
                </td>
            </tr>
        `).join('');

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 640px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 32px 36px; color: #ffffff;">
                            <table width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #38bdf8;">
                                            ${companyName}
                                        </div>
                                        <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
                                            ${companyEmail ? `${companyEmail}` : ''} ${companyPhone ? `• ${companyPhone}` : ''}
                                        </div>
                                    </td>
                                    <td align="right">
                                        <div style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 6px 14px; display: inline-block;">
                                            <span style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px;">TAX INVOICE</span>
                                            <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-top: 2px;">#${invoice.invoiceNumber}</div>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 32px 36px;">
                            <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                                Dear <strong>${invoice.client?.name || 'Valued Customer'}</strong>,
                            </p>
                            <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                                ${customMessage || `Thank you for your business. Please find below the invoice summary for <strong>${invoice.project?.name || 'your project'}</strong>, issued by <strong>${companyName}</strong>.`}
                            </p>

                            <!-- Meta Details Cards -->
                            <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 18px 20px;">
                                <tr>
                                    <td width="50%" style="vertical-align: top; padding-right: 12px;">
                                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Billed To</div>
                                        <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 4px;">${invoice.client?.name || '-'}</div>
                                        ${invoice.client?.company ? `<div style="font-size: 13px; color: #475569; margin-top: 2px;">${invoice.client.company}</div>` : ''}
                                        ${invoice.client?.email ? `<div style="font-size: 13px; color: #64748b; margin-top: 2px;">${invoice.client.email}</div>` : ''}
                                    </td>
                                    <td width="50%" style="vertical-align: top; padding-left: 12px; border-left: 1px solid #e2e8f0;">
                                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Details</div>
                                        <div style="font-size: 13px; color: #334155; margin-top: 4px;"><strong>Issue Date:</strong> ${issueDateStr}</div>
                                        <div style="font-size: 13px; color: #334155; margin-top: 2px;"><strong>Due Date:</strong> ${dueDateStr}</div>
                                        ${invoice.project?.name ? `<div style="font-size: 13px; color: #334155; margin-top: 2px;"><strong>Project:</strong> ${invoice.project.name}</div>` : ''}
                                    </td>
                                </tr>
                            </table>

                            <!-- Line Items Table -->
                            <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 10px;">Itemized Breakdown</div>
                            <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                                <thead>
                                    <tr style="background-color: #0f172a; color: #ffffff;">
                                        <th style="padding: 10px 16px; font-size: 12px; text-align: left; font-weight: 600; text-transform: uppercase;">Description</th>
                                        <th style="padding: 10px 16px; font-size: 12px; text-align: center; font-weight: 600; text-transform: uppercase;">Qty</th>
                                        <th style="padding: 10px 16px; font-size: 12px; text-align: right; font-weight: 600; text-transform: uppercase;">Unit Price</th>
                                        <th style="padding: 10px 16px; font-size: 12px; text-align: right; font-weight: 600; text-transform: uppercase;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${lineItemsRows}
                                </tbody>
                            </table>

                            <!-- Summary & Totals -->
                            <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                                <tr>
                                    <td width="45%" style="vertical-align: top; padding-right: 16px;">
                                        <!-- PDF Attachment Callout -->
                                        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 16px;">
                                            <div style="font-size: 13px; font-weight: 700; color: #1d4ed8; display: flex; align-items: center;">
                                                📎 Official PDF Attached
                                            </div>
                                            <div style="font-size: 12px; color: #3b82f6; margin-top: 4px; line-height: 1.4;">
                                                A printable PDF copy (<strong>${invoice.invoiceNumber}.pdf</strong>) is attached to this email for your accounting records.
                                            </div>
                                        </div>
                                    </td>
                                    <td width="55%" style="vertical-align: top;">
                                        <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; padding: 14px 18px;">
                                            <tr>
                                                <td style="font-size: 13px; color: #64748b; padding-bottom: 6px;">Subtotal</td>
                                                <td align="right" style="font-size: 13px; color: #0f172a; font-weight: 600; padding-bottom: 6px;">
                                                    ${fmtCurrency(invoice.subtotal)} ${invoice.currency}
                                                </td>
                                            </tr>
                                            ${Number(invoice.discountAmount) > 0 ? `
                                            <tr>
                                                <td style="font-size: 13px; color: #dc2626; padding-bottom: 6px;">Discount</td>
                                                <td align="right" style="font-size: 13px; color: #dc2626; font-weight: 600; padding-bottom: 6px;">
                                                    -${fmtCurrency(invoice.discountAmount)} ${invoice.currency}
                                                </td>
                                            </tr>` : ''}
                                            <tr>
                                                <td style="font-size: 13px; color: #64748b; padding-bottom: 8px;">VAT / Tax (${invoice.taxRate}%)</td>
                                                <td align="right" style="font-size: 13px; color: #0f172a; font-weight: 600; padding-bottom: 8px;">
                                                    ${fmtCurrency(invoice.taxAmount)} ${invoice.currency}
                                                </td>
                                            </tr>
                                            <tr style="border-top: 2px solid #cbd5e1;">
                                                <td style="font-size: 15px; font-weight: 800; color: #0f172a; padding-top: 8px;">TOTAL DUE</td>
                                                <td align="right" style="font-size: 18px; font-weight: 800; color: #0284c7; padding-top: 8px;">
                                                    ${fmtCurrency(invoice.totalAmount)} ${invoice.currency}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Issued By Card -->
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
                                <table width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td>
                                            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Issued By</div>
                                            <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${senderName}</div>
                                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${senderRole} • ${companyName}</div>
                                        </td>
                                        <td align="right" style="vertical-align: middle;">
                                            ${companyEmail ? `<div style="font-size: 12px; color: #0284c7; font-weight: 600;">${companyEmail}</div>` : ''}
                                            ${companyPhone ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${companyPhone}</div>` : ''}
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            ${invoice.notes ? `
                            <div style="background-color: #fafafa; border-left: 4px solid #0284c7; padding: 12px 16px; margin-bottom: 18px; border-radius: 4px;">
                                <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Notes</div>
                                <div style="font-size: 13px; color: #334155; margin-top: 4px; white-space: pre-wrap;">${invoice.notes}</div>
                            </div>` : ''}

                            ${invoice.terms ? `
                            <div style="font-size: 12px; color: #64748b; margin-top: 16px; line-height: 1.5; border-top: 1px dashed #e2e8f0; padding-top: 12px;">
                                <strong>Payment Terms:</strong> ${invoice.terms}
                            </div>` : ''}

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 36px; text-align: center;">
                            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">
                                ${companyName}
                            </div>
                            ${companyAddress || companyEmail || companyPhone ? `
                            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                                ${[companyAddress, companyEmail, companyPhone].filter(Boolean).join(' • ')}
                            </div>` : ''}
                            <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                                Generated & delivered securely via Hesaby Construction & Engineering ERP
                            </div>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        try {
            await sendEmail({
                email: recipient,
                subject: `Invoice #${invoice.invoiceNumber} from ${companyName}${invoice.project?.name ? ` - ${invoice.project.name}` : ''}`,
                message: html,
                attachments: [{
                    filename: `${invoice.invoiceNumber}.pdf`,
                    content: buffer,
                    contentType: 'application/pdf'
                }]
            });
        } catch (emailErr) {
            logger.error({ err: emailErr }, 'Invoice email send failed');
            return res.status(502).json({ success: false, message: 'Failed to send email; verify SMTP settings.' });
        }

        const updated = await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status,
                sentAt: new Date(),
                sentToEmail: recipient
            }
        });

        await auditFromReq(req, {
            action: 'SEND',
            entity: 'Invoice',
            entityId: invoice.id,
            metadata: { to: recipient, total: Number(invoice.totalAmount) }
        });

        res.status(200).json({ success: true, data: decimalsToNumbers(updated), message: `Sent to ${recipient}` });
    } catch (error) {
        next(error);
    }
};

// @desc    Record a (partial or full) payment.
// @route   POST /api/invoices/:id/payment
// @access  Private (manager/admin/accountant)
//
// Body: { amount: number, paidAt?: ISO date }
export const recordPayment = async (req, res, next) => {
    try {
        if (!['PROJECT_MANAGER', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const invoice = await prisma.invoice.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId }
        });
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
        if (invoice.status === 'CANCELLED') {
            return res.status(400).json({ success: false, message: 'Cannot record payment on a cancelled invoice' });
        }

        const amount = D(req.body?.amount);
        if (amount <= 0) return res.status(400).json({ success: false, message: 'Amount must be positive' });

        const newPaid = D(invoice.paidAmount) + amount;
        const total = D(invoice.totalAmount);
        if (newPaid > total + 0.01) {
            return res.status(400).json({ success: false, message: `Payment exceeds total. Outstanding: ${total - D(invoice.paidAmount)}` });
        }

        const newStatus = newPaid >= total - 0.01 ? 'PAID' : 'PARTIALLY_PAID';
        const updated = await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                paidAmount: newPaid,
                status: newStatus,
                paidAt: newStatus === 'PAID' ? new Date(req.body?.paidAt || Date.now()) : invoice.paidAt
            }
        });

        await auditFromReq(req, {
            action: 'PAYMENT',
            entity: 'Invoice',
            entityId: invoice.id,
            metadata: {
                amount,
                paidAmountAfter: newPaid,
                totalAmount: total,
                statusAfter: newStatus
            }
        });

        res.status(200).json({ success: true, data: decimalsToNumbers(updated) });
    } catch (error) {
        next(error);
    }
};

// @desc    Cancel an invoice (status → CANCELLED). Doesn't delete; preserves audit.
// @route   PUT /api/invoices/:id/cancel
// @access  Private (manager/admin)
export const cancelInvoice = async (req, res, next) => {
    try {
        if (!['PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const invoice = await prisma.invoice.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId }
        });
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
        if (invoice.status === 'PAID') {
            return res.status(400).json({ success: false, message: 'Cannot cancel a paid invoice; create a credit note instead.' });
        }

        const updated = await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'CANCELLED' }
        });

        await auditFromReq(req, {
            action: 'CANCEL',
            entity: 'Invoice',
            entityId: invoice.id,
            metadata: { previousStatus: invoice.status }
        });

        res.status(200).json({ success: true, data: decimalsToNumbers(updated) });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a DRAFT invoice. Only DRAFTs are deletable; sent/paid stay forever.
// @route   DELETE /api/invoices/:id
// @access  Private (creator + admin)
export const deleteInvoice = async (req, res, next) => {
    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId }
        });
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
        if (invoice.status !== 'DRAFT') {
            return res.status(400).json({ success: false, message: 'Only DRAFT invoices can be deleted; use Cancel for SENT or PAID.' });
        }
        const isOwner = invoice.createdBy === req.user.id;
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await prisma.invoice.deleteMany({
            where: { id: invoice.id, tenantId: req.user.tenantId }
        });

        await auditFromReq(req, {
            action: 'DELETE',
            entity: 'Invoice',
            entityId: invoice.id,
            before: { invoiceNumber: invoice.invoiceNumber, totalAmount: D(invoice.totalAmount) }
        });

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};
