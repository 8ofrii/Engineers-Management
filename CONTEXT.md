# Engineers Management — Project Context

> **Purpose of this document**: this is the canonical "where are we?" doc. If you (or a future Claude session) need to pick up the work cold, read this first. It captures the project, every architectural decision, current state, and outstanding work as of the last commit on `main`.

Last updated: 2026-05-02 (Phase 1 foundations shipped)

---

## 1. What this project is

A **multi-tenant SaaS Construction ERP** for Egyptian engineering firms. Each tenant ("company") has its own Projects, Clients, Suppliers, Workmen, Materials, Transactions, etc. Users are scoped to a tenant. The product target is small-to-mid construction contractors in Egypt who currently track jobs in Excel.

### What makes it more than a generic accounting app

- **V1.2 "Profit on Expense" engine** — automatically transfers a configurable management fee from project safe balance to office revenue every time an expense is approved on a `EXECUTION_COST_PLUS` project. Inventory purchases defer profit until usage.
- **Bilingual + RTL** — Arabic-first UI with English fallback; transaction categories use Arabic construction terminology (خرسانات, مصنعية بناء, etc.).
- **Multi-currency-ready in spirit, EGP-only in practice** — all amounts shown as Egyptian pounds.
- **AI chat assistant** — voice notes (Whisper) → structured transactions; tool-calling (`record_transaction`, `get_financial_summary`).
- **S3 image uploads** — receipt photos, profile pictures, company logos.
- **Mobile companion** — React Native + Expo, same backend, role-aware screens.

---

## 2. Tech stack

### Backend (`server/`)

- **Node.js 20+ / 22 LTS** (Node 18 no longer supported by Expo SDK 54 toolchain)
- **Express** — HTTP server
- **Prisma 5.22** + **PostgreSQL** (hosted on Render)
- **Helmet** — security headers (CSP, HSTS, X-Frame-Options, COOP, COEP, CORP)
- **express-rate-limit** — global 1000 req/15min, stricter 20/15min on `/auth`
- **CORS** — whitelist via `CORS_ALLOWED_ORIGINS` env (production); permissive in dev
- **Zod** — input validation, schemas under `server/schemas/` act as field allowlists (kills mass assignment of `tenantId`, `actualCost`, `role`, etc.)
- **JWT** — auth via `Bearer <token>` headers
- **bcryptjs** — password hashing (10 rounds)
- **multer** + **multer-s3** — file uploads (S3 in prod, local fallback in dev)
- **OpenAI** — chat assistant (`gpt-4o-mini`) + Whisper voice transcription
- **Nodemailer** — SMTP email (verification OTP, password reset, invites)
- **pino** + **pino-http** — structured logging (dev-pretty / prod-JSON)
- **Vitest** + **supertest** — automated tests (35 schema unit tests passing)

### Frontend — Web (`client/`)

- **React 18** + **Vite** (port 5173 in dev)
- **React Router** — routing
- **Axios** — HTTP client (interceptors at `client/src/services/api.js`)
- **Recharts** — dashboard charts
- **i18next** + **react-i18next** — AR/EN translations
- **Lucide React** — icons
- Custom AlertContext for modal popups

### Frontend — Mobile (`mobile/`)

- **Expo SDK 54** (managed workflow)
- **React 19.1** / **React Native 0.81**
- **React Navigation v7** — bottom tabs + native stacks
- **AsyncStorage** — token + language persistence
- **Axios** — HTTP client mirrors web `api.js`
- **i18next** + **expo-localization** — AR/EN with RTL handling via `I18nManager`
- **@expo/vector-icons** — Ionicons throughout

### Infrastructure

- **GitHub** — `https://github.com/8ofry/Engineers-Management` (repo URL moved from `8ofrii`; old URL still redirects)
- **Render** — backend hosting + Postgres
- **AWS S3** — image uploads
- **Expo Go** — mobile dev distribution

---

## 3. Repository layout

