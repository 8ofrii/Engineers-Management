import fs from 'fs';
import prisma from '../lib/prisma.js';
import * as XLSX from '../../client/node_modules/xlsx/xlsx.mjs';

const MAPPED_FILE = 'C:/Users/Administrator/.gemini/antigravity/brain/04fc6468-ed8b-4e17-a115-2c4b75191bb0/Project_2_AlGazzar2_Construction_Mapped.xlsx';

async function main() {
    console.log('=== STARTING AL-GAZZAR 2 PHASE 2 TRANSACTION IMPORT ===');

    const PROJECT_ID = '1fc505e8-81c3-4b9a-a537-a03d8b0dc9e1';
    const TENANT_ID = 'b21df23e-4f2a-4f26-b2c3-76a8e76f11ec';
    const CLIENT_ID = 'cddd2af1-ec9b-4d9e-8f59-0fc68a3a4f39'; // حسين بيومى الجزار
    const USER_ID = '28d626a3-1f12-4f0b-a78f-8d83bd828f1f'; // Eng. Hossam Elbetar
    const CASH_SAFE_ID = '84cbfbd2-7df6-4acf-b3d0-1f412b40601b'; // الخزينة النقدية الرئيسية
    const BANK_SAFE_ID = '633a687a-760f-485f-9dfe-1ae928eaffb1'; // حساب الشركة

    // Check project exists
    const project = await prisma.project.findUnique({
        where: { id: PROJECT_ID },
        include: { transactions: { select: { id: true } } }
    });

    if (!project) throw new Error('Project Al-Gazzar 2 not found');
    console.log(`Target Project: "${project.name}" (Existing Txs: ${project.transactions.length})`);
    console.log(`Current Financials -> Operational Fund: ${project.operationalFund}, Actual Cost: ${project.actualCost}, Office Revenue: ${project.officeRevenue}, Safe Balance: ${project.projectSafeBalance}`);

    // Master Data Maps
    const SUPPLIERS = {
        'abo-donia': 'e956b151-5d0e-4da4-a4df-86e0eeb35972',      // Abo donia
        'sayed-najib': '51d4a13f-5651-48d2-9648-707bc435c0f0',    // Sayed Najib
        'karim-akshar': '06e7ef20-cad7-4554-9ebc-ea1e6c7d09ad',   // Karim EL-Akshar
        'sand-supplier': '6761af8d-f773-4751-af8e-38b2fc4a2781',  // Sand & Aggregate Supplier
        'transport': '6e61bc87-047c-4172-833f-1af10edce6a7',      // Transport & Logistics
        'walid-transport': '2f036920-932d-45d9-b414-8e3ffe19a629',// وليد (مقاول تشوين ونقل)
        'cutting-contractor': '46fe4a5d-a0b8-4c1c-a6d3-35027c66a00e', // مقاول قص السلم والتكسير
        'concrete-contractor': 'a5cb0db8-a572-4eeb-a00f-42c6fe6a3fa4',// مقاول صب السلم والخرسانات
        'site-supplies': 'dd1e13bf-87d8-43bb-b798-dfa3de1a7e55',  // Site Supplies Supplier
        'cement-supplier': '7912cb62-17c5-4d68-b06e-0399a38b19b6' // Cement & Steel Supplier
    };

    const WORKMEN = {
        'mahmoud-bannan': '3de18aaa-fb77-4819-9973-6603114d5848', // Mahmoud El-Bannan
        'ahmed-ibrahim': 'ea71c986-395c-4f47-bf4d-a981c29d870a',  // Ahmed Ibrahim
        'gamal-concrete': '674455fa-c339-4b81-bfc5-163e13947879', // Gamal (مقاول خرسانات)
        'adel-talaat': 'f4467fc8-af20-42f8-aede-5d1239d77a0d',    // Adel Talaat
        'ahmed-behery': '013af89b-536b-44b4-ae60-43e41a9c4968',   // Ahmed El-Behery
        'walid-stocking': '7fd6c9a8-e8d9-4fad-b488-8b8448f7d40c'  // Walid
    };

    function mapCategory(catStr, isIncome) {
        if (isIncome) return 'PAYMENT';
        if (!catStr) return 'MATERIALS';
        if (catStr.includes('MASONRY_LABOR')) return 'MASONRY_LABOR';
        if (catStr.includes('Municipal Employee') || catStr.includes('محليات')) return 'OFFICE_GOVERNMENT_FEES';
        if (catStr.includes('CONCRETE_CUTTING')) return 'CONTRACTING_DEMOLITION';
        if (catStr.includes('CONCRETE')) return 'CONTRACTING_CONCRETE';
        if (catStr.includes('SAND')) return 'SAND';
        if (catStr.includes('STOCKING')) return 'STOCKING';
        if (catStr.includes('BRICKS')) return 'BRICKS';
        if (catStr.includes('GOV_FEES')) return 'TIPS';
        if (catStr.includes('STEEL_CEMENT')) return 'MATERIALS';
        if (catStr.includes('GENERAL_LABOR')) return 'GENERAL_LABOR';
        if (catStr.includes('LABOR')) return 'GENERAL_LABOR';
        if (catStr.includes('TRANSPORTATION')) return 'TRANSPORT';
        if (catStr.includes('CEMENT')) return 'CEMENT';
        if (catStr.includes('TOOLS')) return 'MATERIALS';
        return 'MATERIALS';
    }

    // Read mapped xlsx
    const buf = fs.readFileSync(MAPPED_FILE);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['المعاملات المالية المفصلة'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const rows = data.slice(4).filter(r => r && r[0] && (String(r[0]).startsWith('IN-') || String(r[0]).startsWith('EX-')));

    console.log(`Read ${rows.length} rows from Excel sheet.`);

    const transactionsToInsert = [];
    let totalIncome = 0;
    let totalExpense = 0;
    let totalProfit = 0;
    let totalCashIncome = 0;
    let totalBankIncome = 0;
    let totalCashExpense = 0;
    let totalBankExpense = 0;

    for (const r of rows) {
        const code = String(r[0]).trim();
        const typeStr = String(r[1]).trim();
        const isIncome = typeStr.includes('INCOME') || code.startsWith('IN-');
        const rawDate = String(r[2] || '').trim();
        const expenseAmt = Number(r[3]) || 0;
        const incomeAmt = Number(r[4]) || 0;
        const amount = isIncome ? incomeAmt : expenseAmt;
        const desc = String(r[5] || '').trim();
        const catStr = String(r[6] || '').trim();
        const vendorStr = String(r[7] || '').trim();
        const workmanStr = String(r[8] || '').trim();
        const paymentNotes = String(r[11] || '').trim();

        const category = mapCategory(catStr, isIncome);
        const date = rawDate ? new Date(rawDate + 'T11:00:00.000Z') : new Date('2026-06-01T11:00:00.000Z');

        // Payment method and safe resolution
        const isBank = paymentNotes.includes('تحويل') || paymentNotes.includes('شيك') || paymentNotes.includes('بنك');
        const paymentMethod = isBank ? 'BANK_TRANSFER' : 'CASH';
        const safeId = isBank ? BANK_SAFE_ID : CASH_SAFE_ID;

        // Supplier resolution
        let supplierId = null;
        let workmanId = null;
        let beneficiary = null;

        if (vendorStr.includes('ابو دنيا') || vendorStr.toLowerCase().includes('donia')) {
            supplierId = SUPPLIERS['abo-donia'];
            beneficiary = 'ابو دنيا';
        } else if (vendorStr.includes('نجيب') || vendorStr.toLowerCase().includes('najib')) {
            supplierId = SUPPLIERS['sayed-najib'];
            beneficiary = 'سيد نجيب';
        } else if (vendorStr.includes('الاكشر') || vendorStr.toLowerCase().includes('akshar')) {
            supplierId = SUPPLIERS['karim-akshar'];
            beneficiary = 'كريم الاكشر';
        } else if (vendorStr.includes('رمل وسن') || vendorStr.toLowerCase().includes('sand')) {
            supplierId = SUPPLIERS['sand-supplier'];
            beneficiary = 'مورد رمل وسن';
        } else if (vendorStr.includes('النقل') || vendorStr.toLowerCase().includes('transport')) {
            supplierId = SUPPLIERS['transport'];
            beneficiary = 'سائق النقل / مقاول النقل';
        } else if (vendorStr.includes('وليد (مقاول')) {
            supplierId = SUPPLIERS['walid-transport'];
            beneficiary = 'وليد (مقاول تشوين ونقل)';
        } else if (vendorStr.includes('قص السلم')) {
            supplierId = SUPPLIERS['cutting-contractor'];
            beneficiary = 'مقاول قص السلم والتكسير';
        } else if (vendorStr.includes('صب السلم')) {
            supplierId = SUPPLIERS['concrete-contractor'];
            beneficiary = 'مقاول صب السلم والخرسانات';
        } else if (vendorStr.includes('مستلزمات')) {
            supplierId = SUPPLIERS['site-supplies'];
            beneficiary = 'مورد مستلزمات بناء وموقع';
        } else if (vendorStr.includes('اسمنت') || vendorStr.includes('محممود')) {
            supplierId = SUPPLIERS['cement-supplier'];
            beneficiary = 'مورد أسمنت وحديد';
        }

        // Workman resolution
        if (workmanStr.includes('البنان') || workmanStr.toLowerCase().includes('bannan')) {
            workmanId = WORKMEN['mahmoud-bannan'];
            beneficiary = 'محمود البنان';
        } else if (workmanStr.includes('ابراهيم') || workmanStr.toLowerCase().includes('ibrahim')) {
            workmanId = WORKMEN['ahmed-ibrahim'];
            beneficiary = 'احمد ابراهيم';
        } else if (workmanStr.includes('جمال') || workmanStr.toLowerCase().includes('gamal')) {
            workmanId = WORKMEN['gamal-concrete'];
            beneficiary = 'جمال (مقاول خرسانات)';
        } else if (workmanStr.includes('طلعت') || workmanStr.toLowerCase().includes('talaat')) {
            workmanId = WORKMEN['adel-talaat'];
            beneficiary = 'عادل طلعت';
        } else if (workmanStr.includes('البحيري') || workmanStr.toLowerCase().includes('behery')) {
            workmanId = WORKMEN['ahmed-behery'];
            beneficiary = 'احمد البحيري(قص خراسانات)';
        } else if (workmanStr.includes('وليد') || workmanStr.toLowerCase().includes('walid')) {
            workmanId = WORKMEN['walid-stocking'];
            beneficiary = 'وليد (عمال تشوين)';
        }

        if (isIncome) {
            totalIncome += amount;
            if (isBank) totalBankIncome += amount; else totalCashIncome += amount;
            transactionsToInsert.push({
                code,
                type: 'INCOME',
                category: 'PAYMENT',
                amount,
                description: desc || 'دفعة تحت الحساب من العميل',
                status: 'APPROVED',
                projectId: PROJECT_ID,
                clientId: CLIENT_ID,
                safeId,
                payerUserId: USER_ID,
                createdBy: USER_ID,
                transactionDate: date,
                paymentMethod,
                tenantId: TENANT_ID,
                beneficiary: 'حسين بيومى الجزار',
                notes: `CODE:${code} | ${paymentNotes}`
            });
        } else {
            totalExpense += amount;
            if (isBank) totalBankExpense += amount; else totalCashExpense += amount;
            const feeAmount = Math.round(amount * 0.10 * 100) / 100;
            totalProfit += feeAmount;

            transactionsToInsert.push({
                code,
                type: 'EXPENSE',
                category,
                amount,
                description: desc,
                status: 'APPROVED',
                projectId: PROJECT_ID,
                supplierId,
                workmanId,
                safeId,
                payerUserId: USER_ID,
                createdBy: USER_ID,
                transactionDate: date,
                paymentMethod,
                tenantId: TENANT_ID,
                beneficiary,
                feeAmount,
                notes: `CODE:${code} | ${paymentNotes}`
            });
        }
    }

    console.log('\n--- VERIFICATION OF BATCH TOTALS ---');
    console.log(`Total Income (7 transactions): ${totalIncome.toLocaleString()} EGP (Expected: 580,000)`);
    console.log(`  - Cash Incomes: ${totalCashIncome.toLocaleString()} EGP`);
    console.log(`  - Bank Incomes: ${totalBankIncome.toLocaleString()} EGP`);
    console.log(`Total Expenses (55 transactions): ${totalExpense.toLocaleString()} EGP (Expected: 573,080)`);
    console.log(`  - Cash Expenses: ${totalCashExpense.toLocaleString()} EGP`);
    console.log(`  - Bank Expenses: ${totalBankExpense.toLocaleString()} EGP`);
    console.log(`Total 10% Management Fee: ${totalProfit.toLocaleString()} EGP (Expected: 57,308)`);
    const batchSafeNet = totalIncome - (totalExpense + totalProfit);
    console.log(`Net Batch Project Safe Balance: ${batchSafeNet.toLocaleString()} EGP (Expected: -50,388)`);

    if (totalIncome !== 580000 || totalExpense !== 573080 || Math.abs(totalProfit - 57308) > 0.01) {
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
                    notes: item.notes
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
                    notes: item.notes
                }
            });

            // Management fee linked transaction (10%)
            await tx.transaction.create({
                data: {
                    type: 'EXPENSE',
                    category: 'MANAGEMENT_FEE_TRANSFER',
                    amount: item.feeAmount,
                    description: `أتعاب إدارة وإشراف (10%) على مصروف بقيمة ${item.amount} ج.م (${item.description})`,
                    status: 'APPROVED',
                    projectId: PROJECT_ID,
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

        // 3. Update Project Financial Totals (Incrementing existing values)
        const updatedProject = await tx.project.update({
            where: { id: PROJECT_ID },
            data: {
                operationalFund: { increment: totalIncome },
                actualCost: { increment: totalExpense },
                officeRevenue: { increment: totalProfit },
                projectSafeBalance: { increment: batchSafeNet }
            }
        });

        console.log(`Updated Project Financials -> Operational: ${updatedProject.operationalFund}, Actual Cost: ${updatedProject.actualCost}, Office Revenue: ${updatedProject.officeRevenue}, Safe Balance: ${updatedProject.projectSafeBalance}`);

        // 4. Update Safe Balances
        // Cash Safe Net Impact: +330,000 (Income) - 310,080 (Expense) = +19,920
        const netCashImpact = totalCashIncome - totalCashExpense;
        await tx.companySafe.update({
            where: { id: CASH_SAFE_ID },
            data: { balance: { increment: netCashImpact } }
        });

        // Bank Safe Net Impact: +250,000 (Income) - 263,000 (Expense) = -13,000
        const netBankImpact = totalBankIncome - totalBankExpense;
        await tx.companySafe.update({
            where: { id: BANK_SAFE_ID },
            data: { balance: { increment: netBankImpact } }
        });

        console.log(`Updated Safes -> Cash Safe change: ${netCashImpact > 0 ? '+' : ''}${netCashImpact}, Bank Safe change: ${netBankImpact > 0 ? '+' : ''}${netBankImpact}`);
    });

    console.log('\n=== SUCCESS! 62 TRANSACTIONS + 55 MANAGEMENT FEES INSERTED SUCCESSFULLY! ===');
}

main()
    .catch((err) => {
        console.error('ERROR OCCURRED:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
