# 🔗 API Logic & Interconnectivity Specification

## Phase 1: Technical Implementation Guide

This document explains **what happens inside the code** when a user clicks a button. It focuses on the **links between modules** and how different parts of the system affect each other.

---

## 1. The Revenue Engine (Income Splitter)

### Context
Admin/Accountant records a payment from a client.

### API Endpoint
```
POST /api/transactions/income
```

### Request Body
```json
{
  "projectId": "uuid",
  "amount": 100000,
  "category": "PAYMENT",
  "clientId": "uuid",
  "description": "Client payment for Villa A"
}
```

### The Logic Flow

```javascript
// controllers/transactionController.js

export const recordIncome = async (req, res) => {
  const { projectId, amount, category, clientId, description } = req.body;
  
  try {
    // 1. Fetch Project Configuration
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // 2. Conditional Check: Calculate Split Based on Revenue Model
    let officeShare = 0;
    let opsShare = amount;
    
    if (project.revenueModel === 'EXECUTION_COST_PLUS') {
      // Cost-Plus Model: Split based on management fee
      const feePercent = project.managementFeePercent || 20;
      officeShare = amount * (feePercent / 100);
      opsShare = amount - officeShare;
    } else if (project.revenueModel === 'DESIGN_ONLY_AREA' || 
               project.revenueModel === 'EXECUTION_LUMP_SUM') {
      // Design or Lump Sum: All goes to operational fund
      officeShare = 0;
      opsShare = amount;
    }
    
    // 3. Database Commit (Atomic Transaction)
    const result = await prisma.$transaction([
      // Create the income transaction
      prisma.transaction.create({
        data: {
          type: 'INCOME',
          category: category,
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
    
    // 4. Return success with split details
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
    console.error('Income recording error:', error);
    res.status(500).json({ error: 'Failed to record income' });
  }
};
```

### Key Points
- ✅ **Atomic Transaction**: Both transaction creation and project update happen together or not at all
- ✅ **Conditional Logic**: Different revenue models handled differently
- ✅ **Automatic Calculation**: No manual split required from user

---

## 2. The Custody Cycle (Al-Ohda)

### Context
Managing cash in the engineer's hand through two linked APIs.

### API A: Funding (Tamweel)

**Endpoint:** `POST /api/custody/transfer`

**Request Body:**
```json
{
  "engineerId": "uuid",
  "amount": 10000,
  "description": "Project Villa A funding"
}
```

**Logic:**
```javascript
export const fundEngineer = async (req, res) => {
  const { engineerId, amount, description } = req.body;
  
  try {
    // 1. Get current engineer balance
    const engineer = await prisma.user.findUnique({
      where: { id: engineerId },
      select: { currentCustodyBalance: true, name: true }
    });
    
    // 2. Calculate new balance
    const balanceBefore = engineer.currentCustodyBalance;
    const balanceAfter = balanceBefore + amount;
    
    // 3. Atomic update
    const result = await prisma.$transaction([
      // Update engineer's custody balance
      prisma.user.update({
        where: { id: engineerId },
        data: {
          currentCustodyBalance: { increment: amount }
        }
      }),
      
      // Create custody transfer record (audit trail)
      prisma.custodyTransfer.create({
        data: {
          type: 'FUNDING',
          amount: amount,
          description: description,
          engineerId: engineerId,
          balanceBefore: balanceBefore,
          balanceAfter: balanceAfter
        }
      }),
      
      // Create notification for engineer
      prisma.notification.create({
        data: {
          userId: engineerId,
          type: 'INFO',
          title: 'Custody Funded',
          message: `You received ${amount} EGP custody top-up. New balance: ${balanceAfter} EGP`,
          resourceType: 'custody'
        }
      })
    ]);
    
    res.status(200).json({
      success: true,
      balanceBefore,
      balanceAfter,
      transfer: result[1]
    });
    
  } catch (error) {
    console.error('Funding error:', error);
    res.status(500).json({ error: 'Failed to fund engineer' });
  }
};
```

### API B: Clearance (Tasweya) - The Critical Link

**Endpoint:** `PUT /api/transactions/:id/approve`

**This is the MOST CRITICAL link in the system.**

