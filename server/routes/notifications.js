import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../schemas/notifications.schema.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user notifications
router.get('/', notificationController.getNotifications);

// Mark all as read
router.put('/read-all', notificationController.markAllAsRead);

// Mark single notification as read
router.put('/:id/read', validate({ params: idParamSchema }), notificationController.markAsRead);

// Clear all notifications
router.delete('/', notificationController.clearAllNotifications);

// Delete notification
router.delete('/:id', validate({ params: idParamSchema }), notificationController.deleteNotification);

export default router;
