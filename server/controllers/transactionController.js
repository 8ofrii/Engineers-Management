import prisma from '../lib/prisma.js';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// @desc    Parse voice note with AI (Staging - No DB save)
// @route   POST /api/transactions/ai-parse
// @access  Private (Engineer, Manager, Admin)
export const parseVoiceNote = async (req, res, next) => {
    try {
        const { audioFile, textInput, projectId } = req.body;

        // Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                success: false,
                message: 'OpenAI API key not configured. Please add OPENAI_API_KEY to .env file'
            });
        }

        let rawText = textInput;

        // Step 1: If audio file provided, transcribe with Whisper
        if (audioFile && !textInput) {
            try {
                // Note: This is a placeholder for actual Whisper API integration
                // You'll need to implement file upload handling first
                // For now, we'll return an error message
                return res.status(400).json({
                    success: false,
                    message: 'Audio file upload not yet implemented. Please use textInput for testing.',
                    hint: 'Add file upload middleware (multer) to handle audio files'
                });

                /* Future implementation:
                const OpenAI = require('openai');
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                
                const transcription = await openai.audio.transcriptions.create({
                    file: audioFile,
                    model: "whisper-1",
                    language: "ar" // or auto-detect
                });
                rawText = transcription.text;
                */
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Whisper transcription failed',
                    error: error.message
                });
            }
        }

        if (!rawText) {
            return res.status(400).json({
                success: false,
                message: 'Either audioFile or textInput is required'
            });
        }

        // Step 2: Extract structured data with GPT-4o-mini
        try {
            // Note: This is a placeholder for actual OpenAI API integration
            // For testing, we'll use a simple parser

            /* Future implementation:
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{
                    role: "system",
                    content: `You are a financial assistant for a construction company. Extract transaction details from Arabic/English text.
                    
Available categories: MATERIALS, LABOR, EQUIPMENT, TRANSPORTATION, SERVICES, UTILITIES, PERMITS, OTHER

Return JSON with:
{
  "vendor": "vendor name or Unknown",
  "amount": number (extract from text, if not found return 0),
  "category": "one of the available categories",
  "description": "clean description in original language"
}`
                }, {
                    role: "user",
                    content: rawText
                }],
                response_format: { type: "json_object" }
            });
            
            const extracted = JSON.parse(completion.choices[0].message.content);
            */



            // Return structured data WITHOUT saving to database
            res.status(200).json({
                success: true,
                message: 'Voice note parsed successfully. Please verify and submit.',
                data: {
                    rawText: rawText,
                    extracted: extracted,
                    projectId: projectId,
                    status: 'DRAFT',
                    nextStep: 'Review the extracted data and call POST /api/transactions/draft to create the transaction'
                }
            });

        } catch (error) {
            console.error('OpenAI API Error:', error);
            return res.status(500).json({
                success: false,
                message: 'AI extraction failed',
                error: error.message,
                details: error.response?.data || 'No additional details'
            });
        }

    } catch (error) {
        next(error);
    }
};

