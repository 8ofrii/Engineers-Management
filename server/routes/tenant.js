import express from 'express';
import { getTenant, updateTenant } from '../controllers/tenantController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect); // Protect all routes

router.get('/', getTenant);
router.put('/', upload.single('logo'), updateTenant);

export default router;
