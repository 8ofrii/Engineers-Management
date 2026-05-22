// TOTP (RFC 6238) helpers for two-factor authentication.
// Compatible with Google Authenticator, Authy, 1Password, etc.
<<<<<<< HEAD

import otplib from 'otplib';
const { authenticator } = otplib;
=======
// Uses otplib v13+ functional API: SHA-1, 30s step, 6 digits.

import {
    generate as totpGenerate,
    generateSecret as totpGenerateSecret,
    generateURI as totpGenerateUri,
    verify as totpVerify
} from 'otplib';
>>>>>>> main
import qrcode from 'qrcode';

const ISSUER = 'Engineers Management';
// Allow ±1 step (30s) drift between server and authenticator clock.
<<<<<<< HEAD
authenticator.options = { window: 1 };
=======
const WINDOW = 1;
>>>>>>> main

/**
 * Generate a fresh secret + scan-ready QR data URL.
 * The secret is base32 — what we store on the User row.
 */
export const generateSecret = async (accountLabel) => {
<<<<<<< HEAD
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(accountLabel, ISSUER, secret);
=======
    const secret = await totpGenerateSecret();
    const otpauth = await totpGenerateUri({ secret, issuer: ISSUER, label: accountLabel });
>>>>>>> main
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
<<<<<<< HEAD
        return authenticator.verify({ token: trimmed, secret });
=======
        const result = await totpVerify({ token: trimmed, secret, epochTolerance: WINDOW });
        // otplib v13 returns { valid: boolean, delta?: number, ... }
        return result?.valid === true;
>>>>>>> main
    } catch {
        return false;
    }
};

/**
 * Generate the otpauth URI without rendering the QR — useful for tests.
 */
export const getOtpAuthUrl = (secret, accountLabel) =>
<<<<<<< HEAD
    authenticator.keyuri(accountLabel, ISSUER, secret);

// Re-export for tests that need to generate a code from a known secret.
export const generateCode = (secret) => authenticator.generate(secret);
=======
    totpGenerateUri({ secret, issuer: ISSUER, label: accountLabel });

// Re-export for tests that need to generate a code from a known secret.
export { totpGenerate as generateCode };
>>>>>>> main
