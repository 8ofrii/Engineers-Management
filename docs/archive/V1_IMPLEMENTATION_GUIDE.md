# 🎯 V1 Feature Implementation Guide

## Quick Reference for Developers

---

## 1. Custody Management (Al-Ohda)

### Key Concepts
- **Tamweel (تمويل):** Funding - Office transfers money to engineer's wallet
- **Tasweya (تسوية):** Clearance - Expense approved, deducted from wallet
- **Liability:** Real-time tracking of how much engineer owes the company

### Database Fields
```javascript
User {
  currentCustodyBalance: Decimal  // Current cash in hand
  pendingClearance: Decimal       // Receipts awaiting approval
}
```

### Implementation Example
```javascript
// Tamweel: Fund Engineer Wallet
async function fundEngineerWallet(engineerId, amount) {
  const engineer = await prisma.user.findUnique({ where: { id: engineerId } });
  
  const transfer = await prisma.custodyTransfer.create({
    data: {
      type: 'FUNDING',
      amount: amount,
      engineerId: engineerId,
      balanceBefore: engineer.currentCustodyBalance,
      balanceAfter: engineer.currentCustodyBalance + amount,
      description: `Funded engineer wallet with ${amount} EGP`
    }
  });
  
  await prisma.user.update({
    where: { id: engineerId },
    data: { currentCustodyBalance: { increment: amount } }
  });
  
  return transfer;
}

// Tasweya: Clear Expense (on approval)
async function clearExpense(transactionId, approverId) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { user: true, project: true }
  });
  
  // Update transaction status
  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: 'APPROVED',
      approvedBy: approverId,
      approvedAt: new Date()
    }
  });
  
  // Deduct from engineer's custody
  await prisma.user.update({
    where: { id: transaction.createdBy },
    data: {
      currentCustodyBalance: { decrement: transaction.amount },
      pendingClearance: { decrement: transaction.amount }
    }
  });
  
  // Deduct from project operational fund
  await prisma.project.update({
    where: { id: transaction.projectId },
    data: {
      operationalFund: { decrement: transaction.amount },
      actualCost: { increment: transaction.amount }
    }
  });
  
  // Record custody transfer
  await prisma.custodyTransfer.create({
    data: {
      type: 'CLEARANCE',
      amount: transaction.amount,
      engineerId: transaction.createdBy,
      balanceBefore: transaction.user.currentCustodyBalance,
      balanceAfter: transaction.user.currentCustodyBalance - transaction.amount,
      relatedTransactionId: transactionId,
      description: `Cleared expense: ${transaction.description}`
    }
  });
}
```

---

## 2. Income Splitting Engine

### The Logic
When a client payment is recorded for a Cost-Plus project:
1. Calculate management fee (e.g., 20%)
2. Split: 80% → Operational Fund, 20% → Office Revenue
3. Update project balances

### Implementation Example
```javascript
async function recordClientPayment(projectId, amount) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  
  if (project.revenueModel === 'EXECUTION_COST_PLUS') {
    // Calculate split
    const feePercent = project.managementFeePercent || 20;
    const officeRevenue = amount * (feePercent / 100);
    const operationalFund = amount - officeRevenue;
    
    // Update project
    await prisma.project.update({
      where: { id: projectId },
      data: {
        operationalFund: { increment: operationalFund },
        officeRevenue: { increment: officeRevenue }
      }
    });
    
    // Create transaction record
    await prisma.transaction.create({
      data: {
        type: 'INCOME',
        category: 'PAYMENT',
        amount: amount,
        description: `Client payment - Split: ${operationalFund} ops, ${officeRevenue} profit`,
        projectId: projectId,
        status: 'APPROVED',
        transactionDate: new Date()
      }
    });
    
    return { operationalFund, officeRevenue };
  }
}
```

---

## 3. AI Voice-to-Transaction Workflow

### The Pipeline
```
Voice Note → Whisper API → GPT-4o-mini → Structured JSON → Draft Transaction
```

### Implementation Example
```javascript
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Step 1: Transcribe voice note
async function transcribeVoiceNote(audioFileUrl) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioFileUrl),
    model: "whisper-1",
    language: "ar" // or "en"
  });
  
  return transcription.text;
}

// Step 2: Extract structured data with LLM
async function extractTransactionData(rawText, masterCategories) {
  const prompt = `
