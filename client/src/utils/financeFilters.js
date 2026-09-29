/**
 * Utility functions for filtering transactions by "Paid by" (الدافع) and "Paid to" (المدفوع له)
 */

export const isClientIncomeTransaction = (tx) => {
    if (tx.type !== 'INCOME') return false;
    return Boolean(
        tx.clientId ||
        tx.client ||
        tx.paidByClientContact ||
        tx.project?.clientId ||
        (tx.category && ['CLIENT_PAYMENT', 'PAYMENT', 'PROJECT_FUNDING', 'INVOICE_PAYMENT'].includes(tx.category)) ||
        (tx.description && (
            tx.description.includes('دفعة عميل') ||
            tx.description.toLowerCase().includes('client payment') ||
            tx.description.toLowerCase().includes('customer payment')
        ))
    );
};

export const matchesPaidBy = (tx, paidByFilter, users = [], clients = []) => {
    if (!paidByFilter || paidByFilter === 'ALL') return true;

    const isClientIncome = isClientIncomeTransaction(tx);

    if (paidByFilter === 'ALL_MEMBERS') {
        // Client income is paid by clients, NEVER by company members!
        if (isClientIncome) return false;
        if (tx.type === 'EXPENSE') return true;
        return Boolean(tx.payerUserId || tx.payer);
    }

    if (paidByFilter === 'ALL_CLIENTS') {
        if (isClientIncome) return true;
        return Boolean(tx.clientId || tx.client || tx.paidByClientContact || tx.project?.clientId);
    }

    if (paidByFilter.startsWith('MEMBER:')) {
        const targetId = paidByFilter.replace('MEMBER:', '');

        // CRITICAL FIX: Client payments received as income are paid by the CLIENT,
        // never by the user who created/logged the transaction in the system!
        if (isClientIncome) return false;

        // If the transaction explicitly assigns this member as payer
        if (tx.payerUserId === targetId || tx.payer?.id === targetId) return true;

        // For EXPENSES only: if no explicit payerUserId, fall back to the creator/user who incurred the expense
        if (tx.type === 'EXPENSE' && (tx.createdBy === targetId || tx.user?.id === targetId)) {
            return true;
        }

        // Check transactionFrom string for member name (expenses or internal transfers)
        if (tx.type === 'EXPENSE') {
            const u = users.find(x => x.id === targetId);
            if (u) {
                const uName = (u.name || '').trim().toLowerCase();
                const from = (tx.transactionFrom || '').trim().toLowerCase();
                if (uName && from && from.includes(uName)) return true;
            }
        }

        return false;
    }

    if (paidByFilter.startsWith('CLIENT:')) {
        const targetId = paidByFilter.replace('CLIENT:', '');
        if (tx.clientId === targetId || tx.client?.id === targetId) return true;
        if (tx.project?.clientId === targetId) return true;
        const c = clients.find(x => x.id === targetId);
        if (c) {
            const cName = (c.name || '').trim().toLowerCase();
            const from = (tx.transactionFrom || '').trim().toLowerCase();
            const contact = (tx.paidByClientContact || '').trim().toLowerCase();
            const b = (tx.beneficiary || '').trim().toLowerCase();
            const desc = (tx.description || '').trim().toLowerCase();
            if (cName && (
                (from && from.includes(cName)) ||
                (contact && contact.includes(cName)) ||
                (tx.type === 'INCOME' && ((b && b.includes(cName)) || (desc && desc.includes(cName))))
            )) {
                return true;
            }
        }
        return false;
    }

    if (paidByFilter === tx.payerUserId) return true;
    if (tx.type === 'EXPENSE' && paidByFilter === tx.createdBy) return true;
    if (paidByFilter === tx.clientId) return true;
    return false;
};

