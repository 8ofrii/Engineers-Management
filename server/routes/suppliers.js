import express from 'express';
import { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(protect, getSuppliers)
    .post(protect, createSupplier);

router.route('/:id')
    .get(protect, getSupplier)
    .put(protect, updateSupplier)
    .delete(protect, deleteSupplier);

export default router;
