# Complete Implementation Plan - Client Requirements
## Final Confirmed Specifications

---

## 📋 **COMPLETE REQUIREMENTS SUMMARY**

### **Requirement 1: Work Orders with Partial Payments**
- Create work order (ProjectCostItem) with total estimated cost
- Make multiple partial payments linked to work order
- Auto-close when totalPaid >= estimatedTotal
- Don't show completed work orders in dropdown
- Show remaining amount and warn if overpaying

### **Requirement 2: Arabic Category Names**
- Already in database ✅
- Update UI translations to show Arabic names

### **Requirement 3: Transaction Payer (Paid By)**
- Dropdown to select which employee paid
- Available for PROJECT_MANAGER and above
- Default to current user for ENGINEER

### **Requirement 4: Transaction DateTime**
- DateTime picker in transaction form
- Default to current time
- User can modify

### **Requirement 5: Project Grouping**
- Finance page: Already done ✅
- Work orders: Group by project with payment history
- Workforce: Group by project

### **Requirement 6: Office Revenue Calculation - NEW LOGIC**
**Income:**
- 100% goes to project safe (NO split)

**Expense (Non-Inventory):**
- Deduct expense amount from project safe
- Calculate office fee based on category/project settings
- Transfer office fee to office revenue
- Total deduction = expense + office fee

**Expense (Inventory):**
- Deduct expense from project safe
- NO office fee yet
- Office fee calculated when inventory is used (based on quantity)

### **Requirement 7: Flexible Office Fee System**
**Three-tier configuration:**
1. **Global Category Defaults**: Default fee % per category
2. **Project General Fee**: Overall project management fee %
3. **Project Category Overrides**: Specific fee % per category per project

**Priority Order:**
1. Project-specific category fee (if set)
2. Global category default (if set)
3. Project general management fee
4. System default (20%)

### **Requirement 8: Inventory Dropdown**
- Show when material category selected
- Option to create new or link existing
- Filter by project

### **Requirement 9: Inventory Management Page**
- List all inventory items (MaterialBatch)
- Group by project
- Show: Description, Initial Value, Remaining Value, Status, Purchase Date
- Material usage tracking with office fee calculation

### **Requirement 10: Negative Project Safe Alert**
- Highlight project in RED when safe < 0
- Send notification to:
  - Project Manager (engineerId)
  - All ADMIN users
  - All PROJECT_MANAGER users
- Alert on ANY negative amount

### **Requirement 11: Work Order Selection with Smart Filters**
**When creating transaction:**
1. Select category first (e.g., CERAMIC_LABOR)
2. Choose: "Create New Work Order" OR "Select Existing"
3. If "Select Existing":
   - Filter by selected category
   - Show only OPEN (not completed) work orders
   - Display: Name, Estimated Total, Total Paid, Remaining
4. Show remaining amount when work order selected
5. Warn if payment exceeds remaining

### **Requirement 12: Material Usage - Flexible Entry**
- Two input fields: "Total Value" OR "Quantity"
- System uses whichever is filled
- Calculate office fee based on usage

---

## 🗂️ **IMPLEMENTATION PHASES**

### **PHASE 1: Database Schema Updates** ⏱️ 1 hour

#### **1.1 Add Office Fee Configuration Tables**
```prisma
// Global category fee defaults
model GlobalCategoryFee {
  id                String              @id @default(uuid())
  category          TransactionCategory @unique
  defaultFeePercent Decimal             @db.Decimal(5, 2)
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  @@map("global_category_fees")
}

// Project-specific category fee overrides
model ProjectCategoryFee {
  id         String              @id @default(uuid())
  projectId  String
  category   TransactionCategory
  feePercent Decimal             @db.Decimal(5, 2)
  project    Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt  DateTime            @default(now())
  updatedAt  DateTime            @updatedAt
  
  @@unique([projectId, category])
  @@map("project_category_fees")
}
```

#### **1.2 Update Project Model**
```prisma
model Project {
  // ... existing fields
  categoryFees ProjectCategoryFee[]
}
```

#### **1.3 Update MaterialBatch for Usage Tracking**
```prisma
model MaterialBatch {
  // ... existing fields
  quantityUsed      Decimal?  @db.Decimal(15, 2)
  officeFeeApplied  Decimal   @default(0) @db.Decimal(15, 2)
}
```

