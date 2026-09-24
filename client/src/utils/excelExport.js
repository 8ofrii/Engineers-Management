import XLSX from 'xlsx-js-style';

/**
 * Hesaby ERP - Professional Corporate Excel Export Engine
 * Generates executive-grade .xlsx workbooks with:
 * - 100% ECMA-376 OpenXML schema compliance (no Protected View corruption warnings)
 * - 8-character ARGB color encoding
 * - Clean standard typography (Segoe UI)
 * - Harmonious Hesaby Warm Cafe & Ember branding
 * - Alternating zebra striping
 * - Semantic badges for transaction and item statuses
 * - Standard accounting number formatting (#,##0.00)
 * - Auto-fit column widths calculated from actual table rows
 * - Frozen header panes and native RTL support
 */

function toARGB(hex) {
    if (!hex) return 'FF000000';
    let clean = String(hex).replace('#', '').trim().toUpperCase();
    if (clean.length === 6) return 'FF' + clean;
    if (clean.length === 8) return clean;
    if (clean.length === 3) return 'FF' + clean.split('').map(c => c + c).join('');
    return 'FF' + clean.padStart(6, '0');
}

const FONT_NAME = 'Segoe UI';

// Border presets
const borderThin = {
    top: { style: 'thin', color: { rgb: toARGB('D8CBAF') } },
    bottom: { style: 'thin', color: { rgb: toARGB('D8CBAF') } },
    left: { style: 'thin', color: { rgb: toARGB('D8CBAF') } },
    right: { style: 'thin', color: { rgb: toARGB('D8CBAF') } }
};

const borderHeader = {
    top: { style: 'medium', color: { rgb: toARGB('9A3412') } },
    bottom: { style: 'medium', color: { rgb: toARGB('9A3412') } },
    left: { style: 'thin', color: { rgb: toARGB('473B2B') } },
    right: { style: 'thin', color: { rgb: toARGB('473B2B') } }
};

const borderTotal = {
    top: { style: 'thin', color: { rgb: toARGB('D8CBAF') } },
    bottom: { style: 'medium', color: { rgb: toARGB('9A3412') } },
    left: { style: 'thin', color: { rgb: toARGB('D8CBAF') } },
    right: { style: 'thin', color: { rgb: toARGB('D8CBAF') } }
};

// Core Style Presets
const STYLES = {
    titleBanner: {
        font: { name: FONT_NAME, sz: 14, bold: true, color: { rgb: toARGB('FFFFFF') } },
        fill: { fgColor: { rgb: toARGB('9A3412') } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
            bottom: { style: 'medium', color: { rgb: toARGB('D97706') } }
        }
    },
    subtitle: {
        font: { name: FONT_NAME, sz: 10, italic: true, color: { rgb: toARGB('6B5F4D') } },
        fill: { fgColor: { rgb: toARGB('FAF6EF') } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
            bottom: { style: 'thin', color: { rgb: toARGB('D8CBAF') } }
        }
    },
    kpiSectionTitle: {
        font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: toARGB('9A3412') } },
        fill: { fgColor: { rgb: toARGB('F5EEDF') } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: borderThin
    },
    kpiLabel: {
        font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: toARGB('6B5F4D') } },
        fill: { fgColor: { rgb: toARGB('FBF9F5') } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: borderThin
    },
    kpiValue: {
        font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: toARGB('1C1710') } },
        fill: { fgColor: { rgb: toARGB('FFFFFF') } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: borderThin
    },
    tableHeader: {
        font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: toARGB('FFFFFF') } },
        fill: { fgColor: { rgb: toARGB('1C1710') } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: borderHeader
    },
    rowEven: {
        font: { name: FONT_NAME, sz: 10, color: { rgb: toARGB('1C1710') } },
        fill: { fgColor: { rgb: toARGB('FFFFFF') } },
        alignment: { vertical: 'center' },
        border: borderThin
    },
    rowOdd: {
        font: { name: FONT_NAME, sz: 10, color: { rgb: toARGB('1C1710') } },
        fill: { fgColor: { rgb: toARGB('FAF6EF') } },
        alignment: { vertical: 'center' },
        border: borderThin
    },
    totalRow: {
        font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: toARGB('1C1710') } },
        fill: { fgColor: { rgb: toARGB('F5EEDF') } },
        alignment: { vertical: 'center' },
        border: borderTotal
    },
    badgeSuccess: {
        font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: toARGB('166534') } },
        fill: { fgColor: { rgb: toARGB('DCFCE7') } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderThin
    },
    badgeDanger: {
        font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: toARGB('991B1B') } },
        fill: { fgColor: { rgb: toARGB('FEE2E2') } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderThin
    },
    badgeWarning: {
        font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: toARGB('92400E') } },
        fill: { fgColor: { rgb: toARGB('FEF3C7') } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderThin
    },
    badgeInfo: {
        font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: toARGB('854D0E') } },
        fill: { fgColor: { rgb: toARGB('FEF9C3') } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderThin
    }
};

