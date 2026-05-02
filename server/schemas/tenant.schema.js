import { z } from 'zod';

// PUT /api/tenant uses multer (logo upload), so multipart fields arrive as
// strings. All fields are optional — only the ones provided are applied.
export const updateTenantSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    address: z.string().max(500).optional(),
    phone: z.string().min(3).max(30).optional(),
    email: z.string().email().max(254).optional()
});
