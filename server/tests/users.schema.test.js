import { describe, test, expect } from 'vitest';
import { inviteUserSchema, updateUserSchema } from '../schemas/users.schema.js';

describe('inviteUserSchema', () => {
    const valid = {
        name: 'Bob Mason',
        email: 'bob@acme.com',
        phone: '+201234567890',
        password: 'StrongP@ss1'
    };

    test('accepts valid invite without role (defaults applied in controller)', () => {
        expect(inviteUserSchema.safeParse(valid).success).toBe(true);
    });

    test('accepts valid role', () => {
        expect(inviteUserSchema.safeParse({ ...valid, role: 'ENGINEER' }).success).toBe(true);
    });

    test('rejects unknown role', () => {
        expect(inviteUserSchema.safeParse({ ...valid, role: 'GOD' }).success).toBe(false);
    });

    test('rejects weak password', () => {
        expect(inviteUserSchema.safeParse({ ...valid, password: 'weak' }).success).toBe(false);
    });

    test('strips unknown fields (no isVerified injection)', () => {
        const result = inviteUserSchema.parse({
            ...valid,
            isVerified: true,
            isActive: true,
            tenantId: 'attacker',
            mustChangePassword: false
        });
        expect(result.isVerified).toBeUndefined();
        expect(result.isActive).toBeUndefined();
        expect(result.tenantId).toBeUndefined();
        expect(result.mustChangePassword).toBeUndefined();
    });
});

describe('updateUserSchema', () => {
    test('all fields optional', () => {
        expect(updateUserSchema.safeParse({}).success).toBe(true);
    });

    test('rejects unknown role', () => {
        expect(updateUserSchema.safeParse({ role: 'OWNER' }).success).toBe(false);
    });

    test('caps permissions array length', () => {
        const tooMany = Array.from({ length: 250 }, (_, i) => `perm.${i}`);
        expect(updateUserSchema.safeParse({ permissions: tooMany }).success).toBe(false);
    });
});
