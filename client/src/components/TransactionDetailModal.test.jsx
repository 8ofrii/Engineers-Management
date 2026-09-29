import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import TransactionDetailModal from './TransactionDetailModal';

// Mock contexts and i18n
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
        i18n: { language: 'en' }
    })
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'user-1', name: 'Test User', role: 'ADMIN' }
    })
}));

vi.mock('../services/api', () => ({
    transactionsAPI: {
        getById: vi.fn(),
        update: vi.fn()
    }
}));

describe('TransactionDetailModal', () => {
    const mockTx = {
        id: 'tx-1',
        amount: 1500,
        description: 'Test Expense Description',
        category: 'MATERIALS',
        type: 'EXPENSE',
        status: 'APPROVED',
        transactionDate: '2026-09-26T20:00:00.000Z',
        project: { name: 'Al-Gazzar 2' },
        receiptPhotoUrl: null,
        voiceNoteUrl: null
    };

    it('renders cleanly without crashing when transaction is provided', () => {
        const { container } = render(
            <TransactionDetailModal
                isOpen={true}
                onClose={() => {}}
                transaction={mockTx}
            />
        );
        expect(container).toBeInTheDocument();
        expect(screen.getByText(/Test Expense Description/i)).toBeInTheDocument();
    });

    it('renders cleanly when receiptPhotoUrl has multiple urls or single url', () => {
        const txWithReceipt = {
            ...mockTx,
            receiptPhotoUrl: JSON.stringify(['https://storage.example.com/receipt1.jpg', 'https://storage.example.com/receipt2.png'])
        };

        const { container } = render(
            <TransactionDetailModal
                isOpen={true}
                onClose={() => {}}
                transaction={txWithReceipt}
            />
        );
        expect(container).toBeInTheDocument();
    });

    it('returns null when isOpen is false', () => {
        const { container } = render(
            <TransactionDetailModal
                isOpen={false}
                onClose={() => {}}
                transaction={mockTx}
            />
        );
        expect(container.firstChild).toBeNull();
    });
});
