import express from 'express';
import multer from 'multer';
import * as ctrl from '../controllers/billingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

const receiptUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only image files (JPEG, PNG, WebP) or PDF documents are allowed for receipts.'), false);
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Webhook is public — Paymob calls it, no JWT — but HMAC-verified
// inside the controller. Mounted FIRST so the router.use(protect) below
// doesn't gate it.
router.post('/webhook', express.json({ limit: '1mb' }), ctrl.webhook);

// Plans list is public so the marketing page can fetch pricing without
// requiring login.
router.get('/plans', ctrl.listPlans);

// InstaPay config endpoint (public or authenticated)
router.get('/instapay-config', ctrl.fetchInstaPayConfig);

// Everything below requires auth
router.use(protect);

router.get('/subscription', ctrl.getCurrentSubscription);
router.post('/select-plan', authorize('ADMIN', 'SUPER_ADMIN', 'FINANCE', 'GENERAL_MANAGER'), ctrl.selectPlan);
router.post('/buy-addon', authorize('ADMIN', 'SUPER_ADMIN', 'FINANCE', 'GENERAL_MANAGER'), ctrl.buyAddOn);
router.post('/checkout', authorize('ADMIN', 'SUPER_ADMIN', 'FINANCE', 'GENERAL_MANAGER'), ctrl.startCheckout);
router.post('/cancel', authorize('ADMIN', 'SUPER_ADMIN', 'FINANCE', 'GENERAL_MANAGER'), ctrl.cancelSubscription);
router.get('/payment-attempts', authorize('ADMIN', 'SUPER_ADMIN', 'FINANCE', 'GENERAL_MANAGER'), ctrl.listPaymentAttempts);

// InstaPay Egypt Endpoints
router.post('/instapay/initiate', authorize('ADMIN', 'SUPER_ADMIN', 'FINANCE', 'GENERAL_MANAGER'), ctrl.initiateInstaPay);
router.post('/instapay/submit-proof', receiptUpload.single('receipt'), ctrl.submitInstaPayProof);
router.get('/instapay/pending', ctrl.listPendingInstaPayPayments);
router.post('/instapay/cancel', ctrl.cancelInstaPayRequest);
router.post('/instapay/approve', authorize('SUPER_ADMIN'), ctrl.approveInstaPayPayment);
router.post('/instapay/reject', authorize('SUPER_ADMIN'), ctrl.rejectInstaPayPayment);

export default router;

