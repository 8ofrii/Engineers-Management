import XLSX from 'xlsx-js-style';

/**
 * Hesaby ERP - Professional Excel Export Engine
 * Generates beautifully styled, corporate-grade .xlsx workbooks with:
 * - Executive header themes with crisp typography
 * - Alternating zebra rows for effortless scanning
 * - Semantic status badges (approved, pending, cancelled, etc.)
 * - Proper financial currency and number formatting (#,##0.00)
 * - Accounting-standard total rows with double bottom borders
 * - Auto-fit column widths with generous breathing room
 * - Frozen header panes so columns stay visible during scroll
 * - Native Right-to-Left (RTL) support for Arabic Excel
 */

const FONT_NAME = 'Segoe UI, Calibri, Arial, Tahoma';

// Border presets - Hesaby Warm Sandstone Palette
const borderThin = {
    top: { style: 'thin', color: { rgb: 'D8CBAF' } },
    bottom: { style: 'thin', color: { rgb: 'D8CBAF' } },
    left: { style: 'thin', color: { rgb: 'D8CBAF' } },
    right: { style: 'thin', color: { rgb: 'D8CBAF' } }
};

const borderHeader = {
    top: { style: 'medium', color: { rgb: '9A3412' } },
    bottom: { style: 'medium', color: { rgb: '9A3412' } },
    left: { style: 'thin', color: { rgb: '473B2B' } },
    right: { style: 'thin', color: { rgb: '473B2B' } }
};

const borderTotal = {
    top: { style: 'thin', color: { rgb: 'D8CBAF' } },
    bottom: { style: 'double', color: { rgb: '9A3412' } },
    left: { style: 'thin', color: { rgb: 'D8CBAF' } },
    right: { style: 'thin', color: { rgb: 'D8CBAF' } }
};

// Core Style Presets - Warm Cafe & Ember Brand Palette
const STYLES = {
    titleBanner: {
        font: { name: FONT_NAME, sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '9A3412' } }, // Deep Terracotta / Ember
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
            bottom: { style: 'medium', color: { rgb: 'D97706' } } // Warm Gold accent
        }
    },
    subtitle: {
        font: { name: FONT_NAME, sz: 9.5, italic: true, color: { rgb: '6B5F4D' } }, // Warm Coffee
        fill: { fgColor: { rgb: 'FAF6EF' } }, // Warm Ivory
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
            bottom: { style: 'thin', color: { rgb: 'D8CBAF' } }
        }
    },
    tableHeader: {
        font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1C1710' } }, // Deep Espresso
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: borderHeader
    },
    rowEven: {
        font: { name: FONT_NAME, sz: 10, color: { rgb: '1C1710' } },
        fill: { fgColor: { rgb: 'FFFFFF' } },
        alignment: { vertical: 'center' },
        border: borderThin
    },
    rowOdd: {
        font: { name: FONT_NAME, sz: 10, color: { rgb: '1C1710' } },
        fill: { fgColor: { rgb: 'FAF6EF' } }, // Warm Ivory (Zebra)
        alignment: { vertical: 'center' },
        border: borderThin
    },
    totalRow: {
        font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: '1C1710' } },
        fill: { fgColor: { rgb: 'F5EEDF' } }, // Warm Amber Sand
        alignment: { vertical: 'center' },
        border: borderTotal
    },
    // Semantic Badges
    badgeSuccess: {
        font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: '166534' } },
        fill: { fgColor: { rgb: 'DCFCE7' } }, // Light Emerald
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderThin
    },
    badgeDanger: {
        font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: '991B1B' } },
        fill: { fgColor: { rgb: 'FEE2E2' } }, // Light Rose / Crimson
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderThin
    },
    badgeWarning: {
        font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: '92400E' } },
        fill: { fgColor: { rgb: 'FEF3C7' } }, // Light Amber
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderThin
    },
    badgeInfo: {
        font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: '854D0E' } },
        fill: { fgColor: { rgb: 'FEF9C3' } }, // Warm Gold / Profit
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderThin
    }
};

// Keyword matcher helpers
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
    const secondCell = String(row[1] || '').trim().toLowerCase();
    return (
        firstCell.includes('total') ||
        firstCell.includes('إجمالي') ||
        firstCell.includes('المجموع') ||
        firstCell.includes('الإجمالي') ||
        firstCell.includes('صافي') ||
        secondCell.includes('total') ||
        secondCell.includes('إجمالي')
    );
}

function isDateString(val) {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    return /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(trimmed) && trimmed.length <= 19;
}

/**
 * Calculate generous, auto-fit column widths with Arabic text breathing room
 */
function calculateColumnWidths(data) {
    if (!data || data.length === 0) return [];
    const colWidths = [];

    data.forEach(row => {
        if (!Array.isArray(row)) return;
        row.forEach((cell, colIndex) => {
            const val = cell === null || cell === undefined ? '' : String(cell);
            // Count arabic characters with slight weight bonus as they render wide
            const isAr = /[\u0600-\u06FF]/.test(val);
            const effectiveLen = Math.ceil(val.length * (isAr ? 1.2 : 1.0));
            if (!colWidths[colIndex] || effectiveLen > colWidths[colIndex]) {
                colWidths[colIndex] = effectiveLen;
            }
        });
    });

    return colWidths.map(w => ({ wch: Math.min(Math.max((w || 0) + 4, 14), 65) }));
}

