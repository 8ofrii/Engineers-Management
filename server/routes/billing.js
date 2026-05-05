import express from 'express';
import * as ctrl from '../controllers/billingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Webhook is public — Paymob calls it, no JWT — but HMAC-verified
// inside the controller. Mounted FIRST so the router.use(protect) below
// doesn't gate it.
router.post('/webhook', express.json({ limit: '1mb' }), ctrl.webhook);

// Plans list is public so the marketing page can fetch pricing without
// requiring login.
router.get('/plans', ctrl.listPlans);

// Everything below requires auth
router.use(protect);

router.get('/subscription', ctrl.getCurrentSubscription);
router.post('/checkout', authorize('ADMIN', 'SUPER_ADMIN'), ctrl.startCheckout);
router.post('/cancel', authorize('ADMIN', 'SUPER_ADMIN'), ctrl.cancelSubscription);
router.get('/payment-attempts', authorize('ADMIN', 'SUPER_ADMIN'), ctrl.listPaymentAttempts);

export default router;
