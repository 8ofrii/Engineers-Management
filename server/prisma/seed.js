import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Hash password for all test users
    const password = await bcrypt.hash('Demo@1234', 10);

    // Create Default Tenant
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'demo' },
        update: {},
        create: {
            name: 'Demo Construction Co.',
            slug: 'demo'
        }
    });

    const createOrUpdateUser = async (email, data) => {
        const existing = await prisma.user.findFirst({ where: { email, tenantId: tenant.id } });
        if (existing) {
            return prisma.user.update({ where: { id: existing.id }, data });
        }
        return prisma.user.create({ data: { ...data, email, tenantId: tenant.id } });
    };

    // Create Admin User
    const admin = await createOrUpdateUser('admin@demo.local', {
        password: password,
        name: 'Admin User',
        role: 'ADMIN',
        company: 'Construction ERP',
        phone: '+1234567890',
        isActive: true
    });
    console.log('✅ Created Admin:', admin.email);

    // Create Engineer User
    const engineer = await createOrUpdateUser('engineer@demo.local', {
        password: password,
        name: 'Ahmed Engineer',
        role: 'ENGINEER',
        company: 'Construction ERP',
        phone: '+1234567891',
        isActive: true
    });
    console.log('✅ Created Engineer:', engineer.email);

    // Create Accountant User
    const accountant = await createOrUpdateUser('accountant@demo.local', {
        password: password,
        name: 'Sarah Accountant',
        role: 'ACCOUNTANT',
        company: 'Construction ERP',
        phone: '+1234567892',
        isActive: true
    });
    console.log('✅ Created Accountant:', accountant.email);

    // Create Project Manager User (NEW)
    const manager = await createOrUpdateUser('manager@demo.local', {
        password: password,
        name: 'Omar Manager',
        role: 'PROJECT_MANAGER',
        company: 'Construction ERP',
        phone: '+1234567893',
        isActive: true
    });
    console.log('✅ Created Project Manager:', manager.email);

    console.log('\n📋 Test Accounts Created:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 ADMIN:');
    console.log('   Email: admin@demo.local');
    console.log('   Password: Demo@1234');
    console.log('');
    console.log('👔 PROJECT MANAGER (Approver):');
    console.log('   Email: manager@demo.local');
    console.log('   Password: Demo@1234');
    console.log('');
    console.log('🔧 ENGINEER (Site Engineer):');
    console.log('   Email: engineer@demo.local');
    console.log('   Password: Demo@1234');
    console.log('');
    console.log('💰 ACCOUNTANT:');
    console.log('   Email: accountant@demo.local');
    console.log('   Password: Demo@1234');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
