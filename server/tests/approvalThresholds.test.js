import { describe, test, expect } from 'vitest';
import {
    requiredRoleForAmount,
    canAutoApprove,
    ensureCanApprove,
    validateThresholds,
    InsufficientApprovalRankError,
    DEFAULT_THRESHOLDS
} from '../lib/approvalThresholds.js';

describe('requiredRoleForAmount (defaults)', () => {
    const tenant = null; // null/missing config → defaults

    test('small amount only needs ENGINEER', () => {
        expect(requiredRoleForAmount(1000, tenant)).toBe('ENGINEER');
        expect(requiredRoleForAmount(5000, tenant)).toBe('ENGINEER');
    });

    test('medium amount needs PROJECT_MANAGER', () => {
        expect(requiredRoleForAmount(5001, tenant)).toBe('PROJECT_MANAGER');
        expect(requiredRoleForAmount(50000, tenant)).toBe('PROJECT_MANAGER');
    });

    test('large amount needs ADMIN', () => {
        expect(requiredRoleForAmount(50001, tenant)).toBe('ADMIN');
        expect(requiredRoleForAmount(10_000_000, tenant)).toBe('ADMIN');
    });
});

describe('canAutoApprove', () => {
    const tenant = null;

    test('engineer can auto-approve small expense', () => {
        expect(canAutoApprove('ENGINEER', 1000, tenant)).toBe(true);
    });

    test('engineer cannot auto-approve medium expense', () => {
        expect(canAutoApprove('ENGINEER', 10000, tenant)).toBe(false);
    });

    test('manager can auto-approve up to 50k', () => {
        expect(canAutoApprove('PROJECT_MANAGER', 50000, tenant)).toBe(true);
        expect(canAutoApprove('PROJECT_MANAGER', 50001, tenant)).toBe(false);
    });

    test('admin can auto-approve anything', () => {
        expect(canAutoApprove('ADMIN', 5_000_000, tenant)).toBe(true);
    });

    test('accountant has same rank as engineer', () => {
        expect(canAutoApprove('ACCOUNTANT', 1000, tenant)).toBe(true);
        expect(canAutoApprove('ACCOUNTANT', 10000, tenant)).toBe(false);
    });
});

describe('ensureCanApprove', () => {
    const tenant = null;

    test('throws when caller below required rank', () => {
        expect(() => ensureCanApprove('PROJECT_MANAGER', 100000, tenant))
            .toThrow(InsufficientApprovalRankError);
    });

    test('returns required role when caller has rank', () => {
        const r = ensureCanApprove('ADMIN', 100000, tenant);
        expect(r).toBe('ADMIN');
    });
});

describe('custom tenant thresholds override defaults', () => {
    const strict = {
        approvalThresholds: [
            { maxAmount: 100, minRole: 'ENGINEER' },
            { maxAmount: 1000, minRole: 'ADMIN' },
            { maxAmount: null, minRole: 'SUPER_ADMIN' }
        ]
    };

    test('engineer can only do tiny amounts', () => {
        expect(canAutoApprove('ENGINEER', 100, strict)).toBe(true);
        expect(canAutoApprove('ENGINEER', 101, strict)).toBe(false);
    });

    test('admin can handle middle tier', () => {
        expect(canAutoApprove('ADMIN', 1000, strict)).toBe(true);
        expect(canAutoApprove('ADMIN', 1001, strict)).toBe(false);
    });

    test('only super-admin handles top tier', () => {
        expect(canAutoApprove('SUPER_ADMIN', 999_999_999, strict)).toBe(true);
        expect(canAutoApprove('ADMIN', 999_999_999, strict)).toBe(false);
    });
});

describe('validateThresholds', () => {
    test('accepts the defaults shape', () => {
        expect(validateThresholds(DEFAULT_THRESHOLDS)).toBeNull();
    });

    test('rejects empty', () => {
        expect(validateThresholds([])).toMatch(/at least one tier/);
    });

    test('rejects when last tier is not null fallback', () => {
        const bad = [{ maxAmount: 5000, minRole: 'ADMIN' }];
        expect(validateThresholds(bad)).toMatch(/null/);
    });

    test('rejects unknown role', () => {
        const bad = [
            { maxAmount: null, minRole: 'WIZARD' }
        ];
        expect(validateThresholds(bad)).toMatch(/minRole/);
    });

    test('rejects negative maxAmount', () => {
        const bad = [
            { maxAmount: -1, minRole: 'ENGINEER' },
            { maxAmount: null, minRole: 'ADMIN' }
        ];
        expect(validateThresholds(bad)).toMatch(/positive number/);
    });

    test('rejects two null fallbacks', () => {
        const bad = [
            { maxAmount: null, minRole: 'ENGINEER' },
            { maxAmount: null, minRole: 'ADMIN' }
        ];
        expect(validateThresholds(bad)).toMatch(/only one tier/);
    });
});
