import prisma from '../lib/prisma.js';
import OpenAI from 'openai';
import fs from 'fs';
import * as aiService from '../services/aiService.js';
import { aiErrorResponse } from '../lib/aiErrors.js';
import logger from '../lib/logger.js';

// Lazy initialization to ensure env vars are loaded
let openai = null;
const getOpenAI = () => {
    if (!openai) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
};

// Map the FE-facing action keys (kept stable for the chat UI's confirm flow)
// onto the MessageIntent enum stored in the DB. Anything unmapped falls back
// to GENERAL — better than a 400 from an enum violation.
const ACTION_TO_INTENT = {
    CREATE_TRANSACTION: 'ADD_TRANSACTION',
    FETCH_SUMMARY: 'QUERY'
};
const toIntent = (action) => (action && ACTION_TO_INTENT[action]) || 'GENERAL';

// @desc    Chat with AI assistant (with voice support)
// @route   POST /api/chat/message
// @access  Private
export const sendMessage = async (req, res, next) => {
    try {
        const { message } = req.body;
        const userId = req.user.id;
        let userMessage = message;
        let isAudio = !!req.file;
        let aiParsedData = null;

        // Step 1: Handle Audio via specialized AI Service
        if (isAudio) {
            try {
                const result = await aiService.processVoiceNote(req.file.path);
                userMessage = result.raw_text;
                aiParsedData = result.parsed_data;
            } catch (error) {
                logger.warn({ err: error, code: error?.code, status: error?.status }, 'AI voice processing failed');
                const { statusCode, body } = aiErrorResponse(error);
                return res.status(statusCode).json(body);
            } finally {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            }
        }

        if (!userMessage && !isAudio) return res.status(400).json({ success: false, message: 'No content' });

        // Save User Message
        const userChatMessage = await prisma.chatMessage.create({
            data: {
                userId,
                tenantId: req.user.tenantId,
                content: userMessage || "Voice Note",
                messageType: isAudio ? 'AUDIO' : 'TEXT'
            }
        });

        let aiResponse = "";
        let toolData = null;

        // Step 2: If it was audio, we already have structured data from aiService
        if (isAudio && aiParsedData) {
            aiResponse = `تمام، فهمت من كلامك: "${aiParsedData.summary}". 
            المبلغ: ${aiParsedData.amount} ج.م، البند: ${aiParsedData.category}. 
            تحب أسجلها كموسودة؟`;

            toolData = {
                action: 'CREATE_TRANSACTION',
                params: {
                    type: 'EXPENSE',
                    amount: aiParsedData.amount,
                    category: aiParsedData.category,
                    description: aiParsedData.summary,
                    vendor: aiParsedData.vendor,
                    isStockPurchase: aiParsedData.is_stock_purchase,
                    itemName: aiParsedData.items?.[0]?.name,
                    quantity: aiParsedData.items?.[0]?.quantity,
                    unit: aiParsedData.items?.[0]?.unit,
                    items: aiParsedData.items
                },
                confidence: 1.0
            };
        } else {
            // Step 3: Regular Chat with Tools for Text Input
            const tools = [
                {
                    type: "function",
                    function: {
                        name: "record_transaction",
                        description: "Record a financial transaction (expense or income) for a project.",
                        parameters: {
                            type: "object",
                            properties: {
                                type: { type: "string", enum: ["EXPENSE", "INCOME"] },
                                amount: { type: "number" },
                                category: { type: "string", enum: ["MATERIALS", "LABOR", "EQUIPMENT", "SERVICES", "OTHER"] },
                                description: { type: "string" },
                                projectName: { type: "string", description: "Name of the project" }
                            },
                            required: ["type", "amount", "category", "description"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "get_financial_summary",
                        description: "Get a summary of projects, income, or expenses.",
                        parameters: {
                            type: "object",
                            properties: {
                                scope: { type: "string", enum: ["ALL", "PROJECT"], default: "ALL" },
                                projectName: { type: "string" }
                            }
                        }
                    }
                }
            ];

            const client = getOpenAI();
            const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are a professional construction assistant in Egypt. 
                        You help engineers manage sites. You can process transactions and answer project questions.
                        Respond in Egyptian Arabic unless English is used.`
                    },
                    { role: "user", content: userMessage }
                ],
                tools,
                tool_choice: "auto"
            });

            const responseMessage = completion.choices[0].message;
            aiResponse = responseMessage.content;

            if (responseMessage.tool_calls) {
                for (const toolCall of responseMessage.tool_calls) {
                    const args = JSON.parse(toolCall.function.arguments);

                    if (toolCall.function.name === 'record_transaction') {
                        let projectId = null;
                        if (args.projectName) {
                            const project = await prisma.project.findFirst({
                                where: {
                                    tenantId: req.user.tenantId,
                                    name: { contains: args.projectName, mode: 'insensitive' }
                                }
                            });
                            projectId = project?.id;
                        }

                        toolData = {
                            action: 'CREATE_TRANSACTION',
                            params: { ...args, projectId },
                            confidence: 0.95
                        };
                        aiResponse = `تمام، أنا جهزت تفاصيل المصروف: ${args.amount} ج.م لبند ${args.category}. دوس تأكيد عشان نسجلها.`;
                    }

                    if (toolCall.function.name === 'get_financial_summary') {
                        let summaryText = "";
                        if (args.projectName) {
                            const project = await prisma.project.findFirst({
                                where: {
                                    tenantId: req.user.tenantId,
                                    name: { contains: args.projectName, mode: 'insensitive' }
                                },
                                include: { transactions: { where: { status: 'APPROVED' } } }
                            });

                            if (project) {
                                const totalSpent = project.transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount || 0), 0);
                                const totalRevenue = project.transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount || 0), 0);
                                summaryText = `بخصوص مشروع ${project.name}:\n- الميزانية: ${project.budget} ج.م\n- إجمالي المصاريف: ${totalSpent} ج.م\n- الدفعات المستلمة: ${totalRevenue} ج.م\n- المتبقي في الميزانية: ${Number(project.budget) - totalSpent} ج.م`;
                            } else {
                                summaryText = "ملقتش مشروع بالاسم ده، ممكن تتأكد من الاسم؟";
                            }
                        } else {
                            const stats = await prisma.transaction.groupBy({
                                by: ['type'],
                                where: { tenantId: req.user.tenantId, status: 'APPROVED' },
                                _sum: { amount: true }
                            });
                            const income = stats.find(s => s.type === 'INCOME')?._sum.amount || 0;
                            const expense = stats.find(s => s.type === 'EXPENSE')?._sum.amount || 0;
                            summaryText = `إجمالي الشغل عندك حالياً:\n- إجمالي الإيرادات: ${income} ج.م\n- إجمالي المصاريف: ${expense} ج.م\n- الرصيد الصافي: ${Number(income) - Number(expense)} ج.م`;
                        }
                        aiResponse = summaryText;
                        toolData = { action: 'FETCH_SUMMARY', params: args, data: summaryText };
                    }
                }
            }
        }

        if (!aiResponse) aiResponse = "أنا معاك، أقدر أساعدك في إيه؟";

        // Save AI Message with Extracted Data
        const aiChatMessage = await prisma.chatMessage.create({
            data: {
                userId,
                tenantId: req.user.tenantId,
                content: aiResponse,
                messageType: toolData ? 'COMMAND' : 'TEXT',
                intent: toIntent(toolData?.action),
                extractedData: toolData ? toolData : undefined,
                processed: false
            }
        });

        res.status(200).json({
            success: true,
            data: {
                userMessage: {
                    id: userChatMessage.id,
                    content: userChatMessage.content,
                    createdAt: userChatMessage.createdAt
                },
                aiResponse: {
                    id: aiChatMessage.id,
                    content: aiResponse,
                    createdAt: aiChatMessage.createdAt
                },
                transcript: isAudio ? userMessage : null,
                extractedData: toolData
            }
        });

    } catch (error) {
        console.error('Chat Assistant Error:', error);
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
