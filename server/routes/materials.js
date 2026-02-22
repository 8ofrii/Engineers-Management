import express from 'express';
import {
    getMaterials,
    getMaterial,
    createMaterial,
    updateMaterial,
    deleteMaterial
} from '../controllers/materialController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getMaterials)
    .post(createMaterial);

router.route('/:id')
    .get(getMaterial)
    .put(updateMaterial)
    .delete(deleteMaterial);

export default router;
