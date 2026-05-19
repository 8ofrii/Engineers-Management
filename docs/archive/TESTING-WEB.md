# Web Application Testing Plan

**Project:** Engineers Management — Construction ERP
**Scope:** End-to-end manual testing of the React web frontend against the running Node/Prisma backend
**Audience:** QA engineer, product owner, or developer doing pre-release validation

---

## 0. Pre-flight setup

Before any testing begins, get the environment into a known state.

### 0.1 Backend running

```cmd
cd C:\8ofri\civil\Engineers-Management\server
npm run dev
```
Wait for: `Server running in development mode on port 5000`. Leave this window open.

### 0.2 Demo data loaded

```cmd
cd C:\8ofri\civil\Engineers-Management\server
node scripts/setup-test-users.js
node scripts/seed-demo-data.js
```

Expected output mentions: `Tenant ready: Demo Co`, four users created, three projects (Villa, Office, Apartment) seeded with ~17 transactions.

### 0.3 Frontend running

```cmd
cd C:\8ofri\civil\Engineers-Management\client
npm run dev
```
Open `http://localhost:5173` in Chrome (preferred — best DevTools).

### 0.4 Automated backend tests passing

```cmd
cd C:\8ofri\civil\Engineers-Management\server
npm test
```
Expected: **35 tests pass.** If anything fails, stop and investigate before manual testing.

### 0.5 Test accounts (all `Demo@1234`)

| Role | Email | Used for |
|---|---|---|
| ADMIN | admin@demo.local | Full-access verification |
| PROJECT_MANAGER | manager@demo.local | Approval workflow |
| ENGINEER | engineer@demo.local | Field-engineer flow |
| ACCOUNTANT | accountant@demo.local | Reports + read-only finance |

---

## 1. Authentication & session management

Tests for the login, registration, and token-handling code paths.

### 1.1 Login — happy path

1. Open `http://localhost:5173`
2. Enter `admin@demo.local` / `Demo@1234`
3. Click **Sign In**

**Expected:** Redirect to dashboard within 2 seconds. Header shows admin's name.

### 1.2 Login — wrong password

1. Enter `admin@demo.local` / `WrongPass1!`
2. Click **Sign In**

**Expected:** Error message "Invalid credentials". User stays on login page. No token stored in localStorage (verify in DevTools → Application → Local Storage).

### 1.3 Login — invalid email format

1. Enter `not-an-email` / anything
2. Click **Sign In**

**Expected:** **400 Validation failed** with `path: 'email', message: 'Invalid email'`. (Network tab shows the response payload.)

### 1.4 Login — empty form

1. Submit with both fields empty

**Expected:** 400 with **both** required-field errors, OR client-side validation prevents submit. Either is acceptable.

### 1.5 Login rate limit

1. Submit 21 wrong-password attempts in rapid succession (refresh-and-retype)

**Expected:** After ~20 attempts, server returns **429 Too many authentication attempts**. Wait ~15 minutes and verify it resets, OR restart the server.

### 1.6 Register a new company (SaaS sign-up)

1. From login page, click "Register Company" (or whatever the link is)
2. Fill: company name "Test Co", admin name "QA Tester", email `qa@test.local`, password `Test@1234`
3. Submit

**Expected:** Success page shows verification code (`devVerificationCode` is exposed in non-prod). Note this code.

### 1.7 Register — weak password

1. Repeat with password `weak`

**Expected:** **400** with multiple complaints — "must include an uppercase letter", "must include a digit", etc. **All four** complexity requirements should appear if `weak` violates all of them.

### 1.8 Verify email + first login

1. Take the code from 1.6, navigate to email-verification page
2. Enter the code
3. Submit

**Expected:** Account activated, JWT issued, redirected into the app as ADMIN of "Test Co" tenant.

### 1.9 Forgot password flow

1. Logout. On login page → "Forgot password"
2. Enter `admin@demo.local`
3. Submit

