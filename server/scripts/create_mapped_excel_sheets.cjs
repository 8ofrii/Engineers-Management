const XLSX = require('./client/node_modules/xlsx-js-style');
const path = require('path');
const fs = require('fs');

// Destination paths
const outDir = path.join(__dirname, 'exported_excel_mappings');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Styling definitions
const borderThin = {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } }
};

const headerStyle = {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E293B' } }, // Slate 800
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderThin
};

const incomeHeaderStyle = {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '047857' } }, // Emerald 700
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderThin
};

const expenseHeaderStyle = {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: 'B91C1C' } }, // Red 700
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderThin
};

const titleHeaderStyle = {
    font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center' }
};

const subTitleStyle = {
    font: { name: 'Calibri', sz: 11, italic: true, color: { rgb: '334155' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'center', vertical: 'center' }
};

const cellCenter = {
    font: { name: 'Calibri', sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderThin
};

const cellRight = {
    font: { name: 'Calibri', sz: 10 },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: borderThin
};

const numIncome = {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '047857' } },
    numFmt: '#,##0.00',
    fill: { fgColor: { rgb: 'F0FDF4' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: borderThin
};

const numExpense = {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'B91C1C' } },
    numFmt: '#,##0.00',
    fill: { fgColor: { rgb: 'FEF2F2' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: borderThin
};

const totalStyle = {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'E2E8F0' } },
    numFmt: '#,##0.00',
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
        top: { style: 'thin', color: { rgb: '64748B' } },
        bottom: { style: 'double', color: { rgb: '0F172A' } },
        left: { style: 'thin', color: { rgb: '64748B' } },
        right: { style: 'thin', color: { rgb: '64748B' } }
    }
};

const totalLabelStyle = {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'E2E8F0' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
        top: { style: 'thin', color: { rgb: '64748B' } },
        bottom: { style: 'double', color: { rgb: '0F172A' } },
        left: { style: 'thin', color: { rgb: '64748B' } },
        right: { style: 'thin', color: { rgb: '64748B' } }
    }
};

// ==========================================
// DATASET 1: Eng. Walid (Bata) - Finishes
// ==========================================
const walidIncomes = [
    { seq: 1, amount: 120000, date: '2026-05-01', desc: 'دفعة تحت حساب التشطيبات من العميل م/ وليد', client: 'Eng.walid (م/وليد)', method: 'تحويل بنكي / إيداع خزينة', safe: 'خزينة المشروع / المقر', payer: 'حسام البيطار (Eng. Hossam Elbetar)' },
    { seq: 2, amount: 30000, date: '2026-05-05', desc: 'دفعة تحت حساب التشطيبات والسباكة', client: 'Eng.walid (م/وليد)', method: 'تحويل بنكي / إيداع خزينة', safe: 'خزينة المشروع / المقر', payer: 'حسام البيطار (Eng. Hossam Elbetar)' },
    { seq: 3, amount: 30000, date: '2026-05-10', desc: 'دفعة تحت حساب خامات وسيراميك', client: 'Eng.walid (م/وليد)', method: 'تحويل بنكي / إيداع خزينة', safe: 'خزينة المشروع / المقر', payer: 'حسام البيطار (Eng. Hossam Elbetar)' },
    { seq: 4, amount: 50000, date: '2026-05-12', desc: 'دفعة تحت حساب أعمال الطوب والكهرباء', client: 'Eng.walid (م/وليد)', method: 'تحويل بنكي / إيداع خزينة', safe: 'خزينة المشروع / المقر', payer: 'حسام البيطار (Eng. Hossam Elbetar)' },
    { seq: 5, amount: 100000, date: '2026-05-15', desc: 'دفعة تحت حساب مرحلة التأسيسات والتكييف', client: 'Eng.walid (م/وليد)', method: 'تحويل بنكي / إيداع خزينة', safe: 'خزينة المشروع / المقر', payer: 'حسام البيطار (Eng. Hossam Elbetar)' },
    { seq: 6, amount: 100000, date: '2026-05-18', desc: 'دفعة تحت حساب الرسومات والمصنعيات', client: 'Eng.walid (م/وليد)', method: 'تحويل بنكي / إيداع خزينة', safe: 'خزينة المشروع / المقر', payer: 'حسام البيطار (Eng. Hossam Elbetar)' },
    { seq: 7, amount: 50000, date: '2026-05-19', desc: 'دفعة نقدية تحت حساب التشطيبات', client: 'Eng.walid (م/وليد)', method: 'تحويل بنكي / إيداع خزينة', safe: 'خزينة المشروع / المقر', payer: 'حسام البيطار (Eng. Hossam Elbetar)' },
    { seq: 8, amount: 50000, date: '2026-05-20', desc: 'دفعة نقدية مسجلة بالتاريخ 20-05-2026', client: 'Eng.walid (م/وليد)', method: 'تحويل بنكي / إيداع خزينة', safe: 'خزينة المشروع / المقر', payer: 'حسام البيطار (Eng. Hossam Elbetar)' }
];

