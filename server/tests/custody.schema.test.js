import { describe, test, expect } from 'vitest';
import { fundEngineerSchema, returnCustodySchema } from '../schemas/custody.schema.js';

describe('fundEngineerSchema', () => {
    const validId = '550e8400-e29b-41d4-a716-446655440000';

    test('accepts valid funding', () => {
        const result = fundEngineerSchema.safeParse({ engineerId: validId, amount: 1000 });
        expect(result.success).toBe(true);
        expect(result.data.amount).toBe(1000);
    });

    test('coerces string amount to number', () => {
        const result = fundEngineerSchema.parse({ engineerId: validId, amount: '500.50' });
        expect(result.amount).toBe(500.5);
    });

    test('rejects zero amount', () => {
        expect(fundEngineerSchema.safeParse({ engineerId: validId, amount: 0 }).success).toBe(false);
    });

    test('rejects negative amount', () => {
        expect(fundEngineerSchema.safeParse({ engineerId: validId, amount: -100 }).success).toBe(false);
    });

    test('rejects non-uuid engineer id', () => {
        expect(fundEngineerSchema.safeParse({ engineerId: 'short', amount: 100 }).success).toBe(false);
    });
});

describe('returnCustodySchema', () => {
    test('accepts valid return', () => {
        expect(returnCustodySchema.safeParse({ amount: 100 }).success).toBe(true);
    });

    test('rejects zero', () => {
        expect(returnCustodySchema.safeParse({ amount: 0 }).success).toBe(false);
    });
});
