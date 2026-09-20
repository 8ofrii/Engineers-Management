import prisma from '../lib/prisma.js';

async function main() {
    console.log('Applying supplier inventory schema changes...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "material_batches" ALTER COLUMN "projectId" DROP NOT NULL;`);
    console.log('1. Dropped NOT NULL on material_batches.projectId');
    
    await prisma.$executeRawUnsafe(`ALTER TABLE "material_batches" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;`);
    console.log('2. Added supplierId to material_batches');

    await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_batches_supplierId_fkey') THEN
                ALTER TABLE "material_batches" ADD CONSTRAINT "material_batches_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
            END IF;
        END $$;
    `);
    console.log('3. Added foreign key constraint for supplierId');

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "material_batches_supplierId_status_idx" ON "material_batches"("supplierId", "status");`);
    console.log('4. Created index on material_batches(supplierId, status)');

    await prisma.$executeRawUnsafe(`ALTER TABLE "material_usage" ALTER COLUMN "projectId" DROP NOT NULL;`);
    console.log('5. Dropped NOT NULL on material_usage.projectId');

    console.log('All migrations applied successfully!');
}

main()
    .catch(e => {
        console.error('Migration error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
