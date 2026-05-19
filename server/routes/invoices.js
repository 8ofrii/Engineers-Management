import express from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
    listInvoices, getInvoice, createInvoice, updateInvoice,
    getInvoicePdf, sendInvoice, recordPayment, cancelInvoice, deleteInvoice
} from '../controllers/invoiceController.js';
import {
    createInvoiceSchema, updateInvoiceSchema, sendInvoiceSchema,
    recordPaymentSchema, idParamSchema
} from '../schemas/invoices.schema.js';

const router = express.Router();
router.use(protect);

router.get('/', listInvoices);
router.post('/', validate({ body: createInvoiceSchema }), createInvoice);

router.get('/:id', validate({ params: idParamSchema }), getInvoice);
router.put('/:id', validate({ params: idParamSchema, body: updateInvoiceSchema }), updateInvoice);
router.delete('/:id', validate({ params: idParamSchema }), deleteInvoice);

router.get('/:id/pdf', validate({ params: idParamSchema }), getInvoicePdf);
router.post('/:id/send', validate({ params: idParamSchema, body: sendInvoiceSchema }), sendInvoice);
router.post('/:id/payment', validate({ params: idParamSchema, body: recordPaymentSchema }), recordPayment);
router.put('/:id/cancel', validate({ params: idParamSchema }), cancelInvoice);

export default router;
