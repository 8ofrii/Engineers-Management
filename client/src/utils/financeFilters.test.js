import { describe, it, expect } from 'vitest';
import { matchesPaidBy, matchesPaidTo, isClientIncomeTransaction } from './financeFilters';

describe('Finance Filters (Paid by & Paid to)', () => {
    const mockUsers = [
        { id: 'u1', name: 'Eng. Hossam Elbetar', role: 'ADMIN' },
        { id: 'u2', name: 'Ahmed Engineer', role: 'SITE_ENGINEER' }
    ];

    const mockClients = [
        { id: 'c1', name: 'حسين بيومى الجزار', phone: '01000000000' },
        { id: 'c2', name: 'Client Two', company: 'ABC Contracting' }
    ];

    const mockWorkmen = [
        { id: 'w1', name: 'Mahmoud El-Bannan', nameAr: 'محمود البنان', trade: 'MASON' },
        { id: 'w2', name: 'Gamal', trade: 'CONCRETE' }
    ];

    const mockSuppliers = [
        { id: 's1', name: 'سيد نجيب', category: 'MATERIALS' },
        { id: 's2', name: 'ابو دنيا', category: 'BRICKS' }
    ];

    describe('matchesPaidBy (الدافع)', () => {
        it('returns true when filter is ALL or empty', () => {
            expect(matchesPaidBy({ id: '1' }, 'ALL', mockUsers, mockClients)).toBe(true);
            expect(matchesPaidBy({ id: '1' }, '', mockUsers, mockClients)).toBe(true);
        });

        it('matches ALL_MEMBERS correctly without matching client income', () => {
            const memberExpenseTx = { id: '1', type: 'EXPENSE', payerUserId: 'u1' };
            const clientIncomeTx = { id: '2', type: 'INCOME', clientId: 'c1', createdBy: 'u1' };
            expect(matchesPaidBy(memberExpenseTx, 'ALL_MEMBERS', mockUsers, mockClients)).toBe(true);
            expect(matchesPaidBy(clientIncomeTx, 'ALL_MEMBERS', mockUsers, mockClients)).toBe(false);
        });

        it('matches ALL_CLIENTS correctly', () => {
            const memberTx = { id: '1', type: 'EXPENSE', payerUserId: 'u1' };
            const clientTx = { id: '2', type: 'INCOME', clientId: 'c1' };
            expect(matchesPaidBy(memberTx, 'ALL_CLIENTS', mockUsers, mockClients)).toBe(false);
            expect(matchesPaidBy(clientTx, 'ALL_CLIENTS', mockUsers, mockClients)).toBe(true);
        });

        it('DOES NOT match client income transactions when paidBy is set to company owner (createdBy)', () => {
            // The exact bug reported by user:
            // Hossam Elbetar created a client payment transaction in the ERP for client Hussein Bayoumi El-Gazzar.
            // When filtering by "Paid by: Eng. Hossam Elbetar", it must NOT match this income transaction!
            const clientIncomeTx = {
                id: 'tx-101',
                type: 'INCOME',
                category: 'PAYMENT',
                amount: 150000,
                clientId: 'c1',
                client: { id: 'c1', name: 'حسين بيومى الجزار' },
                createdBy: 'u1', // Eng. Hossam is the author/creator
                payerUserId: null,
                description: 'دفعة عميل - حسين بيومى الجزار | كاش'
            };

            expect(matchesPaidBy(clientIncomeTx, 'MEMBER:u1', mockUsers, mockClients)).toBe(false);
            expect(matchesPaidBy(clientIncomeTx, 'CLIENT:c1', mockUsers, mockClients)).toBe(true);
        });

        it('matches expense paid by member (either via payerUserId or legacy createdBy)', () => {
            const expenseWithPayer = { id: '1', type: 'EXPENSE', payerUserId: 'u1' };
            const expenseLegacyCreator = { id: '2', type: 'EXPENSE', createdBy: 'u1' };
            const expenseOtherMember = { id: '3', type: 'EXPENSE', payerUserId: 'u2' };

            expect(matchesPaidBy(expenseWithPayer, 'MEMBER:u1', mockUsers, mockClients)).toBe(true);
            expect(matchesPaidBy(expenseLegacyCreator, 'MEMBER:u1', mockUsers, mockClients)).toBe(true);
            expect(matchesPaidBy(expenseOtherMember, 'MEMBER:u1', mockUsers, mockClients)).toBe(false);
        });

        it('matches specific client by ID or Arabic name in transactionFrom or description', () => {
            const tx1 = { id: '1', clientId: 'c1' };
            const tx2 = { id: '2', transactionFrom: 'حسين بيومى الجزار', type: 'INCOME' };
            const tx3 = { id: '3', clientId: 'c2' };

            expect(matchesPaidBy(tx1, 'CLIENT:c1', mockUsers, mockClients)).toBe(true);
            expect(matchesPaidBy(tx2, 'CLIENT:c1', mockUsers, mockClients)).toBe(true);
            expect(matchesPaidBy(tx3, 'CLIENT:c1', mockUsers, mockClients)).toBe(false);
        });
    });

    describe('matchesPaidTo (المدفوع له)', () => {
        it('returns true when filter is ALL or empty', () => {
            expect(matchesPaidTo({ id: '1' }, 'ALL', mockUsers, mockWorkmen, mockSuppliers)).toBe(true);
            expect(matchesPaidTo({ id: '1' }, '', mockUsers, mockWorkmen, mockSuppliers)).toBe(true);
        });

        it('does not match income transactions when filtering by workmen or suppliers', () => {
            const clientIncome = { id: '1', type: 'INCOME', clientId: 'c1' };
            expect(matchesPaidTo(clientIncome, 'ALL_WORKMEN', mockUsers, mockWorkmen, mockSuppliers)).toBe(false);
            expect(matchesPaidTo(clientIncome, 'WORKMAN:w1', mockUsers, mockWorkmen, mockSuppliers)).toBe(false);
            expect(matchesPaidTo(clientIncome, 'ALL_SUPPLIERS', mockUsers, mockWorkmen, mockSuppliers)).toBe(false);
            expect(matchesPaidTo(clientIncome, 'SUPPLIER:s1', mockUsers, mockWorkmen, mockSuppliers)).toBe(false);
        });

        it('matches ALL_WORKMEN correctly for expenses', () => {
            const workmanTx = { id: '1', type: 'EXPENSE', workmanId: 'w1' };
            const supplierTx = { id: '2', type: 'EXPENSE', supplierId: 's1' };
            expect(matchesPaidTo(workmanTx, 'ALL_WORKMEN', mockUsers, mockWorkmen, mockSuppliers)).toBe(true);
            expect(matchesPaidTo(supplierTx, 'ALL_WORKMEN', mockUsers, mockWorkmen, mockSuppliers)).toBe(false);
        });

        it('matches ALL_SUPPLIERS correctly for expenses', () => {
            const workmanTx = { id: '1', type: 'EXPENSE', workmanId: 'w1' };
            const supplierTx = { id: '2', type: 'EXPENSE', supplierId: 's1' };
            expect(matchesPaidTo(workmanTx, 'ALL_SUPPLIERS', mockUsers, mockWorkmen, mockSuppliers)).toBe(false);
            expect(matchesPaidTo(supplierTx, 'ALL_SUPPLIERS', mockUsers, mockWorkmen, mockSuppliers)).toBe(true);
        });

        it('matches specific workman by ID, English name, or Arabic name', () => {
            const tx1 = { id: '1', workmanId: 'w1' };
            const tx2 = { id: '2', transactionTo: 'محمود البنان' };
            const tx3 = { id: '3', beneficiary: 'Mahmoud El-Bannan' };
            const tx4 = { id: '4', workmanId: 'w2' };

            expect(matchesPaidTo(tx1, 'WORKMAN:w1', mockUsers, mockWorkmen, mockSuppliers)).toBe(true);
            expect(matchesPaidTo(tx2, 'WORKMAN:w1', mockUsers, mockWorkmen, mockSuppliers)).toBe(true);
            expect(matchesPaidTo(tx3, 'WORKMAN:w1', mockUsers, mockWorkmen, mockSuppliers)).toBe(true);
            expect(matchesPaidTo(tx4, 'WORKMAN:w1', mockUsers, mockWorkmen, mockSuppliers)).toBe(false);
        });

        it('matches specific supplier by ID, name, or beneficiary', () => {
            const tx1 = { id: '1', supplierId: 's1' };
            const tx2 = { id: '2', transactionTo: 'سيد نجيب' };
            const tx3 = { id: '3', supplierId: 's2' };

            expect(matchesPaidTo(tx1, 'SUPPLIER:s1', mockUsers, mockWorkmen, mockSuppliers)).toBe(true);
            expect(matchesPaidTo(tx2, 'SUPPLIER:s1', mockUsers, mockWorkmen, mockSuppliers)).toBe(true);
            expect(matchesPaidTo(tx3, 'SUPPLIER:s1', mockUsers, mockWorkmen, mockSuppliers)).toBe(false);
        });

        it('matches specific company member as payee (e.g. custody transfer)', () => {
            const tx1 = { id: '1', toEngineerId: 'u2' };
            const tx2 = { id: '2', transactionTo: 'Ahmed Engineer' };
            const tx3 = { id: '3', toEngineerId: 'u1' };

            expect(matchesPaidTo(tx1, 'MEMBER:u2', mockUsers, mockWorkmen, mockSuppliers)).toBe(true);
            expect(matchesPaidTo(tx2, 'MEMBER:u2', mockUsers, mockWorkmen, mockSuppliers)).toBe(true);
            expect(matchesPaidTo(tx3, 'MEMBER:u2', mockUsers, mockWorkmen, mockSuppliers)).toBe(false);
        });
    });
});
