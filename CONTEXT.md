# Engineers Management — Project Context

> **Purpose**: this is the canonical "where are we?" doc. If a fresh Claude session needs to pick up the work cold, **read this first**. It captures the project, every architectural decision, current state, and outstanding work as of the most recent local commit.

**Last updated:** 2026-05-03 — Phase 7.1 + 7.2 backend (AI voice + receipt extraction → draft transactions) shipped. Phase 6.1 Sentry already pushed.

---

## 1. What this project is

A **multi-tenant SaaS Construction ERP** for Egyptian engineering firms. Each tenant ("company") has its own Projects, Clients, Suppliers, Workmen, Materials, Transactions, DSRs, Invoices, etc. Users are scoped to a tenant. The product target is small-to-mid construction contractors in Egypt who currently track jobs in Excel.

### What makes it more than a generic accounting app

- **V1.2 "Profit on Expense" engine** — automatically transfers a configurable management fee from project safe balance to office revenue when an expense is approved on `EXECUTION_COST_PLUS` projects. Inventory purchases defer profit until usage.
- **Daily Site Reports (DSR)** — engineers log daily progress, weather, attendance, photos, issues from mobile. Managers review and acknowledge from web.
- **Invoicing with PDF + email** — auto-numbered invoices (`INV-YYYY-NNNN`), professional PDF generation via pdfkit, send by email with PDF attached, partial-payment tracking.
- **Bilingual + RTL** — Arabic-first UI with English fallback; transaction categories use Arabic construction terminology (خرسانات, مصنعية بناء, etc.).
- **AI chat assistant** — voice notes (Whisper) → structured transactions; tool-calling (`record_transaction`, `get_financial_summary`).
- **S3 image uploads** — receipt photos, profile pictures, company logos, project documents.
- **Mobile companion** — React Native + Expo, same backend, full DSR capture with camera + GPS-tagged photos.

---

## 2. Tech stack

### Backend (`server/`)

- **Node.js 20+ / 22 LTS** (Node 18 no longer works with the Expo SDK 54 toolchain, and is EOL)
- **Express** — HTTP server
- **Prisma 5.22** + **PostgreSQL** (hosted on Render)
- **Helmet** — security headers (CSP, HSTS, X-Frame-Options, COOP, COEP, CORP)
- **express-rate-limit** — global 1000 req/15min, stricter 20/15min on `/auth`
- **CORS** — whitelist via `CORS_ALLOWED_ORIGINS` env (production); permissive in dev
- **Zod** — input validation, schemas under `server/schemas/` act as field allowlists (kills mass assignment)
- **JWT** — auth via `Bearer <token>` headers; separate 5-min `purpose: '2fa'` challenge tokens
- **bcryptjs** — password hashing (10 rounds)
- **otplib** + **qrcode** — TOTP 2FA
- **multer** + **multer-s3** — file uploads (S3 in prod, local fallback in dev)
- **pdfkit** — invoice PDF generation (pure JS, no Chromium)
- **OpenAI** — chat assistant (`gpt-4o-mini`) + Whisper voice transcription
- **Nodemailer** — SMTP email (verification, password reset, invites, **invoice PDFs**)
- **pino** + **pino-http** — structured logging (dev-pretty / prod-JSON)
- **Vitest** + **supertest** — automated tests (**75 unit tests** passing as of 2026-05-02)

### Frontend — Web (`client/`)

- **React 18** + **Vite** (port 5173 in dev)
- **React Router** — routing
- **Axios** — HTTP client (`client/src/services/api.js`)
- **Recharts** — dashboard charts
- **i18next** + **react-i18next** — AR/EN translations
- **Lucide React** — icons
- Custom AlertContext for modal popups

### Frontend — Mobile (`mobile/`)

- **Expo SDK 54** (managed workflow)
- **React 19.1** / **React Native 0.81** / **React Navigation v7** (bottom tabs + native stacks)
- **AsyncStorage** — token + language persistence
- **Axios** — HTTP client mirrors web
- **i18next** + **expo-localization** — AR/EN with `I18nManager` RTL handling
- **expo-image-picker** — camera + library photo capture for DSR
- **@expo/vector-icons** — Ionicons throughout

### Infrastructure

- **GitHub** — `https://github.com/8ofry/Engineers-Management` (URL moved from `8ofrii`; old URL still redirects)
- **Render** — backend + Postgres
- **AWS S3** — image uploads
- **Expo Go** — mobile dev distribution

---

## 3. Repository layout