function isStatusSuccess(v) {
    const s = String(v || '').trim().toLowerCase();
    return ['approved', 'معتمد', 'paid', 'مدفوعة بالكامل', 'مدفوع', 'income', 'إيراد', 'active', 'نشط', 'مكتمل', 'completed', 'تحويل وارد', 'transfer in'].includes(s);
}

function isStatusDanger(v) {
    const s = String(v || '').trim().toLowerCase();
    return ['rejected', 'مرفوض', 'cancelled', 'ملغي', 'ملغاة', 'مسترد / ملغي', 'refunded', 'مسترد', 'expense', 'مصروف', 'تحويل صادر', 'transfer out', 'overdue', 'متأخرة', 'inactive', 'غير نشط'].includes(s);
}

function isStatusWarning(v) {
    const s = String(v || '').trim().toLowerCase();
    return ['pending', 'بانتظار الاعتماد', 'قيد المراجعة', 'قيد الانتظار', 'partially paid', 'مدفوعة جزئياً'].includes(s);
}

function isStatusInfo(v) {
    const s = String(v || '').trim().toLowerCase();
    return ['ارباح المكتب', 'أرباح المكتب', 'office profit'].includes(s);
}

function isTotalRow(row) {
    if (!Array.isArray(row) || row.length === 0) return false;
    const firstCell = String(row[0] || '').trim().toLowerCase();
    return (
        firstCell.includes('total') ||
        firstCell.includes('إجمالي') ||
        firstCell.includes('المجموع') ||
        firstCell.includes('الإجمالي') ||
        firstCell.includes('صافي')
    );
}

function isDateString(val) {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    return /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(trimmed) && trimmed.length <= 19;
}

/**
 * Export data to a beautifully formatted .xlsx workbook
 * @param {Object} options
 * @param {string} options.filename - Desired filename without or with .xlsx
 * @param {Array<{sheetName: string, data: Array<Array<any>>, merges?: Array<any>}>} options.sheets - Array of sheet configurations
 * @param {boolean} [options.isRTL=true] - Enable right-to-left layout for Arabic Excel
 */
