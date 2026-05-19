// Populates the "Demo Co" tenant with realistic Egyptian construction data:
// 5 clients, 6 suppliers, 8 materials, 6 workmen, 3 projects (different revenue
// models + statuses), 18+ transactions covering income, direct expenses,
// inventory purchases, material usage, pending approvals, and custody transfers.
//
// V1.2 profit-on-expense math is applied manually since we bypass controllers.
//
// Idempotent: wipes the demo tenant's domain data first, then re-seeds. Users
// and the tenant itself are preserved (run scripts/setup-test-users.js first
// if those don't exist yet).
//
//   node scripts/setup-test-users.js   # one-time
//   node scripts/seed-demo-data.js     # populate

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_SLUG = 'demo-co';

const D = (n) => Number(n).toFixed(2);   // Decimal-friendly string
const daysAgo = (d) => new Date(Date.now() - d * 86400000);
const daysAhead = (d) => new Date(Date.now() + d * 86400000);

async function main() {
    const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
    if (!tenant) {
        console.error(`Tenant "${TENANT_SLUG}" not found. Run scripts/setup-test-users.js first.`);
        process.exit(1);
    }

    const users = await prisma.user.findMany({
        where: { tenantId: tenant.id },
        select: { id: true, email: true, role: true }
    });
    const admin    = users.find(u => u.role === 'ADMIN');
    const manager  = users.find(u => u.role === 'PROJECT_MANAGER');
    const engineer = users.find(u => u.role === 'ENGINEER');
    const accountant = users.find(u => u.role === 'ACCOUNTANT');
    if (!admin || !manager || !engineer || !accountant) {
        console.error('Demo users not found. Run scripts/setup-test-users.js first.');
        process.exit(1);
    }

    console.log(`Seeding demo data into tenant "${tenant.name}" (${tenant.id})`);

    // ─── Wipe existing domain data for this tenant ──────────────────────────
    console.log('Wiping previous demo data...');
    await prisma.materialUsage.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.materialBatch.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.transaction.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.workmanship.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.projectCostItem.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.custodyTransfer.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.notification.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.material.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.project.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.workman.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.supplier.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.client.deleteMany({ where: { tenantId: tenant.id } });

    // Reset users' custody balances
    await prisma.user.updateMany({
        where: { tenantId: tenant.id },
        data: { currentCustodyBalance: 0, pendingClearance: 0 }
    });

    // ─── Clients ────────────────────────────────────────────────────────────
    console.log('Creating clients...');
    const [c1, c2, c3, c4, c5] = await Promise.all([
        prisma.client.create({ data: {
            tenantId: tenant.id,
            name: 'شركة المقاولون العرب',
            email: 'info@arabcontractors.com.eg',
            phone: '+20223456789',
            company: 'Arab Contractors',
            taxId: '100-200-300',
            status: 'ACTIVE',
            street: '34 شارع عدلي',
            city: 'القاهرة',
            country: 'Egypt',
            contactName: 'م. خالد منصور',
            contactPosition: 'مدير المشاريع',
            contactPhone: '+201001234567',
            contactEmail: 'k.mansour@arabcontractors.com.eg'
        }}),
        prisma.client.create({ data: {
            tenantId: tenant.id,
            name: 'مجموعة طلعت مصطفى',
            email: 'projects@tmg.com.eg',
            phone: '+20226189000',
            company: 'Talaat Moustafa Group',
            status: 'ACTIVE',
            street: 'الرحاب',
            city: 'القاهرة الجديدة',
            country: 'Egypt',
            contactName: 'م. أمينة شوقي',
            contactPhone: '+201112233445'
        }}),
        prisma.client.create({ data: {
            tenantId: tenant.id,
            name: 'أحمد عبد الرحمن',
            email: 'a.abdelrahman@gmail.com',
            phone: '+201557788990',
            status: 'ACTIVE',
            street: '12 شارع فؤاد',
            city: 'الإسكندرية',
            country: 'Egypt'
        }}),
        prisma.client.create({ data: {
            tenantId: tenant.id,
            name: 'شركة القاهرة للتطوير العقاري',
            email: 'contracts@cairo-dev.com',
            phone: '+20235678901',
            company: 'Cairo Real Estate Development',
            status: 'ACTIVE',
            city: 'الجيزة',
            country: 'Egypt',
            contactName: 'م. وائل حسني'
        }}),
        prisma.client.create({ data: {
            tenantId: tenant.id,
            name: 'مكتب الهندسة المعمارية الحديث',
            email: 'modern.arch@hotmail.com',
            phone: '+20502345678',
            status: 'PENDING',
            city: 'المنصورة',
            country: 'Egypt'
        }})
    ]);

    // ─── Suppliers ──────────────────────────────────────────────────────────
    console.log('Creating suppliers...');
    const [s_cement, s_steel, s_concrete, s_tools, s_wood, s_ceramic] = await Promise.all([
        prisma.supplier.create({ data: {
            tenantId: tenant.id,
            name: 'شركة لافارج للأسمنت',
            email: 'sales@lafarge.com.eg',
            phone: '+20227980000',
            company: 'Lafarge Egypt',
            category: 'CEMENT',
            paymentTerms: 'Net 30',
            rating: 5,
            status: 'ACTIVE',
            city: 'السويس',
            country: 'Egypt'
        }}),
        prisma.supplier.create({ data: {
            tenantId: tenant.id,
            name: 'حديد عز',
            email: 'sales@ezzsteel.com',
            phone: '+20235880000',
            company: 'Ezz Steel',
            category: 'STEEL',
            paymentTerms: 'Net 15',
            rating: 5,
            status: 'ACTIVE',
            city: 'السادس من أكتوبر',
            country: 'Egypt'
        }}),
        prisma.supplier.create({ data: {
            tenantId: tenant.id,
            name: 'مصنع الخرسانة الجاهزة',
            email: 'orders@readymix-cairo.com',
            phone: '+20226300000',
            company: 'Cairo Ready-Mix',
            category: 'CONCRETE',
            paymentTerms: 'Cash on delivery',
            rating: 4,
            status: 'ACTIVE',
            city: 'القاهرة',
            country: 'Egypt'
        }}),
        prisma.supplier.create({ data: {
            tenantId: tenant.id,
            name: 'كروم للأدوات والمعدات',
            email: 'info@krome.com.eg',
            phone: '+20225800000',
            company: 'Krome Tools',
            category: 'TOOLS',
            paymentTerms: 'Net 30',
            rating: 4,
            status: 'ACTIVE',
            city: 'القاهرة',
            country: 'Egypt'
        }}),
        prisma.supplier.create({ data: {
            tenantId: tenant.id,
            name: 'الشركة المصرية للأخشاب',
            email: 'sales@egywood.com',
            phone: '+20228400000',
            company: 'Egyptian Wood Co.',
            category: 'WOOD',
            paymentTerms: 'Net 45',
            rating: 4,
            status: 'ACTIVE',
            city: 'الإسكندرية',
            country: 'Egypt'
        }}),
        prisma.supplier.create({ data: {
            tenantId: tenant.id,
            name: 'سيراميك كليوباترا',
            email: 'sales@cleopatraceramic.com',
            phone: '+20245760000',
            company: 'Cleopatra Ceramics',
            category: 'MATERIALS',
            paymentTerms: 'Net 30',
            rating: 5,
            status: 'ACTIVE',
            city: '10th of Ramadan',
            country: 'Egypt'
        }})
    ]);

    // ─── Materials ──────────────────────────────────────────────────────────
    console.log('Creating materials...');
    const materials = await Promise.all([
        prisma.material.create({ data: {
            tenantId: tenant.id, supplierId: s_cement.id,
            name: 'Portland Cement', nameAr: 'أسمنت بورتلاندي',
            unit: 'BAG', stockLevel: D(150), unitPrice: D(180), reorderLevel: D(50),
            description: '50kg bag, OPC 42.5'
        }}),
        prisma.material.create({ data: {
            tenantId: tenant.id, supplierId: s_steel.id,
            name: 'Rebar 16mm', nameAr: 'حديد تسليح 16مم',
            unit: 'TON', stockLevel: D(8.5), unitPrice: D(48000), reorderLevel: D(2)
        }}),
        prisma.material.create({ data: {
            tenantId: tenant.id, supplierId: s_steel.id,
            name: 'Rebar 12mm', nameAr: 'حديد تسليح 12مم',
            unit: 'TON', stockLevel: D(5.0), unitPrice: D(47500), reorderLevel: D(2)
        }}),
        prisma.material.create({ data: {
            tenantId: tenant.id, supplierId: s_concrete.id,
            name: 'Ready-Mix Concrete C25', nameAr: 'خرسانة جاهزة C25',
            unit: 'M3', stockLevel: D(0), unitPrice: D(2100)
        }}),
        prisma.material.create({ data: {
            tenantId: tenant.id,
            name: 'Aswani Sand', nameAr: 'رمل أسواني',
            unit: 'M3', stockLevel: D(40), unitPrice: D(280), reorderLevel: D(10)
        }}),
        prisma.material.create({ data: {
            tenantId: tenant.id,
            name: 'Gravel', nameAr: 'زلط',
            unit: 'M3', stockLevel: D(25), unitPrice: D(320), reorderLevel: D(10)
        }}),
        prisma.material.create({ data: {
            tenantId: tenant.id,
            name: 'Red Brick', nameAr: 'طوب أحمر',
            unit: 'PIECE', stockLevel: D(8000), unitPrice: D(2.2), reorderLevel: D(2000)
        }}),
        prisma.material.create({ data: {
            tenantId: tenant.id, supplierId: s_wood.id,
            name: 'Wood Plank', nameAr: 'لوح خشب',
            unit: 'M2', stockLevel: D(60), unitPrice: D(450), reorderLevel: D(20)
        }})
    ]);

    // ─── Workmen ────────────────────────────────────────────────────────────
    console.log('Creating workmen...');
    const [w_carpenter, w_mason, w_electrician, w_plumber, w_painter, w_foreman] = await Promise.all([
        prisma.workman.create({ data: {
            tenantId: tenant.id,
            name: 'Mohamed Ali', nameAr: 'محمد علي',
            trade: 'CARPENTER', dailyRate: D(350), phone: '+201012345001',
            nationalId: '28505011234567', isActive: true
        }}),
        prisma.workman.create({ data: {
            tenantId: tenant.id,
            name: 'Ahmed Hassan', nameAr: 'أحمد حسن',
            trade: 'MASON', dailyRate: D(300), phone: '+201112345002',
            nationalId: '29007154321987', isActive: true
        }}),
        prisma.workman.create({ data: {
            tenantId: tenant.id,
            name: 'Sayed Ibrahim', nameAr: 'سيد إبراهيم',
            trade: 'ELECTRICIAN', dailyRate: D(400), phone: '+201212345003',
            nationalId: '28811202345678', isActive: true
        }}),
        prisma.workman.create({ data: {
            tenantId: tenant.id,
            name: 'Hossam Shaaban', nameAr: 'حسام شعبان',
            trade: 'PLUMBER', dailyRate: D(380), phone: '+201512345004',
            nationalId: '29203089876543', isActive: true
        }}),
        prisma.workman.create({ data: {
            tenantId: tenant.id,
            name: 'Mostafa El-Khatib', nameAr: 'مصطفى الخطيب',
            trade: 'PAINTER', dailyRate: D(280), phone: '+201012345005',
            nationalId: '28612151122334', isActive: true
        }}),
        prisma.workman.create({ data: {
            tenantId: tenant.id,
            name: 'Ibrahim Abdullah', nameAr: 'إبراهيم عبد الله',
            trade: 'FOREMAN', dailyRate: D(500), phone: '+201112345006',
            nationalId: '28004053344556', isActive: true
        }})
    ]);

    // ─── Project 1: Villa, IN_PROGRESS, COST_PLUS, 10% mgmt fee ─────────────
    console.log('Creating project 1: Villa (COST_PLUS, in progress)...');
    const villa = await prisma.project.create({ data: {
        tenantId: tenant.id, clientId: c1.id, engineerId: engineer.id,
        name: 'فيلا التجمع الخامس - Villa 5th Settlement',
        description: 'فيلا سكنية فاخرة 600م² مع حمام سباحة وحديقة',
        status: 'IN_PROGRESS', projectType: 'RESIDENTIAL',
        location: 'التجمع الخامس، القاهرة الجديدة',
        startDate: daysAgo(180),
        endDate: daysAhead(180),
        budget: D(2500000),
        revenueModel: 'EXECUTION_COST_PLUS',
        managementFeePercent: D(10),
        paymentTerms: 'Net 30',
        // Initial financial state — will be updated as we add transactions below
        actualCost: D(0), officeRevenue: D(0), officeExpenses: D(0),
        operationalFund: D(0), projectSafeBalance: D(0)
    }});

    // Helper for the V1.2 profit logic (mirrors transactionControllerV2)
    const villaTransactions = [];
    let v_safe = 0, v_actualCost = 0, v_revenue = 0;
    const FEE = 0.10;

    // T1: INCOME 500,000 from client — first milestone payment
    villaTransactions.push({
        type: 'INCOME', category: 'PAYMENT', amount: D(500000),
        description: 'Milestone 1 payment - foundation', descriptionAr: 'دفعة المرحلة الأولى - الأساسات',
        status: 'APPROVED', paymentMethod: 'BANK_TRANSFER',
        invoiceNumber: 'INV-2026-0001',
        clientId: c1.id, projectId: villa.id, createdBy: admin.id,
        approvedBy: admin.id, approvedAt: daysAgo(170),
        transactionDate: daysAgo(170), tenantId: tenant.id
    });
    v_safe += 500000;

    // T2: EXPENSE 150,000 CONCRETE direct (paid to ready-mix supplier)
    villaTransactions.push({
        type: 'EXPENSE', category: 'CONCRETE', amount: D(150000),
        description: 'Foundation concrete pour - 70 m³ C25', descriptionAr: 'صب خرسانة الأساسات - 70 م³',
        status: 'APPROVED', paymentMethod: 'BANK_TRANSFER',
        invoiceNumber: 'PO-RM-2026-0042',
        supplierId: s_concrete.id, projectId: villa.id, createdBy: engineer.id,
        approvedBy: manager.id, approvedAt: daysAgo(160),
        transactionDate: daysAgo(160), tenantId: tenant.id
    });
    v_safe -= 150000; v_actualCost += 150000;
    const t2_profit = 150000 * FEE;
    v_safe -= t2_profit; v_revenue += t2_profit;
    villaTransactions.push({  // The auto-generated profit transfer ledger
        type: 'EXPENSE', category: 'MANAGEMENT_FEE_TRANSFER', amount: D(t2_profit),
        description: `Cost-Plus Management Fee (10%) on 150,000 EGP expense`,
        status: 'APPROVED', paymentMethod: 'OTHER',
        projectId: villa.id, createdBy: engineer.id,
        transactionDate: daysAgo(160), tenantId: tenant.id, isOfficeExpense: false
    });

    // T3: EXPENSE 200,000 CEMENT inventory purchase (creates batch)
    const t3_id = (await prisma.transaction.create({ data: {
        type: 'EXPENSE', category: 'CEMENT', amount: D(200000),
        description: 'Cement bags - 1100 bags Portland 42.5', descriptionAr: 'أسمنت بورتلاندي - 1100 شيكارة',
        status: 'APPROVED', paymentMethod: 'BANK_TRANSFER',
        invoiceNumber: 'PO-LF-2026-0157',
        supplierId: s_cement.id, projectId: villa.id, createdBy: engineer.id,
        approvedBy: manager.id, approvedAt: daysAgo(140),
        transactionDate: daysAgo(140), tenantId: tenant.id
    }})).id;
    v_safe -= 200000; v_actualCost += 200000;

    // Create the corresponding MaterialBatch (no profit yet — deferred until usage)
    const batch1 = await prisma.materialBatch.create({ data: {
        tenantId: tenant.id, projectId: villa.id, materialId: materials[0].id,
        description: 'Cement bags purchase batch', descriptionAr: 'دفعة شراء أسمنت',
        initialValue: D(200000), remainingValue: D(200000),
        category: 'CEMENT', originalReceiptId: t3_id, recordedBy: engineer.id,
        purchaseDate: daysAgo(140), status: 'AVAILABLE'
    }});

    // T4: INCOME 300,000 second client payment
    villaTransactions.push({
        type: 'INCOME', category: 'PAYMENT', amount: D(300000),
        description: 'Milestone 2 payment - structural', descriptionAr: 'دفعة المرحلة الثانية - الهيكل',
        status: 'APPROVED', paymentMethod: 'BANK_TRANSFER',
        invoiceNumber: 'INV-2026-0002',
        clientId: c1.id, projectId: villa.id, createdBy: admin.id,
        approvedBy: admin.id, approvedAt: daysAgo(120),
        transactionDate: daysAgo(120), tenantId: tenant.id
    });
    v_safe += 300000;

    // T5: EXPENSE 80,000 MASONRY_LABOR direct (paid to mason)
    villaTransactions.push({
        type: 'EXPENSE', category: 'MASONRY_LABOR', amount: D(80000),
        description: 'Masonry work - exterior walls', descriptionAr: 'أعمال المباني - الحوائط الخارجية',
        status: 'APPROVED', paymentMethod: 'CASH',
        workmanId: w_mason.id, projectId: villa.id, createdBy: engineer.id,
        approvedBy: manager.id, approvedAt: daysAgo(90),
        transactionDate: daysAgo(90), tenantId: tenant.id
    });
    v_safe -= 80000; v_actualCost += 80000;
    const t5_profit = 80000 * FEE;
    v_safe -= t5_profit; v_revenue += t5_profit;
    villaTransactions.push({
        type: 'EXPENSE', category: 'MANAGEMENT_FEE_TRANSFER', amount: D(t5_profit),
        description: `Cost-Plus Management Fee (10%) on 80,000 EGP expense`,
        status: 'APPROVED', paymentMethod: 'OTHER',
        projectId: villa.id, createdBy: engineer.id,
        transactionDate: daysAgo(90), tenantId: tenant.id, isOfficeExpense: false
    });
    // Update workman totalPaid
    await prisma.workman.update({ where: { id: w_mason.id }, data: { totalPaid: D(80000) }});

    // T6: Usage from cement batch — 100,000 EGP consumed (recognizes profit)
    await prisma.materialUsage.create({ data: {
        tenantId: tenant.id, projectId: villa.id, materialId: materials[0].id,
        quantity: D(550),  // 550 bags of the 1100
        notes: 'Used for ground floor walls and slab',
        recordedBy: engineer.id, createdAt: daysAgo(60)
    }});
    await prisma.materialBatch.update({ where: { id: batch1.id }, data: {
        remainingValue: D(100000),
        quantityUsed: D(550),
        status: 'PARTIALLY_USED'
    }});
    const t6_profit = 100000 * FEE;
    v_safe -= t6_profit; v_revenue += t6_profit;
    villaTransactions.push({
        type: 'EXPENSE', category: 'MANAGEMENT_FEE_TRANSFER', amount: D(t6_profit),
        description: `Inventory consumption fee (10%) on 100,000 EGP material used`,
        status: 'APPROVED', paymentMethod: 'OTHER',
        projectId: villa.id, createdBy: engineer.id,
        transactionDate: daysAgo(60), tenantId: tenant.id
    });

    // T7: EXPENSE 50,000 CARPENTRY_LABOR — DRAFT pending manager approval
    villaTransactions.push({
        type: 'EXPENSE', category: 'CARPENTRY_LABOR', amount: D(50000),
        description: 'Roof structure carpentry - pending', descriptionAr: 'أعمال نجارة السقف - في الانتظار',
        status: 'PENDING_APPROVAL', paymentMethod: 'CASH',
        workmanId: w_carpenter.id, projectId: villa.id, createdBy: engineer.id,
        transactionDate: daysAgo(5), tenantId: tenant.id
    });
    // No financial impact — waiting for approval

    // T8: EXPENSE 25,000 ELECTRICAL_MATERIALS direct (paid by engineer custody)
    villaTransactions.push({
        type: 'EXPENSE', category: 'ELECTRICAL_MATERIALS', amount: D(25000),
        description: 'Electrical conduits and wiring', descriptionAr: 'مواسير ومواد كهرباء',
        status: 'APPROVED', paymentMethod: 'CUSTODY_WALLET',
        projectId: villa.id, createdBy: engineer.id, payerUserId: engineer.id,
        approvedBy: manager.id, approvedAt: daysAgo(30),
        transactionDate: daysAgo(30), tenantId: tenant.id
    });
    v_safe -= 25000; v_actualCost += 25000;
    const t8_profit = 25000 * FEE;
    v_safe -= t8_profit; v_revenue += t8_profit;
    villaTransactions.push({
        type: 'EXPENSE', category: 'MANAGEMENT_FEE_TRANSFER', amount: D(t8_profit),
        description: `Cost-Plus Management Fee (10%) on 25,000 EGP expense`,
        status: 'APPROVED', paymentMethod: 'OTHER',
        projectId: villa.id, createdBy: engineer.id,
        transactionDate: daysAgo(30), tenantId: tenant.id
    });

    await prisma.transaction.createMany({ data: villaTransactions });
    await prisma.project.update({
        where: { id: villa.id },
        data: {
            projectSafeBalance: D(v_safe),
            actualCost: D(v_actualCost),
            officeRevenue: D(v_revenue)
        }
    });

    // ─── Project 2: Office, PLANNING, LUMP_SUM ──────────────────────────────
    console.log('Creating project 2: Downtown Office (LUMP_SUM, planning)...');
    await prisma.project.create({ data: {
        tenantId: tenant.id, clientId: c2.id, engineerId: manager.id,
        name: 'مكتب وسط البلد - Downtown Office Renovation',
        description: 'تجديد مكتب 4 طوابق في وسط البلد',
        status: 'PLANNING', projectType: 'COMMERCIAL',
        location: 'وسط البلد، القاهرة',
        startDate: daysAhead(30),
        endDate: daysAhead(240),
        budget: D(1000000),
        totalContractValue: D(1200000),
        revenueModel: 'EXECUTION_LUMP_SUM',
        paymentTerms: '40% advance, 30% mid, 30% on delivery',
        actualCost: D(0), officeRevenue: D(0), projectSafeBalance: D(0)
    }});

    // ─── Project 3: Apartment, COMPLETED, DESIGN_ONLY ───────────────────────
    console.log('Creating project 3: Alexandria Apartment (DESIGN_ONLY, completed)...');
    const apartment = await prisma.project.create({ data: {
        tenantId: tenant.id, clientId: c3.id, engineerId: engineer.id,
        name: 'تشطيب شقة الإسكندرية - Alexandria Apartment Finishing',
        description: 'تشطيب شقة 180م² - بحري',
        status: 'COMPLETED', projectType: 'RESIDENTIAL',
        location: 'لوران، الإسكندرية',
        startDate: daysAgo(365),
        endDate: daysAgo(30),
        budget: D(800000),
        revenueModel: 'DESIGN_ONLY_AREA',
        paymentTerms: '50/50',
        actualCost: D(750000),
        officeRevenue: D(50000),  // Margin between contract and cost
        projectSafeBalance: D(50000)
    }});

    // Add a couple transactions for project 3 just to populate the ledger
    await prisma.transaction.createMany({ data: [
        {
            type: 'INCOME', category: 'PAYMENT', amount: D(800000),
            description: 'Full project payment received',
            descriptionAr: 'إجمالي مدفوعات المشروع',
            status: 'APPROVED', paymentMethod: 'BANK_TRANSFER',
            invoiceNumber: 'INV-2025-0099',
            clientId: c3.id, projectId: apartment.id, createdBy: admin.id,
            approvedBy: admin.id, approvedAt: daysAgo(360),
            transactionDate: daysAgo(360), tenantId: tenant.id
        },
        {
            type: 'EXPENSE', category: 'CERAMIC_MATERIALS', amount: D(120000),
            description: 'Floor and bathroom ceramics from Cleopatra',
            descriptionAr: 'سيراميك أرضيات وحمامات',
            status: 'APPROVED', paymentMethod: 'BANK_TRANSFER',
            supplierId: s_ceramic.id, projectId: apartment.id, createdBy: engineer.id,
            approvedBy: manager.id, approvedAt: daysAgo(300),
            transactionDate: daysAgo(300), tenantId: tenant.id
        },
        {
            type: 'EXPENSE', category: 'PAINTING_LABOR', amount: D(45000),
            description: 'Interior painting - 4 coats',
            descriptionAr: 'دهان داخلي - 4 وجوه',
            status: 'APPROVED', paymentMethod: 'CASH',
            workmanId: w_painter.id, projectId: apartment.id, createdBy: engineer.id,
            approvedBy: manager.id, approvedAt: daysAgo(120),
            transactionDate: daysAgo(120), tenantId: tenant.id
        },
        {
            type: 'EXPENSE', category: 'PLUMBING_MATERIALS', amount: D(85000),
            description: 'Plumbing fixtures and copper piping',
            descriptionAr: 'سباكة - أدوات صحية ومواسير',
            status: 'APPROVED', paymentMethod: 'BANK_TRANSFER',
            projectId: apartment.id, createdBy: engineer.id,
            approvedBy: manager.id, approvedAt: daysAgo(200),
            transactionDate: daysAgo(200), tenantId: tenant.id
        }
    ]});

    // ─── Custody transfers ──────────────────────────────────────────────────
    console.log('Creating custody transfers...');
    await prisma.custodyTransfer.create({ data: {
        tenantId: tenant.id, engineerId: engineer.id,
        type: 'FUNDING', amount: D(50000),
        description: 'Initial site cash for villa project',
        balanceBefore: D(0), balanceAfter: D(50000),
        createdAt: daysAgo(150)
    }});
    await prisma.custodyTransfer.create({ data: {
        tenantId: tenant.id, engineerId: engineer.id,
        type: 'FUNDING', amount: D(30000),
        description: 'Top-up for site purchases',
        balanceBefore: D(50000), balanceAfter: D(80000),
        createdAt: daysAgo(80)
    }});
    await prisma.custodyTransfer.create({ data: {
        tenantId: tenant.id, engineerId: engineer.id,
        type: 'CLEARANCE', amount: D(25000),
        description: 'Cleared electrical materials purchase',
        balanceBefore: D(80000), balanceAfter: D(55000),
        createdAt: daysAgo(30)
    }});
    await prisma.user.update({
        where: { id: engineer.id },
        data: { currentCustodyBalance: D(55000), pendingClearance: D(0) }
    });

    // ─── Project Cost Items (work orders) for villa ─────────────────────────
    console.log('Creating cost items...');
    await prisma.projectCostItem.createMany({ data: [
        {
            tenantId: tenant.id, projectId: villa.id,
            name: 'Foundation works', category: 'CONCRETE',
            unitOfMeasure: 'm3', totalQuantity: D(70), unitPrice: D(2200),
            estimatedTotal: D(154000), totalPaid: D(150000), status: 'COMPLETED'
        },
        {
            tenantId: tenant.id, projectId: villa.id,
            name: 'Masonry walls', category: 'MASONRY_LABOR', workmanId: w_mason.id,
            unitOfMeasure: 'm2', totalQuantity: D(450), unitPrice: D(180),
            estimatedTotal: D(81000), totalPaid: D(80000), status: 'COMPLETED'
        },
        {
            tenantId: tenant.id, projectId: villa.id,
            name: 'Roof carpentry', category: 'CARPENTRY_LABOR', workmanId: w_carpenter.id,
            unitOfMeasure: 'lump sum', estimatedTotal: D(50000), totalPaid: D(0),
            status: 'OPEN'
        },
        {
            tenantId: tenant.id, projectId: villa.id,
            name: 'Electrical installation', category: 'ELECTRICAL_LABOR',
            workmanId: w_electrician.id,
            unitOfMeasure: 'lump sum', estimatedTotal: D(120000), totalPaid: D(25000),
            status: 'OPEN'
        }
    ]});

    // ─── Workmanships (workman contracts) ───────────────────────────────────
    console.log('Creating workmanship contracts...');
    await prisma.workmanship.create({ data: {
        tenantId: tenant.id, projectId: villa.id, workmanId: w_mason.id,
        managedBy: manager.id,
        description: 'Masonry contract - exterior + interior walls',
        descriptionAr: 'عقد مباني - حوائط خارجية وداخلية',
        agreedAmount: D(80000), paidAmount: D(80000), outstandingAmount: D(0),
        status: 'COMPLETED', startDate: daysAgo(120), completionDate: daysAgo(85)
    }});
    await prisma.workmanship.create({ data: {
        tenantId: tenant.id, projectId: villa.id, workmanId: w_electrician.id,
        managedBy: manager.id,
        description: 'Electrical installation - full villa',
        descriptionAr: 'تركيبات كهرباء - الفيلا بالكامل',
        agreedAmount: D(120000), paidAmount: D(0), outstandingAmount: D(120000),
        status: 'IN_PROGRESS', startDate: daysAgo(40)
    }});

    // ─── Notifications ──────────────────────────────────────────────────────
    console.log('Creating notifications...');
    await prisma.notification.createMany({ data: [
        {
            tenantId: tenant.id, userId: manager.id, type: 'INFO',
            title: 'Pending approval',
            message: 'Engineer submitted 50,000 EGP expense for carpentry — awaiting your approval',
            resourceType: 'transaction', isRead: false,
            createdAt: daysAgo(5)
        },
        {
            tenantId: tenant.id, userId: engineer.id, type: 'INFO',
            title: 'Custody Funded',
            message: 'You received 30,000 EGP custody top-up. New balance: 80,000 EGP',
            resourceType: 'custody', isRead: true,
            createdAt: daysAgo(80)
        },
        {
            tenantId: tenant.id, userId: admin.id, type: 'ALERT',
            title: 'Low Stock Alert',
            message: 'Cement stock approaching reorder level (150 bags remaining, threshold 50)',
            resourceType: 'material', isRead: false,
            createdAt: daysAgo(2)
        }
    ]});

    // ─── Summary ────────────────────────────────────────────────────────────
    console.log('\n────────────────── Demo data seeded ──────────────────');
    console.log(`Tenant:          ${tenant.name}`);
    console.log(`Clients:         5  (Arab Contractors, TMG, individual, Cairo Dev, Modern Arch)`);
    console.log(`Suppliers:       6  (Lafarge, Ezz, ReadyMix, Krome, EgyWood, Cleopatra)`);
    console.log(`Materials:       8  (cement, rebar 16mm/12mm, concrete, sand, gravel, brick, wood)`);
    console.log(`Workmen:         6  (carpenter, mason, electrician, plumber, painter, foreman)`);
    console.log(`Projects:        3  (Villa IN_PROGRESS, Office PLANNING, Apartment COMPLETED)`);
    console.log(`Transactions:    ~17 across the 3 projects`);
    console.log(`Material batch:  1 cement batch, 50% consumed`);
    console.log(`Custody:         55,000 EGP currently with engineer`);
    console.log(`Cost items:      4 work orders for villa`);
    console.log(`Workmanships:    2 (1 completed, 1 in progress)`);
    console.log(`Notifications:   3 unread/read mix`);
    console.log('\nVilla project state (V1.2 profit-on-expense):');
    console.log(`  Project Safe Balance:  ${v_safe.toFixed(2)} EGP`);
    console.log(`  Actual Cost:           ${v_actualCost.toFixed(2)} EGP`);
    console.log(`  Office Revenue:        ${v_revenue.toFixed(2)} EGP`);
    console.log(`  Pending approvals:     1 (50,000 EGP carpentry)`);
    console.log('──────────────────────────────────────────────────────');
    console.log('Login at the frontend with admin@demo.local / Demo@1234');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
