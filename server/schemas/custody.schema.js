import { z } from 'zod';

const positiveAmount = z.union([z.number(), z.string()])
    .refine(v => v !== '' && !Number.isNaN(Number(v)) && Number(v) > 0, 'Amount must be a positive number')
    .transform(v => Number(v));

export const fundEngineerSchema = z.object({
    engineerId: z.string().uuid(),
    amount: positiveAmount,
    description: z.string().max(500).optional().nullable()
});

export const returnCustodySchema = z.object({
    amount: positiveAmount,
    description: z.string().max(500).optional().nullable()
});

export const engineerIdParamSchema = z.object({
    engineerId: z.string().uuid('Invalid engineer id')
});
