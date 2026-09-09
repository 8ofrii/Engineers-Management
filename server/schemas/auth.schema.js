import { z } from 'zod';

// Combined password validation — same rules as users.schema.js. Single
// superRefine returns ALL violations as one message so users see every
// missing requirement on the first submit instead of fixing them
// one-at-a-time across multiple round trips.
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

const emailSchema = z.string().email('Invalid email').max(254);
const phoneSchema = z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().min(5, 'Phone number must be at least 5 characters').max(30).optional().nullable()
);

export const registerSchema = z.object({
    name: z.string().min(1, 'Name is required').max(120),
    email: emailSchema,
    password: passwordSchema,
    company: z.string().max(200).optional().nullable(),
    phone: phoneSchema
});

export const registerCompanySchema = z.object({
    companyName: z.string().min(2, 'Company name must be at least 2 characters').max(200),
    adminName: z.string().min(1, 'Admin name is required').max(120),
    email: emailSchema,
    password: passwordSchema,
    phone: phoneSchema
});

export const verifyEmailSchema = z.object({
    email: emailSchema,
    code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits')
});

export const verifyInviteSchema = z.object({
    token: z.string().min(10).max(200)
});

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1).max(200)
});

export const forgotPasswordSchema = z.object({
    email: emailSchema
});

export const resetPasswordParamsSchema = z.object({
    resettoken: z.string().regex(/^[a-f0-9]{40}$/i, 'Invalid reset token')
});

export const resetPasswordBodySchema = z.object({
    password: passwordSchema
});

// PUT /api/auth/profile uses multer (profilePicture upload), so all fields
// arrive as strings. currentPassword + newPassword are paired — controller
// applies password complexity check on newPassword internally, but we still
// enforce min length here so the controller's regex check has something
// reasonable to work with.
export const updateProfileSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    email: emailSchema.optional(),
    phone: z.string().min(3).max(30).optional(),
    company: z.string().max(200).optional(),
    currentPassword: z.string().min(1).max(200).optional(),
    newPassword: z.string().min(8).max(200).optional()
});

// 2FA — TOTP code is always exactly 6 digits.
const totpCode = z.string().regex(/^\d{6}$/, 'Code must be 6 digits');

export const login2FASchema = z.object({
    challengeToken: z.string().min(20).max(500),
    code: totpCode
});

export const confirmEnroll2FASchema = z.object({
    code: totpCode
});

export const disable2FASchema = z.object({
    password: z.string().min(1).max(200),
    code: totpCode
});
