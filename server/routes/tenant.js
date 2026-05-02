import express from 'express';
import { getTenant, updateTenant } from '../controllers/tenantController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { updateTenantSchema } from '../schemas/tenant.schema.js';

const router = express.Router();

router.use(protect); // Protect all routes

router.get('/', getTenant);
router.put('/', upload.single('logo'), validate({ body: updateTenantSchema }), updateTenant);

export default router;
