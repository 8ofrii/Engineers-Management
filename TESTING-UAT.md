# User Acceptance Testing (UAT) Plan

> **Audience:** real users (your team) testing realistic workflows.
> **Distinct from:** [TESTING-WEB.md](TESTING-WEB.md) — that doc is the developer/QA security & edge-case plan. This one walks each role through a normal day.

**Goal:** validate that the four daily-user roles (Admin, Project Manager, Engineer, Accountant) can each do their job end-to-end, and that the handoffs between them work — **including the new Phase 7 AI capture flow** (record voice or photograph a receipt → AI prepares a draft transaction → human reviews + saves).

**Test environment:** production at `https://main.d36u8gv8p7366f.amplifyapp.com` (web) and prod backend at `https://engineers-management.onrender.com`. Mobile testers point their app at the same prod backend.

---

## How to use this document

1. **You** (project owner) complete the **Pre-flight** below before any tester logs in.
2. Assign one tester per persona — Admin, Manager, Engineer, Accountant. (One person can play multiple personas if needed; just log out between roles.)
3. Each persona section is self-contained — testers work through their own walkthrough first.
4. The **End-to-end stories** at the bottom require two or more testers coordinating.
5. Anything that doesn't work as described → log it in the **Bug report template** at the end.

**Estimated time per persona:** 30–45 minutes. End-to-end stories: 30 minutes total.

---

## Pre-flight (project owner)

Run all of these before testers start. The system is deployed (web on Amplify, API on Render) — these are one-time setup checks against the **production** environment.

### A. Production backend healthy

```cmd
curl -i https://engineers-management.onrender.com/api/health
```
Expect `HTTP 200` with helmet headers (CSP / HSTS / etc.) visible.

### B. Schema synced to prod DB ⚠️ ONE-TIME REQUIRED

The Render build script doesn't run migrations. Phases 1-7 added new tables (`audit_logs`, `documents`, `daily_site_reports`, `invoices`, `transaction_drafts`) that may not exist on prod yet. From your local machine:

```cmd
cd C:\8ofri\civil\Engineers-Management\server
set DATABASE_URL=<your Render Postgres connection string>
npx prisma db push
```

Inspect proposed changes — should add tables + enums; nothing destructive. If you skip this, **anything that touches the new tables will 500**, including AI draft creation, invoices, DSRs.

### C. Demo data seeded on prod DB

```cmd
cd C:\8ofri\civil\Engineers-Management\server
set DATABASE_URL=<your Render Postgres connection string>
node scripts/setup-test-users.js
node scripts/seed-demo-data.js
```
Expect: 4 users (admin/manager/engineer/accountant @demo.local), 5 clients, 6 suppliers, 8 materials, 6 workmen, 3 projects, ~17 transactions.

### D. CORS includes the Amplify origin

In Render dashboard → Environment, confirm:
```
CORS_ALLOWED_ORIGINS=https://main.d36u8gv8p7366f.amplifyapp.com
```
If empty in prod, every browser request returns 403. Quick check: open the Amplify URL — if the Login page loads but submit hangs, CORS is the suspect.

### E. OpenAI quota is topped up ⚠️ Phase 7 hard dependency

Phase 7 (voice + receipt extraction) calls OpenAI Whisper + GPT-4o-mini. If the OpenAI account has zero credit, AI capture returns a clear "AI service is unavailable (quota exhausted)" alert, but no draft is created. Top up at https://platform.openai.com/account/billing before UAT starts.

### F. Web — open the Amplify URL

Testers go to `https://main.d36u8gv8p7366f.amplifyapp.com`. No local install needed for web testing.

### G. Optional: SMTP for emails

Already configured in Render env (`SMTP_EMAIL` / `SMTP_PASSWORD`). If a tester reports "send invoice email" doesn't arrive, the project owner checks Render env vars + Gmail app-password validity.

### H. Mobile app (Engineer persona only)

