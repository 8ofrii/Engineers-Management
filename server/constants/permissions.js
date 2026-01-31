// Default Permission Templates for RBAC System
// These are the system defaults that will be created when a new tenant signs up

export const DEFAULT_PERMISSIONS = {
    // 👑 Company Owner (Admin) - Full Access
    ADMIN: {
        financials: {
            view_operational_fund: true,
            view_office_profit: true,
            view_all_wallets: true,
            view_company_stats: true
        },
        custody: {
            request_funds: true,
            authorize_transfers: true,
            approve_receipts: true,
            max_approval_limit: null // Unlimited
        },
        transactions: {
            create: true,
            approve: true,
            record_income: true,
            max_approval_limit: null // Unlimited
        },
        projects: {
            create: true,
            edit: true,
            delete: true,
            view: true,
            edit_budget: true
        },
        inventory: {
            create_batch: true,
            consume_material: true,
            view: true
        },
        admin: {
            manage_users: true,
            manage_roles: true,
            invite_users: true,
            change_user_roles: true
        }
    },

    // 🏗️ Project Manager - Approval & Oversight
    PROJECT_MANAGER: {
        financials: {
            view_operational_fund: true,
            view_office_profit: false, // Cannot see company profit
            view_all_wallets: true,
            view_company_stats: true
        },
        custody: {
            request_funds: false,
            authorize_transfers: false,
            approve_receipts: true,
            max_approval_limit: 50000 // Can approve up to 50k
        },
        transactions: {
            create: true,
            approve: true,
            record_income: false,
            max_approval_limit: 50000
        },
        projects: {
            create: false,
            edit: true,
            delete: false,
            view: true,
            edit_budget: false
        },
        inventory: {
            create_batch: true,
            consume_material: true,
            view: true
        },
        admin: {
            manage_users: false,
            manage_roles: false,
            invite_users: false,
            change_user_roles: false
        }
    },

    // 👷♂️ Site Engineer - Field Operations
    ENGINEER: {
        financials: {
            view_operational_fund: true,
            view_office_profit: false,
            view_all_wallets: false, // Can only see own wallet
            view_company_stats: false
        },
        custody: {
            request_funds: true,
            authorize_transfers: false,
            approve_receipts: false,
            max_approval_limit: 0
        },
        transactions: {
            create: true, // Can create draft transactions
            approve: false,
            record_income: false,
            max_approval_limit: 0
        },
        projects: {
            create: false,
            edit: false,
            delete: false,
            view: true,
            edit_budget: false
        },
        inventory: {
            create_batch: true,
            consume_material: true,
            view: true
        },
        admin: {
            manage_users: false,
            manage_roles: false,
            invite_users: false,
            change_user_roles: false
        }
    },

    // 💼 Accountant - Financial Management
    ACCOUNTANT: {
        financials: {
            view_operational_fund: true,
            view_office_profit: true,
            view_all_wallets: true,
            view_company_stats: true
        },
        custody: {
            request_funds: false,
            authorize_transfers: true,
            approve_receipts: false,
            max_approval_limit: null
        },
        transactions: {
            create: true,
            approve: false,
            record_income: true,
            max_approval_limit: 0
        },
        projects: {
            create: false,
            edit: false,
            delete: false,
            view: true,
            edit_budget: false
        },
        inventory: {
            create_batch: false,
            consume_material: false,
            view: true
        },
        admin: {
            manage_users: false,
            manage_roles: false,
            invite_users: false,
            change_user_roles: false
        }
    }
};

// Helper function to get default permissions for a role
export const getDefaultPermissions = (roleName) => {
    return DEFAULT_PERMISSIONS[roleName] || DEFAULT_PERMISSIONS.ENGINEER;
};

// System role names that cannot be deleted
export const SYSTEM_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'ENGINEER', 'ACCOUNTANT'];

// Permission categories for UI display
export const PERMISSION_CATEGORIES = {
    financials: {
        label: 'Financial Visibility',
        permissions: [
            { key: 'view_operational_fund', label: 'Can view Project "Operational Fund" (Site Budget)' },
            { key: 'view_office_profit', label: 'Can view Project "Office Revenue" (Company Profit)', sensitive: true },
            { key: 'view_all_wallets', label: 'Can view all engineers\' custody balances' },
            { key: 'view_company_stats', label: 'Can view general company statistics' }
        ]
    },
    custody: {
        label: 'Custody & Expenses',
        permissions: [
            { key: 'request_funds', label: 'Can request funds (Tamweel)' },
            { key: 'authorize_transfers', label: 'Can authorize fund transfers (Give money to others)' },
            { key: 'approve_receipts', label: 'Can approve site receipts' },
            { key: 'max_approval_limit', label: 'Maximum approval limit (EGP)', type: 'number' }
        ]
    },
    transactions: {
        label: 'Transactions',
        permissions: [
            { key: 'create', label: 'Can create draft transactions' },
            { key: 'approve', label: 'Can approve transactions' },
            { key: 'record_income', label: 'Can record income (Client payments)' },
            { key: 'max_approval_limit', label: 'Maximum approval limit (EGP)', type: 'number' }
        ]
    },
    projects: {
        label: 'Project Operations',
        permissions: [
            { key: 'create', label: 'Can create projects' },
            { key: 'edit', label: 'Can edit projects' },
            { key: 'delete', label: 'Can archive/delete projects' },
            { key: 'view', label: 'Can view projects' },
            { key: 'edit_budget', label: 'Can edit project budgets' }
        ]
    },
    inventory: {
        label: 'Inventory Management',
        permissions: [
            { key: 'create_batch', label: 'Can create material batches' },
            { key: 'consume_material', label: 'Can consume material (Log usage)' },
            { key: 'view', label: 'Can view inventory' }
        ]
    },
    admin: {
        label: 'Team Management',
        permissions: [
            { key: 'manage_users', label: 'Can manage users' },
            { key: 'manage_roles', label: 'Can manage roles & permissions' },
            { key: 'invite_users', label: 'Can invite new users' },
            { key: 'change_user_roles', label: 'Can change user roles' }
        ]
    }
};
