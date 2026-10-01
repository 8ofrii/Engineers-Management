import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const XLSX = require('../../client/node_modules/xlsx-js-style');

const projectInfo = {
    code: 'PRJ-DR-EMAN-ELBETAR',
    name: 'د/ايمان',
    clientName: 'د/ايمان البيطار (Dr/ Eman Elbetar)',
    clientPhone: '01001134492',
    engineerName: 'حسام البيطار (Eng. Hossam Elbetar)',
    engineerEmail: 'eng.hossam.elbetar93@gmail.com',
    location: 'خلف ابراهيم مرسى',
    feePercent: 0,
    totalBudget: 500000,
    startDate: '2026-09-05'
};

const transactions = [
    {
        id: 'IN-1',
        type: 'إيراد (INCOME)',
        date: '2026-09-05',
        expense: 0,
        income: 100000,
        description: 'دفعة نقدية تحت الحساب للمشروع من العميل',
        category: 'دفعة تحت الحساب من العميل (CLIENT_PAYMENT)',
        vendor: '-',
        workman: '-',
        client: projectInfo.clientName,
        recordedBy: projectInfo.engineerName,
        auditNotes: 'تحويل / إيداع نقدي بخزينة المشروع - الدفعة الأولى المعتمدة'
    },
    {
        id: 'EXP-1',
        type: 'مصروف (EXPENSE)',
        date: '2026-09-05',
        expense: 9750,
        income: 0,
        description: 'مصنعيه بناء (13 الف طوبه )',
        category: 'مصنعية بناء (MASONRY_WORK)',
        vendor: '-',
        workman: 'محمود البنان (Mahmoud El-Bannan)',
        client: projectInfo.clientName,
        recordedBy: projectInfo.engineerName,
        auditNotes: 'نقدي من عهدة المهندس - مصنعية بناء 13 ألف طوبة'
    },
    {
        id: 'EXP-2',
        type: 'مصروف (EXPENSE)',
        date: '2026-09-05',
        expense: 10000,
        income: 0,
        description: 'مصنعيه سباك',
        category: 'مصنعية سباكة (PLUMBING_WORK)',
        vendor: '-',
        workman: 'روف سباك (Raoof Plumber)',
        client: projectInfo.clientName,
        recordedBy: projectInfo.engineerName,
        auditNotes: 'نقدي من عهدة المهندس - دفعة مصنعية أعمال السباكة'
    },
    {
        id: 'EXP-3',
        type: 'مصروف (EXPENSE)',
        date: '2026-09-05',
        expense: 30000,
        income: 0,
        description: 'مصنعيه + خامات عزل',
        category: 'عزل أسطح وخامات ومصنعية (INSULATION_WORK)',
        vendor: 'مورد مستلزمات بناء وموقع (Site Supplies Supplier)',
        workman: 'عادل طلعت (Adel Talaat - LABORER)',
        client: projectInfo.clientName,
        recordedBy: projectInfo.engineerName,
        auditNotes: 'نقدي من عهدة المهندس - خامات ومصنعية أعمال عزل السطح'
    },
    {
        id: 'EXP-4',
        type: 'مصروف (EXPENSE)',
        date: '2026-09-05',
        expense: 32500,
        income: 0,
        description: '13 الف طوبه (13*2500)',
        category: 'طوب بناء (BRICKS)',
        vendor: 'مورد طوب (Bricks Supplier)',
        workman: '-',
        client: projectInfo.clientName,
        recordedBy: projectInfo.engineerName,
        auditNotes: 'سداد نقدي لمورد الطوب - توريد 13 ألف طوبة بسعر 2,500 ج/ألف'
    },
    {
        id: 'EXP-5',
        type: 'مصروف (EXPENSE)',
        date: '2026-09-05',
        expense: 3300,
        income: 0,
        description: 'تشوين 13 الف طوبه',
        category: 'تشوين ونقل (STOCKING_SERVICES)',
        vendor: 'وليد (مقاول تشوين ونقل)',
        workman: 'وليد (عمال تشوين) (Walid Stocking)',
        client: projectInfo.clientName,
        recordedBy: projectInfo.engineerName,
        auditNotes: 'نقدي من عهدة المهندس - تشوين وتنزيل 13 ألف طوبة بالموقع'
    },
    {
        id: 'EXP-6',
        type: 'مصروف (EXPENSE)',
        date: '2026-09-05',
        expense: 20000,
        income: 0,
        description: 'مصنعيه + خامات عزل',
        category: 'عزل أسطح وخامات ومصنعية (INSULATION_WORK)',
        vendor: 'مورد مستلزمات بناء وموقع (Site Supplies Supplier)',
        workman: 'عادل طلعت (Adel Talaat - LABORER)',
        client: projectInfo.clientName,
        recordedBy: projectInfo.engineerName,
        auditNotes: 'نقدي من عهدة المهندس - استكمال خامات ومصنعيات عزل السطح'
    },
    {
        id: 'EXP-7',
        type: 'مصروف (EXPENSE)',
        date: '2026-09-05',
        expense: 1350,
        income: 0,
        description: '5 م رمل (5*270)',
        category: 'رمل بناء (SAND)',
        vendor: 'مورد رمل وسن (Sand & Aggregate Supplier)',
        workman: '-',
        client: projectInfo.clientName,
        recordedBy: projectInfo.engineerName,
        auditNotes: 'سداد نقدي لمورد الرمل - توريد 5 م³ رمل بسعر 270 ج/م³'
    },
    {
        id: 'EXP-8',
        type: 'مصروف (EXPENSE)',
        date: '2026-09-05',
        expense: 1000,
        income: 0,
        description: '2 عماله نظافه سطح',
        category: 'نظافة موقع وسطح (SITE_CLEANING)',
        vendor: '-',
        workman: 'عادل طلعت (Adel Talaat - LABORER)',
        client: projectInfo.clientName,
        recordedBy: projectInfo.engineerName,
        auditNotes: 'نقدي يوميات - يوميات 2 عمال لنظافة وتجهيز السطح'
    },
    {
        id: 'EXP-9',
        type: 'مصروف (EXPENSE)',
        date: '2026-09-05',
        expense: 8000,
        income: 0,
        description: '2 طن اسمنت ( بناء سطح + دور اخير )',
        category: 'أسمنت بناء (CEMENT)',
        vendor: 'مورد أسمنت وحديد (Cement & Steel Supplier)',
        workman: '-',
        client: projectInfo.clientName,
        recordedBy: projectInfo.engineerName,
        auditNotes: 'سداد نقدي - توريد 2 طن أسمنت لبناء السطح والدور الأخير'
    },
    {
        id: 'EXP-10',
        type: 'مصروف (EXPENSE)',
        date: '2026-09-05',
        expense: 2000,
        income: 0,
        description: '4 عماله تشوين + تطليع عزل',
        category: 'تشوين ونقل عزل (STOCKING_SERVICES)',
        vendor: 'وليد (مقاول تشوين ونقل)',
        workman: 'وليد (عمال تشوين) (Walid Stocking)',
        client: projectInfo.clientName,
        recordedBy: projectInfo.engineerName,
        auditNotes: 'نقدي يوميات - تشوين وتطليع مواد العزل للسطح عبر 4 عمال'
    },
    {
        id: 'EXP-11',
        type: 'مصروف (EXPENSE)',
        date: '2026-09-05',
        expense: 500,
        income: 0,
        description: 'عماله نظافه سطح',
        category: 'نظافة موقع وسطح (SITE_CLEANING)',
        vendor: '-',
        workman: 'عادل طلعت (Adel Talaat - LABORER)',
        client: projectInfo.clientName,
        recordedBy: projectInfo.engineerName,
        auditNotes: 'نقدي يوميات - استكمال أعمال نظافة السطح'
    },
    {
        id: 'EXP-12',
        type: 'مصروف (EXPENSE)',
        date: '2026-09-05',
        expense: 2500,
        income: 0,
        description: '3م رمل + 0.5 طن',
        category: 'رمل وأسمنت (MATERIALS)',
        vendor: 'مورد رمل وسن (Sand & Aggregate Supplier)',
        workman: '-',
        client: projectInfo.clientName,
        recordedBy: projectInfo.engineerName,
        auditNotes: 'سداد نقدي - توريد 3 م³ رمل ونصف طن أسمنت للموقع'
    },
    {
        id: 'EXP-13',
        type: 'مصروف (EXPENSE)',
        date: '2026-09-05',
        expense: 2150,
        income: 0,
        description: '10 شكاير اسمنت (للعزل)',
        category: 'أسمنت عزل (CEMENT)',
        vendor: 'مورد أسمنت وحديد (Cement & Steel Supplier)',
        workman: '-',
        client: projectInfo.clientName,
        recordedBy: projectInfo.engineerName,
        auditNotes: 'سداد نقدي - توريد 10 شكاير أسمنت مخصصة لأعمال العزل'
    }
];

