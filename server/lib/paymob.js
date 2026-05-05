// Paymob (accept.paymob.com) API client.
//
// Paymob's checkout has a 3-step server-side dance, then a client-side
// iframe redirect, then an HMAC-signed webhook callback. We expose:
//
//   getAuthToken()          — step 1, valid ~1 hour
//   registerOrder(token, ...)— step 2
//   getPaymentKey(token, ...)— step 3
//   buildIframeUrl(paymentToken) — the URL to send the user to
//   verifyWebhookHmac(payload, hmacHeader) — webhook signature check
//
// All four Paymob env vars must be set in production:
//   PAYMOB_API_KEY        — account-level secret (auth tokens)
//   PAYMOB_INTEGRATION_ID — per-method ID (online card / wallet / Fawry — get from Paymob dashboard)
//   PAYMOB_IFRAME_ID      — iframe widget ID
//   PAYMOB_HMAC_SECRET    — webhook HMAC secret
//
// In dev/staging without creds, paymobEnabled is false and every helper
// throws a clear error so the controller can surface "billing unavailable".
//
// Reference: https://developers.paymob.com/egypt/checkout-api

import crypto from 'crypto';
import logger from './logger.js';

const BASE_URL = 'https://accept.paymob.com/api';

export const paymobEnabled = !!(
    process.env.PAYMOB_API_KEY &&
    process.env.PAYMOB_INTEGRATION_ID &&
    process.env.PAYMOB_IFRAME_ID &&
    process.env.PAYMOB_HMAC_SECRET
);

const requireEnabled = () => {
    if (!paymobEnabled) {
        const err = new Error('Paymob is not configured on this server. Set PAYMOB_* env vars.');
        err.code = 'PAYMOB_NOT_CONFIGURED';
        err.statusCode = 503;
        throw err;
    }
};

const post = async (path, body) => {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch { data = { _raw: text }; }
    if (!res.ok) {
        const err = new Error(`Paymob ${path} returned ${res.status}: ${text.slice(0, 300)}`);
        err.statusCode = 502;
        err.paymobStatus = res.status;
        throw err;
    }
    return data;
};

/** Step 1 — exchange the account API key for a short-lived auth_token. */
export const getAuthToken = async () => {
    requireEnabled();
    const data = await post('/auth/tokens', { api_key: process.env.PAYMOB_API_KEY });
    if (!data?.token) {
        throw new Error('Paymob auth response missing token');
    }
    return data.token;
};

/**
 * Step 2 — register the order. Amount in piastres (1 EGP = 100 piastres),
 * because Paymob is consistently buggy when given non-integer amounts.
 */
export const registerOrder = async (authToken, { amountEgp, merchantOrderId, items = [] }) => {
    requireEnabled();
    const cents = Math.round(Number(amountEgp) * 100);
    const data = await post('/ecommerce/orders', {
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: cents,
        currency: 'EGP',
        merchant_order_id: merchantOrderId,
        items
    });
    if (!data?.id) throw new Error('Paymob order response missing id');
    return data;
};

/**
 * Step 3 — payment key. Encodes the order + customer + the integration
 * (card / wallet / Fawry). Returned `token` is what we hand to the iframe.
 */
export const getPaymentKey = async (authToken, { orderId, amountEgp, billing }) => {
    requireEnabled();
    const cents = Math.round(Number(amountEgp) * 100);
    const data = await post('/acceptance/payment_keys', {
        auth_token: authToken,
        amount_cents: cents,
        expiration: 3600, // 1 hour to complete
        order_id: orderId,
        billing_data: {
            // Paymob refuses keys with missing fields — supply NA where unknown
            apartment: billing.apartment || 'NA',
            email: billing.email || 'NA@NA.com',
            floor: 'NA',
            first_name: billing.firstName || billing.name || 'NA',
            last_name: billing.lastName || 'NA',
            street: 'NA',
            building: 'NA',
            phone_number: billing.phone || '+200000000000',
            shipping_method: 'NA',
            postal_code: 'NA',
            city: 'NA',
            country: 'EG',
            state: 'NA'
        },
        currency: 'EGP',
        integration_id: Number(process.env.PAYMOB_INTEGRATION_ID)
    });
    if (!data?.token) throw new Error('Paymob payment_key response missing token');
    return data.token;
};

/** Iframe URL the user gets redirected to. */
export const buildIframeUrl = (paymentToken) => {
    return `${BASE_URL}/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;
};

/**
 * Webhook HMAC verification. Paymob signs the callback with HMAC-SHA512
 * over a concatenation of specific transaction fields (per Paymob docs:
 * https://developers.paymob.com/egypt/checkout-api/integration-and-test/integration#hmac-fields).
 *
 * The signed payload is named "obj" in the webhook. We pluck the documented
 * fields in the documented order, concatenate, and compare HMAC.
 */
export const verifyWebhookHmac = (obj, hmacFromQuery) => {
    if (!paymobEnabled) return false;
    if (!obj || !hmacFromQuery) return false;

    // Field order MUST match Paymob's spec exactly. From their docs:
    // amount_cents, created_at, currency, error_occured, has_parent_transaction,
    // id, integration_id, is_3d_secure, is_auth, is_capture, is_refunded,
    // is_standalone_payment, is_voided, order.id, owner, pending,
    // source_data.pan, source_data.sub_type, source_data.type, success
    const fields = [
        obj.amount_cents,
        obj.created_at,
        obj.currency,
        obj.error_occured,
        obj.has_parent_transaction,
        obj.id,
        obj.integration_id,
        obj.is_3d_secure,
        obj.is_auth,
        obj.is_capture,
        obj.is_refunded,
        obj.is_standalone_payment,
        obj.is_voided,
        obj.order?.id,
        obj.owner,
        obj.pending,
        obj.source_data?.pan,
        obj.source_data?.sub_type,
        obj.source_data?.type,
        obj.success
    ];
    const concat = fields.map(v => v == null ? '' : String(v)).join('');
    const expected = crypto
        .createHmac('sha512', process.env.PAYMOB_HMAC_SECRET)
        .update(concat)
        .digest('hex');

    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(hmacFromQuery)));
    } catch (e) {
        logger.warn({ err: e }, 'HMAC compare failed (length mismatch)');
        return false;
    }
};
