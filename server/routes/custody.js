import express from 'express';
import * as custodyController from '../controllers/custodyController.js';
import { protect } from '../middleware/auth.js';
import { verifyRole, verifyOwnership } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
    fundEngineerSchema,
    returnCustodySchema,
    engineerIdParamSchema
} from '../schemas/custody.schema.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Fund engineer (Admin only)
router.post(
    '/transfer',
    verifyRole(['ADMIN']),
    validate({ body: fundEngineerSchema }),
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
    validate({ params: engineerIdParamSchema }),
    custodyController.getBalance
);

// Get custody history
router.get(
    '/history/:engineerId',
    verifyOwnership('custody'),
    validate({ params: engineerIdParamSchema }),
    custodyController.getHistory
);

// Return custody (Engineers returning unused cash)
router.post(
    '/return',
    verifyRole(['ENGINEER', 'PROJECT_MANAGER', 'ADMIN']),
    validate({ body: returnCustodySchema }),
    custodyController.returnCustody
);

export default router;
