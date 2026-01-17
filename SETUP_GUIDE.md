# Construction ERP - Complete Setup Guide

## 🎯 Overview
This is a complete Construction ERP system with:
- **PostgreSQL Database** with Prisma ORM
- **Arabic/English** bilingual support with RTL
- **Engineering Module**: Materials, Workmen, Workmanship
- **Accounting Module**: Transactions, Ledger, Financial Reports
- **Role-Based Access**: Admin, Engineer, Accountant

---

## 📋 Prerequisites

Before starting, ensure you have:
1. **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
2. **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
3. **npm** or **yarn** package manager

---

## 🚀 Step-by-Step Setup

### Step 1: Install Dependencies

#### Server Dependencies
```bash
cd "E:\Dood 123\server"
npm install
```

#### Client Dependencies
```bash
cd "E:\Dood 123\client"
npm install
```

---

### Step 2: Configure PostgreSQL Database

#### Option A: Local PostgreSQL

1. **Start PostgreSQL** service on your machine
2. **Create a database**:
   ```sql
   CREATE DATABASE construction_erp;
   ```

3. **Update connection string** in `E:\Dood 123\server\.env`:
   ```env
   DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/construction_erp?schema=public"
   ```
   
   Replace:
   - `YOUR_USERNAME` with your PostgreSQL username (default: `postgres`)
   - `YOUR_PASSWORD` with your PostgreSQL password

#### Option B: Cloud PostgreSQL (Recommended for Production)

Use services like:
- **Supabase** (Free tier available) - [supabase.com](https://supabase.com)
- **Neon** (Free tier available) - [neon.tech](https://neon.tech)
- **Railway** - [railway.app](https://railway.app)

Get your connection string and update `.env` file.

---

### Step 3: Initialize Prisma & Database

```bash
cd "E:\Dood 123\server"

# Generate Prisma Client
npm run prisma:generate

# Run database migrations (creates all tables)
npm run prisma:migrate

# (Optional) Open Prisma Studio to view database
npm run prisma:studio
```

---

### Step 4: Start the Application

#### Terminal 1 - Start Backend Server
```bash
cd "E:\Dood 123\server"
npm run dev
```

You should see:
```
Server running in development mode on port 5000
```

#### Terminal 2 - Start Frontend Client
```bash
cd "E:\Dood 123\client"
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### Step 5: Access the Application

1. **Open your browser** (Chrome, Edge, Firefox)
2. **Navigate to**: `http://localhost:5173`
3. **Create an account** (Sign Up page)
4. **Start using the system!**

---

## 🌐 Language Switching

The app supports **English** and **Arabic**:

1. Look for the **language toggle** button in the top bar
2. Click to switch between EN ↔ AR
3. The entire UI will flip to RTL (Right-to-Left) for Arabic
4. Your choice is saved in browser localStorage

---

## 👥 User Roles

### Admin
- Full access to everything
- Can manage users, projects, and all data

### Engineer
- Manage projects, materials, workmen
- Track workmanship (Musanaiyah)
- **Cannot see** profit margins or detailed accounting

### Accountant
- Full financial access
- Manage transactions, invoices, payments
- View reports and ledgers
- **Cannot modify** engineering specifications

---

## 📊 Database Schema

The system includes these main models:

### Core Entities
- **User** - Authentication & roles
- **Client** - Customer management
- **Supplier** - Vendor management
- **Project** - Construction projects

### Engineering Module
- **Material** - Raw materials inventory (cement, steel, etc.)
- **MaterialUsage** - Track material consumption per project
- **Workman** - Labor force (carpenters, masons, etc.)
- **Workmanship** - Contracted work with payment tracking

### Accounting Module
- **Transaction** - All financial movements (income/expense)
- **Document** - File attachments
- **ChatMessage** - Conversational data entry

---

## 🔧 Troubleshooting

### Database Connection Issues

**Error**: `Can't reach database server`

**Solution**:
1. Ensure PostgreSQL is running
2. Check your DATABASE_URL in `.env`
3. Verify username/password are correct
4. Test connection: `psql -U postgres -d construction_erp`

### Port Already in Use

**Error**: `Port 5000 is already in use`

**Solution**:
1. Change PORT in `server/.env` to another port (e.g., 5001)
2. Update CLIENT_URL if needed
3. Restart the server

### Prisma Migration Errors

**Error**: `Migration failed`

**Solution**:
```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Then run migrations again
npm run prisma:migrate
```

---

## 📱 Features Overview

### 1. Dashboard
- Real-time statistics
- Financial overview
- Project status
- Charts and graphs

### 2. Projects Management
- Create/edit projects
- Track budget vs actual cost
- Assign engineers
- Link to clients

### 3. Materials Inventory
- Add raw materials
- Track stock levels
- Set reorder points
- Record usage per project

### 4. Workmen & Workmanship
- Manage labor force
- Track daily rates
- Contract work (Musanaiyah)
- Payment tracking (agreed vs paid)

### 5. Accounting
- Income/Expense transactions
- Debit/Credit ledger
- Financial reports
- Invoice management

### 6. Chat Assistant
- Text or voice input
- Natural language data entry
- Intent detection
- Quick commands

### 7. Reports
- Financial analytics
- Expense breakdowns
- Income vs expenses
- Export capabilities

---

## 🔐 Security Features

- JWT token authentication
- Password hashing (bcrypt)
- Role-based access control
- Protected API routes
- Input validation (Zod)
- SQL injection prevention (Prisma)

---

## 📝 Environment Variables

### Server (.env)
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
JWT_EXPIRE=7d
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
CLIENT_URL=http://localhost:5173
```

### Client (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🎨 Customization

### Change Colors
Edit `client/src/index.css` - `:root` section

### Add New Language
1. Create `client/src/locales/[lang].json`
2. Add to `client/src/utils/i18n.js`
3. Update language selector

### Modify Database Schema
1. Edit `prisma/schema.prisma`
2. Run `npm run prisma:migrate`
3. Update controllers/API

---

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review error messages carefully
3. Check browser console (F12)
4. Check server terminal output

---

## 🎉 You're All Set!

Your Construction ERP system is now ready to use. Start by:
1. Creating your first project
2. Adding some clients
3. Recording materials
4. Tracking transactions

**Happy Building! 🏗️**