#### **1.4 Create Migration**
```bash
npx prisma migrate dev --name add_flexible_office_fees
```

---

### **PHASE 2: Backend - Core Business Logic** ⏱️ 6-8 hours

#### **2.1 Office Fee Calculation Service**
**File:** `server/services/officeFeeService.js`

```javascript
import prisma from '../lib/prisma.js';

/**
 * Get office fee percentage for a transaction
 * Priority: Project Category Override > Global Category Default > Project General Fee > System Default
 */
export const getOfficeFeePercent = async (projectId, category) => {
  // 1. Check project-specific category fee
  const projectCategoryFee = await prisma.projectCategoryFee.findFirst({
    where: { projectId, category }
  });
  if (projectCategoryFee) {
    return Number(projectCategoryFee.feePercent);
  }
  
  // 2. Check global category default
  const globalCategoryFee = await prisma.globalCategoryFee.findFirst({
    where: { category }
  });
  if (globalCategoryFee) {
    return Number(globalCategoryFee.defaultFeePercent);
  }
  
  // 3. Use project's general management fee
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });
  if (project?.managementFeePercent) {
    return Number(project.managementFeePercent);
  }
  
  // 4. System default
  return 20;
};

/**
 * Check if category is inventory/material type
 */
export const isInventoryCategory = (category) => {
  const inventoryCategories = [
    'CEMENT', 'SAND', 'BRICKS', 'CONCRETE',
    'PLASTERING_MATERIALS', 'PLUMBING_MATERIALS',
    'ELECTRICAL_MATERIALS', 'CERAMIC_MATERIALS',
    'PAINTING_MATERIALS', 'GYPSUM_MATERIALS',
    'CARPENTRY_MATERIALS'
  ];
  return inventoryCategories.includes(category);
};

/**
 * Calculate office fee for an expense
 */
export const calculateOfficeFee = async (projectId, category, amount) => {
  const feePercent = await getOfficeFeePercent(projectId, category);
  return Number(amount) * (feePercent / 100);
};
```

#### **2.2 Update Income Recording**
**File:** `server/controllers/transactionController.js`
**Function:** `recordIncome`

```javascript
// REMOVE SPLIT LOGIC - Income goes 100% to project safe
const result = await prisma.$transaction([
  // Create income transaction
  prisma.transaction.create({
    data: {
      type: 'INCOME',
      category: category || 'PAYMENT',
      amount: amount,
      description: finalDescription,
      status: 'APPROVED',
      projectId: projectId,
      clientId: clientId,
      createdBy: req.user.id,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      paymentMethod: paymentMethod || 'BANK_TRANSFER',
      invoiceNumber: invoiceNumber,
      payerUserId: payerUserId,
      tenantId: req.user.tenantId
    }
  }),

  // Update project safe balance (100% - NO SPLIT)
  prisma.project.update({
    where: { id: projectId },
    data: {
      projectSafeBalance: { increment: amount },
      operationalFund: { increment: amount }
    }
  })
]);
```

#### **2.3 Update Expense Approval with Office Fee**
**File:** `server/controllers/transactionController.js`
**Function:** `approveTransaction`

