import { z } from 'zod';

const UserRole = z.enum(['ADMIN', 'ENGINEER', 'ACCOUNTANT', 'SUPER_ADMIN', 'PROJECT_MANAGER']);

// Password validation. We use a single .superRefine that gathers ALL failures
// at once and returns one combined message — so a user typing a password that
// misses both a digit AND an uppercase letter sees both problems on the first
// submit instead of fixing them one round-trip at a time.
//
// Special-character set: any non-alphanumeric character. The previous
// allowlist (@$!%*?&) was too narrow — common picks like # and _ were
// rejected even though users intuit them as "specials".
const passwordSchema = z.string().superRefine((val, ctx) => {
    const issues = [];
    if (!val || val.length < 8) issues.push('at least 8 characters');
    if (!/[a-z]/.test(val))     issues.push('one lowercase letter');
    if (!/[A-Z]/.test(val))     issues.push('one uppercase letter');
    if (!/\d/.test(val))        issues.push('one digit');
    if (!/[^a-zA-Z0-9]/.test(val)) issues.push('one special character (e.g. # @ ! _ -)');
    if (issues.length) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Password must include: ${issues.join(', ')}.`
        });
    }
});

export const inviteUserSchema = z.object({
    email: z.string().email('Invalid email address').max(254),
    password: z.preprocess(val => (val === '' || val === null ? undefined : val), passwordSchema.optional()),
    role: UserRole.optional().default('ENGINEER'),
    roleId: z.string().uuid().optional().nullable(),
    permissions: z.array(z.string().max(100)).max(200).optional().default([]),
    name: z.string().max(120).optional().nullable(),
    nameAr: z.string().max(120).optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    phones: z.array(z.string().max(30)).optional().default([])
});

export const updateUserSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    nameAr: z.string().max(120).optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    phones: z.array(z.string().max(30)).optional(),
    role: UserRole.optional(),
    permissions: z.array(z.string().max(100)).max(200).optional()
});

export const idParamSchema = z.object({
    id: z.string().uuid('Invalid id')
});
