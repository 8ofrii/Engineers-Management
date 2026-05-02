import express from 'express';
import { getClients, getClient, createClient, updateClient, deleteClient, restoreClient } from '../controllers/clientController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createClientSchema, updateClientSchema, idParamSchema } from '../schemas/clients.schema.js';

const router = express.Router();

router.route('/')
    .get(protect, getClients)
    .post(protect, validate({ body: createClientSchema }), createClient);

router.route('/:id')
    .get(protect, validate({ params: idParamSchema }), getClient)
    .put(protect, validate({ params: idParamSchema, body: updateClientSchema }), updateClient)
    .delete(protect, validate({ params: idParamSchema }), deleteClient);

// Phase 2 — restore soft-deleted record (admin only).
router.put('/:id/restore', protect, authorize('ADMIN', 'SUPER_ADMIN'), validate({ params: idParamSchema }), restoreClient);

export default router;
