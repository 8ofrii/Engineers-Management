import fs from 'fs';
import prisma from './lib/prisma.js';
import * as XLSX from '../client/node_modules/xlsx/xlsx.mjs';

const EXCEL_PATH = 'C:/Users/Administrator/.gemini/antigravity/brain/04fc6468-ed8b-4e17-a115-2c4b75191bb0/.user_uploaded/media_1790804087492.xlsx';

async function main() {
    console.log('--- STARTING WALID PROJECT TRANSACTION IMPORT ---');

    // 1. Target Constants
    const TARGET_PROJECT_ID = '7a06933c-0744-4e82-b8e5-82f01055a522';
    const TENANT_ID = 'b21df23e-4f2a-4f26-b2c3-76a8e76f11ec';
    const CLIENT_ID = 'f5a2db47-fab2-47e5-b76b-e51828ef5757'; // Eng.walid
    const USER_ID = '28d626a3-1f12-4f0b-a78f-8d83bd828f1f'; // Eng. Hossam Elbetar
    const CASH_SAFE_ID = '84cbfbd2-7df6-4acf-b3d0-1f412b40601b'; // الخزينة النقدية الرئيسية

    const project = await prisma.project.findUnique({
        where: { id: TARGET_PROJECT_ID }
    });

    if (!project) {
        throw new Error(`Project ${TARGET_PROJECT_ID} not found`);
    }

    console.log(`Found Project: "${project.name}" (Management Fee: ${project.managementFeePercent}%)`);

    // 2. Master Data ID Maps
    const SUPPLIERS = {
        'el-gazzar': '4ccbb521-8c99-402b-a4ee-25dff6486be2',      // El-Gazzar Ceramics
        'islam-abo-yasser': '4b83f853-8730-448e-9d27-a65bf0af5a76',// Islam abo yasser
        'el-aasar': '33356dd4-288c-4133-94cd-5d24102f4d93',      // El-Aasar HVAC
        'jotun': '2adcdab6-4752-4046-8ea1-999ecd082d80',         // Jotun Paints
        'site-supplies': 'dd1e13bf-87d8-43bb-b798-dfa3de1a7e55', // Site Supplies Supplier
        'rana-hassan': '84c51f01-41e5-4047-beb9-25c6544cb9c8',   // Rana Hassan
        'transport': '6e61bc87-047c-4172-833f-1af10edce6a7'     // Transport & Logistics
    };

    const WORKMEN = {
        'mohamed-plumber': '2216ff8f-0679-40b3-9681-a3ed96b6ef55', // Mohamed Plumber
        'mahmoud-bannan': '3de18aaa-fb77-4819-9973-6603114d5848',  // Mahmoud El-Bannan
        'ahmed-plasterer': '1ded0eba-e4a6-412e-9e31-67ce42ea1aae', // Ahmed Plasterer
        'mahmoud-rika': '936674e3-bd33-419f-b289-f867329e99d9',    // Mahmoud Rika
        'antar-blacksmith': 'a7dccdf6-8542-48b2-8b24-74deb05c2e6b',// Antar (7dad)
        'walid-worker': '7fd6c9a8-e8d9-4fad-b488-8b8448f7d40c',    // Walid
        'mohamed-ali': 'a035b3d5-9df9-45c1-9332-615719f7cc12',     // Mohamed Ali
        'mostafa-gypsum': '2a093f3c-0ac6-42ed-be15-c01607c293d5',  // Mostafa Gypsum
        'samah-painter': '600675fb-7146-4e70-99df-48e89c6b0001'    // Samah Abd Elhalim
    };

    // Category mapping helper
    function mapCategory(catStr, isIncome) {
        if (isIncome) return 'PAYMENT';
        if (!catStr) return 'MATERIALS';
        if (catStr.includes('CERAMIC_MATERIALS')) return 'CERAMIC_MATERIALS';
        if (catStr.includes('PLUMBING_MATERIALS')) return 'PLUMBING_MATERIALS';
        if (catStr.includes('MASONRY_LABOR')) return 'MASONRY_LABOR';
        if (catStr.includes('SITE_SUPPLIES')) return 'MATERIALS';
        if (catStr.includes('DESIGN_FEES')) return 'DRAWINGS';
        if (catStr.includes('PLASTER_LABOR')) return 'PLASTERING_LABOR';
        if (catStr.includes('PLUMBING_LABOR')) return 'PLUMBING_LABOR';
        if (catStr.includes('HVAC')) return 'HVAC_PREP';
        if (catStr.includes('ELECTRICITY_MATERIALS')) return 'ELECTRICAL_MATERIALS';
        if (catStr.includes('ELECTRICAL_LABOR')) return 'ELECTRICAL_LABOR';
        if (catStr.includes('TRANSPORTATION')) return 'TRANSPORT';
        if (catStr.includes('TIPS')) return 'TIPS';
        if (catStr.includes('IRON_WORKS')) return 'BLACKSMITH_LABOR';
        if (catStr.includes('GENERAL_LABOR')) return 'GENERAL_LABOR';
        if (catStr.includes('FLOORING_LABOR')) return 'CERAMIC_LABOR';
        if (catStr.includes('GYPSUM_LABOR')) return 'GYPSUM_LABOR';
        if (catStr.includes('GYPSUM_MATERIALS')) return 'GYPSUM_MATERIALS';
        if (catStr.includes('PAINT_LABOR')) return 'PAINTING_LABOR';
        if (catStr.includes('PAINTING_MATERIALS')) return 'PAINTING_MATERIALS';
        return 'MATERIALS';
    }

    // 3. Read Excel
    const buf = fs.readFileSync(EXCEL_PATH);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['المعاملات المالية المفصلة'];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const rows = raw.slice(4).filter(r => r && r[0] && (String(r[0]).startsWith('IN-') || String(r[0]).startsWith('EX-')));

    console.log(`Read ${rows.length} rows from Excel sheet.`);

    const transactionsToInsert = [];
    let totalIncome = 0;
    let totalExpense = 0;
    let totalProfit = 0;

    // Date spreading for expenses (between 2026-05-02 and 2026-05-22)
    const expenseStartDate = new Date('2026-05-02T09:00:00.000Z').getTime();
    const expenseEndDate = new Date('2026-05-22T17:00:00.000Z').getTime();
    let expenseIdx = 0;
    const totalExpensesCount = 52;

    for (const r of rows) {
        const code = String(r[0]).trim();
        const typeStr = String(r[1]).trim();
        const isIncome = typeStr.includes('INCOME') || code.startsWith('IN-');
        const expenseAmt = Number(r[3]) || 0;
        const incomeAmt = Number(r[4]) || 0;
        const amount = isIncome ? incomeAmt : expenseAmt;
        const desc = String(r[5] || '').trim();
        const catStr = String(r[6] || '').trim();
        const vendorStr = String(r[7] || '').trim();
        const workmanStr = String(r[8] || '').trim();

        const category = mapCategory(catStr, isIncome);

        let date;
        if (isIncome) {
            const rawDate = r[2] ? String(r[2]).trim() : null;
            date = rawDate && !rawDate.includes('-') && rawDate.length === 10 ? new Date(rawDate + 'T10:00:00.000Z') : (rawDate ? new Date(rawDate) : new Date('2026-05-10T10:00:00.000Z'));
        } else {
            // Distribute May 2026 dates chronologically
            const timeStep = (expenseEndDate - expenseStartDate) / (totalExpensesCount - 1);
            date = new Date(expenseStartDate + expenseIdx * timeStep);
            expenseIdx++;
        }

        // Supplier resolution
        let supplierId = null;
        let workmanId = null;
        let beneficiary = null;

        if (vendorStr.includes('الجزار') || vendorStr.toLowerCase().includes('gazzar')) {
            supplierId = SUPPLIERS['el-gazzar'];
            beneficiary = 'الجزار للسيراميك';
        } else if (vendorStr.includes('ياسر') || vendorStr.toLowerCase().includes('yasser')) {
            supplierId = SUPPLIERS['islam-abo-yasser'];
            beneficiary = 'اسلام ابو ياسر';
        } else if (vendorStr.includes('الاعصر') || vendorStr.toLowerCase().includes('aasar')) {
            supplierId = SUPPLIERS['el-aasar'];
            beneficiary = 'الاعصر للتكييفات';
        } else if (vendorStr.includes('جوتن') || vendorStr.toLowerCase().includes('jotun')) {
            supplierId = SUPPLIERS['jotun'];
            beneficiary = 'معرض دهانات جوتن';
        } else if (vendorStr.includes('مستلزمات بناء') || vendorStr.toLowerCase().includes('supplies')) {
            supplierId = SUPPLIERS['site-supplies'];
            beneficiary = 'مورد مستلزمات بناء وموقع';
        } else if (vendorStr.includes('رنا') || vendorStr.toLowerCase().includes('rana')) {
            supplierId = SUPPLIERS['rana-hassan'];
            beneficiary = 'رنا حسن';
        } else if (vendorStr.includes('حسام البيطار')) {
            beneficiary = 'حسام البيطار (مهندس إنشائي)';
        }

        // Workman resolution
        if (workmanStr.includes('محمد سباك') || workmanStr.toLowerCase().includes('plumber')) {
            workmanId = WORKMEN['mohamed-plumber'];
            beneficiary = 'محمد سباك';
        } else if (workmanStr.includes('البنان') || workmanStr.toLowerCase().includes('bannan')) {
            workmanId = WORKMEN['mahmoud-bannan'];
            beneficiary = 'محمود البنان';
        } else if (workmanStr.includes('احمد نقل') || catStr.includes('TRANSPORTATION') || desc.includes('نقل')) {
            supplierId = SUPPLIERS['transport'];
            beneficiary = 'احمد نقل (مقاول النقل)';
        } else if (workmanStr.includes('احمد') || workmanStr.toLowerCase().includes('ahmed')) {
            workmanId = WORKMEN['ahmed-plasterer'];
            beneficiary = 'احمد مبيض محارة';
        } else if (workmanStr.includes('ريكا') || workmanStr.toLowerCase().includes('rika')) {
            workmanId = WORKMEN['mahmoud-rika'];
            beneficiary = 'محمود ريكا';
        } else if (workmanStr.includes('عنتر') || workmanStr.toLowerCase().includes('antar')) {
            workmanId = WORKMEN['antar-blacksmith'];
            beneficiary = 'عنتر (حداد)';
        } else if (workmanStr.includes('وليد') || workmanStr.toLowerCase().includes('walid')) {
            workmanId = WORKMEN['walid-worker'];
            beneficiary = 'وليد (عمال تشوين)';
        } else if (workmanStr.includes('على') || workmanStr.toLowerCase().includes('ali')) {
            workmanId = WORKMEN['mohamed-ali'];
            beneficiary = 'محمد على';
        } else if (workmanStr.includes('مصطفى جبس') || workmanStr.toLowerCase().includes('gypsum')) {
            workmanId = WORKMEN['mostafa-gypsum'];
            beneficiary = 'مصطفى جبس بورد';
        } else if (workmanStr.includes('سامح') || workmanStr.toLowerCase().includes('samah')) {
            workmanId = WORKMEN['samah-painter'];
            beneficiary = 'سامح عبد الحليم';
        }

        if (isIncome) {
            totalIncome += amount;
            transactionsToInsert.push({
                code,
                type: 'INCOME',
                category: 'PAYMENT',
                amount,
                description: desc || 'توريد دفعة من العميل',
                status: 'APPROVED',
                projectId: TARGET_PROJECT_ID,
                clientId: CLIENT_ID,
                safeId: CASH_SAFE_ID,
                payerUserId: USER_ID,
                createdBy: USER_ID,
                transactionDate: date,
                paymentMethod: 'CASH',
                tenantId: TENANT_ID,
                beneficiary: 'Eng.walid'
            });
        } else {
            totalExpense += amount;
            const feeAmount = Math.round(amount * 0.15 * 100) / 100;
            totalProfit += feeAmount;

            transactionsToInsert.push({
                code,
                type: 'EXPENSE',
                category,
                amount,
                description: desc,
                status: 'APPROVED',
                projectId: TARGET_PROJECT_ID,
                supplierId,
                workmanId,
                safeId: CASH_SAFE_ID,
                payerUserId: USER_ID,
                createdBy: USER_ID,
                transactionDate: date,
                paymentMethod: 'CASH',
                tenantId: TENANT_ID,
                beneficiary,
                feeAmount // for linked fee record
            });
        }
    }

    console.log('\n--- VERIFICATION OF TOTALS ---');
    console.log(`Total Income (8 transactions): ${totalIncome.toLocaleString()} EGP (Expected: 530,000)`);
    console.log(`Total Expenses (52 transactions): ${totalExpense.toLocaleString()} EGP (Expected: 490,679)`);
    console.log(`Total 15% Management Fee: ${totalProfit.toLocaleString()} EGP (Expected: 73,601.85)`);
    const projectSafeNet = totalIncome - (totalExpense + totalProfit);
    console.log(`Net Project Safe Balance: ${projectSafeNet.toLocaleString()} EGP (Expected: -34,280.85)`);

    if (totalIncome !== 530000 || totalExpense !== 490679 || Math.abs(totalProfit - 73601.85) > 0.01) {
        throw new Error('Calculated sums do not match the approved sheet numbers! Aborting.');
    }

    console.log('\nAll checks PASSED! Writing to database inside transaction...');

    await prisma.$transaction(async (tx) => {
        // 1. Insert Incomes
        for (const item of transactionsToInsert.filter(t => t.type === 'INCOME')) {
            await tx.transaction.create({
                data: {
                    type: item.type,
                    category: item.category,
                    amount: item.amount,
                    description: item.description,
                    status: item.status,
                    projectId: item.projectId,
                    clientId: item.clientId,
                    safeId: item.safeId,
                    payerUserId: item.payerUserId,
                    createdBy: item.createdBy,
                    transactionDate: item.transactionDate,
                    paymentMethod: item.paymentMethod,
                    tenantId: item.tenantId,
                    beneficiary: item.beneficiary,
                    notes: `CODE:${item.code}`
                }
            });
        }

        // 2. Insert Expenses & Linked Management Fees
        for (const item of transactionsToInsert.filter(t => t.type === 'EXPENSE')) {
            const expTx = await tx.transaction.create({
                data: {
                    type: item.type,
                    category: item.category,
                    amount: item.amount,
                    description: item.description,
                    status: item.status,
                    projectId: item.projectId,
                    supplierId: item.supplierId,
                    workmanId: item.workmanId,
                    safeId: item.safeId,
                    payerUserId: item.payerUserId,
                    createdBy: item.createdBy,
                    transactionDate: item.transactionDate,
                    paymentMethod: item.paymentMethod,
                    tenantId: item.tenantId,
                    beneficiary: item.beneficiary,
                    notes: `CODE:${item.code}`
                }
            });

            // Management fee linked transaction
            await tx.transaction.create({
                data: {
                    type: 'EXPENSE',
                    category: 'MANAGEMENT_FEE_TRANSFER',
                    amount: item.feeAmount,
                    description: `أتعاب إدارة وإشراف (15%) على مصروف بقيمة ${item.amount} ج.م (${item.description})`,
                    status: 'APPROVED',
                    projectId: TARGET_PROJECT_ID,
                    safeId: null, // internal accounting transfer
                    createdBy: USER_ID,
                    transactionDate: item.transactionDate,
                    paymentMethod: 'OTHER',
                    tenantId: TENANT_ID,
                    isOfficeExpense: false,
                    notes: `PARENT_TX:${expTx.id}`
                }
            });

            // Update Workman totalPaid if linked
            if (item.workmanId) {
                await tx.workman.update({
                    where: { id: item.workmanId },
                    data: { totalPaid: { increment: item.amount } }
                });
            }
        }

        // 3. Update Project Financial Totals
        await tx.project.update({
            where: { id: TARGET_PROJECT_ID },
            data: {
                operationalFund: totalIncome,
                actualCost: totalExpense,
                officeRevenue: totalProfit,
                projectSafeBalance: projectSafeNet,
                completionPercent: 85 // In Progress (85% executed)
            }
        });

        // 4. Update Cash Safe Balance: +530,000 (Income) - 490,679 (Expense) = +39,321
        const netCashImpact = totalIncome - totalExpense;
        await tx.companySafe.update({
            where: { id: CASH_SAFE_ID },
            data: { balance: { increment: netCashImpact } }
        });
    });

    console.log('\n--- SUCCESS! ALL 60 TRANSACTIONS + 52 MANAGEMENT FEES INSERTED SUCCESSFULLY! ---');
}

main()
    .catch((err) => {
        console.error('ERROR OCCURRED:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
