import prisma from '../lib/prisma.js';

async function main() {
  console.log('--- SYNCING EXPENSES, SAFES, AND OFFICE FEES ---');

  const PROJECT_ID = '1fc505e8-81c3-4b9a-a537-a03d8b0dc9e1'; // الجزار2
  const CASH_SAFE_ID = '84cbfbd2-7df6-4acf-b3d0-1f412b40601b'; // الخزينة النقدية الرئيسية
  const TENANT_ID = 'b21df23e-4f2a-4f26-b2c3-76a8e76f11ec';

  // 1. Update all 122 expenses to deduct from cash safe
  console.log('1. Updating 122 project expenses to link to office cash safe...');
  const updateRes = await prisma.transaction.updateMany({
    where: {
      projectId: PROJECT_ID,
      type: 'EXPENSE',
      category: { not: 'MANAGEMENT_FEE_TRANSFER' }
    },
    data: {
      safeId: CASH_SAFE_ID
    }
  });
  console.log(`Updated ${updateRes.count} expenses with safeId = ${CASH_SAFE_ID}.`);

  // 2. Fetch the 122 expenses
  const expenses = await prisma.transaction.findMany({
    where: {
      projectId: PROJECT_ID,
      type: 'EXPENSE',
      category: { not: 'MANAGEMENT_FEE_TRANSFER' }
    },
    orderBy: { transactionDate: 'asc' }
  });

  console.log('2. Recording 10% Office Profit child transactions linked to each expense...');
  let feeCount = 0;
  let totalFeeAmount = 0;

  for (const exp of expenses) {
    const feeAmt = Number((Number(exp.amount) * 0.10).toFixed(2));
    totalFeeAmount += feeAmt;

    // Check if fee already exists for this expense
    const existing = await prisma.transaction.findFirst({
      where: {
        category: 'MANAGEMENT_FEE_TRANSFER',
        notes: `PARENT_TX:${exp.id}`
      }
    });

    if (!existing) {
      await prisma.transaction.create({
        data: {
          type: 'EXPENSE',
          category: 'MANAGEMENT_FEE_TRANSFER',
          amount: feeAmt,
          totalDueAmount: feeAmt,
          description: `أتعاب إدارة وإشراف (10%) على مصروف بقيمة ${exp.amount} ج.م (${exp.description})`,
          descriptionAr: `أتعاب إدارة وإشراف (10%) على مصروف بقيمة ${exp.amount} ج.م (${exp.description})`,
          notes: `PARENT_TX:${exp.id}`,
          status: 'APPROVED',
          approvedAt: exp.transactionDate,
          approvedBy: exp.createdBy,
          projectId: exp.projectId,
          createdBy: exp.createdBy,
          transactionDate: exp.transactionDate,
          paymentMethod: 'BANK_TRANSFER',
          isOfficeExpense: false,
          tenantId: TENANT_ID
        }
      });
      feeCount++;
    }
  }

  console.log(`Recorded ${feeCount} management fee transactions totaling ${totalFeeAmount} EGP.`);

  // 3. Reset project Eng.walid (Bata) to 0 since it has no transactions
  console.log('3. Resetting Eng.walid (Bata) project financials...');
  await prisma.project.update({
    where: { id: '7a06933c-0744-4e82-b8e5-82f01055a522' },
    data: {
      actualCost: 0,
      operationalFund: 0,
      projectSafeBalance: 0,
      officeRevenue: 0
    }
  });
  console.log('Eng.walid (Bata) reset to 0.');

  // 4. Update project الجزار2
  console.log('4. Updating project الجزار2 financials...');
  await prisma.project.update({
    where: { id: PROJECT_ID },
    data: {
      budget: 1805600,
      actualCost: 1805600,
      operationalFund: 1920000,
      projectSafeBalance: 114400,
      officeRevenue: 180560
    }
  });
  console.log('Project الجزار2 financials updated.');

  // 5. Update cash safe balance
  console.log('5. Updating Company Safes...');
  const cashIn = await prisma.transaction.aggregate({
    where: { safeId: CASH_SAFE_ID, status: 'APPROVED', type: 'INCOME' },
    _sum: { amount: true }
  });
  const cashOut = await prisma.transaction.aggregate({
    where: { safeId: CASH_SAFE_ID, status: 'APPROVED', type: 'EXPENSE' },
    _sum: { amount: true }
  });

  const netCashBalance = Number(cashIn._sum.amount || 0) - Number(cashOut._sum.amount || 0);

  await prisma.companySafe.update({
    where: { id: CASH_SAFE_ID },
    data: {
      balance: netCashBalance
    }
  });

  console.log(`Cash Safe Updated: Inflow = ${cashIn._sum.amount}, Outflow = ${cashOut._sum.amount}, Balance = ${netCashBalance}`);
  console.log('--- ALL UPDATES COMPLETED SUCCESSFULLY ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