**Logic:**
```javascript
export const approveTransaction = async (req, res) => {
  const { id } = req.params;
  
  try {
    // 1. Fetch transaction with full details
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        user: true,  // The engineer who created it
        project: true
      }
    });
    
    // 2. Validation
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    if (transaction.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Transaction not pending approval' });
    }
    
    // 3. THE CRITICAL LINKS - All happen atomically
    const updates = await prisma.$transaction(async (tx) => {
      // LINK 1: Update Transaction Status
      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedBy: req.user.id,
          approvedAt: new Date()
        }
      });
      
      // LINK 2: Decrement Engineer's Custody Balance
      await tx.user.update({
        where: { id: transaction.createdBy },
        data: {
          currentCustodyBalance: { decrement: transaction.amount },
          pendingClearance: { decrement: transaction.amount }
        }
      });
      
      // LINK 3: Decrement Project Operational Fund
      await tx.project.update({
        where: { id: transaction.projectId },
        data: {
          operationalFund: { decrement: transaction.amount },
          actualCost: { increment: transaction.amount }
        }
      });
      
      // LINK 4: Create Custody Transfer Record
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
      
      // LINK 5: Create Material Batch if it's a material purchase
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
      transaction: updates,
      message: 'Transaction approved and all balances updated'
    });
    
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Failed to approve transaction' });
  }
};
```

### The 6 Critical Links
1. ✅ Transaction status → APPROVED
2. ✅ Engineer custody balance → DECREASED
3. ✅ Engineer pending clearance → DECREASED
4. ✅ Project operational fund → DECREASED
5. ✅ Project actual cost → INCREASED
6. ✅ Material batch → CREATED (if materials)
7. ✅ Notification → SENT to engineer

---

## 3. The AI Voice Pipeline (Staging Logic)

### API A: The Parser (Draft Creation)

**Endpoint:** `POST /api/transactions/ai-draft`

**Request Body:**
```json
{
  "audioFile": "base64_or_url",
  "projectId": "uuid"
}
```

**Logic:**
```javascript
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const createAIDraft = async (req, res) => {
  const { audioFile, projectId } = req.body;
  
  try {
    // 1. Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "ar" // or auto-detect
    });
    
    const rawText = transcription.text;
    
    // 2. Extract structured data with GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `You are a financial assistant for a construction company. Extract transaction details from Arabic/English text.
        
Available categories: MATERIALS, LABOR, EQUIPMENT, SERVICES, OTHER

Return JSON with:
{
  "vendor": "vendor name or Unknown",
  "amount": number,
  "category": "one of the available categories",
  "description": "clean description"
}`
      }, {
        role: "user",
        content: rawText
      }],
      response_format: { type: "json_object" }
    });
    
    const extracted = JSON.parse(completion.choices[0].message.content);
    
    // 3. Create DRAFT transaction (NO balance changes yet!)
    const draft = await prisma.transaction.create({
      data: {
        type: 'EXPENSE',
        category: extracted.category,
        amount: extracted.amount,
        description: extracted.description,
        status: 'DRAFT',  // Critical: DRAFT status
        voiceNoteUrl: audioFile,
        aiRawText: rawText,
        aiExtractedData: extracted,
        projectId: projectId,
        createdBy: req.user.id,
        paymentMethod: 'CUSTODY_WALLET'
      }
    });
    
    // 4. Update pending clearance (optimistic)
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        pendingClearance: { increment: extracted.amount }
      }
    });
    
    res.status(201).json({
      success: true,
      draft: draft,
      extracted: extracted,
      message: 'Draft created. Please review and submit.'
    });
    
  } catch (error) {
    console.error('AI draft error:', error);
    res.status(500).json({ error: 'Failed to create AI draft' });
  }
};
```

### API B: The Submission

**Endpoint:** `PUT /api/transactions/:id/submit`

**Request Body:**
```json
{
  "receiptPhotoUrl": "https://...",
  "confirmedAmount": 5000,
  "confirmedDescription": "10 bags cement"
}
```

