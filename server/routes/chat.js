import express from 'express';
import * as chatController from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Send message (text or voice)
router.post(
    '/message',
    upload.single('audio'), // Handle audio file upload
    chatController.sendMessage
);

// Get chat history
router.get('/history', chatController.getChatHistory);

// Clear chat history
router.delete('/history', chatController.clearChatHistory);

export default router;