const walidExpenses = [
    { seq: 1, amount: 100000, desc: 'فاتورة الجزار خامات سيراميك', cat: 'خامات سيراميك (CERAMIC_MATERIALS)', vendor: 'الجزار للسيراميك (El-Gazzar Ceramics)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'تحويل بنكي / شيك', note: 'مطابقة تامة مع المورد المعتمد الجزار للسيراميك' },
    { seq: 2, amount: 20000, desc: 'تحت حساب خامات و مصنعية السباكة', cat: 'خامات سباكة (PLUMBING_MATERIALS)', vendor: 'FMHS (خامات سباكة)', workman: 'محمد سباك (Mohamed Plumber)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'خامات سباكة مع السباك محمد' },
    { seq: 3, amount: 2800, desc: 'فاتورة الجزار خامات سيراميك', cat: 'خامات سيراميك (CERAMIC_MATERIALS)', vendor: 'الجزار للسيراميك (El-Gazzar Ceramics)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'نقدي', note: 'فاتورة مكملة مع الجزار للسيراميك' },
    { seq: 4, amount: 4900, desc: 'بناء طوب', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: 'ابو دنيا (Abo donia)', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'أعمال بناء مع البناء محمود البنان' },
    { seq: 5, amount: 500, desc: 'كانات طوب', cat: 'مستلزمات ومواد بناء (SITE_SUPPLIES)', vendor: 'مورد مستلزمات بناء وموقع (Site Supplies Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'مستلزمات حديد وتثبيت طوب' },
    { seq: 6, amount: 1, desc: 'رسومات هندسية', cat: 'رسومات وتصميم (DESIGN_FEES)', vendor: 'حسام البيطار (مهندس إنشائي)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'نقدي', note: 'بند رسومات رمزية في المسودة' },
    { seq: 7, amount: 1000, desc: 'بناء طوب', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: '-', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'مصنعية بناء مع محمود البنان' },
    { seq: 8, amount: 2000, desc: 'مصنعية محارة', cat: 'مصنعية محارة (PLASTER_LABOR)', vendor: '-', workman: 'احمد مبيض محارة (Ahmed Plasterer)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'مصنعية محارة مع احمد مبيض المحارة' },
    { seq: 9, amount: 16500, desc: 'تحت حساب خامات و مصنعية السباكة', cat: 'مصنعية سباكة (PLUMBING_LABOR)', vendor: '-', workman: 'محمد سباك (Mohamed Plumber)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'دفعة مصنعية تأسيس سباكة' },
    { seq: 10, amount: 1700, desc: 'فتحة كور (تأسيس تكييف)', cat: 'تأسيس تكييف (HVAC)', vendor: 'الاعصر للتكييفات (El-Aasar HVAC)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'نقدي', note: 'عمل فتحات كور لتمديد التكييف' },
    { seq: 11, amount: 28700, desc: 'الاعصر للتكيفات', cat: 'تأسيس تكييف (HVAC)', vendor: 'الاعصر للتكييفات (El-Aasar HVAC)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'تحويل بنكي / نقدي', note: 'مطابقة تامة مع شركة الاعصر للتكييفات المعتمدة' },
    { seq: 12, amount: 1550, desc: 'فاتورة كهرباء', cat: 'خامات كهرباء (ELECTRICITY_MATERIALS)', vendor: 'اسلام ابو ياسر (Islam abo yasser)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'مورد الكهرباء المعتمد بالنظام' },
    { seq: 13, amount: 150, desc: '2 لفة سوستة', cat: 'خامات كهرباء (ELECTRICITY_MATERIALS)', vendor: 'اسلام ابو ياسر (Islam abo yasser)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'سوست سحب أسلاك كهرباء' },
    { seq: 14, amount: 6500, desc: 'مصنعية كهربائى', cat: 'مصنعية كهرباء (ELECTRICAL_LABOR)', vendor: '-', workman: 'محمود ريكا (Mahmoud Rika)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'الكهربائي المعتمد محمود ريكا' },
    { seq: 15, amount: 12000, desc: 'مصنعية محارة (عمال جدد)', cat: 'مصنعية محارة (PLASTER_LABOR)', vendor: '-', workman: 'احمد مبيض محارة (Ahmed Plasterer)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'عمال محارة تحت إشراف مبيض المحارة' },
    { seq: 16, amount: 2000, desc: 'مصنعية محارة', cat: 'مصنعية محارة (PLASTER_LABOR)', vendor: '-', workman: 'احمد مبيض محارة (Ahmed Plasterer)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'دفعة محارة إضافية' },
    { seq: 17, amount: 500, desc: 'نقل سيراميك حمامات', cat: 'نقل ومشالات (TRANSPORTATION)', vendor: 'سائق النقل / مقاول النقل (Transport & Logistics)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'نقل السيراميك من المعرض للموقع' },
    { seq: 18, amount: 200, desc: 'اكراميات ونثريات', cat: 'إكراميات ونثريات (TIPS)', vendor: '-', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'إكراميات حراسة وعمال' },
    { seq: 19, amount: 100, desc: '3 لمبة + 3 دويان', cat: 'خامات كهرباء (ELECTRICITY_MATERIALS)', vendor: 'اسلام ابو ياسر (Islam abo yasser)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'إنارة مؤقتة للموقع' },
    { seq: 20, amount: 1500, desc: 'نقل عمال الى القاهرة', cat: 'نقل ومشالات (TRANSPORTATION)', vendor: 'سائق النقل / مقاول النقل (Transport & Logistics)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'مصاريف انتقال عمال' },
    { seq: 21, amount: 800, desc: 'نقل سيراميك ارضيات', cat: 'نقل ومشالات (TRANSPORTATION)', vendor: 'سائق النقل / مقاول النقل (Transport & Logistics)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'نقل باقي السيراميك' },
    { seq: 22, amount: 2500, desc: 'مصنعية كهربائى', cat: 'مصنعية كهرباء (ELECTRICAL_LABOR)', vendor: '-', workman: 'محمود ريكا (Mahmoud Rika)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'دفعة مصنعية كهرباء' },
    { seq: 23, amount: 900, desc: '10 لمبة + 10 دواية (انارة شقة)', cat: 'خامات كهرباء (ELECTRICITY_MATERIALS)', vendor: 'اسلام ابو ياسر (Islam abo yasser)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'خامات إنارة الشقة' },
    { seq: 24, amount: 800, desc: 'مبانى طوب (حمام+كتف غرفة نوم)+تكسير شباك', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: '-', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'تعديلات معمارية وبناء' },
    { seq: 25, amount: 2000, desc: 'عنتر الحداد رفوف حمام', cat: 'أعمال حدادة (IRON_WORKS)', vendor: '-', workman: 'عنتر (حداد) (Antar (7dad))', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'الحداد عنتر المعتمد بالنظام' },
    { seq: 26, amount: 14000, desc: 'تصميم 3dmax', cat: 'رسومات وتصميم (DESIGN_FEES)', vendor: 'حسام البيطار (مهندس إنشائي)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'تحويل بنكي / نقدي', note: 'تصميمات داخلية 3D Max للشقة' },
    { seq: 27, amount: 12800, desc: 'فاتورة بضاعة تركيب سيراميك (مونه ولواصق)', cat: 'خامات سيراميك (CERAMIC_MATERIALS)', vendor: 'الجزار للسيراميك (El-Gazzar Ceramics)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'نقدي', note: 'لواصق وسيراميك من معرض الجزار' },
    { seq: 28, amount: 600, desc: 'يومية عامل تكسير', cat: 'مصنعية عمالة (GENERAL_LABOR)', vendor: '-', workman: 'عادل طلعت (Adel Talaat)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'العامل عادل طلعت المعتمد' },
    { seq: 29, amount: 35300, desc: 'مصنعية سيراميك', cat: 'مصنعية سيراميك (FLOORING_LABOR)', vendor: '-', workman: 'محمد على (Mohamed Ali)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'فني السيراميك والباركيه محمد علي' },
    { seq: 30, amount: 20000, desc: 'تحت حساب جبس بورد', cat: 'مصنعية جبس بورد (GYPSUM_LABOR)', vendor: '-', workman: 'مصطفى جبس بورد (Mostafa Gypsum)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'دفعة أولى مصنعية فني الجبس مصطفى' },
    { seq: 31, amount: 40000, desc: 'تحت حساب جبس بورد', cat: 'مصنعية جبس بورد (GYPSUM_LABOR)', vendor: '-', workman: 'مصطفى جبس بورد (Mostafa Gypsum)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'دفعة ثانية مصنعية فني الجبس مصطفى' },
    { seq: 32, amount: 3000, desc: 'مصنعية نقاش', cat: 'مصنعية دهانات (PAINT_LABOR)', vendor: '-', workman: 'سامح عبد الحليم (Samah Abd Elhalim)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'النقاش سامح عبد الحليم' },
    { seq: 33, amount: 3500, desc: 'مصنعية كهربائى', cat: 'مصنعية كهرباء (ELECTRICAL_LABOR)', vendor: '-', workman: 'محمود ريكا (Mahmoud Rika)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'دفعة تشطيب مفاتيح وكهرباء' },
    { seq: 34, amount: 15000, desc: 'تحت حساب بضاعة نقاشة', cat: 'خامات دهانات (PAINTING_MATERIALS)', vendor: 'معرض دهانات جوتن (Jotun Paints)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'نقدي', note: 'مورد دهانات جوتن المعتمد بالنظام' },
    { seq: 35, amount: 2500, desc: 'مصنعية كهربائى', cat: 'مصنعية كهرباء (ELECTRICAL_LABOR)', vendor: '-', workman: 'محمود ريكا (Mahmoud Rika)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'دفعة كهربائي' },
    { seq: 36, amount: 10000, desc: 'مصنعية نقاش', cat: 'مصنعية دهانات (PAINT_LABOR)', vendor: '-', workman: 'سامح عبد الحليم (Samah Abd Elhalim)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'دفعة معجون وتأسيس نقاشة' },
    { seq: 37, amount: 6000, desc: 'تحت حساب بستلات دهانات جوتن', cat: 'خامات دهانات (PAINTING_MATERIALS)', vendor: 'معرض دهانات جوتن (Jotun Paints)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'نقدي', note: 'بستلات جوتن فينومست وبرايمر' },
    { seq: 38, amount: 10000, desc: 'مصنعية نقاش', cat: 'مصنعية دهانات (PAINT_LABOR)', vendor: '-', workman: 'سامح عبد الحليم (Samah Abd Elhalim)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة / نقدي', note: 'دفعة بطانة نقاشة' },
    { seq: 39, amount: 4000, desc: 'تصميم 3dmax', cat: 'رسومات وتصميم (DESIGN_FEES)', vendor: 'حسام البيطار (مهندس إنشائي)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'نقدي', note: 'باقي أتعاب تصميمات الديكور' },
    { seq: 40, amount: 10000, desc: 'دهانات جوتن', cat: 'خامات دهانات (PAINTING_MATERIALS)', vendor: 'معرض دهانات جوتن (Jotun Paints)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'فاتورة خامات دهانات جوتن' },
    { seq: 41, amount: 3345, desc: 'فاتوره دهانات جوتن', cat: 'خامات دهانات (PAINTING_MATERIALS)', vendor: 'معرض دهانات جوتن (Jotun Paints)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'فاتورة مشتريات جوتن رسمية' },
    { seq: 42, amount: 20000, desc: 'جبس بورد (خامات وألواح)', cat: 'خامات جبس بورد (GYPSUM_MATERIALS)', vendor: 'مورد خامات جبس بورد (Gypsum Materials Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'توريد ألواح وجبس وزوايا صاج' },
    { seq: 43, amount: 7000, desc: 'محمد سباك (تقفيل)', cat: 'مصنعية سباكة (PLUMBING_LABOR)', vendor: '-', workman: 'محمد سباك (Mohamed Plumber)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة مصنعية سباكة تشطيب' },
    { seq: 44, amount: 3000, desc: 'مصنعيه نقاش', cat: 'مصنعية دهانات (PAINT_LABOR)', vendor: '-', workman: 'سامح عبد الحليم (Samah Abd Elhalim)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة نقاش' },
    { seq: 45, amount: 10000, desc: 'مصنعيه نقاش', cat: 'مصنعية دهانات (PAINT_LABOR)', vendor: '-', workman: 'سامح عبد الحليم (Samah Abd Elhalim)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة نقاش دهان أوجه أولى' },
    { seq: 46, amount: 5110, desc: 'فاتوره دهانات جوتن', cat: 'خامات دهانات (PAINTING_MATERIALS)', vendor: 'معرض دهانات جوتن (Jotun Paints)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'فاتورة ألوان وخامات كمبيوتر جوتن' },
    { seq: 47, amount: 6000, desc: 'مصنعيه كهربائى', cat: 'مصنعية كهرباء (ELECTRICAL_LABOR)', vendor: '-', workman: 'محمود ريكا (Mahmoud Rika)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة تقفيل لوحة وأفياش' },
    { seq: 48, amount: 10000, desc: 'مصنعيه نقاش', cat: 'مصنعية دهانات (PAINT_LABOR)', vendor: '-', workman: 'سامح عبد الحليم (Samah Abd Elhalim)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة نقاش' },
    { seq: 49, amount: 10000, desc: 'مصنعيه نقاش', cat: 'مصنعية دهانات (PAINT_LABOR)', vendor: '-', workman: 'سامح عبد الحليم (Samah Abd Elhalim)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة نقاش' },
    { seq: 50, amount: 2000, desc: 'مصنعيه نقاش', cat: 'مصنعية دهانات (PAINT_LABOR)', vendor: '-', workman: 'سامح عبد الحليم (Samah Abd Elhalim)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة نقاش' },
    { seq: 51, amount: 2923, desc: 'فاتوره دهانات جوتن', cat: 'خامات دهانات (PAINTING_MATERIALS)', vendor: 'معرض دهانات جوتن (Jotun Paints)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'فاتورة دهانات جوتن فينيش' },
    { seq: 52, amount: 15000, desc: 'مصنعيه نقاش (تقفيل)', cat: 'مصنعية دهانات (PAINT_LABOR)', vendor: '-', workman: 'سامح عبد الحليم (Samah Abd Elhalim)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة ختامية لمصنعية النقاشة' }
];

// ==========================================
// DATASET 2: Al-Gazzar 2 - Construction
// ==========================================
const gazzarIncomes = [
    { seq: 1, amount: 40000, date: '2026-03-30', desc: 'دفعة نقدية مسجلة 30/3/2026 (اتفاق على 150 الف)', client: 'حسين بيومى الجزار', method: 'نقدي / إيداع خزينة', safe: 'خزينة المشروع / المقر', payer: 'حسام البيطار (Eng. Hossam Elbetar)' },
    { seq: 2, amount: 70000, date: '2026-04-16', desc: 'دفعة نقدية مسجلة 16/4/2026 (اتفاق من 100 لى 120 الف)', client: 'حسين بيومى الجزار', method: 'نقدي / إيداع خزينة', safe: 'خزينة المشروع / المقر', payer: 'حسام البيطار (Eng. Hossam Elbetar)' },
    { seq: 3, amount: 70000, date: '2026-03-05', desc: 'دفعة مسجلة 2026-03-05 صب السلم', client: 'حسين بيومى الجزار', method: 'نقدي / إيداع خزينة', safe: 'خزينة المشروع / المقر', payer: 'حسام البيطار (Eng. Hossam Elbetar)' },
    { seq: 4, amount: 100000, date: '2026-05-17', desc: 'دفعة بنكية مسجلة 2026-05-17', client: 'حسين بيومى الجزار', method: 'تحويل بنكي / إيداع خزينة', safe: 'خزينة المشروع / المقر', payer: 'حسام البيطار (Eng. Hossam Elbetar)' },
    { seq: 5, amount: 150000, date: '2026-06-01', desc: 'دفعة بنكية مسجلة 2026-06-01', client: 'حسين بيومى الجزار', method: 'تحويل بنكي / إيداع خزينة', safe: 'خزينة المشروع / المقر', payer: 'حسام البيطار (Eng. Hossam Elbetar)' },
    { seq: 6, amount: 50000, date: '2026-06-16', desc: 'دفعة نقدية مسجلة 2026-06-16', client: 'حسين بيومى الجزار', method: 'نقدي / إيداع خزينة', safe: 'خزينة المشروع / المقر', payer: 'حسام البيطار (Eng. Hossam Elbetar)' },
    { seq: 7, amount: 100000, date: '2026-06-19', desc: 'دفعة نقدية مسجلة 2026-06-19', client: 'حسين بيومى الجزار', method: 'نقدي / إيداع خزينة', safe: 'خزينة المشروع / المقر', payer: 'حسام البيطار (Eng. Hossam Elbetar)' }
];

const gazzarExpenses = [
    { seq: 123, amount: 5000, date: '2026-03-30', desc: 'مصنعيه بناء (دور اول)', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: '-', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'بند 123 - بناء الدور الأول' },
    { seq: 124, amount: 500, date: '2026-04-16', desc: 'تصريح مجلس المدينه', cat: 'إكراميات ورسوم حكومية (GOV_FEES)', vendor: '-', workman: 'احمد ابراهيم (Ahmed Ibrahim)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'رسوم وتصريح مجلس المدينة' },
    { seq: 125, amount: 20000, date: '2026-03-05', desc: 'مصنعيه مقاول (صب سلم)', cat: 'مقاول خرسانات ومصنعية (CONCRETE)', vendor: 'مقاول صب السلم والخرسانات', workman: 'جمال (مقاول خرسانات)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة أولى مقاول صب السلم' },
    { seq: 126, amount: 2950, date: '2026-05-17', desc: '11م رمل (11*270ج)', cat: 'رمل وسن (SAND)', vendor: 'مورد رمل وسن (Sand & Aggregate Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'توريد 11 م رمل بسعر 270 ج/م' },
    { seq: 127, amount: 6500, date: '2026-06-01', desc: 'تشوين طوب (دور تالت)', cat: 'تشوين ونقل (STOCKING)', vendor: 'وليد (مقاول تشوين ونقل)', workman: 'وليد (عمال تشوين)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'تشوين طوب للدور الثالث' },
    { seq: 128, amount: 1000, date: '2026-06-16', desc: 'مصنعيه بناء (دور اول)', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: '-', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'استكمال بناء الدور الأول' },
    { seq: 129, amount: 10000, date: '2026-06-19', desc: 'مصنعيه بناء (دور اول)', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: '-', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة مصنعية بناء الدور الأول' },
    { seq: 130, amount: 40000, date: '2026-07-02', desc: '16 الف طوبه ( دور تالت )', cat: 'طوب ومواد بناء (BRICKS)', vendor: 'ابو دنيا (Abo donia / Bricks Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'تحويل / شيك', note: 'توريد 16,000 طوبة للدور الثالث' },
    { seq: 131, amount: 40000, date: '2026-07-08', desc: '16 الف طوبه ( دور تالت )', cat: 'طوب ومواد بناء (BRICKS)', vendor: 'ابو دنيا (Abo donia / Bricks Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'تحويل / شيك', note: 'توريد 16,000 طوبة للدور الثالث' },
    { seq: 132, amount: 40000, date: '2026-08-02', desc: '16 الف طوبه ( دور تالت ) - تحويل', cat: 'طوب ومواد بناء (BRICKS)', vendor: 'ابو دنيا (Abo donia / Bricks Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'تحويل بنكي', note: 'توريد طوب عبر تحويل بنكي' },
    { seq: 133, amount: 17500, date: '2026-08-02', desc: '7 الف طوبه (دور تالت) - كاش', cat: 'طوب ومواد بناء (BRICKS)', vendor: 'ابو دنيا (Abo donia / Bricks Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'نقدي كاش', note: 'توريد 7,000 طوبة كاش' },
    { seq: 134, amount: 7000, date: '2026-09-01', desc: 'تشوين طوب (دور تالت)', cat: 'تشوين ونقل (STOCKING)', vendor: 'وليد (مقاول تشوين ونقل)', workman: 'وليد (عمال تشوين)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'تشوين طوب للدور الثالث' },
    { seq: 135, amount: 3000, date: '2026-09-01', desc: 'تشوين طوب (دور تالت)', cat: 'تشوين ونقل (STOCKING)', vendor: 'وليد (مقاول تشوين ونقل)', workman: 'وليد (عمال تشوين)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'تشوين طوب إضافي' },
    { seq: 136, amount: 3240, date: '2026-09-01', desc: '12 م رمل (12*270ج)', cat: 'رمل وسن (SAND)', vendor: 'مورد رمل وسن (Sand & Aggregate Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'توريد 12 م رمل بسعر 270 ج/م' },
    { seq: 137, amount: 500, date: '2026-09-03', desc: 'تصريح ونش', cat: 'إكراميات ورسوم حكومية (GOV_FEES)', vendor: '-', workman: 'احمد ابراهيم (Ahmed Ibrahim)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'تصريح تشغيل ونش الرفع' },
    { seq: 138, amount: 40500, date: '2026-09-09', desc: 'فاتوره (حديد + اسمنت)', cat: 'حديد وأسمنت (STEEL_CEMENT)', vendor: 'سيد نجيب (Sayed Najib)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'تحويل / شيك', note: 'توريد حديد وأسمنت من المورد المعتمد' },
    { seq: 139, amount: 4000, date: '2026-09-22', desc: 'مصنعيه بناء (دور تالت)', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: '-', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'بناء الدور الثالث مع محمود البنان' },
    { seq: 140, amount: 6000, date: '2026-09-24', desc: 'مصنعيه بناء (دور تالت)', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: '-', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة بناء الدور الثالث' },
    { seq: 141, amount: 3000, date: '2026-09-25', desc: 'مصنعيه بناء (دور تالت)', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: '-', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة بناء الدور الثالث' },
    { seq: 142, amount: 6000, date: '2026-09-26', desc: 'مصنعيه بناء (دور تالت)', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: '-', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة بناء الدور الثالث' },
    { seq: 143, amount: 3500, date: '2026-09-27', desc: 'مصنعيه 7 عمال تكسير + نظافه', cat: 'مصنعية عمالة ونظافة (LABOR)', vendor: '-', workman: 'عادل طلعت (Adel Talaat)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: '7 عمال تكسير ونظافة موقع' },
    { seq: 144, amount: 1300, date: '2026-09-27', desc: 'عربيه رتش + تروسكل', cat: 'نقل رتش (TRANSPORTATION)', vendor: 'سائق النقل / مقاول النقل (Transport & Logistics)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'نقل مخلفات بناء ورتش' },
    { seq: 145, amount: 1000, date: '2026-09-28', desc: '2 عمال نقل طوب + اسمنت + رمل', cat: 'مصنعية عمالة (GENERAL_LABOR)', vendor: '-', workman: 'عادل طلعت (Adel Talaat)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'مشالات ونقل مواد' },
    { seq: 146, amount: 2000, date: '2026-09-28', desc: '2 عربيه رتش', cat: 'نقل رتش (TRANSPORTATION)', vendor: 'سائق النقل / مقاول النقل (Transport & Logistics)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'نقل رتش بسيارات نقل' },
    { seq: 147, amount: 500, date: '2026-09-28', desc: 'تصريح ونش (المجلس)', cat: 'إكراميات ورسوم حكومية (GOV_FEES)', vendor: '-', workman: 'احمد ابراهيم (Ahmed Ibrahim)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'رسوم تصريح الونش' },
    { seq: 148, amount: 810, date: '2026-09-29', desc: '3 م رمل', cat: 'رمل وسن (SAND)', vendor: 'مورد رمل وسن (Sand & Aggregate Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'توريد رمل بسعر 270 ج/م' },
    { seq: 149, amount: 2700, date: '2026-09-29', desc: '10 م رمل', cat: 'رمل وسن (SAND)', vendor: 'مورد رمل وسن (Sand & Aggregate Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'توريد 10 م رمل' },
    { seq: 150, amount: 810, date: '2026-09-29', desc: '3 م رمل', cat: 'رمل وسن (SAND)', vendor: 'مورد رمل وسن (Sand & Aggregate Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'توريد رمل' },
    { seq: 151, amount: 12000, date: '2026-09-29', desc: '3 طن اسمنت (3*4000)', cat: 'أسمنت (CEMENT)', vendor: 'يوسف محممود (Cement Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'توريد أسمنت بسعر 4000 ج/طن' },
    { seq: 152, amount: 8000, date: '2026-09-29', desc: '2 طن اسمنت (2*4000)', cat: 'أسمنت (CEMENT)', vendor: 'يوسف محممود (Cement Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'توريد أسمنت بسعر 4000 ج/طن' },
    { seq: 153, amount: 12600, date: '2026-09-30', desc: '3 طن اسمنت (3*4200)', cat: 'أسمنت (CEMENT)', vendor: 'يوسف محممود (Cement Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'توريد أسمنت بسعر 4200 ج/طن' },
    { seq: 154, amount: 8400, date: '2026-09-30', desc: '2 طن اسمنت (2*4200)', cat: 'أسمنت (CEMENT)', vendor: 'يوسف محممود (Cement Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'توريد أسمنت بسعر 4200 ج/طن' },
    { seq: 155, amount: 7500, date: '2026-09-30', desc: 'تكسير السلالم', cat: 'قص وتكسير خرسانات (CONCRETE_CUTTING)', vendor: 'مقاول قص السلم والتكسير', workman: 'احمد البحيري(قص خراسانات)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'تكسير وقص خرسانة السلالم' },
    { seq: 156, amount: 3000, date: '2026-09-30', desc: '6 عمال تشوين حديد (6*500)', cat: 'تشوين ونقل (STOCKING)', vendor: 'وليد (مقاول تشوين ونقل)', workman: 'وليد (عمال تشوين)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'تشوين حديد التسليح' },
    { seq: 157, amount: 1000, date: '2026-09-30', desc: 'برميل مياه لموقع البناء', cat: 'مستلزمات ومعدات موقع (TOOLS)', vendor: 'مورد مستلزمات بناء وموقع (Site Supplies Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'برميل مياه لأعمال البناء' },
    { seq: 158, amount: 40000, date: '2026-09-30', desc: '16 الف طوبه (الدور الرابع)', cat: 'طوب ومواد بناء (BRICKS)', vendor: 'ابو دنيا (Abo donia / Bricks Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'تحويل / شيك', note: 'توريد 16,000 طوبة للدور الرابع' },
    { seq: 159, amount: 7000, date: '2026-09-30', desc: 'تشوين 28 الف طوبه (28*250)', cat: 'تشوين ونقل (STOCKING)', vendor: 'وليد (مقاول تشوين ونقل)', workman: 'وليد (عمال تشوين)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'تشوين 28 ألف طوبة بسعر 250 ج/ألف' },
    { seq: 160, amount: 10450, date: '2026-09-30', desc: 'مصنعيه بناء (دور تالت)', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: '-', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة بناء الدور الثالث' },
    { seq: 161, amount: 1200, date: '2026-09-30', desc: '3 عمال تشوين طوب', cat: 'تشوين ونقل (STOCKING)', vendor: 'وليد (مقاول تشوين ونقل)', workman: 'وليد (عمال تشوين)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'تشوين طوب' },
    { seq: 162, amount: 15000, date: '2026-09-30', desc: 'مصنعيه بناء (دور تالت)', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: '-', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة بناء الدور الثالث' },
    { seq: 163, amount: 3200, date: '2026-09-30', desc: 'يوميات عمال تشوين طوب سلم', cat: 'تشوين ونقل (STOCKING)', vendor: 'وليد (مقاول تشوين ونقل)', workman: 'وليد (عمال تشوين)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'تشوين طوب السلم' },
    { seq: 164, amount: 2500, date: '2026-09-30', desc: '5 رجاله نظافه (سلالم + منور)', cat: 'مصنعية عمالة ونظافة (LABOR)', vendor: '-', workman: 'عادل طلعت (Adel Talaat)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'نظافة سلالم ومناور' },
    { seq: 165, amount: 6000, date: '2026-09-30', desc: 'مصنعيه بناء دور رابع (باقي له 200)', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: '-', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة بناء الدور الرابع (باقي 200)' },
    { seq: 166, amount: 3000, date: '2026-09-30', desc: 'مصنعيه بناء دور رابع (الفرق خرج كاش 120)', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: '-', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة بناء الدور الرابع' },
    { seq: 167, amount: 4000, date: '2026-09-30', desc: 'مصنعيه بناء دور رابع', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: '-', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة بناء الدور الرابع' },
    { seq: 168, amount: 62500, date: '2026-09-30', desc: '25500 طوبه (دور رابع) 25.5*2550', cat: 'طوب ومواد بناء (BRICKS)', vendor: 'ابو دنيا (Abo donia / Bricks Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'تحويل / شيك', note: 'توريد 25,500 طوبة بسعر 2,550 ج/ألف' },
    { seq: 169, amount: 5000, date: '2026-09-30', desc: 'تشوين 20 الف طوبه (دور رابع)', cat: 'تشوين ونقل (STOCKING)', vendor: 'وليد (مقاول تشوين ونقل)', workman: 'وليد (عمال تشوين)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'تشوين 20 ألف طوبة للدور الرابع' },
    { seq: 170, amount: 14000, date: '2026-09-30', desc: '7 مقاطير رتش (7*2000)', cat: 'نقل رتش (TRANSPORTATION)', vendor: 'سائق النقل / مقاول النقل (Transport & Logistics)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'نقل 7 مقاطير مخلفات بسعر 2000 ج/مقطورة' },
    { seq: 171, amount: 1500, date: '2026-09-30', desc: '3 عمال نظافه سلم (3*500)', cat: 'مصنعية عمالة ونظافة (LABOR)', vendor: '-', workman: 'عادل طلعت (Adel Talaat)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'نظافة سلالم الموقع' },
    { seq: 172, amount: 300, date: '2026-09-30', desc: 'تشوين اسمنت', cat: 'تشوين ونقل (STOCKING)', vendor: 'وليد (مقاول تشوين ونقل)', workman: 'وليد (عمال تشوين)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'تشوين شكاير أسمنت' },
    { seq: 173, amount: 13000, date: '2026-09-30', desc: 'تكسير (2 منور) (شقه شمال الواجهه)', cat: 'قص وتكسير خرسانات (CONCRETE_CUTTING)', vendor: 'مقاول قص السلم والتكسير', workman: 'احمد البحيري(قص خراسانات)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'تكسير منورين بشقة شمال الواجهة' },
    { seq: 174, amount: 4000, date: '2026-09-30', desc: 'تكسير (5 منور) (شقه يمين الواجهه)', cat: 'قص وتكسير خرسانات (CONCRETE_CUTTING)', vendor: 'مقاول قص السلم والتكسير', workman: 'احمد البحيري(قص خراسانات)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'تكسير مناور بشقة يمين الواجهة' },
    { seq: 175, amount: 7000, date: '2026-09-30', desc: 'مصنعيه بناء دور رابع', cat: 'مصنعية بناء (MASONRY_LABOR)', vendor: '-', workman: 'محمود البنان (Mahmoud El-Bannan)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'دفعة بناء الدور الرابع' },
    { seq: 176, amount: 50000, date: '2026-09-30', desc: 'مصنعيه مقاول (صب سلم) تقفيل حساب', cat: 'مقاول خرسانات ومصنعية (CONCRETE)', vendor: 'مقاول صب السلم والخرسانات', workman: 'جمال (مقاول خرسانات)', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'تقفيل حساب مقاول صب السلم جمال' },
    { seq: 177, amount: 1620, date: '2026-09-30', desc: '6م رمل', cat: 'رمل وسن (SAND)', vendor: 'مورد رمل وسن (Sand & Aggregate Supplier)', workman: '-', payer: 'حسام البيطار (Eng. Hossam Elbetar)', method: 'عهدة م/ حسام', note: 'توريد 6 م رمل بسعر 270 ج/م' }
];

// Helper to build Workbook
function buildProjectWorkbook(projectName, projectCode, clientName, feePercent, incomes, expenses, fileName) {
    const wb = XLSX.utils.book_new();

    // 1. Transactions Sheet
    const wsData = [];

    // Title Row
    wsData.push([
        { v: `جدول المعاملات المالية المعتمدة - مشروع ${projectName}`, s: titleHeaderStyle },
        null, null, null, null, null, null, null, null, null, null, null
    ]);
    wsData.push([
        { v: `كود المشروع: ${projectCode} | العميل: ${clientName} | نسبة أتعاب الإدارة: ${feePercent}% | نظام الحساب: التكلفة الفعلية + أتعاب إدارة`, s: subTitleStyle },
        null, null, null, null, null, null, null, null, null, null, null
    ]);
    wsData.push([]); // blank

    // Headers
    const headers = [
        { v: 'م', s: headerStyle },
        { v: 'نوع المعاملة', s: headerStyle },
        { v: 'التاريخ', s: headerStyle },
        { v: 'المبلغ المنصرف (ج.م)', s: expenseHeaderStyle },
        { v: 'المبلغ الوارد (ج.م)', s: incomeHeaderStyle },
        { v: 'البيان والتفاصيل الأصلية', s: headerStyle },
        { v: 'البند وتصنيف التكلفة', s: headerStyle },
        { v: 'المورد المعتمد بالنظام (Vendor)', s: headerStyle },
        { v: 'الصنايعي / المقاول المعتمد (Workman)', s: headerStyle },
        { v: 'العميل المعتمد (Client)', s: headerStyle },
        { v: 'صرف بمعرفة / الموظف المسؤول', s: headerStyle },
        { v: 'طريقة الدفع وملاحظات التدقيق', s: headerStyle }
    ];
    wsData.push(headers);

    let totalIncome = 0;
    let totalExpense = 0;

    // Incomes First
    incomes.forEach((inc, idx) => {
        totalIncome += inc.amount;
        wsData.push([
            { v: `IN-${idx + 1}`, s: cellCenter },
            { v: 'إيراد (INCOME)', s: { ...cellCenter, font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '047857' } } } },
            { v: inc.date || '-', s: cellCenter },
            { v: 0, s: cellCenter },
            { v: inc.amount, s: numIncome },
            { v: inc.desc, s: cellRight },
            { v: 'دفعة تحت الحساب من العميل (CLIENT_PAYMENT)', s: cellRight },
            { v: '-', s: cellCenter },
            { v: '-', s: cellCenter },
            { v: inc.client, s: cellCenter },
            { v: inc.payer, s: cellCenter },
            { v: `${inc.method} - ${inc.safe}`, s: cellRight }
        ]);
    });

    // Expenses Next
    expenses.forEach((exp) => {
        totalExpense += exp.amount;
        wsData.push([
            { v: `EX-${exp.seq}`, s: cellCenter },
            { v: 'مصروف (EXPENSE)', s: { ...cellCenter, font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'B91C1C' } } } },
            { v: exp.date || '-', s: cellCenter },
            { v: exp.amount, s: numExpense },
            { v: 0, s: cellCenter },
            { v: exp.desc, s: cellRight },
            { v: exp.cat, s: cellRight },
            { v: exp.vendor, s: cellCenter },
            { v: exp.workman, s: cellCenter },
            { v: clientName, s: cellCenter },
            { v: exp.payer, s: cellCenter },
            { v: `${exp.method} | ${exp.note}`, s: cellRight }
        ]);
    });

    // Totals Row
    const officeProfit = totalExpense * (feePercent / 100);
    const netProjectSafe = totalIncome - (totalExpense + officeProfit);

    wsData.push([
        { v: 'الإجمالي', s: totalLabelStyle },
        { v: `${incomes.length + expenses.length} معاملة`, s: totalLabelStyle },
        { v: '-', s: totalLabelStyle },
        { v: totalExpense, s: { ...totalStyle, font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'B91C1C' } } } },
        { v: totalIncome, s: { ...totalStyle, font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '047857' } } } },
        { v: `إجمالي الوارد: ${totalIncome.toLocaleString()} | إجمالي المنصرف: ${totalExpense.toLocaleString()}`, s: totalLabelStyle },
        { v: `أتعاب الإدارة (${feePercent}%): ${officeProfit.toLocaleString()} ج.م`, s: totalLabelStyle },
        { v: `صافي رصيد الخزينة: ${netProjectSafe.toLocaleString()} ج.م`, s: totalLabelStyle },
        null, null, null, null
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Merge titles
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
        { s: { r: wsData.length - 1, c: 7 }, e: { r: wsData.length - 1, c: 11 } }
    ];

    // Column Widths
    ws['!cols'] = [
        { wch: 8 },  // م
        { wch: 16 }, // النوع
        { wch: 13 }, // التاريخ
        { wch: 18 }, // المنصرف
        { wch: 18 }, // الوارد
        { wch: 38 }, // البيان
        { wch: 32 }, // البند
        { wch: 32 }, // المورد
        { wch: 30 }, // الصنايعي
        { wch: 22 }, // العميل
        { wch: 28 }, // صرف بمعرفة
        { wch: 38 }  // ملاحظات وطريقة الدفع
    ];

    // Enable RTL for Arabic layout
    ws['!views'] = [{ rightToLeft: true }];

    XLSX.utils.book_append_sheet(wb, ws, 'المعاملات المالية المفصلة');

    // 2. Summary Sheet
    const sumData = [
        [{ v: `الملخص المالي والتدقيق المعتمد - مشروع ${projectName}`, s: titleHeaderStyle }, null, null, null],
        [{ v: `كود المشروع: ${projectCode} | العميل: ${clientName}`, s: subTitleStyle }, null, null, null],
        [],
        [{ v: 'المؤشر المالي', s: headerStyle }, { v: 'القيمة (ج.م)', s: headerStyle }, { v: 'المعادلة وطريقة الحساب', s: headerStyle }, { v: 'ملاحظات التدقيق', s: headerStyle }],
        [{ v: 'إجمالي الدفعات الواردة من العميل', s: cellRight }, { v: totalIncome, s: numIncome }, { v: 'مجموع سندات القبض والدفعات المسلمة من العميل', s: cellRight }, { v: `${incomes.length} دفعات نقدية وبنكية`, s: cellCenter }],
        [{ v: 'إجمالي المصروفات الفعلية المنفذة', s: cellRight }, { v: totalExpense, s: numExpense }, { v: 'مجموع الخامات، المشالات، ومصنعيات العمال والمقاولين', s: cellRight }, { v: `${expenses.length} بند ومصروف فعلي`, s: cellCenter }],
        [{ v: `أتعاب الإدارة والإشراف المستحقة (${feePercent}%)`, s: cellRight }, { v: officeProfit, s: { ...numExpense, fill: { fgColor: { rgb: 'FFFBEB' } }, font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'D97706' } } } }, { v: `المصروفات الفعلية × ${feePercent}%`, s: cellRight }, { v: 'أرباح مكتب مستحقة التحويل لحساب الإدارة', s: cellCenter }],
        [{ v: 'صافي رصيد خزينة المشروع الافتراضية', s: cellRight }, { v: netProjectSafe, s: totalStyle }, { v: 'إجمالي الوارد - (إجمالي المصروفات + أتعاب الإدارة)', s: cellRight }, { v: netProjectSafe >= 0 ? 'فائض نقدي متاح' : 'عجز / مطلوب دفعة من العميل لتغطية الرصيد', s: cellCenter }],
        [],
        [{ v: 'الأطراف المعتمدة المرتبطة بالمشروع (Stakeholders)', s: headerStyle }, null, null, null],
        [{ v: 'نوع الطرف', s: headerStyle }, { v: 'الاسم المعتمد في نظام حسابي', s: headerStyle }, { v: 'الدور في المشروع', s: headerStyle }, { v: 'إجمالي المعاملات المرتبطة', s: headerStyle }],
        [{ v: 'عميل المشروع (Client)', s: cellCenter }, { v: clientName, s: cellCenter }, { v: 'مالك المشروع والممول للدفعات', s: cellRight }, { v: `${totalIncome.toLocaleString()} ج.م وارد`, s: cellCenter }],
        [{ v: 'المشرف المسؤول (Responsible User)', s: cellCenter }, { v: 'حسام البيطار (Eng. Hossam Elbetar)', s: cellCenter }, { v: 'إدارة الموقع والتنفيذ والصرف', s: cellRight }, { v: 'مشرف رئيسي معتمد', s: cellCenter }],
        [{ v: 'المحاسب المالي (Accountant)', s: cellCenter }, { v: 'Marehan Mohamed', s: cellCenter }, { v: 'التسجيل والتدقيق المالي', s: cellRight }, { v: 'مراجعة قيود وسندات الصرف', s: cellCenter }]
    ];

    const sumWs = XLSX.utils.aoa_to_sheet(sumData);
    sumWs['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
        { s: { r: 9, c: 0 }, e: { r: 9, c: 3 } }
    ];
    sumWs['!cols'] = [{ wch: 34 }, { wch: 22 }, { wch: 42 }, { wch: 35 }];
    sumWs['!views'] = [{ rightToLeft: true }];
    XLSX.utils.book_append_sheet(wb, sumWs, 'الملخص المالي والتدقيق');

    // Save File
    const targetFile = path.join(outDir, fileName);
    XLSX.writeFile(wb, targetFile);

    // Also copy to root for easy user access
    const rootTarget = path.join(__dirname, fileName);
    XLSX.writeFile(wb, rootTarget);

    console.log(`Generated: ${fileName} (${incomes.length} incomes, ${expenses.length} expenses)`);
    return { targetFile, rootTarget, totalIncome, totalExpense, officeProfit, netProjectSafe };
}

// Generate Both
console.log('Generating Walid finishes mapping sheet...');
const r1 = buildProjectWorkbook(
    'م/ وليد - بطا (تشطيبات)',
    'PRJ-WALID-BATA',
    'Eng.walid (م/وليد)',
    15, // 15% as registered on project
    walidIncomes,
    walidExpenses,
    'Project_1_Walid_Bata_Finishes_Mapped.xlsx'
);

console.log('Generating Al-Gazzar 2 construction mapping sheet...');
const r2 = buildProjectWorkbook(
    'الجزار 2 (إنشائي ومباني)',
    'PRJ-ALGAZZAR-2',
    'حسين بيومى الجزار',
    10, // 10% as registered on project
    gazzarIncomes,
    gazzarExpenses,
    'Project_2_AlGazzar2_Construction_Mapped.xlsx'
);

console.log('Done generating all workbooks.');
