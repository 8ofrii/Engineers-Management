import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const users = await prisma.user.findMany({
        where: {
            email: {
                equals: 'admin@demo.local',
                mode: 'insensitive'
            }
        },
        select: {
            id: true,
            email: true,
            role: true,
            tenantId: true,
            tenant: {
                select: {
                    id: true,
                    name: true,
                    slug: true
                }
            }
        }
    });

    console.log('All admin@demo.local users:');
    console.log(JSON.stringify(users, null, 2));

    await prisma.$disconnect();
}

run();
