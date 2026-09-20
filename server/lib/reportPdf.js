// PDF generator for Executive Financial Reports.
// Uses pdfkit with full Arabic (RTL) and Unicode support.
// Returns a Buffer that can be streamed directly to the browser for instant download.

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupDocFonts, drawPdfText, formatPdfText, isArabic as detectArabic } from './arabicPdfHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const fmtMoney = (amount, currency = 'EGP') => {
    const num = Number(amount || 0);
    return `${num.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

const fmtDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-GB');
};

const fmtDateTime = (d) => {
    if (!d) return '-';
    const date = new Date(d);
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
        console.warn('Report PDF logo load failed:', e.message);
    }
    return null;
}

/**
 * Generate an executive, board-level Financial Report PDF.
 *
 * @param {Object} ctx
 * @param {Object} ctx.tenant           Company info (name, logo, phone, email, address)
 * @param {Object} ctx.user             User who generated the report
 * @param {Object} ctx.scope            { projectName, dateRangeLabel, isAllProjects }
 * @param {Object} ctx.kpis             { approvedIncomes, approvedExpenses, totalProfitRecognized, netBalance }
 * @param {Array}  ctx.categoryData     [{ name, value, pct }]
 * @param {Array}  ctx.projectBreakdown [{ name, budget, income, spent, safe, profit, burnRate }]
 * @param {Object} ctx.totals           { totalBudget, totalIncome, totalSpent, totalSafe, totalProfit, overallBurnRate }
 * @param {boolean}[ctx.isArabic]       Language preference
 * @returns {Promise<Buffer>}
 */
export const generateFinancialReportPdf = ({
    tenant,
    user,
    scope = {},
    kpis = {},
    categoryData = [],
    projectBreakdown = [],
    totals = {},
    isArabic = true
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 40,
                size: 'A4',
                bufferPages: true
            });
            setupDocFonts(doc);

            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => {
                // Add page numbering across all pages
                const range = doc.bufferedPageRange();
                for (let i = range.start; i < range.start + range.count; i++) {
                    doc.switchToPage(i);
                    const footerY = 800;
                    doc.moveTo(40, footerY).lineTo(555, footerY).lineWidth(0.5).strokeColor('#d8cbaf').stroke();
                    doc.font('AppFont').fontSize(7.5).fillColor('#8c7e6c');
                    const compTitle = tenant?.name || 'Hesaby ERP';
                    const docLabel = isArabic ? 'تقرير مالي معتمد صادر آلياً' : 'Official Financial Summary';
                    const pageText = isArabic ? `صفحة ${i + 1} من ${range.count}` : `Page ${i + 1} of ${range.count}`;
                    
                    doc.text(`${compTitle} • ${docLabel}`, 40, footerY + 8, { width: 350 });
                    doc.text(pageText, 450, footerY + 8, { width: 105, align: 'right' });
                }
                resolve(Buffer.concat(chunks));
            });
            doc.on('error', reject);

            // Hesaby Webpage Light Mode Palette (Warm Cafe & Ember)
            const BRAND_EMBER = '#c2410c';     // Primary Brand Accent (Warm Terracotta / Ember)
            const BRAND_EMBER_DARK = '#9a3412';// Deep Terracotta
            const BRAND_EMBER_LIGHT = '#ea580c';// Vibrant Ember
            const BRAND_GOLD = '#d97706';      // Warm Gold / Amber
            const SUCCESS = '#065f46';         // Deep Forest Emerald
            const DANGER = '#991b1b';          // Deep Crimson
            const TEXT_PRIMARY = '#1c1710';    // Deep Espresso
            const TEXT_SECONDARY = '#6b5f4d';  // Warm Coffee
            const TEXT_MUTED = '#8c7e6c';      // Muted Sand
            const BG_WARM_CARD = '#fdfaf2';    // Elevated card background (warm ivory)
            const BG_WARM_SUBTLE = '#f7f1e5';  // Secondary container / hero background
            const BG_HEADER_SAND = '#ede4d0';  // Table header background (warm sand)
            const BG_TOTALS_ROW = '#f5eedf';   // Totals / highlight row
            const BORDER = '#d8cbaf';          // Warm Sandstone border
            const BORDER_LIGHT = '#e5dcce';    // Subtle divider

            const useFont = (bold = false) => {
                try {
                    doc.font(bold ? 'AppFont-Bold' : 'AppFont');
                } catch {
                    // Fallback
                }
            };

            const L = isArabic ? {
                reportTitle: 'التقرير المالي والتحليلي التنفيذي',
                certifiedBadge: 'تقرير مالي معتمد',
                generatedAt: 'تاريخ الاستخراج',
                preparedBy: 'المسؤول',
                scopeTitle: 'نطاق التقرير',
                kpiIncome: 'إجمالي المقبوضات',
                kpiExpenses: 'مصروفات المواقع',
                kpiProfit: 'أرباح المكتب',
                kpiCash: 'صافي السيولة النقدية',
                catSection: 'توزيع المصروفات حسب البند',
                catCol: 'البند / التصنيف',
                amountCol: 'المبلغ المستهلك',
                shareCol: 'النسبة من الإجمالي',
                grandTotal: 'الإجمالي الكلي',
                projSection: 'بيان الموقف المالي للمشاريع',
                projCol: 'اسم المشروع',
                budgetCol: 'الميزانية',
                incomeCol: 'المقبوضات',
                spentCol: 'المصروف',
                safeCol: 'رصيد الخزينة',
                profitCol: 'الأرباح',
                burnCol: 'الاستهلاك',
                signPrepared: 'إعداد الحسابات',
                signAudited: 'المراجعة المالية والتدقيق',
                signApproved: 'الاعتماد الإداري والختم الرسمي'
            } : {
                reportTitle: 'EXECUTIVE FINANCIAL REPORT',
                certifiedBadge: 'CERTIFIED REPORT',
                generatedAt: 'Generated At',
                preparedBy: 'Prepared By',
                scopeTitle: 'Report Scope',
                kpiIncome: 'Total Collected Income',
                kpiExpenses: 'Total Site Expenses',
                kpiProfit: 'Office Profit',
                kpiCash: 'Net Operational Cash',
                catSection: 'Expense Distribution by Category',
                catCol: 'Category',
                amountCol: 'Spent Amount (EGP)',
                shareCol: '% Share',
                grandTotal: 'Grand Total',
                projSection: 'Project Financial Performance',
                projCol: 'Project Name',
                budgetCol: 'Budget',
                incomeCol: 'Total Income',
                spentCol: 'Actual Spent',
                safeCol: 'Safe Balance',
                profitCol: 'Profit',
                burnCol: 'Burn Rate',
                signPrepared: 'Prepared By',
                signAudited: 'Financial Auditor',
                signApproved: 'Management Approval & Stamp'
            };

            // 1. Top Continuous Accent Bar (Warm Ember)
            doc.rect(40, 20, 515, 3.5).fillColor(BRAND_EMBER).fill();

            // 2. Company Brand & Logo (Top Left)
            const logoBuffer = await resolveLogoBuffer(tenant?.logo);
            let compX = 40;
            const compY = 38;
            let logoRendered = false;

            if (logoBuffer) {
                try {
                    const img = doc.openImage(logoBuffer);
                    const maxW = 65;
                    const maxH = 48;
                    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
                    const rW = Math.round(img.width * scale);
                    const rH = Math.round(img.height * scale);

                    doc.save();
                    doc.roundedRect(40, compY, rW, rH, 4).clip();
                    doc.image(img, 40, compY, { width: rW, height: rH });
                    doc.restore();
                    doc.roundedRect(40, compY, rW, rH, 4).lineWidth(0.75).strokeColor(BORDER).stroke();

                    compX = 40 + rW + 12;
                    logoRendered = true;
                } catch (e) {
                    logoRendered = false;
                }
            }

            if (!logoRendered) {
                const emblemSize = 38;
                doc.roundedRect(40, compY, emblemSize, emblemSize, 6).fillColor(BG_WARM_SUBTLE).fill();
                doc.roundedRect(40, compY, emblemSize, emblemSize, 6).lineWidth(0.75).strokeColor(BORDER).stroke();
                useFont(true);
                const initial = (tenant?.name || 'H').trim().charAt(0).toUpperCase();
                doc.fillColor(BRAND_EMBER_DARK).fontSize(17).text(initial, 40, compY + 9, { width: emblemSize, align: 'center' });
                compX = 40 + emblemSize + 12;
            }

            // Company Title and Contact
            useFont(true);
            doc.fillColor(TEXT_PRIMARY).fontSize(13);
            drawPdfText(doc, tenant?.name || 'Hesaby Construction ERP', compX, compY, { width: 240 });

            useFont(false);
            let curCompY = compY + 16;
            const metaParts = [];
            if (tenant?.email) metaParts.push(tenant.email);
            if (tenant?.phone) metaParts.push(tenant.phone);
            if (metaParts.length > 0) {
                doc.fontSize(8).fillColor(TEXT_SECONDARY);
                doc.text(metaParts.join(' • '), compX, curCompY, { width: 240 });
                curCompY += 11;
            }
            if (tenant?.address) {
                doc.fontSize(7.5).fillColor(TEXT_MUTED);
                drawPdfText(doc, tenant.address, compX, curCompY, { width: 240 });
            }

            // 3. Document Title & Metadata (Top Right)
            const metaX = 335;
            const metaW = 220;
            useFont(true);
            doc.fillColor(TEXT_PRIMARY).fontSize(14);
            drawPdfText(doc, L.reportTitle, metaX, 34, { width: metaW, align: 'right' });

            // Certified Badge Pill
            const badgeW = isArabic ? 90 : 85;
            const badgeH = 16;
            const badgeX = metaX + metaW - badgeW;
            const badgeY = 56;
            doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 8).fillColor('#fef3c7').fill();
            doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 8).lineWidth(0.75).strokeColor('#fde68a').stroke();
            useFont(true);
            doc.fillColor('#92400e').fontSize(7.5);
            drawPdfText(doc, L.certifiedBadge, badgeX, badgeY + 3.5, { width: badgeW, align: 'center' });

            useFont(false);
            doc.fontSize(8).fillColor(TEXT_SECONDARY);
            const now = new Date();
            drawPdfText(doc, `${L.generatedAt}: ${fmtDateTime(now)}`, metaX, 78, { width: metaW, align: 'right' });
            if (user?.name) {
                drawPdfText(doc, `${L.preparedBy}: ${user.name}`, metaX, 90, { width: metaW, align: 'right' });
            }

            // Scope line
            const scopeProject = scope.projectName || (isArabic ? 'كافة المشاريع' : 'All Projects');
            const scopeDate = scope.dateRangeLabel || (isArabic ? 'كل الفترات' : 'All Time');
            const scopeText = `${L.scopeTitle}: ${scopeProject} | ${scopeDate}`;
            drawPdfText(doc, scopeText, metaX, 102, { width: metaW, align: 'right' });

            // Hairline separator
            doc.moveTo(40, 122).lineTo(555, 122).lineWidth(1).strokeColor(BORDER).stroke();

            // 4. Executive KPI Summary Cards (4 Columns)
            const kpiY = 132;
            const kpiCardW = 122;
            const kpiCardH = 48;
            const kpiGap = 9;

            const renderKpiCard = (x, label, value, accentColor, valColor = TEXT_PRIMARY) => {
                doc.roundedRect(x, kpiY, kpiCardW, kpiCardH, 4).fillColor(BG_WARM_CARD).fill();
                doc.roundedRect(x, kpiY, kpiCardW, kpiCardH, 4).lineWidth(0.75).strokeColor(BORDER).stroke();
                // Top accent strip
                doc.rect(x, kpiY, kpiCardW, 3).fillColor(accentColor).fill();

                useFont(true);
                doc.fillColor(TEXT_SECONDARY).fontSize(7.5);
                drawPdfText(doc, label, x + 8, kpiY + 7, { width: kpiCardW - 16 });

                doc.fillColor(valColor).fontSize(11);
                doc.text(fmtMoney(value), x + 8, kpiY + 22, { width: kpiCardW - 16 });
            };

            renderKpiCard(40, L.kpiIncome, kpis.approvedIncomes || 0, SUCCESS, SUCCESS);
            renderKpiCard(40 + (kpiCardW + kpiGap), L.kpiExpenses, kpis.approvedExpenses || 0, BRAND_EMBER, BRAND_EMBER_DARK);
            renderKpiCard(40 + (kpiCardW + kpiGap) * 2, L.kpiProfit, kpis.totalProfitRecognized || 0, BRAND_GOLD, '#b45309');
            renderKpiCard(40 + (kpiCardW + kpiGap) * 3, L.kpiCash, kpis.netBalance || 0, '#0284c7', '#0369a1');

            let currentY = kpiY + kpiCardH + 18;

            // 5. Expense Distribution by Category Table
            useFont(true);
            doc.fillColor(TEXT_PRIMARY).fontSize(10.5);
            drawPdfText(doc, `• ${L.catSection}`, 40, currentY, { width: 515 });
            currentY += 16;

            // Table Header
            const catTableH = 20;
            doc.roundedRect(40, currentY, 515, catTableH, 3).fillColor(BG_HEADER_SAND).fill();
            doc.roundedRect(40, currentY, 515, catTableH, 3).lineWidth(0.75).strokeColor(BORDER).stroke();
            useFont(true);
            doc.fillColor(TEXT_PRIMARY).fontSize(8);
            drawPdfText(doc, L.catCol, 50, currentY + 5.5, { width: 250 });
            drawPdfText(doc, L.amountCol, 310, currentY + 5.5, { width: 120, align: 'right' });
            drawPdfText(doc, L.shareCol, 440, currentY + 5.5, { width: 95, align: 'right' });
            currentY += catTableH + 2;

            const cats = Array.isArray(categoryData) ? categoryData : [];
            let totalCatSum = 0;
            useFont(false);

            cats.forEach((cat, idx) => {
                if (currentY > 740) {
                    doc.addPage();
                    currentY = 40;
                }
                const rowH = 18;
                if (idx % 2 === 1) {
                    doc.rect(40, currentY, 515, rowH).fillColor(BG_WARM_CARD).fill();
                }

                const catVal = Number(cat.value || 0);
                totalCatSum += catVal;
                const pct = cat.pct || (kpis.approvedExpenses > 0 ? ((catVal / kpis.approvedExpenses) * 100).toFixed(1) + '%' : '0.0%');

                doc.fillColor(TEXT_PRIMARY).fontSize(8.5);
                drawPdfText(doc, cat.name || '-', 50, currentY + 4, { width: 250 });
                doc.text(fmtMoney(catVal), 310, currentY + 4, { width: 120, align: 'right' });
                doc.text(pct, 440, currentY + 4, { width: 95, align: 'right' });

                doc.moveTo(40, currentY + rowH).lineTo(555, currentY + rowH).lineWidth(0.5).strokeColor(BORDER_LIGHT).stroke();
                currentY += rowH;
            });

            // Category Total Row
            doc.rect(40, currentY, 515, 20).fillColor(BG_TOTALS_ROW).fill();
            doc.moveTo(40, currentY).lineTo(555, currentY).lineWidth(1).strokeColor(BORDER).stroke();
            doc.moveTo(40, currentY + 20).lineTo(555, currentY + 20).lineWidth(1).strokeColor(BORDER).stroke();
            useFont(true);
            doc.fillColor(TEXT_PRIMARY).fontSize(8.5);
            drawPdfText(doc, L.grandTotal, 50, currentY + 5, { width: 250 });
            doc.text(fmtMoney(totalCatSum), 310, currentY + 5, { width: 120, align: 'right' });
            doc.text('100.0%', 440, currentY + 5, { width: 95, align: 'right' });
            currentY += 32;

            // 6. Project Financial Performance Table
            if (currentY > 640) {
                doc.addPage();
                currentY = 40;
            }

            useFont(true);
            doc.fillColor(TEXT_PRIMARY).fontSize(10.5);
            drawPdfText(doc, `• ${L.projSection}`, 40, currentY, { width: 515 });
            currentY += 16;

            const projHeaderH = 20;
            doc.roundedRect(40, currentY, 515, projHeaderH, 3).fillColor(BG_HEADER_SAND).fill();
            doc.roundedRect(40, currentY, 515, projHeaderH, 3).lineWidth(0.75).strokeColor(BORDER).stroke();
            useFont(true);
            doc.fillColor(TEXT_PRIMARY).fontSize(7.5);
            drawPdfText(doc, L.projCol, 48, currentY + 5.5, { width: 130 });
            drawPdfText(doc, L.budgetCol, 180, currentY + 5.5, { width: 60, align: 'right' });
            drawPdfText(doc, L.incomeCol, 242, currentY + 5.5, { width: 60, align: 'right' });
            drawPdfText(doc, L.spentCol, 304, currentY + 5.5, { width: 60, align: 'right' });
            drawPdfText(doc, L.safeCol, 366, currentY + 5.5, { width: 62, align: 'right' });
            drawPdfText(doc, L.profitCol, 430, currentY + 5.5, { width: 60, align: 'right' });
            drawPdfText(doc, L.burnCol, 492, currentY + 5.5, { width: 53, align: 'right' });
            currentY += projHeaderH + 2;

            const projs = Array.isArray(projectBreakdown) ? projectBreakdown : [];
            let totBud = 0, totInc = 0, totSp = 0, totSf = 0, totPr = 0;

            projs.forEach((p, idx) => {
                if (currentY > 740) {
                    doc.addPage();
                    currentY = 40;
                }
                const rowH = 18;
                if (idx % 2 === 1) {
                    doc.rect(40, currentY, 515, rowH).fillColor(BG_WARM_CARD).fill();
                }

                const b = Number(p.budget || 0);
                const inc = Number(p.income || 0);
                const sp = Number(p.spent || 0);
                const sf = Number(p.safe || 0);
                const pr = Number(p.profit || 0);
                const burn = p.burnRate ? `${p.burnRate}%` : '0.0%';

                totBud += b;
                totInc += inc;
                totSp += sp;
                totSf += sf;
                totPr += pr;

                useFont(false);
                doc.fillColor(TEXT_PRIMARY).fontSize(8);
                drawPdfText(doc, p.name || '-', 48, currentY + 4, { width: 130 });
                doc.text(b > 0 ? b.toLocaleString('en-US') : '-', 180, currentY + 4, { width: 60, align: 'right' });
                doc.fillColor(SUCCESS).text(inc > 0 ? inc.toLocaleString('en-US') : '-', 242, currentY + 4, { width: 60, align: 'right' });
                doc.fillColor(DANGER).text(sp > 0 ? sp.toLocaleString('en-US') : '-', 304, currentY + 4, { width: 60, align: 'right' });
                doc.fillColor(sf >= 0 ? TEXT_PRIMARY : DANGER).text(sf.toLocaleString('en-US'), 366, currentY + 4, { width: 62, align: 'right' });
                doc.fillColor('#7c3aed').text(pr > 0 ? pr.toLocaleString('en-US') : '-', 430, currentY + 4, { width: 60, align: 'right' });
                
                const burnNum = parseFloat(burn);
                doc.fillColor(burnNum > 90 ? DANGER : TEXT_PRIMARY).text(burn, 492, currentY + 4, { width: 53, align: 'right' });

                doc.moveTo(40, currentY + rowH).lineTo(555, currentY + rowH).lineWidth(0.5).strokeColor(BORDER_LIGHT).stroke();
                currentY += rowH;
            });

            // Project Grand Total Row
            doc.rect(40, currentY, 515, 20).fillColor(BG_TOTALS_ROW).fill();
            doc.moveTo(40, currentY).lineTo(555, currentY).lineWidth(1).strokeColor(BORDER).stroke();
            doc.moveTo(40, currentY + 20).lineTo(555, currentY + 20).lineWidth(1).strokeColor(BORDER).stroke();
            useFont(true);
            doc.fillColor(TEXT_PRIMARY).fontSize(8);
            drawPdfText(doc, L.grandTotal, 48, currentY + 5, { width: 130 });
            doc.text(totBud.toLocaleString('en-US'), 180, currentY + 5, { width: 60, align: 'right' });
            doc.fillColor(SUCCESS).text(totInc.toLocaleString('en-US'), 242, currentY + 5, { width: 60, align: 'right' });
            doc.fillColor(DANGER).text(totSp.toLocaleString('en-US'), 304, currentY + 5, { width: 60, align: 'right' });
            doc.fillColor(totSf >= 0 ? TEXT_PRIMARY : DANGER).text(totSf.toLocaleString('en-US'), 366, currentY + 5, { width: 62, align: 'right' });
            doc.fillColor('#7c3aed').text(totPr.toLocaleString('en-US'), 430, currentY + 5, { width: 60, align: 'right' });
            const ovBurn = totBud > 0 ? ((totSp / totBud) * 100).toFixed(1) + '%' : '0.0%';
            doc.fillColor(TEXT_PRIMARY).text(ovBurn, 492, currentY + 5, { width: 53, align: 'right' });
            currentY += 36;

            // 7. Official Sign-Off Block
            if (currentY > 680) {
                doc.addPage();
                currentY = 60;
            }

            const signBoxW = 155;
            const signGap = 25;
            const signY = currentY + 10;

            const renderSignCol = (x, title, name) => {
                doc.moveTo(x, signY).lineTo(x + signBoxW, signY).lineWidth(0.75).dash(3, { space: 3 }).strokeColor(BORDER).stroke();
                doc.undash();
                useFont(true);
                doc.fillColor(TEXT_SECONDARY).fontSize(8);
                drawPdfText(doc, title, x, signY + 6, { width: signBoxW, align: 'center' });
                useFont(false);
                doc.fillColor(TEXT_PRIMARY).fontSize(8.5);
                drawPdfText(doc, name, x, signY + 36, { width: signBoxW, align: 'center' });
            };

            renderSignCol(40, L.signPrepared, user?.name || 'Authorized User');
            renderSignCol(40 + signBoxW + signGap, L.signAudited, '______________________');
            renderSignCol(40 + (signBoxW + signGap) * 2, L.signApproved, '______________________');

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};
