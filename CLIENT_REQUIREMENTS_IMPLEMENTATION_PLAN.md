# Client Requirements - Implementation Plan
## Meeting Notes & System Modifications

---

## ✅ **REQUIREMENTS CONFIRMED - FULL UNDERSTANDING**

I have reviewed all 8 requirements from your client meeting. Below is my detailed understanding and implementation plan for each requirement.

---

## **Requirement 1: Work Orders (Project Cost Items) - Partial Payment System**

### **Current System:**
- Transactions are directly connected to cost categories
- No separation between total work order value and individual payments

### **Client Need:**
Example: "Ceramic installation for 100 M² @ 25 LE/M² = 2,500 LE total, but paying only 1,000 LE now"

### **Solution:**
**Two-Step Process:**
1. **Create Work Order** (ProjectCostItem):
   - Name: "تركيب سيراميك"
   - Quantity: 100
   - Unit: M²
   - Unit Price: 25 LE
   - Estimated Total: 2,500 LE
   - Total Paid: 0 LE (initially)
   - Status: OPEN

2. **Create Transaction** (Payment):
   - Amount: 1,000 LE
   - Link to Work Order (projectCostItemId)
   - Updates Work Order's `totalPaid` field
   - When `totalPaid >= estimatedTotal`, status changes to COMPLETED

### **Implementation:**
- ✅ **Database**: Already exists! `ProjectCostItem` model is ready
- ✅ **Relationship**: `Transaction.projectCostItemId` already exists
- 🔧 **UI Changes Needed**:
  - Add dropdown in transaction form: "Select Work Order" or "Create New"
  - If "Create New": Show fields (name, quantity, UOM, unit price)
  - If "Select Existing": Show list of OPEN work orders for the project
  - Display work order progress: "Paid 1,000 / 2,500 LE (40%)"

---

## **Requirement 2: Update Arabic Category Names**

### **Current Categories:**
Generic English-based categories (MATERIALS, LABOR, etc.)

### **Required Categories (Arabic):**
The system already has these in the schema! Lines 563-591:
- خرسانات (CONCRETE)
- نظافة (SITE_CLEANING)
- تشوين (STOCKING)
- اسمنت (CEMENT)
- رمل (SAND)
- طوب (BRICKS)
- مصنعية عمالة (GENERAL_LABOR)
- مصنعية بناء (MASONRY_LABOR)
- خامات محارة (PLASTERING_MATERIALS)
- مصنعية محارة (PLASTERING_LABOR)
- خامات سباكة (PLUMBING_MATERIALS)
- مصنعية سباكة (PLUMBING_LABOR)
- خامات كهرباء (ELECTRICAL_MATERIALS)
- مصنعية كهرباء (ELECTRICAL_LABOR)
- خامات سيراميك (CERAMIC_MATERIALS)
- مصنعية سيراميك (CERAMIC_LABOR)
- خامات دهانات (PAINTING_MATERIALS)
- مصنعية دهانات (PAINTING_LABOR)
- خامات جبس بورد (GYPSUM_MATERIALS)
- مصنعية جبس بورد (GYPSUM_LABOR)
- خامات نجارة (CARPENTRY_MATERIALS)
- مصنعية نجارة (CARPENTRY_LABOR)
- ديكور (DECOR)
- رسومات (DRAWINGS)
- اكراميات (TIPS)
- نقل (TRANSPORT)
- مصنعية عزل (INSULATION_LABOR)
- تاسيس تكيف (HVAC_PREP)
- الوميتال (ALUMETAL)

### **Implementation:**
- ✅ **Database**: Already complete!
- 🔧 **UI Changes**: Update translation files to show Arabic names
- 🔧 **Frontend**: Update category dropdowns to use these specific categories

---

## **Requirement 3: Transaction Owner (Payer) Field**

### **Current System:**
- `createdBy`: Who recorded the transaction
- No field for who actually paid the money

### **Client Need:**
Project Manager should be able to select which employee paid the money from a dropdown

### **Solution:**
- ✅ **Database**: Already exists! `Transaction.payerUserId` (line 353)
- ✅ **Relationship**: `payer User? @relation("PayerOfTransaction")` (line 354)

### **Implementation:**
- 🔧 **UI Changes**:
  - Add "Paid By" dropdown in transaction form
  - Load all company employees (users) in dropdown
  - Only PROJECT_MANAGER and above can edit this field
  - Default to current user for ENGINEER role

---

