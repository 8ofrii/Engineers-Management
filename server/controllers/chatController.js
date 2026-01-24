import prisma from '../lib/prisma.js';
import OpenAI from 'openai';
import fs from 'fs';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// @desc    Chat with AI assistant (with voice support)
// @route   POST /api/chat/message
// @access  Private
export const sendMessage = async (req, res, next) => {
    try {
        const { message, audioFile } = req.body;
        const userId = req.user.id;

        let userMessage = message;

        // If audio file is provided, transcribe it first
        if (req.file) {
            try {
                const transcription = await openai.audio.transcriptions.create({
                    file: fs.createReadStream(req.file.path),
                    model: "whisper-1",
                    language: "ar" // Arabic, or use auto-detect
                });

                userMessage = transcription.text;

                // Delete the audio file after transcription
                fs.unlinkSync(req.file.path);

            } catch (error) {
                console.error('Whisper transcription error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to transcribe audio',
                    error: error.message
                });
            }
        }

        if (!userMessage) {
            return res.status(400).json({
                success: false,
                message: 'Message or audio file is required'
            });
        }

        // Save user message to database
        const userChatMessage = await prisma.chatMessage.create({
            data: {
                userId: userId,
                content: userMessage,
                type: 'TEXT',
                intent: 'GENERAL'
            }
        });

        // Get AI response using GPT-4o-mini
        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{
                    role: "system",
                    content: `You are a helpful assistant for a construction management system. You can help with:
- Adding transactions (expenses, income)
- Checking project status
- Viewing financial reports
- Managing suppliers and clients
- Answering questions about the system

Respond in the same language as the user (Arabic or English).
Be concise and helpful.`
                }, {
                    role: "user",
                    content: userMessage
                }],
                temperature: 0.7,
                max_tokens: 500
            });

            const aiResponse = completion.choices[0].message.content;

            // Save AI response to database
            const aiChatMessage = await prisma.chatMessage.create({
                data: {
                    userId: userId,
                    content: aiResponse,
                    type: 'TEXT',
                    intent: 'GENERAL'
                }
            });

            res.status(200).json({
                success: true,
                data: {
                    userMessage: {
                        id: userChatMessage.id,
                        content: userMessage,
                        createdAt: userChatMessage.createdAt,
                        transcribed: !!req.file // Was this from voice?
                    },
                    aiResponse: {
                        id: aiChatMessage.id,
                        content: aiResponse,
                        createdAt: aiChatMessage.createdAt
                    }
                }
            });

        } catch (error) {
            console.error('OpenAI chat error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get AI response',
                error: error.message
            });
        }

    } catch (error) {
        next(error);
    }
};

// @desc    Get chat history
// @route   GET /api/chat/history
// @access  Private
export const getChatHistory = async (req, res, next) => {
    try {
        const messages = await prisma.chatMessage.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'asc' },
            take: 50 // Last 50 messages
        });

        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Clear chat history
// @route   DELETE /api/chat/history
// @access  Private
export const clearChatHistory = async (req, res, next) => {
    try {
        await prisma.chatMessage.deleteMany({
            where: { userId: req.user.id }
        });

        res.status(200).json({
            success: true,
            message: 'Chat history cleared'
        });

    } catch (error) {
        next(error);
    }
};
