import prisma from '../lib/prisma.js';

async function migrate() {
    try {
        console.log('Applying migration: add phones to tenants...');
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "phones" text[] DEFAULT '{}'::text[];
        `);
        await prisma.$executeRawUnsafe(`
            UPDATE "tenants" 
            SET "phones" = ARRAY["phone"] 
            WHERE "phone" IS NOT NULL AND ("phones" IS NULL OR cardinality("phones") = 0);
        `);
        console.log('Migration applied successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
