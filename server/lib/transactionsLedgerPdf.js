// PDF generator for Official Accounting Transactions Ledger.
// Uses pdfkit with full Arabic (RTL) and Unicode support.
// Produces an authentic, high-resolution executive A4 Landscape ledger document
// with cohesive company branding, multi-page pagination, and full audit controls.

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupDocFonts, drawPdfText, formatPdfText, isArabic as detectArabic } from './arabicPdfHelper.js';
import { ARABIC_CATEGORIES } from '../constants/arabicCategories.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const catLookup = {};
if (Array.isArray(ARABIC_CATEGORIES)) {
    ARABIC_CATEGORIES.forEach(c => {
        catLookup[c.key] = c;
        catLookup[c.key.toLowerCase()] = c;
    });
}
catLookup['CLIENT_PAYMENT'] = { ar: 'دفعة عميل', en: 'Client Payment' };
catLookup['MATERIALS_PURCHASE'] = { ar: 'توريد خامات', en: 'Materials' };
catLookup['MANAGEMENT_FEE_TRANSFER'] = { ar: 'أتعاب إدارة', en: 'Management Fee' };
catLookup['LABOR_WAGES'] = { ar: 'مصنعية عمالة', en: 'Labor Wages' };
catLookup['OFFICE_RENT'] = { ar: 'إيجار المقر', en: 'Office Rent' };
catLookup['ELECTRICITY_BILL'] = { ar: 'فاتورة كهرباء', en: 'Electricity' };
catLookup['WATER_BILL'] = { ar: 'فاتورة مياه', en: 'Water' };
catLookup['INTERNET_COMMUNICATIONS'] = { ar: 'إنترنت واتصالات', en: 'Internet & Comms' };
catLookup['OFFICE_SUPPLIES'] = { ar: 'أدوات مكتبية', en: 'Office Supplies' };
catLookup['HOSPITALITY_PANTRY'] = { ar: 'بوفيه وضيافة', en: 'Pantry' };
catLookup['PETTY_CASH'] = { ar: 'نثريات', en: 'Petty Cash' };

