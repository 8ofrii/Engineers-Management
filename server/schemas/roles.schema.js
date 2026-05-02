import { z } from 'zod';

// Role.permissions is stored as Json — a structured matrix like
// { financials: { view_operational_fund: true, ... }, ... }
// We allow any nested object/value, but require it to be a non-null object.
const permissionsMatrix = z.record(z.any()).refine(
    v => v !== null && typeof v === 'object' && !Array.isArray(v),
    'permissions must be an object'
);

export const createRoleSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional().nullable(),
    permissions: permissionsMatrix
});

export const updateRoleSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    permissions: permissionsMatrix.optional()
});

export const idParamSchema = z.object({
    id: z.string().uuid('Invalid id')
});
