import express from 'express';
import { register, registerCompany, verifyEmail, login, getMe, updateProfile, verifyInvite, forgotPassword, resetPassword } from '../controllers/authController.js';
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
    updateProfileSchema
} from '../schemas/auth.schema.js';

const router = express.Router();

router.post('/register', validate({ body: registerSchema }), register);
router.post('/register-company', validate({ body: registerCompanySchema }), registerCompany);
router.post('/verify-email', validate({ body: verifyEmailSchema }), verifyEmail);
router.post('/verify-invite', validate({ body: verifyInviteSchema }), verifyInvite);
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

export default router;

