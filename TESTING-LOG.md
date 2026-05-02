# Testing Log

> **Purpose**: running log of every test session — what was tested, what was found, what was fixed, what's still open. Append new entries to the top. Reference test sections in [TESTING-WEB.md](TESTING-WEB.md).

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
