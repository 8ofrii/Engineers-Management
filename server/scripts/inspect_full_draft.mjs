import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const draft = await prisma.transactionDraft.findUnique({
        where: { id: 'ea1d54f7-1a35-42e1-bfd1-9d762c0bed08' }
    });
    console.log(JSON.stringify(draft, null, 2));
    await prisma.$disconnect();
}

run();
