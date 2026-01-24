import express from 'express';
import * as custodyController from '../controllers/custodyController.js';
import { protect } from '../middleware/auth.js';
import { verifyRole, verifyOwnership } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Fund engineer (Admin only)
router.post(
    '/transfer',
    verifyRole(['ADMIN']),
    custodyController.fundEngineer
);

// Get all custody balances (Admin, Accountant)
router.get(
    '/all',
    verifyRole(['ADMIN', 'ACCOUNTANT']),
    custodyController.getAllCustodyBalances
);

// Get engineer balance (Own balance or Admin/Accountant)
router.get(
    '/balance/:engineerId',
    verifyOwnership('custody'),
    custodyController.getBalance
);

// Get custody history
router.get(
    '/history/:engineerId',
    verifyOwnership('custody'),
    custodyController.getHistory
);

// Return custody (Engineers returning unused cash)
router.post(
    '/return',
    verifyRole(['ENGINEER', 'PROJECT_MANAGER', 'ADMIN']),
    custodyController.returnCustody
);

export default router;