```javascript
import * as officeFeeService from '../services/officeFeeService.js';

export const approveTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { user: true, project: true }
    });
    
    if (!transaction || transaction.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ success: false, message: 'Invalid transaction' });
    }
    
    const updates = await prisma.$transaction(async (tx) => {
      // Update transaction status
      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedBy: req.user.id,
          approvedAt: new Date()
        }
      });
      
      // Handle EXPENSE
      if (transaction.type === 'EXPENSE') {
        const isInventory = officeFeeService.isInventoryCategory(transaction.category);
        
        if (isInventory) {
          // Inventory: Deduct from safe, NO office fee yet
          await tx.project.update({
            where: { id: transaction.projectId },
            data: {
              projectSafeBalance: { decrement: transaction.amount },
              operationalFund: { decrement: transaction.amount },
              actualCost: { increment: transaction.amount }
            }
          });
        } else {
          // Regular expense: Deduct expense + office fee
          const officeFee = await officeFeeService.calculateOfficeFee(
            transaction.projectId,
            transaction.category,
            transaction.amount
          );
          
          const totalDeduction = Number(transaction.amount) + officeFee;
          
          await tx.project.update({
            where: { id: transaction.projectId },
            data: {
              projectSafeBalance: { decrement: totalDeduction },
              operationalFund: { decrement: transaction.amount },
              officeRevenue: { increment: officeFee },
              actualCost: { increment: transaction.amount }
            }
          });
        }
        
        // Update custody if payment method is CUSTODY_WALLET
        if (transaction.paymentMethod === 'CUSTODY_WALLET') {
          await tx.user.update({
            where: { id: transaction.createdBy },
            data: {
              currentCustodyBalance: { decrement: transaction.amount },
              pendingClearance: { decrement: transaction.amount }
            }
          });
          
          await tx.custodyTransfer.create({
            data: {
              type: 'CLEARANCE',
              amount: transaction.amount,
              description: `Cleared: ${transaction.description}`,
              engineerId: transaction.createdBy,
              balanceBefore: transaction.user.currentCustodyBalance,
              balanceAfter: transaction.user.currentCustodyBalance - Number(transaction.amount)
            }
          });
        }
        
        // Update work order if linked
        if (transaction.projectCostItemId) {
          const workOrder = await tx.projectCostItem.findUnique({
            where: { id: transaction.projectCostItemId }
          });
          
          const newTotalPaid = Number(workOrder.totalPaid) + Number(transaction.amount);
          const isCompleted = newTotalPaid >= Number(workOrder.estimatedTotal);
          
          await tx.projectCostItem.update({
            where: { id: transaction.projectCostItemId },
            data: {
              totalPaid: newTotalPaid,
              status: isCompleted ? 'COMPLETED' : 'OPEN'
            }
          });
        }
      }
      
      // Check for negative project safe
      const updatedProject = await tx.project.findUnique({
        where: { id: transaction.projectId }
      });
      
      if (Number(updatedProject.projectSafeBalance) < 0) {
        // Send alerts
        const recipients = await tx.user.findMany({
          where: {
            OR: [
              { id: updatedProject.engineerId },
              { role: 'ADMIN' },
              { role: 'PROJECT_MANAGER' }
            ],
            tenantId: req.user.tenantId
          }
        });
        
        for (const user of recipients) {
          await tx.notification.create({
            data: {
              userId: user.id,
              tenantId: req.user.tenantId,
              type: 'ALERT',
              title: 'تحذير: رصيد المشروع سالب',
              message: `مشروع ${updatedProject.name} رصيده أصبح سالب: ${updatedProject.projectSafeBalance} جنيه`,
              resourceId: updatedProject.id,
              resourceType: 'project'
            }
          });
        }
      }
      
      // Notify engineer
      await tx.notification.create({
        data: {
          userId: transaction.createdBy,
          tenantId: req.user.tenantId,
          type: 'INFO',
          title: 'تم الموافقة على المصروف',
          message: `تم الموافقة على مصروف ${transaction.amount} جنيه`,
          resourceId: id,
          resourceType: 'transaction'
        }
      });
      
      return updatedTransaction;
    });
    
    res.status(200).json({
      success: true,
      data: updates,
      message: 'Transaction approved successfully'
    });
    
  } catch (error) {
    next(error);
  }
};
```

#### **2.4 Material Usage with Office Fee**
**File:** `server/controllers/materialController.js`

```javascript
import * as officeFeeService from '../services/officeFeeService.js';

export const recordMaterialUsage = async (req, res, next) => {
  try {
    const { materialBatchId, usedValue, usedQuantity, projectId, notes } = req.body;
    
    const batch = await prisma.materialBatch.findUnique({
      where: { id: materialBatchId }
    });
    
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Material batch not found' });
    }
    
    // Calculate actual used value
    let actualUsedValue = usedValue;
    if (!actualUsedValue && usedQuantity) {
      // Calculate based on quantity
      const totalQuantity = batch.totalQuantity || 1;
      actualUsedValue = (Number(usedQuantity) / Number(totalQuantity)) * Number(batch.initialValue);
    }
    
    // Calculate office fee on used portion
    const officeFee = await officeFeeService.calculateOfficeFee(
      projectId,
      'MATERIALS', // or batch.category
      actualUsedValue
    );
    
    await prisma.$transaction(async (tx) => {
      // Update batch
      await tx.materialBatch.update({
        where: { id: materialBatchId },
        data: {
          remainingValue: { decrement: actualUsedValue },
          quantityUsed: usedQuantity ? { increment: usedQuantity } : undefined,
          officeFeeApplied: { increment: officeFee },
          status: Number(batch.remainingValue) - actualUsedValue <= 0 ? 'CONSUMED' : 'PARTIALLY_USED'
        }
      });
      
      // Apply office fee to project
      await tx.project.update({
        where: { id: projectId },
        data: {
          officeRevenue: { increment: officeFee },
          projectSafeBalance: { decrement: officeFee }
        }
      });
      
      // Create usage record
      await tx.materialUsage.create({
        data: {
          materialId: batch.materialId,
          projectId: projectId,
          quantity: usedQuantity || 0,
          notes: notes,
          recordedBy: req.user.id,
          tenantId: req.user.tenantId
        }
      });
    });
    
    res.status(200).json({
      success: true,
      message: 'Material usage recorded successfully'
    });
    
  } catch (error) {
    next(error);
  }
};
```