You are a financial assistant for a construction company. Extract transaction details from this text:

Text: "${rawText}"

Available categories: ${JSON.stringify(masterCategories)}

Return JSON with:
{
  "vendor": "vendor name or Unknown",
  "amount": number,
  "category": "one of the available categories",
  "type": "INCOME or EXPENSE",
  "description": "clean description in Arabic/English"
}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(completion.choices[0].message.content);
}

// Step 3: Create draft transaction
async function createDraftFromVoice(voiceNoteUrl, engineerId, projectId) {
  // Transcribe
  const rawText = await transcribeVoiceNote(voiceNoteUrl);
  
  // Extract data
  const extracted = await extractTransactionData(rawText, MASTER_CATEGORIES);
  
  // Create draft transaction
  const transaction = await prisma.transaction.create({
    data: {
      type: extracted.type,
      category: extracted.category,
      amount: extracted.amount,
      description: extracted.description,
      status: 'DRAFT',
      voiceNoteUrl: voiceNoteUrl,
      aiRawText: rawText,
      aiExtractedData: extracted,
      createdBy: engineerId,
      projectId: projectId,
      paymentMethod: 'CUSTODY_WALLET'
    }
  });
  
  // Update pending clearance
  await prisma.user.update({
    where: { id: engineerId },
    data: { pendingClearance: { increment: extracted.amount } }
  });
  
  return transaction;
}
```

---

## 4. MaterialBatch Landing Zone

### Concept
Track materials by **value**, not individual units. When materials are purchased, they enter a "batch" with initial value. As they're consumed, the remaining value decreases.

### Implementation Example
```javascript
// Purchase materials - Add to site stock
async function purchaseMaterialBatch(transactionId, projectId, engineerId) {
  const transaction = await prisma.transaction.findUnique({ 
    where: { id: transactionId } 
  });
  
  const batch = await prisma.materialBatch.create({
    data: {
      description: transaction.description,
      initialValue: transaction.amount,
      remainingValue: transaction.amount,
      status: 'AVAILABLE',
      projectId: projectId,
      originalReceiptId: transactionId,
      recordedBy: engineerId
    }
  });
  
  return batch;
}

// Consume materials - Move value to project cost
async function consumeMaterialBatch(batchId, consumedValue, description) {
  const batch = await prisma.materialBatch.findUnique({ where: { id: batchId } });
  
  const newRemainingValue = batch.remainingValue - consumedValue;
  const newStatus = newRemainingValue <= 0 ? 'CONSUMED' : 
                    newRemainingValue < batch.initialValue ? 'PARTIALLY_USED' : 
                    'AVAILABLE';
  
  // Update batch
  await prisma.materialBatch.update({
    where: { id: batchId },
    data: {
      remainingValue: newRemainingValue,
      status: newStatus
    }
  });
  
  // Add to project actual cost
  await prisma.project.update({
    where: { id: batch.projectId },
    data: { actualCost: { increment: consumedValue } }
  });
  
  return { consumed: consumedValue, remaining: newRemainingValue };
}
```

---

## 5. Transaction State Machine

### States Flow
```
DRAFT → PENDING_APPROVAL → APPROVED
                         ↘ REJECTED
```

### Implementation Example
```javascript
// Engineer submits for approval
async function submitForApproval(transactionId, receiptPhotoUrl) {
  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: 'PENDING_APPROVAL',
      receiptPhotoUrl: receiptPhotoUrl
    }
  });
}

// Manager approves
async function approveTransaction(transactionId, managerId) {
  await clearExpense(transactionId, managerId); // See custody example above
}

