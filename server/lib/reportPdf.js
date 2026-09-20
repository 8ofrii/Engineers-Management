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
                    doc.moveTo(40, footerY).lineTo(555, footerY).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
                    doc.font('AppFont').fontSize(7.5).fillColor('#64748b');
                    const compTitle = tenant?.name || 'Hesaby ERP';
                    const docLabel = isArabic ? 'تقرير مالي معتمد صادق آلياً' : 'Official Financial Summary';
                    const pageText = isArabic ? `صفحة ${i + 1} من ${range.count}` : `Page ${i + 1} of ${range.count}`;
                    
                    doc.text(`${compTitle} • ${docLabel}`, 40, footerY + 8, { width: 350 });
                    doc.text(pageText, 450, footerY + 8, { width: 105, align: 'right' });
                }
                resolve(Buffer.concat(chunks));
            });
            doc.on('error', reject);

            // Palette — Modern Executive Corporate Palette
            const PRIMARY_DARK = '#0f172a'; // Slate 900
            const PRIMARY = '#1e293b';      // Slate 800
            const ACCENT_BLUE = '#2563eb';  // Royal Blue
            const ACCENT_GOLD = '#d97706';  // Amber 600
            const SUCCESS = '#059669';      // Emerald 600
            const DANGER = '#dc2626';       // Red 600
            const TEXT = '#0f172a';         // Slate Dark
            const TEXT_MUTED = '#64748b';   // Slate 500
            const CARD_BG = '#f8fafc';      // Slate 50
            const BORDER = '#e2e8f0';       // Slate 200

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

            // 1. Top Corporate Accent Bar
            doc.rect(40, 20, 515, 4).fillColor(PRIMARY_DARK).fill();

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
                doc.roundedRect(40, compY, emblemSize, emblemSize, 6).fillColor(PRIMARY_DARK).fill();
                useFont(true);
                const initial = (tenant?.name || 'H').trim().charAt(0).toUpperCase();
                doc.fillColor('#ffffff').fontSize(17).text(initial, 40, compY + 9, { width: emblemSize, align: 'center' });
                compX = 40 + emblemSize + 12;
            }

            // Company Title and Contact
            useFont(true);
            doc.fillColor(PRIMARY_DARK).fontSize(13);
            drawPdfText(doc, tenant?.name || 'Hesaby Construction ERP', compX, compY, { width: 240 });

            useFont(false);
            let curCompY = compY + 16;
            const metaParts = [];
            if (tenant?.email) metaParts.push(tenant.email);
            if (tenant?.phone) metaParts.push(tenant.phone);
            if (metaParts.length > 0) {
                doc.fontSize(8).fillColor(TEXT_MUTED);
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
            doc.fillColor(PRIMARY_DARK).fontSize(14);
            drawPdfText(doc, L.reportTitle, metaX, 34, { width: metaW, align: 'right' });

            // Certified Badge
            const badgeW = isArabic ? 90 : 85;
            const badgeH = 16;
            const badgeX = metaX + metaW - badgeW;
            const badgeY = 56;
            doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3).fillColor(PRIMARY_DARK).fill();
            useFont(true);
            doc.fillColor('#ffffff').fontSize(7.5);
            drawPdfText(doc, L.certifiedBadge, badgeX, badgeY + 3.5, { width: badgeW, align: 'center' });

            useFont(false);
            doc.fontSize(8).fillColor(TEXT_MUTED);
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

            const renderKpiCard = (x, label, value, accentColor, valColor = PRIMARY_DARK) => {
                doc.roundedRect(x, kpiY, kpiCardW, kpiCardH, 4).fillColor(CARD_BG).fill();
                doc.roundedRect(x, kpiY, kpiCardW, kpiCardH, 4).lineWidth(0.75).strokeColor(BORDER).stroke();
                // Top accent strip
                doc.rect(x, kpiY, kpiCardW, 3).fillColor(accentColor).fill();

                useFont(true);
                doc.fillColor(TEXT_MUTED).fontSize(7.5);
                drawPdfText(doc, label, x + 8, kpiY + 7, { width: kpiCardW - 16 });

                doc.fillColor(valColor).fontSize(11);
                doc.text(fmtMoney(value), x + 8, kpiY + 22, { width: kpiCardW - 16 });
            };

            renderKpiCard(40, L.kpiIncome, kpis.approvedIncomes || 0, SUCCESS, '#059669');
            renderKpiCard(40 + (kpiCardW + kpiGap), L.kpiExpenses, kpis.approvedExpenses || 0, PRIMARY_DARK, PRIMARY_DARK);
            renderKpiCard(40 + (kpiCardW + kpiGap) * 2, L.kpiProfit, kpis.totalProfitRecognized || 0, ACCENT_GOLD, '#b45309');
            renderKpiCard(40 + (kpiCardW + kpiGap) * 3, L.kpiCash, kpis.netBalance || 0, ACCENT_BLUE, '#0284c7');

            let currentY = kpiY + kpiCardH + 18;

            // 5. Expense Distribution by Category Table
            useFont(true);
            doc.fillColor(PRIMARY_DARK).fontSize(10.5);
            drawPdfText(doc, `• ${L.catSection}`, 40, currentY, { width: 515 });
            currentY += 16;

            // Table Header
            const catTableH = 20;
            doc.roundedRect(40, currentY, 515, catTableH, 3).fillColor(PRIMARY_DARK).fill();
            useFont(true);
            doc.fillColor('#ffffff').fontSize(8);
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
                    doc.rect(40, currentY, 515, rowH).fillColor(CARD_BG).fill();
                }

                const catVal = Number(cat.value || 0);
                totalCatSum += catVal;
                const pct = cat.pct || (kpis.approvedExpenses > 0 ? ((catVal / kpis.approvedExpenses) * 100).toFixed(1) + '%' : '0.0%');

                doc.fillColor(TEXT).fontSize(8.5);
                drawPdfText(doc, cat.name || '-', 50, currentY + 4, { width: 250 });
                doc.text(fmtMoney(catVal), 310, currentY + 4, { width: 120, align: 'right' });
                doc.text(pct, 440, currentY + 4, { width: 95, align: 'right' });

                doc.moveTo(40, currentY + rowH).lineTo(555, currentY + rowH).lineWidth(0.5).strokeColor('#f1f5f9').stroke();
                currentY += rowH;
            });

            // Category Total Row
            doc.rect(40, currentY, 515, 20).fillColor('#f1f5f9').fill();
            doc.moveTo(40, currentY).lineTo(555, currentY).lineWidth(1).strokeColor(BORDER).stroke();
            doc.moveTo(40, currentY + 20).lineTo(555, currentY + 20).lineWidth(1).strokeColor(BORDER).stroke();
            useFont(true);
            doc.fillColor(PRIMARY_DARK).fontSize(8.5);
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
            doc.fillColor(PRIMARY_DARK).fontSize(10.5);
            drawPdfText(doc, `• ${L.projSection}`, 40, currentY, { width: 515 });
            currentY += 16;

            const projHeaderH = 20;
            doc.roundedRect(40, currentY, 515, projHeaderH, 3).fillColor(PRIMARY_DARK).fill();
            useFont(true);
            doc.fillColor('#ffffff').fontSize(7.5);
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
                    doc.rect(40, currentY, 515, rowH).fillColor(CARD_BG).fill();
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
                doc.fillColor(TEXT).fontSize(8);
                drawPdfText(doc, p.name || '-', 48, currentY + 4, { width: 130 });
                doc.text(b > 0 ? b.toLocaleString('en-US') : '-', 180, currentY + 4, { width: 60, align: 'right' });
                doc.fillColor(SUCCESS).text(inc > 0 ? inc.toLocaleString('en-US') : '-', 242, currentY + 4, { width: 60, align: 'right' });
                doc.fillColor(DANGER).text(sp > 0 ? sp.toLocaleString('en-US') : '-', 304, currentY + 4, { width: 60, align: 'right' });
                doc.fillColor(sf >= 0 ? TEXT : DANGER).text(sf.toLocaleString('en-US'), 366, currentY + 4, { width: 62, align: 'right' });
                doc.fillColor('#7c3aed').text(pr > 0 ? pr.toLocaleString('en-US') : '-', 430, currentY + 4, { width: 60, align: 'right' });
                
                const burnNum = parseFloat(burn);
                doc.fillColor(burnNum > 90 ? DANGER : TEXT).text(burn, 492, currentY + 4, { width: 53, align: 'right' });

                doc.moveTo(40, currentY + rowH).lineTo(555, currentY + rowH).lineWidth(0.5).strokeColor('#f1f5f9').stroke();
                currentY += rowH;
            });

            // Project Grand Total Row
            doc.rect(40, currentY, 515, 20).fillColor('#f1f5f9').fill();
            doc.moveTo(40, currentY).lineTo(555, currentY).lineWidth(1).strokeColor(BORDER).stroke();
            doc.moveTo(40, currentY + 20).lineTo(555, currentY + 20).lineWidth(1).strokeColor(BORDER).stroke();
            useFont(true);
            doc.fillColor(PRIMARY_DARK).fontSize(8);
            drawPdfText(doc, L.grandTotal, 48, currentY + 5, { width: 130 });
            doc.text(totBud.toLocaleString('en-US'), 180, currentY + 5, { width: 60, align: 'right' });
            doc.fillColor(SUCCESS).text(totInc.toLocaleString('en-US'), 242, currentY + 5, { width: 60, align: 'right' });
            doc.fillColor(DANGER).text(totSp.toLocaleString('en-US'), 304, currentY + 5, { width: 60, align: 'right' });
            doc.fillColor(totSf >= 0 ? PRIMARY_DARK : DANGER).text(totSf.toLocaleString('en-US'), 366, currentY + 5, { width: 62, align: 'right' });
            doc.fillColor('#7c3aed').text(totPr.toLocaleString('en-US'), 430, currentY + 5, { width: 60, align: 'right' });
            const ovBurn = totBud > 0 ? ((totSp / totBud) * 100).toFixed(1) + '%' : '0.0%';
            doc.fillColor(PRIMARY_DARK).text(ovBurn, 492, currentY + 5, { width: 53, align: 'right' });
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
                doc.moveTo(x, signY).lineTo(x + signBoxW, signY).lineWidth(0.75).dash(3, { space: 3 }).strokeColor('#94a3b8').stroke();
                doc.undash();
                useFont(true);
                doc.fillColor(TEXT_MUTED).fontSize(8);
                drawPdfText(doc, title, x, signY + 6, { width: signBoxW, align: 'center' });
                useFont(false);
                doc.fillColor(PRIMARY_DARK).fontSize(8.5);
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
