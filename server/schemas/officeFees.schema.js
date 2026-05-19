import { z } from 'zod';

const TransactionCategory = z.enum([
    'MATERIALS', 'LABOR', 'EQUIPMENT', 'SERVICES', 'PAYMENT', 'OTHER',
    'CUSTODY_TRANSFER', 'MANAGEMENT_FEE_TRANSFER',
    'CONCRETE', 'SITE_CLEANING', 'STOCKING', 'CEMENT', 'SAND', 'BRICKS',
    'GENERAL_LABOR', 'MASONRY_LABOR',
    'PLASTERING_MATERIALS', 'PLASTERING_LABOR',
    'PLUMBING_MATERIALS', 'PLUMBING_LABOR',
    'ELECTRICAL_MATERIALS', 'ELECTRICAL_LABOR',
    'CERAMIC_MATERIALS', 'CERAMIC_LABOR',
    'PAINTING_MATERIALS', 'PAINTING_LABOR',
    'GYPSUM_MATERIALS', 'GYPSUM_LABOR',
    'CARPENTRY_MATERIALS', 'CARPENTRY_LABOR',
    'DECOR', 'DRAWINGS', 'TIPS', 'TRANSPORT',
    'INSULATION_LABOR', 'HVAC_PREP', 'ALUMETAL'
]);

const feePercent = z.coerce.number().min(0).max(100);

const positiveAmount = z.union([z.number(), z.string()])
    .refine(v => v !== '' && !Number.isNaN(Number(v)) && Number(v) > 0, 'Amount must be a positive number')
    .transform(v => Number(v));

export const setGlobalFeeSchema = z.object({
    category: TransactionCategory,
    defaultFeePercent: feePercent
});

export const setProjectFeeSchema = z.object({
    category: TransactionCategory,
    feePercent
});

export const calculateFeeSchema = z.object({
    projectId: z.string().uuid(),
    category: TransactionCategory,
    amount: positiveAmount
});

export const projectIdParamSchema = z.object({
    projectId: z.string().uuid('Invalid project id')
});

export const projectAndCategoryParamsSchema = z.object({
    projectId: z.string().uuid('Invalid project id'),
    category: TransactionCategory
});
