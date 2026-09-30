import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const drafts = await prisma.transactionDraft.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
            id: true,
            transcript: true,
            originalMediaUrl: true,
            originalMediaMime: true,
            createdAt: true,
            tenantId: true
        }
    });

    console.log('Latest drafts:', JSON.stringify(drafts, null, 2));
    await prisma.$disconnect();
}

run();
