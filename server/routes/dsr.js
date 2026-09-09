import express from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { audioUpload } from '../middleware/upload.js';
import {
    listDsrs, getDsr, createDsr, updateDsr, submitDsr, acknowledgeDsr, deleteDsr,
    extractDsrFromVoice
} from '../controllers/dsrController.js';
import {
    createDsrSchema, updateDsrSchema, acknowledgeDsrSchema, idParamSchema
} from '../schemas/dsr.schema.js';

const router = express.Router();
router.use(protect);

router.get('/', listDsrs);
router.post('/', validate({ body: createDsrSchema }), createDsr);
router.post('/extract/voice', audioUpload.single('audio'), extractDsrFromVoice);

router.get('/:id', validate({ params: idParamSchema }), getDsr);
router.put('/:id', validate({ params: idParamSchema, body: updateDsrSchema }), updateDsr);
router.delete('/:id', validate({ params: idParamSchema }), deleteDsr);

router.put('/:id/submit', validate({ params: idParamSchema }), submitDsr);
router.put('/:id/acknowledge', validate({ params: idParamSchema, body: acknowledgeDsrSchema }), acknowledgeDsr);

export default router;
