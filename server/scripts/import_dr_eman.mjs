import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('=== STARTING DR. EMAN PROJECT TRANSACTION IMPORT ===');

    const PROJECT_ID = '7941c5ff-dbb5-45c7-8c07-c2dc975d45ca';
    const TENANT_ID = 'b21df23e-4f2a-4f26-b2c3-76a8e76f11ec';
    const CLIENT_ID = '26cee822-dd19-4341-be13-2196cb03052e'; // Dr/ Eman Elbetar
    const USER_ID = '28d626a3-1f12-4f0b-a78f-8d83bd828f1f'; // Eng. Hossam Elbetar
    const CASH_SAFE_ID = '84cbfbd2-7df6-4acf-b3d0-1f412b40601b'; // الخزينة النقدية الرئيسية
    const BANK_SAFE_ID = '633a687a-760f-485f-9dfe-1ae928eaffb1'; // حساب الشركة

    // 1. Verify Project
    const project = await prisma.project.findUnique({
        where: { id: PROJECT_ID },
        include: { transactions: { select: { id: true } } }
    });

    if (!project) throw new Error('Project Dr. Eman not found!');
    console.log(`Target Project: "${project.name}" (Existing Txs: ${project.transactions.length})`);
    console.log(`Financials -> Operational: ${project.operationalFund}, Actual Cost: ${project.actualCost}, Safe: ${project.projectSafeBalance}`);

    // 2. Master Data ID Maps
    const WORKMEN = {
        'mahmoud-raaft': 'adbdf818-ae3f-4adf-8e97-289e86b33f5e', // محمود رافت (MASON)
        'raoof-plumber': '32d0d753-f279-4602-9439-93ed609d0387', // روف سباك (PLUMBER)
        'raaft-shnoda': 'bc06d0d1-0000-4210-b928-b95070ca09ee',  // رافت شنودة (INSULATION_CONTRACTOR)
        'walid-worker': '7fd6c9a8-e8d9-4fad-b488-8b8448f7d40c',  // وليد (تشوين / STOCKING_WORKER)
        'adel-talaat': 'f4467fc8-af20-42f8-aede-5d1239d77a0d'    // عادل طلعت (LABORER)
    };

    const SUPPLIERS = {
        'abo-donia': '763399fb-de93-47c2-b691-ef962162f204',     // ابو دنيا (BRICKS)
        'karim-akshar': '06e7ef20-cad7-4554-9ebc-ea1e6c7d09ad',  // كريم الاكشر (MATERIALS)
        'sayed-najib': '51d4a13f-5651-48d2-9648-707bc435c0f0'    // سيد نجيب (STEEL / CEMENT / MATERIALS)
    };

    // Verify all IDs exist in DB
    for (const [k, id] of Object.entries(WORKMEN)) {
        const w = await prisma.workman.findUnique({ where: { id } });
        if (!w) throw new Error(`Workman key "${k}" with ID ${id} not found in DB`);
        console.log(`[OK] Workman verified: ${w.nameAr || w.name} (${w.trade})`);
    }

    for (const [k, id] of Object.entries(SUPPLIERS)) {
        const s = await prisma.supplier.findUnique({ where: { id } });
        if (!s) throw new Error(`Supplier key "${k}" with ID ${id} not found in DB`);
        console.log(`[OK] Supplier verified: ${s.nameAr || s.name} (${s.category})`);
    }

    // 3. Transactions Definition
    const transactions = [
        {
            code: 'IN-1',
            type: 'INCOME',
            category: 'PAYMENT',
            amount: 100000,
            date: new Date('2026-09-05T10:00:00.000Z'),
            description: 'دفعة نقدية تحت الحساب للمشروع من العميل',
            clientId: CLIENT_ID,
            safeId: BANK_SAFE_ID,
            paymentMethod: 'BANK_TRANSFER',
            beneficiary: 'د/ايمان البيطار (Dr/ Eman Elbetar)'
        },
        {
            code: 'EXP-1',
            type: 'EXPENSE',
            category: 'MASONRY_LABOR',
            amount: 9750,
            date: new Date('2026-09-05T11:00:00.000Z'),
            description: 'مصنعيه بناء (13 الف طوبه )',
            workmanId: WORKMEN['mahmoud-raaft'],
            safeId: CASH_SAFE_ID,
            paymentMethod: 'CASH',
            beneficiary: 'محمود رافت (Mahmoud Raaft)'
        },
        {
            code: 'EXP-2',
            type: 'EXPENSE',
            category: 'PLUMBING_LABOR',
            amount: 10000,
            date: new Date('2026-09-05T11:30:00.000Z'),
            description: 'مصنعيه سباك',
            workmanId: WORKMEN['raoof-plumber'],
            safeId: CASH_SAFE_ID,
            paymentMethod: 'CASH',
            beneficiary: 'روف (Raoof)'
        },
        {
            code: 'EXP-3',
            type: 'EXPENSE',
            category: 'INSULATION_LABOR',
            amount: 30000,
            date: new Date('2026-09-05T12:00:00.000Z'),
            description: 'مصنعيه + خامات عزل',
            workmanId: WORKMEN['raaft-shnoda'],
            safeId: CASH_SAFE_ID,
            paymentMethod: 'CASH',
            beneficiary: 'رافت شنودة (مقاول عزل)'
        },
        {
            code: 'EXP-4',
            type: 'EXPENSE',
            category: 'BRICKS',
            amount: 32500,
            date: new Date('2026-09-05T12:30:00.000Z'),
            description: '13 الف طوبه (13*2500)',
            supplierId: SUPPLIERS['abo-donia'],
            safeId: CASH_SAFE_ID,
            paymentMethod: 'CASH',
            beneficiary: 'ابو دنيا'
        },
        {
            code: 'EXP-5',
            type: 'EXPENSE',
            category: 'STOCKING',
            amount: 3300,
            date: new Date('2026-09-05T13:00:00.000Z'),
            description: 'تشوين 13 الف طوبه',
            supplierId: SUPPLIERS['abo-donia'],
            safeId: CASH_SAFE_ID,
            paymentMethod: 'CASH',
            beneficiary: 'ابو دنيا'
        },
        {
            code: 'EXP-6',
            type: 'EXPENSE',
            category: 'INSULATION_LABOR',
            amount: 20000,
            date: new Date('2026-09-05T13:30:00.000Z'),
            description: 'مصنعيه + خامات عزل',
            workmanId: WORKMEN['raaft-shnoda'],
            safeId: CASH_SAFE_ID,
            paymentMethod: 'CASH',
            beneficiary: 'رافت شنودة (مقاول عزل)'
        },
        {
            code: 'EXP-7',
            type: 'EXPENSE',
            category: 'SAND',
            amount: 1350,
            date: new Date('2026-09-05T14:00:00.000Z'),
            description: '5 م رمل (5*270)',
            supplierId: SUPPLIERS['karim-akshar'],
            safeId: CASH_SAFE_ID,
            paymentMethod: 'CASH',
            beneficiary: 'كريم الاكشر'
        },
        {
            code: 'EXP-8',
            type: 'EXPENSE',
            category: 'SITE_CLEANING',
            amount: 1000,
            date: new Date('2026-09-05T14:30:00.000Z'),
            description: '2 عماله نظافه سطح',
            workmanId: WORKMEN['walid-worker'],
            safeId: CASH_SAFE_ID,
            paymentMethod: 'CASH',
            beneficiary: 'وليد (Walid)'
        },
        {
            code: 'EXP-9',
            type: 'EXPENSE',
            category: 'CEMENT',
            amount: 8000,
            date: new Date('2026-09-05T15:00:00.000Z'),
            description: '2 طن اسمنت ( بناء سطح + دور اخير )',
            supplierId: SUPPLIERS['sayed-najib'],
            safeId: CASH_SAFE_ID,
            paymentMethod: 'CASH',
            beneficiary: 'سيد نجيب (Sayed Najib)'
        },
        {
            code: 'EXP-10',
            type: 'EXPENSE',
            category: 'STOCKING',
            amount: 2000,
            date: new Date('2026-09-05T15:30:00.000Z'),
            description: '4 عماله تشوين + تطليع عزل',
            workmanId: WORKMEN['walid-worker'],
            safeId: CASH_SAFE_ID,
            paymentMethod: 'CASH',
            beneficiary: 'وليد (Walid)'
        },
        {
            code: 'EXP-11',
            type: 'EXPENSE',
            category: 'SITE_CLEANING',
            amount: 500,
            date: new Date('2026-09-05T16:00:00.000Z'),
            description: 'عماله نظافه سطح',
            workmanId: WORKMEN['adel-talaat'],
            safeId: CASH_SAFE_ID,
            paymentMethod: 'CASH',
            beneficiary: 'عادل طلعت (Adel Talaat - LABORER)'
        },
        {
            code: 'EXP-12',
            type: 'EXPENSE',
            category: 'MATERIALS',
            amount: 2500,
            date: new Date('2026-09-05T16:30:00.000Z'),
            description: '3م رمل + 0.5 طن',
            supplierId: SUPPLIERS['sayed-najib'],
            safeId: CASH_SAFE_ID,
            paymentMethod: 'CASH',
            beneficiary: 'سيد نجيب (Sayed Najib)'
        },
        {
            code: 'EXP-13',
            type: 'EXPENSE',
            category: 'CEMENT',
            amount: 2150,
            date: new Date('2026-09-05T17:00:00.000Z'),
            description: '10 شكاير اسمنت (للعزل)',
            supplierId: SUPPLIERS['sayed-najib'],
            safeId: CASH_SAFE_ID,
            paymentMethod: 'CASH',
            beneficiary: 'سيد نجيب (Sayed Najib)'
        }
    ];

    let totalIncome = 0;
    let totalExpense = 0;

    for (const t of transactions) {
        if (t.type === 'INCOME') totalIncome += t.amount;
        else totalExpense += t.amount;
    }

    console.log(`\nTotals -> Income: ${totalIncome.toLocaleString()} EGP | Expenses: ${totalExpense.toLocaleString()} EGP`);
    if (totalIncome !== 100000 || totalExpense !== 123050) {
        throw new Error('Totals mismatch! Expected 100,000 income and 123,050 expenses');
    }

    const netSafeBalance = totalIncome - totalExpense; // -23,050

    console.log(`Calculated Net Safe Balance: ${netSafeBalance.toLocaleString()} EGP`);
    console.log('Writing 14 transactions to database in transaction block...');

    await prisma.$transaction(async (tx) => {
        for (const t of transactions) {
            await tx.transaction.create({
                data: {
                    type: t.type,
                    category: t.category,
                    amount: t.amount,
                    description: t.description,
                    status: 'APPROVED',
                    projectId: PROJECT_ID,
                    clientId: t.clientId || null,
                    supplierId: t.supplierId || null,
                    workmanId: t.workmanId || null,
                    safeId: t.safeId,
                    payerUserId: USER_ID,
                    createdBy: USER_ID,
                    transactionDate: t.date,
                    paymentMethod: t.paymentMethod,
                    tenantId: TENANT_ID,
                    beneficiary: t.beneficiary,
                    notes: `CODE:${t.code}`
                }
            });

            // Update Workman totalPaid if linked
            if (t.workmanId) {
                await tx.workman.update({
                    where: { id: t.workmanId },
                    data: { totalPaid: { increment: t.amount } }
                });
            }
        }

        // Update Project Totals
        await tx.project.update({
            where: { id: PROJECT_ID },
            data: {
                operationalFund: totalIncome,
                actualCost: totalExpense,
                officeRevenue: 0,
                projectSafeBalance: netSafeBalance,
                completionPercent: 25 // 123k out of 500k budget
            }
        });

        // Update Company Safes
        // Bank safe +100,000
        await tx.companySafe.update({
            where: { id: BANK_SAFE_ID },
            data: { balance: { increment: totalIncome } }
        });

        // Cash safe -123,050
        await tx.companySafe.update({
            where: { id: CASH_SAFE_ID },
            data: { balance: { decrement: totalExpense } }
        });
    });

    console.log('=== SUCCESS! All 14 transactions from Dr. Eman project successfully imported and verified! ===');
}

main()
    .catch((err) => {
        console.error('Import failed with error:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