```
Engineers-Management/
├── client/                       # React + Vite frontend
│   ├── src/
│   │   ├── components/           # Modals, layout, custom inputs
│   │   ├── pages/                # Login, Dashboard, Projects, Finance, Reports, etc.
│   │   ├── context/              # AuthContext, AlertContext
│   │   ├── services/api.js       # Axios client, all API endpoints
│   │   └── locales/{ar,en}.json  # Translations
│   └── package.json
│
├── server/                       # Express API
│   ├── server.js                 # App entry — helmet, rate limit, CORS, pino, routes
│   ├── prisma/
│   │   └── schema.prisma         # Database schema (15+ models)
│   ├── controllers/              # Route handlers
│   │   ├── transactionController.js     # Main + V1.2 (mounted)
│   │   ├── transactionControllerV2.js   # Profit-on-Expense engine — re-exported by V1
│   │   ├── authController.js, userController.js, clientController.js, ...
│   ├── routes/                   # Express routers (each mounts to /api/<resource>)
│   ├── middleware/
│   │   ├── auth.js               # JWT protect + role authorize
│   │   ├── rbac.js               # verifyRole + verifyOwnership helpers
│   │   ├── permissions.js        # Dynamic permission matrix checks
│   │   ├── validate.js           # Zod validation middleware
│   │   └── error.js              # Global error handler (Prisma + Zod aware)
│   ├── schemas/                  # Zod request schemas (13 of ~15 routes)
│   ├── lib/
│   │   ├── prisma.js             # Singleton Prisma client
│   │   └── logger.js             # Pino instance
│   ├── services/
│   │   ├── officeFeeService.js   # Fee calc + project/global override resolution
│   │   ├── aiService.js          # OpenAI voice + chat
│   │   └── ...
│   ├── tests/                    # Vitest schema unit tests
│   ├── scripts/                  # Operational scripts (see §6)
│   └── package.json
│
├── mobile/                       # Expo + React Native app
│   ├── App.js                    # Root: i18n + auth + navigation
│   ├── src/
│   │   ├── navigation/AppNavigator.js     # Bottom tabs + per-tab stacks
│   │   ├── screens/                       # 11 screens (see §10)
│   │   ├── context/AuthContext.js         # Login/logout + AsyncStorage
│   │   ├── services/api.js                # Mirrors web api.js shape
│   │   ├── i18n/index.js                  # Setup + RTL handling
│   │   └── locales/{ar,en}.json
│   ├── app.json, package.json, .env.example
│
├── CONTEXT.md                    # This file
├── TESTING-WEB.md                # Web testing plan
├── TESTING-LOG.md                # Running findings log
└── README.md                     # Original project README
```

---

## 4. Architecture & key decisions

### 4.1 Multi-tenancy

