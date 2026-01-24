# 🏗️ Engineers Management System - V1 Schema Updates

## Overview
The system has been upgraded to an **AI-First Cash-to-Cost** lifecycle management system for Architecture & Construction firms, focusing on:
- **Al-Ohda (Custody)** management
- **AI-driven Voice Bookkeeping** for site engineers
- **Automated Income Splitting** between Project Operations and Office Revenue

---

## 🎯 V1 Primary Goal
Provide a "Smart Bookkeeping & Cost Control" solution focusing on financial transparency in **Cost-Plus** and **Lump-Sum** projects.

---

## 📊 Major Schema Changes

### 1. User Model (Enhanced for Custody Tracking)

**New Fields:**
```prisma
currentCustodyBalance Decimal @default(0) @db.Decimal(15, 2) // Money in engineer's hand
pendingClearance      Decimal @default(0) @db.Decimal(15, 2) // Receipts not yet approved
```

**New Role:**
```prisma
enum UserRole {
  ADMIN
  PROJECT_MANAGER  // NEW: Approver role for transaction workflow
  ENGINEER         // Site Engineer - Wallet Holder
  ACCOUNTANT
}
```

**Purpose:**
- Track real-time liability: "Engineer Ahmed owes the company 15,000 EGP"
- Support Tamweel (funding) and Tasweya (clearance) operations

---

### 2. Project Model (Revenue Models & Income Splitting)

**New Enums:**
```prisma
enum RevenueModel {
  DESIGN_ONLY_AREA      // Area × Rate (Design fees)
  EXECUTION_COST_PLUS   // Expenses + Management Fee %
  EXECUTION_LUMP_SUM    // Fixed Contract Price
}
```

**New Fields:**
```prisma
revenueModel         RevenueModel @default(EXECUTION_COST_PLUS)
managementFeePercent Decimal?     @db.Decimal(5, 2) // e.g., 20.00%

// Fund Splitting (The "Income Splitter" Engine)
totalContractValue   Decimal?     @db.Decimal(15, 2)
operationalFund      Decimal      @default(0) @db.Decimal(15, 2) // 80% for site work
officeRevenue        Decimal      @default(0) @db.Decimal(15, 2) // 20% company profit
```

**Income Splitter Logic:**
When a client payment of 100,000 EGP is recorded for a Cost-Plus project with 20% fee:
- **80,000 EGP** → `operationalFund` (Budget for materials/labor)
- **20,000 EGP** → `officeRevenue` (Company profit)

**Benefit:** Prevents accidentally spending profit on project expenses.

---

### 3. Transaction Model (3-Step AI Workflow)

**New Status Workflow:**
```prisma
enum TransactionStatus {
  DRAFT             // AI created, engineer verifies
  PENDING_APPROVAL  // Engineer submitted, manager reviews
  APPROVED          // Manager approved, deducted from wallet
  REJECTED          // Manager rejected, returned to engineer
  CANCELLED
}
```

**New Categories:**
```prisma
CUSTODY_TRANSFER  // For Tamweel (funding engineer wallet)
```

**New Payment Methods:**
```prisma
CUSTODY_WALLET    // Paid from engineer's custody
```

**New Fields:**
```prisma
// Workflow State
status          TransactionStatus @default(DRAFT)
rejectionReason String?

// Custody Tracking
custodyWalletId String?  // Which engineer's wallet paid this?

// AI Voice Input
voiceNoteUrl    String?  // Recorded voice note
aiRawText       String?  // Whisper API transcription
aiExtractedData Json?    // LLM structured output

// Receipt Photo
receiptPhotoUrl String?

// Approver Tracking
approvedBy      String?
approver        User?    @relation("ApprovedBy")
approvedAt      DateTime?
```

**The AI Workflow:**
1. **Engineer records voice:** "Gebna 50 shkarat cement b 5000 geneh"
2. **AI processes:** Whisper → GPT-4o-mini → Structured JSON
3. **Engineer verifies:** Reviews AI extraction, attaches receipt photo
4. **Manager approves:** Checks receipt against amount
5. **System updates:** Deducts from custody, adds to project cost

---

### 4. MaterialBatch Model (Landing Zone Inventory)

**New Model:**
```prisma
enum BatchStatus {
  AVAILABLE
  PARTIALLY_USED
  CONSUMED
}

model MaterialBatch {
  id                String      @id @default(uuid())
  description       String      // "10 Tons Steel Rebar"
  
  // Value Tracking (not quantity - we track VALUE)
  initialValue      Decimal     @db.Decimal(15, 2)
  remainingValue    Decimal     @db.Decimal(15, 2)
  
  status            BatchStatus @default(AVAILABLE)
  projectId         String      // Materials belong to project site
  originalReceiptId String?     // Link to purchase transaction
}
```

**Purpose:**
- Track materials by **value**, not individual units
- Engineer purchases bricks → Value enters MaterialBatch
- Engineer reports "Built Wall" → Value moves to Project Actual Cost

---

### 5. CustodyTransfer Model (Al-Ohda Tracking)

