import express from 'express';
import {
    getMaterials,
    getMaterial,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    restoreMaterial,
    rechargeMaterial
} from '../controllers/materialController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createMaterialSchema, updateMaterialSchema, idParamSchema } from '../schemas/materials.schema.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getMaterials)
    .post(validate({ body: createMaterialSchema }), createMaterial);

router.post('/:id/recharge', validate({ params: idParamSchema }), rechargeMaterial);

router.route('/:id')
    .get(validate({ params: idParamSchema }), getMaterial)
    .put(validate({ params: idParamSchema, body: updateMaterialSchema }), updateMaterial)
    .delete(validate({ params: idParamSchema }), deleteMaterial);

router.put('/:id/restore', authorize('ADMIN', 'SUPER_ADMIN'), validate({ params: idParamSchema }), restoreMaterial);

export default router;
