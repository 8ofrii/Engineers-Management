// Creates a "Demo Co" tenant + four verified test users.
// Idempotent: safe to run multiple times. Existing users are updated to a
// known-good state (tenant attached, verified, active, password reset).
//
// Run from server/:
//   node scripts/setup-test-users.js

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TENANT_SLUG = 'demo-co';
const PASSWORD = 'Demo@1234';

const TEST_USERS = [
    { email: 'admin@demo.local',      name: 'Demo Admin',      role: 'ADMIN',           phone: '+201111111101' },
    { email: 'manager@demo.local',    name: 'Demo Manager',    role: 'PROJECT_MANAGER', phone: '+201111111102' },
    { email: 'engineer@demo.local',   name: 'Demo Engineer',   role: 'ENGINEER',        phone: '+201111111103' },
    { email: 'accountant@demo.local', name: 'Demo Accountant', role: 'ACCOUNTANT',      phone: '+201111111104' }
];

async function main() {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    const tenant = await prisma.tenant.upsert({
        where: { slug: TENANT_SLUG },
        update: { isActive: true },
        create: {
            name: 'Demo Co',
            slug: TENANT_SLUG,
            subscriptionPlan: 'FREE_PILOT',
            isActive: true
        }
    });
    console.log(`Tenant ready: ${tenant.name} (${tenant.id})`);

    for (const u of TEST_USERS) {
        const user = await prisma.user.upsert({
            where: { email_tenantId: { email: u.email, tenantId: tenant.id } },
            update: {
                password: passwordHash,
                name: u.name,
                role: u.role,
                phone: u.phone,
                isActive: true,
                isVerified: true,
                verificationCode: null,
                verificationExpires: null,
                mustChangePassword: false
            },
            create: {
                email: u.email,
                password: passwordHash,
                name: u.name,
                role: u.role,
                phone: u.phone,
                company: 'Demo Co',
                tenantId: tenant.id,
                isActive: true,
                isVerified: true,
                mustChangePassword: false
            }
        });
        console.log(`  ${u.role.padEnd(16)} ${user.email}`);
    }

    console.log('\n────────────── Login credentials ──────────────');
    console.log(`Password (all):  ${PASSWORD}`);
    TEST_USERS.forEach(u => console.log(`  ${u.role.padEnd(16)} ${u.email}`));
    console.log('────────────────────────────────────────────────');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
