import express from 'express';
import { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createSupplierSchema, updateSupplierSchema, idParamSchema } from '../schemas/suppliers.schema.js';

const router = express.Router();

router.route('/')
    .get(protect, getSuppliers)
    .post(protect, validate({ body: createSupplierSchema }), createSupplier);

router.route('/:id')
    .get(protect, validate({ params: idParamSchema }), getSupplier)
    .put(protect, validate({ params: idParamSchema, body: updateSupplierSchema }), updateSupplier)
    .delete(protect, validate({ params: idParamSchema }), deleteSupplier);

export default router;
