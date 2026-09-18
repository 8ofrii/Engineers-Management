import express from 'express';
import {
    getSafes,
    getSafeById,
    createSafe,
    updateSafe,
    deleteSafe,
    transferBetweenSafes,
    getSafeTransfers,
    getSafeStatement,
    getOfficeFinancesSummary
} from '../controllers/safeController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Office summary KPI metrics
router.get('/office-summary', getOfficeFinancesSummary);

// Safe transfers
router.route('/transfers')
    .get(getSafeTransfers)
    .post(authorize('ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT'), transferBetweenSafes);

// Safe statement / ledger
router.get('/:id/statement', getSafeStatement);

// Base Safe CRUD
router.route('/')
    .get(getSafes)
    .post(authorize('ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT'), createSafe);

router.route('/:id')
    .get(getSafeById)
    .put(authorize('ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT'), updateSafe)
    .delete(authorize('ADMIN', 'SUPER_ADMIN'), deleteSafe);

export default router;
