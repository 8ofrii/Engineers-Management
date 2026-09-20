import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getUsers, inviteUser, updateUser, deleteUser, resendInvite } from '../controllers/userController.js';
import { validate } from '../middleware/validate.js';
import { inviteUserSchema, updateUserSchema, idParamSchema } from '../schemas/users.schema.js';

const router = express.Router();

// All routes require login
router.use(protect);

// Get users - Allow managers and accountants to see list for safe custodian and transaction payer selection
router.get('/', authorize('ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT'), getUsers);
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), validate({ body: inviteUserSchema }), inviteUser);
router.post('/:id/resend-invite', authorize('ADMIN', 'SUPER_ADMIN'), validate({ params: idParamSchema }), resendInvite);
router.put('/:id', authorize('ADMIN', 'SUPER_ADMIN'), validate({ params: idParamSchema, body: updateUserSchema }), updateUser);
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), validate({ params: idParamSchema }), deleteUser);

export default router;
