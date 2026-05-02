// Multi-level approval threshold logic.
//
// A tenant can configure thresholds as an ordered array of tiers:
//   [
//     { maxAmount: 5000,  minRole: 'ENGINEER' },         // up to 5,000 EGP - any role
//     { maxAmount: 50000, minRole: 'PROJECT_MANAGER' },  // 5,000–50,000  - PM or higher
//     { maxAmount: null,  minRole: 'ADMIN' }             // > 50,000      - admin only
//   ]
//
// The first tier whose maxAmount >= amount (or maxAmount === null for the
// fallback) wins. If a tenant hasn't configured anything, we fall back to
// DEFAULT_THRESHOLDS below — sensible Egyptian-construction defaults.

export const ROLE_RANK = {
    ENGINEER: 1,
    ACCOUNTANT: 1,
    PROJECT_MANAGER: 2,
    ADMIN: 3,
    SUPER_ADMIN: 4
};

export const DEFAULT_THRESHOLDS = [
    { maxAmount: 5000, minRole: 'ENGINEER' },
    { maxAmount: 50000, minRole: 'PROJECT_MANAGER' },
    { maxAmount: null, minRole: 'ADMIN' }
];

const isValidRole = (r) => Object.prototype.hasOwnProperty.call(ROLE_RANK, r);

/**
 * Validate a thresholds payload. Returns null on success, or a string with
 * the first error encountered. Used by the PUT /api/tenant/approval-thresholds
 * endpoint before persisting.
 */
export const validateThresholds = (input) => {
    if (!Array.isArray(input)) return 'thresholds must be an array';
    if (input.length === 0) return 'thresholds must contain at least one tier';

    let sawNullCap = false;
    for (let i = 0; i < input.length; i++) {
        const tier = input[i];
        if (!tier || typeof tier !== 'object') return `tier ${i} must be an object`;

        const { maxAmount, minRole } = tier;
        if (maxAmount !== null && (typeof maxAmount !== 'number' || maxAmount <= 0)) {
            return `tier ${i}: maxAmount must be a positive number or null`;
        }
        if (!isValidRole(minRole)) {
            return `tier ${i}: minRole must be one of ${Object.keys(ROLE_RANK).join(', ')}`;
        }

        if (maxAmount === null) {
            if (sawNullCap) return 'only one tier may have maxAmount: null (the fallback)';
            sawNullCap = true;
        }
    }

    if (!sawNullCap) return 'last tier must have maxAmount: null as the fallback';
    return null;
};

const getThresholds = (tenant) => {
    const cfg = tenant?.approvalThresholds;
    if (!Array.isArray(cfg) || cfg.length === 0) return DEFAULT_THRESHOLDS;
    return cfg;
};

/**
 * Returns the minimum-role string required to approve a transaction of the
 * given amount under the given tenant's config.
 */
export const requiredRoleForAmount = (amount, tenant) => {
    const thresholds = getThresholds(tenant);
    const sorted = [...thresholds].sort((a, b) => {
        if (a.maxAmount === null) return 1;
        if (b.maxAmount === null) return -1;
        return a.maxAmount - b.maxAmount;
    });

    for (const tier of sorted) {
        if (tier.maxAmount === null || Number(amount) <= tier.maxAmount) {
            return tier.minRole;
        }
    }
    // Should never reach here if validateThresholds enforces a null fallback.
    return 'ADMIN';
};

/**
 * Can the caller's role auto-approve a transaction at this amount?
 */
export const canAutoApprove = (callerRole, amount, tenant) => {
    const required = requiredRoleForAmount(amount, tenant);
    return (ROLE_RANK[callerRole] || 0) >= (ROLE_RANK[required] || Infinity);
};

/**
 * Throw a 403-shaped error if the approver doesn't have sufficient rank.
 * The transactionController catches it and returns 403.
 */
export class InsufficientApprovalRankError extends Error {
    constructor(callerRole, requiredRole, amount) {
        super(`Approving ${amount} EGP requires at least ${requiredRole}; ${callerRole} is below threshold.`);
        this.name = 'InsufficientApprovalRankError';
        this.statusCode = 403;
        this.callerRole = callerRole;
        this.requiredRole = requiredRole;
        this.amount = amount;
    }
}

export const ensureCanApprove = (callerRole, amount, tenant) => {
    const required = requiredRoleForAmount(amount, tenant);
    if ((ROLE_RANK[callerRole] || 0) < (ROLE_RANK[required] || Infinity)) {
        throw new InsufficientApprovalRankError(callerRole, required, amount);
    }
    return required;
};
