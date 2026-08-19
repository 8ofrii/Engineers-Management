# 🏢 Hesaby ERP (SiteEngineer) — Master Project Context & Knowledge Base

> **Note for Antigravity / AI Agents**: This document is the single source of truth for the entire Hesaby ERP ecosystem. Read this file first when opening this repository to understand the full system context, credentials, architecture, and current roadmap without requiring the user to re-explain anything.

---

## 📌 1. Project Overview & Core Mission
**Hesaby ERP** (`8ofry/Engineers-Management`) is a full-stack, enterprise-grade Construction & Engineering Management ERP system tailored for construction firms, project managers, and site engineers.

- **Frontend Web App**: React 19 + Vite + Tailwind CSS + Vanilla CSS (`client/`, Port 5173).
- **Backend API Server**: Node.js + Express + Prisma ORM + PostgreSQL + Sentry + Pino Logging (`server/`, Port 5000).
- **Mobile Companion App**: React Native (0.81) + Expo SDK 54 + React Navigation (`mobile/`, Port 8081).
- **Database**: Remote PostgreSQL on Windows Server (`148.251.171.147:5432/sitengineer`).
- **AI Engine**: Context-Aware AI Copilot with MicroMind backend & Gemini for OCR receipts and spoken audio notes.

---

## 👥 2. Roles, Permissions & Test Accounts
All test accounts are pre-seeded in the database:

| Role | Email | Password | Access / Scope |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@demo.local` | `Demo@1234` | Full access across all companies, billing, audit logs, and settings |
| **General Manager** | `manager@demo.local` | `Demo@1234` | Full company control, financial approvals, budgets, office fees |
| **Financial Manager** | `finance@demo.local` | `Demo@1234` | Ledger, transactions, bank reconciliation, invoices, payments |
| **Site Engineer** | `engineer@demo.local` | `Demo@1234` | Assigned projects, DSR daily site reports, custody wallet, drafts |
| **Viewer** | `viewer@demo.local` | `Demo@1234` | Read-only access to projects and reports |

---

## 🏗️ 3. Architecture & Technical Stack

### 💻 Web Client (`client/`)
- **Key Modules**:
  - `Projects.jsx` & `ProjectDetail`: Project budgets, actual costs, safe balances, and document manager.
  - `Finance.jsx` & `AddTransactionModal`: Multi-category double-entry bookkeeping, approval workflows.
  - `DailySiteReports.jsx`: Site attendance, weather logs, material deliveries, supervisor acknowledgment.
  - `Workforce.jsx` & `Inventory.jsx`: Labor wages, material batches, supplier invoices.
  - `BankReconciliation.jsx`: CSV parsing, transaction matching, reconciliation workflows.
  - `GlobalAIChatDrawer.jsx`: Always-available AI assistant drawer.

### ⚙️ Backend Server (`server/`)
- **Key Features**:
  - **Prisma Connection Pooling**: `connection_limit=10&pool_timeout=20` to prevent database connection exhaustion.
  - **Graceful Shutdown**: `SIGINT` / `SIGTERM` / `SIGUSR2` hooks to cleanly close database pools.
  - **RBAC & Approvals**: Role-based access control with approval threshold limits.
  - **Audit Logging**: Comprehensive activity tracking across all actions.

### 📱 Mobile App (`mobile/`)
- **Key Features**:
  - **18 Screens**: Full parity with web app for field operations.
  - **3 Curated Themes** (`ThemeContext.js`):
    1. 🌑 `monochrome`: Neutral charcoal & off-white (matches web).
    2. 🌿 `obsidian-emerald`: Onyx black & emerald mint accents.
    3. 🍎 `liquid-glass`: Authentic Apple macOS & iOS Liquid Glass (frosted acrylic translucency, specular rim highlights, ambient fluid lighting via `GlassBackground.js`, Cupertino blue `#0071e3`).
  - **AI Copilot FAB** (`DraftCaptureFAB.js`): Floating action button supporting AI chat, voice drafts, and camera receipt scanning.
  - **Auto-Refresh**: Live data syncing via `useFocusEffect` on all screens.
  - **Bilingual**: Full Arabic (RTL) and English (LTR) support (`i18n`).

---

## 🗄️ 4. PostgreSQL Database Configuration (`148.251.171.147`)
- **Config file**: `C:\Program Files\PostgreSQL\18\data\postgresql.conf`
- **Permanent connection leak protection settings applied**:
  ```ini
  max_connections = 200
  idle_session_timeout = 300000        # 5 minutes auto-close for idle sockets
  idle_in_transaction_session_timeout = 30000 # 30 seconds for hung transactions
  ```
- **Service control**: `Get-Service *postgres* | Restart-Service`

---

## 🚀 5. How to Run the Servers Locally / On Remote Server

### Start Backend API:
```bash
cd server
npm run dev
# Listens on http://localhost:5000 and network interface
```

### Start Web Client:
```bash
cd client
npm run dev -- --host
# Listens on http://localhost:5173
```

### Start Mobile Bundler:
```bash
cd mobile
npx expo start --lan -c
# Direct Wi-Fi LAN on port 8081
```

---

## 📋 6. Next Steps & Production Deployment Roadmap
1. **Domain Purchase & DNS Configuration**:
   - Point domain (e.g. `hesaby.com` or `app.hesaby.com`) `A` record to server IP (`148.251.171.147`).
2. **Reverse Proxy (Nginx or Caddy / IIS)**:
   - Configure SSL (Let's Encrypt / Certbot).
   - Route `/api/*` to Node.js on `localhost:5000`.
   - Route `/*` to built static React client (`client/dist`).
3. **Production Process Manager**:
   - Run backend via PM2: `pm2 start server.js --name "hesaby-api" -i max`.
4. **Mobile App Store Release**:
   - Refer to `docs/APP_STORE_RELEASE_GUIDE.md` for EAS production builds (`eas build -p android` & `eas build -p ios`).
