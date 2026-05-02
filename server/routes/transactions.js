import express from 'express';
import * as transactionController from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';
import { verifyRole, verifyOwnership } from '../middleware/rbac.js';
import { audioUpload } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Stats route
router.get('/stats', transactionController.getStats);

// Transfer custody route for Engineers
router.post(
    '/transfer-custody',
    verifyRole(['ENGINEER', 'PROJECT_MANAGER', 'ADMIN']),
    transactionController.transferCustody
);

// Get unique cost centers
router.get('/cost-centers', transactionController.getCostCenters);

// Get pending approvals (Managers & Admins only)
router.get(
    '/pending',
    verifyRole(['PROJECT_MANAGER', 'ADMIN']),
    transactionController.getPendingApprovals
);

// Record income (Admins & Accountants only)
router.post(
    '/income',
    verifyRole(['ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER']),
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
    audioUpload.single('audio'),
    transactionController.parseVoiceNote
);

// AI Voice Analysis (New Service Pattern)
router.post(
    '/analyze',
    verifyRole(['ENGINEER', 'PROJECT_MANAGER', 'ADMIN']),
    audioUpload.single('audio'),
    transactionController.analyzeTransaction
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

// Create generic transaction
router.post('/', transactionController.createTransaction);

// Get all transactions (role-based filtering)
router.get('/', transactionController.getTransactions);

// Get single transaction
router.get('/:id', transactionController.getTransaction);

// Update transaction
router.put('/:id', transactionController.updateTransaction);

// Delete transaction
router.delete('/:id', transactionController.deleteTransaction);

// ========== V1.2 ROUTES ==========
// New "Profit on Expense" Logic

// Create transaction with V1.2 logic
router.post('/v2', transactionController.createTransactionV2);

// Record inventory usage with profit recognition
router.post('/inventory-usage', transactionController.recordInventoryUsage);

// Get project inventory (aggregated material batches)
router.get('/projects/:id/inventory', transactionController.getProjectInventory);

export default router;
