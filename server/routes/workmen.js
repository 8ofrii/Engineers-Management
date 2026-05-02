import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as workmenController from '../controllers/workmenController.js';
import { validate } from '../middleware/validate.js';
import { createWorkmanSchema, updateWorkmanSchema, idParamSchema } from '../schemas/workmen.schema.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/', workmenController.getAll);
router.post('/', validate({ body: createWorkmanSchema }), workmenController.create);
router.get('/:id', validate({ params: idParamSchema }), workmenController.getOne);
router.put('/:id', validate({ params: idParamSchema, body: updateWorkmanSchema }), workmenController.update);
router.delete('/:id', validate({ params: idParamSchema }), workmenController.deleteWorkman);

router.put('/:id/restore', authorize('ADMIN', 'SUPER_ADMIN'), validate({ params: idParamSchema }), workmenController.restoreWorkman);

export default router;
