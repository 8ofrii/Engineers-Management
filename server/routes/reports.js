import express from 'express';
import { protect } from '../middleware/auth.js';
import { getFinancialReportPdf } from '../controllers/reportController.js';

const router = express.Router();

router.use(protect);

// GET /api/reports/financial-pdf
router.get('/financial-pdf', getFinancialReportPdf);

export default router;
