import express from 'express';
import * as ctrl from '../controllers/transactionDraftController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/', ctrl.listDrafts);
router.get('/:id', ctrl.getDraft);
router.put('/:id', ctrl.updateDraft);
router.post('/:id/rematch', ctrl.rematchDraft);
router.post('/:id/commit', ctrl.commitDraft);
router.delete('/:id', ctrl.discardDraft);

export default router;
