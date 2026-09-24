import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber } from './format';

// These tests pin the locale-aware money/number formatting.
// Currency display strings come from ICU/CLDR via Intl.NumberFormat,
// so the assertions match against a regex of the digits + currency
// symbol rather than an exact string — that way a CLDR data update
// (which can shift spacing or symbol position) doesn't false-flag.

describe('formatCurrency', () => {
    it('formats positive amounts in English with EGP symbol', () => {
        const out = formatCurrency(1234, 'en');
        expect(out).toMatch(/1,234/);
        expect(out).toMatch(/EGP/);
    });

    it('formats positive amounts in Arabic with Arabic-Indic digits', () => {
        const out = formatCurrency(1234, 'ar');
        // Arabic-Indic digits are U+0660..U+0669
        expect(out).toMatch(/[٠-٩]/);
    });

    it('treats null/undefined as zero', () => {
        expect(formatCurrency(null, 'en')).toMatch(/0/);
        expect(formatCurrency(undefined, 'en')).toMatch(/0/);
    });

    it('coerces numeric strings', () => {
        expect(formatCurrency('500', 'en')).toMatch(/500/);
    });

    it('rounds fractional amounts to 0 decimals by default', () => {
        // 1234.56 should round to 1235 (or 1234 depending on banker's
        // rounding) — assert no decimal separator slipped through.
        const out = formatCurrency(1234.56, 'en');
        expect(out).not.toMatch(/\./);
    });

    it('honors caller-supplied minimumFractionDigits override', () => {
        const out = formatCurrency(1234.5, 'en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        expect(out).toMatch(/1,234\.50/);
    });

    it('defaults to English locale when lang is omitted', () => {
        // Should not throw; should use Latin digits.
        const out = formatCurrency(99);
        expect(out).toMatch(/99/);
        expect(out).not.toMatch(/[٠-٩]/);
    });

    it('formats negative amounts in English with minus sign attached to number, not before EGP', () => {
        const out = formatCurrency(-12000, 'en');
        expect(out).toMatch(/EGP\s+-12,000/);
        expect(out).not.toMatch(/^-EGP/);
    });

    it('formats negative amounts in Arabic with minus sign attached to number', () => {
        const out = formatCurrency(-12000, 'ar');
        expect(out).toMatch(/-\u200f?[٠-٩]/);
    });
});

describe('formatNumber', () => {
    it('groups thousands in English', () => {
        expect(formatNumber(1000000, 'en')).toMatch(/1,000,000/);
    });

    it('uses Arabic-Indic digits for ar locale', () => {
        expect(formatNumber(42, 'ar')).toMatch(/[٠-٩]/);
    });

    it('treats null/undefined as zero', () => {
        expect(formatNumber(null, 'en')).toMatch(/0/);
        expect(formatNumber(undefined, 'en')).toMatch(/0/);
    });
});
