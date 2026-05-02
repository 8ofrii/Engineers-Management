import { z } from 'zod';

const MaterialUnit = z.enum(['M3', 'TON', 'KG', 'M2', 'M', 'PIECE', 'LITER', 'BAG']);

const decimalString = z.union([z.number(), z.string()])
    .refine(v => v !== '' && !Number.isNaN(Number(v)), 'Must be a number')
    .transform(v => Number(v));

const baseMaterial = z.object({
    name: z.string().min(1).max(200),
    nameAr: z.string().max(200).optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
    unit: MaterialUnit,
    stockLevel: decimalString.optional(),
    unitPrice: decimalString,
    reorderLevel: decimalString.optional().nullable(),
    supplierId: z.string().uuid().optional().nullable()
});

export const createMaterialSchema = baseMaterial;
export const updateMaterialSchema = baseMaterial.partial();

export const idParamSchema = z.object({
    id: z.string().uuid('Invalid id')
});
