// Diagnostic: lists every user in the DB with tenant + login-relevant flags.
// Run from server/:
//   node scripts/list-users.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            email: true,
            name: true,
            role: true,
            isActive: true,
            isVerified: true,
            mustChangePassword: true,
            tenantId: true,
            tenant: { select: { name: true, slug: true } }
        },
        orderBy: { createdAt: 'asc' }
    });

    if (users.length === 0) {
        console.log('No users in DB. Run: node scripts/setup-test-users.js');
        return;
    }

    console.log(`${users.length} users found:\n`);
    console.table(users.map(u => ({
        email: u.email,
        role: u.role,
        tenant: u.tenant?.name || '(none)',
        slug: u.tenant?.slug || '-',
        active: u.isActive,
        verified: u.isVerified,
        mustReset: u.mustChangePassword
    })));

    const blockers = users.filter(u => !u.isActive || !u.isVerified || !u.tenantId);
    if (blockers.length) {
        console.log('\nUsers that may not log in cleanly (inactive / unverified / no tenant):');
        blockers.forEach(u => {
            const reasons = [];
            if (!u.isActive) reasons.push('isActive=false');
            if (!u.isVerified) reasons.push('isVerified=false');
            if (!u.tenantId) reasons.push('tenantId=null');
            console.log(`  ${u.email}  →  ${reasons.join(', ')}`);
        });
        console.log('\nFix with: node scripts/setup-test-users.js');
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
