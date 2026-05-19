# 🧪 API Testing Guide - How Everything Works

## Overview

This guide explains **exactly what happens** when you call each API endpoint, what data changes, and how different parts of the system are affected.

---

## 🔐 Authentication APIs

### 1. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@construction.com",
  "password": "password123"
}
```

**What Happens:**
1. ✅ Server checks if user exists
2. ✅ Compares password hash
3. ✅ Generates JWT token
4. ✅ Returns user data + token

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "Admin User",
    "email": "admin@construction.com",
    "role": "ADMIN",
    "currentCustodyBalance": 0,
    "pendingClearance": 0
  }
}
```

**Frontend Effect:**
- Token saved to localStorage
- User redirected to /dashboard
- AuthContext updated with user data

---

## 💰 Income APIs (Revenue Splitting)

### 2. Record Client Payment
```http
POST /api/transactions/income
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "project-uuid",
  "amount": 100000,
  "clientId": "client-uuid",
  "description": "First payment from client"
}
```

**What Happens (Step by Step):**

1. **Fetch Project Configuration**
   ```javascript
   // Server retrieves project
   const project = await prisma.project.findUnique({
     where: { id: "project-uuid" }
   });
   // Result: { revenueModel: "EXECUTION_COST_PLUS", managementFeePercent: 20 }
   ```

2. **Calculate Split**
   ```javascript
   // If Cost-Plus model:
   officeShare = 100000 × 0.20 = 20,000 EGP
   opsShare = 100000 - 20,000 = 80,000 EGP
   
   // If Design-Only or Lump-Sum:
   officeShare = 0
   opsShare = 100,000 EGP
   ```

3. **Atomic Database Update**
   ```javascript
   // TWO operations happen together (or none):
   
   // Operation 1: Create transaction
   Transaction.create({
     type: "INCOME",
     amount: 100000,
     status: "APPROVED"
   })
   
   // Operation 2: Update project funds
   Project.update({
     officeRevenue: +20,000,    // Increment
     operationalFund: +80,000   // Increment
   })
   ```

**Database Changes:**
```
BEFORE:
Project {
  officeRevenue: 0,
  operationalFund: 0
}

AFTER:
Project {
  officeRevenue: 20,000,
  operationalFund: 80,000
}

+ New Transaction record created
```

**Response:**
```json
{
  "success": true,
  "transaction": { ... },
  "split": {
    "total": 100000,
    "officeRevenue": 20000,
    "operationalFund": 80000,
    "splitRatio": "80/20"
  }
}
```

---

## 🏦 Custody APIs (Al-Ohda Management)

### 3. Fund Engineer (Tamweel)
```http
POST /api/custody/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "engineerId": "engineer-uuid",
  "amount": 10000,
  "description": "Funding for Villa A project"
}
```

**What Happens:**

1. **Get Current Balance**
   ```javascript
   const engineer = await prisma.user.findUnique({
     where: { id: "engineer-uuid" }
   });
   // Result: { currentCustodyBalance: 0 }
   ```

2. **Calculate New Balance**
   ```javascript
   balanceBefore = 0
   balanceAfter = 0 + 10,000 = 10,000
   ```

3. **Atomic Update (3 operations)**
   ```javascript
   // Operation 1: Update engineer balance
   User.update({
     currentCustodyBalance: +10,000
   })
   
   // Operation 2: Create audit record
   CustodyTransfer.create({
     type: "FUNDING",
     amount: 10000,
     balanceBefore: 0,
     balanceAfter: 10000
   })
   
   // Operation 3: Create notification
   Notification.create({
     userId: "engineer-uuid",
     type: "INFO",
     title: "Custody Funded",
     message: "You received 10,000 EGP custody top-up"
   })
   ```

**Database Changes:**
```
BEFORE:
User {
  currentCustodyBalance: 0,
  pendingClearance: 0
}

AFTER:
User {
  currentCustodyBalance: 10,000,
  pendingClearance: 0
}

+ New CustodyTransfer record
+ New Notification record
```

**Frontend Effect:**
- Engineer sees notification bell badge (1 unread)
- Clicking notification shows: "You received 10,000 EGP custody top-up"

---

## 📝 Transaction Workflow APIs

### 4. Create Draft Transaction
```http
POST /api/transactions/draft
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "project-uuid",
  "amount": 500,
  "category": "MATERIALS",
  "description": "Cement purchase"
}
```

**What Happens:**

1. **Create Draft**
   ```javascript
   Transaction.create({
     type: "EXPENSE",
     category: "MATERIALS",
     amount: 500,
     status: "DRAFT",  // ← Important!
     paymentMethod: "CUSTODY_WALLET"
   })
   ```

2. **Update Pending Clearance**
   ```javascript
   User.update({
     pendingClearance: +500  // Optimistic increment
   })
   ```

**Database Changes:**
```
BEFORE:
User {
  currentCustodyBalance: 10,000,
  pendingClearance: 0
}

AFTER:
User {
  currentCustodyBalance: 10,000,  // Unchanged
  pendingClearance: 500           // Increased
}

+ New Transaction (status: DRAFT)
```