// Manager rejects
async function rejectTransaction(transactionId, managerId, reason) {
  const transaction = await prisma.transaction.findUnique({ 
    where: { id: transactionId } 
  });
  
  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: 'REJECTED',
      rejectionReason: reason,
      approvedBy: managerId,
      approvedAt: new Date()
    }
  });
  
  // Remove from pending clearance
  await prisma.user.update({
    where: { id: transaction.createdBy },
    data: { pendingClearance: { decrement: transaction.amount } }
  });
}
```

---

## 6. Dashboard Queries

### Engineer Dashboard
```javascript
async function getEngineerDashboard(engineerId) {
  const engineer = await prisma.user.findUnique({
    where: { id: engineerId },
    select: {
      currentCustodyBalance: true,
      pendingClearance: true
    }
  });
  
  const pendingTransactions = await prisma.transaction.findMany({
    where: {
      createdBy: engineerId,
      status: { in: ['DRAFT', 'PENDING_APPROVAL'] }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return {
    custodyBalance: engineer.currentCustodyBalance,
    pendingClearance: engineer.pendingClearance,
    availableCash: engineer.currentCustodyBalance - engineer.pendingClearance,
    pendingTransactions
  };
}
```

### Manager Approval Queue
```javascript
async function getApprovalQueue(managerId) {
  const pendingApprovals = await prisma.transaction.findMany({
    where: { status: 'PENDING_APPROVAL' },
    include: {
      user: { select: { name: true, email: true } },
      project: { select: { name: true } }
    },
    orderBy: { createdAt: 'asc' }
  });
  
  return pendingApprovals;
}
```

### Project Financial Overview
```javascript
async function getProjectFinancials(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      transactions: {
        where: { status: 'APPROVED' },
        select: { amount: true, type: true }
      },
      materialBatches: {
        select: { remainingValue: true, status: true }
      }
    }
  });
  
  const inventoryValue = project.materialBatches
    .filter(b => b.status !== 'CONSUMED')
    .reduce((sum, b) => sum + b.remainingValue, 0);
  
  return {
    totalContractValue: project.totalContractValue,
    operationalFund: project.operationalFund,
    officeRevenue: project.officeRevenue,
    actualCost: project.actualCost,
    budget: project.budget,
    inventoryValue: inventoryValue,
    burnRate: (project.actualCost / project.operationalFund) * 100
  };
}
```

---

## 7. API Endpoints to Implement

### Custody Management
- `POST /api/custody/fund` - Fund engineer wallet (Tamweel)
- `POST /api/custody/return` - Engineer returns cash
- `GET /api/custody/history/:engineerId` - Custody transfer history

### Transactions (AI Workflow)
- `POST /api/transactions/voice` - Upload voice note, create draft
- `PUT /api/transactions/:id/submit` - Submit for approval
- `PUT /api/transactions/:id/approve` - Manager approves
- `PUT /api/transactions/:id/reject` - Manager rejects
- `GET /api/transactions/pending` - Get approval queue

### Material Batches
- `POST /api/materials/batches` - Create material batch
- `PUT /api/materials/batches/:id/consume` - Consume from batch
- `GET /api/materials/batches/project/:projectId` - Get project inventory

### Income Splitting
- `POST /api/projects/:id/payment` - Record client payment (auto-split)
- `GET /api/projects/:id/financials` - Get split breakdown

---

## 8. Environment Variables Needed

```env
# Existing
DATABASE_URL="postgresql://..."
JWT_SECRET="..."

# New for AI
OPENAI_API_KEY="sk-..."

# File Storage (for voice notes and receipts)
AWS_S3_BUCKET="..."
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
# OR use local storage for V1
UPLOAD_DIR="./uploads"
```

---

## 9. Master Data Categories

```javascript
const MASTER_CATEGORIES = {
  MATERIALS: [
    'Concrete',
    'Steel',
    'Bricks',
    'Cement',
    'Sand',
    'Paint',
    'Tiles'
  ],
  LABOR: [
    'Carpenter',
    'Mason',
    'Electrician',
    'Plumber',
    'Painter'
  ],
  EQUIPMENT: [
    'Crane',
    'Mixer',
    'Scaffolding',
    'Tools'
  ],
  SERVICES: [
    'Consulting',
    'Testing',
    'Inspection'
  ]
};
```

---

## 10. Testing Checklist

- [ ] Create Cost-Plus project with 20% fee
- [ ] Record client payment, verify 80/20 split
- [ ] Fund engineer wallet (Tamweel)
- [ ] Create voice note transaction (DRAFT)
- [ ] Engineer submits with receipt photo
- [ ] Manager approves from queue
- [ ] Verify custody balance updated
- [ ] Verify project cost updated
- [ ] Create material batch from purchase
- [ ] Consume material batch
- [ ] Verify inventory value tracking
- [ ] Test rejection workflow
- [ ] Verify pending clearance calculations

---

**Ready to implement!** 🚀
