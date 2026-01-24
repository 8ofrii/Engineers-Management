# 🛡️ Security & Notification Architecture

## The "Nervous System" of Your Application

This document defines:
- **Notifications**: Signals that tell users when to act
- **Permissions (RBAC)**: Guards that stop users from accessing unauthorized features

---

## Part 1: The Notification System

### Database Schema

Already added to `schema.prisma`:

```prisma
enum NotificationType {
  ACTION_REQUIRED  // e.g., "New Expense Needs Approval"
  INFO             // e.g., "Your Receipt was Approved"
  ALERT            // e.g., "Low Custody Balance"
}

model Notification {
  id           String           @id @default(uuid())
  userId       String
  user         User             @relation(fields: [userId], references: [id])
  
  type         NotificationType
  title        String
  message      String
  resourceId   String?          // Link to Transaction ID, Project ID, etc.
  resourceType String?          // 'transaction', 'project', 'custody'
  isRead       Boolean          @default(false)
  
  createdAt    DateTime         @default(now())
}
```

---

## Notification Triggers

### Scenario A: Engineer Submits Expense

**Trigger Point:** `PUT /api/transactions/:id/submit`

**Logic:**
```javascript
// Inside submitTransaction controller

// Find the project manager
const project = await prisma.project.findUnique({
  where: { id: transaction.projectId },
  include: { engineer: true }  // Assuming project has a manager
});

// Create notification for manager
await prisma.notification.create({
  data: {
    userId: project.engineerId,  // Or managerId if you add that field
    type: 'ACTION_REQUIRED',
    title: 'New Expense Pending Approval',
    message: `${req.user.name} submitted a new expense: ${transaction.amount} EGP for Project ${project.name}`,
    resourceId: transaction.id,
    resourceType: 'transaction'
  }
});
```

---

### Scenario B: Manager Approves/Rejects

**Trigger Point:** `PUT /api/transactions/:id/approve` or `/reject`

**Approval Logic:**
```javascript
// Inside approveTransaction controller

await prisma.notification.create({
  data: {
    userId: transaction.createdBy,  // The engineer
    type: 'INFO',
    title: 'Expense Approved',
    message: `Your expense of ${transaction.amount} EGP was approved. Your custody balance has been updated.`,
    resourceId: transaction.id,
    resourceType: 'transaction'
  }
});
```

**Rejection Logic:**
```javascript
// Inside rejectTransaction controller

await prisma.notification.create({
  data: {
    userId: transaction.createdBy,
    type: 'ALERT',
    title: 'Expense Rejected',
    message: `Your expense of ${transaction.amount} EGP was rejected. Reason: ${rejectionReason}`,
    resourceId: transaction.id,
    resourceType: 'transaction'
  }
});
```

---

### Scenario C: Admin Sends Money (Tamweel)

**Trigger Point:** `POST /api/custody/transfer`

**Logic:**
```javascript
// Inside fundEngineer controller

await prisma.notification.create({
  data: {
    userId: engineerId,
    type: 'INFO',
    title: 'Custody Funded',
    message: `You received ${amount} EGP custody top-up. New balance: ${balanceAfter} EGP`,
    resourceType: 'custody'
  }
});
```

---

### Scenario D: Low Custody Balance Alert

**Trigger Point:** Automatic check after expense approval

**Logic:**
```javascript
// Inside approveTransaction controller, after balance update

const engineer = await prisma.user.findUnique({
  where: { id: transaction.createdBy },
  select: { currentCustodyBalance: true, pendingClearance: true }
});

const availableBalance = engineer.currentCustodyBalance - engineer.pendingClearance;

// Alert if balance is low (e.g., < 1000 EGP)
if (availableBalance < 1000) {
  await prisma.notification.create({
    data: {
      userId: transaction.createdBy,
      type: 'ALERT',
      title: 'Low Custody Balance',
      message: `Your available custody balance is ${availableBalance} EGP. Please request a top-up.`,
      resourceType: 'custody'
    }
  });
}
```

---

## Notification API Endpoints

### Get User Notifications
```javascript
// GET /api/notifications
export const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50  // Limit to recent 50
    });
    
    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false
      }
    });
    
    res.status(200).json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};
```

### Mark as Read
```javascript
// PUT /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};
```

### Mark All as Read
```javascript
// PUT /api/notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false
      },
      data: { isRead: true }
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};
```

---

## Part 2: Roles & Permissions (RBAC)

### The Role Matrix

