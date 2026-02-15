# Work Orders & Transactions - UI/UX Specification
## Separate Pages Design

**Date:** 2026-02-15  
**Status:** APPROVED

---

## 📋 **DESIGN DECISIONS**

### **1. Work Order Creation**
✅ **Both options available:**
- Option A: Create work order separately, then make payments later
- Option B: Create work order + first payment in one flow (from transaction form)

### **2. Work Order Requirement**
✅ **Always optional for all categories**
- Users can create transactions without work orders
- Work orders are for tracking multi-payment contracts

### **3. Past Transactions**
✅ **Delete old test data**
- Fresh start with new system
- No migration needed

### **4. Work Order Naming**
✅ **Combination approach:**
- System suggests name based on category (e.g., "تركيب سيراميك")
- User can edit/customize the name
- Format: `[Category Name] - [Custom Text]`

### **5. Multiple Work Orders**
✅ **Allowed for same category:**
- Multiple ceramic workers can have separate work orders
- Differentiate by name and/or workman
- Example:
  - "تركيب سيراميك - شقة 101 - أحمد"
  - "تركيب سيراميك - شقة 102 - محمد"

### **6. Work Order Filtering**
✅ **Filter by Category + Project:**
- When creating transaction, select category first
- Dropdown shows only work orders matching:
  - Same project
  - Same category
  - Status = OPEN (not completed)

---

## 🎨 **UI/UX DESIGN**

### **Page Structure:**

```
Navigation:
├── Dashboard
├── Projects
├── Work Orders (صنايعية) ← NEW PAGE
├── Finance (المعاملات المالية)
├── Inventory (المخزون) ← NEW PAGE
├── Labor (العمالة)
└── Settings
```

---

## 📄 **PAGE 1: Work Orders (صنايعية)**

### **Route:** `/work-orders`

### **Page Header:**
```
┌─────────────────────────────────────────────────────┐
│  🔨 Work Orders (صنايعية)                           │
│  Track contracts and payment progress               │
│                                                     │
│  [+ New Work Order]                    [Filters ▼] │
└─────────────────────────────────────────────────────┘
```

### **Filters:**
- Project dropdown
- Category dropdown
- Status: All / Open / Completed
- Workman dropdown

### **Work Order Card Design:**
```
┌─────────────────────────────────────────────────────┐
│  تركيب سيراميك - شقة 101                            │
│  Project: Villa Construction  │  Worker: أحمد محمد  │
├─────────────────────────────────────────────────────┤
│  Category: [CERAMIC_LABOR]    Status: [OPEN]        │
│                                                     │
│  Quantity: 100 M²  │  Unit Price: 25 LE             │
│  Estimated Total: 2,500 LE                          │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ ████████████░░░░░░░░░░░░░░░░░░░░ 40%        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Paid: 1,000 LE  │  Remaining: 1,500 LE            │
│                                                     │
│  [View Payments] [Add Payment] [Edit] [Delete]     │
└─────────────────────────────────────────────────────┘
```

### **Create Work Order Modal:**
```
┌─────────────────────────────────────────────────────┐
│  إنشاء صنيعة جديدة                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Project *         [Select Project ▼]               │
│  Category *        [Select Category ▼]              │
│                    → Auto-suggests name             │
│                                                     │
│  Work Order Name * [تركيب سيراميك]                 │
│                    (editable)                       │
│                                                     │
│  Workman           [Select Workman ▼] (optional)    │
│  Description       [Textarea]                       │
│                                                     │
│  ┌─ Cost Details ────────────────────────────────┐ │
│  │ Quantity         [100]  [M² ▼]                │ │
│  │ Unit Price       [25] LE                      │ │
│  │ Estimated Total  2,500 LE (auto-calculated)   │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ☐ Create first payment now                        │
│                                                     │
│  [Cancel]                    [Create Work Order]    │
└─────────────────────────────────────────────────────┘
```

### **If "Create first payment now" is checked:**
```
│  ┌─ First Payment ───────────────────────────────┐ │
│  │ Payment Amount   [1,000] LE                   │ │
│  │ Payment Date     [DateTime Picker]            │ │
│  │ Paid By          [Select Employee ▼]          │ │
│  │ Payment Method   [Cash ▼]                     │ │
│  │ Notes            [Textarea]                   │ │
│  └───────────────────────────────────────────────┘ │
```

### **Work Order Details Page:**
Shows:
- Full work order information
- Payment history table
- Progress chart
- Add payment button

---

## 💰 **PAGE 2: Finance (المعاملات المالية)**

### **Route:** `/finance`

### **Updated Transaction Form:**
```
┌─────────────────────────────────────────────────────┐
│  إنشاء معاملة مالية جديدة                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Type *            ○ Income  ● Expense              │
│  Project *         [Select Project ▼]               │
│  Category *        [Select Category ▼]              │
│  Amount *          [1,000] LE                       │
│  Date/Time *       [📅 2026-02-15 11:30]            │
│  Paid By           [Select Employee ▼]              │
│                                                     │
│  ┌─ Work Order (Optional) ──────────────────────┐  │
│  │ ○ No work order - standalone transaction     │  │
│  │ ○ Link to existing work order                │  │
│  │   [Select Work Order ▼]                      │  │
│  │   > تركيب سيراميك - شقة 101                 │  │
│  │     Remaining: 1,500 LE                      │  │
│  │                                               │  │
│  │ ○ Create new work order + payment            │  │
│  │   [Opens work order form inline]             │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Description       [Textarea]                       │
│  Payment Method    [Cash ▼]                         │
│                                                     │
│  ┌─ Inventory (if material category) ───────────┐  │
│  │ ○ New inventory item                          │  │
│  │ ○ Link to existing inventory                  │  │
│  │   [Select Inventory ▼]                        │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [Cancel]                    [Create Transaction]   │
└─────────────────────────────────────────────────────┘
```