**Logic:**
```javascript
export const submitTransaction = async (req, res) => {
  const { id } = req.params;
  const { receiptPhotoUrl, confirmedAmount, confirmedDescription } = req.body;
  
  try {
    // 1. Fetch draft
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { project: { include: { engineer: true } } }
    });
    
    // 2. Validation
    if (transaction.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only drafts can be submitted' });
    }
    
    if (transaction.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // 3. Update transaction with confirmed data
    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        status: 'PENDING_APPROVAL',
        receiptPhotoUrl: receiptPhotoUrl,
        amount: confirmedAmount || transaction.amount,
        description: confirmedDescription || transaction.description
      }
    });
    
    // 4. Notify project manager
    await prisma.notification.create({
      data: {
        userId: transaction.project.engineerId, // Assuming project has managerId
        type: 'ACTION_REQUIRED',
        title: 'New Expense Pending Approval',
        message: `${req.user.name} submitted expense: ${confirmedAmount} EGP for ${transaction.project.name}`,
        resourceId: id,
        resourceType: 'transaction'
      }
    });
    
    res.status(200).json({
      success: true,
      transaction: updated,
      message: 'Submitted for approval'
    });
    
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: 'Failed to submit transaction' });
  }
};
```

---

## 4. The Inventory Link (Material Batches)

### Automatic Batch Creation

This happens **inside the approve API** (see section 2, LINK 5).

### Manual Consumption API

**Endpoint:** `POST /api/material-batches/:id/consume`

**Request Body:**
```json
{
  "valueConsumed": 10000,
  "description": "Used for foundation work"
}
```

**Logic:**
```javascript
export const consumeMaterialBatch = async (req, res) => {
  const { id } = req.params;
  const { valueConsumed, description } = req.body;
  
  try {
    // 1. Fetch batch
    const batch = await prisma.materialBatch.findUnique({
      where: { id }
    });
    
    // 2. Validation
    if (batch.remainingValue < valueConsumed) {
      return res.status(400).json({ 
        error: 'Insufficient material value',
        available: batch.remainingValue
      });
    }
    
    // 3. Calculate new values
    const newRemainingValue = batch.remainingValue - valueConsumed;
    const newStatus = newRemainingValue <= 0 ? 'CONSUMED' :
                      newRemainingValue < batch.initialValue ? 'PARTIALLY_USED' :
                      'AVAILABLE';
    
    // 4. Update batch (NO project cost change - already counted at purchase)
    const updated = await prisma.materialBatch.update({
      where: { id },
      data: {
        remainingValue: newRemainingValue,
        status: newStatus
      }
    });
    
    res.status(200).json({
      success: true,
      batch: updated,
      consumed: valueConsumed,
      remaining: newRemainingValue
    });
    
  } catch (error) {
    console.error('Consumption error:', error);
    res.status(500).json({ error: 'Failed to consume material' });
  }
};
```

### Important Note
**Material consumption does NOT double-count project cost.** The cost is added when the material is purchased (approved). The batch system is for **asset tracking only**.

---

## 5. Visual Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT PAYMENT                            │
│  Client → Bank → Income API → Split (80/20) → Project Funds │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CUSTODY FUNDING                           │
│  Admin → Custody API → Engineer Wallet (+10,000 EGP)        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    AI VOICE INPUT                            │
│  Engineer → Voice → Whisper → GPT → Draft Transaction       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    SUBMISSION                                │
│  Engineer → Review → Attach Photo → Submit (PENDING)        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    APPROVAL (6 LINKS)                        │
│  Manager → Approve → Triggers:                              │
│    1. Transaction → APPROVED                                │
│    2. Engineer Wallet → -500 EGP                            │
│    3. Project Ops Fund → -500 EGP                           │
│    4. Project Cost → +500 EGP                               │
│    5. Material Batch → Created (if materials)               │
│    6. Notification → Sent to engineer                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Financial Balance Verification

**The Golden Rule:** Every debit has a credit. The system maintains zero-sum balance.

### Example Transaction Flow:
```
Client Payment: +100,000 EGP
├─ Office Revenue: +20,000 EGP (Profit account)
└─ Operational Fund: +80,000 EGP (Project account)

Custody Funding: 10,000 EGP
├─ Office Cash: -10,000 EGP
└─ Engineer Wallet: +10,000 EGP

Expense Approval: 500 EGP
├─ Engineer Wallet: -500 EGP
├─ Project Ops Fund: -500 EGP
└─ Project Actual Cost: +500 EGP
```

**Balance Check:**
- Total In = Total Out
- Engineer Liability = Custody Balance
- Project Budget = Ops Fund + Actual Cost

---

## Next Steps

1. ✅ Implement these controllers in `server/controllers/`
2. ✅ Create routes in `server/routes/`
3. ✅ Add middleware for RBAC (see RBAC document)
4. ✅ Test each flow with Postman/Thunder Client
5. ✅ Integrate with frontend

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-24  
**Status:** Ready for Implementation
