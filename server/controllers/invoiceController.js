import prisma from '../lib/prisma.js';
import { auditFromReq } from '../lib/audit.js';
import { generateInvoicePdf } from '../lib/invoicePdf.js';
import sendEmail from '../utils/sendEmail.js';

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
        const buffer = await generateInvoicePdf({
            invoice: { ...invoice, lineItems: invoice.lineItems || [] },
            client: invoice.client,
            tenant,
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
        const buffer = await generateInvoicePdf({
            invoice: { ...invoice, lineItems: invoice.lineItems || [] },
            client: invoice.client,
            tenant,
            project: invoice.project
        });

        const customMessage = req.body?.message;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <p>Dear ${invoice.client?.name || 'Customer'},</p>
                <p>${customMessage || `Please find attached invoice <strong>${invoice.invoiceNumber}</strong> for ${tenant?.name || 'our services'}.`}</p>
                <p>Total due: <strong>${Number(invoice.totalAmount).toLocaleString('en-EG', { minimumFractionDigits: 2 })} ${invoice.currency}</strong></p>
                ${invoice.dueDate ? `<p>Due by: ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}</p>` : ''}
                <p>Thank you for your business.</p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">${tenant?.name || ''}</p>
            </div>
        `;

        try {
            await sendEmail({
                email: recipient,
                subject: `Invoice ${invoice.invoiceNumber} from ${tenant?.name || 'our company'}`,
                message: html,
                attachments: [{
                    filename: `${invoice.invoiceNumber}.pdf`,
                    content: buffer,
                    contentType: 'application/pdf'
                }]
            });
        } catch (emailErr) {
            console.error('Invoice email send failed:', emailErr);
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

        await prisma.invoice.delete({ where: { id: invoice.id } });

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