export function exportToXLSX({ filename, sheets = [], isRTL = true }) {
    if (!sheets || sheets.length === 0) {
        console.warn('exportToXLSX: No sheets provided for export');
        return;
    }

    const wb = XLSX.utils.book_new();

    sheets.forEach(({ sheetName, data, customMerges }) => {
        if (!data || data.length === 0) return;

        const maxCols = Math.max(...data.map(r => (Array.isArray(r) ? r.length : 0)));
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Find banner and header row indices
        let bannerRowIndex = -1;
        let headerRowIndex = 0;

        if (
            data.length > 2 &&
            Array.isArray(data[0]) &&
            data[0].length >= 1 &&
            String(data[0][0] || '').length > 10 &&
            data[0].slice(1).every(c => c === null || c === undefined || c === '')
        ) {
            bannerRowIndex = 0;
            // Locate the first row with full column count as the table header
            for (let r = 1; r < Math.min(data.length, 25); r++) {
                if (Array.isArray(data[r]) && data[r].filter(c => c !== null && c !== undefined && c !== '').length >= Math.max(2, maxCols - 2)) {
                    headerRowIndex = r;
                    break;
                }
            }
        }

        const merges = customMerges ? [...customMerges] : [];

        // Automatic Banner merges for single-cell rows before header
        if (!customMerges) {
            if (bannerRowIndex >= 0 && maxCols > 1) {
                merges.push({ s: { r: bannerRowIndex, c: 0 }, e: { r: bannerRowIndex, c: maxCols - 1 } });
            }

            for (let r = 1; r < headerRowIndex; r++) {
                const row = data[r];
                if (Array.isArray(row) && row.length > 0 && row.slice(1).every(c => !c)) {
                    if (maxCols > 1 && String(row[0] || '').trim().length > 0) {
                        merges.push({ s: { r, c: 0 }, e: { r, c: maxCols - 1 } });
                    }
                }
            }
        }

        if (merges.length > 0) {
            ws['!merges'] = merges;
        }

        // Row Heights
        const rowsConfig = [];
        data.forEach((row, rIdx) => {
            if (rIdx === bannerRowIndex) {
                rowsConfig.push({ hpt: 32 });
            } else if (rIdx < headerRowIndex && (row.length === 1 || row.slice(1).every(c => !c))) {
                rowsConfig.push({ hpt: 20 });
            } else if (rIdx === headerRowIndex) {
                rowsConfig.push({ hpt: 28 });
            } else if (isTotalRow(row)) {
                rowsConfig.push({ hpt: 26 });
            } else if (row.length === 0 || row.every(c => !c)) {
                rowsConfig.push({ hpt: 12 });
            } else {
                rowsConfig.push({ hpt: 22 });
            }
        });
        ws['!rows'] = rowsConfig;

        // Auto-fit column widths using TABLE rows (from header downwards)
        const colWidths = new Array(maxCols).fill(12);
        for (let r = headerRowIndex; r < data.length; r++) {
            const row = data[r];
            if (!Array.isArray(row)) continue;
            row.forEach((cell, cIdx) => {
                const val = cell === null || cell === undefined ? '' : String(cell);
                const isAr = /[\u0600-\u06FF]/.test(val);
                const len = Math.ceil(val.length * (isAr ? 1.25 : 1.0));
                if (len > colWidths[cIdx]) {
                    colWidths[cIdx] = len;
                }
            });
        }

        ws['!cols'] = colWidths.map((w, idx) => {
            const minW = idx === 0 ? 6 : 13;
            const maxW = idx === 5 ? 42 : 32;
            return { wch: Math.min(Math.max(w + 3, minW), maxW) };
        });

        // Apply styles cell-by-cell
        data.forEach((row, rIdx) => {
            if (!Array.isArray(row)) return;

            const isBanner = rIdx === bannerRowIndex;
            const isSub = rIdx < headerRowIndex && (row.length === 1 || row.slice(1).every(c => !c)) && String(row[0] || '').trim().length > 0;
            const isHeader = rIdx === headerRowIndex;
            const isTotal = isTotalRow(row);
            const isZebraOdd = rIdx % 2 === 1;

            // If merged row (banner/sub), ensure all columns have cell object and style
            if (isBanner || isSub) {
                const styleToApply = isBanner ? STYLES.titleBanner : STYLES.subtitle;
                for (let c = 0; c < maxCols; c++) {
                    const cellRef = XLSX.utils.encode_cell({ r: rIdx, c });
                    if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
                    ws[cellRef].s = { ...styleToApply };
                }
                return;
            }

            row.forEach((cellVal, cIdx) => {
                const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
                if (!ws[cellRef]) return;

                let cellStyle = {};

                if (isHeader) {
                    cellStyle = { ...STYLES.tableHeader };
                } else if (isTotal) {
                    cellStyle = { ...STYLES.totalRow };
                    if (typeof cellVal === 'number') {
                        cellStyle.numFmt = '#,##0.00';
                        cellStyle.alignment = { horizontal: 'right', vertical: 'center' };
                    }
                } else {
                    const baseStyle = isZebraOdd ? STYLES.rowOdd : STYLES.rowEven;
                    cellStyle = {
                        font: { ...baseStyle.font },
                        fill: { ...baseStyle.fill },
                        border: { ...baseStyle.border },
                        alignment: { ...baseStyle.alignment }
                    };

                    if (isStatusSuccess(cellVal)) {
                        cellStyle.fill = STYLES.badgeSuccess.fill;
                        cellStyle.font = STYLES.badgeSuccess.font;
                        cellStyle.alignment = STYLES.badgeSuccess.alignment;
                    } else if (isStatusDanger(cellVal)) {
                        cellStyle.fill = STYLES.badgeDanger.fill;
                        cellStyle.font = STYLES.badgeDanger.font;
                        cellStyle.alignment = STYLES.badgeDanger.alignment;
                    } else if (isStatusWarning(cellVal)) {
                        cellStyle.fill = STYLES.badgeWarning.fill;
                        cellStyle.font = STYLES.badgeWarning.font;
                        cellStyle.alignment = STYLES.badgeWarning.alignment;
                    } else if (isStatusInfo(cellVal)) {
                        cellStyle.fill = STYLES.badgeInfo.fill;
                        cellStyle.font = STYLES.badgeInfo.font;
                        cellStyle.alignment = STYLES.badgeInfo.alignment;
                    } else if (typeof cellVal === 'number') {
                        if (cIdx === 0 && Number.isInteger(cellVal) && cellVal < 10000) {
                            cellStyle.numFmt = '#,##0';
                            cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
                        } else {
                            cellStyle.numFmt = '#,##0.00';
                            cellStyle.alignment = { horizontal: 'right', vertical: 'center' };
                        }
                    } else if (isDateString(cellVal)) {
                        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
                    } else if (typeof cellVal === 'string' && /^\d+(\.\d+)?%$/.test(cellVal.trim())) {
                        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
                    }
                }

                ws[cellRef].s = cellStyle;
            });
        });

        // Set Right-to-Left sheet view & freeze header row
        ws['!views'] = [
            {
                showGridLines: true,
                rightToLeft: isRTL,
                state: 'frozen',
                ySplit: headerRowIndex + 1
            }
        ];

        const safeSheetName = (sheetName || 'Sheet1').slice(0, 31).replace(/[\\/*?[\]:]/g, '_');
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    });

    const finalFilename = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, finalFilename);
}
