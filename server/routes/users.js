import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getUsers, inviteUser, updateUser, deleteUser } from '../controllers/userController.js';

const router = express.Router();

// All routes require login
router.use(protect);

// Get users - Allow managers to see list for transaction payer selection
router.get('/', authorize('ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER'), getUsers);
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), inviteUser);
router.put('/:id', authorize('ADMIN', 'SUPER_ADMIN'), updateUser);
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), deleteUser);

export default router;
