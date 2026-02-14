import express from 'express';
import * as categoryController from '../controllers/categoryController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all categories (flat or grouped)
// Query params: ?grouped=true&language=ar
router.get('/', categoryController.getCategories);

// Search category by Arabic name
// Query params: ?q=خرسانات
router.get('/search', categoryController.searchCategory);

export default router;
