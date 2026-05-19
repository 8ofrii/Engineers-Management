// TOTP (RFC 6238) helpers for two-factor authentication.
// Compatible with Google Authenticator, Authy, 1Password, etc.

import otplib from 'otplib';
const { authenticator } = otplib;
import qrcode from 'qrcode';

const ISSUER = 'Engineers Management';
// Allow ±1 step (30s) drift between server and authenticator clock.
authenticator.options = { window: 1 };

/**
 * Generate a fresh secret + scan-ready QR data URL.
 * The secret is base32 — what we store on the User row.
 */
export const generateSecret = async (accountLabel) => {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(accountLabel, ISSUER, secret);
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
        return authenticator.verify({ token: trimmed, secret });
    } catch {
        return false;
    }
};

/**
 * Generate the otpauth URI without rendering the QR — useful for tests.
 */
export const getOtpAuthUrl = (secret, accountLabel) =>
    authenticator.keyuri(accountLabel, ISSUER, secret);

// Re-export for tests that need to generate a code from a known secret.
export const generateCode = (secret) => authenticator.generate(secret);
