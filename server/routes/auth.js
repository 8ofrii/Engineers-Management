import express from 'express';
import { register, registerCompany, verifyEmail, login, getMe, updateProfile, verifyInvite, forgotPassword, resetPassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.post('/register', register);
router.post('/register-company', registerCompany); // NEW: SaaS Sign-up Step 1
router.post('/verify-email', verifyEmail); // NEW: SaaS Sign-up Step 2
router.post('/verify-invite', verifyInvite); // NEW: Invite verification
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, upload.single('profilePicture'), updateProfile);

export default router;