**Key Point:** 
- ❌ No money deducted yet
- ✅ Just marked as "pending"
- ✅ Available balance = 10,000 - 500 = 9,500 EGP

---

### 5. Submit Transaction for Approval
```http
PUT /api/transactions/{transaction-id}/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "receiptPhotoUrl": "https://storage.example.com/receipt123.jpg",
  "confirmedAmount": 500,
  "confirmedDescription": "10 bags cement"
}
```

**What Happens:**

1. **Validate Transaction**
   ```javascript
   // Must be DRAFT status
   // Must be owned by current user
   ```

2. **Update Transaction**
   ```javascript
   Transaction.update({
     status: "PENDING_APPROVAL",  // DRAFT → PENDING
     receiptPhotoUrl: "https://...",
     amount: 500  // Confirmed amount
   })
   ```

3. **Notify Manager**
   ```javascript
   Notification.create({
     userId: "manager-uuid",
     type: "ACTION_REQUIRED",
     title: "New Expense Pending Approval",
     message: "Ahmed submitted expense: 500 EGP for Project Villa A"
   })
   ```

**Database Changes:**
```
Transaction {
  status: "DRAFT" → "PENDING_APPROVAL",
  receiptPhotoUrl: "https://..."
}

+ New Notification for Manager
```

**Frontend Effect:**
- Manager sees notification bell badge
- Manager sees new item in approval queue

---

### 6. Approve Transaction (THE BIG ONE! 🔥)
```http
PUT /api/transactions/{transaction-id}/approve
Authorization: Bearer <token>
```

**What Happens (6 Critical Links):**

This is the **most important API** - it triggers 6 interconnected updates:

```javascript
// ALL THESE HAPPEN ATOMICALLY (together or not at all)

// LINK 1: Update Transaction Status
Transaction.update({
  status: "APPROVED",
  approvedBy: "manager-uuid",
  approvedAt: "2026-01-24T18:00:00Z"
})

// LINK 2: Deduct from Engineer Custody
User.update({
  currentCustodyBalance: 10,000 - 500 = 9,500,
  pendingClearance: 500 - 500 = 0
})

// LINK 3: Update Project Funds
Project.update({
  operationalFund: 80,000 - 500 = 79,500,
  actualCost: 0 + 500 = 500
})

// LINK 4: Create Custody Transfer Record
CustodyTransfer.create({
  type: "CLEARANCE",
  amount: 500,
  balanceBefore: 10,000,
  balanceAfter: 9,500
})

// LINK 5: Create Material Batch (if category = MATERIALS)
MaterialBatch.create({
  description: "10 bags cement",
  initialValue: 500,
  remainingValue: 500,
  status: "AVAILABLE"
})

// LINK 6: Notify Engineer
Notification.create({
  userId: "engineer-uuid",
  type: "INFO",
  title: "Expense Approved",
  message: "Your expense of 500 EGP was approved. Custody updated."
})
```

**Database Changes:**
```
BEFORE:
User (Engineer) {
  currentCustodyBalance: 10,000,
  pendingClearance: 500
}

Project {
  operationalFund: 80,000,
  actualCost: 0
}

AFTER:
User (Engineer) {
  currentCustodyBalance: 9,500,   // -500
  pendingClearance: 0             // -500
}

Project {
  operationalFund: 79,500,        // -500
  actualCost: 500                 // +500
}

+ Transaction status: APPROVED
+ CustodyTransfer record
+ MaterialBatch record (if materials)
+ Notification for engineer
```

**Financial Balance Check:**
```
Money Flow:
- Engineer wallet: -500 EGP ✅
- Project ops fund: -500 EGP ✅
- Project cost: +500 EGP ✅
Total: 0 (balanced) ✅
```

---

### 7. Reject Transaction
```http
PUT /api/transactions/{transaction-id}/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Receipt is not clear, please resubmit"
}
```

**What Happens:**

```javascript
// Operation 1: Update transaction
Transaction.update({
  status: "REJECTED",
  rejectionReason: "Receipt is not clear...",
  approvedBy: "manager-uuid"
})

// Operation 2: Remove from pending clearance
User.update({
  pendingClearance: 500 - 500 = 0
})

// Operation 3: Notify engineer
Notification.create({
  userId: "engineer-uuid",
  type: "ALERT",
  title: "Expense Rejected",
  message: "Your expense of 500 EGP was rejected. Reason: Receipt is not clear..."
})
```

**Database Changes:**
```
BEFORE:
User {
  currentCustodyBalance: 10,000,
  pendingClearance: 500
}

AFTER:
User {
  currentCustodyBalance: 10,000,  // Unchanged (money not deducted)
  pendingClearance: 0             // Cleared
}

Transaction {
  status: "REJECTED",
  rejectionReason: "..."
}

+ Notification for engineer
```

---

## 🔔 Notification APIs

### 8. Get Notifications
```http
GET /api/notifications
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif-1",
      "type": "ACTION_REQUIRED",
      "title": "New Expense Pending Approval",
      "message": "Ahmed submitted expense: 500 EGP",
      "isRead": false,
      "createdAt": "2026-01-24T18:00:00Z"
    },
    {
      "id": "notif-2",
      "type": "INFO",
      "title": "Custody Funded",
      "message": "You received 10,000 EGP",
      "isRead": true,
      "createdAt": "2026-01-24T17:00:00Z"
    }
  ],
  "unreadCount": 1
}
```

