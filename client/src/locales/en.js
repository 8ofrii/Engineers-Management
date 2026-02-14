// English Translations for V1.2
export const en = {
    // Transaction Modal
    transaction: {
        title: 'New Transaction',
        editTitle: 'Edit Transaction',
        type: 'Transaction Type',
        income: 'Income',
        expense: 'Expense',
        category: 'Category',
        amount: 'Amount (EGP)',
        date: 'Transaction Date & Time',
        costItem: 'Cost Item / Work Order',
        noLink: 'No Link',
        newCostItem: 'New',
        description: 'Description',
        paymentMethod: 'Payment Method',
        cash: 'Cash',
        bankTransfer: 'Bank Transfer',
        check: 'Check',
        creditCard: 'Credit Card',
        invoiceNumber: 'Invoice Number',
        paidBy: 'Paid By',
        inventoryPurchase: 'Inventory Purchase (Defer Profit)',
        inventoryAlert: 'A material batch will be created. Profit will be recognized upon usage.',
        cancel: 'Cancel',
        save: 'Save',
        saving: 'Saving...',

        // Validation
        typeRequired: 'Type is required',
        categoryRequired: 'Category is required',
        amountRequired: 'Amount must be greater than 0',
        descriptionRequired: 'Description is required'
    },

    // Cost Item Modal
    costItem: {
        title: 'New Cost Item',
        editTitle: 'Edit Cost Item',
        name: 'Item Name / Work Order',
        namePlaceholder: 'Example: Ground Floor Ceramic Installation',
        quantity: 'Total Quantity',
        unit: 'Unit of Measure',
        unitPlaceholder: 'M2, Bag, Meter, etc.',
        unitPrice: 'Unit Price (EGP)',
        estimatedTotal: 'Estimated Total (EGP)',
        optional: 'Optional',
        autoCalculated: 'Auto-calculated',
        infoMessage: 'Cost items help track progress and expenses for specific work orders in the project.',
        cancel: 'Cancel',
        save: 'Save',
        saving: 'Saving...',

        // Validation
        nameRequired: 'Item name is required'
    },

    // Inventory Usage Modal
    inventory: {
        title: 'Record Inventory Usage',
        batch: 'Material Batch',
        noBatches: 'No batches available',
        batchInfo: 'Batch Information',
        initialValue: 'Initial Value',
        remaining: 'Remaining',
        valueConsumed: 'Value Consumed (EGP)',
        profitPreview: 'Profit Preview',
        managementFee: 'Management Fee',
        profitRecognized: 'Profit Recognized',
        remainingAfter: 'Remaining After',
        description: 'Description / Purpose',
        descriptionPlaceholder: 'Example: Used cement for foundation work',
        cancel: 'Cancel',
        record: 'Record Usage',
        recording: 'Recording...',

        // Validation
        batchRequired: 'Material batch is required',
        valueRequired: 'Value consumed must be greater than 0',
        valueExceeds: 'Value exceeds available',
        descriptionRequired: 'Description is required'
    },

    // Categories
    categories: {
        materials: 'Materials',
        labor: 'Labor',
        services: 'Services'
    },

    // Common
    common: {
        egp: 'EGP',
        close: 'Close',
        submit: 'Submit',
        delete: 'Delete',
        edit: 'Edit',
        view: 'View',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        import: 'Import',
        refresh: 'Refresh',
        loading: 'Loading...',
        noData: 'No data available',
        error: 'An error occurred',
        success: 'Success',
        confirm: 'Confirm',
        yes: 'Yes',
        no: 'No'
    }
};

export default en;
