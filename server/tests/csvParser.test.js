import { describe, test, expect } from 'vitest';
import { parseCsv, normalizeBankRows } from '../lib/csvParser.js';

describe('parseCsv', () => {
    test('parses simple CSV with header', () => {
        const out = parseCsv('a,b,c\n1,2,3\n4,5,6');
        expect(out.headers).toEqual(['a', 'b', 'c']);
        expect(out.rows.length).toBe(2);
        expect(out.rows[0].a).toBe('1');
    });

    test('lowercases + trims headers', () => {
        const out = parseCsv(' Date , Amount \n01/05/2026,1000');
        expect(out.headers).toEqual(['date', 'amount']);
    });

    test('handles quoted fields with commas inside', () => {
        const out = parseCsv('a,b\n"hello, world",2');
        expect(out.rows[0].a).toBe('hello, world');
    });

    test('handles escaped quotes', () => {
        const out = parseCsv('a,b\n"she said ""hi""",2');
        expect(out.rows[0].a).toBe('she said "hi"');
    });

    test('strips BOM and normalizes line endings', () => {
        const out = parseCsv('﻿a,b\r\n1,2\r\n3,4');
        expect(out.headers).toEqual(['a', 'b']);
        expect(out.rows.length).toBe(2);
    });

    test('skips blank lines', () => {
        const out = parseCsv('a,b\n1,2\n\n3,4\n');
        expect(out.rows.length).toBe(2);
    });
});

describe('normalizeBankRows', () => {
    test('parses NBE-style debit/credit columns into signed amount', () => {
        const csv = 'Date,Description,Debit,Credit\n01/05/2026,Cement supplier,5000,\n02/05/2026,Client payment,,12000';
        const rows = normalizeBankRows(parseCsv(csv));
        expect(rows.length).toBe(2);
        expect(rows[0].amount).toBe(-5000); // debit → negative
        expect(rows[1].amount).toBe(12000); // credit → positive
    });

    test('parses single Amount column as-is', () => {
        const csv = 'Date,Amount,Description\n01/05/2026,-5000,Cement\n02/05/2026,12000,Client';
        const rows = normalizeBankRows(parseCsv(csv));
        expect(rows[0].amount).toBe(-5000);
        expect(rows[1].amount).toBe(12000);
    });

    test('parses DD/MM/YYYY dates', () => {
        const csv = 'Date,Amount\n15/03/2026,1000';
        const rows = normalizeBankRows(parseCsv(csv));
        expect(rows[0].parsedDate?.getFullYear()).toBe(2026);
        expect(rows[0].parsedDate?.getMonth()).toBe(2); // March (0-indexed)
        expect(rows[0].parsedDate?.getDate()).toBe(15);
    });

    test('strips currency markers and Arabic thousands separator', () => {
        const csv = 'Date,Amount\n01/05/2026,"١٢٬٠٠٠ EGP"';
        const rows = normalizeBankRows(parseCsv(csv));
        // Arabic-Indic digits aren't stripped by parseFloat — parser treats this as junk → null → row dropped
        // What we DO want to handle: Latin digits with Arabic separator
        const csv2 = 'Date,Amount\n01/05/2026,"12٬000 EGP"';
        const rows2 = normalizeBankRows(parseCsv(csv2));
        expect(rows2[0].amount).toBe(12000);
    });

    test('throws helpful error when date column is missing', () => {
        expect(() => normalizeBankRows(parseCsv('Foo,Bar\n1,2'))).toThrow(/date column/i);
    });

    test('throws helpful error when no amount column', () => {
        expect(() => normalizeBankRows(parseCsv('Date,Memo\n01/05/2026,hi'))).toThrow(/amount/i);
    });

    test('drops zero-amount rows', () => {
        const csv = 'Date,Amount\n01/05/2026,0\n02/05/2026,100';
        const rows = normalizeBankRows(parseCsv(csv));
        expect(rows.length).toBe(1);
        expect(rows[0].amount).toBe(100);
    });
});