```
Engineers-Management/
├── client/                       # React + Vite frontend
│   ├── src/
│   │   ├── components/           # Modals, layout, custom inputs
│   │   ├── pages/                # Login, Dashboard, Projects, Finance, Reports, ...
│   │   │   ├── Invoices.jsx              # Phase 5 — invoice list/create/view/send
│   │   │   ├── DailySiteReports.jsx      # Phase 4 — DSR review (manager-side)
│   │   │   ├── ProjectDocuments.jsx      # Phase 3 — photo/doc upload per project
│   │   │   ├── AuditLog.jsx              # Phase 1+2 — admin activity feed
│   │   │   ├── TwoFactorSettings.jsx     # Phase 2 — 2FA enroll/disable
│   │   ├── context/              # AuthContext (with 2FA support), AlertContext
│   │   ├── services/api.js       # Axios client + every API helper
│   │   └── locales/{ar,en}.json
│   └── package.json
│
├── server/                       # Express API
│   ├── server.js                 # App entry — helmet, rate limit, CORS, pino, all routes
│   ├── prisma/
│   │   └── schema.prisma         # 18+ models including Invoice + DSR + AuditLog
│   ├── controllers/              # Route handlers
│   │   ├── transactionController.js     # Main + V1.2 (mounted)
│   │   ├── transactionControllerV2.js   # Profit-on-Expense engine — re-exported by V1
│   │   ├── invoiceController.js         # Phase 5
│   │   ├── dsrController.js             # Phase 4
│   │   ├── documentController.js        # Phase 3
│   │   ├── auditLogController.js        # Phase 1
│   │   ├── authController.js            # incl. 2FA endpoints (Phase 2)
│   │   ├── userController.js, clientController.js, ...
│   ├── routes/                   # Express routers
│   │   ├── invoices.js                  # Phase 5
│   │   ├── dsr.js                       # Phase 4
│   │   ├── documents.js                 # Phase 3 (two routers — projectDocs + docs)
│   │   ├── auditLogs.js                 # Phase 1
│   │   ├── auth.js (incl. 2FA), ...
│   ├── middleware/
│   │   ├── auth.js               # JWT protect + role authorize
│   │   ├── rbac.js               # verifyRole + verifyOwnership helpers
│   │   ├── permissions.js        # Dynamic permission matrix checks
│   │   ├── validate.js           # Zod validation middleware
│   │   └── error.js              # Global error handler (Prisma + Zod aware)
│   ├── schemas/                  # Zod request schemas (one per resource)
│   ├── lib/
│   │   ├── prisma.js             # Singleton Prisma client
│   │   ├── logger.js             # Pino instance
│   │   ├── audit.js              # Phase 1 — audit() + auditFromReq() helpers
│   │   ├── approvalThresholds.js # Phase 2 — multi-level approval rank logic
│   │   ├── totp.js               # Phase 2 — otplib v13 wrapper
│   │   └── invoicePdf.js         # Phase 5 — pdfkit invoice renderer
│   ├── services/
│   │   ├── officeFeeService.js, aiService.js, ...
│   ├── tests/                    # Vitest schema unit tests (75 tests)
│   ├── scripts/                  # Operational scripts (see §6)
│   └── package.json
│
├── mobile/                       # Expo + React Native app
│   ├── App.js
│   ├── src/
│   │   ├── navigation/AppNavigator.js     # 5 bottom tabs + per-tab stacks
│   │   ├── screens/                       # 14 screens
│   │   │   ├── DSRListScreen.js, DSRDetailScreen.js, DSRCreateScreen.js  # Phase 4
│   │   │   ├── DashboardScreen.js, ProjectDetailScreen.js
│   │   │   ├── FinanceScreen.js, AddTransactionScreen.js
│   │   │   ├── NotificationsScreen.js, ProfileScreen.js
│   │   │   ├── FundEngineerScreen.js, ClientsScreen.js, SuppliersScreen.js, WorkmenScreen.js
│   │   │   ├── LoginScreen.js
│   │   ├── context/AuthContext.js         # Login/logout + AsyncStorage
│   │   ├── services/api.js                # Mirrors web api.js shape
│   │   ├── i18n/index.js                  # Setup + RTL handling
│   │   └── locales/{ar,en}.json
│   ├── app.json, package.json, .env.example
│
├── CONTEXT.md                    # This file — single source of truth
├── TESTING-WEB.md                # Web testing plan (470 lines, 20 sections)
├── TESTING-LOG.md                # Running findings log
└── README.md                     # Original project README
```

---

## 4. Architecture & key decisions

### 4.1 Multi-tenancy

