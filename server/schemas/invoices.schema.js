import { z } from 'zod';

const lineItem = z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive().or(z.string().transform(v => Number(v))),
    unitPrice: z.number().nonnegative().or(z.string().transform(v => Number(v))),
    total: z.number().optional()
});

const positiveAmount = z.union([z.number(), z.string()])
    .refine(v => v !== '' && !Number.isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number')
    .transform(v => Number(v));

const dateLike = z.union([z.string(), z.date()]).optional().nullable();

const InvoiceStatus = z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']);

const baseInvoice = z.object({
    clientId: z.string().uuid(),
    projectId: z.string().uuid().optional().nullable(),
    dueDate: dateLike,
    lineItems: z.array(lineItem).min(1).max(200),
    taxRate: z.number().min(0).max(100).optional(),
    discountAmount: z.number().nonnegative().optional(),
    notes: z.string().max(2000).optional().nullable(),
    terms: z.string().max(2000).optional().nullable(),
    currency: z.string().length(3).optional()
});

export const createInvoiceSchema = baseInvoice;
export const updateInvoiceSchema = baseInvoice.partial();

export const sendInvoiceSchema = z.object({
    to: z.string().email().optional(),
    message: z.string().max(2000).optional()
});

export const recordPaymentSchema = z.object({
    amount: positiveAmount,
    paidAt: dateLike
});

export const idParamSchema = z.object({
    id: z.string().uuid('Invalid id')
});