export const matchesPaidTo = (tx, paidToFilter, users = [], workmen = [], suppliers = []) => {
    if (!paidToFilter || paidToFilter === 'ALL') return true;

    // Income transactions are funds received from clients into company accounts.
    // They are not payments to workmen or suppliers.
    if (tx.type === 'INCOME') {
        if (paidToFilter === 'ALL_WORKMEN' || paidToFilter.startsWith('WORKMAN:') ||
            paidToFilter === 'ALL_SUPPLIERS' || paidToFilter.startsWith('SUPPLIER:')) {
            return false;
        }
    }

    if (paidToFilter === 'ALL_MEMBERS') {
        if (tx.toEngineerId || tx.toEngineer) return true;
        if (tx.category === 'CUSTODY_TRANSFER' || tx.category === 'MANAGEMENT_FEE_TRANSFER') return true;
        const b = (tx.beneficiary || '').trim().toLowerCase();
        const to = (tx.transactionTo || '').trim().toLowerCase();
        return users.some(u => {
            const n = (u.name || '').trim().toLowerCase();
            return n && (b.includes(n) || to.includes(n));
        });
    }

    if (paidToFilter === 'ALL_WORKMEN') {
        return Boolean(
            tx.workmanId || 
            tx.workman || 
            (tx.category && ['LABOR', 'WORKMANSHIP', 'LABOR_WAGES', 'MASONRY_LABOR', 'GENERAL_LABOR', 'CONTRACTING'].includes(tx.category))
        );
    }

    if (paidToFilter === 'ALL_SUPPLIERS') {
        return Boolean(
            tx.supplierId || 
            tx.supplier || 
            (tx.category && ['MATERIALS', 'SUPPLIERS', 'MATERIALS_PURCHASE', 'EQUIPMENT', 'BRICKS', 'STEEL', 'CEMENT', 'STOCKING'].includes(tx.category))
        );
    }

    if (paidToFilter.startsWith('MEMBER:')) {
        const targetId = paidToFilter.replace('MEMBER:', '');
        if (tx.toEngineerId === targetId || tx.toEngineer?.id === targetId) return true;
        const u = users.find(x => x.id === targetId);
        if (u) {
            const uName = (u.name || '').trim().toLowerCase();
            const b = (tx.beneficiary || '').trim().toLowerCase();
            const to = (tx.transactionTo || '').trim().toLowerCase();
            if (uName && (b.includes(uName) || to.includes(uName))) return true;
        }
        return false;
    }

    if (paidToFilter.startsWith('WORKMAN:')) {
        const targetId = paidToFilter.replace('WORKMAN:', '');
        if (tx.workmanId === targetId || tx.workman?.id === targetId) return true;
        const w = workmen.find(x => x.id === targetId);
        if (w) {
            const wName = (w.name || '').trim().toLowerCase();
            const wNameAr = (w.nameAr || '').trim().toLowerCase();
            const b = (tx.beneficiary || '').trim().toLowerCase();
            const to = (tx.transactionTo || '').trim().toLowerCase();
            const wkName = (tx.workman?.name || '').trim().toLowerCase();
            if (wName && (b.includes(wName) || to.includes(wName) || wkName.includes(wName))) return true;
            if (wNameAr && (b.includes(wNameAr) || to.includes(wNameAr))) return true;
        }
        return false;
    }

    if (paidToFilter.startsWith('SUPPLIER:')) {
        const targetId = paidToFilter.replace('SUPPLIER:', '');
        if (tx.supplierId === targetId || tx.supplier?.id === targetId) return true;
        const s = suppliers.find(x => x.id === targetId);
        if (s) {
            const sName = (s.name || '').trim().toLowerCase();
            const sCompany = (s.company || '').trim().toLowerCase();
            const b = (tx.beneficiary || '').trim().toLowerCase();
            const to = (tx.transactionTo || '').trim().toLowerCase();
            const spName = (tx.supplier?.name || '').trim().toLowerCase();
            if (sName && (b.includes(sName) || to.includes(sName) || spName.includes(sName))) return true;
            if (sCompany && (b.includes(sCompany) || to.includes(sCompany))) return true;
        }
        return false;
    }

    if (tx.toEngineerId === paidToFilter || tx.workmanId === paidToFilter || tx.supplierId === paidToFilter) return true;
    return false;
};
