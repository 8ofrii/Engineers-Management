import { z } from 'zod';

const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/\d/, 'Password must include a digit')
    .regex(/[@$!%*?&]/, 'Password must include a special character (@$!%*?&)');

const emailSchema = z.string().email('Invalid email').max(254);
const phoneSchema = z.string().min(5).max(30).optional().nullable();

export const registerSchema = z.object({
    name: z.string().min(1).max(120),
    email: emailSchema,
    password: passwordSchema,
    company: z.string().max(200).optional().nullable(),
    phone: phoneSchema
});

export const registerCompanySchema = z.object({
    companyName: z.string().min(2).max(200),
    adminName: z.string().min(1).max(120),
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
