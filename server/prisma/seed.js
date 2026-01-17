import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Hash password for all test users
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
    });
    console.log('✅ Created Admin:', admin.email);

    // Create Engineer User
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
    });
    console.log('✅ Created Engineer:', engineer.email);

    // Create Accountant User
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
    });
    console.log('✅ Created Accountant:', accountant.email);

    console.log('\n📋 Test Accounts Created:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 ADMIN:');
    console.log('   Email: admin@construction.com');
    console.log('   Password: password123');
    console.log('');
    console.log('🔧 ENGINEER:');
    console.log('   Email: engineer@construction.com');
    console.log('   Password: password123');
    console.log('');
    console.log('💰 ACCOUNTANT:');
    console.log('   Email: accountant@construction.com');
    console.log('   Password: password123');
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
