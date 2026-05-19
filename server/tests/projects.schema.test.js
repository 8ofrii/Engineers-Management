import { describe, test, expect } from 'vitest';
import { createProjectSchema, updateProjectSchema } from '../schemas/projects.schema.js';

describe('createProjectSchema', () => {
    const minimal = {
        name: 'Tower A',
        startDate: '2026-01-01',
        clientId: '550e8400-e29b-41d4-a716-446655440000'
    };

    test('accepts a minimal valid project', () => {
        expect(createProjectSchema.safeParse(minimal).success).toBe(true);
    });

    test('rejects invalid revenueModel', () => {
        const result = createProjectSchema.safeParse({ ...minimal, revenueModel: 'NOT_A_MODEL' });
        expect(result.success).toBe(false);
    });

    test('strips computed/sensitive financial fields (mass-assignment defence)', () => {
        // These fields are server-computed and must never accept client input.
        const result = createProjectSchema.parse({
            ...minimal,
            actualCost: 999999,
            officeRevenue: 50000,
            officeExpenses: 10000,
            operationalFund: 200000,
            projectSafeBalance: 1000000,
            tenantId: 'attacker-tenant',
            engineerId: 'someone-else',
            id: 'spoofed-id'
        });
        expect(result.actualCost).toBeUndefined();
        expect(result.officeRevenue).toBeUndefined();
        expect(result.officeExpenses).toBeUndefined();
        expect(result.operationalFund).toBeUndefined();
        expect(result.projectSafeBalance).toBeUndefined();
        expect(result.tenantId).toBeUndefined();
        expect(result.engineerId).toBeUndefined();
        expect(result.id).toBeUndefined();
    });

    test('coerces budget string to number', () => {
        const result = createProjectSchema.parse({ ...minimal, budget: '500000' });
        expect(result.budget).toBe(500000);
    });

    test('rejects non-uuid clientId', () => {
        expect(createProjectSchema.safeParse({ ...minimal, clientId: 'not-a-uuid' }).success).toBe(false);
    });
});

describe('updateProjectSchema', () => {
    test('all fields optional', () => {
        expect(updateProjectSchema.safeParse({}).success).toBe(true);
    });

    test('strips sensitive fields on update too', () => {
        const result = updateProjectSchema.parse({ name: 'X', actualCost: 0, projectSafeBalance: -1 });
        expect(result.name).toBe('X');
        expect(result.actualCost).toBeUndefined();
        expect(result.projectSafeBalance).toBeUndefined();
    });
});
