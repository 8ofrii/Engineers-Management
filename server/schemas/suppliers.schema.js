import { z } from 'zod';

const SupplierStatus = z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED']);
const SupplierCategory = z.enum([
    'MATERIALS', 'EQUIPMENT', 'SERVICES', 'LABOR', 'OTHER',
    'CONCRETE', 'STEEL', 'CEMENT', 'BRICKS', 'ELECTRICAL',
    'PLUMBING', 'PAINT', 'WOOD', 'TOOLS', 'SAND'
]);

const baseSupplier = z.object({
    name: z.string().min(1).max(200),
    nameAr: z.string().max(200).optional().nullable(),
    email: z.string().email().max(254).or(z.literal('')).optional(),
    phone: z.string().max(30).or(z.literal('')).optional(),
    phones: z.array(z.string().max(30)).optional().default([]),
    company: z.string().max(200).optional().nullable(),
    category: SupplierCategory.optional(),
    customCategory: z.string().max(100).optional().nullable(),
    categories: z.array(SupplierCategory).optional().default([]),
    suppliedItems: z.array(z.string().max(100)).optional().default([]),
    taxId: z.string().max(50).optional().nullable(),
    paymentTerms: z.string().max(100).optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    status: SupplierStatus.optional(),
    street: z.string().max(200).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    zipCode: z.string().max(20).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    contactName: z.string().max(120).optional().nullable(),
    notes: z.string().max(2000).optional().nullable()
});

export const createSupplierSchema = baseSupplier;
export const updateSupplierSchema = baseSupplier.partial();

export const idParamSchema = z.object({
    id: z.string().uuid('Invalid id')
});
