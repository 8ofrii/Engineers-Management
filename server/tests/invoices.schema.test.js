import { describe, test, expect } from 'vitest';
import {
    createInvoiceSchema, updateInvoiceSchema, sendInvoiceSchema, recordPaymentSchema
} from '../schemas/invoices.schema.js';

describe('createInvoiceSchema', () => {
    const valid = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        lineItems: [{ description: 'Foundation work', quantity: 1, unitPrice: 50000 }],
        taxRate: 14,
        currency: 'EGP'
    };

    test('accepts a minimal valid invoice', () => {
        expect(createInvoiceSchema.safeParse(valid).success).toBe(true);
    });

    test('rejects empty line items', () => {
        const r = createInvoiceSchema.safeParse({ ...valid, lineItems: [] });
        expect(r.success).toBe(false);
    });

    test('rejects line item without description', () => {
        const r = createInvoiceSchema.safeParse({
            ...valid,
            lineItems: [{ quantity: 1, unitPrice: 100 }]
        });
        expect(r.success).toBe(false);
    });

    test('rejects negative quantity', () => {
        const r = createInvoiceSchema.safeParse({
            ...valid,
            lineItems: [{ description: 'X', quantity: -1, unitPrice: 100 }]
        });
        expect(r.success).toBe(false);
    });

    test('rejects tax rate over 100%', () => {
        const r = createInvoiceSchema.safeParse({ ...valid, taxRate: 200 });
        expect(r.success).toBe(false);
    });

    test('strips unknown fields (e.g. tries to set status or paidAmount)', () => {
        const r = createInvoiceSchema.parse({
            ...valid,
            status: 'PAID',
            paidAmount: 999999,
            invoiceNumber: 'INV-9999-9999',
            tenantId: 'attacker'
        });
        expect(r.status).toBeUndefined();
        expect(r.paidAmount).toBeUndefined();
        expect(r.invoiceNumber).toBeUndefined();
        expect(r.tenantId).toBeUndefined();
    });
});

describe('updateInvoiceSchema', () => {
    test('all fields optional', () => {
        expect(updateInvoiceSchema.safeParse({}).success).toBe(true);
    });

    test('still rejects bad line item shapes', () => {
        const r = updateInvoiceSchema.safeParse({ lineItems: [{ unitPrice: 100 }] });
        expect(r.success).toBe(false);
    });
});

describe('sendInvoiceSchema', () => {
    test('accepts valid email', () => {
        expect(sendInvoiceSchema.safeParse({ to: 'client@x.com', message: 'Hi' }).success).toBe(true);
    });
    test('rejects invalid email', () => {
        expect(sendInvoiceSchema.safeParse({ to: 'not-an-email' }).success).toBe(false);
    });
    test('accepts no body (will use client.email)', () => {
        expect(sendInvoiceSchema.safeParse({}).success).toBe(true);
    });
});

describe('recordPaymentSchema', () => {
    test('accepts positive amount', () => {
        expect(recordPaymentSchema.safeParse({ amount: 5000 }).success).toBe(true);
    });
    test('rejects zero', () => {
        expect(recordPaymentSchema.safeParse({ amount: 0 }).success).toBe(false);
    });
    test('rejects negative', () => {
        expect(recordPaymentSchema.safeParse({ amount: -100 }).success).toBe(false);
    });
});
