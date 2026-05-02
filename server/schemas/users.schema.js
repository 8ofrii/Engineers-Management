import { z } from 'zod';

const UserRole = z.enum(['ADMIN', 'ENGINEER', 'ACCOUNTANT', 'SUPER_ADMIN', 'PROJECT_MANAGER']);

const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/\d/, 'Password must include a digit')
    .regex(/[@$!%*?&]/, 'Password must include a special character (@$!%*?&)');

export const inviteUserSchema = z.object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(254),
    phone: z.string().min(3).max(30),
    password: passwordSchema,
    role: UserRole.optional(),
    permissions: z.array(z.string().max(100)).max(200).optional()
});

export const updateUserSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    phone: z.string().min(3).max(30).optional(),
    role: UserRole.optional(),
    permissions: z.array(z.string().max(100)).max(200).optional()
});

export const idParamSchema = z.object({
    id: z.string().uuid('Invalid id')
});
