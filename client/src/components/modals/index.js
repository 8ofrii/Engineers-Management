/**
 * V1.2 Modal Components - Index
 * 
 * This file exports all V1.2 modal components for easy importing
 * throughout the application.
 * 
 * Usage:
 * import { TransactionModal, CostItemModal, InventoryUsageModal } from './components/modals';
 */

export { default as TransactionModal } from './TransactionModal';
export { default as CostItemModal } from './CostItemModal';
export { default as InventoryUsageModal } from './InventoryUsageModal';
export { default as LanguageSwitcher } from './LanguageSwitcher';

// Re-export for convenience
export {
    TransactionModal as NewTransactionModal,
    CostItemModal as WorkOrderModal,
    InventoryUsageModal as MaterialUsageModal
};
