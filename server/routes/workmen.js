import express from 'express';
import { protect } from '../middleware/auth.js';
import * as workmenController from '../controllers/workmenController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/', workmenController.getAll);
router.post('/', workmenController.create);
router.get('/:id', workmenController.getOne);
router.put('/:id', workmenController.update);
router.delete('/:id', workmenController.deleteWorkman);

export default router;
