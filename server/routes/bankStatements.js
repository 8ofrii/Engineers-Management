import express from 'express';
import multer from 'multer';
import * as ctrl from '../controllers/bankReconciliationController.js';
import { protect, authorize } from '../middleware/auth.js';

// CSV uploads stay in memory — small files (<2 MB typical), parsed once,
// nothing to persist as a binary blob.
const csvUpload = multer({
    storage: multer.memoryStorage(),
<<<<<<< HEAD
    limits: { fileSize: 15 * 1024 * 1024 } // 15 MB ceiling
=======
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB ceiling
>>>>>>> main
});

const router = express.Router();
router.use(protect);

// Reconciliation is admin/manager/accountant work — engineers don't see
// the bank statement at all.
const FINANCE_ROLES = ['ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT'];

router.get('/', authorize(...FINANCE_ROLES), ctrl.listStatements);
router.post('/upload', authorize(...FINANCE_ROLES), csvUpload.single('file'), ctrl.uploadStatement);
router.get('/:id', authorize(...FINANCE_ROLES), ctrl.getStatement);
router.post('/:id/rematch', authorize(...FINANCE_ROLES), ctrl.rematchStatement);
router.post('/:id/rows/:rowId/match', authorize(...FINANCE_ROLES), ctrl.confirmRowMatch);
router.post('/:id/rows/:rowId/unmatch', authorize(...FINANCE_ROLES), ctrl.unmatchRow);
router.post('/:id/rows/:rowId/ignore', authorize(...FINANCE_ROLES), ctrl.ignoreRow);

export default router;
