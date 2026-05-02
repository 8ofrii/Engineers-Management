// TOTP (RFC 6238) helpers for two-factor authentication.
// Compatible with Google Authenticator, Authy, 1Password, etc.
// Uses otplib v13+ functional API: SHA-1, 30s step, 6 digits.

import {
    generate as totpGenerate,
    generateSecret as totpGenerateSecret,
    generateURI as totpGenerateUri,
    verify as totpVerify
} from 'otplib';
import qrcode from 'qrcode';

const ISSUER = 'Engineers Management';
// Allow ±1 step (30s) drift between server and authenticator clock.
const WINDOW = 1;

/**
 * Generate a fresh secret + scan-ready QR data URL.
 * The secret is base32 — what we store on the User row.
 */
export const generateSecret = async (accountLabel) => {
    const secret = await totpGenerateSecret();
    const otpauth = await totpGenerateUri({ secret, issuer: ISSUER, label: accountLabel });
    const qrDataUrl = await qrcode.toDataURL(otpauth);
    return { secret, otpauth, qrDataUrl };
};

/**
 * Verify a 6-digit TOTP code against a stored secret.
 */
export const verifyToken = async (token, secret) => {
    if (!token || !secret) return false;
    const trimmed = String(token).trim();
    if (!/^\d{6}$/.test(trimmed)) return false;
    try {
        const result = await totpVerify({ token: trimmed, secret, window: WINDOW });
        // otplib v13 returns { valid: boolean, delta?: number, ... }
        return result?.valid === true;
    } catch {
        return false;
    }
};

/**
 * Generate the otpauth URI without rendering the QR — useful for tests.
 */
export const getOtpAuthUrl = (secret, accountLabel) =>
    totpGenerateUri({ secret, issuer: ISSUER, label: accountLabel });

// Re-export for tests that need to generate a code from a known secret.
export { totpGenerate as generateCode };