const fmtMoney = (amount, currency = 'EGP') => {
    const num = Number(amount || 0);
    return `${num.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

const fmtDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
};

const fmtDateTime = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '-';
    return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * Resolves a logo buffer from local disk or URL.
 */
async function resolveLogoBuffer(logoPath) {
    if (!logoPath || typeof logoPath !== 'string') return null;
    try {
        if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const res = await fetch(logoPath, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const arrayBuf = await res.arrayBuffer();
                return Buffer.from(arrayBuf);
            }
            return null;
        }

        const cleanPath = logoPath.replace(/^\//, '');
        const candidatePaths = [
            path.join(rootDir, cleanPath),
            path.join(rootDir, 'uploads', 'images', path.basename(cleanPath)),
            path.join(rootDir, 'uploads', 'avatars', path.basename(cleanPath)),
            path.join(rootDir, 'uploads', path.basename(cleanPath)),
            path.join(rootDir, '../client/public', path.basename(cleanPath))
        ];

        for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
                return fs.readFileSync(p);
            }
        }
    } catch (e) {
        console.warn('Transactions Ledger PDF logo load failed:', e.message);
    }
    return null;
}

/**
 * Generates an executive, multi-page Accounting Transactions Ledger PDF.
 *
 * @param {Object} ctx
 * @param {Array} ctx.transactions Prisma Transaction records
 * @param {Object} ctx.tenant Tenant details (name, logo, phone, email, address)
 * @param {Object} [ctx.user] Requesting user
 * @param {Object} [ctx.scope] Applied filter metadata { projectName, filterType, dateRangeLabel, safeName }
 * @param {Object} [ctx.kpis] Computed totals { totalIncome, totalExpenses, officeProfit, netBalance, count }
 * @param {boolean} [ctx.isArabic=true] Language preference
 * @returns {Promise<Buffer>}
 */
export const generateTransactionsLedgerPdf = ({
    transactions = [],
    tenant,
    user,
    scope = {},
    kpis = null,
    isArabic = true
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            // A4 Landscape geometry: 841.89 pt x 595.28 pt
            const PAGE_WIDTH = 841.89;
            const PAGE_HEIGHT = 595.28;
            const MARGIN_X = 35;
            const PRINTABLE_WIDTH = PAGE_WIDTH - (MARGIN_X * 2); // 771.89 pt -> ~772 pt

            const doc = new PDFDocument({
                autoFirstPage: true,
                bufferPages: true,
                size: 'A4',
                layout: 'landscape',
                margins: { top: 25, bottom: 25, left: MARGIN_X, right: MARGIN_X }
            });
            setupDocFonts(doc);

            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => {
                // Page Numbering Footer on all pages
                const range = doc.bufferedPageRange();
                for (let i = range.start; i < range.start + range.count; i++) {
                    doc.switchToPage(i);
                    const footerY = 562;
                    doc.moveTo(MARGIN_X, footerY).lineTo(PAGE_WIDTH - MARGIN_X, footerY).lineWidth(0.5).strokeColor('#d8cbaf').stroke();
                    doc.font('AppFont').fontSize(7.5).fillColor('#8c7e6c');
                    
                    const compTitle = tenant?.name || 'Hesaby ERP';
                    const docLabel = isArabic ? 'سجل المعاملات والقيود المالية المعتمد' : 'Certified Financial Transactions Register';
                    const timeStamp = fmtDateTime(new Date());
                    const pageText = isArabic ? `صفحة ${i + 1} من ${range.count}` : `Page ${i + 1} of ${range.count}`;
                    
                    // Left: Company & document watermark
                    doc.text(`${compTitle} • ${docLabel} • ${timeStamp}`, MARGIN_X, footerY + 7, { width: 500 });
                    // Right: Page counter
                    doc.text(pageText, PAGE_WIDTH - MARGIN_X - 120, footerY + 7, { width: 120, align: 'right' });
                }
                resolve(Buffer.concat(chunks));
            });
            doc.on('error', reject);

            // Hesaby Warm Cafe & Ember Palette
            const BRAND_EMBER = '#c2410c';     // Primary Brand Accent (Warm Terracotta / Ember)
            const BRAND_EMBER_DARK = '#9a3412';// Deep Terracotta
            const BRAND_GOLD = '#d97706';      // Warm Gold / Amber
            const SUCCESS = '#065f46';         // Forest Emerald
            const DANGER = '#991b1b';          // Deep Crimson
            const TEXT_PRIMARY = '#1c1710';    // Deep Espresso
            const TEXT_SECONDARY = '#6b5f4d';  // Warm Coffee
            const TEXT_MUTED = '#8c7e6c';      // Muted Sand
            const BG_WARM_CARD = '#fdfaf2';    // Elevated card background (warm ivory)
            const BG_HEADER_SAND = '#ede4d0';  // Table header background (warm sand)
            const BG_TOTALS_ROW = '#f5eedf';   // Totals highlight row
            const BORDER = '#d8cbaf';          // Warm Sandstone border
            const BORDER_LIGHT = '#e5dcce';    // Subtle divider

            const useFont = (bold = false) => {
                try {
                    doc.font(bold ? 'AppFont-Bold' : 'AppFont');
                } catch {
                    // Fallback
                }
            };

            // Calculate KPIs if not passed in
            const txList = Array.isArray(transactions) ? transactions : [];
            let totalIncome = 0;
            let totalExpenses = 0;
            let totalProfit = 0;
            let totalAmountSum = 0;

            txList.forEach(t => {
                const amt = Number(t.amount || 0);
                totalAmountSum += amt;
                if (t.category === 'MANAGEMENT_FEE_TRANSFER') {
                    if (t.status === 'APPROVED' || !t.status) totalProfit += amt;
                } else if (t.type === 'INCOME' || t.type === 'income') {
                    if (t.status === 'APPROVED' || !t.status) totalIncome += amt;
                } else if (t.type === 'EXPENSE' || t.type === 'expense') {
                    if (t.status === 'APPROVED' || !t.status) totalExpenses += amt;
                }
            });
            const netCash = totalIncome - totalExpenses - totalProfit;

            const finalKpis = kpis || {
                totalIncome,
                totalExpenses,
                officeProfit: totalProfit,
                netBalance: netCash,
                count: txList.length
            };

            const L = isArabic ? {
                ledgerTitle: 'سجل المعاملات والقيود المحاسبية',
                certifiedBadge: 'سجل مالي معتمد',
                generatedAt: 'تاريخ الاستخراج',
                preparedBy: 'المسؤول',
                scopeTitle: 'نطاق القيود',
                kpiIncome: 'إجمالي المقبوضات',
                kpiExpenses: 'إجمالي المصروفات',
                kpiProfit: 'أرباح المكتب',
                kpiCash: 'صافي السيولة النقدية',
                kpiCount: 'إجمالي المعاملات',
                recordsWord: 'معاملة',
                colIndex: 'م',
                colDate: 'التاريخ',
                colType: 'النوع',
                colProject: 'المشروع',
                colCategory: 'التصنيف',
                colDesc: 'البيان / الوصف',
                colParty: 'الجهة / المستفيد',
                colSafe: 'الخزينة / الحساب',
                colMethod: 'طريقة الدفع',
                colAmount: 'المبلغ (جنيه)',
                colStatus: 'الحالة',
                typeIncome: 'إيراد',
                typeExpense: 'مصروف',
                typeProfit: 'أرباح مكتب',
                statusApproved: 'معتمد',
                statusPending: 'معلق',
                statusCancelled: 'ملغي / مسترد',
                statusRejected: 'مرفوض',
                grandTotal: 'الإجمالي الكلي للسجلات المعروضة',
                signPrepared: 'إعداد الحسابات',
                signAudited: 'المراجعة المالية والتدقيق',
                signApproved: 'الاعتماد الإداري والختم الرسمي'
            } : {
                ledgerTitle: 'FINANCIAL TRANSACTIONS REGISTER',
                certifiedBadge: 'CERTIFIED REGISTER',
                generatedAt: 'Generated At',
                preparedBy: 'Prepared By',
                scopeTitle: 'Ledger Scope',
                kpiIncome: 'Total Income',
                kpiExpenses: 'Total Expenses',
                kpiProfit: 'Office Profit',
                kpiCash: 'Net Cash Balance',
                kpiCount: 'Total Transactions',
                recordsWord: 'records',
                colIndex: '#',
                colDate: 'Date',
                colType: 'Type',
                colProject: 'Project',
                colCategory: 'Category',
                colDesc: 'Description',
                colParty: 'Party / Beneficiary',
                colSafe: 'Physical Account / Safe',
                colMethod: 'Method',
                colAmount: 'Amount (EGP)',
                colStatus: 'Status',
                typeIncome: 'Income',
                typeExpense: 'Expense',
                typeProfit: 'Office Profit',
                statusApproved: 'Approved',
                statusPending: 'Pending',
                statusCancelled: 'Cancelled',
                statusRejected: 'Rejected',
                grandTotal: 'Grand Total of Displayed Records',
                signPrepared: 'Prepared By',
                signAudited: 'Financial Auditor',
                signApproved: 'Management Approval & Stamp'
            };

            // 1. Top Continuous Accent Bar (Warm Ember)
            doc.rect(MARGIN_X, 15, PRINTABLE_WIDTH, 3.5).fillColor(BRAND_EMBER).fill();

            // 2. Company Brand & Logo (Top Left, X = MARGIN_X)
            const logoBuffer = await resolveLogoBuffer(tenant?.logo);
            let compX = MARGIN_X;
            const compY = 28;
            let logoRendered = false;

            if (logoBuffer) {
                try {
                    const img = doc.openImage(logoBuffer);
                    const maxW = 75;
                    const maxH = 46;
                    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
                    const rW = Math.round(img.width * scale);
                    const rH = Math.round(img.height * scale);

                    doc.save();
                    doc.image(img, compX, compY, { width: rW, height: rH });
                    doc.restore();
                    compX += rW + 12;
                    logoRendered = true;
                } catch (e) {
                    console.warn('Logo render failed:', e.message);
                }
            }

            if (!logoRendered) {
                // Stylized Monogram fallback
                const initial = (tenant?.name || 'H').slice(0, 1).toUpperCase();
                doc.roundedRect(compX, compY, 44, 44, 5).fillColor(BG_WARM_CARD).fill();
                doc.roundedRect(compX, compY, 44, 44, 5).lineWidth(1).strokeColor(BORDER).stroke();
                useFont(true);
                doc.fillColor(BRAND_EMBER).fontSize(19);
                doc.text(initial, compX, compY + 11, { width: 44, align: 'center' });
                compX += 54;
            }

            let curCompY = compY + 2;
            useFont(true);
            doc.fillColor(TEXT_PRIMARY).fontSize(13);
            const compName = tenant?.name || user?.company || 'Hesaby ERP';
            drawPdfText(doc, compName, compX, curCompY, { width: 320 });
            curCompY += 15;

            useFont(false);
            const metaParts = [];
            if (tenant?.email) metaParts.push(tenant.email);
            if (tenant?.phone) metaParts.push(tenant.phone);
            if (metaParts.length > 0) {
                doc.fontSize(8).fillColor(TEXT_SECONDARY);
                doc.text(metaParts.join(' • '), compX, curCompY, { width: 320 });
                curCompY += 11;
            }
            if (tenant?.address) {
                doc.fontSize(7.5).fillColor(TEXT_MUTED);
                drawPdfText(doc, tenant.address, compX, curCompY, { width: 320 });
            }

            // 3. Document Title & Metadata (Top Right)
            const rightW = 410;
            const rightX = PAGE_WIDTH - MARGIN_X - rightW;
            useFont(true);
            doc.fillColor(TEXT_PRIMARY).fontSize(14);
            drawPdfText(doc, L.ledgerTitle, rightX, 26, { width: rightW, align: 'right' });

            // Certified Badge Pill
            const badgeW = isArabic ? 94 : 96;
            const badgeH = 16;
            const badgeX = rightX + rightW - badgeW;
            const badgeY = 46;
            doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 8).fillColor('#fef3c7').fill();
            doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 8).lineWidth(0.75).strokeColor('#fde68a').stroke();
            useFont(true);
            doc.fillColor('#92400e').fontSize(7.5);
            drawPdfText(doc, L.certifiedBadge, badgeX, badgeY + 3.5, { width: badgeW, align: 'center' });

            useFont(false);
            doc.fontSize(8).fillColor(TEXT_SECONDARY);
            const now = new Date();
            drawPdfText(doc, `${L.generatedAt}: ${fmtDateTime(now)}`, rightX, 66, { width: rightW, align: 'right' });
            if (user?.name) {
                drawPdfText(doc, `${L.preparedBy}: ${user.name}`, rightX, 78, { width: rightW, align: 'right' });
            }

            // Scope filter string
            const scopeProj = scope.projectName || (isArabic ? 'كافة المشاريع' : 'All Projects');
            const scopeType = scope.filterType ? (isArabic ? `تصفية: ${scope.filterType}` : `Type: ${scope.filterType}`) : '';
            const scopeDate = scope.dateRangeLabel || '';
            const scopeArr = [scopeProj];
            if (scopeType) scopeArr.push(scopeType);
            if (scopeDate) scopeArr.push(scopeDate);
            scopeArr.push(`${txList.length} ${L.recordsWord}`);

            const scopeLine = `${L.scopeTitle}: ${scopeArr.join(' | ')}`;
            drawPdfText(doc, scopeLine, rightX, 90, { width: rightW, align: 'right' });

            // Hairline separator
            doc.moveTo(MARGIN_X, 108).lineTo(PAGE_WIDTH - MARGIN_X, 108).lineWidth(1).strokeColor(BORDER).stroke();

            // 4. Executive KPI Summary Cards (5 Cards)
            const kpiY = 116;
            const kpiCardH = 40;
            const numCards = 5;
            const kpiGap = 8;
            const kpiCardW = (PRINTABLE_WIDTH - (kpiGap * (numCards - 1))) / numCards; // ~148 pt each

            const renderKpiCard = (idx, label, valueStr, accentColor, valColor = TEXT_PRIMARY) => {
                const x = MARGIN_X + (idx * (kpiCardW + kpiGap));
                doc.roundedRect(x, kpiY, kpiCardW, kpiCardH, 4).fillColor(BG_WARM_CARD).fill();
                doc.roundedRect(x, kpiY, kpiCardW, kpiCardH, 4).lineWidth(0.75).strokeColor(BORDER).stroke();
                // Top accent strip
                doc.rect(x, kpiY, kpiCardW, 2.5).fillColor(accentColor).fill();

                useFont(true);
                doc.fillColor(TEXT_SECONDARY).fontSize(7);
                drawPdfText(doc, label, x + 6, kpiY + 6, { width: kpiCardW - 12 });

                doc.fillColor(valColor).fontSize(10);
                drawPdfText(doc, valueStr, x + 6, kpiY + 19, { width: kpiCardW - 12 });
            };

            renderKpiCard(0, L.kpiIncome, fmtMoney(finalKpis.totalIncome), SUCCESS, SUCCESS);
            renderKpiCard(1, L.kpiExpenses, fmtMoney(finalKpis.totalExpenses), BRAND_EMBER, BRAND_EMBER_DARK);
            renderKpiCard(2, L.kpiProfit, fmtMoney(finalKpis.officeProfit), BRAND_GOLD, '#b45309');
            renderKpiCard(3, L.kpiCash, fmtMoney(finalKpis.netBalance), '#0284c7', '#0369a1');
            renderKpiCard(4, L.kpiCount, `${finalKpis.count} ${L.recordsWord}`, TEXT_SECONDARY, TEXT_PRIMARY);

            // 5. Table Column Configuration (Total Width = 772 pt)
            const COLUMNS = [
                { key: 'idx', label: L.colIndex, width: 24, align: 'center' },
                { key: 'date', label: L.colDate, width: 56, align: 'center' },
                { key: 'type', label: L.colType, width: 56, align: 'center' },
                { key: 'project', label: L.colProject, width: 88, align: 'left' },
                { key: 'category', label: L.colCategory, width: 80, align: 'left' },
                { key: 'description', label: L.colDesc, width: 130, align: 'left' },
                { key: 'party', label: L.colParty, width: 86, align: 'left' },
                { key: 'safe', label: L.colSafe, width: 72, align: 'left' },
                { key: 'method', label: L.colMethod, width: 62, align: 'center' },
                { key: 'amount', label: L.colAmount, width: 78, align: 'right' },
                { key: 'status', label: L.colStatus, width: 40, align: 'center' }
            ];

            const drawTableHeader = (y) => {
                const headerH = 20;
                doc.roundedRect(MARGIN_X, y, PRINTABLE_WIDTH, headerH, 3).fillColor(BG_HEADER_SAND).fill();
                doc.roundedRect(MARGIN_X, y, PRINTABLE_WIDTH, headerH, 3).lineWidth(0.75).strokeColor(BORDER).stroke();
                useFont(true);
                doc.fillColor(TEXT_PRIMARY).fontSize(7.5);

                let curX = MARGIN_X;
                COLUMNS.forEach(col => {
                    const textX = curX + 2;
                    const textW = col.width - 4;
                    drawPdfText(doc, col.label, textX, y + 5, { width: textW, align: col.align });
                    curX += col.width;
                });
                return y + headerH + 2;
            };

            let currentY = kpiY + kpiCardH + 12;
            currentY = drawTableHeader(currentY);

            // 6. Iterate through Transactions
            useFont(false);
            const rowH = 17;
            const maxPageY = 535;

            txList.forEach((tx, idx) => {
                if (currentY + rowH > maxPageY) {
                    doc.addPage();
                    currentY = 30;
                    // Running header on page 2+
                    useFont(true);
                    doc.fillColor(TEXT_SECONDARY).fontSize(8);
                    const runningTitle = `${compName} • ${L.ledgerTitle} • ${fmtDateTime(now)}`;
                    drawPdfText(doc, runningTitle, MARGIN_X, currentY, { width: PRINTABLE_WIDTH });
                    currentY += 14;
                    currentY = drawTableHeader(currentY);
                    useFont(false);
                }

                // Zebra striping
                if (idx % 2 === 1) {
                    doc.rect(MARGIN_X, currentY, PRINTABLE_WIDTH, rowH).fillColor(BG_WARM_CARD).fill();
                }

                // Prepare cell values
                const isProfit = tx.category === 'MANAGEMENT_FEE_TRANSFER';
                const isInc = !isProfit && (tx.type === 'INCOME' || tx.type === 'income');
                const isExp = !isProfit && !isInc;

                const typeLabel = isProfit ? L.typeProfit : (isInc ? L.typeIncome : L.typeExpense);
                const typeColor = isProfit ? '#854d0e' : (isInc ? SUCCESS : BRAND_EMBER_DARK);

                const statusLabel = tx.status === 'APPROVED' ? L.statusApproved :
                    (tx.status === 'CANCELLED' ? L.statusCancelled :
                    (tx.status === 'REJECTED' ? L.statusRejected : L.statusPending));
                
                const statusBg = tx.status === 'APPROVED' ? '#dcfce7' :
                    (tx.status === 'CANCELLED' || tx.status === 'REJECTED' ? '#fee2e2' : '#fef3c7');
                const statusFg = tx.status === 'APPROVED' ? '#166534' :
                    (tx.status === 'CANCELLED' || tx.status === 'REJECTED' ? DANGER : '#92400e');

                const projectName = tx.project?.name || (isArabic ? 'عام / المقر' : 'General / HQ');
                let catLabel = tx.category ? (tx.category.replace(/_/g, ' ')) : '-';
                if (tx.category) {
                    const entry = catLookup[tx.category] || catLookup[tx.category.toLowerCase()];
                    if (entry) {
                        catLabel = isArabic ? entry.ar : entry.en;
                    }
                }
                const desc = tx.description || '-';
                const party = isInc 
                    ? (tx.client?.name || tx.project?.client?.name || tx.paidByClientContact || tx.transactionFrom || '-')
                    : (tx.beneficiary || tx.supplier?.name || tx.workman?.name || tx.transactionTo || '-');
                
                const safeName = tx.physicalAccount || tx.safe?.name || '-';
                const method = tx.paymentMethod === 'BANK_TRANSFER' ? (isArabic ? 'بنك' : 'Bank') :
                    (tx.paymentMethod === 'CASH' ? (isArabic ? 'كاش' : 'Cash') :
                    (tx.paymentMethod === 'CHECK' ? (isArabic ? 'شيك' : 'Check') :
                    (tx.paymentMethod === 'CUSTODY_WALLET' ? (isArabic ? 'عهدة' : 'Custody') : (tx.paymentMethod || '-'))));

                const numAmt = Number(tx.amount || 0);

                let curX = MARGIN_X;
                doc.fontSize(7).fillColor(TEXT_PRIMARY);

                const fitCellText = (str, maxW) => {
                    if (!str) return '-';
                    const s = String(str).trim();
                    if (!s) return '-';
                    let shaped = formatPdfText(s);
                    if (doc.widthOfString(shaped, { features: [] }) <= maxW) return shaped;
                    let truncated = s;
                    while (truncated.length > 2 && doc.widthOfString(formatPdfText(truncated + '...'), { features: [] }) > maxW) {
                        truncated = truncated.slice(0, -1);
                    }
                    return formatPdfText(truncated + '...');
                };

                COLUMNS.forEach(col => {
                    const textX = curX + 2;
                    const textW = col.width - 4;
                    const textY = currentY + 4;

                    if (col.key === 'idx') {
                        doc.fillColor(TEXT_MUTED);
                        doc.text(String(idx + 1), textX, textY, { width: textW, align: 'center' });
                    } else if (col.key === 'date') {
                        doc.fillColor(TEXT_SECONDARY);
                        doc.text(fmtDate(tx.transactionDate || tx.createdAt), textX, textY, { width: textW, align: 'center' });
                    } else if (col.key === 'type') {
                        useFont(true);
                        doc.fillColor(typeColor);
                        drawPdfText(doc, typeLabel, textX, textY, { width: textW, align: 'center' });
                        useFont(false);
                    } else if (col.key === 'project') {
                        doc.fillColor(TEXT_PRIMARY);
                        doc.text(fitCellText(projectName, textW), textX, textY, { width: textW, lineBreak: false, features: [] });
                    } else if (col.key === 'category') {
                        doc.fillColor(TEXT_SECONDARY);
                        doc.text(fitCellText(catLabel, textW), textX, textY, { width: textW, lineBreak: false, features: [] });
                    } else if (col.key === 'description') {
                        doc.fillColor(TEXT_PRIMARY);
                        doc.text(fitCellText(desc, textW), textX, textY, { width: textW, lineBreak: false, features: [] });
                    } else if (col.key === 'party') {
                        doc.fillColor(TEXT_SECONDARY);
                        doc.text(fitCellText(party, textW), textX, textY, { width: textW, lineBreak: false, features: [] });
                    } else if (col.key === 'safe') {
                        doc.fillColor(TEXT_MUTED);
                        doc.text(fitCellText(safeName, textW), textX, textY, { width: textW, lineBreak: false, features: [] });
                    } else if (col.key === 'method') {
                        doc.fillColor(TEXT_SECONDARY);
                        drawPdfText(doc, method, textX, textY, { width: textW, align: 'center' });
                    } else if (col.key === 'amount') {
                        useFont(true);
                        doc.fillColor(typeColor);
                        const sign = isExp ? '-' : (isInc ? '+' : '');
                        doc.text(`${sign}${numAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, textX, textY, { width: textW, align: 'right' });
                        useFont(false);
                    } else if (col.key === 'status') {
                        // Status pill badge
                        const pillH = 12;
                        const pillW = textW;
                        const pillY = currentY + 2.5;
                        doc.roundedRect(textX, pillY, pillW, pillH, 3).fillColor(statusBg).fill();
                        useFont(true);
                        doc.fillColor(statusFg).fontSize(6);
                        drawPdfText(doc, statusLabel, textX, pillY + 2, { width: pillW, align: 'center' });
                        useFont(false);
                        doc.fontSize(7);
                    }

                    curX += col.width;
                });

                // Row bottom divider
                doc.moveTo(MARGIN_X, currentY + rowH).lineTo(PAGE_WIDTH - MARGIN_X, currentY + rowH).lineWidth(0.5).strokeColor(BORDER_LIGHT).stroke();
                currentY += rowH;
            });

            // Empty state if no transactions
            if (txList.length === 0) {
                doc.rect(MARGIN_X, currentY, PRINTABLE_WIDTH, 26).fillColor(BG_WARM_CARD).fill();
                useFont(true);
                doc.fillColor(TEXT_MUTED).fontSize(9);
                const emptyMsg = isArabic ? 'لا توجد معاملات مسجلة تطابق محددات البحث' : 'No transactions recorded matching the selected filter criteria';
                drawPdfText(doc, emptyMsg, MARGIN_X, currentY + 7, { width: PRINTABLE_WIDTH, align: 'center' });
                currentY += 26;
            }

            // 7. Grand Total Summary Row
            if (currentY + 22 > maxPageY) {
                doc.addPage();
                currentY = 40;
            }

            doc.rect(MARGIN_X, currentY, PRINTABLE_WIDTH, 22).fillColor(BG_TOTALS_ROW).fill();
            doc.moveTo(MARGIN_X, currentY).lineTo(PAGE_WIDTH - MARGIN_X, currentY).lineWidth(1).strokeColor(BORDER).stroke();
            doc.moveTo(MARGIN_X, currentY + 22).lineTo(PAGE_WIDTH - MARGIN_X, currentY + 22).lineWidth(1.5).strokeColor(BRAND_EMBER_DARK).stroke();

            useFont(true);
            doc.fillColor(TEXT_PRIMARY).fontSize(8.5);

            // Label spanning from column 0 to column 8 (width: 654 pt)
            const labelW = 654;
            const fullLabel = `${L.grandTotal} (${txList.length} ${L.recordsWord})`;
            drawPdfText(doc, fullLabel, MARGIN_X + 6, currentY + 5.5, { width: labelW });

            // Amount column (Amount width 78 pt at X: MARGIN_X + 654 = 689)
            const amtX = MARGIN_X + labelW;
            doc.fillColor(BRAND_EMBER_DARK).fontSize(8.5);
            doc.text(fmtMoney(totalAmountSum), amtX, currentY + 5.5, { width: 78, align: 'right' });
            currentY += 34;

            // 8. Signatures & Official Audit Block
            if (currentY + 68 > maxPageY) {
                doc.addPage();
                currentY = 45;
            }

            const signBoxW = 220;
            const signGap = (PRINTABLE_WIDTH - (signBoxW * 3)) / 2; // ~56 pt gap
            const signY = currentY;

            const renderSignBlock = (idx, title, subtitle) => {
                const x = MARGIN_X + (idx * (signBoxW + signGap));
                doc.roundedRect(x, signY, signBoxW, 58, 4).fillColor(BG_WARM_CARD).fill();
                doc.roundedRect(x, signY, signBoxW, 58, 4).lineWidth(0.75).strokeColor(BORDER).stroke();

                useFont(true);
                doc.fillColor(TEXT_PRIMARY).fontSize(8);
                drawPdfText(doc, title, x + 8, signY + 6, { width: signBoxW - 16, align: 'center' });

                useFont(false);
                doc.fillColor(TEXT_MUTED).fontSize(7);
                drawPdfText(doc, subtitle, x + 8, signY + 18, { width: signBoxW - 16, align: 'center' });

                // Dotted signature line
                doc.moveTo(x + 20, signY + 44).lineTo(x + signBoxW - 20, signY + 44).lineWidth(0.5).strokeColor(BORDER).stroke();
            };

            renderSignBlock(0, L.signPrepared, user?.name || (isArabic ? 'المحاسب المسؤول' : 'Accountant'));
            renderSignBlock(1, L.signAudited, isArabic ? 'الإدارة المالية والمراجعة' : 'Financial Audit & Review');
            renderSignBlock(2, L.signApproved, isArabic ? 'الاعتماد الإداري والختم الرسمي' : 'Executive Management & Stamp');

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};
