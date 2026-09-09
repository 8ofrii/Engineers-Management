import express from 'express';
import {
    register,
    registerCompany,
    verifyEmail,
    login,
    login2FA,
    enroll2FA,
    confirmEnroll2FA,
    disable2FA,
    status2FA,
    getMe,
    updateProfile,
    verifyInvite,
    previewInvite,
    acceptInviteSignup,
    googleRedirect,
    googleCallback,
    exchangeOAuthCode,
    forgotPassword,
    resetPassword,
    deleteAccount
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import {
    registerSchema,
    registerCompanySchema,
    verifyEmailSchema,
    verifyInviteSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordParamsSchema,
    resetPasswordBodySchema,
    updateProfileSchema,
    login2FASchema,
    confirmEnroll2FASchema,
    disable2FASchema
} from '../schemas/auth.schema.js';

const router = express.Router();

router.post('/register', validate({ body: registerSchema }), register);
router.post('/register-company', validate({ body: registerCompanySchema }), registerCompany);
router.post('/verify-email', validate({ body: verifyEmailSchema }), verifyEmail);
router.post('/verify-invite', validate({ body: verifyInviteSchema }), verifyInvite);
router.post('/invite/preview', previewInvite);
router.post('/invite/accept-signup', acceptInviteSignup);
router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);
router.post('/oauth-exchange', exchangeOAuthCode);
router.post('/login', validate({ body: loginSchema }), login);
router.post('/forgot-password', validate({ body: forgotPasswordSchema }), forgotPassword);
router.put(
    '/reset-password/:resettoken',
    validate({ params: resetPasswordParamsSchema, body: resetPasswordBodySchema }),
    resetPassword
);
router.get('/me', protect, getMe);
router.put(
    '/profile',
    protect,
    upload.single('profilePicture'),
    validate({ body: updateProfileSchema }),
    updateProfile
);

// Two-factor authentication (Phase 2)
router.post('/2fa/login', validate({ body: login2FASchema }), login2FA);
router.get('/2fa/status', protect, status2FA);
router.post('/2fa/enroll', protect, enroll2FA);
router.post('/2fa/confirm', protect, validate({ body: confirmEnroll2FASchema }), confirmEnroll2FA);
router.post('/2fa/disable', protect, validate({ body: disable2FASchema }), disable2FA);
router.delete('/account', protect, deleteAccount);

export default router;

