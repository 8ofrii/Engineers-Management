import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getUsers, inviteUser, updateUser, deleteUser } from '../controllers/userController.js';

const router = express.Router();

// All routes require login
router.use(protect);

// Only Admins (Owner/SuperAdmin) can manage users
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), getUsers);
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), inviteUser);
router.put('/:id', authorize('ADMIN', 'SUPER_ADMIN'), updateUser);
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), deleteUser);

export default router;