If you want mobile UAT, the engineer tester needs:
1. Install **Expo Go** on Android/iPhone (free, App Store / Play Store)
2. Project owner runs locally on their laptop:
   ```cmd
   cd C:\8ofri\civil\Engineers-Management\mobile
   npx expo install expo-av
   npx expo install --fix
   npx expo start --clear
   ```
3. **Required**: edit `mobile/.env` so `EXPO_PUBLIC_API_URL=https://engineers-management.onrender.com/api` (points the app at production, not laptop). With this, the tester's phone doesn't need to be on the same Wi-Fi as the laptop.
4. Tester scans the Expo QR code in Expo Go.

> **Phase 7 voice on mobile requires `expo-av`** — it's a one-time install. If you skip it, the voice button on mobile crashes with "Audio is undefined". Photo capture works without it.

### I. Test accounts (all passwords: `Demo@1234`)

| Role | Email |
|---|---|
| Admin | admin@demo.local |
| Project Manager | manager@demo.local |
| Engineer | engineer@demo.local |
| Accountant | accountant@demo.local |

---

## Persona 1 — Admin (admin@demo.local)

You own the company in the system. You can see everything, invite people, and configure rules. **Estimated: 40 min.**

### 1.1 First login + 2FA setup
1. Open `http://localhost:5173`
2. Log in with `admin@demo.local` / `Demo@1234`
3. **Expected:** Dashboard loads showing project counts and a chart.
4. Open the language switcher in the header → pick **العربية**. The whole UI flips to Arabic, layout switches to right-to-left.
5. Switch back to **English**.
6. Open the user menu → **Security / Two-Factor Authentication** (or sidebar → Security).
7. Click **Enable 2FA**. A QR code appears.
8. Open Google Authenticator (or Microsoft Authenticator) on your phone, scan the QR.
9. Type the 6-digit code from the app into the form. Click **Confirm**.
10. **Expected:** "2FA enabled" confirmation. Log out.
11. Log back in with `admin@demo.local` / `Demo@1234`. **Expected:** prompt for 2FA code. Enter it, you're in.
12. **At the end of UAT,** disable 2FA again so the demo account stays simple: Security page → **Disable 2FA**, enter password + current code.

### 1.2 Invite a team member
1. Sidebar → **Team** (or **Users**)
2. Click **Invite User**
3. Fill: Name = "Test Engineer 2", Email = `test2@demo.local`, Role = ENGINEER
4. Submit
5. **Expected:** New row appears in the user list. (If SMTP is configured, an invite email lands; if not, the user is created but unverified.)

### 1.3 Create master data
1. Sidebar → **Clients** → **+ Add Client**. Fill name = "El-Nasr Contracting", phone, email. Save.
2. Sidebar → **Suppliers** → **+ Add Supplier**. Fill name = "Cairo Cement Co". Save.
3. Sidebar → **Materials** → **+ Add Material**. Fill name = "Steel Rebar 12mm", unit = "ton", reorder level = 5. Save.
4. Sidebar → **Workmen** → **+ Add Workman**. Fill name = "Ali Ahmed", trade = "Carpenter", daily rate = 350. Save.
5. **Expected:** Each row appears immediately in its list page.

### 1.4 Configure office fee (V1.2 profit engine)
1. Sidebar → **Office Fees** (or Settings → Office Fees)
2. **Expected:** Default fee table by category (e.g., Concrete 8%, Materials 10%, etc.)
3. Edit one row's percentage, save. **Expected:** new value persists on refresh.
4. Reset to original value.

### 1.5 Soft-delete and restore
1. Clients page → click delete on the client you created in 1.3.
2. **Expected:** Client disappears from the list.
3. Toggle the **"Show deleted"** filter (if present), find the deleted client, click **Restore**.
4. **Expected:** Client returns to the active list.

### 1.6 View activity log (audit feed)
1. Sidebar → **Activity Log** (admin-only page)
2. **Expected:** Table of recent events — each invite, create, delete you just did has a row with timestamp, actor, entity, action, before/after snapshot.
3. Click a row → expand to see what changed.