// @desc    Get all transactions (role-based filtering)
// @route   GET /api/transactions
// @access  Private
export const getTransactions = async (req, res, next) => {
    try {
        let whereClause = {};

        // Engineers can only see their own transactions
        if (req.user.role === 'ENGINEER') {
            whereClause.createdBy = req.user.id;
        }

        // Project Managers see transactions for their projects
        if (req.user.role === 'PROJECT_MANAGER') {
            const projects = await prisma.project.findMany({
                where: { engineerId: req.user.id },
                select: { id: true }
            });
            whereClause.projectId = {
                in: projects.map(p => p.id)
            };
        }

        // Admins and Accountants see all

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            include: {
                project: { select: { name: true } },
                supplier: { select: { name: true } },
                client: { select: { name: true } },
                user: { select: { name: true, email: true } }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            count: transactions.length,
            data: transactions
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get pending approval transactions
// @route   GET /api/transactions/pending
// @access  Private (Manager, Admin)
export const getPendingApprovals = async (req, res, next) => {
    try {
        const pending = await prisma.transaction.findMany({
            where: { status: 'PENDING_APPROVAL' },
            include: {
                user: { select: { name: true, email: true } },
                project: { select: { name: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.status(200).json({
            success: true,
            count: pending.length,
            data: pending
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Record client income (with auto-split)
// @route   POST /api/transactions/income
// @access  Private (Admin, Accountant)
export const recordIncome = async (req, res, next) => {
    try {
        const { projectId, amount, category, clientId, description } = req.body;

        // Fetch project configuration
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Calculate split based on revenue model
        let officeShare = 0;
        let opsShare = amount;

        if (project.revenueModel === 'EXECUTION_COST_PLUS') {
            const feePercent = project.managementFeePercent || 20;
            officeShare = amount * (feePercent / 100);
            opsShare = amount - officeShare;
        }

        // Atomic transaction
        const result = await prisma.$transaction([
            // Create income transaction
            prisma.transaction.create({
                data: {
                    type: 'INCOME',
                    category: category || 'PAYMENT',
                    amount: amount,
                    description: description,
                    status: 'APPROVED',
                    projectId: projectId,
                    clientId: clientId,
                    createdBy: req.user.id,
                    transactionDate: new Date()
                }
            }),

            // Update project funds
            prisma.project.update({
                where: { id: projectId },
                data: {
                    officeRevenue: { increment: officeShare },
                    operationalFund: { increment: opsShare }
                }
            })
        ]);

        res.status(201).json({
            success: true,
            transaction: result[0],
            split: {
                total: amount,
                officeRevenue: officeShare,
                operationalFund: opsShare,
                splitRatio: `${100 - (project.managementFeePercent || 0)}/${project.managementFeePercent || 0}`
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Submit transaction for approval
// @route   PUT /api/transactions/:id/submit
// @access  Private
export const submitTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { receiptPhotoUrl, confirmedAmount, confirmedDescription } = req.body;

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: { project: { include: { engineer: true } } }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        if (transaction.status !== 'DRAFT') {
            return res.status(400).json({
                success: false,
                message: 'Only draft transactions can be submitted'
            });
        }

        if (transaction.createdBy !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Update transaction
        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                status: 'PENDING_APPROVAL',
                receiptPhotoUrl: receiptPhotoUrl,
                amount: confirmedAmount || transaction.amount,
                description: confirmedDescription || transaction.description
            }
        });

        // Notify project manager
        await prisma.notification.create({
            data: {
                userId: transaction.project.engineerId,
                type: 'ACTION_REQUIRED',
                title: 'New Expense Pending Approval',
                message: `${req.user.name} submitted expense: ${confirmedAmount || transaction.amount} EGP for ${transaction.project.name}`,
                resourceId: id,
                resourceType: 'transaction'
            }
        });

        res.status(200).json({
            success: true,
            data: updated,
            message: 'Transaction submitted for approval'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Approve transaction
// @route   PUT /api/transactions/:id/approve
// @access  Private (Manager, Admin)
export const approveTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: {
                user: true,
                project: true
            }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        if (transaction.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({
                success: false,
                message: 'Transaction is not pending approval'
            });
        }

        // THE CRITICAL LINKS - All happen atomically
        const updates = await prisma.$transaction(async (tx) => {
            // LINK 1: Update transaction status
            const updatedTransaction = await tx.transaction.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    approvedBy: req.user.id,
                    approvedAt: new Date()
                }
            });

            // LINK 2: Decrement engineer's custody balance
            await tx.user.update({
                where: { id: transaction.createdBy },
                data: {
                    currentCustodyBalance: { decrement: transaction.amount },
                    pendingClearance: { decrement: transaction.amount }
                }
            });

            // LINK 3: Update project funds
            await tx.project.update({
                where: { id: transaction.projectId },
                data: {
                    operationalFund: { decrement: transaction.amount },
                    actualCost: { increment: transaction.amount }
                }
            });

            // LINK 4: Create custody transfer record
            await tx.custodyTransfer.create({
                data: {
                    type: 'CLEARANCE',
                    amount: transaction.amount,
                    description: `Cleared: ${transaction.description}`,
                    engineerId: transaction.createdBy,
                    balanceBefore: transaction.user.currentCustodyBalance,
                    balanceAfter: transaction.user.currentCustodyBalance - transaction.amount,
                    relatedTransactionId: id
                }
            });

            // LINK 5: Create material batch if it's a material purchase
            if (transaction.category === 'MATERIALS') {
                await tx.materialBatch.create({
                    data: {
                        projectId: transaction.projectId,
                        originalReceiptId: id,
                        description: transaction.description,
                        initialValue: transaction.amount,
                        remainingValue: transaction.amount,
                        status: 'AVAILABLE',
                        recordedBy: transaction.createdBy
                    }
                });
            }

            // LINK 6: Notify the engineer
            await tx.notification.create({
                data: {
                    userId: transaction.createdBy,
                    type: 'INFO',
                    title: 'Expense Approved',
                    message: `Your expense of ${transaction.amount} EGP was approved. Custody updated.`,
                    resourceId: id,
                    resourceType: 'transaction'
                }
            });

            return updatedTransaction;
        });

        res.status(200).json({
            success: true,
            data: updates,
            message: 'Transaction approved and all balances updated'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Reject transaction
// @route   PUT /api/transactions/:id/reject
// @access  Private (Manager, Admin)
export const rejectTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const transaction = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        if (transaction.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({
                success: false,
                message: 'Transaction is not pending approval'
            });
        }

        // Update transaction and remove from pending clearance
        const [updated] = await prisma.$transaction([
            prisma.transaction.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    rejectionReason: reason,
                    approvedBy: req.user.id,
                    approvedAt: new Date()
                }
            }),

            prisma.user.update({
                where: { id: transaction.createdBy },
                data: {
                    pendingClearance: { decrement: transaction.amount }
                }
            }),

            prisma.notification.create({
                data: {
                    userId: transaction.createdBy,
                    type: 'ALERT',
                    title: 'Expense Rejected',
                    message: `Your expense of ${transaction.amount} EGP was rejected. Reason: ${reason}`,
                    resourceId: id,
                    resourceType: 'transaction'
                }
            })
        ]);

        res.status(200).json({
            success: true,
            data: updated,
            message: 'Transaction rejected'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Create draft transaction (manual entry)
// @route   POST /api/transactions/draft
// @access  Private
export const createDraft = async (req, res, next) => {
    try {
        const { projectId, amount, category, description } = req.body;

        const draft = await prisma.transaction.create({
            data: {
                type: 'EXPENSE',
                category: category,
                amount: amount,
                description: description,
                status: 'DRAFT',
                projectId: projectId,
                createdBy: req.user.id,
                paymentMethod: 'CUSTODY_WALLET'
            }
        });

        // Update pending clearance
        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                pendingClearance: { increment: amount }
            }
        });

        res.status(201).json({
            success: true,
            data: draft,
            message: 'Draft created. Please review and submit.'
        });

    } catch (error) {
        next(error);
    }
};

// Keep existing functions
export const getStats = async (req, res, next) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                createdBy: req.user.id,
                status: 'APPROVED'
            }
        });

        const byType = transactions.reduce((acc, t) => {
            const existing = acc.find(item => item._id === t.type);
            if (existing) {
                existing.total += Number(t.amount);
            } else {
                acc.push({ _id: t.type, total: Number(t.amount) });
            }
            return acc;
        }, []);

        const byCategory = transactions.reduce((acc, t) => {
            const existing = acc.find(item => item._id === t.category);
            if (existing) {
                existing.total += Number(t.amount);
            } else {
                acc.push({ _id: t.category, total: Number(t.amount) });
            }
            return acc;
        }, []);

        res.status(200).json({
            success: true,
            data: {
                byType,
                byCategory
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getTransaction = async (req, res, next) => {
    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id: req.params.id },
            include: {
                project: true,
                supplier: true,
                client: true,
                user: { select: { name: true, email: true } },
                approver: { select: { name: true, email: true } }
            }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        res.status(200).json({
            success: true,
            data: transaction
        });
    } catch (error) {
        next(error);
    }
};

export const deleteTransaction = async (req, res, next) => {
    try {
        await prisma.transaction.delete({
            where: { id: req.params.id }
        });

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        next(error);
    }
};