| Feature | Action | Admin | Project Manager | Engineer | Accountant |
|---------|--------|-------|----------------|----------|------------|
| **Projects** | Create/Edit Project | ✅ | ❌ | ❌ | ❌ |
| | View Project Financials | ✅ | ✅ | ❌ | ✅ |
| | View Project Details | ✅ | ✅ | ✅ | ✅ |
| **Custody** | Transfer Money (Fund) | ✅ | ❌ | ❌ | ❌ |
| | View Own Balance | ✅ | ✅ | ✅ | ✅ |
| | View All Balances | ✅ | ✅ | ❌ | ✅ |
| **Expenses** | Submit Expense | ✅ | ✅ | ✅ | ❌ |
| | Approve/Reject | ✅ | ✅ | ❌ | ❌ |
| | View Own Expenses | ✅ | ✅ | ✅ | ✅ |
| **Income** | Record Client Payment | ✅ | ❌ | ❌ | ✅ |
| | View Income | ✅ | ✅ | ❌ | ✅ |
| **Reports** | View Profit Margins | ✅ | ❌ | ❌ | ✅ |
| | View Project Reports | ✅ | ✅ | ✅ | ✅ |
| **Materials** | Add Material Batch | ✅ | ✅ | ✅ | ❌ |
| | Consume Materials | ✅ | ✅ | ✅ | ❌ |
| **Users** | Create/Edit Users | ✅ | ❌ | ❌ | ❌ |
| | View Users | ✅ | ✅ | ❌ | ✅ |

---

## Implementation Guide

### Step 1: Create the Middleware

**File:** `server/middleware/rbac.js`

```javascript
/**
 * Role-Based Access Control Middleware
 * Checks if the authenticated user has the required role
 */
export const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    // req.user is set by the JWT authentication middleware
    if (!req.user) {
      return res.status(401).json({ 
        error: "Authentication required" 
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: "Access Denied. You do not have permission to perform this action.",
        requiredRoles: allowedRoles,
        yourRole: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Resource Ownership Check
 * Ensures user can only access their own resources
 */
export const verifyOwnership = (resourceType) => {
  return async (req, res, next) => {
    const resourceId = req.params.id;
    const userId = req.user.id;
    
    try {
      let resource;
      
      switch (resourceType) {
        case 'transaction':
          resource = await prisma.transaction.findUnique({
            where: { id: resourceId },
            select: { createdBy: true }
          });
          
          if (resource.createdBy !== userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: "Not authorized to access this resource" });
          }
          break;
          
        case 'custody':
          // Engineers can only view their own custody
          if (req.params.engineerId !== userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: "Not authorized" });
          }
          break;
          
        default:
          break;
      }
      
      next();
    } catch (error) {
      res.status(500).json({ error: "Authorization check failed" });
    }
  };
};
```

---

### Step 2: Protect the Routes

**File:** `server/routes/transactions.js`

```javascript
import express from 'express';
import { protect } from '../middleware/auth.js';
import { verifyRole, verifyOwnership } from '../middleware/rbac.js';
import * as transactionController from '../controllers/transactionController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// 1. Create AI Draft (Engineers, Managers, Admins)
router.post(
  '/ai-draft',
  verifyRole(['ENGINEER', 'PROJECT_MANAGER', 'ADMIN']),
  transactionController.createAIDraft
);

// 2. Submit Expense (Engineers, Managers, Admins - own transactions only)
router.put(
  '/:id/submit',
  verifyRole(['ENGINEER', 'PROJECT_MANAGER', 'ADMIN']),
  verifyOwnership('transaction'),
  transactionController.submitTransaction
);

// 3. Approve Expense (Only Managers & Admins)
router.put(
  '/:id/approve',
  verifyRole(['PROJECT_MANAGER', 'ADMIN']),
  transactionController.approveTransaction
);

// 4. Reject Expense (Only Managers & Admins)
router.put(
  '/:id/reject',
  verifyRole(['PROJECT_MANAGER', 'ADMIN']),
  transactionController.rejectTransaction
);

// 5. Record Income (Only Admins & Accountants)
router.post(
  '/income',
  verifyRole(['ADMIN', 'ACCOUNTANT']),
  transactionController.recordIncome
);

// 6. Get All Transactions (Role-based filtering)
router.get(
  '/',
  transactionController.getTransactions
);

// 7. Get Single Transaction
router.get(
  '/:id',
  transactionController.getTransaction
);

export default router;
```

**File:** `server/routes/custody.js`

