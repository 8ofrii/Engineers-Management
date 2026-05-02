# Testing Log

> **Purpose**: running log of every test session — what was tested, what was found, what was fixed, what's still open. Append new entries to the top. Reference test sections in [TESTING-WEB.md](TESTING-WEB.md).

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