### 1.7 View invoices (read-only role check)
1. Sidebar → **Invoices**
2. **Expected:** List of invoices (likely empty if you haven't tested invoicing yet — that's covered in Manager persona).

### 1.8 View documents on a project
1. Sidebar → **Projects** → click "Villa" project.
2. Find a **Documents** or **Photos** tab/button on the project detail page.
3. **Expected:** A page showing categories (Progress / Receipt / Issue / etc.) and any uploaded photos.

### 1.9 Activity log captures admin actions
1. Go back to Activity Log.
2. **Expected:** Your actions from 1.2 through 1.5 are all logged in chronological order.

### 1.10 Logout
- Click logout. **Expected:** Returns to login page. Refreshing or pressing back doesn't restore the session.

---

## Persona 2 — Project Manager (manager@demo.local)

You run construction projects. You assign engineers, approve their spend, acknowledge their daily reports, and bill the client. **Estimated: 45 min.**

### 2.1 Login
- Log in with `manager@demo.local` / `Demo@1234`. **Expected:** Dashboard loads.

### 2.2 Browse the projects you manage
1. Sidebar → **Projects**
2. **Expected:** You see all 3 demo projects (Villa, Office, Apartment). The Office project is the one you own.
3. Click **Villa**. **Expected:** Project detail with budget, spent, safe balance, and a transaction table.
4. Confirm the Villa numbers (CONTEXT.md §7):
   - Budget: 2,500,000 EGP
   - Actual Cost: 455,000 EGP
   - Office Revenue: 35,500 EGP
   - Project Safe Balance: 309,500 EGP
   - 1 transaction shown as **PENDING APPROVAL** (50,000 EGP carpentry)

### 2.3 Approve a pending transaction
1. Sidebar → **Finance** (or Transactions)
2. Filter by status → **Pending Approval**
3. Find the carpentry transaction (50,000 EGP). Click **Approve**.
4. **Expected:** Status flips to **APPROVED**. Project safe balance decreases by 50,000 EGP. If the project is `EXECUTION_COST_PLUS`, a new "Management Fee Transfer" entry appears (5,000 EGP — 10% fee), and Office Revenue increases by 5,000 EGP.

### 2.4 Reject a transaction
1. Switch to engineer (in another browser window or after logging out): create an EXPENSE for 1,000 EGP on Villa (any category).
2. Back as manager: filter Pending Approval, find that 1,000 EGP transaction, click **Reject** with a reason.
3. **Expected:** Status → REJECTED. Project safe balance unchanged.

### 2.5 Daily Site Reports (DSR) — review and acknowledge
1. Sidebar → **Daily Site Reports** (or DSRs)
2. **Expected:** Empty or has DSRs from the engineer persona walkthrough (will be filled in 3.5 below).
3. After the engineer submits a DSR, refresh and find it. Click in to view.
4. **Expected:** Photos, weather, attendance, materials received are all visible. Status = SUBMITTED.
5. Click **Acknowledge**.
6. **Expected:** Status flips to ACKNOWLEDGED. The engineer's view in mobile updates the next time they refresh.

### 2.6 Create an invoice
1. Sidebar → **Invoices** → **+ New Invoice**
2. Pick the client = "Mahmoud Ali" (one of the seeded ones), project = "Villa".
3. Add 2 line items:
   - "Site preparation work, October" — qty 1, unit price 100,000 EGP
   - "Foundation excavation, October" — qty 1, unit price 50,000 EGP
4. Tax rate = 14% (default for Egyptian VAT).
5. Due date = next month.
6. Click **Save Draft**.
7. **Expected:** Invoice appears in the list with auto-generated number `INV-2026-0001` (or next number), status DRAFT.
8. Click **View PDF** (or download icon).
9. **Expected:** A PDF opens/downloads showing the company header, bill-to, line items table, totals.