```javascript
import express from 'express';
import { protect } from '../middleware/auth.js';
import { verifyRole, verifyOwnership } from '../middleware/rbac.js';
import * as custodyController from '../controllers/custodyController.js';

const router = express.Router();

router.use(protect);

// 1. Fund Engineer (Only Admins)
router.post(
  '/transfer',
  verifyRole(['ADMIN']),
  custodyController.fundEngineer
);

// 2. Get Engineer Balance (Own balance or Admin)
router.get(
  '/balance/:engineerId',
  verifyOwnership('custody'),
  custodyController.getBalance
);

// 3. Get Custody History
router.get(
  '/history/:engineerId',
  verifyOwnership('custody'),
  custodyController.getHistory
);

// 4. Return Custody (Engineers returning unused cash)
router.post(
  '/return',
  verifyRole(['ENGINEER', 'PROJECT_MANAGER', 'ADMIN']),
  custodyController.returnCustody
);

export default router;
```

**File:** `server/routes/projects.js`

```javascript
import express from 'express';
import { protect } from '../middleware/auth.js';
import { verifyRole } from '../middleware/rbac.js';
import * as projectController from '../controllers/projectController.js';

const router = express.Router();

router.use(protect);

// 1. Create Project (Only Admins)
router.post(
  '/',
  verifyRole(['ADMIN']),
  projectController.createProject
);

// 2. Update Project (Only Admins)
router.put(
  '/:id',
  verifyRole(['ADMIN']),
  projectController.updateProject
);

// 3. Get All Projects (All authenticated users)
router.get(
  '/',
  projectController.getProjects
);

// 4. Get Project Financials (Admins, Managers, Accountants)
router.get(
  '/:id/financials',
  verifyRole(['ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT']),
  projectController.getProjectFinancials
);

// 5. Get Project Details (All users)
router.get(
  '/:id',
  projectController.getProject
);

export default router;
```

---

### Step 3: Role-Based Data Filtering

Some endpoints should filter data based on role:

```javascript
// In transactionController.js
export const getTransactions = async (req, res) => {
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
        user: { select: { name: true, email: true } },
        project: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.status(200).json({
      success: true,
      transactions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};
```

---

## Frontend Integration

### 1. Bell Icon Component

```javascript
// components/NotificationBell.jsx
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import api from '../services/api';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Poll for notifications every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);
  
  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications');
    }
  };
  
  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark as read');
    }
  };
  
  return (
    <div className="notification-bell">
      <button onClick={() => setShowDropdown(!showDropdown)}>
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="badge">{unreadCount}</span>
        )}
      </button>
      
      {showDropdown && (
        <div className="notification-dropdown">
          {notifications.length === 0 ? (
            <p>No notifications</p>
          ) : (
            notifications.map(notif => (
              <div 
                key={notif.id}
                className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
                onClick={() => markAsRead(notif.id)}
              >
                <h4>{notif.title}</h4>
                <p>{notif.message}</p>
                <span>{new Date(notif.createdAt).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

### 2. Role-Based UI Rendering

```javascript
// utils/permissions.js
export const canAccess = (userRole, requiredRoles) => {
  return requiredRoles.includes(userRole);
};

// In your component
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';

function Dashboard() {
  const { user } = useAuth();
  
  return (
    <div>
      {canAccess(user.role, ['ADMIN']) && (
        <button>Create Project</button>
      )}
      
      {canAccess(user.role, ['ADMIN', 'PROJECT_MANAGER']) && (
        <Link to="/approval-queue">Approval Queue</Link>
      )}
      
      {canAccess(user.role, ['ENGINEER', 'PROJECT_MANAGER']) && (
        <Link to="/submit-expense">Submit Expense</Link>
      )}
    </div>
  );
}
```

---

## Security Best Practices

1. ✅ **Never trust the frontend** - Always validate permissions on the backend
2. ✅ **Use JWT tokens** - Store user role in the token payload
3. ✅ **Validate ownership** - Users should only access their own resources
4. ✅ **Log access attempts** - Track who tried to access what
5. ✅ **Rate limiting** - Prevent abuse of API endpoints
6. ✅ **Input validation** - Always validate and sanitize user input

---

## Testing Checklist

- [ ] Admin can create projects
- [ ] Engineer cannot create projects (403 error)
- [ ] Engineer can submit own expenses
- [ ] Engineer cannot approve own expenses
- [ ] Manager can approve expenses
- [ ] Engineer receives notification when expense approved
- [ ] Manager receives notification when expense submitted
- [ ] Low balance alert triggers correctly
- [ ] Notification bell shows unread count
- [ ] Mark as read functionality works

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-24  
**Status:** Ready for Implementation