## **Requirement 4: Group Transactions by Project**

### **Current System:**
Finance page already groups by project! (Finance.jsx lines 293-301)

### **Client Need:**
- View expenses by project
- View uncompleted work orders by project
- Group workforce transactions by project

### **Implementation:**
- ✅ **Finance Page**: Already grouping by project!
- 🔧 **Add Work Orders Tab**: Show all ProjectCostItems grouped by project
  - Display: Name, Estimated Total, Total Paid, Remaining, Progress %
  - Filter by status: OPEN, COMPLETED
- 🔧 **Workforce Page**: Add project grouping similar to Finance page

---

## **Requirement 5: Transaction Date/Time Field**

### **Current System:**
- `transactionDate DateTime @default(now())` exists (line 334)

### **Client Need:**
- Show datetime picker when creating transaction
- Default to current time
- User can modify it

### **Implementation:**
- ✅ **Database**: Already exists!
- 🔧 **UI Changes**:
  - Add datetime picker in transaction form
  - Default value: `new Date()`
  - Allow manual editing

---

## **Requirement 6: Office Revenue Calculation - NEW LOGIC**

### **Current System (WRONG):**
Income is split immediately:
- 100,000 LE income → 20,000 LE to office, 80,000 LE to project safe

### **Client Need (CORRECT):**
1. **Income**: 100,000 LE → Goes 100% to project safe (no split)
2. **Expense**: 10,000 LE expense with 20% office fee:
   - Deduct 10,000 LE from project safe
   - Calculate office share: 10,000 × 20% = 2,000 LE
   - Transfer 2,000 LE to office safe
   - Net project deduction: 12,000 LE

### **Special Case - Inventory Items:**
- Inventory purchase: 10,000 LE → Deduct from project safe, NO office fee yet
- When inventory is used: Calculate office fee on used quantity
- Example: Used 60% of inventory → Office fee = 10,000 × 60% × 20% = 1,200 LE

### **Implementation:**
🔧 **Major Backend Changes Required:**

**File: `server/controllers/transactionController.js`**

**Function: `recordIncome` (lines 223-300)**
```javascript
// CURRENT (WRONG):
officeShare = amount * (project.managementFeePercent / 100);
opsShare = amount - officeShare;

// NEW (CORRECT):
// Income goes 100% to project safe
prisma.project.update({
  where: { id: projectId },
  data: {
    projectSafeBalance: { increment: amount },
    operationalFund: { increment: amount }
  }
});
```

**Function: `approveTransaction` (lines 373-481)**
```javascript
// When EXPENSE is approved:
if (transaction.type === 'EXPENSE') {
  const project = await tx.project.findUnique({ where: { id: transaction.projectId }});
  const officeFeePercent = project.managementFeePercent || 20;
  
  // Check if it's inventory item
  const isInventoryItem = ['CEMENT', 'SAND', 'BRICKS', 'CONCRETE', /* add all material categories */].includes(transaction.category);
  
  if (isInventoryItem) {
    // Deduct from project safe, NO office fee yet
    await tx.project.update({
      where: { id: transaction.projectId },
      data: {
        projectSafeBalance: { decrement: transaction.amount },
        operationalFund: { decrement: transaction.amount }
      }
    });
  } else {
    // Regular expense: Deduct expense + office fee
    const officeFee = transaction.amount * (officeFeePercent / 100);
    const totalDeduction = transaction.amount + officeFee;
    
    await tx.project.update({
      where: { id: transaction.projectId },
      data: {
        projectSafeBalance: { decrement: totalDeduction },
        operationalFund: { decrement: transaction.amount },
        officeRevenue: { increment: officeFee }
      }
    });
  }
}
```

**New Function: `recordMaterialUsage`**
```javascript
// When inventory is used, calculate office fee
export const recordMaterialUsage = async (req, res) => {
  const { materialBatchId, usedValue, projectId } = req.body;
  
  const project = await prisma.project.findUnique({ where: { id: projectId }});
  const officeFeePercent = project.managementFeePercent || 20;
  const officeFee = usedValue * (officeFeePercent / 100);
  
  await prisma.project.update({
    where: { id: projectId },
    data: {
      officeRevenue: { increment: officeFee },
      projectSafeBalance: { decrement: officeFee }
    }
  });
};
```

---

## **Requirement 7: Inventory Dropdown for Material Categories**

### **Client Need:**
When selecting a material category (CEMENT, SAND, etc.), show inventory dropdown

