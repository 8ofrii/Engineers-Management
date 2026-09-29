import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import AddTransactionModal from './AddTransactionModal';

// Mock contexts, api, i18n
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, fallback) => fallback || key,
        i18n: { language: 'en' }
    })
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'user-1', name: 'Test User', role: 'ADMIN' }
    })
}));

vi.mock('../context/AlertContext', () => ({
    useAlert: () => ({
        showAlert: vi.fn()
    })
}));

vi.mock('../services/api', () => ({
    projectsAPI: {
        getAll: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
        getCostItems: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
        getProjectInventory: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
        createCostItem: vi.fn()
    },
    categoriesAPI: {
        getAll: vi.fn().mockResolvedValue({ data: { success: true, data: [] } })
    },
    userAPI: {
        getUsers: vi.fn().mockResolvedValue({ data: { success: true, data: [] } })
    },
    clientsAPI: {
        getAll: vi.fn().mockResolvedValue({ data: { success: true, data: [] } })
    },
    suppliersAPI: {
        getAll: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
        createSupplier: vi.fn()
    },
    rawMaterialsAPI: {
        getAll: vi.fn().mockResolvedValue({ data: { success: true, data: [] } })
    },
    safesAPI: {
        getSafes: vi.fn().mockResolvedValue({ data: { success: true, data: [] } })
    },
    workmenAPI: {
        getAll: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
        create: vi.fn()
    },
    transactionsAPI: {
        getExtendedSuggestions: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
        createTransactionV2: vi.fn(),
        update: vi.fn()
    },
    documentsAPI: {
        uploadReceipt: vi.fn()
    }
}));

describe('AddTransactionModal', () => {
    it('renders cleanly in CREATE mode without throwing ReferenceError', () => {
        const { container } = render(
            <AddTransactionModal
                isOpen={true}
                onClose={() => {}}
                onTransactionAdded={() => {}}
            />
        );
        expect(container).toBeInTheDocument();
    });

    it('renders cleanly in EDIT mode with initialData without throwing ReferenceError', () => {
        const mockInitial = {
            id: 'tx-123',
            amount: 500,
            description: 'Sample Initial Description',
            category: 'MATERIALS',
            paymentMethod: 'CASH',
            transactionDate: '2026-09-26T20:00:00.000Z',
            receiptPhotoUrl: JSON.stringify(['https://storage.example.com/receipt.jpg'])
        };

        const { container } = render(
            <AddTransactionModal
                isOpen={true}
                onClose={() => {}}
                onTransactionAdded={() => {}}
                initialData={mockInitial}
            />
        );
        expect(container).toBeInTheDocument();
    });

    it('defaults unit of measure to OTHER (not TON) in CREATE mode and shows customUnit input', () => {
        const { container } = render(
            <AddTransactionModal
                isOpen={true}
                onClose={() => {}}
                onTransactionAdded={() => {}}
            />
        );

        const unitSelect = container.querySelector('select[name="unit"]');
        expect(unitSelect).toBeInTheDocument();
        expect(unitSelect.value).toBe('OTHER');
        expect(unitSelect.value).not.toBe('TON');

        // customUnit text input should be rendered when unit is OTHER
        const customUnitInput = container.querySelector('input[name="customUnit"]');
        expect(customUnitInput).toBeInTheDocument();

        // Typing a custom unit updates its value
        fireEvent.change(customUnitInput, { target: { name: 'customUnit', value: 'نقلة' } });
        expect(customUnitInput.value).toBe('نقلة');
    });

    it('hides customUnit input when a standard unit (e.g. KG) is selected', () => {
        const { container } = render(
            <AddTransactionModal
                isOpen={true}
                onClose={() => {}}
                onTransactionAdded={() => {}}
            />
        );

        const unitSelect = container.querySelector('select[name="unit"]');
        fireEvent.change(unitSelect, { target: { name: 'unit', value: 'KG' } });

        expect(unitSelect.value).toBe('KG');
        const customUnitInput = container.querySelector('input[name="customUnit"]');
        expect(customUnitInput).toBeNull();
    });

    it('preserves custom unit in EDIT mode without defaulting to TON', () => {
        const mockInitial = {
            id: 'tx-456',
            amount: 1500,
            description: 'Scaffolding Rental | 5 Days @ 300',
            category: 'EQUIPMENT_RENTAL',
            paymentMethod: 'BANK_TRANSFER',
            projectCostItem: {
                unitOfMeasure: 'Days'
            }
        };

        const { container } = render(
            <AddTransactionModal
                isOpen={true}
                onClose={() => {}}
                onTransactionAdded={() => {}}
                initialData={mockInitial}
            />
        );

        const unitSelect = container.querySelector('select[name="unit"]');
        expect(unitSelect).toBeInTheDocument();
        expect(unitSelect.value).toBe('OTHER');
        expect(unitSelect.value).not.toBe('TON');

        const customUnitInput = container.querySelector('input[name="customUnit"]');
        expect(customUnitInput).toBeInTheDocument();
        expect(customUnitInput.value).toBe('Days');
    });
});
