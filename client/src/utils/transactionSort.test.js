import { describe, it, expect } from 'vitest';
import {
    sortTransactionList,
    getDateVal,
    getTypeVal,
    getCategoryVal,
    getPayerVal,
    getMethodVal,
    getAmountVal,
    getStatusVal
} from './transactionSort';

describe('transactionSort utilities', () => {
    const mockTxs = [
        {
            id: 'tx-1',
            transactionDate: '2026-07-20T10:00:00Z',
            type: 'EXPENSE',
            category: 'MATERIALS',
            description: 'Cement and Sand',
            payer: { name: 'Eng. Hossam' },
            paymentMethod: 'CASH',
            amount: 5000,
            status: 'APPROVED'
        },
        {
            id: 'tx-2',
            transactionDate: '2026-07-28T10:00:00Z',
            type: 'EXPENSE',
            category: 'GENERAL_LABOR',
            description: 'Labor payment',
            payer: { name: 'Eng. Hossam' },
            paymentMethod: 'BANK_TRANSFER',
            amount: 3000,
            status: 'APPROVED'
        },
        {
            id: 'tx-3',
            transactionDate: '2026-07-25T10:00:00Z',
            type: 'INCOME',
            category: 'CLIENT_PAYMENT',
            description: 'First milestone payment',
            client: { name: 'Al-Jazar' },
            paymentMethod: 'BANK_TRANSFER',
            amount: 150000,
            status: 'APPROVED'
        },
        {
            id: 'tx-4',
            transactionDate: '2026-07-15T10:00:00Z',
            type: 'EXPENSE',
            category: 'MANAGEMENT_FEE_TRANSFER',
            description: 'Office Profit 10%',
            payer: { name: 'Company HQ' },
            paymentMethod: 'CUSTODY_WALLET',
            amount: 15000,
            status: 'APPROVED'
        }
    ];

    it('defaults to sorting by date descending (newest first)', () => {
        const sorted = sortTransactionList(mockTxs);
        expect(sorted[0].id).toBe('tx-2'); // 2026-07-28
        expect(sorted[1].id).toBe('tx-3'); // 2026-07-25
        expect(sorted[2].id).toBe('tx-1'); // 2026-07-20
        expect(sorted[3].id).toBe('tx-4'); // 2026-07-15
    });

    it('sorts by date ascending (oldest first)', () => {
        const sorted = sortTransactionList(mockTxs, 'date', 'asc');
        expect(sorted[0].id).toBe('tx-4'); // 2026-07-15
        expect(sorted[1].id).toBe('tx-1'); // 2026-07-20
        expect(sorted[2].id).toBe('tx-3'); // 2026-07-25
        expect(sorted[3].id).toBe('tx-2'); // 2026-07-28
    });

    it('sorts by amount descending (highest amount first)', () => {
        const sorted = sortTransactionList(mockTxs, 'amount', 'desc');
        expect(sorted[0].amount).toBe(150000);
        expect(sorted[1].amount).toBe(15000);
        expect(sorted[2].amount).toBe(5000);
        expect(sorted[3].amount).toBe(3000);
    });

    it('sorts by amount ascending (lowest amount first)', () => {
        const sorted = sortTransactionList(mockTxs, 'amount', 'asc');
        expect(sorted[0].amount).toBe(3000);
        expect(sorted[1].amount).toBe(5000);
        expect(sorted[2].amount).toBe(15000);
        expect(sorted[3].amount).toBe(150000);
    });

    it('sorts by type ascending and descending', () => {
        const sortedAsc = sortTransactionList(mockTxs, 'type', 'asc');
        // In English: EXPENSE < INCOME < PROFIT
        expect(sortedAsc[0].type).toBe('EXPENSE');
        expect(sortedAsc[sortedAsc.length - 1].category).toBe('MANAGEMENT_FEE_TRANSFER');

        const sortedDesc = sortTransactionList(mockTxs, 'type', 'desc');
        expect(sortedDesc[0].category).toBe('MANAGEMENT_FEE_TRANSFER'); // PROFIT
    });

    it('sorts by description alphabetically', () => {
        const sortedAsc = sortTransactionList(mockTxs, 'description', 'asc');
        expect(sortedAsc[0].description).toBe('Cement and Sand');
        expect(sortedAsc[1].description).toBe('First milestone payment');
        expect(sortedAsc[2].description).toBe('Labor payment');
        expect(sortedAsc[3].description).toBe('Office Profit 10%');
    });

    it('sorts by payer / client contact correctly', () => {
        const sortedAsc = sortTransactionList(mockTxs, 'payer', 'asc');
        expect(getPayerVal(sortedAsc[0])).toBe('Al-Jazar');
        expect(getPayerVal(sortedAsc[1])).toBe('Company HQ');
        expect(getPayerVal(sortedAsc[2])).toBe('Eng. Hossam');
    });

    it('sorts by payment method', () => {
        const sortedAsc = sortTransactionList(mockTxs, 'paymentMethod', 'asc');
        const methods = sortedAsc.map(t => getMethodVal(t));
        expect(methods[0]).toBe('Bank Transfer');
        expect(methods[1]).toBe('Bank Transfer');
        expect(methods[2]).toBe('Cash');
        expect(methods[3]).toBe('Custody Wallet');
    });

    it('uses newest date as tie-breaker for identical sort keys', () => {
        const sameAmount = [
            { id: 'older', transactionDate: '2026-07-01T00:00:00Z', amount: 3000 },
            { id: 'newer', transactionDate: '2026-07-15T00:00:00Z', amount: 3000 }
        ];
        const sorted = sortTransactionList(sameAmount, 'amount', 'asc');
        // When amount is identical, newer date appears first
        expect(sorted[0].id).toBe('newer');
        expect(sorted[1].id).toBe('older');
    });
});