### **Implementation:**
🔧 **UI Changes**:
```javascript
// In AddTransactionModal.jsx
const isMaterialCategory = ['CEMENT', 'SAND', 'BRICKS', 'CONCRETE', /* ... */].includes(category);

{isMaterialCategory && (
  <div className="form-group">
    <label>Select Inventory Item</label>
    <select name="materialBatchId">
      <option value="">Create New Inventory Item</option>
      {inventoryItems.map(item => (
        <option key={item.id} value={item.id}>
          {item.description} - {item.remainingValue} LE available
        </option>
      ))}
    </select>
  </div>
)}
```

---

## **Requirement 8: Inventory Screen**

### **Client Need:**
Full inventory management screen showing:
- Inventory name
- Items with details (UOM, quantity, cost)

### **Implementation:**
🔧 **New Page**: `client/src/pages/Inventory.jsx`

**Features:**
- List all MaterialBatch records
- Group by project
- Show:
  - Description
  - Initial Value
  - Remaining Value
  - Status (AVAILABLE, PARTIALLY_USED, CONSUMED)
  - Purchase Date
  - Material details (if linked)
- Filter by project, status
- Search functionality

---

## **Requirement 9: Negative Project Safe Alert**

### **Client Need:**
- If project safe goes negative → Highlight project in red
- Send notification to Project Manager and superiors

### **Implementation:**
🔧 **Backend**: Add check after every transaction approval
```javascript
// After updating project safe
const updatedProject = await prisma.project.findUnique({ where: { id: projectId }});

if (updatedProject.projectSafeBalance < 0) {
  // Send notifications
  const recipients = await prisma.user.findMany({
    where: {
      OR: [
        { id: updatedProject.engineerId },
        { role: { in: ['PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN'] }}
      ]
    }
  });
  
  for (const user of recipients) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'ALERT',
        title: 'تحذير: رصيد المشروع سالب',
        message: `مشروع ${updatedProject.name} رصيده أصبح سالب: ${updatedProject.projectSafeBalance} جنيه`,
        resourceId: projectId,
        resourceType: 'project'
      }
    });
  }
}
```

🔧 **Frontend**: 
- Add conditional styling in Projects list
- Red background if `projectSafeBalance < 0`
- Warning icon

---

## **SUMMARY - Implementation Checklist**

### ✅ **Already Implemented (No Changes Needed):**
1. ✅ ProjectCostItem model (Work Orders)
2. ✅ Arabic category names in database
3. ✅ Transaction payer field (payerUserId)
4. ✅ Project grouping in Finance page
5. ✅ Transaction date field

### 🔧 **Requires Implementation:**

**Backend Changes:**
- [ ] Modify `recordIncome` - Remove split logic
- [ ] Modify `approveTransaction` - Add office fee calculation on expenses
- [ ] Add `recordMaterialUsage` function - Office fee on inventory usage
- [ ] Add negative safe check and notifications

**Frontend Changes:**
- [ ] Update transaction form - Add work order dropdown
- [ ] Update transaction form - Add payer dropdown
- [ ] Update transaction form - Add datetime picker
- [ ] Update transaction form - Add inventory dropdown for materials
- [ ] Create Inventory page
- [ ] Add red highlighting for negative project safe
- [ ] Update category dropdowns to show Arabic names

**Database:**
- [ ] No schema changes needed! Everything is ready

---

## **QUESTIONS FOR CLARIFICATION:**

### ❓ **Question 1: Office Fee Percentage**
Is the office fee percentage (managementFeePercent) the same for ALL expense types, or does it vary by category?

### ❓ **Question 2: Inventory Usage**
When recording material usage, should we:
- A) Manually enter the used value in LE?
- B) Enter quantity used, and calculate value automatically?

### ❓ **Question 3: Work Order Completion**
When a work order is fully paid (totalPaid >= estimatedTotal), should it:
- A) Automatically close (status = COMPLETED)?
- B) Require manual completion by Project Manager?

### ❓ **Question 4: Negative Safe Limit**
Is there a minimum threshold before triggering the alert, or any negative amount triggers it?

---

## **ESTIMATED IMPLEMENTATION TIME:**

- **Backend Changes**: 6-8 hours
- **Frontend Changes**: 10-12 hours
- **Testing**: 4-6 hours
- **Total**: 20-26 hours (2.5-3 days)

---

**Please confirm my understanding and answer the clarification questions so I can proceed with implementation! 🚀**