---

### **PHASE 3: Backend - API Routes** ⏱️ 2 hours

#### **3.1 Office Fee Configuration Routes**
**File:** `server/routes/officeFees.js`

```javascript
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getGlobalCategoryFees,
  updateGlobalCategoryFee,
  getProjectCategoryFees,
  updateProjectCategoryFee,
  deleteProjectCategoryFee
} from '../controllers/officeFeeController.js';

const router = express.Router();

// Global category fees (ADMIN only)
router.get('/global', protect, authorize('ADMIN', 'SUPER_ADMIN'), getGlobalCategoryFees);
router.put('/global/:category', protect, authorize('ADMIN', 'SUPER_ADMIN'), updateGlobalCategoryFee);

// Project category fees
router.get('/project/:projectId', protect, getProjectCategoryFees);
router.put('/project/:projectId/:category', protect, authorize('PROJECT_MANAGER', 'ADMIN'), updateProjectCategoryFee);
router.delete('/project/:projectId/:category', protect, authorize('PROJECT_MANAGER', 'ADMIN'), deleteProjectCategoryFee);

export default router;
```

#### **3.2 Work Order Routes**
**File:** `server/routes/workOrders.js`

```javascript
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  getWorkOrderPayments
} from '../controllers/workOrderController.js';

const router = express.Router();

router.get('/', protect, getWorkOrders);
router.get('/:id', protect, getWorkOrderById);
router.get('/:id/payments', protect, getWorkOrderPayments);
router.post('/', protect, createWorkOrder);
router.put('/:id', protect, updateWorkOrder);

export default router;
```

#### **3.3 Material Usage Routes**
**File:** `server/routes/materials.js`

```javascript
// Add to existing routes
router.post('/usage', protect, recordMaterialUsage);
router.get('/batches', protect, getMaterialBatches);
router.get('/batches/:id', protect, getMaterialBatchById);
```

---

### **PHASE 4: Frontend - Transaction Form Enhancement** ⏱️ 5-6 hours

#### **4.1 Update AddTransactionModal Component**
**File:** `client/src/components/AddTransactionModal.jsx`

**Key Features:**
- Category selection first
- Work order dropdown (create new or select existing)
- Filter work orders by category
- Show remaining amount
- Warn if overpaying
- Payer dropdown
- DateTime picker
- Inventory dropdown for material categories

#### **4.2 Work Order Selection Component**
**File:** `client/src/components/WorkOrderSelector.jsx`