- Every domain table has a `tenantId String?` foreign key
- Every controller filters by `req.user.tenantId` — `prisma.x.findFirst({ where: { id, tenantId: req.user.tenantId } })` is the standard pattern
- Cross-tenant ID guess returns 404 (don't leak existence)
- Same email is allowed across tenants: `User @@unique([email, tenantId])`

### 4.2 Roles & RBAC

- Five hard-coded `UserRole` enum values: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `ENGINEER`, `ACCOUNTANT`
- Plus a custom **`Role`** model with a JSON permission matrix per tenant for dynamic permissions
- **Privilege escalation guards** in `userController` (Phase 2): only `SUPER_ADMIN` may grant/modify/delete a `SUPER_ADMIN`
- **Multi-level approval thresholds** (Phase 2): config-driven amount tiers decide who can auto-approve / approve a transaction. Defaults: ≤5k engineer / ≤50k manager / >50k admin.

### 4.3 V1.2 "Profit on Expense" — the financial heart

Implemented in `server/controllers/transactionControllerV2.js`. Re-exported by V1; routes hit V2 handlers via `transactionController.createTransactionV2` etc. See §7 for the verified math.

### 4.4 Validation strategy

Zod schemas at `server/schemas/*.schema.js` double as field allowlists. They use Zod's default `.strip()` mode: unknown fields are silently dropped before reaching Prisma. This kills **mass-assignment** of: `tenantId`, `role`, `permissions`, `isVerified`, `isActive`, `actualCost`, `officeRevenue`, `paidAmount` (invoice), etc.

### 4.5 Authentication flow

1. **Register company** → creates Tenant + Admin User. 6-digit OTP emailed (returned as `devVerificationCode` in non-prod).
2. **Verify email** → `isVerified=true`, JWT issued.
3. **Login** → if `totpEnabled`, returns `{ requires2FA, challengeToken }`; otherwise full session token.
4. **2FA login** → `POST /api/auth/2fa/login` with challenge + 6-digit code.
5. **2FA enroll/confirm/disable** → endpoints under `/api/auth/2fa/*`.
6. **Forgot password** → SHA256-hashed token mailed.
7. **Engineer invite** → admin/super-admin invites via `POST /api/users`.

### 4.6 Soft delete + audit log

- **Soft delete** on Project, Client, Supplier, Material, Workman: `deletedAt DateTime?`. List/find queries filter `deletedAt: null`. DELETE endpoints become `update({ deletedAt: new Date() })`. **Restore endpoints**: `PUT /api/{resource}/:id/restore` (admin only).
- **Audit log**: every meaningful mutation writes an `AuditLog` row with `before` / `after` snapshots, sanitized for secrets via `lib/audit.js`. Read via `GET /api/audit-logs` (admin) or `GET /api/audit-logs/:entity/:entityId` (any tenant member).

### 4.7 Document & photo system

- `Document` model with `category` enum (PHOTO_PROGRESS / PHOTO_RECEIPT / PHOTO_DELIVERY / PHOTO_ISSUE / CONTRACT / PERMIT / DRAWING / REPORT / OTHER), GPS coordinates, `takenAt`, `uploadedBy`.
- Endpoints: `GET/POST /api/project-documents/:projectId`, `DELETE /api/documents/:id`.
- Receipt-photo upload on transactions: `PATCH /api/transactions/:id/receipt`.
- DSR photos: uploaded as documents first, then DSR's `photoIds` JSON array references them.

### 4.8 Daily Site Report (DSR)

- `DailySiteReport` model with state machine: DRAFT → SUBMITTED → ACKNOWLEDGED.
- Unique `(projectId, reportDate)` constraint — one report per project per day.
- Json fields for `workmenAttendance`, `materialsReceived`, `photoIds`.
- Engineer creates from mobile (`DSRCreateScreen` with camera + GPS), submits → manager acknowledges via web `/dsr` page.

### 4.9 Invoicing (Phase 5)

- `Invoice` model with line items (Json), per-tenant auto-numbering `INV-YYYY-NNNN`.
- State machine: DRAFT → SENT → PARTIALLY_PAID → PAID; CANCELLED can be set from any state except PAID.
- PDF generation via pdfkit (`lib/invoicePdf.js`) — pure JS, no Chromium.
- Email send: pdfkit Buffer attached via nodemailer.
- Egyptian VAT default 14% in the create form; tenant-configurable per-invoice.

---

## 5. Current state — what's built and what works

### Backend (`server/`)

| Area | Status | Phase |
|---|---|---|
| Auth (register, verify, login, forgot/reset) | ✅ | Pre-existing |
| **2FA (TOTP enroll/login/disable)** | ✅ | 2 |
| RBAC (5 hard-coded roles + dynamic Role model) | ✅ | Pre-existing |
| Multi-tenant isolation | ✅ | Pre-existing |
| **Privilege-escalation guards** (SUPER_ADMIN) | ✅ | 2 |
| **Multi-level approval thresholds** | ✅ | 2 |
| Projects CRUD + financials | ✅ | Pre-existing |
| **Soft delete + restore on Client/Supplier/Material/Workman/Project** | ✅ | 1 |
| Clients/Suppliers/Workmen/Materials CRUD | ✅ | Pre-existing |
| V1.2 Profit-on-Expense engine | ✅ | V1.2 |
| Inventory: MaterialBatch + MaterialUsage | ✅ | V1.2 |
| Custody (fund / return / overdraft check) | ✅ | Pre-existing |
| Notifications | ✅ | Pre-existing |
| Office fee config (global + per-project) | ✅ | V1.2 |
| Chat assistant + voice transcription | ✅ | Pre-existing |
| Image upload to S3 | ✅ | Pre-existing |
| Helmet + rate limit + CORS whitelist | ✅ | Pre-existing security audit |
| Zod validation on 14 route groups | ✅ | Pre-existing security audit |
| **Prisma-aware error handler** | ✅ | 1 |
| **pino structured logger** | ✅ | 1 |
| **AuditLog model + helper, wired to all mutations** | ✅ | 1 |
| `GET /api/audit-logs` (admin) + `:entity/:entityId` | ✅ | 1 |
| **Document model + photo upload** | ✅ | 3 |
| **Receipt-photo on transaction** (PATCH) | ✅ | 3 |
| **DailySiteReport model + 7 endpoints** | ✅ | 4 |
| **Invoice model + 9 endpoints + PDF + email** | ✅ | 5 |
| **75 Vitest schema unit tests** (35 + 19 thresholds + 7 totp + 14 invoices) | ✅ | All |

### Web (`client/`)

| Page | Path | Status |
|---|---|---|
| Login | `/login` | ✅ + 2FA branch |
| Register Company | `/signup` | ✅ |
| Verify Email / Reset / Forgot | various | ✅ |
| Dashboard | `/dashboard` | ✅ |
| Projects (list, CRUD, financials) | `/projects` | ✅ |
| Clients/Suppliers/Workmen/Materials | various | ✅ |
| Inventory | `/inventory` | ✅ |
| Finance (transactions list/approve) | `/finance` | ✅ |
| Reports + CSV export | `/reports` | ✅ |
| Company Settings | `/settings` | ✅ |
| Chat Assistant | `/chat` | ✅ |
| Team Management | `/team` | ✅ |
| **Two-Factor Settings** | `/security/two-factor` | ✅ Phase 2 |
| **Activity Log** (admin) | `/audit-log` | ✅ Phase 1+2 |
| **Project Documents** | `/projects/:id/documents` | ✅ Phase 3 |
| **Daily Site Reports** | `/dsr` | ✅ Phase 4 |
| **Invoices** | `/invoices` | ✅ Phase 5 |
| AR/EN with RTL | global | ✅ |
| Light/Dark theme | global | ✅ |

### Mobile (`mobile/`)

| Screen | Status | Phase |
|---|---|---|
| Login (with diagnostic + 2FA stub) | ✅ | Pre-existing |
| Bottom tabs (Projects / Finance / DSR / Notifications / Profile) | ✅ | 4 |
| Dashboard | ✅ | Pre-existing |
| Project Detail | ✅ | Pre-existing |
| Finance + Add Transaction | ✅ | Pre-existing |
| Notifications | ✅ | Pre-existing |
| Profile (with custody balance) | ✅ | Pre-existing |
| Fund Engineer | ✅ | Pre-existing |
| Clients / Suppliers / Workmen | ✅ | Pre-existing |
| **DSR List** + filter pills | ✅ | 4 |
| **DSR Detail** + manager acknowledge | ✅ | 4 |
| **DSR Create** with camera + library + attendance picker | ✅ | 4 |
| Invoicing (mobile) | ⏭️ pending | 5 |

---

## 6. How to run everything

### Backend

```cmd
cd server
npm install
npm run dev          # nodemon
```

Required env vars (see `server/.env.example`):
- `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRE`
- `OPENAI_API_KEY` (chat + voice)
- `SMTP_*` (verification/reset/invoice emails)
- `AWS_*` + `AWS_S3_BUCKET` (S3 uploads)
- `CORS_ALLOWED_ORIGINS` (production only)
- `LOG_LEVEL` (optional; defaults debug in dev / info in prod)

### Web

```cmd
cd client
npm install
npm run dev          # http://localhost:5173
```

### Mobile

```cmd
cd mobile
npm install
npx expo install --fix       # IMPORTANT after package.json changes
npx expo start --clear
```

For **physical-device testing**:
- Edit `mobile/.env` → `EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:5000/api`
- Backend on Windows: ensure firewall allows inbound on port 5000

### Tests

```cmd
cd server
npm test                # 75 schema/lib unit tests
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

Demo data: 5 clients, 6 suppliers, 8 materials, 6 workmen, 3 projects (Villa in-progress / Office planning / Apartment completed), 17 transactions with V1.2 profit math, 1 cement batch 50% consumed, 3 custody transfers.

---

## 7. Demo project state (sanity check after `seed-demo-data.js`)

### Villa — `EXECUTION_COST_PLUS`, 10% management fee

- Budget: **2,500,000 EGP**
- Actual Cost: **455,000 EGP**
- Office Revenue: **35,500 EGP**
- Project Safe Balance: **309,500 EGP**
- One transaction in `PENDING_APPROVAL` (50,000 EGP carpentry awaiting manager)

If your numbers differ after seeding, V1.2 math has drifted — investigate.

### Math derivation

- Income: 500,000 + 300,000 = 800,000
- Direct expenses (with 10% fee): 150,000 + 80,000 + 25,000 = 255,000 → fee transfers 25,500
- Inventory purchase: 200,000 (creates batch, no profit yet)
- Inventory consumption: 100,000 → fee transfer 10,000
- Total fee transfers: 35,500 ✓ (matches officeRevenue)
- Safe = 800,000 − 255,000 − 25,500 − 200,000 − 10,000 = **309,500** ✓

---

## 8. Phases & roadmap

### ✅ Completed phases

| Phase | What | Commit |
|---|---|---|
| **Pre-existing security audit** | helmet, rate limit, CORS whitelist, Zod validation, privilege-escalation guards, Prisma error handler | pushed earlier |
| **V1.2 Profit on Expense** | transactionControllerV2, MaterialBatch, profit-on-expense math, AR categories, frontend modals | pushed earlier |
| **1 — Foundations** | structured logger (pino), AuditLog + soft delete + restore endpoints | pushed earlier |
| **2 — Quick UX wins** | multi-level approvals, restore endpoints, **2FA TOTP**, **Activity Feed UI** | local |
| **3 — Photo & document logs** | Document extensions (GPS, category, takenAt), upload/list/delete API, web Project Documents page, receipt-photo upload | local |
| **4 — Daily Site Report** | DSR Prisma model + 7 endpoints, web review page, mobile list+detail+acknowledge, **mobile capture flow with camera + library + attendance picker + photo upload chain** | local |
| **5 — Invoicing** | Invoice Prisma model, 9 endpoints, **PDF generation via pdfkit**, **email-with-PDF-attachment**, web Invoices page (list + form + send + payment + cancel + delete) | local |

### 🟡 In progress — Phase 7 (AI extraction → draft transactions)

The flagship UX feature — engineers on-site speak or photograph a receipt and the form pre-fills. v1 wires direct to OpenAI behind a service abstraction (`server/services/aiService.js`) so we can swap in OpenRouter or MicroMind orchestration later without touching controllers.

| Track | Status | Commit |
|---|---|---|
| **7.1 — Voice → draft (backend)** | ✅ shipped (with persistence + matching) | local |
| **7.2 — Receipt photo → draft (backend)** | ✅ shipped (with persistence + matching) | local |
| **7.2.5 — Draft persistence + matching layer** | ✅ shipped | local |
| **7.2.6 — Draft CRUD endpoints** | ✅ shipped | local |
| 7.3 — Web UI: voice + photo buttons + draft review screen | ⏭️ next | — |
| 7.4 — Mobile UI: same in AddTransactionScreen | ⏭️ pending | — |
| 7.5 — Cost guardrails (per-tenant cap, observability) | ⏭️ pending | — |
| 7.6 — MicroMind / OpenRouter binding | ⏭️ deferred | — |

#### 7.1 + 7.2 — backend extraction (shipped 2026-05-03)

- New `POST /api/ai/extract/voice` (multipart `audio` field): Whisper transcription + GPT-4o-mini → returns `{ rawText, draft }` shaped for the AddTransaction form
- New `POST /api/ai/extract/receipt` (multipart `image` field): GPT-4o-mini vision → returns `{ confidence, draft }` with vendor / total / items / date
- Receipt images are processed in-memory only (`multer.memoryStorage`) — never written to disk or S3 (privacy: receipts contain personal/financial PII)
- Audio files use the existing local-disk temp pattern, deleted in `finally`
- Per-user rate limit: 60 extractions / 15 min (uses `ipKeyGenerator` for v8 IPv6 correctness)
- Audited via `auditFromReq` with action `AI_EXTRACT` — metadata only (provider, category, amount, file size); raw transcript / image bytes are never logged
- `aiService.processReceiptImage` added alongside `processVoiceNote`; both functions are the swap point for a future OpenRouter / MicroMind provider

#### 7.2.5 + 7.2.6 — draft persistence + matching layer (shipped 2026-05-03)

The extraction endpoints don't return ephemeral JSON anymore — they persist a `TransactionDraft` row, store the audio/image, run a matching pass, and let the user review before committing.

**New Prisma model: `TransactionDraft`**
- Source media (`originalMediaUrl`, mime) survives Render deploys via S3, with local fallback in dev
- `transcript` (voice only), `rawExtraction` (untouched AI JSON), `matchedDraft` (after matching), `confidence`
- Lifecycle: `PENDING_REVIEW` → `COMMITTED` (linked to a real Transaction) or `DISCARDED`
- One-to-one optional relation back to `Transaction` so you can trace any approved transaction back to its source draft

**New matching service** (`server/services/matchingService.js`)
- Arabic-normalized Levenshtein similarity ratio, no external deps
- Matches AI free-text strings to tenant rows: vendor → Supplier, project → Project, client → Client, item → Material
- Threshold 0.5 confidence minimum; below that the field stays as raw AI string
- Top-level `matchExtractionToTenant(extraction, source, tenantId)` returns `{ draft, matches }` — the latter is per-field metadata (raw + matched candidate + score) the UI uses to render confidence pills

**New `lib/storage.js`**
- `uploadBuffer(buf, mime, prefix)` and `uploadFile(path, mime, prefix)` — abstract over S3 (prod) vs local-disk (dev)
- `deleteByUrl(url)` for orphan-media cleanup on draft discard

**Endpoints**
- `GET /api/transaction-drafts` — list. Engineers see own only; Manager/Admin/Accountant see all in tenant. Default `status=PENDING_REVIEW`
- `GET /api/transaction-drafts/:id` — detail
- `PUT /api/transaction-drafts/:id` — user edits the matched fields before committing
- `POST /api/transaction-drafts/:id/rematch` — re-run matching (after the user has just created the missing Supplier/Material the AI couldn't find)
- `POST /api/transaction-drafts/:id/commit` — body `{ transactionId }`, links to a freshly-created Transaction. The frontend creates the Transaction via existing `POST /api/transactions` so the V1.2 profit engine runs once and only once
- `DELETE /api/transaction-drafts/:id` — soft-discard, deletes stored media

**Schema migration needed on prod DB**
- New model + enums (`DraftSource`, `DraftStatus`) added to `schema.prisma`
- Render build script does NOT run migrations — same gap as Phases 1-5
- Run `DATABASE_URL='<prod>' npx prisma db push` from local once before testers hit Phase 7 endpoints

### ✅ Phase 6 (ops) — partial

| Track | Status | Commit |
|---|---|---|
| **6.1 — Sentry error monitoring** | ✅ shipped | local |
| 6.2 — Backup verification (Render Postgres) | ⏭️ pending | — |
| 6.3 — Bank reconciliation (CSV import → match) | ⏭️ pending | — |
| 6.4 — Subscription billing (Stripe vs Paymob TBD) | ⏭️ pending | — |
| 6.5 — Mobile invoicing (view + send) | ⏭️ pending (low priority) | — |
| 6.6 — WhatsApp Business API for invoice send | ⏭️ deferred (needs account) | — |

#### 6.1 — Sentry error monitoring (shipped 2026-05-03)

- `@sentry/node` v10 installed
- `server/instrument.js` — initialized via `Sentry.init` only when `SENTRY_DSN` is set; otherwise fully inert (no SDK calls, no overhead)
- `server/server.js` imports `instrument.js` as the **first line** so OpenTelemetry can patch `http`/`express` before they load
- `Sentry.setupExpressErrorHandler(app)` runs **before** the app's error handler so Sentry sees raw exceptions with original stacks
- `tracesSampleRate: 0.1` in production, `0` in development
- `sendDefaultPii: false` — multi-tenant SaaS, don't leak emails/IPs to error tracker by default
- To enable: set `SENTRY_DSN` in `.env` (or Render env vars); no other code changes required

### ❌ Explicitly NOT doing

- **ETA Tax Authority integration** — deferred per user request 2026-05-01
- **Multi-currency** — Egypt SMEs operate in EGP only
- **Offline mobile mode** — engineers usually have 4G
- **Generic CRM features** — out of scope
- **Mobile DSR PDF export** — web export is sufficient for the foreseeable future

---

## 9. Mobile screens — quick reference

| Screen | Path | Notes |
|---|---|---|
| Login | `LoginScreen.js` | Shows API URL diagnostic + structured error box; 2FA branch (pending mobile UI) |
| Dashboard | `DashboardScreen.js` | Quick stats + tappable project cards |
| Project Detail | `ProjectDetailScreen.js` | Info + financials + transactions + Add-Tx deep-link |
| Finance | `FinanceScreen.js` | Filter pills, approve/reject, FAB |
| Add Transaction | `AddTransactionScreen.js` | Type toggle, modal pickers, inventory checkbox |
| **DSR List** | `DSRListScreen.js` | Status filters, FAB to create |
| **DSR Detail** | `DSRDetailScreen.js` | Status card + sections + manager acknowledge |
| **DSR Create** | `DSRCreateScreen.js` | Project picker, weather chips, attendance modal, **camera + library photo upload** |
| Notifications | `NotificationsScreen.js` | Read/unread, mark all read |
| Profile | `ProfileScreen.js` | Custody balance + nav hub |
| Fund Engineer | `FundEngineerScreen.js` | Admin only |
| Clients / Suppliers / Workmen | `*Screen.js` | Read-only directories |

---

## 10. Conventions — where to look for X

| Question | Answer |
|---|---|
| Where do new API endpoints get registered? | `server/routes/<resource>.js`, mounted in `server/server.js` |
| Where do I add validation for a new endpoint? | `server/schemas/<resource>.schema.js`, wire `validate({ body: schema })` in the route |
| Where's the V1.2 profit math? | `server/controllers/transactionControllerV2.js` — `calculateAndTransferProfit` helper |
| Where do new translation strings go? | `client/src/locales/{ar,en}.json` (web) + `mobile/src/locales/{ar,en}.json` (mobile) |
| How do I add a new mobile screen? | Create file in `mobile/src/screens/`, register in `mobile/src/navigation/AppNavigator.js` |
| Where are user-management security guards? | `server/controllers/userController.js` |
| How do I run automated tests? | `cd server && npm test` |
| How do I reset the demo data? | `cd server && node scripts/seed-demo-data.js` (wipes Demo Co domain data first) |
| Where's the audit helper? | `server/lib/audit.js` — `audit()` and `auditFromReq()` |
| Where's the PDF generator? | `server/lib/invoicePdf.js` (pdfkit) |
| Where's the TOTP helper? | `server/lib/totp.js` (otplib v13) |
| Where's the approval-threshold lookup? | `server/lib/approvalThresholds.js` |

---

## 11. Memory & gotchas (lived experience)

- **Login response is non-deterministic if same email exists in multiple tenants** with the same password — `findMany({ email })` then bcrypt loop picks the first. Demo seed uses unique emails. Worth fixing later by accepting an optional tenant slug at login.
- **Two transaction controllers** — `transactionController.js` is the main file, `transactionControllerV2.js` holds the V1.2 engine. V1 re-exports V2's three functions at the bottom. Naming is misleading; rename to `profitEngine.js` someday.
- **Hand-written SQL migration** at `server/prisma/manual_v1_2_migration.sql` exists alongside Prisma migrations — drift risk; audit before any prod deploy.
- **Repository URL has moved** from `8ofrii` to `8ofry` on GitHub. Old URL still redirects on push. Run `git remote set-url origin https://github.com/8ofry/Engineers-Management.git` to silence the warning.
- **Windows + PowerShell**: scripts may be blocked by execution policy. Either `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use plain `cmd`.
- **Node 18 doesn't work** with Expo SDK 54. Mobile dev requires Node 20.19.4+ or 22 LTS. Backend works on 18 but should also be on 22 for consistency.
- **otplib v13** has a different API than v12 (`authenticator` is gone; use functional `generate`/`verify`/`generateSecret`). Already handled in `lib/totp.js`.
- **`prisma format`** runs after `prisma db push` and reformats whitespace, which can break subsequent Edit calls — re-read the file before editing if a push has just run.
- **Documents are image-only** at upload time — multer's fileFilter allows JPEG/PNG/GIF/WebP. PDFs would need `application/pdf` added to the filter.
- **`/api` mount** must be specific (e.g. `/api/project-documents`, not bare `/api`) to avoid shadowing `/api/health`.
- **Email attachments** require `options.attachments` on `sendEmail()` (added in Phase 5). The original implementation ignored attachments.
- **Transaction.invoiceNumber** field exists since pre-existing schema but is unrelated to the new `Invoice.invoiceNumber` (Phase 5). Don't conflate.

---

## 12. Where state lives

| Where | What |
|---|---|
| **Postgres on Render** | Single source of truth for tenants, users, projects, transactions, DSRs, invoices, audit logs, etc. |
| **AWS S3** | Receipt photos, profile pictures, company logos, project documents, DSR photos |
| **`server/uploads/`** | Local fallback for audio voice notes (deleted after AI processing) |
| **Browser localStorage** | JWT, user object, theme preference, language preference |
| **Mobile AsyncStorage** | Token, user object, language preference |
| **`server/.env`** | Secrets (NOT committed; gitignored) |
| **Render dashboard env vars** | Production secrets |

---

## 13. If you're picking this up cold (fresh session)

1. **Read this doc top to bottom** (15 min). You'll know more than 90% of the project.
2. **Read [TESTING-LOG.md](TESTING-LOG.md)** — running record of what's been tested and what's been fixed.
3. **Check `git status` + `git log -10 --oneline`** — see what's local vs. pushed. As of last update, **N commits queued locally on `main` waiting to push**.
4. **Run the backend tests**: `cd server && npm test` — should be **75 / 75 passing**.
5. **Boot the backend**: `cd server && npm run dev` — should log `Server ready` on port 5000.
6. **Eyeball the demo data**: hit `http://localhost:5000/api/health` for a 200 with helmet headers. Run `node scripts/list-users.js` to see seeded users.
7. **Decide what's next** from §8 roadmap. Phase 6 ops layer is the natural next step.

### Local commits waiting to push (as of 2026-05-02 EOD)

The user said "stop pushing till we reach a milestone." Phase 5 is complete; **9+ local commits** spanning Phases 2-5 are queued. Run `git push origin main` when ready.

Use `git log origin/main..HEAD --oneline` to see the queue.

---

## 14. Key API endpoints by phase

### Phase 1 — Foundations
- `GET /api/audit-logs` (admin) — paginated list with filters
- `GET /api/audit-logs/:entity/:entityId` — full history of one resource
- `PUT /api/clients/:id/restore` (and same pattern for suppliers, materials, workmen, projects)

### Phase 2 — Quick UX wins
- `POST /api/auth/2fa/enroll` — generate secret + QR
- `POST /api/auth/2fa/confirm` — verify code → enable
- `POST /api/auth/2fa/login` — redeem challenge token
- `POST /api/auth/2fa/disable` — password + code required
- `GET /api/auth/2fa/status` — { enabled, pendingEnrollment }
- `GET /api/tenant/approval-thresholds` (admin) + `PUT` to update
- Modified: `POST /api/auth/login` returns `{ requires2FA, challengeToken }` if enabled

### Phase 3 — Photos & Documents
- `GET /api/project-documents/:projectId` — list with optional `?category=...`
- `POST /api/project-documents/:projectId` — multipart upload (file=image, optional name/category/description/lat/lng/takenAt)
- `DELETE /api/documents/:id`
- `PATCH /api/transactions/:id/receipt` — multipart receipt-photo upload

### Phase 4 — DSR
- `GET /api/dsr` — list, filterable
- `GET /api/dsr/:id` — detail with photos resolved
- `POST /api/dsr` — create DRAFT
- `PUT /api/dsr/:id` — update DRAFT/SUBMITTED
- `PUT /api/dsr/:id/submit` — DRAFT → SUBMITTED
- `PUT /api/dsr/:id/acknowledge` (manager+) — SUBMITTED → ACKNOWLEDGED
- `DELETE /api/dsr/:id` — DRAFT-author / admin

### Phase 5 — Invoicing
- `GET /api/invoices` — list
- `GET /api/invoices/:id` — detail
- `POST /api/invoices` — create DRAFT (auto-numbers)
- `PUT /api/invoices/:id` — update (DRAFT only)
- `DELETE /api/invoices/:id` — delete (DRAFT only)
- `GET /api/invoices/:id/pdf` — returns PDF stream
- `POST /api/invoices/:id/send` — email with PDF attached → SENT
- `POST /api/invoices/:id/payment` — record (partial) payment
- `PUT /api/invoices/:id/cancel` — set CANCELLED status

---

*This document is the living source of truth. Update it whenever a phase moves from "planned" to "shipped", a model changes, or a non-obvious convention emerges. Date your updates at the top.*