function buildWorkbook() {
    const wb = XLSX.utils.book_new();

    // ----------------------------------------------------
    // Sheet 1: المعاملات المالية المفصلة
    // ----------------------------------------------------
    const ws1Data = [];

    // Header Title
    ws1Data.push([`جدول المعاملات المالية المعتمدة - مشروع ${projectInfo.name} (${projectInfo.clientName})`]);
    ws1Data.push([`كود المشروع: ${projectInfo.code} | الموقع: ${projectInfo.location} | العميل: ${projectInfo.clientName} | نسبة أتعاب الإدارة: ${projectInfo.feePercent}% | المشرف المسؤول: ${projectInfo.engineerName}`]);
    ws1Data.push([]); // blank

    // Table Header
    const headers1 = [
        'م',
        'نوع المعاملة',
        'التاريخ',
        'المبلغ المنصرف (ج.م)',
        'المبلغ الوارد (ج.م)',
        'البيان والتفاصيل الأصلية',
        'البند وتصنيف التكلفة',
        'المورد المعتمد بالنظام (Vendor)',
        'الصنايعي / المقاول المعتمد (Workman)',
        'العميل المعتمد (Client)',
        'صرف بمعرفة / الموظف المسؤول',
        'طريقة الدفع وملاحظات التدقيق'
    ];
    ws1Data.push(headers1);

    // Data rows
    let totalExpense = 0;
    let totalIncome = 0;

    transactions.forEach(t => {
        totalExpense += t.expense;
        totalIncome += t.income;
        ws1Data.push([
            t.id,
            t.type,
            t.date,
            t.expense,
            t.income,
            t.description,
            t.category,
            t.vendor,
            t.workman,
            t.client,
            t.recordedBy,
            t.auditNotes
        ]);
    });

    // Total Row
    ws1Data.push([
        'الإجمالي',
        'مجموع المعاملات',
        '-',
        totalExpense,
        totalIncome,
        `إجمالي المنصرف: ${totalExpense.toLocaleString()} ج.م | إجمالي الوارد: ${totalIncome.toLocaleString()} ج.م`,
        '-',
        '-',
        '-',
        '-',
        '-',
        `صافي رصيد المشروع الافتراضي: ${(totalIncome - totalExpense).toLocaleString()} ج.م`
    ]);

    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);

    // RTL and layout
    ws1['!views'] = [{ rightToLeft: true }];
    ws1['!cols'] = [
        { wch: 10 },  // م
        { wch: 18 },  // نوع المعاملة
        { wch: 14 },  // التاريخ
        { wch: 18 },  // المبلغ المنصرف
        { wch: 18 },  // المبلغ الوارد
        { wch: 38 },  // البيان
        { wch: 34 },  // البند
        { wch: 38 },  // المورد
        { wch: 36 },  // الصنايعي
        { wch: 32 },  // العميل
        { wch: 34 },  // صرف بمعرفة
        { wch: 50 }   // ملاحظات التدقيق
    ];

    // Styles for Sheet 1
    const cellStyleHeader = {
        font: { name: 'Arial', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E293B' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
            top: { style: 'thin', color: { rgb: 'CBD5E1' } },
            bottom: { style: 'medium', color: { rgb: '0F172A' } },
            left: { style: 'thin', color: { rgb: 'CBD5E1' } },
            right: { style: 'thin', color: { rgb: 'CBD5E1' } }
        }
    };

    const cellStyleTitle = {
        font: { name: 'Arial', sz: 14, bold: true, color: { rgb: '0F172A' } },
        alignment: { horizontal: 'center', vertical: 'center' }
    };

    const cellStyleSubTitle = {
        font: { name: 'Arial', sz: 10, italic: true, color: { rgb: '475569' } },
        alignment: { horizontal: 'center', vertical: 'center' }
    };

    const cellStyleIncomeRow = {
        font: { name: 'Arial', sz: 10, bold: true },
        fill: { fgColor: { rgb: 'F0FDF4' } }, // light green
        alignment: { vertical: 'center' },
        border: {
            top: { style: 'thin', color: { rgb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
    };

    const cellStyleExpenseRow = {
        font: { name: 'Arial', sz: 10 },
        alignment: { vertical: 'center' },
        border: {
            top: { style: 'thin', color: { rgb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
    };

    const cellStyleTotal = {
        font: { name: 'Arial', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '0F172A' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
            top: { style: 'medium', color: { rgb: '0F172A' } },
            bottom: { style: 'medium', color: { rgb: '0F172A' } }
        }
    };

    // Apply styles to sheet 1
    const range1 = XLSX.utils.decode_range(ws1['!ref']);
    for (let R = range1.s.r; R <= range1.e.r; ++R) {
        for (let C = range1.s.c; C <= range1.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws1[cellRef]) continue;

            if (R === 0) {
                ws1[cellRef].s = cellStyleTitle;
            } else if (R === 1) {
                ws1[cellRef].s = cellStyleSubTitle;
            } else if (R === 3) {
                ws1[cellRef].s = cellStyleHeader;
            } else if (R === range1.e.r) {
                ws1[cellRef].s = cellStyleTotal;
            } else if (R > 3) {
                const isIncome = ws1[XLSX.utils.encode_cell({ r: R, c: 1 })]?.v?.toString().includes('إيراد');
                ws1[cellRef].s = isIncome ? { ...cellStyleIncomeRow } : { ...cellStyleExpenseRow };
                if (C === 3 || C === 4) {
                    ws1[cellRef].z = '#,##0 "ج.م"';
                    ws1[cellRef].s.alignment = { horizontal: 'right', vertical: 'center' };
                }
            }
        }
    }

    XLSX.utils.book_append_sheet(wb, ws1, 'المعاملات المالية المفصلة');

    // ----------------------------------------------------
    // Sheet 2: الملخص المالي والتدقيق
    // ----------------------------------------------------
    const ws2Data = [
        [`الملخص المالي والتدقيق المعتمد - مشروع ${projectInfo.name}`],
        [`كود المشروع: ${projectInfo.code} | العميل: ${projectInfo.clientName} | المشرف: ${projectInfo.engineerName}`],
        [],
        ['المؤشر المالي', 'القيمة (ج.م)', 'المعادلة وطريقة الحساب', 'ملاحظات التدقيق'],
        ['إجمالي الدفعات الواردة من العميل', totalIncome, 'مجموع سندات القبض والدفعات المسلمة من العميل', 'دفعة نقدية معتمدة بتاريخ 2026-09-05'],
        ['إجمالي المصروفات الفعلية المنفذة', totalExpense, 'مجموع مصنعيات البناء والسباكة والعزل وخامات الطوب والأسمنت والرمل والنظافة والتشوين', '13 بند ومصروف فعلي'],
        ['نسبة أتعاب الإدارة والإشراف المعتمدة', `${projectInfo.feePercent}%`, 'نسبة الاتفاق التعاقدي لمشروع د/ايمان', 'تم اعتماد نسبة 0% بناءً على تعليمات الإدارة'],
        ['قيمة أتعاب الإدارة المستحقة', 0, `المصروفات الفعلية × ${projectInfo.feePercent}%`, '0 ج.م (نسبة 0%)'],
        ['صافي رصيد خزينة المشروع الافتراضية', totalIncome - totalExpense, 'إجمالي الوارد - إجمالي المصروفات الفعلية', (totalIncome - totalExpense < 0 ? 'عجز في الخزينة بمقدار 23,050 ج.م - مطلوب دفعة تعزيز من العميل' : 'فائض في خزينة المشروع')],
        [],
        ['الأطراف المعتمدة المرتبطة بالمشروع (Stakeholders Mapping)'],
        ['نوع الطرف', 'الاسم المعتمد في نظام حسابي', 'الدور في المشروع والتوريدات', 'المعاملات المرتبطة في الشيت'],
        ['عميل المشروع (Client)', projectInfo.clientName, 'مالك المشروع والممول للدفعات', 'دفعة واردة بقيمة 100,000 ج.م'],
        ['المشرف المسؤول (Responsible User)', projectInfo.engineerName, 'مهندس الموقع وإدارة التنفيذ والصرف المباشر', 'صرف بمعرفة م/ حسام البيطار لجميع البنود'],
        ['مقاول/صنايعي البناء (Workman)', 'محمود البنان (Mahmoud El-Bannan)', 'أعمال بناء 13 ألف طوبة للسطح والدور الأخير', 'بند 1: 9,750 ج.م'],
        ['صنايعي السباكة (Workman)', 'روف سباك (Raoof Plumber)', 'تنفيذ وتأسيس أعمال السباكة', 'بند 2: 10,000 ج.م'],
        ['مقاول وعمال التشوين (Workman/Supplier)', 'وليد (عمال تشوين) / وليد (مقاول تشوين ونقل)', 'تشوين وتنزيل 13 ألف طوبة وتطليع مواد العزل للسطح', 'بند 5: 3,300 ج.م + بند 10: 2,000 ج.م (إجمالي 5,300 ج.م)'],
        ['مورد الطوب (Supplier)', 'مورد طوب (Bricks Supplier) [أو ابو دنيا]', 'توريد 13 ألف طوبة مباني', 'بند 4: 32,500 ج.م'],
        ['مورد الرمل والسن (Supplier)', 'مورد رمل وسن (Sand & Aggregate Supplier)', 'توريد رمل البناء والعزل (5 م³ + 3 م³)', 'بند 7: 1,350 ج.م + بند 12: رمل مع أسمنت'],
        ['مورد الأسمنت (Supplier)', 'مورد أسمنت وحديد (Cement & Steel Supplier)', 'توريد 2 طن أسمنت + 10 شكاير عزل + نصف طن', 'بند 9: 8,000 ج.م + بند 12: 2,500 ج.م + بند 13: 2,150 ج.م'],
        ['مورد خامات ومستلزمات العزل (Supplier)', 'مورد مستلزمات بناء وموقع (Site Supplies Supplier)', 'توريد خامات ومواد عزل الأسطح', 'بند 3: 30,000 ج.م + بند 6: 20,000 ج.م'],
        ['عمالة النظافة والموقع (Workman)', 'عادل طلعت (Adel Talaat - LABORER)', 'يوميات نظافة السسطح وتجهيز الموقع للعزل', 'بند 8: 1,000 ج.م + بند 11: 500 ج.م (إجمالي 1,500 ج.م)'],
        ['المحاسب المالي المدقق (Accountant)', 'Marehan Mohamed', 'مراجعة وتدقيق المستندات والترحيل للخزينة', 'تدقيق محاسبي']
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
    ws2['!views'] = [{ rightToLeft: true }];
    ws2['!cols'] = [
        { wch: 35 },
        { wch: 22 },
        { wch: 45 },
        { wch: 55 }
    ];

    const range2 = XLSX.utils.decode_range(ws2['!ref']);
    for (let R = range2.s.r; R <= range2.e.r; ++R) {
        for (let C = range2.s.c; C <= range2.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws2[cellRef]) continue;

            if (R === 0 || R === 10) {
                ws2[cellRef].s = cellStyleTitle;
            } else if (R === 1) {
                ws2[cellRef].s = cellStyleSubTitle;
            } else if (R === 3 || R === 11) {
                ws2[cellRef].s = cellStyleHeader;
            } else if (R >= 4 && R <= 8) {
                ws2[cellRef].s = {
                    font: { name: 'Arial', sz: 10, bold: (C === 0 || C === 1) },
                    fill: { fgColor: { rgb: R === 8 ? 'FEE2E2' : 'F8FAFC' } },
                    alignment: { vertical: 'center' },
                    border: {
                        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
                        bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
                        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
                        right: { style: 'thin', color: { rgb: 'CBD5E1' } }
                    }
                };
                if (C === 1 && typeof ws2[cellRef].v === 'number') {
                    ws2[cellRef].z = '#,##0 "ج.م"';
                }
            } else if (R >= 12) {
                ws2[cellRef].s = {
                    font: { name: 'Arial', sz: 10 },
                    fill: { fgColor: { rgb: R % 2 === 0 ? 'F8FAFC' : 'FFFFFF' } },
                    alignment: { vertical: 'center' },
                    border: {
                        top: { style: 'thin', color: { rgb: 'E2E8F0' } },
                        bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
                        left: { style: 'thin', color: { rgb: 'E2E8F0' } },
                        right: { style: 'thin', color: { rgb: 'E2E8F0' } }
                    }
                };
            }
        }
    }

    XLSX.utils.book_append_sheet(wb, ws2, 'الملخص المالي والتدقيق');

    return wb;
}

function main() {
    const wb = buildWorkbook();

    const outDir1 = path.resolve('..'); // Engineers-Management root
    const outDir2 = path.resolve('../exported_excel_mappings');
    const outDir3 = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\04fc6468-ed8b-4e17-a115-2c4b75191bb0';

    if (!fs.existsSync(outDir2)) fs.mkdirSync(outDir2, { recursive: true });

    const filename = 'Project_3_Dr_Eman_Elbetar_Mapped.xlsx';

    const p1 = path.join(outDir1, filename);
    const p2 = path.join(outDir2, filename);
    const p3 = path.join(outDir3, filename);

    XLSX.writeFile(wb, p1);
    XLSX.writeFile(wb, p2);
    XLSX.writeFile(wb, p3);

    console.log(`Excel file generated successfully in:`);
    console.log(`1: ${p1}`);
    console.log(`2: ${p2}`);
    console.log(`3: ${p3}`);
}

main();