**Frontend Effect:**
- Notification bell shows badge: "1"
- Dropdown shows list of notifications
- Unread notifications highlighted

---

### 9. Mark as Read
```http
PUT /api/notifications/{notification-id}/read
Authorization: Bearer <token>
```

**What Happens:**
```javascript
Notification.update({
  isRead: true
})
```

**Frontend Effect:**
- Badge count decreases
- Notification no longer highlighted

---

## 📊 Query APIs

### 10. Get Pending Approvals (Manager View)
```http
GET /api/transactions/pending
Authorization: Bearer <token>
```

**What Happens:**
```javascript
// Fetch all transactions with status PENDING_APPROVAL
const pending = await prisma.transaction.findMany({
  where: { status: "PENDING_APPROVAL" },
  include: {
    user: true,    // Who submitted it
    project: true  // Which project
  }
})
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "trans-1",
      "amount": 500,
      "description": "Cement purchase",
      "receiptPhotoUrl": "https://...",
      "user": { "name": "Ahmed" },
      "project": { "name": "Villa A" },
      "createdAt": "2026-01-24T18:00:00Z"
    }
  ]
}
```

---

### 11. Get Custody Balance
```http
GET /api/custody/balance/{engineer-id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "engineer-uuid",
    "name": "Ahmed",
    "currentCustodyBalance": 9500,
    "pendingClearance": 0,
    "availableBalance": 9500
  }
}
```

**Calculation:**
```javascript
availableBalance = currentCustodyBalance - pendingClearance
                 = 9,500 - 0
                 = 9,500 EGP
```

---

### 12. Get All Custody Balances (Admin View)
```http
GET /api/custody/all
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "eng-1",
      "name": "Ahmed",
      "currentCustodyBalance": 9500,
      "pendingClearance": 0,
      "availableBalance": 9500
    },
    {
      "id": "eng-2",
      "name": "Mohamed",
      "currentCustodyBalance": 5000,
      "pendingClearance": 1000,
      "availableBalance": 4000
    }
  ],
  "summary": {
    "totalCustody": 14500,
    "totalPending": 1000,
    "totalAvailable": 13500
  }
}
```

---

## 🔐 RBAC (Role-Based Access Control)

### Who Can Do What?

| API Endpoint | Admin | Manager | Engineer | Accountant |
|-------------|-------|---------|----------|------------|
| `POST /custody/transfer` | ✅ | ❌ | ❌ | ❌ |
| `POST /transactions/draft` | ✅ | ✅ | ✅ | ❌ |
| `PUT /transactions/:id/submit` | ✅ | ✅ | ✅ (own) | ❌ |
| `PUT /transactions/:id/approve` | ✅ | ✅ | ❌ | ❌ |
| `POST /transactions/income` | ✅ | ❌ | ❌ | ✅ |
| `GET /custody/all` | ✅ | ❌ | ❌ | ✅ |

**Example: Engineer tries to approve:**
```http
PUT /api/transactions/123/approve
Authorization: Bearer <engineer-token>
```

**Response:**
```json
{
  "success": false,
  "message": "Access Denied. You do not have permission to perform this action.",
  "requiredRoles": ["PROJECT_MANAGER", "ADMIN"],
  "yourRole": "ENGINEER"
}
```

---

## 🧪 Complete Test Scenario

### Scenario: Full Expense Workflow

```bash
# Step 1: Admin funds engineer
POST /api/custody/transfer
{ "engineerId": "eng-1", "amount": 10000 }
# Result: Engineer balance = 10,000 EGP

# Step 2: Engineer creates draft
POST /api/transactions/draft
{ "amount": 500, "category": "MATERIALS" }
# Result: Pending clearance = 500 EGP

# Step 3: Engineer submits for approval
PUT /api/transactions/123/submit
{ "receiptPhotoUrl": "https://..." }
# Result: Manager gets notification

# Step 4: Manager approves
PUT /api/transactions/123/approve
# Result:
# - Engineer balance: 9,500 EGP
# - Project ops fund: -500 EGP
# - Project cost: +500 EGP
# - Material batch created
# - Engineer gets notification

# Step 5: Check balances
GET /api/custody/balance/eng-1
# Response: { availableBalance: 9500 }
```

---

## 🎯 Key Takeaways

1. **Atomic Transactions**: Multiple database operations happen together or not at all
2. **Financial Balance**: Every debit has a credit (zero-sum)
3. **Audit Trail**: CustodyTransfer records track every movement
4. **Notifications**: Users are informed of every action
5. **RBAC**: Roles prevent unauthorized actions
6. **State Machine**: Transactions flow: DRAFT → PENDING → APPROVED/REJECTED

---

**Ready to test?** Start the server and use these examples with Postman or Thunder Client!

```bash
cd server
npm run dev
```

Then test each endpoint in order to see the complete workflow in action! 🚀
