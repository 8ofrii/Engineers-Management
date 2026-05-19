# Testing Log

> **Purpose**: running log of every test session — what was tested, what was found, what was fixed, what's still open. Append new entries to the top. Reference test sections in [TESTING-WEB.md](TESTING-WEB.md).

---

## 2026-05-06 — UAT Round 1 triage (Admin persona, 39 bugs reported)

**Source**: 11-page handwritten scan + typed bug report from a colleague's UAT pass against the production deployment.
**Counts**: 5 Critical · 9 High · 16 Medium · 9 Low.
**Persona tested**: Admin (other personas not yet exercised).

### TL;DR root causes

1. **Prod DB schema is stale.** Drives 4 of the 5 Critical bugs and some Highs (F07, F10, F14, F16, F17). Phases 1-7 + 6.3 + 6.4 schema additions were never pushed to prod after the initial baseline. **Fix is operational, not code** — see Action Items below.
2. **Recent SMTP rotation broke email send (F11).** Our hardcoded fallback was removed (security), so SMTP now requires `SMTP_EMAIL` + `SMTP_PASSWORD` in Render env. If the Gmail app password was rotated without updating Render, email send returns SMTP error.
3. **Several UAT-grade FE wiring bugs surfaced** that no automated test would catch (F02 prop-name mismatch, F04 missing edit/delete, F13 no save-draft path, F15 narrow special-char regex). All fixed in this session.

### Fixed this session (10 bugs)