### **Warning Messages:**
When linking to work order and amount exceeds remaining:
```
┌─────────────────────────────────────────────────────┐
│  ⚠️ Warning                                         │
├─────────────────────────────────────────────────────┤
│  Payment amount (2,000 LE) exceeds remaining        │
│  balance (1,500 LE) for this work order.            │
│                                                     │
│  This will overpay by 500 LE.                       │
│                                                     │
│  [Cancel]  [Continue Anyway]                        │
└─────────────────────────────────────────────────────┘
```

### **Transaction Table Updates:**
Add column: **Work Order**
- Shows work order name if linked
- Badge with progress indicator
- Click to view work order details

---

## 📦 **PAGE 3: Inventory (المخزون)**

### **Route:** `/inventory`

### **Page Layout:**
```
┌─────────────────────────────────────────────────────┐
│  📦 Inventory (المخزون)                             │
│  Material batches and usage tracking                │
│                                                     │
│  [Filters: Project ▼] [Category ▼] [Status ▼]      │
└─────────────────────────────────────────────────────┘

Grouped by Project:

┌─ Villa Construction ────────────────────────────────┐
│                                                     │
│  Cement - Batch #1                                  │
│  Initial: 5,000 LE │ Remaining: 3,000 LE (60%)     │
│  Status: [PARTIALLY_USED]                           │
│  Office Fee Applied: 400 LE                         │
│  [Record Usage] [View Details]                      │
│                                                     │
│  Sand - Batch #2                                    │
│  Initial: 2,000 LE │ Remaining: 2,000 LE (100%)    │
│  Status: [AVAILABLE]                                │
│  Office Fee Applied: 0 LE                           │
│  [Record Usage] [View Details]                      │
└─────────────────────────────────────────────────────┘
```

### **Record Usage Modal:**
```
┌─────────────────────────────────────────────────────┐
│  Record Material Usage                              │
├─────────────────────────────────────────────────────┤
│  Batch: Cement - Batch #1                           │
│  Available: 3,000 LE                                │
│                                                     │
│  ○ Enter value consumed                             │
│    Amount: [1,000] LE                               │
│                                                     │
│  ○ Enter quantity consumed                          │
│    Quantity: [20] Bags                              │
│    (Auto-calculates value)                          │
│                                                     │
│  Notes: [Textarea]                                  │
│                                                     │
│  Office Fee (20%): 200 LE (auto-calculated)         │
│                                                     │
│  [Cancel]                    [Record Usage]         │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 **COLOR SCHEME**

### **Work Orders:**
- **Primary Color**: Navy Blue `hsl(220, 80%, 45%)`
- **Icon**: 🔨 or 📋
- **Progress Bar**: Gradient blue
- **Status Badges**:
  - OPEN: Blue outline
  - COMPLETED: Green filled

### **Transactions:**
- **Income**: Green `hsl(142, 76%, 36%)`
- **Expense**: Red `hsl(0, 85%, 60%)`
- **Icon**: 💰
- **Type Badges**:
  - INCOME: Green filled
  - EXPENSE: Red filled

### **Inventory:**
- **Primary Color**: Orange `hsl(25, 95%, 53%)`
- **Icon**: 📦
- **Status Badges**:
  - AVAILABLE: Green
  - PARTIALLY_USED: Orange
  - CONSUMED: Grey

---

## 🔄 **USER WORKFLOWS**

### **Workflow 1: Create Work Order, Pay Later**
1. Go to Work Orders page
2. Click "New Work Order"
3. Fill form (don't check "create first payment")
4. Submit → Work order created with totalPaid = 0
5. Later: Click "Add Payment" → Creates transaction

### **Workflow 2: Create Work Order + First Payment**
1. Go to Work Orders page
2. Click "New Work Order"
3. Fill form, check "create first payment"
4. Fill payment details
5. Submit → Creates work order + transaction

### **Workflow 3: Create Transaction with Work Order**
1. Go to Finance page
2. Click "New Transaction"
3. Select category
4. Choose "Link to existing work order"
5. Select from dropdown
6. Submit → Transaction linked to work order

### **Workflow 4: Standalone Transaction**
1. Go to Finance page
2. Click "New Transaction"
3. Select "No work order"
4. Submit → Simple transaction

### **Workflow 5: Material Usage**
1. Go to Inventory page
2. Find material batch
3. Click "Record Usage"
4. Enter amount or quantity
5. Submit → Office fee calculated and applied

---

## ✅ **IMPLEMENTATION CHECKLIST**

### Backend:
- [x] Database schema (already done)
- [x] Office fee service (already done)
- [x] Transaction logic (already done)
- [ ] Work order controller
- [ ] Work order routes
- [ ] Inventory routes

### Frontend:
- [ ] Work Orders page
- [ ] Create Work Order modal
- [ ] Work Order details page
- [ ] Update Transaction form
- [ ] Inventory page
- [ ] Material usage modal
- [ ] Navigation updates
- [ ] Arabic translations

---

**Ready to implement! 🚀**