/**
 * Export data to a beautifully formatted .xlsx workbook
 * @param {Object} options
 * @param {string} options.filename - Desired filename without or with .xlsx
 * @param {Array<{sheetName: string, data: Array<Array<any>>}>} options.sheets - Array of sheet configurations
 * @param {boolean} [options.isRTL=true] - Enable right-to-left layout for Arabic Excel
 */
export function exportToXLSX({ filename, sheets = [], isRTL = true }) {
    if (!sheets || sheets.length === 0) {
        console.warn('exportToXLSX: No sheets provided for export');
        return;
    }

    const wb = XLSX.utils.book_new();

    sheets.forEach(({ sheetName, data }) => {
        if (!data || data.length === 0) return;

        const maxCols = Math.max(...data.map(r => (Array.isArray(r) ? r.length : 0)));
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Find header row and structural features
        let bannerRowIndex = -1;
        let subtitleRowIndex = -1;
        let headerRowIndex = 0;

        // Check if row 0 is a full-width Title Banner
        if (
            data.length > 2 &&
            Array.isArray(data[0]) &&
            data[0].length >= 1 &&
            String(data[0][0] || '').length > 12 &&
            data[0].slice(1).every(c => c === null || c === undefined || c === '')
        ) {
            bannerRowIndex = 0;
            // Check if row 1 or 2 is subtitle / info
            if (data[1] && data[1].length >= 1 && (data[1].length < maxCols || data[1].some(c => String(c).includes(':')))) {
                subtitleRowIndex = 1;
            }
            // Locate the first row with full column count as the table header
            for (let r = 1; r < Math.min(data.length, 20); r++) {
                if (Array.isArray(data[r]) && data[r].filter(c => c !== null && c !== undefined && c !== '').length >= Math.max(2, maxCols - 2)) {
                    headerRowIndex = r;
                    break;
                }
            }
        }

        const merges = [];
        if (bannerRowIndex >= 0 && maxCols > 1) {
            merges.push({ s: { r: bannerRowIndex, c: 0 }, e: { r: bannerRowIndex, c: maxCols - 1 } });
        }
        
        // Merge any full-width metadata / subtitle rows before headerRowIndex
        for (let r = 1; r < headerRowIndex; r++) {
            const row = data[r];
            if (Array.isArray(row) && row.length > 0 && row.slice(1).every(c => c === null || c === undefined || c === '')) {
                if (maxCols > 1 && String(row[0] || '').trim().length > 0) {
                    merges.push({ s: { r, c: 0 }, e: { r, c: maxCols - 1 } });
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
                rowsConfig.push({ hpt: 34 });
            } else if (rIdx < headerRowIndex && (row.length === 1 || row.slice(1).every(c => !c))) {
                rowsConfig.push({ hpt: 22 }); // Subtitle / Metadata ribbon
            } else if (rIdx === headerRowIndex) {
                rowsConfig.push({ hpt: 28 });
            } else if (isTotalRow(row)) {
                rowsConfig.push({ hpt: 26 });
            } else if (row.length === 0 || row.every(c => c === '')) {
                rowsConfig.push({ hpt: 12 }); // Spacing row
            } else {
                rowsConfig.push({ hpt: 22 }); // Normal data row
            }
        });
        ws['!rows'] = rowsConfig;

        // Auto-fit column widths
        ws['!cols'] = calculateColumnWidths(data);

        // Apply styles cell-by-cell
        data.forEach((row, rIdx) => {
            if (!Array.isArray(row)) return;

            const isBanner = rIdx === bannerRowIndex;
            const isSub = rIdx < headerRowIndex && (row.length === 1 || row.slice(1).every(c => !c)) && String(row[0] || '').trim().length > 0;
            const isHeader = rIdx === headerRowIndex;
            const isTotal = isTotalRow(row);
            const isZebraOdd = rIdx % 2 === 1;

            row.forEach((cellVal, cIdx) => {
                const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
                if (!ws[cellRef]) return;

                let cellStyle = {};

                if (isBanner) {
                    cellStyle = { ...STYLES.titleBanner };
                } else if (isSub) {
                    cellStyle = { ...STYLES.subtitle };
                } else if (isHeader) {
                    cellStyle = { ...STYLES.tableHeader };
                } else if (isTotal) {
                    cellStyle = { ...STYLES.totalRow };
                    if (typeof cellVal === 'number') {
                        cellStyle.numFmt = '#,##0.00';
                        cellStyle.alignment = { horizontal: 'right', vertical: 'center' };
                    }
                } else {
                    // Regular data row
                    const baseStyle = isZebraOdd ? STYLES.rowOdd : STYLES.rowEven;
                    cellStyle = {
                        font: { ...baseStyle.font },
                        fill: { ...baseStyle.fill },
                        border: { ...baseStyle.border },
                        alignment: { ...baseStyle.alignment }
                    };

                    // Check for Status Badges
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
                        // Integer index (#) column
                        if (cIdx === 0 && Number.isInteger(cellVal) && cellVal < 10000) {
                            cellStyle.numFmt = '#,##0';
                            cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
                        } else {
                            // Financial currency / quantity
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
