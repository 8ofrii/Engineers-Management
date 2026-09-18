import prisma from '../lib/prisma.js';
import OpenAI from 'openai';
import fs from 'fs';
import * as aiService from '../services/aiService.js';
import { aiErrorResponse } from '../lib/aiErrors.js';
import logger from '../lib/logger.js';
import { enforceAiBudget } from '../lib/aiUsage.js';
import { auditFromReq } from '../lib/audit.js';

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
        // Enforce Monthly AI Budget Check
        await enforceAiBudget(req.user.tenantId);

        const { message, history } = req.body;
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
                messageType: isAudio ? 'AUDIO' : 'TEXT',
                processed: true // Mark as true to identify as User message
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
            // Step 3: Check if Micromind Agent is configured
            if (process.env.MICROMIND_API_URL) {
                try {
                    // Fetch tenant name for context
                    const tenant = await prisma.tenant.findUnique({
                        where: { id: req.user.tenantId },
                        select: { name: true }
                    });

                    const contextualPrompt = `[Context: Company="${tenant?.name || 'Hesaby'}", TenantID="${req.user.tenantId}", User="${req.user.name}", Role="${req.user.role}"]
[Formatting Guideline: Reply in natural human conversational speech. Avoid heavy raw markdown formatting, headers (###), or excessive asterisks (**). Keep answers conversational, clear, warm, and concise.]
${userMessage}`;

                    const micromindRes = await fetch(process.env.MICROMIND_API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            question: contextualPrompt
                        })
                    });

                    const micromindData = await micromindRes.json();

                    if (micromindData && (micromindData.text || micromindData.response)) {
                        aiResponse = micromindData.text || micromindData.response;
                    }
                } catch (microErr) {
                    logger.error({ err: microErr }, 'Micromind Agent error, falling back to local chat tools');
                }
            }

            // Fallback to OpenAI tools if Micromind did not produce a response
            if (!aiResponse) {
                try {
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
                    const priorTurns = Array.isArray(history)
                        ? history.filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content).slice(-12)
                        : [];
                    const completion = await client.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [
                            {
                                role: "system",
                                content: `You are a professional construction assistant and financial copilot in Egypt.
You help engineers and managers run sites, log expenses, and answer project financial questions.

CONVERSATIONAL TONE & NATURAL LANGUAGE:
- Speak in natural, human, friendly conversational language.
- Avoid raw markdown syntax, headers (###), or asterisks (**) where simple clean sentences work best.
- If listing multiple items, use clean bullet points.
- Keep answers warm, direct, concise, and helpful.

LANGUAGE RULE — STRICT:
- If the user's most recent message is written in English, reply in natural English.
- If the user's most recent message is written in Arabic (any dialect), reply in natural, warm Egyptian Arabic.
- If the user mixes both, reply in the language of the majority of their words.
- Never switch languages mid-conversation unless the user does first.`
                            },
                            ...priorTurns,
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
                                aiResponse = `تمام، أنا جهزت تفاصيل المصروف: ${args.amount} ج.م لبند ${args.category}. اضغط مراجعة وتسجيل المعاملة لحفظها.`;
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
                                        const totalSpent = project.transactions.filter(t => t.type === 'EXPENSE' && t.category !== 'MANAGEMENT_FEE_TRANSFER').reduce((sum, t) => sum + Number(t.amount || 0), 0);
                                        const totalProfit = project.transactions.filter(t => t.category === 'MANAGEMENT_FEE_TRANSFER').reduce((sum, t) => sum + Number(t.amount || 0), 0);
                                        const totalRevenue = project.transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount || 0), 0);
                                        summaryText = `بخصوص مشروع ${project.name}:\n- الميزانية: ${Number(project.budget || 0).toLocaleString()} ج.م\n- إجمالي المصاريف: ${totalSpent.toLocaleString()} ج.م\n- أرباح المكتب: ${totalProfit.toLocaleString()} ج.م\n- الدفعات المستلمة: ${totalRevenue.toLocaleString()} ج.م\n- المتبقي في الميزانية: ${(Number(project.budget || 0) - totalSpent).toLocaleString()} ج.م`;
                                    } else {
                                        summaryText = "لم أجد مشروعاً بهذا الاسم، يرجى التأكد من اسم المشروع.";
                                    }
                                } else {
                                    const stats = await prisma.transaction.groupBy({
                                        by: ['type', 'category'],
                                        where: { tenantId: req.user.tenantId, status: 'APPROVED' },
                                        _sum: { amount: true }
                                    });
                                    let income = 0, expense = 0, profit = 0;
                                    stats.forEach(s => {
                                        const amt = Number(s._sum.amount || 0);
                                        if (s.type === 'INCOME') income += amt;
                                        else if (s.type === 'EXPENSE') {
                                            if (s.category === 'MANAGEMENT_FEE_TRANSFER') profit += amt;
                                            else expense += amt;
                                        }
                                    });
                                    const net = income - expense - profit;
                                    summaryText = `إجمالي العمليات المالية:\n- إجمالي الإيرادات: ${income.toLocaleString()} ج.م\n- إجمالي المصاريف: ${expense.toLocaleString()} ج.م\n- أرباح المكتب: ${profit.toLocaleString()} ج.م\n- الرصيد الصافي: ${net.toLocaleString()} ج.م`;
                                }
                                aiResponse = summaryText;
                                toolData = { action: 'FETCH_SUMMARY', params: args, data: summaryText };
                            }
                        }
                    }
                } catch (openaiErr) {
                    logger.warn({ err: openaiErr }, 'OpenAI error, activating database-backed assistant fallback');
                    const rawMsg = (userMessage || '').trim();
                    const lower = rawMsg.toLowerCase();
                    const isEnglish = (rawMsg.match(/[a-zA-Z]/g) || []).length >= (rawMsg.match(/[\u0600-\u06FF]/g) || []).length && (rawMsg.match(/[a-zA-Z]/g) || []).length > 0;

                    // 1. Navigation Intent: Reports / DSR
                    if (lower.includes('report') || lower.includes('dsr') || lower.includes('تقارير') || lower.includes('تقرير') || lower.includes('الموقع')) {
                        if (lower.includes('new') || lower.includes('create') || lower.includes('add') || lower.includes('جديد') || lower.includes('سجل') || lower.includes('انشئ')) {
                            toolData = { action: 'NAVIGATE', target: 'CREATE_DSR' };
                            aiResponse = isEnglish
                                ? 'Opening Daily Site Report Creator...'
                                : 'تمام، جاري فتح نموذج تسجيل تقرير موقع جديد...';
                        } else {
                            toolData = { action: 'NAVIGATE', target: 'DSR' };
                            aiResponse = isEnglish
                                ? 'Navigating to Daily Site Reports (DSR)...'
                                : 'تمام، جاري نقلك إلى شاشة التقارير اليومية (DSR)...';
                        }
                    }
                    // 2. Navigation Intent: Finance & Expenses
                    else if (lower.includes('finance') || lower.includes('transaction') || lower.includes('accounting') || lower.includes('مالية') || lower.includes('الماليه') || lower.includes('معاملات') || (lower.includes('مصاريف') && !lower.match(/\d+/))) {
                        toolData = { action: 'NAVIGATE', target: 'FINANCE' };
                        aiResponse = isEnglish
                            ? 'Opening Finance & Transactions screen...'
                            : 'تمام، جاري نقلك إلى شاشة المالية والمعاملات...';
                    }
                    // 3. Navigation Intent: Projects & Dashboard
                    else if (lower.includes('project') || lower.includes('dashboard') || lower.includes('مشاريع') || lower.includes('مشروع') || lower.includes('الرئيسية') || lower.includes('داشبورد')) {
                        if (lower.includes('summary') || lower.includes('ملخص') || lower.includes('ميزانية') || lower.includes('budget')) {
                            const projects = await prisma.project.findMany({
                                where: { tenantId: req.user.tenantId },
                                take: 5,
                                select: { name: true, budget: true, status: true }
                            });
                            const list = projects.map(p => `• ${p.name} (${isEnglish ? 'Budget' : 'الميزانية'}: ${Number(p.budget || 0).toLocaleString()} EGP - ${p.status})`).join('\n');
                            aiResponse = isEnglish
                                ? `🏢 Active Projects:\n${list || 'No projects currently recorded.'}`
                                : `🏢 قائمة المشاريع النشطة:\n${list || 'لا توجد مشاريع مسجلة حالياً.'}`;
                            toolData = { action: 'FETCH_SUMMARY', data: aiResponse };
                        } else {
                            toolData = { action: 'NAVIGATE', target: 'PROJECTS' };
                            aiResponse = isEnglish
                                ? 'Opening Projects Overview...'
                                : 'تمام، جاري نقلك إلى شاشة المشاريع...';
                        }
                    }
                    // 4. Navigation Intent: Inventory & Stock
                    else if (lower.includes('inventory') || lower.includes('stock') || lower.includes('material') || lower.includes('مخزن') || lower.includes('مخازن') || lower.includes('خامات') || lower.includes('بضاعة')) {
                        toolData = { action: 'NAVIGATE', target: 'INVENTORY' };
                        aiResponse = isEnglish
                            ? 'Opening Inventory & Materials management...'
                            : 'تمام، جاري نقلك إلى إدارة المخازن والخامات...';
                    }
                    // 5. Navigation Intent: Workforce & Labor
                    else if (lower.includes('workforce') || lower.includes('labor') || lower.includes('worker') || lower.includes('عمالة') || lower.includes('عمال') || lower.includes('صنايعية') || lower.includes('يوميات')) {
                        toolData = { action: 'NAVIGATE', target: 'WORKMEN' };
                        aiResponse = isEnglish
                            ? 'Opening Workforce & Labor directory...'
                            : 'تمام، جاري نقلك إلى سجل العمالة والمقاولين...';
                    }
                    // 6. Navigation Intent: Invoices
                    else if (lower.includes('invoice') || lower.includes('bill') || lower.includes('فاتورة') || lower.includes('فواتير') || lower.includes('مطالبات')) {
                        toolData = { action: 'NAVIGATE', target: 'INVOICES' };
                        aiResponse = isEnglish
                            ? 'Opening Invoices & Billing...'
                            : 'تمام، جاري نقلك إلى شاشة الفواتير والمطالبات...';
                    }
                    // 7. Transaction creation (Expense / Income)
                    else if (lower.includes('سجل') || lower.includes('أضف') || lower.includes('اضف') || lower.includes('record') || lower.includes('add') || lower.includes('صرف') || lower.includes('expense')) {
                        const amountMatch = userMessage.match(/\d+([.,]\d+)?/);
                        const amount = amountMatch ? parseFloat(amountMatch[0].replace(',', '.')) : 0;
                        
                        let category = 'MATERIALS';
                        if (lower.includes('عمال') || lower.includes('يومية') || lower.includes('صنايعي') || lower.includes('بناء') || lower.includes('labor') || lower.includes('wage')) {
                            category = 'LABOR';
                        } else if (lower.includes('معدة') || lower.includes('حفار') || lower.includes('لودر') || lower.includes('خلاطة') || lower.includes('equipment')) {
                            category = 'EQUIPMENT';
                        } else if (lower.includes('نقل') || lower.includes('تشوين') || lower.includes('خدمات') || lower.includes('service') || lower.includes('transport')) {
                            category = 'SERVICES';
                        }

                        const project = await prisma.project.findFirst({
                            where: { tenantId: req.user.tenantId }
                        });

                        toolData = {
                            action: 'CREATE_TRANSACTION',
                            params: {
                                type: lower.includes('إيراد') || lower.includes('ايراد') || lower.includes('income') || lower.includes('revenue') ? 'INCOME' : 'EXPENSE',
                                amount,
                                category,
                                description: userMessage,
                                projectId: project?.id
                            }
                        };
                        aiResponse = isEnglish
                            ? `Prepared transaction draft: ${amount.toLocaleString()} EGP for (${category}). Tap the button below to review and confirm.`
                            : `تمام، قمت بتجهيز تفاصيل المعاملة بمبلغ ${amount.toLocaleString()} ج.م لبند (${category}). اضغط الزر أدناه لمراجعة وحفظ المعاملة فوراً.`;
                    }
                    // 8. Financial Summary
                    else if (lower.includes('ملخص') || lower.includes('summary') || lower.includes('total') || lower.includes('balance') || lower.includes('رصيد')) {
                        const [stats, projectsCount] = await Promise.all([
                            prisma.transaction.groupBy({
                                by: ['type', 'category'],
                                where: { tenantId: req.user.tenantId, status: 'APPROVED' },
                                _sum: { amount: true }
                            }),
                            prisma.project.count({ where: { tenantId: req.user.tenantId } })
                        ]);
                        let income = 0, expense = 0, profit = 0;
                        stats.forEach(s => {
                            const amt = Number(s._sum.amount || 0);
                            if (s.type === 'INCOME') income += amt;
                            else if (s.type === 'EXPENSE') {
                                if (s.category === 'MANAGEMENT_FEE_TRANSFER') profit += amt;
                                else expense += amt;
                            }
                        });
                        const net = income - expense - profit;
                        
                        aiResponse = isEnglish
                            ? `📊 Financial Overview:\n- Total Income: ${income.toLocaleString()} EGP\n- Total Expenses: ${expense.toLocaleString()} EGP\n- Office Profit: ${profit.toLocaleString()} EGP\n- Net Cashflow: ${net.toLocaleString()} EGP\n- Active Projects: ${projectsCount}`
                            : `📊 الملخص المالي للنظام:\n- إجمالي الإيرادات: ${income.toLocaleString()} ج.م\n- إجمالي المصروفات: ${expense.toLocaleString()} ج.م\n- أرباح المكتب: ${profit.toLocaleString()} ج.م\n- الرصيد الصافي: ${net.toLocaleString()} ج.م\n- عدد المشاريع: ${projectsCount} مشاريع.`;
                        toolData = { action: 'FETCH_SUMMARY', data: aiResponse };
                    }
                    // 9. Greeting / Help
                    else {
                        aiResponse = isEnglish
                            ? "Hello! I am your Hesaby ERP AI Copilot. You can tell me to open screens (e.g. 'take me to reports', 'open projects'), check financial summaries, or record expenses via text or voice (e.g. 'record expense 500 EGP for sand')."
                            : "أهلاً بك! أنا المساعد الذكي لنظام حسابي ERP. يمكنك أن تطلب مني الانتقال لأي شاشة (مثل 'وديني التقارير' أو 'افتح المشاريع')، الاستفسار عن ملخص المصروفات، أو تسجيل المعاملات بالأوامر النصية والصوتية.";
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

        // Record AI usage in AuditLog for real-time quota tracking
        await auditFromReq(req, {
            action: 'AI_CHAT',
            entity: 'ChatMessage',
            entityId: aiChatMessage.id,
            metadata: { isAudio, messageType: aiChatMessage.messageType }
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
        logger.error({ err: error }, 'Chat Assistant Error');
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
            data: messages.map((msg) => ({
                ...msg,
                isUser: msg.processed === true
            }))
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
