# 🚀 Quick API Reference Card

## Base URL
```
http://localhost:5000/api
```

## Authentication
All requests (except login/register) need:
```
Authorization: Bearer <your-jwt-token>
```

---

## 💰 Income & Revenue

### Record Client Payment (Admin/Accountant)
```http
POST /transactions/income
{
  "projectId": "uuid",
  "amount": 100000,
  "clientId": "uuid",
  "description": "Payment from client"
}
```
**Effect:** Splits money 80/20 for Cost-Plus projects

---

## 🏦 Custody Management

### Fund Engineer (Admin Only)
```http
POST /custody/transfer
{
  "engineerId": "uuid",
  "amount": 10000,
  "description": "Project funding"
}
```
**Effect:** Adds money to engineer's wallet

### Get Engineer Balance
```http
GET /custody/balance/{engineerId}
```

### Get All Balances (Admin/Accountant)
```http
GET /custody/all
```

### Return Unused Cash (Engineer)
```http
POST /custody/return
{
  "amount": 1000,
  "description": "Returning unused funds"
}
```

---

## 📝 Transaction Workflow

### 1. Create Draft (Engineer)
```http
POST /transactions/draft
{
  "projectId": "uuid",
  "amount": 500,
  "category": "MATERIALS",
  "description": "Cement purchase"
}
```
**Effect:** Marks 500 EGP as "pending clearance"

### 2. Submit for Approval (Engineer)
```http
PUT /transactions/{id}/submit
{
  "receiptPhotoUrl": "https://...",
  "confirmedAmount": 500
}
```
**Effect:** Manager gets notification

### 3. Approve (Manager/Admin)
```http
PUT /transactions/{id}/approve
```
**Effect:** 
- Deducts from engineer wallet
- Deducts from project ops fund
- Adds to project cost
- Creates material batch (if materials)
- Notifies engineer

### 4. Reject (Manager/Admin)
```http
PUT /transactions/{id}/reject
{
  "reason": "Receipt unclear"
}
```
**Effect:** Returns to engineer, notifies them

---

## 🔔 Notifications

### Get My Notifications
```http
GET /notifications
```

### Mark as Read
```http
PUT /notifications/{id}/read
```

### Mark All as Read
```http
PUT /notifications/read-all
```

---

## 📊 Queries

### Get Pending Approvals (Manager)
```http
GET /transactions/pending
```

### Get All Transactions
```http
GET /transactions
```
**Note:** Auto-filtered by role:
- Engineer: sees only their own
- Manager: sees their projects
- Admin/Accountant: sees all

### Get Transaction Details
```http
GET /transactions/{id}
```

---

## 🧪 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@construction.com | password123 |
| Manager | manager@construction.com | password123 |
| Engineer | engineer@construction.com | password123 |
| Accountant | accountant@construction.com | password123 |

---

## 🔥 Quick Test Flow

```bash
# 1. Login as Admin
POST /auth/login
{ "email": "admin@construction.com", "password": "password123" }
# Save the token!

# 2. Fund engineer
POST /custody/transfer
{ "engineerId": "...", "amount": 10000 }

# 3. Login as Engineer
POST /auth/login
{ "email": "engineer@construction.com", "password": "password123" }

# 4. Create draft
POST /transactions/draft
{ "projectId": "...", "amount": 500, "category": "MATERIALS" }

# 5. Submit for approval
PUT /transactions/{id}/submit
{ "receiptPhotoUrl": "https://example.com/receipt.jpg" }

# 6. Login as Manager
POST /auth/login
{ "email": "manager@construction.com", "password": "password123" }

# 7. Get pending approvals
GET /transactions/pending

# 8. Approve transaction
PUT /transactions/{id}/approve

# 9. Check notifications
GET /notifications
```

---

## 📈 Expected Results

After completing the flow above:

```
Engineer Balance:
- Before: 10,000 EGP
- After: 9,500 EGP

Project:
- Ops Fund: -500 EGP
- Actual Cost: +500 EGP

Material Batch:
- Created with 500 EGP value
- Status: AVAILABLE

Notifications:
- Engineer: "Expense Approved"
- Manager: "New Expense Pending" (before approval)
```

---

## 🛡️ Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```
**Fix:** Add Authorization header with valid token

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access Denied. You do not have permission.",
  "requiredRoles": ["ADMIN"],
  "yourRole": "ENGINEER"
}
```
**Fix:** Use account with correct role

### 404 Not Found
```json
{
  "success": false,
  "message": "Transaction not found"
}
```
**Fix:** Check the ID is correct

### 400 Bad Request
```json
{
  "success": false,
  "message": "Insufficient available balance"
}
```
**Fix:** Check data validity

---

## 💡 Pro Tips

1. **Use Postman Collections**: Save all these requests in a collection
2. **Environment Variables**: Store token and IDs as variables
3. **Check Notifications**: After each action, call `GET /notifications`
4. **Monitor Balances**: Use `GET /custody/all` to see system state
5. **Test RBAC**: Try forbidden actions to verify security

---

**Start Testing:** `cd server && npm run dev` 🚀
