
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting duplicate phone number fix...');

    // 1. Convert empty string phones to NULL (since empty strings are duplicates of each other)
    const result = await prisma.user.updateMany({
        where: { phone: '' },
        data: { phone: null }
    });
    console.log(`Updated ${result.count} users with empty phone strings to NULL.`);

    // 2. Find ALL users with non-null phones
    const users = await prisma.user.findMany({
        where: { phone: { not: null } },
        orderBy: { createdAt: 'asc' }, // Keep the oldest/first one
        select: { id: true, phone: true, tenantId: true, name: true, email: true }
    });

    const seen = new Map(); // Key: "tenantId-phone", Value: User (first one found)
    const duplicatesToFix = [];

    for (const user of users) {
        const key = `${user.tenantId}-${user.phone}`;
        if (seen.has(key)) {
            duplicatesToFix.push(user);
        } else {
            seen.set(key, user);
        }
    }

    console.log(`Found ${duplicatesToFix.length} duplicate phone entries to fix.`);

    for (const user of duplicatesToFix) {
        const newPhone = `${user.phone}_DUP_${Math.floor(Math.random() * 1000)}`;
        console.log(`Fixing User: ${user.name} (${user.email}) - Phone: ${user.phone} -> ${newPhone}`);

        await prisma.user.update({
            where: { id: user.id },
            data: { phone: newPhone }
        });
    }

    console.log('Duplicate phone numbers resolved.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
