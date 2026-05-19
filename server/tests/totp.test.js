import { describe, test, expect } from 'vitest';
import { generate as totpGenerate, generateSecret as totpGenerateSecret } from 'otplib';
import { generateSecret, verifyToken, getOtpAuthUrl } from '../lib/totp.js';

describe('generateSecret', () => {
    test('returns a base32 secret + otpauth URL + QR data URL', async () => {
        const result = await generateSecret('demo@example.com');
        expect(result.secret).toMatch(/^[A-Z2-7]+$/);          // base32
        expect(result.otpauth).toMatch(/^otpauth:\/\/totp\//);
        expect(result.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    });

    test('embeds account label + issuer in the otpauth URL', async () => {
        const result = await generateSecret('alice@acme.com');
        expect(decodeURIComponent(result.otpauth)).toContain('alice@acme.com');
        expect(decodeURIComponent(result.otpauth)).toContain('Engineers Management');
    });
});

describe('verifyToken', () => {
    test('accepts a freshly-generated code from the same secret', async () => {
        const secret = await totpGenerateSecret();
        const code = await totpGenerate({ secret });
        expect(await verifyToken(code, secret)).toBe(true);
    });

    test('rejects a code from a different secret', async () => {
        const a = await totpGenerateSecret();
        const b = await totpGenerateSecret();
        const codeA = await totpGenerate({ secret: a });
        expect(await verifyToken(codeA, b)).toBe(false);
    });

    test('rejects malformed input', async () => {
        const secret = await totpGenerateSecret();
        expect(await verifyToken('abc', secret)).toBe(false);
        expect(await verifyToken('12345', secret)).toBe(false);
        expect(await verifyToken('1234567', secret)).toBe(false);
        expect(await verifyToken('', secret)).toBe(false);
        expect(await verifyToken(null, secret)).toBe(false);
    });

    test('rejects when secret missing', async () => {
        expect(await verifyToken('123456', null)).toBe(false);
        expect(await verifyToken('123456', '')).toBe(false);
    });
});

describe('getOtpAuthUrl', () => {
    test('produces a valid otpauth scheme', () => {
        const url = getOtpAuthUrl('JBSWY3DPEHPK3PXP', 'demo@x.com');
        expect(url).toMatch(/^otpauth:\/\/totp\//);
        expect(url).toContain('JBSWY3DPEHPK3PXP');
    });
});
