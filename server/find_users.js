import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching Admins...");
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, take: 1 });
    console.log("Admins:", admins.map(u => u.email));

    console.log("Fetching Engineers...");
    const engineers = await prisma.user.findMany({ where: { role: 'ENGINEER' }, take: 2 });
    console.log("Engineers:", engineers.map(u => ({ email: u.email, id: u.id })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
