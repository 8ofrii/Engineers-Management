# 🔐 Test Login Accounts

## Quick Access Credentials

### 👤 ADMIN Account
```
Email: admin@construction.com
Password: password123
Role: Full system access
```

### 👔 PROJECT MANAGER Account (NEW)
```
Email: manager@construction.com
Password: password123
Role: Approval Queue, Transaction Reviews
```

### 🔧 ENGINEER Account
```
Email: engineer@construction.com
Password: password123
Role: Projects, Materials, Workmen, Voice Input, Custody Wallet
```

### 💰 ACCOUNTANT Account
```
Email: accountant@construction.com
Password: password123
Role: Finance, Transactions, Reports, Income Splitting
```

---

## How to Create These Accounts

### Option 1: Run Seed Script (Recommended)
```bash
cd "E:\Dood 123\server"
node prisma/seed.js
```

### Option 2: Manual Registration
1. Go to http://localhost:5173/signup
2. Fill in the form
3. Click "Create Account"
4. You'll be logged in automatically

---

## Color Theme Updated ✨

The app now uses a **Construction/Engineering** color scheme:
- **Primary**: Construction Orange (#F26522)
- **Secondary**: Steel Blue
- **Accent**: Safety Green
- **Warning**: Caution Yellow

---

## What Changed:
✅ Construction orange primary color
✅ Full-width login button
✅ Better visual hierarchy
✅ Professional engineering theme

---

## Next Steps:

1. **Start the server** (if not running):
   ```bash
   cd "E:\Dood 123\server"
   npm run dev
   ```

2. **Make sure you have PostgreSQL connection** in `.env`

3. **Run migrations**:
   ```bash
   npm run prisma:migrate
   ```

4. **Seed the database**:
   ```bash
   node prisma/seed.js
   ```

5. **Login with any account above!**

---

**Note**: All test accounts use the same password: `password123`
