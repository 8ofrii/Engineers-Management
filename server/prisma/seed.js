import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Hash password for all test users
<<<<<<< HEAD
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
=======
    const password = await bcrypt.hash('password123', 10);

    // Create Admin User
    const admin = await prisma.user.upsert({
        where: { email: 'admin@construction.com' },
        update: {},
        create: {
            email: 'admin@construction.com',
            password: password,
            name: 'Admin User',
            role: 'ADMIN',
            company: 'Construction ERP',
            phone: '+1234567890',
            isActive: true
        }
>>>>>>> main
    });
    console.log('✅ Created Admin:', admin.email);

    // Create Engineer User
<<<<<<< HEAD
    const engineer = await createOrUpdateUser('engineer@demo.local', {
        password: password,
        name: 'Ahmed Engineer',
        role: 'ENGINEER',
        company: 'Construction ERP',
        phone: '+1234567891',
        isActive: true
=======
    const engineer = await prisma.user.upsert({
        where: { email: 'engineer@construction.com' },
        update: {},
        create: {
            email: 'engineer@construction.com',
            password: password,
            name: 'Ahmed Engineer',
            role: 'ENGINEER',
            company: 'Construction ERP',
            phone: '+1234567891',
            isActive: true
        }
>>>>>>> main
    });
    console.log('✅ Created Engineer:', engineer.email);

    // Create Accountant User
<<<<<<< HEAD
    const accountant = await createOrUpdateUser('accountant@demo.local', {
        password: password,
        name: 'Sarah Accountant',
        role: 'ACCOUNTANT',
        company: 'Construction ERP',
        phone: '+1234567892',
        isActive: true
=======
    const accountant = await prisma.user.upsert({
        where: { email: 'accountant@construction.com' },
        update: {},
        create: {
            email: 'accountant@construction.com',
            password: password,
            name: 'Sarah Accountant',
            role: 'ACCOUNTANT',
            company: 'Construction ERP',
            phone: '+1234567892',
            isActive: true
        }
>>>>>>> main
    });
    console.log('✅ Created Accountant:', accountant.email);

    // Create Project Manager User (NEW)
<<<<<<< HEAD
    const manager = await createOrUpdateUser('manager@demo.local', {
        password: password,
        name: 'Omar Manager',
        role: 'PROJECT_MANAGER',
        company: 'Construction ERP',
        phone: '+1234567893',
        isActive: true
=======
    const manager = await prisma.user.upsert({
        where: { email: 'manager@construction.com' },
        update: {},
        create: {
            email: 'manager@construction.com',
            password: password,
            name: 'Omar Manager',
            role: 'PROJECT_MANAGER',
            company: 'Construction ERP',
            phone: '+1234567893',
            isActive: true
        }
>>>>>>> main
    });
    console.log('✅ Created Project Manager:', manager.email);

    console.log('\n📋 Test Accounts Created:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 ADMIN:');
<<<<<<< HEAD
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
=======
    console.log('   Email: admin@construction.com');
    console.log('   Password: password123');
    console.log('');
    console.log('👔 PROJECT MANAGER (Approver):');
    console.log('   Email: manager@construction.com');
    console.log('   Password: password123');
    console.log('');
    console.log('🔧 ENGINEER (Site Engineer):');
    console.log('   Email: engineer@construction.com');
    console.log('   Password: password123');
    console.log('');
    console.log('💰 ACCOUNTANT:');
    console.log('   Email: accountant@construction.com');
    console.log('   Password: password123');
>>>>>>> main
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
