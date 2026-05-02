import express from 'express';
import { getClients, getClient, createClient, updateClient, deleteClient } from '../controllers/clientController.js';
import { protect } from '../middleware/auth.js';
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

export default router;
