import express from 'express';
import * as transactionController from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';
import { verifyRole, verifyOwnership } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Stats route
router.get('/stats', transactionController.getStats);

// Get pending approvals (Managers & Admins only)
router.get(
    '/pending',
    verifyRole(['PROJECT_MANAGER', 'ADMIN']),
    transactionController.getPendingApprovals
);

// Record income (Admins & Accountants only)
router.post(
    '/income',
    verifyRole(['ADMIN', 'ACCOUNTANT']),
    transactionController.recordIncome
);

// Create draft transaction
router.post(
    '/draft',
    verifyRole(['ENGINEER', 'PROJECT_MANAGER', 'ADMIN']),
    transactionController.createDraft
);

// AI Voice Parsing (Staging - No DB save)
router.post(
    '/ai-parse',
    verifyRole(['ENGINEER', 'PROJECT_MANAGER', 'ADMIN']),
    transactionController.parseVoiceNote
);

// Submit transaction for approval
router.put(
    '/:id/submit',
    verifyRole(['ENGINEER', 'PROJECT_MANAGER', 'ADMIN']),
    verifyOwnership('transaction'),
    transactionController.submitTransaction
);

// Approve transaction (Managers & Admins only)
router.put(
    '/:id/approve',
    verifyRole(['PROJECT_MANAGER', 'ADMIN']),
    transactionController.approveTransaction
);

// Reject transaction (Managers & Admins only)
router.put(
    '/:id/reject',
    verifyRole(['PROJECT_MANAGER', 'ADMIN']),
    transactionController.rejectTransaction
);

// Get all transactions (role-based filtering)
router.get('/', transactionController.getTransactions);

// Get single transaction
router.get('/:id', transactionController.getTransaction);

// Delete transaction
router.delete('/:id', transactionController.deleteTransaction);

export default router;