### 2.7 Send the invoice (only if SMTP configured)
1. From the invoice list, click **Send** on the new invoice.
2. Confirm recipient email (the client's email or yours for testing).
3. Custom message (optional).
4. Submit.
5. **Expected:** Status flips to SENT. The recipient receives an email with the invoice PDF attached.
6. Open the email, confirm the PDF is readable.

### 2.8 Record a partial payment
1. Click **Record Payment** on the SENT invoice.
2. Outstanding balance is shown. Enter half the amount (e.g., 85,500 EGP if total was 171,000).
3. Submit.
4. **Expected:** Status flips to **PARTIALLY_PAID**. The invoice detail shows "Paid: 85,500 / Balance: 85,500".
5. Record the second half. **Expected:** Status flips to **PAID**.

### 2.9 Cancel a draft invoice
1. Create another invoice (any data).
2. Click **Cancel** on it.
3. **Expected:** Status flips to CANCELLED. You cannot record payments on a cancelled invoice.

### 2.10 Engineer custody
1. Sidebar → **Custody** (or Engineer Funding)
2. **Expected:** Table of engineers with their current custody balance.
3. Click **Fund** on the seeded engineer. Add 5,000 EGP.
4. **Expected:** Balance increases by 5,000 EGP. The engineer can now spend from custody.

### 2.11 Logout

---

## Persona 3 — Engineer (engineer@demo.local) — Web + Mobile

You're on-site. You record work, capture daily reports, upload receipt photos. You can see your projects but cannot approve anything. **Estimated: 60 min** (web 20 min + mobile 40 min).

### Web side

#### 3.1 Login
- Log in via `http://localhost:5173`. **Expected:** Dashboard.

#### 3.2 You only see your projects
1. Sidebar → **Projects**
2. **Expected:** You see Villa + Apartment (assigned to you in seed). You do **NOT** see Office (manager owns it). If Office is visible, log a bug.

#### 3.3 Create a transaction (expense)
1. Project Villa → **+ New Transaction** (or Finance → +)
2. Type = EXPENSE, category = "Carpentry / مصنعية نجارة" (or any), amount = 2,500 EGP, payee = "Cairo Cement Co"
3. Description = "Test expense from engineer"
4. Submit.
5. **Expected:** Transaction appears with status **PENDING APPROVAL** (NOT approved yet). Project safe balance does **not** change.

#### 3.4 Try to approve your own transaction
1. Open Finance, find your pending transaction.
2. **Expected:** No "Approve" button. If you see one and clicking it works, that's a bug.

#### 3.5 Upload a receipt photo on a transaction
1. Open the transaction you created in 3.3.
2. Find **Upload Receipt** / paperclip icon.
3. Pick any JPEG/PNG photo (under 10 MB).
4. **Expected:** Photo uploads, thumbnail appears on the transaction.

### Mobile side

> Pre-req: Pre-flight section F is done. Phone is on Expo Go and connected to the same Wi-Fi as the laptop running the backend.

#### 3.6 Mobile login
1. Open the app via Expo Go.
2. **Expected:** Login screen with a small diagnostic showing the API URL.
3. Log in with `engineer@demo.local` / `Demo@1234`.
4. **Expected:** Bottom tab bar appears (Projects / Finance / DSR / Notifications / Profile).

#### 3.7 Browse projects on mobile
1. Tap **Projects** tab.
2. **Expected:** Same project list as web (Villa + Apartment).
3. Tap Villa. **Expected:** Project detail with financials and transaction list.

#### 3.8 Create a transaction on mobile
1. Finance tab → **+** floating button.
2. Type = EXPENSE, project = Villa, category, amount = 1,200 EGP.
3. Submit.
4. **Expected:** Transaction added in PENDING_APPROVAL state, mirrors the web flow.

#### 3.9 Daily Site Report — capture flow (the big one)
1. **DSR** tab → **+** button.
2. Pick project = Villa.
3. Pick today's date (default).
4. Pick weather chip = Sunny.
5. Tap **Workmen Attendance** → modal with workmen list. Tick 2 workmen as PRESENT, set hours = 8, mark 1 as ABSENT.
6. Add a note in **Issues** = "Cement delivery delayed by 2 hours."
7. **Add Photo** → camera permission prompts → take a photo (or pick from library).
8. Add a second photo from library.
9. **Expected:** Both photos preview as thumbnails in the form.
10. Tap **Save Draft** first. **Expected:** DSR saved, returns to list, status = DRAFT.
11. Open the draft → tap **Submit**. **Expected:** Status flips to SUBMITTED. (Now go to Manager persona section 2.5 to acknowledge.)

#### 3.10 GPS tag on photos
1. Open the DSR you just submitted → tap a photo.
2. **Expected:** Photo metadata shows GPS coords if your phone allowed location access.

#### 3.11 Notifications on mobile
1. Notifications tab.
2. **Expected:** Any approval / rejection / DSR-acknowledgement events from your transactions appear here. Tap one — marks read.

#### 3.12 Custody balance visible on mobile
1. Profile tab.
2. **Expected:** Shows your custody balance (the 5,000 EGP the manager funded in 2.10).

#### 3.13 Mobile logout

---

## Persona 4 — Accountant (accountant@demo.local)

You read finance data, generate reports, export to CSV. You cannot create or approve. **Estimated: 25 min.**

### 4.1 Login
- `accountant@demo.local` / `Demo@1234`.

### 4.2 Dashboard view
1. **Expected:** Read-only dashboard, all numbers visible.
2. **Expected:** No "+ Add" buttons in the header.

### 4.3 Browse Finance
1. Sidebar → **Finance**
2. **Expected:** All transactions visible across all projects in your tenant. Filters work.
3. **Expected:** No Approve / Reject / Edit / Delete actions on rows. (If any are visible and clicking them succeeds — bug.)

### 4.4 Reports
1. Sidebar → **Reports**
2. **Expected:** Profit/loss summary, project-level financials, charts.
3. Click **Export CSV** on any report.
4. **Expected:** A CSV file downloads with the report data.
5. Open it in Excel/Numbers — verify rows & columns make sense, no broken UTF-8 (Arabic should display correctly).

### 4.5 Cannot create master data
1. Try to navigate to Clients → look for **+ Add Client** button.
2. **Expected:** Either the button is hidden, or clicking it shows a permission error.

### 4.6 Cannot create transactions
1. Finance → **+ New** button.
2. **Expected:** Hidden or disabled.

### 4.7 Cannot delete or modify
1. Finance → click any row.
2. **Expected:** No delete/edit options. Read-only detail only.

### 4.8 View invoices read-only
1. Sidebar → **Invoices**.
2. **Expected:** Can view + download PDF. No create / send / payment actions.

### 4.9 Logout

---

## Persona 5 — AI Drafts (engineer + manager flow)

The hero feature: capture an expense by **voice** ("اشترينا 50 شيكارة أسمنت بـ 25 ألف جنيه") or **photo** of a receipt. The AI prepares a pre-filled draft transaction. The engineer reviews + edits + saves with one tap. **Estimated: 30 min for the engineer flow + 10 min for the manager review.**

> **Pre-reqs:** Schema sync done (Pre-flight B), demo data seeded (C), OpenAI quota available (E). On mobile, `expo-av` installed (H).

### 5.1 Three ways to capture — engineer must try all three

Log in as `engineer@demo.local` (web).

#### a. The "AI Drafts" sidebar entry

1. Sidebar → **AI Drafts** (✨ icon between Invoices and admin items)
2. **Expected:** Empty list with two big buttons at the top: 🎤 **Voice Draft** and 📷 **Receipt Draft**

#### b. The global FAB (✨ +)

1. Look at the **bottom-right corner** on Dashboard, Projects, Finance — there's a circular blue **+** button.
2. Click it. Two pill buttons appear: **Voice** and **Receipt**.
3. **Expected:** The button rotates 45° to ✕ when expanded; tapping anywhere outside the menu closes it.
4. Repeat the check on at least 3 different pages (Dashboard, Finance, Projects) — FAB should be on all of them but **NOT** on the draft review screen itself.

#### c. The chat assistant 🎤 button

1. Sidebar → **Chat Assistant**
2. Click the microphone icon next to the message input, record a short note.
3. **Expected:** After processing, the chat shows your transcript as a user-side bubble + an **AI-summary CARD** (not a normal chat bubble) showing amount / category / description / "Review draft" link. Tapping the card opens the review screen.

### 5.2 Voice capture happy path (web)

1. Open `/drafts` (or click the 🎤 from any FAB / chat).
2. Tap **Voice Draft** → modal opens with timer 0:00 / 1:00.
3. Tap **Start recording**, speak in Arabic or English (e.g. "اشترينا 50 شيكارة أسمنت من شركة القاهرة بـ 25 ألف جنيه" / "we bought 50 bags of cement for 25 thousand").
4. Tap **Stop** → audio preview appears with a play button.
5. Tap **Process with AI** (or **Re-record** if the recording was bad).
6. **Expected:** ~3-5 second wait, then you land on `/drafts/<id>` showing:
   - Left side: audio player (clickable to replay) + transcript text + items list
   - Right side: editable form with **Amount = 25000**, **Category = MATERIALS**, project/supplier dropdowns
   - Confidence pills next to fields (blue "AI matched · 92%" if it found the supplier "Cairo Cement")

### 5.3 Voice capture — bad audio (silence / noise)

1. Tap Voice → start recording → don't say anything → stop.
2. Process with AI.
3. **Expected:** Either an empty/low-confidence draft OR an error alert. **Should NOT** silently create a junk transaction.

### 5.4 Receipt photo capture (web)

1. Tap **Receipt Draft** (any entry point).
2. File picker opens → choose any receipt or invoice photo (JPEG/PNG/HEIC, ≤8 MB).
3. **Expected:** Land on review screen. Image renders on the left, form pre-filled on the right with vendor / total / items extracted.

### 5.5 Review modal — edit before saving

The review surface is a **modal popup** that opens over `/drafts` (not a separate page). Clicking a row, opening from the FAB, or arriving via `/drafts/:id` deep-link all open the same modal.

Inside the modal:

1. **Amount** field — pre-filled from AI extraction.
2. **Cost Category** — full Arabic-categorized dropdown (خرسانات / أسمنت / مصنعية بناء / مصنعية محارة / etc.) grouped by general type, just like the manual Add Transaction modal. AI's high-level inference seeds a sensible default but you can drill down.
3. **Project / Supplier** — dropdowns with confidence pills next to the label ("AI · 92%" or yellow "no match").
4. **Item Name / Qty / Unit / Unit Price** — pre-filled from the first item the AI detected. Useful for inventory-style purchases.
5. **Payment Method** — defaults to Custody Wallet.
6. **Cost Center / Paid by** — optional.
7. **Description / Date** — Description pre-filled by AI; Date defaults to today.
8. Click **Re-match** — should re-run matching against the latest tenant data without losing your manual edits.
9. **Expected:** Project/supplier fields keep your selections; only fields you didn't touch get re-suggested.

### 5.6 Commit draft → real transaction

1. With the form filled, click **Save as transaction**.
2. **Expected:**
   - Success alert "Transaction saved. Draft moved to history."
   - Returns to `/drafts` list — the draft moved from "Pending Review" → "Committed"
   - Open `/finance` — the new transaction is there with status `PENDING_APPROVAL` (engineer-created)
   - Open Activity Log (admin only) — both `AI_EXTRACT` and `COMMIT` events appear

### 5.7 Discard a draft

1. Capture another voice/photo to create a new draft.
2. On the review screen, click **Discard**.
3. Confirm.
4. **Expected:** Returns to `/drafts`; draft moved to "Discarded" filter; the audio/image is no longer playable on the discarded record (we delete the media on discard).

### 5.8 No-match flow

1. In your voice note, mention a vendor name that doesn't exist as a Supplier (e.g. "Suez Steel Co").
2. After processing, on the review screen the Supplier field shows a yellow pill "AI heard 'Suez Steel Co' — no match".
3. In another tab, sidebar → Suppliers → Add Supplier "Suez Steel Co".
4. Back on the draft review, click **Re-match**.
5. **Expected:** The Supplier pill flips from yellow to blue with a confidence percentage; the dropdown auto-selects "Suez Steel Co".

### 5.9 Manager review of team drafts

1. Log out, log in as `manager@demo.local`.
2. Sidebar → **AI Drafts**.
3. **Expected:** Manager sees drafts from **all engineers** in the tenant, not just their own. Each row shows the creator's name. Engineer (Persona 3) sees only their own.

### 5.10 Mobile (engineer only)

> Pre-req: Pre-flight H done. Phone running the Expo app.

1. Mobile → bottom tab **Finance** → header has a small "✨ AI Drafts" pill button (top right).
2. Tap it → DraftsList screen with three large buttons: **Voice / Camera / Library**.
3. **Voice** — tap, grant mic permission, record, preview, process. Should land on the mobile review screen with the audio playable, transcript visible, form pre-filled.
4. **Camera** — opens the phone's camera; take a photo of a receipt; AI processes; review screen with photo visible.
5. **Library** — picks an existing photo. Same outcome.
6. On the mobile review screen, tap **Save transaction** → returns to drafts list.
7. **Expected:** Mobile flow mirrors web. Draft is visible on web `/drafts` with status Committed.

### 5.11 Error handling — quota / rate limit

If OpenAI quota is exhausted mid-test, the alert should clearly say so:
- "AI service is unavailable (quota exhausted). Please contact your administrator."

If you see a generic "Failed to process request", that's a regression — log it.

### 5.12 Tenant isolation

Drafts and their original media (audio/image URLs) are scoped to the tenant. As one tenant, you should never see another tenant's drafts in `/drafts`, and visiting another tenant's draft URL should return 404.

---

## End-to-end stories (multi-persona)

These are the real-world flows your users will live every day. They require coordination between testers (or one person logging in/out between personas).

### Story A — Onboarding a new engineer
**Personas needed:** Admin → Engineer

1. **Admin** invites a new engineer (Persona 1.2).
2. If SMTP is configured, the engineer receives an invite email with a verification code; otherwise, ask the project owner to fetch the code from `node scripts/list-users.js`.
3. **New engineer** opens `http://localhost:5173`, enters their email, the verification code, sets a password.
4. **Engineer** logs in. **Expected:** They see an empty project list (not assigned yet).
5. **Admin** opens Projects → Villa → assigns the new engineer.
6. **Engineer** refreshes. **Expected:** Villa now appears.

### Story B — Daily expense flow with profit engine
**Personas needed:** Engineer → Manager → Accountant

1. **Engineer** (mobile) creates an EXPENSE on Villa, 8,000 EGP, category = Concrete (خرسانات).
2. **Engineer** sees status PENDING_APPROVAL. Cannot approve.
3. **Manager** opens Finance → Pending → approves.
4. **Manager** opens Villa detail. **Expected:** Project Safe Balance decreased by 8,000 EGP. Office Revenue increased by 800 EGP (10% management fee transfer). A "MANAGEMENT_FEE_TRANSFER" row appears in the transaction list.
5. **Accountant** opens Reports. **Expected:** Office Revenue updated to reflect the new transfer. CSV export includes the new entries.
6. **Admin** opens Activity Log. **Expected:** All 3 events (create, approve, fee-transfer) are logged with actor + before/after.

### Story C — DSR end-to-end
**Personas needed:** Engineer (mobile) → Manager (web)

1. **Engineer** captures a DSR on mobile (Persona 3.9). Submits it.
2. **Manager** opens Daily Site Reports on web. Filters Status = Submitted.
3. **Manager** opens the DSR. **Expected:** Photos render, attendance + materials shown, weather + issues visible. GPS coords on photos if engineer's phone allowed location.
4. **Manager** clicks Acknowledge.
5. **Engineer** opens DSR list on mobile, refreshes. **Expected:** That DSR is now marked ACKNOWLEDGED.

### Story D — Invoicing + payment
**Personas needed:** Manager → Accountant → Admin

1. **Manager** creates an invoice (Persona 2.6) and downloads the PDF.
2. **Accountant** opens Invoices. **Expected:** Sees the new invoice in DRAFT, can view PDF, but no Send / Edit / Payment buttons available.
3. **Manager** sends the invoice (if SMTP) and records two partial payments (Persona 2.7–2.8). Status: DRAFT → SENT → PARTIALLY_PAID → PAID.
4. **Accountant** refreshes Invoices. **Expected:** Status reflects PAID. Can view payment history. Cannot modify.
5. **Admin** Activity Log. **Expected:** All invoice events (create / send / payment / payment) logged.

### Story E — Cross-tenant isolation
**Personas needed:** Admin (Demo Co) + a second tenant if available.

1. **Demo Co Admin** notes the URL of one of their projects (e.g., `/projects/abc-123`).
2. **Logout, log in as a tester from a different tenant** (if you have one — otherwise skip).
3. Try to navigate directly to `/projects/abc-123`.
4. **Expected:** "Project not found" or 404. Cross-tenant data is invisible.

### Story F — AI draft → approval → reconciliation (Phase 7 hero)
**Personas needed:** Engineer (mobile preferred) → Manager → Accountant → Admin

1. **Engineer** on mobile: open Finance tab → tap **AI Drafts** pill → **Voice**. Record an Arabic note: "صرفنا 3,500 جنيه نقل أسمنت لفيلا دكتور أحمد". Process.
2. **Engineer** lands on review screen. Confirms: amount = 3500, project = Villa, category = TRANSPORT or MATERIALS depending on AI inference. Edits if needed. Taps **Save transaction**.
3. **Engineer** opens Finance → sees the new transaction in **Pending Approval**. Navigates back to AI Drafts, confirms the draft is now in "Committed".
4. **Manager** logs in on web. Goes to **AI Drafts** filter "Pending Review" → expected: empty (engineer already committed). Filter "Committed" → sees the row with "Demo Engineer" as creator.
5. **Manager** opens Finance → "Pending Approval" filter → sees the same transaction. Approves it.
6. **Accountant** logs in. Reports → sees the 3,500 EGP reflected in expense totals. Activity log: shows AI_EXTRACT, COMMIT, APPROVE events in order.
7. **Admin** opens Activity Log → confirms all three events have actor + timestamps + before/after snapshots, no audio/image content leaked into the audit log (privacy check).

This is the real reason Phase 7 exists. If any step breaks, that's a release-blocker.

---

## Bug report template

For each issue found, please report:

```
**Persona:** <Admin / Manager / Engineer / Accountant>
**Section:** <e.g., 2.6, Story D step 3>
**Browser / device:** <Chrome 130, iPhone 15 Expo Go, etc.>
**What I did (steps):**
1.
2.
3.
**What I expected:**
**What actually happened:**
**Screenshot / video:** (attach if possible)
**Severity:** <Blocker / High / Medium / Low / Cosmetic>
```

Severity guide:
- **Blocker** — feature unusable, data loss, security issue, anyone in this role is stuck.
- **High** — feature works but has a serious flaw that affects daily use.
- **Medium** — feature works but has an annoying issue or unclear UI.
- **Low** — minor inconvenience or copy issue.
- **Cosmetic** — visual polish only (alignment, spacing, color).

Send reports to the project owner; they'll be triaged and added to [TESTING-LOG.md](TESTING-LOG.md).

---

## Sign-off checklist (project owner)

After UAT closes, the project owner confirms:

- [ ] All four personas completed their walkthrough
- [ ] All five end-to-end stories ran successfully
- [ ] Reported bugs are logged in TESTING-LOG.md and triaged
- [ ] Blocker / High issues either fixed or accepted with a note
- [ ] Demo data restored to clean state (`node scripts/seed-demo-data.js` after UAT)
- [ ] Phase 6 is approved to continue (bank reconciliation, billing)

---

*Generated 2026-05-03 alongside Phase 6.1 (Sentry monitoring) shipping. Update this file as features change. New phases need new sections — at minimum, a story walkthrough per persona affected.*
