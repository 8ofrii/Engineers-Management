import { z } from 'zod';

// PUT /api/tenant uses multer (logo upload), so multipart fields arrive as
// strings. All fields are optional — empty strings are normalized to null.
export const updateTenantSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    address: z.union([z.string().max(500), z.literal(''), z.null()]).optional(),
    phone: z.union([z.string().max(30), z.literal(''), z.null()]).optional(),
    email: z.union([z.string().email().max(254), z.literal(''), z.null()]).optional()
});