**New Model:**
```prisma
enum CustodyTransferType {
  FUNDING    // Tamweel: Office → Engineer Wallet
  CLEARANCE  // Tasweya: Expense approved, deduct from wallet
  RETURN     // Engineer returns unused cash
}

model CustodyTransfer {
  id          String              @id @default(uuid())
  type        CustodyTransferType
  amount      Decimal             @db.Decimal(15, 2)
  
  engineerId  String
  
  // Balance snapshots
  balanceBefore Decimal
  balanceAfter  Decimal
  
  relatedTransactionId String?  // Link to transaction for clearance
}
```

**Purpose:**
- Track all custody movements
- Maintain audit trail of Tamweel and Tasweya operations
- Show real-time engineer liability

---

## 👥 Updated User Roles & Responsibilities

| Role | Responsibilities |
|------|------------------|
| **Site Engineer** | Wallet Holder. Records voice notes. Manages site inventory batches. |
| **Project Manager** | Approver. Reviews pending queue. Checks receipt photos vs amounts. |
| **Accountant** | Controller. Records client payments (triggers income split). Audits office expenses. |
| **Admin/Owner** | Viewer. Monitors burn rate (project fund depletion) vs profit (office revenue). |

---

## 🔐 Updated Test Accounts

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Admin** | admin@construction.com | password123 | Full system access |
| **Project Manager** | manager@construction.com | password123 | Approval queue, project oversight |
| **Engineer** | engineer@construction.com | password123 | Voice input, custody wallet, site inventory |
| **Accountant** | accountant@construction.com | password123 | Financial transactions, income splitting |

---

## 🧪 V1 Pilot Testing Scenario

### The "Golden Path" Test:

1. **Setup Project**
   - Create "Villa A"
   - Revenue Model: `EXECUTION_COST_PLUS`
   - Management Fee: 20%

2. **Record Client Payment**
   - Amount: 100,000 EGP
   - System auto-splits:
     - operationalFund: 80,000 EGP
     - officeRevenue: 20,000 EGP

3. **Fund Engineer (Tamweel)**
   - Transfer 10,000 EGP to Engineer Ahmed
   - Ahmed's custody balance: 10,000 EGP

4. **AI Voice Expense**
   - Ahmed records: "Bought 1k paint"
   - AI creates DRAFT transaction
   - Ahmed verifies, attaches receipt photo
   - Status: PENDING_APPROVAL
   - Balance shows: 10k (1k Pending)

5. **Manager Approval**
   - Manager reviews receipt
   - Approves transaction
   - **Results:**
     - Ahmed custody balance: 9,000 EGP
     - Project operationalFund: 79,000 EGP
     - Project actualCost: +1,000 EGP

---

## 🚀 Next Development Steps

### 1. Backend Logic Implementation

**Transaction Controller:**
- Implement state machine: DRAFT → PENDING_APPROVAL → APPROVED/REJECTED
- Handle custody balance updates on approval
- Trigger MaterialBatch creation for inventory purchases

**Income Splitter Utility:**
```javascript
function splitIncome(amount, managementFeePercent) {
  const officeRevenue = amount * (managementFeePercent / 100);
  const operationalFund = amount - officeRevenue;
  return { officeRevenue, operationalFund };
}
```

**Custody Manager:**
- Track Tamweel (funding) operations
- Process Tasweya (clearance) on approval
- Maintain real-time balance calculations

### 2. AI Integration

**OpenAI Whisper API:**
- Voice note → Text transcription
- Store in `aiRawText` field

**GPT-4o-mini for Extraction:**
- Input: Raw text + Master Data (categories)
- Output: Structured JSON
```json
{
  "vendor": "Unknown",
  "amount": 5000,
  "category": "MATERIALS",
  "subcategory": "Concrete",
  "type": "EXPENSE"
}
```

### 3. Frontend Updates

**Engineer Mobile Interface:**
- Large microphone button for voice input
- Draft transaction review screen
- Receipt photo upload
- Custody balance display

**Manager Approval Queue:**
- List of PENDING_APPROVAL transactions
- Receipt photo viewer
- Approve/Reject buttons with reason field

**Dashboard Enhancements:**
- Custody liability widget
- Income split visualization
- Burn rate vs profit charts

---

## 📝 Database Migration Notes

**Applied Changes:**
- ✅ Added custody tracking fields to User
- ✅ Added revenue model and income splitting to Project
- ✅ Updated Transaction with AI workflow fields
- ✅ Created MaterialBatch model
- ✅ Created CustodyTransfer model
- ✅ Added PROJECT_MANAGER role
- ✅ Updated seed data with new test accounts

**Data Loss Warnings Accepted:**
- Old TransactionStatus values (PENDING, COMPLETED) replaced with new workflow states

---

## 🎯 V1 Success Metrics

1. **Custody Accuracy:** Engineer balances match physical cash ±1%
2. **AI Accuracy:** Voice-to-transaction extraction >85% correct
3. **Approval Speed:** Manager reviews <24 hours
4. **Income Split:** 100% of client payments auto-split correctly
5. **Inventory Tracking:** MaterialBatch consumption tracked for all purchases

---

## 📚 Related Documentation

- `QUICKSTART.md` - Setup instructions
- `TEST_ACCOUNTS.md` - Login credentials
- `PROJECT_STRUCTURE.md` - Codebase organization
- `prisma/schema.prisma` - Complete database schema

---

**Last Updated:** 2026-01-24  
**Schema Version:** V1 - AI-First Cash-to-Cost System  
**Database:** PostgreSQL on Render
