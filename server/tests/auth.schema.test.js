import { describe, test, expect } from 'vitest';
import {
    loginSchema,
    registerCompanySchema,
    verifyEmailSchema,
    resetPasswordParamsSchema
} from '../schemas/auth.schema.js';

describe('loginSchema', () => {
    test('accepts a valid email + password', () => {
        const result = loginSchema.safeParse({ email: 'a@b.com', password: 'x' });
        expect(result.success).toBe(true);
    });

    test('rejects invalid email format', () => {
        const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toEqual(['email']);
    });

    test('rejects missing password', () => {
        const result = loginSchema.safeParse({ email: 'a@b.com' });
        expect(result.success).toBe(false);
    });
});

describe('registerCompanySchema', () => {
    const valid = {
        companyName: 'Acme Build',
        adminName: 'Alice',
        email: 'alice@acme.com',
        password: 'StrongP@ss1'
    };

    test('accepts valid input', () => {
        expect(registerCompanySchema.safeParse(valid).success).toBe(true);
    });

    test('rejects weak password (no uppercase)', () => {
        const result = registerCompanySchema.safeParse({ ...valid, password: 'weakp@ss1' });
        expect(result.success).toBe(false);
        expect(result.error.issues.some(i => i.message.includes('uppercase'))).toBe(true);
    });

    test('rejects weak password (no special char)', () => {
        const result = registerCompanySchema.safeParse({ ...valid, password: 'WeakPass1' });
        expect(result.success).toBe(false);
        expect(result.error.issues.some(i => i.message.includes('special'))).toBe(true);
    });

    test('rejects short password', () => {
        const result = registerCompanySchema.safeParse({ ...valid, password: 'Sp@1' });
        expect(result.success).toBe(false);
    });

    test('strips unknown fields (mass-assignment defence)', () => {
        const result = registerCompanySchema.parse({
            ...valid,
            role: 'SUPER_ADMIN',
            isVerified: true,
            tenantId: 'malicious-tenant'
        });
        expect(result.role).toBeUndefined();
        expect(result.isVerified).toBeUndefined();
        expect(result.tenantId).toBeUndefined();
    });
});

describe('verifyEmailSchema', () => {
    test('accepts 6-digit code', () => {
        expect(verifyEmailSchema.safeParse({ email: 'a@b.com', code: '123456' }).success).toBe(true);
    });

    test('rejects non-numeric code', () => {
        expect(verifyEmailSchema.safeParse({ email: 'a@b.com', code: 'abcdef' }).success).toBe(false);
    });

    test('rejects code with wrong length', () => {
        expect(verifyEmailSchema.safeParse({ email: 'a@b.com', code: '12345' }).success).toBe(false);
    });
});

describe('resetPasswordParamsSchema', () => {
    test('accepts 40-char hex token', () => {
        const token = 'a'.repeat(40);
        expect(resetPasswordParamsSchema.safeParse({ resettoken: token }).success).toBe(true);
    });

    test('rejects malformed token', () => {
        expect(resetPasswordParamsSchema.safeParse({ resettoken: 'short' }).success).toBe(false);
    });
});
