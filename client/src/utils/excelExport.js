import * as XLSX from 'xlsx';

/**
 * Auto-fit column widths based on cell content
 * @param {Array<Array<any>>} data - 2D array of rows
 * @returns {Array<{wch: number}>} array of column width objects
 */
function calculateColumnWidths(data) {
    if (!data || data.length === 0) return [];
    const colWidths = [];

    data.forEach(row => {
        if (!Array.isArray(row)) return;
        row.forEach((cell, colIndex) => {
            const val = cell === null || cell === undefined ? '' : String(cell);
            const len = Math.max(val.length, 6);
            if (!colWidths[colIndex] || len > colWidths[colIndex]) {
                colWidths[colIndex] = len;
            }
        });
    });

    return colWidths.map(w => ({ wch: Math.min(Math.max(w + 3, 12), 60) }));
}

/**
 * Export data to an authentic .xlsx workbook
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

        const ws = XLSX.utils.aoa_to_sheet(data);

        // Auto-fit column widths
        ws['!cols'] = calculateColumnWidths(data);

        // Set Right-to-Left sheet view for Arabic Excel if requested
        if (isRTL) {
            ws['!views'] = [{ rightToLeft: true }];
        }

        const safeSheetName = (sheetName || 'Sheet1').slice(0, 31).replace(/[\\/*?[\]:]/g, '_');
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    });

    const finalFilename = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, finalFilename);
}
