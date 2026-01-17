import express from 'express';
import { getTransactions, getTransaction, createTransaction, updateTransaction, deleteTransaction, getStats } from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', protect, getStats);

router.route('/')
    .get(protect, getTransactions)
    .post(protect, createTransaction);

router.route('/:id')
    .get(protect, getTransaction)
    .put(protect, updateTransaction)
    .delete(protect, deleteTransaction);

export default router;