```javascript
import { useState, useEffect } from 'react';
import { workOrdersAPI } from '../services/api';

export default function WorkOrderSelector({ 
  projectId, 
  category, 
  onSelect, 
  selectedWorkOrderId 
}) {
  const [mode, setMode] = useState('select'); // 'select' or 'create'
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (mode === 'select' && category) {
      loadWorkOrders();
    }
  }, [category, mode]);
  
  const loadWorkOrders = async () => {
    setLoading(true);
    try {
      const response = await workOrdersAPI.getAll({
        projectId,
        category,
        status: 'OPEN'
      });
      setWorkOrders(response.data.data || []);
    } catch (error) {
      console.error('Failed to load work orders:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="work-order-selector">
      <div className="flex gap-sm mb-md">
        <button
          className={`btn btn-sm ${mode === 'select' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMode('select')}
        >
          اختيار صنيعة موجودة
        </button>
        <button
          className={`btn btn-sm ${mode === 'create' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMode('create')}
        >
          إنشاء صنيعة جديدة
        </button>
      </div>
      
      {mode === 'select' ? (
        <div className="form-group">
          <label>اختر الصنيعة</label>
          <select
            value={selectedWorkOrderId || ''}
            onChange={(e) => onSelect(e.target.value)}
            className="select"
          >
            <option value="">-- اختر --</option>
            {workOrders.map(wo => (
              <option key={wo.id} value={wo.id}>
                {wo.name} - متبقي: {(Number(wo.estimatedTotal) - Number(wo.totalPaid)).toLocaleString()} ج.م
              </option>
            ))}
          </select>
        </div>
      ) : (
        <CreateWorkOrderForm onCreated={onSelect} />
      )}
    </div>
  );
}
```

---

### **PHASE 5: Frontend - Inventory Management Page** ⏱️ 3-4 hours

#### **5.1 Create Inventory Page**
**File:** `client/src/pages/Inventory.jsx`

**Features:**
- List all material batches
- Group by project
- Show details: Description, Initial Value, Remaining Value, Status
- Material usage form
- Filter by project, status
- Search functionality

---

### **PHASE 6: Frontend - UI Enhancements** ⏱️ 2-3 hours

#### **6.1 Negative Project Safe Highlighting**
**File:** `client/src/pages/Projects.jsx`

```javascript
<div 
  className={`project-card ${project.projectSafeBalance < 0 ? 'project-negative' : ''}`}
  style={{
    background: project.projectSafeBalance < 0 
      ? 'linear-gradient(135deg, hsl(0, 85%, 60%) 0%, hsl(0, 75%, 50%) 100%)'
      : 'var(--bg-secondary)'
  }}
>
```

#### **6.2 Work Order Payment History**
**File:** `client/src/components/WorkOrderDetails.jsx`

Show all payments linked to a work order with full details.

---

### **PHASE 7: Testing & Validation** ⏱️ 3-4 hours

#### **7.1 Backend Tests**
- Office fee calculation accuracy
- Income recording (no split)
- Expense approval (with office fee)
- Material usage office fee
- Negative safe alerts
- Work order completion

#### **7.2 Frontend Tests**
- Work order selection flow
- Payment warnings
- DateTime picker
- Inventory dropdown
- Red highlighting
- All filters working

#### **7.3 Integration Tests**
- Complete transaction flow
- Material usage flow
- Work order lifecycle
- Notification delivery

---

## 📊 **TOTAL ESTIMATED TIME**

| Phase | Task | Time |
|-------|------|------|
| 1 | Database Schema | 1 hour |
| 2 | Backend Logic | 6-8 hours |
| 3 | API Routes | 2 hours |
| 4 | Transaction Form | 5-6 hours |
| 5 | Inventory Page | 3-4 hours |
| 6 | UI Enhancements | 2-3 hours |
| 7 | Testing | 3-4 hours |
| **TOTAL** | | **22-28 hours** |

**Estimated Completion: 3-4 working days**

---

## ✅ **IMPLEMENTATION CHECKLIST**

### Database
- [ ] Create GlobalCategoryFee model
- [ ] Create ProjectCategoryFee model
- [ ] Update MaterialBatch model
- [ ] Run migration

### Backend
- [ ] Create officeFeeService.js
- [ ] Update recordIncome (remove split)
- [ ] Update approveTransaction (add office fee)
- [ ] Create recordMaterialUsage
- [ ] Add negative safe check
- [ ] Create office fee routes
- [ ] Create work order routes
- [ ] Create material usage routes

### Frontend
- [ ] Update AddTransactionModal
- [ ] Create WorkOrderSelector component
- [ ] Add payer dropdown
- [ ] Add datetime picker
- [ ] Add inventory dropdown
- [ ] Create Inventory page
- [ ] Add negative project highlighting
- [ ] Create WorkOrderDetails component
- [ ] Update Arabic translations

### Testing
- [ ] Test office fee calculations
- [ ] Test income recording
- [ ] Test expense approval
- [ ] Test material usage
- [ ] Test work order flow
- [ ] Test negative safe alerts
- [ ] Test all UI components
- [ ] Integration testing

---

## 🚀 **READY TO START IMPLEMENTATION!**

All requirements are clear and documented. Starting with Phase 1: Database Schema Updates.