- Every domain table has a `tenantId String?` foreign key
- Every controller filters by `req.user.tenantId` — `prisma.x.findFirst({ where: { id, tenantId: req.user.tenantId } })` is the standard pattern
- Login resolves `req.user.tenantId` from the User record at JWT verify time
- Cross-tenant ID guess returns 404 (not 403 — don't leak existence)
- Same email is allowed across tenants: `User @@unique([email, tenantId])`
- The `register-company` flow creates a fresh tenant + admin in one transaction

### 4.2 Roles & RBAC

- Five hard-coded roles in `UserRole` enum: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `ENGINEER`, `ACCOUNTANT`
- Plus a custom **`Role`** model with a JSON permission matrix per tenant for dynamic permissions
- Two parallel guards in code:
  - `authorize(...roles)` from `middleware/auth.js` — coarse role check
  - `checkPermission(path)` from `middleware/permissions.js` — fine-grained matrix lookup
- **Privilege escalation guards in `userController`** (added in this session): only `SUPER_ADMIN` may grant/modify/delete a `SUPER_ADMIN`

### 4.3 V1.2 "Profit on Expense" — the financial heart

Implemented in `server/controllers/transactionControllerV2.js`. Re-exported by V1 controller at the bottom; routes hit the V2 handlers via `transactionController.createTransactionV2` etc.

For a project with `revenueModel: EXECUTION_COST_PLUS` and `managementFeePercent: 10`:

- **INCOME approved** → `projectSafeBalance += amount` (full amount lands in safe)
- **EXPENSE direct, approved** (non-inventory) → `safeBalance -= amount`, `actualCost += amount`. Then `profit = amount × 10%`; `safeBalance -= profit`, `officeRevenue += profit`. A `MANAGEMENT_FEE_TRANSFER` ledger transaction is auto-created.
- **EXPENSE inventory purchase, approved** → `safeBalance -= amount`, `actualCost += amount`, **MaterialBatch created** with `initialValue = remainingValue = amount`. **No profit yet** — deferred until usage.
- **Inventory usage** → `batch.remainingValue -= valueConsumed`. Then `profit = valueConsumed × 10%`; `safeBalance -= profit`, `officeRevenue += profit`. `MANAGEMENT_FEE_TRANSFER` ledger entry created.
- **Negative-balance alert** — when `safeBalance` goes below zero, a `Notification` is pushed to the project's engineer.

The other revenue models (`DESIGN_ONLY_AREA`, `EXECUTION_LUMP_SUM`) skip the auto profit transfer.

### 4.4 Validation strategy

Zod schemas at `server/schemas/*.schema.js` double as field allowlists. They use Zod's default `.strip()` mode: unknown fields are silently dropped before reaching Prisma. This kills **mass-assignment** of:
- `tenantId` (would break tenant isolation)
- `role`, `permissions`, `isVerified`, `isActive` (privilege escalation)
- `actualCost`, `officeRevenue`, `officeExpenses`, `projectSafeBalance` (financial integrity)
- `id`, `createdAt`, `updatedAt` (server-managed)

For multipart endpoints (auth/profile, tenant/logo, chat/audio), `validate()` runs **after** `multer.single(...)` so `req.body` is already populated.

### 4.5 Authentication flow

1. **Register company** → creates Tenant + Admin User (unverified). 6-digit OTP emailed (or returned as `devVerificationCode` in non-prod).
2. **Verify email** → `isVerified=true`, JWT issued.
3. **Login** → `findMany({ email })` then bcrypt match across users (since email is unique only per-tenant). JWT issued.
4. **Forgot password** → SHA256-hashed token mailed; reset endpoint requires the raw token + new password (full complexity check).
5. **Engineer invite** → admin/super-admin invites via `POST /api/users` with email + temp password. Verification token mailed.

### 4.6 Why pino, not winston/morgan

- **Faster** under load (pino's async transport)
- **JSON-native** — production log aggregators (Datadog, Logtail, Render's UI) parse JSON automatically
- **Per-request logger** via `pino-http` adds an auto-incrementing request ID, accessible as `req.log` in any controller
- **Secret redaction** built-in: `password`, `authorization`, `set-cookie` are scrubbed before logging

---

## 5. Current state — what's built and what works

### Backend (`server/`)

| Area | Status |
|---|---|
| Auth (register-company, verify-email, login, forgot/reset password, invite, profile) | ✅ Working |
| RBAC (5 hard-coded roles + dynamic Role model with JSON permissions) | ✅ Working |
| Multi-tenant isolation | ✅ Enforced everywhere |
| Projects CRUD + financials endpoint | ✅ Working |
| Clients/Suppliers/Workmen/Materials CRUD | ✅ Working |
| V1.2 Profit-on-Expense engine | ✅ Working (verified math in seed) |
| Inventory: MaterialBatch + MaterialUsage | ✅ Working |
| Custody (fund engineer, return, history, overdraft check) | ✅ Working |
| Notifications | ✅ Working |
| Office fee config (global + per-project overrides) | ✅ Working |
| Chat assistant + voice transcription | ✅ Working |
| Image upload to S3 | ✅ Working |
| Helmet + rate limit + CORS whitelist | ✅ Wired |
| Zod validation on 13 route groups | ✅ Wired |
| Privilege-escalation guards (SUPER_ADMIN) | ✅ Wired |
| Prisma-aware error handler | ✅ Wired |
| pino structured logger | ✅ Wired |
| 35 Vitest schema unit tests | ✅ Passing |

### Web (`client/`)

| Page | Status |
|---|---|
| Login, Register Company, Verify Email, Forgot/Reset Password | ✅ Working |
| Dashboard with stats + charts | ✅ Working |
| Projects (list, create, edit, delete, financials) | ✅ Working |
| Clients/Suppliers/Workmen/Materials | ✅ Working |
| Inventory (per-project material batches + usage) | ✅ Working |
| Finance (transactions list, filter, approve/reject) | ✅ Working |
| Reports (charts + CSV export with UTF-8 BOM) | ✅ Working |
| Company Settings (logo upload, etc.) | ✅ Working |
| Chat Assistant | ✅ Working |
| AR/EN with RTL | ✅ Working |
| Light/Dark theme | ✅ Working |

### Mobile (`mobile/`)

| Screen | Status |
|---|---|
| Login (with diagnostic API URL display) | ✅ Working |
| Bottom tab nav: Projects, Finance, Notifications, Profile | ✅ Working |
| Dashboard (project list with status badges + budget bars) | ✅ Working |
| Project Detail (info grid + financials + transactions) | ✅ Working |
| Finance (filter pills + approve/reject + FAB) | ✅ Working |
| Add Transaction (project + category modal pickers, inventory toggle) | ✅ Working |
| Notifications (read/unread, mark all read) | ✅ Working |
| Profile (avatar + custody balance + nav hub) | ✅ Working |
| Fund Engineer (admin-only, with current balance preview) | ✅ Working |
| Clients / Suppliers / Workmen (read-only directory) | ✅ Working |

---

## 6. How to run everything

### Backend

```cmd
cd server
npm install
npm run dev          # nodemon
# OR
npm start            # production-style
```

Required env vars (see `server/.env.example`):
- `DATABASE_URL` — Postgres connection string
- `JWT_SECRET`, `JWT_EXPIRE`
- `OPENAI_API_KEY` (chat + voice)
- `SMTP_*` (verification/reset emails)
- `AWS_*` + `AWS_S3_BUCKET` (S3 uploads)
- `CORS_ALLOWED_ORIGINS` (production only)

### Web

```cmd
cd client
npm install
npm run dev          # Vite on http://localhost:5173
```

### Mobile

```cmd
cd mobile
npm install
npx expo install --fix
npx expo start --clear
```

For physical-device testing:
- Edit `mobile/.env` → `EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:5000/api`
- Backend on Windows: ensure firewall allows inbound on port 5000

### Tests

```cmd
cd server
npm test             # 35 schema unit tests
npm run test:watch
npm run test:coverage
```

### Demo data

```cmd
cd server
node scripts/setup-test-users.js     # 1: create Demo Co tenant + 4 users
node scripts/seed-demo-data.js       # 2: populate with Egyptian construction data
node scripts/list-users.js           # diagnostic: who can/can't log in
```

### Test accounts (after seed)

All passwords: `Demo@1234`

| Role | Email |
|---|---|
| ADMIN | admin@demo.local |
| PROJECT_MANAGER | manager@demo.local |
| ENGINEER | engineer@demo.local |
| ACCOUNTANT | accountant@demo.local |

Demo data: 5 clients, 6 suppliers, 8 materials, 6 workmen, 3 projects (Villa in-progress / Office planning / Apartment completed), 17 transactions with V1.2 profit math applied, 1 cement batch 50% consumed, 3 custody transfers.

---

## 7. Demo project state (sanity check after `seed-demo-data.js`)

### Villa — `EXECUTION_COST_PLUS`, 10% management fee

- Budget: **2,500,000 EGP**
- Actual Cost: **455,000 EGP**
- Office Revenue: **35,500 EGP**
- Project Safe Balance: **309,500 EGP**
- One transaction in `PENDING_APPROVAL` (50,000 EGP carpentry awaiting manager)

If your numbers differ after seeding, the V1.2 math has drifted — investigate immediately.

### Math derivation

- Income: 500,000 + 300,000 = 800,000
- Direct expenses (with 10% fee): 150,000 + 80,000 + 25,000 = 255,000 → fee transfers 25,500
- Inventory purchase: 200,000 (creates batch, no profit yet)
- Inventory consumption: 100,000 → fee transfer 10,000
- Total fee transfers: 35,500 ✓ (matches officeRevenue)
- Safe = 800,000 − 255,000 − 25,500 − 200,000 − 10,000 = **309,500** ✓

---

## 8. Recent work (this session)

### Bugs fixed (verified)

1. **Login form blank, no error on wrong password** — `client/src/services/api.js` interceptor was redirecting on every 401, including the login attempt itself. Fixed by exempting auth-endpoint URLs from the auto-redirect.
2. **Signup `Database error (P2028)`** — `prisma.$transaction(async (prisma) => {...})` shadowed the outer client + no timeout. Renamed to `tx`, added `{ timeout: 15000, maxWait: 5000 }`.
3. **Manager sees no transactions on Finance page** — `getTransactions` was filtering PROJECT_MANAGER by `engineerId === manager.id`, but managers don't necessarily own projects. Removed the filter; managers/admins/accountants now see the full tenant.
4. **"Client Payment" appearing in Expenses by Category chart** — `getStats` lumped all transactions into `byCategory`. Now filters to `type === 'EXPENSE'` and excludes `MANAGEMENT_FEE_TRANSFER` ledger entries.
5. **Missing translation key `finance.categories.management_fee_transfer`** — added in both `ar.json` and `en.json`.

### Features delivered

- **Backend security hardening**: helmet, rate limit, CORS whitelist
- **Zod validation** on 13 route groups (auth, clients, projects, users, roles, workmen, notifications, tenant, chat, suppliers, materials, custody, office-fees)
- **Privilege-escalation guards** on user inviting/updating/deletion
- **Prisma-aware error handler** (P2002, P2003, P2025, P2014 mapped properly)
- **Structured logger** (pino) replacing morgan + console.log
- **35 Vitest schema unit tests** (mass-assignment defence proven)
- **Demo data seeder** with realistic Egyptian construction context
- **Mobile app** (React Native + Expo SDK 54): 11 screens, 4 tabs, AR/EN/RTL, custody management, fund engineer
- **Reports CSV export** wired up (UTF-8 BOM for Arabic)

---

## 9. Roadmap — what's next

### Phase 1 — Foundations *(complete)*
- [x] **Structured logger** (pino)
- [x] **Audit log model + helper** — `lib/audit.js`, wired into Client/Supplier/Material/Workman/Project + User invite/update/delete + Role create/update/delete + Custody fund/return + Transaction approve/reject/delete. `GET /api/audit-logs` (admin) + `GET /api/audit-logs/:entity/:entityId` (any tenant member).
- [x] **Soft delete pattern** — `deletedAt` on Client, Supplier, Material, Workman, Project. List/find queries filter `deletedAt: null`. Hard-delete replaced with `update({ deletedAt: new Date() })`. Records preserved for audit + future restore.

### Phase 2 — Quick UX wins *(complete)*
- [x] **Multi-level approval thresholds** — `Tenant.approvalThresholds Json?`, `lib/approvalThresholds.js` with `requiredRoleForAmount()`, `canAutoApprove()`, `ensureCanApprove()`, `validateThresholds()`. Defaults: ≤5k engineer / ≤50k manager / >50k admin. Wired into `createTransactionV2` (initial status decision) and `approveTransaction` (rank guard). Endpoints: `GET/PUT /api/tenant/approval-thresholds` (admin only). 19 unit tests covering edge cases.
- [x] **Restore endpoints** for soft-deleted records: `PUT /api/{clients,suppliers,materials,workmen,projects}/:id/restore` (admin/super-admin only). Audits `RESTORE` action.
- [x] **2FA (TOTP) for any user** — `User.totpSecret` + `User.totpEnabled`. `lib/totp.js` wraps otplib v13. Endpoints: `/api/auth/2fa/{status,enroll,confirm,disable,login}`. Two-step login: regular `/auth/login` returns `{ requires2FA, challengeToken }` if enabled; `/auth/2fa/login` redeems the challenge + 6-digit code for a full session token. QR code rendered server-side. Web page at `/security/two-factor` for self-service enroll/disable. 7 unit tests on the helper.
- [x] **Activity feed UI** — `/audit-log` (admin-only sidebar entry). Calls `GET /api/audit-logs` with filter UI (entity / action / userId), expandable per-entry detail showing `before` / `after` / `metadata` JSON, cursor pagination, color-coded action badges.

### Phase 3 — Photo & document logs *(complete)*
- [x] **Document model extended** — added `category` (DocumentCategory enum: PHOTO_PROGRESS / PHOTO_RECEIPT / PHOTO_DELIVERY / PHOTO_ISSUE / CONTRACT / PERMIT / DRAWING / REPORT / OTHER), `description`, `latitude`/`longitude` (decimal), `takenAt`, `uploadedBy`. Indexed on `(projectId, uploadedAt)` and `(category)`.
- [x] **Document endpoints** — `GET /api/project-documents/:projectId` (list, optional `?category=…`), `POST /api/project-documents/:projectId` (multipart upload, S3 or local fallback), `DELETE /api/documents/:id` (uploader / admin only). Audited as `Document CREATE` and `Document DELETE`.
- [x] **Receipt-photo upload** — `PATCH /api/transactions/:id/receipt` (multipart). Existing `receiptPhotoUrl` field on Transaction now has a real upload path. Audited as transaction `UPDATE` with field metadata.
- [x] **Web Project Documents page** — `/projects/:projectId/documents`. Camera/upload button, category picker, optional GPS-tag from browser geolocation, gallery view with category icons, lightbox for image preview, delete-with-confirm.
- [ ] **Receipt photo upload** on transactions (existing `receiptPhotoUrl` field — wire UI)
- [ ] **Site photos** per project with GPS + timestamp
- [ ] **Document model UI** (contracts, permits already in schema)

### Phase 4 — Daily Site Report (DSR)
- [ ] New `DailySiteReport` Prisma model
- [ ] Engineer mobile UI: photos, attendance, weather, hours, progress notes
- [ ] Manager web UI: review and acknowledge

### Phase 5 — Invoicing
- [ ] PDF template with tenant logo
- [ ] Auto-numbering (already exists: `Transaction.invoiceNumber`)
- [ ] Send via SMTP email
- [ ] WhatsApp Business API integration
- [ ] Paid / partial / overdue tracking

### Phase 6 — Operational
- [ ] **Bank reconciliation** (CSV import → match to transactions)
- [ ] **Subscription billing** (Stripe or Paymob, tied to existing `Tenant.subscriptionPlan`)
- [ ] **Sentry error monitoring**
- [ ] **Backup verification** (Render handles automatic backups; verify they're enabled)

### Explicitly NOT doing (unless we change our minds)

- ETA Tax Authority integration — *deferred per user request 2026-05-01*
- Multi-currency — Egypt SMEs operate in EGP only; complexity not worth it
- Offline mobile mode — engineers usually have 4G
- Generic CRM features — out of scope (this is an ERP, not a CRM)

---

## 10. Mobile screens — quick reference

| Screen | Path | Notes |
|---|---|---|
| Login | `mobile/src/screens/LoginScreen.js` | Shows API URL diagnostic + structured error box |
| Dashboard | `DashboardScreen.js` | Quick stats + tappable project cards |
| Project Detail | `ProjectDetailScreen.js` | Info grid + financials + transactions; "Add Transaction" deep-links to Finance tab pre-filled |
| Finance | `FinanceScreen.js` | Filter pills (All/Pending/Mine), approve/reject inline, FAB |
| Add Transaction | `AddTransactionScreen.js` | Type toggle, modal pickers for project + category, inventory checkbox |
| Notifications | `NotificationsScreen.js` | Read/unread, mark all read |
| Profile | `ProfileScreen.js` | Avatar + custody card + nav hub |
| Fund Engineer | `FundEngineerScreen.js` | Admin-only; pick engineer + amount + description |
| Clients | `ClientsScreen.js` | Read-only list |
| Suppliers | `SuppliersScreen.js` | Read-only list |
| Workmen | `WorkmenScreen.js` | Read-only list |

---

## 11. Conventions — where to look for X

| Question | Answer |
|---|---|
| Where do new API endpoints get registered? | `server/routes/<resource>.js`, mounted in `server/server.js` |
| Where do I add validation for a new endpoint? | Create `server/schemas/<resource>.schema.js`, wire `validate({ body: schema })` in the route |
| Where's the V1.2 profit math? | `server/controllers/transactionControllerV2.js` — `calculateAndTransferProfit` helper |
| Where do new translation strings go? | `client/src/locales/{ar,en}.json` (web) + `mobile/src/locales/{ar,en}.json` (mobile) |
| How do I add a new mobile screen? | Create file in `mobile/src/screens/`, register in `mobile/src/navigation/AppNavigator.js` (pick the right Stack) |
| Where are user-management security guards? | `server/controllers/userController.js` (SUPER_ADMIN guards on invite/update/delete) |
| How do I run automated tests? | `cd server && npm test` |
| How do I reset the demo data? | `cd server && node scripts/seed-demo-data.js` (it wipes Demo Co domain data first) |

---

## 12. Memory & gotchas (lived experience)

- **Login response is non-deterministic if the same email exists in multiple tenants with the same password** — `findMany({ email })` then iterating with bcrypt picks the first match. The demo seed uses unique emails to avoid this. Worth fixing later by accepting an optional tenant slug at login.
- **Two transaction controllers** — `transactionController.js` is the main file, `transactionControllerV2.js` holds the V1.2 engine. V1 re-exports V2's three functions at the bottom. Naming is misleading; rename to `profitEngine.js` someday.
- **Hand-written SQL migration** at `server/prisma/manual_v1_2_migration.sql` exists alongside Prisma migrations — drift risk between dev and prod. Audit before any deploy.
- **`server/find_users.js` and `server/test_accounting.js`** are legacy debug scripts. Kept for posterity but consider moving to `server/scripts/dev/` later.
- **Repository URL has moved** from `8ofrii` to `8ofry` on GitHub. Old URL still redirects on push. Run `git remote set-url origin https://github.com/8ofry/Engineers-Management.git` to update.
- **Windows + PowerShell**: scripts may be blocked by execution policy. Either `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use plain `cmd`.
- **Node 18 doesn't work** with Expo SDK 54. Mobile dev requires Node 20.19.4+ or 22 LTS. Backend works on 18 but should also be on 22 for consistency.

---

## 13. Where state lives

| Where | What |
|---|---|
| **Postgres on Render** | Single source of truth for tenants, users, projects, transactions, etc. |
| **AWS S3** | Receipt photos, profile pictures, company logos |
| **`server/uploads/`** | Local fallback for audio voice notes (deleted after AI processing) |
| **Browser localStorage** | JWT, user object, theme preference, language preference |
| **Mobile AsyncStorage** | Token, user object, language preference |
| **`server/.env`** | Secrets (NOT committed; gitignored) |
| **Render dashboard env vars** | Production secrets |

---

## 14. If you're picking this up cold

1. **Read this doc top to bottom** (15 min). You'll know more than 90% of the project.
2. **Read [TESTING-LOG.md](TESTING-LOG.md)** — running record of what's been tested and what's been fixed.
3. **Read [TESTING-WEB.md](TESTING-WEB.md)** — the master test plan.
4. **Start the backend, run `npm test`, eyeball the demo data**. If 35 tests pass and Villa shows safe=309,500, the system is healthy.
5. **Pick a phase from §9 and tell the team you're starting on it.**

---

*This document is the living source of truth. Update it whenever a phase moves from "planned" to "shipped", a model changes, or a non-obvious convention emerges. Date your updates at the top.*