**Expected:** Server sends email AND returns `devResetUrl` in dev mode. Open the URL → set new password (must meet complexity) → confirm login works with new password. Reset back to `Demo@1234` afterward.

### 1.10 Token expiry / 401 handling

1. Log in. Copy the JWT from localStorage.
2. Manually edit localStorage and corrupt the token (change a character).
3. Refresh page or trigger an API call.

**Expected:** Backend returns 401, frontend redirects to login, token cleared from storage.

### 1.11 Logout

1. From any authenticated screen, click **Logout** (sidebar/header).

**Expected:** Redirect to login. localStorage no longer has `token` or `user`. Pressing browser back doesn't restore the session.

---

## 2. Multi-tenant isolation

These tests verify the multi-tenant security guarantee — users can only see data within their own tenant.

### 2.1 Demo Co admin sees only Demo Co data

1. Log in as `admin@demo.local`
2. Visit Projects, Clients, Suppliers, Workmen, Materials

**Expected:** All pages show **only the demo seed data** (3 projects, 5 clients, 6 suppliers, 6 workmen, 8 materials). NO data from Operatives / AI MicroMind / Ghaffarya tenants.

### 2.2 Cross-tenant ID guess

1. As `admin@demo.local`, open DevTools → Network
2. Find a project ID from a different tenant (you'd need to know one — use the Operatives tenant if you have an account there, or check the DB)
3. Manually navigate to `/projects/<that-foreign-id>` or hit `GET /api/projects/<that-id>`

**Expected:** **404 Project not found.** Backend's `findFirst({ where: { id, tenantId: req.user.tenantId } })` blocks even when ID is guessed correctly.

### 2.3 Tenant switching by re-login

1. Log out of Demo Co
2. Log in to a different tenant account (e.g., `mahmoudzanaty454@gmail.com` — Operatives admin, if you have that password)

**Expected:** Different data visible — different project list, different clients, etc. No mixing.

---

## 3. Role-based access control (RBAC)

### 3.1 Engineer cannot see other engineers' projects

1. Log in as `engineer@demo.local`
2. Note which projects appear

**Expected:** Engineer sees **only projects where `engineerId === their id`**. The demo seed assigns engineer to Villa + Apartment; the manager owns the Office project. Engineer should NOT see the Office.

### 3.2 Engineer cannot approve transactions

1. As engineer, navigate to Finance
2. Find a PENDING_APPROVAL transaction (your own)

**Expected:** No "Approve" / "Reject" buttons visible. If you try directly: `PUT /api/transactions/<id>/approve` returns **403 Forbidden**.

### 3.3 Engineer creates DRAFT transactions only

1. As engineer, create an EXPENSE
2. Submit

**Expected:** Transaction status is `PENDING_APPROVAL` (not `APPROVED`). Project safe balance does NOT decrement until manager approves.

### 3.4 Manager can approve

1. Log in as `manager@demo.local`
2. Finance → filter to "Pending"
3. Find the engineer's transaction from 3.3
4. Click "Approve"

**Expected:** Status flips to `APPROVED`. Project safe balance decrements by amount. If on `EXECUTION_COST_PLUS` project: also a `MANAGEMENT_FEE_TRANSFER` ledger entry appears, office revenue increases.

### 3.5 Accountant has read-only access

1. Log in as `accountant@demo.local`
2. Try to create a project / client / transaction via the UI

**Expected:** Either UI hides "Create" buttons, OR backend returns 403. Document which.

### 3.6 ADMIN cannot grant SUPER_ADMIN

1. As `admin@demo.local`, go to Users → Invite
2. Enter form data with role set to SUPER_ADMIN

**Expected:** **403 Forbidden** — "You are not authorized to assign the SUPER_ADMIN role."

### 3.7 ADMIN cannot modify SUPER_ADMIN

If a SUPER_ADMIN exists in your tenant: try to update their role/name as an ADMIN.
**Expected:** **403** — "You are not authorized to modify a SUPER_ADMIN."

### 3.8 ADMIN cannot delete SUPER_ADMIN

If a SUPER_ADMIN exists: try to delete via Users → row delete.
**Expected:** **403** — "You are not authorized to delete a SUPER_ADMIN."

### 3.9 Cannot delete self

1. As admin, in Users page, try to delete your own row.
**Expected:** 400 "You cannot delete your own account."

---

## 4. Validation & input safety

### 4.1 Mass-assignment defence — projects

1. As admin, open DevTools Network → create a project via the UI
2. Note the request payload
3. Replay the request via DevTools "Edit & Resend" with extra fields:
   ```json
   {
     "name": "Hack",
     "startDate": "2026-01-01",
     "clientId": "<valid-id>",
     "actualCost": 999999,
     "officeRevenue": 999999,
     "tenantId": "attacker-tenant",
     "engineerId": "someone-else"
   }
   ```

**Expected:** Project is created BUT the response shows `actualCost: 0`, `officeRevenue: 0`, `tenantId: <admin's-tenant>`, `engineerId: <admin's-id>` — the malicious fields were stripped by Zod.

### 4.2 Mass-assignment defence — users

1. As admin, invite a user with payload extras:
   ```json
   {
     "name": "Sneaky", "email": "sneaky@test.local",
     "phone": "+201", "password": "Test@1234",
     "isVerified": true, "isActive": true, "permissions": ["admin.manage_roles"]
   }
   ```

**Expected:** User created but `isVerified=false` (must verify email), `isActive=true` (default), `permissions=[]` (the permissions field is allowed but capped). Note: `permissions` is in the schema; verify the array length cap (max 200) by sending 250 items — should 400.

### 4.3 SQL-injection-style input

1. Create a client with `name: "'; DROP TABLE clients;--"`

**Expected:** Saved as a literal string. `clients` table is NOT dropped (verify it still exists). Prisma parameterizes queries.

### 4.4 XSS in displayed text

1. Create a client with `name: "<script>alert(1)</script>"`
2. View the client list

**Expected:** Text shows the literal `<script>` characters (escaped by React). NO alert pops.

### 4.5 Long strings get capped

1. Create a client with `name: "A".repeat(500)`

**Expected:** **400** — schema caps `name` at 200 chars.

### 4.6 Bad enum values rejected

Try to create a project with `revenueModel: "MAGIC_BEANS"` or a workman with `trade: "WIZARD"`.
**Expected:** **400 Validation failed** for the bad enum.

### 4.7 Decimal / number coercion

In the project create form, try `budget: "500000"` (string). Should accept and store as number.
Try `budget: "abc"` (non-numeric). Should reject as 400.

### 4.8 Date validation

Project endDate before startDate.
**Expected:** Form should reject (or at minimum the data should look wrong on display). Note: the schema doesn't currently enforce this — flag if the UI doesn't.

---

## 5. Project management

### 5.1 List projects

1. As admin, navigate to Projects.
**Expected:** 3 demo projects visible: Villa (IN_PROGRESS), Office (PLANNING), Apartment (COMPLETED). Each shows budget, client, status.

### 5.2 Create new project

1. Click "New Project". Fill:
   - Name: `Test Tower`
   - Client: pick "أحمد عبد الرحمن"
   - Type: COMMERCIAL
   - Status: PLANNING
   - Revenue Model: EXECUTION_COST_PLUS
   - Mgmt Fee: 12
   - Budget: 5000000
   - Start: today, End: +1 year
2. Submit

**Expected:** Redirected to project detail. New project appears in list. `actualCost`, `officeRevenue`, `projectSafeBalance` are all **0** (computed fields, not from form).

### 5.3 Edit project

1. Open the new project, change budget to 6,000,000
2. Save

**Expected:** Update succeeds. Refresh confirms persistence.

### 5.4 Project safe balance updates with transactions

(See section 7 — transactions)

### 5.5 Delete project

1. As admin, delete the test project from 5.2 (only deletes if owner / admin)

**Expected:** Confirmation dialog → success → project gone from list. Cannot un-delete.

### 5.6 Engineer scoping

1. Logout, login as `engineer@demo.local`
2. Note projects visible
3. Try `/projects/<office-id>` directly (Office is manager's project)

**Expected:** 404 / not authorized — engineer can't see manager's project.

---

## 6. Clients / Suppliers / Workmen / Materials

For each of these four resources, run the standard CRUD cycle:

| Step | Expected |
|---|---|
| List | Demo seed data appears |
| Search/filter (if available) | Works as documented |
| Create new | Saves, redirects/closes modal, appears in list |
| Edit existing | Saves, list reflects change |
| Delete | Confirmation → removed |
| Required fields | Empty form submission shows 400 |
| Long strings | Capped per schema |

### Per-entity gotchas

**Clients:** `email` accepts empty string in V1.2 (legacy), but if provided must be a valid email format. Try `email: "not-email"` → should 400.

**Suppliers:** `category` is an enum; rating capped 1-5. Try rating `10` → should 400.

**Workmen:** `dailyRate` required and must be positive. `trade` from `WorkmanTrade` enum. `nationalId` is a string with no format check (any 14-digit number works for Egyptian context).

**Materials:** `unit` from `MaterialUnit` enum (M3, TON, KG, M2, M, PIECE, LITER, BAG). `unitPrice` required. `supplierId` optional but if present must be a valid UUID.

---

## 7. Transactions & V1.2 financial logic

This is the **most important section** — the business value of the app lives here.

### 7.1 Verify the seeded V1.2 math

Open the **Villa project** (admin or engineer can see). Navigate to its detail page.

**Expected values** (from `node scripts/seed-demo-data.js`):
- Budget: 2,500,000 EGP
- Actual Cost: 455,000 EGP
- Office Revenue: 35,500 EGP
- Project Safe Balance: 309,500 EGP

**Sanity check the math:**
- Income: 500,000 + 300,000 = 800,000
- Direct expenses (with 10% mgmt fee): 150,000 + 80,000 + 25,000 = 255,000 → fee transfers: 25,500
- Inventory purchase: 200,000 (creates batch)
- Inventory consumption: 100,000 → fee transfer: 10,000
- Total fee transfers: 35,500 ✓ (matches officeRevenue)
- Safe = income − direct expenses − fee transfers − inventory purchase − inventory-consumption fees
  = 800,000 − 255,000 − 25,500 − 200,000 − 10,000 = 309,500 ✓

### 7.2 Create direct expense (auto profit transfer)

1. As engineer, create EXPENSE on Villa: amount 100,000, category `MASONRY_LABOR`, payment CASH
2. As manager, approve

**Expected after approval:**
- Villa.actualCost increases by 100,000 → 555,000
- Villa.projectSafeBalance decreases by 100,000 + 10,000 (10% fee) → 199,500
- Villa.officeRevenue increases by 10,000 → 45,500
- A new `MANAGEMENT_FEE_TRANSFER` ledger entry of 10,000 appears in transactions list

### 7.3 Create inventory purchase (deferred profit)

1. As engineer, create EXPENSE on Villa: amount 50,000, category `CEMENT`, **check the "Inventory Purchase" box**
2. As manager, approve

**Expected:**
- Villa.actualCost +50,000
- Villa.projectSafeBalance −50,000 (no profit yet)
- A new MaterialBatch appears with `initialValue: 50000`, `remainingValue: 50000`, `status: AVAILABLE`
- NO MANAGEMENT_FEE_TRANSFER ledger entry

### 7.4 Record inventory usage (deferred profit recognition)

1. Find the MaterialBatch from 7.3
2. Use the inventory usage UI to consume 30,000 EGP from this batch

**Expected:**
- Batch.remainingValue → 20,000 (status: PARTIALLY_USED)
- Villa.projectSafeBalance −3,000 (10% of 30,000)
- Villa.officeRevenue +3,000
- A new MANAGEMENT_FEE_TRANSFER appears for 3,000

### 7.5 Custody-wallet payment

1. As admin, fund engineer with 20,000 EGP via Custody page
2. Verify engineer's `currentCustodyBalance` increases by 20,000
3. Logout, login as engineer
4. Create EXPENSE on Villa: amount 5,000, payment method **CUSTODY_WALLET**
5. As manager, approve

**Expected:** Same project effects as 7.2, AND engineer's custody decreases by 5,000 (or `pendingClearance` increases until clearance happens — depends on V1.2 logic).

### 7.6 Reject a transaction

1. As engineer, create a transaction. As manager, reject it with reason "wrong amount"
**Expected:** Status `REJECTED`, no project balance changes, rejection reason visible on the transaction.

### 7.7 Income recording

1. As admin, create INCOME on Office project: 200,000 EGP, category `PAYMENT`, client = TMG
**Expected:** Office.projectSafeBalance becomes 200,000. No fee transfer (income doesn't trigger fee).

### 7.8 Negative-balance alert

1. Create EXPENSE that makes Villa.projectSafeBalance go negative (e.g., 500,000)
2. As manager, approve
**Expected:** Notification appears for the engineer/manager: "Project Safe Balance Negative". Visible in notifications list.

### 7.9 Edit / delete transaction

1. Edit the amount of an APPROVED transaction
**Expected:** Project balances re-calculate to reflect the new amount. **VERY IMPORTANT** — this is a known-fragile area, double-check the math.

2. Delete an APPROVED transaction
**Expected:** Balances reverse — what was added is subtracted, and vice versa.

### 7.10 Reports / stats

1. Navigate to Reports
**Expected:** Income vs. Expenses bar chart populated. Categories breakdown shows the V1.2 categories (CONCRETE, CEMENT, MASONRY_LABOR, etc.).

### 7.11 CSV export from Reports

1. Click the **Export** button on Reports page
**Expected:** Downloads `report-YYYY-MM-DD.csv`. Open in Excel/LibreOffice. Should be valid CSV with UTF-8 BOM (Arabic characters render correctly). Contains both `Type` totals and `Category` totals.

---

## 8. Custody management

### 8.1 List balances (admin / accountant)

1. As admin, navigate to Custody → All Balances
**Expected:** Engineer shows current balance + pending + available. Demo data: engineer has 55,000 EGP after the seed runs.

### 8.2 Fund an engineer

1. Admin → Custody → Fund Engineer → pick `engineer@demo.local`, amount 10,000
**Expected:** Engineer's balance +10,000. Notification created for the engineer. Custody transfer record of type `FUNDING` written.

### 8.3 Engineer returns custody

1. Engineer → Custody → Return → amount 5,000
**Expected:** Engineer's balance -5,000. Transfer of type `RETURN` recorded.

### 8.4 Overdraft prevention

1. Engineer with 5,000 EGP balance tries to return 10,000
**Expected:** **400** "Insufficient available balance. Available: 5000 EGP". Balance unchanged.

### 8.5 Custody history

1. View custody history for an engineer
**Expected:** Last 50 transfers, sorted newest first. Demo data shows 3+ transfers.

### 8.6 Fund non-engineer

1. Admin tries to fund another ADMIN user
**Expected:** **400** "Can only fund engineers or project managers."

### 8.7 Negative funding amount

1. Admin tries to fund with amount = -100
**Expected:** **400 Validation failed** "Amount must be a positive number" (Zod blocks).

---

## 9. Notifications

### 9.1 Read existing notifications

1. As admin, click bell icon
**Expected:** List of notifications. Demo seed creates 3: Pending approval (for manager), Custody Funded (for engineer, already-read), Low Stock Alert (for admin, unread).

### 9.2 Mark single as read

1. Click a notification
**Expected:** `isRead` flag flips. Bell badge count decreases.

### 9.3 Mark all as read

1. Click "Mark all read"
**Expected:** All notifications for this user marked read. Badge clears.

### 9.4 Cannot read another user's notification

1. As admin, get a notification ID belonging to engineer
2. `PUT /api/notifications/<id>/read`
**Expected:** **403 Not authorized.** (Verified by `notification.userId !== req.user.id` check.)

### 9.5 Cannot delete another user's notification

Same as 9.4 but DELETE.
**Expected:** 403.

### 9.6 Auto-generated notifications

After 7.5 (custody fund) and 7.8 (negative balance), check the recipient's notifications.
**Expected:** New entries appear without manual action.

---

## 10. Roles & permissions (advanced)

### 10.1 List system roles

1. As admin → Roles
**Expected:** 4 system roles + any custom ones.

### 10.2 Create custom role

1. Click "New Role"
2. Name: "Site Foreman"
3. Permissions: `{ "transactions": { "create": true, "approve": false }, "projects": { "view": true } }`
4. Save

**Expected:** Role saved, `isSystem: false`.

### 10.3 Cannot edit system role permissions

1. Try to edit the permissions matrix of the "ADMIN" system role
**Expected:** **403** "Cannot modify permissions of system roles. Create a custom role instead."

### 10.4 Cannot delete system role

1. Try to delete a system role
**Expected:** **403** "Cannot delete system roles."

### 10.5 Cannot delete role with users

1. Assign a user to the custom role from 10.2
2. Try to delete the role
**Expected:** **400** "Cannot delete role. 1 user(s) are assigned..."

### 10.6 Permission seeding

1. As admin → call POST /api/roles/seed-defaults

**Expected:** First call: creates default system roles. Second call: 400 "Default roles already exist".

---

## 11. Internationalization & RTL

### 11.1 Toggle to Arabic

1. Click the language switch (EN ↔ AR)
**Expected:** ALL UI text translates to Arabic. The `<html dir>` attribute changes to `rtl`. Layout flips: sidebar moves to right, text-align flips, dropdown chevrons mirror.

### 11.2 RTL layout integrity

1. In Arabic mode, walk through every page (Dashboard, Projects, Finance, Reports, Settings)
**Expected:** No text overflow, no broken alignments, no English mixed in (except technical IDs / UUIDs / numbers in EGP).

### 11.3 Currency formatting

1. EGP amounts in Arabic mode
**Expected:** Numbers use Western digits (1,234,567) — Arabic-Eastern digits would be a config decision; document whichever is implemented.

### 11.4 Date formatting

**Expected:** Dates display in a locale-appropriate format (DD/MM/YYYY for AR, configurable for EN).

### 11.5 Translation completeness

1. Open `client/src/locales/en.json` and `client/src/locales/ar.json`
2. Diff key counts: EN has 634, AR has 627 (per audit). Spot 7 missing AR keys.
3. In the UI, find an Arabic page that shows English text or `[missing]` markers — that's an unmapped key.

**Expected:** Either fix the missing keys or document them as TODOs.

### 11.6 Switch persists

1. Toggle to AR, refresh page
**Expected:** Still in AR. Stored in localStorage.

---

## 12. Theme (light / dark)

### 12.1 Toggle theme

1. Click the theme switch
**Expected:** All colors flip — backgrounds, text, borders, charts. No "white box on dark page" visual bugs.

### 12.2 Theme persists across pages

1. Set dark, navigate to all pages, log out and back in
**Expected:** Dark stays.

### 12.3 Charts in dark mode

1. Reports page in dark mode
**Expected:** Recharts adapt — axis labels, gridlines, tooltips all readable.

---

## 13. File uploads (S3)

### 13.1 Profile picture

1. Profile → upload a JPG image (~500 KB)
**Expected:** Uploads, S3 URL stored in `profilePicture`, image renders next to name.

### 13.2 Company logo

1. As admin → Company Settings → upload PNG logo
**Expected:** Uploads, displays in header on next page load.

### 13.3 Receipt photo on transaction

1. Create EXPENSE with a receipt image attached
**Expected:** Uploaded, `receiptPhotoUrl` set, image viewable in transaction detail.

### 13.4 Oversize file rejected

1. Upload a 30 MB image
**Expected:** Backend's body limit (20 MB) rejects with 413 Payload Too Large. UI shows clear error.

### 13.5 Wrong MIME type

1. Upload a `.exe` renamed to `.jpg`
**Expected:** Either Multer rejects, or the server stores it but the client refuses to render. **Verify nothing executes.**

### 13.6 Image renders cross-origin

1. After upload, view the image on the page
**Expected:** Loads successfully (helmet's `Cross-Origin-Resource-Policy: cross-origin` allows it).

---

## 14. Chat / AI assistant

### 14.1 Text message

1. Open Chat. Type "اعرض لي مشاريع المهندس الحالية" (or English equivalent)
**Expected:** AI responds in Arabic with project info or a clarifying question.

### 14.2 Voice transcription

1. Click the mic, record "اشتريت 100 شيكارة أسمنت بـ 18000 جنيه"
**Expected:** Whisper transcribes to text. AI structures it as a draft transaction (CREATE_TRANSACTION intent) with amount=18000, category=CEMENT.

### 14.3 Tool-calling — record_transaction

1. Type: "Record an expense of 5000 EGP for masonry labor on the Villa project"
**Expected:** AI uses the `record_transaction` tool. Response shows a confirm prompt with extracted fields. Confirming creates a real transaction.

### 14.4 Tool-calling — get_financial_summary

1. Type: "How much have we spent on the Villa project?"
**Expected:** AI returns Villa's totals.

### 14.5 Chat history

1. Send 5 messages, refresh
**Expected:** All preserved.

### 14.6 Clear chat history

1. Clear. Verify only your messages cleared (not other users').

### 14.7 OpenAI key missing

1. Comment out `OPENAI_API_KEY` in `.env`, restart server, send a chat message
**Expected:** Graceful 500 with clear message — NOT a stack-trace dump.

---

## 15. Inventory & material batches

### 15.1 Material catalog

1. As admin → Materials
**Expected:** 8 demo materials. Stock levels show, reorder thresholds display, low-stock items highlighted (cement is at 150 vs threshold 50 — not low yet).

### 15.2 Material batches per project

1. Open Villa project → Inventory
**Expected:** 1 cement batch with 100,000 EGP remaining, status PARTIALLY_USED.

### 15.3 Record usage

(Already in 7.4)

### 15.4 Reorder alert

1. Set a material's stockLevel below reorderLevel manually
**Expected:** Low-stock notification or visual indicator appears.

---

## 16. Office fees configuration

### 16.1 Global category fees

1. As admin → Office Fees → Global → Set CONCRETE: 12%
**Expected:** Saved. Verify with: GET /api/office-fees/global → entry shows.

### 16.2 Project-specific override

1. On Villa project, set CONCRETE override to 8%
**Expected:** Saved. Calculate fee for Villa+CONCRETE → uses 8%, not the global 12%.

### 16.3 Fee preview calculation

1. POST /api/office-fees/calculate body `{ projectId: <villa>, category: "CONCRETE", amount: 100000 }`
**Expected:** Returns `feePercent: 8`, `officeFee: 8000`, `totalDeduction: 108000`.

### 16.4 Validation

Invalid percent (negative or >100) → 400.
Unknown category → 400.

---

## 17. Performance & load

### 17.1 Cold start

1. After backend restart, load dashboard
**Expected:** First load <3 seconds. Subsequent loads <1 second (cached).

### 17.2 Large transaction list

1. Open Villa project → Transactions tab (has ~10 transactions in demo)
**Expected:** Renders in <500ms.

### 17.3 Pagination (if implemented)

If lists implement pagination, verify page size + next/prev buttons. If not, document as TODO.

### 17.4 N+1 query check

In dev mode the server logs all queries. Open a project detail page — count Prisma queries. Should be small (single-digits). If you see 50+ queries to load one page, flag for optimization.

---

## 18. Security headers & policies

### 18.1 Helmet headers

1. DevTools → Network → any request to `/api/*`
**Expected response headers:**
- `Content-Security-Policy: default-src 'self'...`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Cross-Origin-Resource-Policy: cross-origin` (relaxed so /uploads images work)
- `Referrer-Policy: no-referrer`

### 18.2 Rate-limit headers

**Expected:**
- `RateLimit-Policy: 1000;w=900`
- `RateLimit: limit=1000, remaining=<dec>, reset=<sec>`

### 18.3 CORS dev

1. Frontend on :5173 talks to backend on :5000 — should work in dev.

### 18.4 CORS prod (skip if not deployed)

1. Set `NODE_ENV=production` and `CORS_ALLOWED_ORIGINS=https://your-frontend.com`
2. Hit API from an unlisted origin
**Expected:** 403 — "Origin X not allowed by CORS"

---

## 19. Edge cases & known issues

### 19.1 Two transaction controllers

[server/controllers/transactionController.js](server/controllers/transactionController.js) is the main. [server/controllers/transactionControllerV2.js](server/controllers/transactionControllerV2.js) holds the V1.2 profit engine and is re-exported by V1. **Naming is misleading.** Confirm both code paths work — controller V2 covers `POST /api/transactions/v2`, `POST /api/transactions/inventory-usage`, `GET /api/projects/:id/inventory`.

### 19.2 Legacy `register` endpoint

`POST /api/auth/register` is the pre-multi-tenant flow. It creates users with `tenantId: null`, which breaks tenant scoping. **Only `register-company` should be used.** If the UI exposes legacy register, document it as a bug.

### 19.3 Hand-written SQL migrations

`server/prisma/manual_v1_2_migration.sql` exists alongside Prisma migrations. Production DB and dev DB may have drifted. Verify schema parity before any migration deploy.

### 19.4 Locale drift

`ar.json` (627 lines) vs `en.json` (634 lines) — 7 keys diverge. Hunt for any English fallback in Arabic UI.

### 19.5 ChatMessage user-scope

`prisma.chatMessage.deleteMany({ where: { userId } })` — engineer A clears their chat, doesn't affect engineer B. Confirm.

### 19.6 Voice file lifecycle

After voice processing, `fs.unlinkSync(req.file.path)` deletes the local audio. Verify `server/uploads/` doesn't accumulate orphan files.

---

## 20. Sign-off checklist

After all sections pass, validate this short summary holds:

- [ ] Backend boots in <5s, responds to `/api/health` with helmet headers
- [ ] All 35 vitest schema tests pass
- [ ] Demo seed creates 3 projects with V1.2 math correct (Villa: safe=309,500)
- [ ] All 4 demo accounts can log in and see role-appropriate UI
- [ ] Engineer creates DRAFT → Manager approves → balances update correctly
- [ ] Inventory purchase creates batch; usage triggers deferred profit transfer
- [ ] Custody fund + return + overdraft check all work
- [ ] CSV export downloads correctly (UTF-8 BOM, Arabic readable)
- [ ] Language toggle flips RTL with no broken layouts
- [ ] Theme toggle works on all pages
- [ ] No SUPER_ADMIN escalations possible from ADMIN
- [ ] Mass-assignment of `actualCost`, `tenantId`, `role` blocked by Zod
- [ ] Cross-tenant ID guess returns 404
- [ ] Rate limiter triggers on 21st auth attempt
- [ ] All file uploads enforce size limits

---

## Reporting issues

For each failed test, capture:

1. **Section number** (e.g. "7.4")
2. **User account** used
3. **Steps to reproduce** (if not exactly the documented steps)
4. **Expected** vs **Actual**
5. **Screenshot** or **DevTools Network response payload** (especially the JSON body for 4xx/5xx)
6. **Backend log** snippet at the time of failure
7. **DB state** if relevant (run `node scripts/list-users.js` or query directly)

File issues as you find them — don't batch.
