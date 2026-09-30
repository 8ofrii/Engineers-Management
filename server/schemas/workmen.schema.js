import { z } from 'zod';

const WorkmanTrade = z.enum([
    'CARPENTER', 'MASON', 'ELECTRICIAN', 'PLUMBER', 'PAINTER', 'WELDER',
    'LABORER', 'FOREMAN', 'OTHER', 'CONCRETE', 'PLASTERER', 'FLOORING',
    'GYPSUM', 'ALUMINUM', 'BLACKSMITH', 'IRON_WORKER', 'STOCKING_WORKER',
    'MARBLE_CRAFTSMAN', 'CONCRETE_CUTTING', 'GUARD', 'MUNICIPAL_EMPLOYEE'
]);

const optionalDecimal = z.union([z.number(), z.string()])
    .refine(v => v === '' || v === null || v === undefined || !Number.isNaN(Number(v)), 'Must be a number')
    .transform(v => (v === '' || v === null || v === undefined ? null : Number(v)))
    .optional()
    .nullable();

// nationalIdImage may be a base64 data URL (large). Body parser caps at 20mb.
const baseWorkman = z.object({
    name: z.string().min(1).max(200),
    nameAr: z.string().max(200).optional().nullable(),
    trade: WorkmanTrade,
    customTrade: z.string().max(100).optional().nullable(),
    dailyRate: optionalDecimal,
    phone: z.string().max(30).optional().nullable(),
    phones: z.array(z.string().max(30)).optional().default([]),
    nationalId: z.string().max(50).optional().nullable(),
    nationalIdImage: z.string().optional().nullable()
});

export const createWorkmanSchema = baseWorkman;
export const updateWorkmanSchema = baseWorkman.partial().extend({
    isActive: z.boolean().optional()
});

export const idParamSchema = z.object({
    id: z.string().uuid('Invalid id')
});