| ID | Title | Fix |
|---|---|---|
| **F02** | "New Client" inline button no-op | `AddProjectModal` was passing `onSave`; `AddClientModal` expects `onSubmit`. One-line rename. Plus surfaced server validation errors in the alert. |
| **F03** | Client status missing INACTIVE / PENDING | Added all three options to the status dropdown. |
| **F04** | Raw Materials missing Edit / Delete | Added pencil + trash buttons on each material card, wired to `materialsAPI.update` / `delete`, plus edit-mode for the existing modal. |
| **F09** | Stale data persists across Add Transaction tabs | New `switchMode` helper resets formData + errors when switching Expense / Income / Usage / Transfer (skipped in edit mode). |
| **F11** | Invoice SMTP error | No code fix needed — see Action Item 2. Our recent `sendEmail.js` security cleanup correctly throws when env is missing. |
| **F13** | AI Drafts can't save edits | Added a **Save Draft** button (alongside the existing **Save as transaction**) that calls `PUT /api/transaction-drafts/:id` to persist edits without committing. |
| **F15** | Password validation rejects `#`, errors one-at-a-time | Replaced the four chained `.regex()` calls with one `.superRefine()` that gathers all violations. Special-char set broadened from `[@$!%*?&]` to `[^a-zA-Z0-9]` so `#` / `_` / `-` etc. all work. |
| **F17** | 2FA stats fail to load | Improved alert to surface the real server error. Underlying cause is schema sync — see Action Item 1. |
| **F18** | Chat replies in Arabic to English questions | Tightened the system prompt with explicit "match the language of the user's most recent message" rule. |
| F02 (cont'd) | Generic "Failed to create client" alert | Now shows per-field server errors via `apiErrorMessage`. |

### Action Items on your side (NO code can fix these — operational only)

#### 1. ⚠️ Schema sync to prod DB (highest priority — fixes 4-5 critical bugs)

The prod Postgres has been drifting since Phase 1. Recent additions never made it: `audit_logs`, `daily_site_reports`, `documents`, `invoices`, `transaction_drafts`, `bank_statements`, `bank_statement_rows`, `subscriptions`, `payment_attempts`, plus column additions (`Transaction.reconciledAt`, `User.totpEnabled`, `User.totpSecret`, etc.).

From your local machine with prod credentials:

```bash
cd C:\8ofri\civil\Engineers-Management\server
set DATABASE_URL=<your Render Postgres connection string>
npx prisma db push
```

Inspect the proposed changes — should be additive (new tables + new columns); nothing destructive. If Prisma asks to drop columns, **stop and check** before confirming.

After this single command:
- BUG-F07 (Database error new expense) → resolved
- BUG-F10 (Reports P2022) → resolved
- BUG-F14 (Bank Reconciliation) → resolved
- BUG-F16 (Billing) → resolved (also needs Action Item 3 for paid plans)
- BUG-F17 (2FA stats) → resolved

#### 2. Update SMTP credentials on Render

You rotated the leaked Gmail app password (correctly). The new password must be set in Render environment:

```
SMTP_EMAIL    = ai.8ofry@gmail.com  (or whichever sender)
SMTP_PASSWORD = <new app password from myaccount.google.com/apppasswords>
```

After Render redeploys, BUG-F11 (Invoice SMTP error) is resolved.

#### 3. Set Paymob env vars on Render (only if going live with paid plans)

If you don't have a Paymob account yet, Billing keeps showing "billing disabled" and the free plan works. Once you're ready:

```
PAYMOB_API_KEY        = <from Paymob → Profile → API Key>
PAYMOB_INTEGRATION_ID = <from Paymob → Developers → Payment Integrations>
PAYMOB_IFRAME_ID      = <from Paymob → Developers → Iframes>
PAYMOB_HMAC_SECRET    = <from Paymob → Profile → HMAC>
```

Plus configure Paymob's webhook URL to:
```
https://engineers-management.onrender.com/api/billing/webhook
```

### Bugs deferred to next session (all Medium / Low)

| ID | Title | Effort | Why deferred |
|---|---|---|---|
| F05 | Record Usage button does nothing + auto-pull missing | M | Multi-part feature (button wiring + pre-fill flow); needs separate commit |
| F06 | Adding workman ~2 minutes | S | Investigation needed — likely N+1 or S3 upload latency |
| F08 | Existing Item selector validation false positive + cost category not refreshed | M | Multi-step interaction bug; needs careful repro |
| F12 | AI Drafts receipt upload returns error | S | Need actual error from network tab to triage |
| U01-U21 | UI/UX improvements (filters, multi-select, copy renames, dark mode persistence, …) | varies | None are blockers; batched as a polish sprint |

### Re-test order after Action Items 1-2 are done

1. Open Reports → expect data to load (verifies F10)
2. Add new expense from Accounting → expect success (verifies F07)
3. Open Bank Reconciliation → expect page to load (verifies F14)
4. Open Billing → expect plan grid (verifies F16)
5. Security → 2FA → expect status to load (verifies F17)
6. Send invoice email → expect delivery (verifies F11)
7. New project → New Client inline → fill → submit → expect client created (verifies F02)
8. Edit a raw material name → expect persistence (verifies F04 edit)
9. Delete a raw material → expect row removal (verifies F04 delete)
10. AI Draft → edit project → click **Save draft** → reopen → expect edits persisted (verifies F13)
11. Add team member with password `Test#2026!` → expect single-shot success (verifies F15 — `#` works AND all errors show together if missing)
12. Switch Expense → Income tab → expect blank form (verifies F09)
13. Chat in English → expect English reply (verifies F18)
14. Edit client status to PENDING → expect option present (verifies F03)

---

## 2026-05-02 — Phase 5: Invoicing with PDF + email send

**Author**: Claude
**Scope**: Backend invoicing complete + web Invoices page

### What landed

**Schema**
- New `Invoice` Prisma model (line items as JSON; per-tenant unique `invoiceNumber` `INV-YYYY-NNNN`).
- New `InvoiceStatus` enum: DRAFT / SENT / PARTIALLY_PAID / PAID / OVERDUE / CANCELLED.
- Reverse relations on Tenant, Client, Project, User (`InvoiceCreator`).
- Synced via `prisma db push`.

**Backend libraries**
- `pdfkit` installed for pure-JS PDF generation (no Chromium needed).
- New `server/lib/invoicePdf.js` — A4 invoice render with company header, bill-to + project box, status badge, line items table, totals box (subtotal, discount, tax, total, paid, balance), notes + terms footer.
- `server/utils/sendEmail.js` extended to pass through `options.attachments` to nodemailer.

**Endpoints (`/api/invoices/*`)** — 9 total
- `GET /` — list with filters (status, clientId, projectId); engineer scope: own only
- `POST /` — create DRAFT. Auto-generates `INV-YYYY-NNNN`. Validates line items, computes subtotal/tax/total
- `GET /:id` — detail with relations
- `PUT /:id` — update (DRAFT only; SENT/PAID locked); re-computes totals when line items/tax/discount change
- `DELETE /:id` — DRAFT only; SENT/PAID can only be cancelled
- `GET /:id/pdf` — returns PDF stream with `Content-Type: application/pdf`
- `POST /:id/send` — generates PDF, attaches to email, sends via SMTP, flips DRAFT→SENT
- `POST /:id/payment` — record (partial) payment; PARTIALLY_PAID until full; validates amount > 0 and ≤ outstanding
- `PUT /:id/cancel` — sets CANCELLED (anything except PAID)
- All mutations audited (CREATE / UPDATE / SEND / PAYMENT / CANCEL / DELETE)

**Validation** (`schemas/invoices.schema.js`)
- Zod schemas: `createInvoiceSchema`, `updateInvoiceSchema`, `sendInvoiceSchema`, `recordPaymentSchema`, `idParamSchema`
- Mass-assignment protection: tenantId, status, paidAmount, invoiceNumber stripped via `.strip()`
- Tax rate capped 0–100, line items 1–200, positive quantities + non-negative unit prices

**Web (`client/src/pages/Invoices.jsx`)**
- Sidebar entry `/invoices` with Receipt icon
- Status filter pills (All + 6 statuses)
- Table with action icons (View, PDF download, Edit, Send, Payment, Cancel, Delete) gated by status + role
- Create/Edit modal with full line-item editor (add/remove, auto-compute totals), tax rate (default 14% for Egyptian VAT), discount, notes, terms, due date
- View modal with stats grid + line items table + notes + PDF download
- Send modal with recipient email + custom message
- Payment modal with outstanding-balance hint + amount input
- All money formatted with Egyptian locale (`en-EG`)

**Tests** (`server/tests/invoices.schema.test.js`)
- 14 new tests: minimum viable invoice, empty line items, missing description, negative quantity, tax >100%, mass-assignment defence (status/paidAmount/invoiceNumber/tenantId stripped), update partial, send valid/invalid email, payment positive/zero/negative
- **75 / 75 total tests passing**

### Verified

- Server boots clean
- All invoice endpoints correctly 401 without token
- `/api/health` unchanged at 200
- Locale JSON valid in EN + AR (added `nav.invoices` key in both)

### Pending live tests

- [ ] As manager, click + New Invoice → form opens with default 14% tax + 30-day terms
- [ ] Pick client + add 3 line items → totals auto-compute
- [ ] Save → invoice appears in list with auto `INV-2026-NNNN` number
- [ ] Click PDF icon → professional A4 PDF downloads
- [ ] Click Send → email modal → enter recipient → invoice flips to SENT, email arrives with PDF attached
- [ ] Click Payment icon on SENT → enter partial amount → status flips to PARTIALLY_PAID, balance updates
- [ ] Pay full balance → status flips to PAID, paidAt populated
- [ ] Try to edit a SENT invoice → 400 "cannot edit"
- [ ] Try to delete a PAID invoice → 400 "use cancel"
- [ ] Cancel a SENT invoice → status flips, audit log shows CANCEL action
- [ ] As engineer, GET /api/invoices → only own invoices visible
- [ ] Audit log shows CREATE/SEND/PAYMENT/CANCEL entries with metadata

---

## 2026-05-02 — Phase 4 (mobile capture): DSR creation flow with photo upload

**Author**: Claude
**Scope**: Mobile DSR creation screen (engineer side)

### What landed

- `expo-image-picker` ~17.0.0 added to `mobile/package.json`. User must run `npm install && npx expo install --fix` to pick up.
- New screen `mobile/src/screens/DSRCreateScreen.js`:
  - Project picker modal (lists tenant projects)
  - Date input with "Today" quick-set button (YYYY-MM-DD)
  - 8-option weather chip grid with emoji icons (sunny ☀️ / cloudy ⛅ / rainy 🌧️ / windy 🌬️ / dusty 🌫️ / hot 🔥 / cold ❄️ / other 🌤️)
  - Temperature (°C) + hours-worked numeric inputs side by side
  - Progress / issues / visitors textareas
  - Workmen attendance modal (active workmen only, multi-select with checkmarks)
  - Selected workmen render as inline rows with per-row hours editing + delete
  - Photo strip: "Take photo" → `launchCameraAsync` with EXIF on; "From library" → `launchImageLibraryAsync` with multi-select up to 10
  - Each photo gets a thumbnail with delete chip
  - Save draft / Save & submit dual-button row
- Submit flow:
  1. Validates (project + date required, hours 0-24)
  2. Uploads each photo to `/api/project-documents/:projectId` with category=PHOTO_PROGRESS, collects Document IDs
  3. POSTs to `/api/dsr` with all fields including `photoIds`
  4. If "Save & submit", calls `PUT /api/dsr/:id/submit` to flip DRAFT→SUBMITTED
- DSRListScreen now has a + FAB bottom-right that navigates to DSRCreate.
- Navigator updated with DSRCreate registered in DSRStack.
- Locale keys added in both en.json and ar.json (full `dsr.*` namespace + `common.done`).

### Verified

- All `node --check` passes for changed JS files.
- Locale JSON parses cleanly in both languages.
- 61/61 server tests still pass.

### Pending live tests

- [ ] On mobile (after `npx expo install --fix`): DSR tab → + FAB → New Daily Report opens
- [ ] Pick a project → it shows in selector
- [ ] Pick weather chip → highlights, tap again → deselects
- [ ] Add 3 workmen, change hours on one to 6, remove another
- [ ] Tap Take Photo → camera permission prompt → capture → thumbnail appears
- [ ] Tap From Library → multi-select 2 photos → both appear in strip
- [ ] Tap Save Draft → DRAFT created, photos uploaded as project documents
- [ ] Open the created DSR → photos appear in detail view
- [ ] Try Save & Submit on a fresh report → DRAFT created then auto-submitted
- [ ] As manager on web `/dsr`, see the submitted report → acknowledge → engineer gets notification
- [ ] Try to create DSR for the same project + same date → 409 (existing report)
- [ ] As engineer not assigned to project → create DSR → 403

---

## 2026-05-02 — Phase 4: Daily Site Reports (backend + web review)

**Author**: Claude
**Scope**: DSR Prisma model, full CRUD endpoints with state machine (DRAFT → SUBMITTED → ACKNOWLEDGED), web review page

### What landed

**Backend**
- `DailySiteReport` model with state machine, weather enum (`SUNNY/CLOUDY/RAINY/WINDY/DUSTY/HOT/COLD/OTHER`), Json fields for `workmenAttendance` and `materialsReceived` and `photoIds`. Unique constraint on `(projectId, reportDate)` prevents duplicate-day reports.
- New `DSRStatus` enum: DRAFT / SUBMITTED / ACKNOWLEDGED.
- 7 endpoints under `/api/dsr/*`:
  - `GET /` — list with filters (projectId, status, from, to). Engineer scope: own only.
  - `POST /` — create DRAFT. Returns 409 with `existingId` if same project+date already has a report.
  - `GET /:id` — single DSR with `photos` field resolving Document refs.
  - `PUT /:id` — edit (DRAFT/SUBMITTED). Acknowledged is locked.
  - `PUT /:id/submit` — DRAFT → SUBMITTED + author notification.
  - `PUT /:id/acknowledge` — SUBMITTED → ACKNOWLEDGED, manager-only, optional notes, engineer notified.
  - `DELETE /:id` — DRAFT-only for author; admin can delete any.
- Audit log: CREATE / UPDATE / SUBMIT / ACKNOWLEDGE / DELETE actions.
- Zod validation: weather enum, hours (0-24), 200-entry attendance cap, 100-material cap, 50-photo cap.

**Frontend (web)**
- `dsrAPI` added to api.js: list/get/create/update/submit/acknowledge/remove.
- New page `/dsr` (sidebar "Daily Reports", visible to all roles):
  - Project + status filters
  - Card list with status badge, weather icon, hours, reporter, progress preview, red-highlighted issues
  - Click row → modal with full details (stats grid, progress, issues, visitors, attendance table, materials list, photo grid)
  - Manager acknowledge form (optional notes), engineer can submit DRAFT from modal

### Verified

- 61/61 server tests still pass.
- Server boots clean; all DSR endpoints 401 without token; /api/health stays 200.
- Locale JSON valid.

### Pending live tests

- [ ] As engineer: visit `/dsr`, see only own reports
- [ ] Try to create DSR without a project assignment → 403
- [ ] Create DSR for project on date that already has one → 409 with existingId
- [ ] Author submits DRAFT → status flips, notification appears
- [ ] As manager, click submitted DSR → see acknowledge button
- [ ] Add notes, click Acknowledge → status flips, engineer gets notification
- [ ] Try to edit ACKNOWLEDGED DSR → 400 "cannot be edited"
- [ ] Engineer scope: log in as engineer A, try GET /api/dsr/:id of engineer B's report → 403
- [ ] Audit log shows CREATE/SUBMIT/ACKNOWLEDGE entries with metadata

### Pending mobile work (next turn)

- [ ] Mobile DSR capture screen (engineer pick project + date, weather picker, attendance multi-select, in-app camera, submit)
- [ ] Mobile DSR list view (engineer's own + status badges)
- [ ] Mobile notification handler for "DSR acknowledged"

---

## 2026-05-02 — Phase 3: Photo & document logs

**Author**: Claude
**Scope**: Document upload/list/delete endpoints + receipt-photo endpoint + web Project Documents page

### What landed

**Backend**
- `Document` model extended with `category` (DocumentCategory enum), `description`, `latitude`, `longitude`, `takenAt`, `uploadedBy` + uploader relation.
- New enum `DocumentCategory`: PHOTO_PROGRESS / PHOTO_RECEIPT / PHOTO_DELIVERY / PHOTO_ISSUE / CONTRACT / PERMIT / DRAWING / REPORT / OTHER.
- Indexes on `(projectId, uploadedAt)` and `(category)`. Pushed via `prisma db push`.
- New `documentController.js` with `listDocuments`, `uploadDocument`, `deleteDocument`. Multipart via existing multer/S3 middleware. GPS coords validated to ±90 / ±180. Hard-delete with audit trail.
- Routes mounted at `/api/project-documents/:projectId` (list + upload) and `/api/documents/:id` (delete) — split to avoid the bare `/api` mount that briefly shadowed `/api/health`.
- Receipt-photo endpoint: `PATCH /api/transactions/:id/receipt` (multipart `file`), authorized to creator / manager / admin. Audited.

**Frontend**
- `documentsAPI` added to `client/src/services/api.js`.
- New page `/projects/:projectId/documents` — `ProjectDocuments.jsx`:
  - Category filter dropdown
  - Choose-photo button → preview → category picker → optional name + description → optional "Tag with GPS" checkbox (browser geolocation)
  - Grid gallery with category-icon thumbnails (image previews for actual images)
  - Lightbox click-to-zoom
  - Delete-with-confirm (uploader or admin only)
- App.jsx route registered.

### Verified

- 61/61 server tests still passing.
- Server boots clean; `/api/health` returns 200.
- Document endpoints correctly 401 without token.
- Receipt endpoint 401s without token.
- All locale JSON parses cleanly.

### Pending live tests

- [ ] Visit `/projects/<id>/documents` → see empty state on a fresh project
- [ ] Upload a photo with category PHOTO_PROGRESS + GPS → appears in grid with 📍 footer
- [ ] Click thumbnail → lightbox opens
- [ ] Filter by category → only matching docs appear
- [ ] Try to delete someone else's photo as engineer → 403
- [ ] Delete own photo → grid updates immediately
- [ ] As admin, delete any photo → succeeds; audit log shows DELETE entry

### Known limitations

- **Image-only at upload time** — multer's `fileFilter` allows JPEG/PNG/GIF/WebP only; PDFs/contracts will be rejected with "Invalid file type". Broaden the fileFilter to accept `application/pdf` if needed.
- **No EXIF parsing** — `takenAt` only set if client passes it. Mobile capture will populate this.
- **No mobile UI yet** — endpoint and upload paths are ready, but no mobile screen calls them yet (Phase 4 mobile work will add).

---

## 2026-05-02 — Phase 2 (part 2): 2FA + Activity Feed UI

**Author**: Claude
**Scope**: Backend 2FA + frontend 2FA settings + activity feed UI

### What landed

**Backend**
- `User.totpSecret String?` and `User.totpEnabled Boolean @default(false)` added to schema (db pushed).
- New `server/lib/totp.js` wrapping `otplib` v13 functional API (the `authenticator` shape no longer exists in v13). `generateSecret()`, `verifyToken()` (async), `getOtpAuthUrl()`. Renders QR via `qrcode` npm package as data-URL.
- `authController` extended:
  - `login` now returns `{ requires2FA: true, challengeToken }` when `user.totpEnabled` instead of issuing a full session token. Challenge token is a 5-min JWT with `purpose: '2fa'` claim — explicitly rejected by the regular auth path.
  - `login2FA` (POST /api/auth/2fa/login) — redeems the challenge token + 6-digit code for a full session.
  - `enroll2FA` — generates and stages a fresh secret, returns QR + otpauth URL. `totpEnabled` stays false until confirmation.
  - `confirmEnroll2FA` — verifies a code against the staged secret, flips `totpEnabled=true`. Audits `2FA_ENABLE`.
  - `disable2FA` — requires current password AND a valid TOTP code. Audits `2FA_DISABLE`.
  - `status2FA` — returns `{ enabled, pendingEnrollment }`.
- Zod schemas: `login2FASchema`, `confirmEnroll2FASchema`, `disable2FASchema`. 6-digit regex enforced.
- New `tests/totp.test.js` — 7 tests on the TOTP helper (success, wrong-secret rejection, malformed input, getOtpAuthUrl shape).

**Frontend**
- `client/src/services/api.js` — added `authAPI.login2FA`, `authAPI.twoFactor.{status,enroll,confirm,disable}`, plus `auditLogAPI.{list,history}` and `tenantAPI.{getApprovalThresholds, updateApprovalThresholds}`.
- `AuthContext`:
  - `login()` now passes through `requires2FA` responses without storing a session.
  - New `complete2FALogin(challengeToken, code)` finalizes the session.
- `Login.jsx` — branches into a code-input view when `requires2FA` is returned; auto-strips non-digits, autofocus, calls `complete2FALogin`.
- New page `TwoFactorSettings.jsx` at `/security/two-factor` — status banner, enroll flow with QR display + secret-copy button + 6-digit confirm input, disable flow requiring password + code.
- New page `AuditLog.jsx` at `/audit-log` (admin-only) — filterable by entity / action / userId, expandable per-row JSON details (before/after/metadata), cursor-based "Load more" pagination, action-color badges.
- Sidebar nav: ShieldCheck icon for "Two-Factor" (every user); Activity icon for "Activity Log" (admin/super-admin only). Locale keys `nav.auditLog`, `nav.twoFactor` added in `en.json` + `ar.json`.

### Verified

- 61/61 server tests passing (35 schema + 19 thresholds + 7 totp).
- Server boots clean.
- `/api/auth/2fa/status` correctly 401s without token.
- `/api/auth/2fa/login` validates input (400 for missing fields).
- Bad challenge tokens return 401 with "Invalid or expired challenge token".
- All locale JSON parses cleanly.

### Pending live tests (need browser + a real authenticator app)

- [ ] Visit `/security/two-factor` → "Enable Two-Factor" → QR shows
- [ ] Scan with Google Authenticator → enter code → confirm → status flips to ON
- [ ] Logout, login again → `/api/auth/login` returns `{ requires2FA, challengeToken }` → form switches to 6-digit input
- [ ] Enter valid TOTP → land on dashboard
- [ ] Enter wrong code → 401 "Invalid two-factor code", form stays
- [ ] Wait 5+ minutes after first step, enter code → 401 "Invalid or expired challenge token"
- [ ] On `/security/two-factor`, click "Disable" → enter password + code → status flips OFF
- [ ] Visit `/audit-log` as admin → see entries from prior test sessions
- [ ] Filter by entity=User action=ROLE_CHANGE → shows only role changes
- [ ] Expand an entry → see before/after JSON with secrets redacted (no passwords/tokens)
- [ ] Visit `/audit-log` as engineer → 403 / "Admins only" message
- [ ] Pagination: trigger >50 entries, click "Load more" → next page appears

---

## 2026-05-02 — Phase 2 (part 1): Multi-level approvals + Restore endpoints

**Author**: Claude
**Scope**: Server-side only; UI tests pending

### What landed

- New `Tenant.approvalThresholds Json?` field; defaults applied when null.
- `server/lib/approvalThresholds.js`:
  - `ROLE_RANK` map (ENGINEER/ACCOUNTANT=1, PM=2, ADMIN=3, SUPER_ADMIN=4)
  - `DEFAULT_THRESHOLDS`: `[{≤5k → ENGINEER}, {≤50k → PM}, {null → ADMIN}]`
  - `requiredRoleForAmount(amount, tenant)` — picks tier
  - `canAutoApprove(callerRole, amount, tenant)` — initial status decision
  - `ensureCanApprove(...)` — throws `InsufficientApprovalRankError` (statusCode 403)
  - `validateThresholds(input)` — for the PUT endpoint
- `transactionControllerV2.createTransactionV2` now uses `canAutoApprove` instead of `if role === ENGINEER`.
- `transactionController.approveTransaction` calls `ensureCanApprove` before the financial side-effects; returns 403 with `requiredRole`/`callerRole` if rank insufficient.
- New endpoints:
  - `GET /api/tenant/approval-thresholds` (admin/super-admin)
  - `PUT /api/tenant/approval-thresholds` (admin/super-admin) with `validateThresholds` + audit
- Restore endpoints (admin/super-admin) for soft-deleted records:
  - `PUT /api/clients/:id/restore`
  - `PUT /api/suppliers/:id/restore`
  - `PUT /api/materials/:id/restore`
  - `PUT /api/workmen/:id/restore`
  - `PUT /api/projects/:id/restore`
- New file: `tests/approvalThresholds.test.js` — 19 unit tests covering tier lookup, auto-approve decision, rank guard, custom configs, validation errors.

### Verified

- 54/54 tests pass (35 schema + 19 thresholds).
- Server boots clean.
- Approval-thresholds endpoint correctly 401s without token.
- Restore endpoints correctly 401 without token.

### Pending UI / live tests

- [ ] As ENGINEER, create 1k expense → status=APPROVED (auto)
- [ ] As ENGINEER, create 10k expense → status=PENDING_APPROVAL
- [ ] As PROJECT_MANAGER, create 100k expense → status=PENDING_APPROVAL
- [ ] As PROJECT_MANAGER, try to approve 100k pending → 403 with requiredRole=ADMIN
- [ ] As ADMIN, approve 100k pending → succeeds, audit log shows APPROVE entry
- [ ] As ADMIN, GET /api/tenant/approval-thresholds → returns defaults + isCustom=false
- [ ] As ADMIN, PUT thresholds with custom tiers → next transaction uses them
- [ ] PUT thresholds with `[]` → 400 validation error
- [ ] Soft-delete a client, then PUT /api/clients/:id/restore → row returns to list
- [ ] As ENGINEER, try restore endpoint → 403 (admin only)

---

## 2026-05-02 — Phase 1 foundations shipped

**Author**: Claude
**Scope**: Audit log + soft delete (no UI tests yet)

### What landed

- New `AuditLog` Prisma model with `(entity, entityId)`, `(tenantId, createdAt)`, `(userId, createdAt)` indexes.
- `server/lib/audit.js` — `audit()` and `auditFromReq()` helpers. Sanitizes `password`, `verificationCode`, `resetPasswordToken`, etc. before persistence. Failures are logged but never throw (audit never breaks the caller).
- `deletedAt DateTime?` added to Client, Supplier, Material, Workman, Project.
- All controllers above updated:
  - List/find queries filter `deletedAt: null`
  - DELETE endpoints now soft-delete (`update({ deletedAt: new Date() })`)
  - CREATE/UPDATE/DELETE write audit entries
- User invite/update/delete writes audit (`INVITE`, `UPDATE`, `ROLE_CHANGE`, `DELETE`).
- Role create/update/delete writes audit.
- Custody fund/return writes audit (`FUND`, `RETURN` with balance metadata).
- Transaction approve/reject/delete writes audit (`APPROVE`, `REJECT` with reason, `DELETE` with snapshot).
- New endpoints:
  - `GET /api/audit-logs` (Admin/Super Admin) — paginated, filterable by entity/entityId/action/userId
  - `GET /api/audit-logs/:entity/:entityId` (any tenant member) — history of one resource
- Schema synced via `npx prisma db push`.

### Verified

- 35 schema unit tests still pass.
- Server boots clean.
- Audit log endpoint correctly 401s without token.
- All other endpoints still 401 as before (no regression in auth gate).

### Pending UI tests

- [ ] Soft-delete a client → confirm it disappears from list but row still exists in DB
- [ ] As admin, GET /api/audit-logs → see entries from the recent test session
- [ ] As engineer, GET /api/audit-logs → expect 403 (admin-only listing)
- [ ] As any user, GET /api/audit-logs/Client/<id> → see history (cross-role read)
- [ ] Transaction approve writes a record with action=APPROVE
- [ ] Custody fund writes a record with action=FUND and balance metadata
- [ ] User role change writes action=ROLE_CHANGE with `from` / `to` metadata
- [ ] Soft-deleted client cannot be referenced in a new transaction (FK still works because record exists, but list/picker excludes it)

---

## 2026-05-01 — Initial smoke pass (web)

**Tester**: 8ofrii
**Environment**: Demo Co tenant, port 5000 backend, port 5173 web frontend
**Reference plan**: TESTING-WEB.md §1, §3, §7

### Findings

| # | Section | Severity | Status | Notes |
|---|---|---|---|---|
| 1 | §1.2 — Login wrong password | High UX | ✅ **Fixed** | Form blanked silently; no error message. Root cause: `client/src/services/api.js` 401 interceptor redirected on every 401 including the login attempt itself, causing a hard reload that aborted the catch handler. Fix in commit `1ecaa4c`. |
| 2 | §1.6 — Register company | Critical | ✅ **Fixed** | Threw `Database error (P2028)`. Root cause: `prisma.$transaction(async (prisma) => …)` had no explicit timeout + the inner `prisma` shadowed the outer client. Fix: rename inner var to `tx`, add `{ timeout: 15000, maxWait: 5000 }`. Commit `1ecaa4c`. |
| 3 | §7.10 — Reports / Dashboard chart | Medium | ✅ **Fixed** | "Expenses by Category" donut showed `Client Payment` (income) and raw key `finance.categories.management_fee_transfer`. Root causes: backend `getStats` lumped all transactions into `byCategory` regardless of type; missing translation key. Fix: filter to `type === 'EXPENSE' && category !== 'MANAGEMENT_FEE_TRANSFER'`; added `management_fee_transfer` and `custody_transfer` to both locales. Commit `1ecaa4c`. |
| 4 | §3.4 — Manager sees pending transactions | Critical | ✅ **Fixed** | Manager log-in: Accounting page showed "No Data Available". Root cause: `getTransactions` filtered PROJECT_MANAGER to projects where `engineerId === manager.id` — manager owns the empty Office project, engineer owns Villa with all the activity. Fix: PROJECT_MANAGER, ADMIN, ACCOUNTANT all see full tenant; only ENGINEER is restricted to own. Commit `1ecaa4c`. |

### Verified working

- Health endpoint with helmet headers (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, etc.)
- Rate-limit headers (`RateLimit-Policy: 1000;w=900`)
- 401 Not authorized when calling protected routes without token
- 400 Validation failed on malformed payloads (login bad email, register weak password, missing required fields)

### Remaining sections to test

§1.5, §1.9, §1.10, §1.11 — auth edge cases (rate limit, forgot password, token expiry, logout)
§2.1, §2.2, §2.3 — multi-tenant isolation
§3.1, §3.2, §3.3, §3.5, §3.6, §3.7, §3.8, §3.9 — RBAC per role
§4.* — validation & input safety (mass-assignment, SQL/XSS, enum rejection, decimal coercion, dates)
§5.* — Project CRUD per role
§6 — Clients/Suppliers/Workmen/Materials per-entity
§7.1–7.9, §7.11 — V1.2 financial logic verification (Villa math should equal safe=309,500)
§8.* — Custody management
§9.* — Notifications
§10.* — Roles advanced
§11–§19 — i18n, theme, uploads, chat, inventory, office fees, performance, security headers, edge cases

---

## Mobile testing — pending

The mobile app was built in this session but not yet tested end-to-end. Pending checklist:

- [ ] Boot Expo on Android emulator (10.0.2.2 backend)
- [ ] Boot Expo on physical Android phone via Expo Go (LAN IP backend)
- [ ] Login as `admin@demo.local`
- [ ] Tap a project card → ProjectDetail loads with financials
- [ ] Finance tab → see all 17 demo transactions
- [ ] Manager logs in → sees pending approval → tap Approve → transaction status flips
- [ ] Engineer logs in → Profile shows custody balance (55,000 EGP after seed)
- [ ] Toggle Arabic → entire UI flips RTL
- [ ] Notifications tab shows 3 demo notifications
- [ ] Profile → Fund Engineer (admin only) → top up engineer's custody → balance increases
- [ ] Profile → Clients/Suppliers/Workmen each load their list

---

## How to use this log

When you start a test session:

1. **Add a dated section at the top** with `## YYYY-MM-DD — <short description>`
2. List **environment**, **tester**, and **reference plan section(s)**
3. Record **findings as a table**: number, plan section, severity, status, notes
4. Mark resolved issues `✅ **Fixed**` and reference the commit hash
5. Mark known-issue regressions or partial fixes `⚠️ **Open**` with details
6. Update the **Verified working** list and **Remaining sections** at the bottom of each session

Keep entries terse. The TESTING-WEB.md plan owns the *how to test*; this log owns the *what we found*.
