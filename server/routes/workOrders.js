import express from 'express';
import {
    getWorkOrders,
    getWorkOrderById,
    createWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    getWorkOrderPayments,
    suggestWorkOrderName
} from '../controllers/workOrderController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get suggested name for category
router.get('/suggest-name/:category', suggestWorkOrderName);

// Get all work orders (with filters)
router.get('/', getWorkOrders);

// Get single work order
router.get('/:id', getWorkOrderById);

// Get work order payments
router.get('/:id/payments', getWorkOrderPayments);

// Create new work order
router.post('/', createWorkOrder);

// Update work order
router.put('/:id', updateWorkOrder);

// Delete work order (Admin/Manager only)
router.delete('/:id', authorize('ADMIN', 'PROJECT_MANAGER'), deleteWorkOrder);

export default router;
