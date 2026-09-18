const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const projects = await prisma.project.findMany({
    include: { transactions: { where: { status: 'APPROVED' } } }
  });
  for (const p of projects) {
    if (p.transactions.length === 0) continue;
    let siteCost = 0;
    let profit = 0;
    let income = 0;
    p.transactions.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.type === 'INCOME') income += amt;
      else if (t.type === 'EXPENSE') {
        if (t.category === 'MANAGEMENT_FEE_TRANSFER') profit += amt;
        else siteCost += amt;
      }
    });
    const safeBal = income - siteCost - profit;
    console.log('Reconciling ' + p.name + ' (' + p.id + '):');
    console.log('  Old: safe=' + p.projectSafeBalance + ', cost=' + p.actualCost + ', rev=' + p.officeRevenue);
    console.log('  New: safe=' + safeBal + ', cost=' + siteCost + ', rev=' + profit);
    await prisma.project.update({
      where: { id: p.id },
      data: {
        projectSafeBalance: safeBal,
        actualCost: siteCost,
        officeRevenue: profit
      }
    });
  }
}

run().catch(console.error).finally(() => process.exit(0));
