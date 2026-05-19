import prisma from '../lib/prisma.js';

/**
 * Script to list all users in the database
 */

const listUsers = async () => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                company: true,
                isActive: true,
                isVerified: true,
                tenantId: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log('\n📋 All Users in Database:\n');
        console.log('='.repeat(120));

        users.forEach((user, index) => {
            console.log(`\n${index + 1}. ${user.name}`);
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   👤 Role: ${user.role}`);
            console.log(`   🏢 Company: ${user.company || 'N/A'}`);
            console.log(`   ✓ Active: ${user.isActive ? '✅' : '❌'}`);
            console.log(`   ✓ Verified: ${user.isVerified ? '✅' : '❌'}`);
            console.log(`   🏷️  Tenant ID: ${user.tenantId || 'N/A'}`);
        });

        console.log('\n' + '='.repeat(120));
        console.log(`\n📊 Total Users: ${users.length}\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
};

listUsers();
