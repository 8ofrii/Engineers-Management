# Engineers Management — UI/UX Design Brief

> **Document purpose**: comprehensive brief for a UI/UX designer to draft the visual + interaction design system and per-screen mockups across web and mobile. This is a working SaaS product — the designer will refresh the look and design upcoming screens, not start from scratch.

**Project**: Engineers Management — Construction ERP for Egyptian engineering firms
**Owner**: 8ofry
**Repo**: https://github.com/8ofry/Engineers-Management
**Last updated**: 2026-05-03

---

## 1. One-paragraph summary

A **multi-tenant SaaS Construction ERP** for Egyptian engineering and construction firms. Each company gets its own isolated workspace covering projects, clients, suppliers, workmen, materials, transactions, daily site reports, invoices, and audit. The product replaces the Excel + WhatsApp + paper receipts workflow that small-to-mid Egyptian contractors currently use. It's already functional in production with a working web app, a React Native mobile companion, an AI voice/receipt assistant, multi-language (Arabic + English with full RTL), and a custom "Profit on Expense" financial engine specific to Egyptian construction practice. We need a professional design refresh of the existing screens plus designs for the upcoming AI capture, billing, and bank reconciliation surfaces.

---

## 2. Market & positioning

### Who buys this
- **Egyptian construction contractors and engineering offices**, 5–50 employees
- Currently track jobs in Excel, receipts in WhatsApp, attendance on paper
- Owner-operators who care about cash flow and profit margins per project

### What makes us different from generic ERPs
- **V1.2 Profit-on-Expense engine** — auto-transfers a configurable management fee from project safe balance to office revenue every time an expense is approved on cost-plus contracts. No competitor has this for the Egyptian market.
- **Bilingual Arabic-first** with full RTL — competing products are English-only or poorly translated
- **AI voice & receipt capture** — engineer says "اشتريت 100 شيكارة أسمنت بـ 18000 جنيه" or photographs a receipt; the system creates a draft transaction
- **Daily Site Reports** — engineers log progress, weather, attendance, photos from mobile every day; managers acknowledge from web
- **Native Egyptian conventions** — categories like خرسانات, مصنعية بناء, sand/cement/bricks, EGP currency, 14% VAT default, Egyptian holiday handling

### Pricing model (planned)
- Free trial / Free Pilot tier
- Subscription billing via **Paymob** (Egypt's Stripe-equivalent). 3 tiers planned with feature gates around team size, AI capture quota, and integrations.

---

## 3. User personas

### 👑 Company Admin (owner / managing director)
**Mental model**: "What's my cash flow? Who's spending what? Are we profitable per project?"

**Daily**:
- Dashboard glance — total budget, safe balance, pending approvals count
- Approve high-value transactions (default >50,000 EGP needs admin)
- Review notifications

**Weekly**:
- Send invoices to clients
- Fund engineers' custody wallets
- Review audit log for unusual activity
- Check project profit margins

**Monthly**:
- Subscription billing
- Approval threshold config
- Add/remove team members
- Review reports + export to accountant

**Pain points**: Hates digging for information. Wants high-density dashboards.

### 👔 Project Manager
**Mental model**: "What needs my decision today?"

**Daily**:
- Approve mid-tier expenses (5k–50k by default)
- Acknowledge daily site reports submitted by engineers
- Review project progress

**Weekly**:
- Project financials review
- Workman attendance reconciliation
- Material stock levels

**Pain points**: Notification overload. Wants prioritized action queue.

### 👷 Engineer (field-based)
**Mental model**: "I'm on site. I just bought 100 cement bags. How do I log this in 30 seconds?"

**Mobile-first** — almost never opens the web app.

**Daily**:
- Capture site expenses with photo or voice
- Log workman attendance during the day
- End of day: submit Daily Site Report with photos
- Check own custody balance

**Pain points**:
- Dirty hands, gloves, tiny phone, sun glare
- Slow 4G / spotty connection on remote sites
- Doesn't want forms with 15 fields
- Speaks Egyptian Arabic primarily

### 💰 Accountant
**Mental model**: "Match transactions, send invoices, file reports."

**Daily**:
- Review approved transactions for accuracy
- Send invoices, record payments
- Export ledger entries

**Weekly**:
- Bank reconciliation (Phase 6 — coming)
- Monthly close support

**Pain points**: Wants Excel-like density and easy export.

---

## 4. Brand, language, and locale

### Bilingual Arabic-first
- Default language depends on browser/device, but Egyptian users default to Arabic
- **Full RTL flip** for layout when Arabic is active (sidebar moves to right, text-align flips, icons mirror where semantic)
- All UI strings translated; transaction categories use real construction terminology in Arabic (خرسانات, مصنعية مباني, محارة, سباكة, etc.)
- Currency: EGP (Egyptian Pound) only; numbers can format `1,234.56` or `١٬٢٣٤٫٥٦` based on locale
- Dates: `DD/MM/YYYY` for Arabic, `DD/MM/YYYY` for English (consistent)

### Tone
- **Professional + trustworthy** — this is a financial app handling real money
- **Accessible** — engineers use it daily, not just office staff
- **Egyptian** — feels native, not a translated US product

### Current color tokens (rough)
```
Primary blue:      #2563eb
Success green:     #10b981
Warning amber:     #f59e0b
Danger red:        #ef4444
Info blue tint:    #dbeafe
Muted gray bg:     #f9fafb
Card bg (light):   #ffffff
Border (light):    #e5e7eb
Text primary:      #111827
Text secondary:    #6b7280
Text tertiary:     #9ca3af
```

Status badge pairs (bg + fg) used everywhere:
```
PLANNING / DRAFT      → bg #f3f4f6, fg #374151
IN_PROGRESS / SENT    → bg #d1fae5 / #dbeafe, fg #065f46 / #1e40af
PENDING_APPROVAL      → bg #fef3c7, fg #92400e
APPROVED / PAID       → bg #d1fae5, fg #065f46
REJECTED / OVERDUE    → bg #fee2e2, fg #991b1b
COMPLETED / CANCELLED → bg #e5e7eb, fg #374151 / #6b7280
```

### Logo & brand identity
The current product uses a generic building icon. We want a real logomark + wordmark. Bilingual marks (Arabic and Latin) preferred.

---

## 5. Complete feature inventory (web + mobile)

### 5.1 Authentication
- **Login** with email + password
- **2FA challenge step** if user has TOTP enabled (separate screen with 6-digit code input)
- **Register Company** multi-step: company info → admin info → email OTP → activated tenant
- **Forgot password** → email link → reset
- **Verify invite** flow for engineers added by admin
- **2FA enroll** with QR code scan + 6-digit verify
- **2FA disable** requires current password + code

### 5.2 Dashboard
- KPI cards: total projects, active projects, total budget, total revenue
- **Income vs Expenses** chart (bar)
- **Expenses by Category** chart (donut/bar)
- Recent projects list (5 most recent)
- Pending approvals badge (for managers)
- Quick action buttons (new project / new transaction / send invoice)

### 5.3 Projects
- **List**: filter by status, search by name/client. Status badges. Budget vs actual progress bar.
- **Detail**: header with project name + status, financials grid (Budget / Actual Cost / Office Revenue / Safe Balance), info panel (client, engineer, dates, location, revenue model, mgmt fee %), tabbed sections for Transactions / Documents / DSRs / Cost Items / Workmanships
- **Create / Edit** modal: name, description, client picker, project type, status, location, dates, budget, revenue model picker, management fee %, payment terms, total contract value
- **Soft-delete** + admin **Restore** action

### 5.4 Project Documents (Phase 3)
- Per-project photo + document gallery
- Upload with: photo from device, optional GPS tag (browser geolocation), category picker (9 categories: Site Progress / Receipt / Delivery / Issue / Contract / Permit / Drawing / Report / Other), display name, description
- Grid view with category icon, uploader, timestamp, GPS coords
- Click thumbnail → lightbox
- Delete (uploader or admin)
- Filter by category

### 5.5 Clients
- List with status (Active / Inactive / Pending)
- Detail with associated projects
- Create/edit form: name, company, email, phone, tax ID, contact person details, address (street/city/state/zip/country)
- Status workflow
- Soft-delete + restore

### 5.6 Suppliers
- Same shape as clients but with: category (14 supplier categories), payment terms, rating (1–5 stars), supplier-specific status
- Used in transaction supplier picker

### 5.7 Workmen (laborers / contractors)
- List with trade (carpenter, mason, electrician, plumber, painter, foreman + 8 more)
- Daily rate (EGP/day)
- Total paid running balance
- National ID + national-ID image upload
- Phone, name in Arabic + English
- Active flag

### 5.8 Materials (raw inventory catalog)
- Catalog of materials with name (AR + EN), unit (M3/TON/KG/M2/M/PIECE/LITER/BAG), unit price, supplier, current stock level, reorder threshold
- Low-stock alert highlighting

### 5.9 Inventory (Material Batches per project)
- When an expense is logged with "Inventory Purchase" flag, a Material Batch is created with the purchase amount
- Per-project view of all batches with remaining value
- Record Usage form: pick batch, enter value or quantity consumed → triggers V1.2 profit recognition
- Batch status: AVAILABLE → PARTIALLY_USED → CONSUMED

### 5.10 Finance / Accounting
- Transactions list
- **Filter pills**: All / Pending / Mine
- **Filter by**: project, type (Income/Expense), category (40+ categories including V1.2 Egyptian construction terms)
- Color-coded: green for income, red for expense
- Status badge per row
- Inline **Approve ✓** / **Reject ✗** buttons for managers (visible only on PENDING_APPROVAL items)
- **Multi-level approval threshold**: backend decides if user can auto-approve based on amount tier; UI shows when admin escalation is needed
- "AI Drafts" pill button → goes to AI-generated drafts queue (Phase 7)
- FAB / "+ New Transaction" button → form

### 5.11 Add Transaction
- Type toggle: Expense (red) / Income (green)
- Project picker (modal)
- Category picker (modal — searchable; 40+ Egyptian construction categories)
- Amount input (numeric, EGP)
- Description textarea
- Payment method pills: Cash / Bank Transfer / Check / Custody Wallet / Other
- Date picker
- For expenses: "Inventory Purchase" toggle (creates a material batch)
- Optional: receipt photo upload, supplier picker, workman picker

### 5.12 AI Drafts (Phase 7) — *to be designed*
- Queue view of drafts created by AI from voice notes or receipt photos
- Confidence indicator per field (high/medium/low)
- Source badge: 🎤 Voice / 📸 Receipt
- Review form: edit any field before saving as a real transaction
- Bulk approve / discard actions

### 5.13 Reports
- Bar chart: Income vs Expenses
- Donut chart: Expenses by Category (filters out income + management fee transfers)
- Period filter (this month / last month / quarter / year / custom)
- **CSV export** with UTF-8 BOM (Excel-friendly Arabic)
- Project profitability ranking (planned)

### 5.14 Daily Site Reports (DSR) — Phase 4
**Manager web review page (`/dsr`)**:
- List with status badges (Draft / Submitted / Acknowledged) and project filter
- Click row → detail modal with: stats grid (status, reporter, hours, weather + temp, submitted/acknowledged timestamps), Progress / Issues / Visitors notes, Workmen Attendance table, Materials Received list, Photos grid, Manager Acknowledge form (notes + button)

**Mobile capture (engineer)**:
- + FAB on DSR list opens create screen
- Project picker modal
- Date with "Today" quick-set
- Weather chip grid (8 options with emoji)
- Temperature + hours inputs
- Progress / Issues / Visitors textareas
- Workmen attendance multi-select with per-row hours
- **Photo strip** with Camera and Library buttons (multi-select up to 10), each with thumbnail + delete chip
- Save Draft / Save & Submit buttons

### 5.15 Invoices (Phase 5)
- Auto-numbered `INV-2026-NNNN` per tenant
- 6-state machine: DRAFT → SENT → PARTIALLY_PAID → PAID → OVERDUE → CANCELLED
- **List** table: invoice #, client, project, issue date, due date, total, paid, balance, status badge, action icons (View/PDF/Edit/Send/Payment/Cancel/Delete) gated by status + role
- **Status filter pills** (All + 6 statuses)
- **Create / Edit modal**: client picker, optional project, due date, default 14% Egyptian VAT (configurable), discount, line item editor (add/remove rows, auto-compute totals as user types), notes, terms (default "Payment due within 30 days")
- **View modal**: stats grid + line items table + notes/terms + Download PDF button
- **PDF generation**: A4 with company header (logo + address), bill-to + project box, status badge, line items table, totals box, notes + terms — *needs design polish*
- **Send modal**: recipient email (defaults to client.email), custom message → emails PDF as attachment, flips DRAFT → SENT
- **Payment modal**: shows outstanding balance, accepts partial payment input → PARTIALLY_PAID until full → PAID
- **Cancel** any non-paid invoice → CANCELLED status (audit-trailed; not deleted)

### 5.16 Custody management (engineer cash wallets)
- Engineer's profile shows current custody balance + pending clearance + available
- **Admin "Fund Engineer"**: pick engineer (with current balance shown), amount, description → adds to wallet, notifies engineer
- **Engineer "Return Custody"**: amount, description → reduces wallet (overdraft-protected)
- History list per engineer
- **All Custody** view (admin/accountant): every engineer's balance + pending + available + tenant-wide totals

### 5.17 Notifications
- Bell icon with unread count badge in header
- Notification types: Info / Alert / Success / Warning
- Per-user; system events generate them (transaction approved, custody funded, low stock, DSR acknowledged, etc.)
- Mark single as read on click; "Mark all read" action

### 5.18 Activity Log / Audit (Phase 1+2) — admin only
- Every meaningful mutation is logged with `before` / `after` snapshots (secrets sanitized)
- Filter by entity (Project, Client, Transaction, User, Role, Custody, etc.) / action (CREATE / UPDATE / DELETE / RESTORE / APPROVE / REJECT / ROLE_CHANGE / FUND / RETURN / 2FA_ENABLE / SEND / PAYMENT / etc.) / user
- Color-coded action badges
- Expandable per-row JSON detail
- Cursor pagination ("Load more")

### 5.19 Two-Factor Authentication (Phase 2) — every user
- Status banner (ON / OFF / pending enrollment)
- **Enable flow**: server returns QR code data URI → user scans with Google Authenticator/Authy/1Password → enters 6-digit code → confirmed
- Manual secret display + copy-to-clipboard fallback
- **Disable flow**: requires current password + valid TOTP code
- **Login flow change**: when 2FA is on, login returns a 5-minute challenge token + UI shows code prompt → enter code → full session

### 5.20 Team Management — admin only
- User list with role badges, status (active/inactive/verified)
- Invite user form: name, email, phone, password, role picker
- Edit user: change role (with SUPER_ADMIN guard), permissions matrix
- Soft delete user

### 5.21 Company Settings — admin only
- Company info edit (name, address, phone, email)
- Logo upload (S3-backed)
- **Approval Thresholds config**: array of { maxAmount, minRole } tiers; defaults editable
- Subscription / Billing (Phase 6 — coming) tied to Paymob

### 5.22 Roles & Permissions — admin only
- Beyond the 5 hard-coded roles (SUPER_ADMIN / ADMIN / PROJECT_MANAGER / ENGINEER / ACCOUNTANT) there's a custom **Role** model with a JSON permission matrix per tenant
- UI: list of system + custom roles, edit form for permissions matrix (organized by resource × action grid)

### 5.23 Chat Assistant
- Conversational UI with bubbles
- Voice input button → records → Whisper transcribes → AI responds
- Tool-calling: AI can offer to "Record this transaction" with extracted fields, "Get financial summary"
- Chat history persisted per user

---

## 6. Information Architecture

### Web — Sidebar navigation (current order)
1. **Dashboard** (home)
2. **Projects**
3. **Clients**
4. **Suppliers**
5. **Raw Materials**
6. **Labor & Contractors** (workmen)
7. **Inventory**
8. **Finance / Accounting** (with AI Drafts sub-page)
9. **Daily Reports** (DSR)
10. **Invoices**
11. **Reports**
12. **Chat Assistant**
13. **Activity Log** *(admin only)*
14. **Two-Factor** (any user)
15. **Team Management** *(admin only)*
16. **Company Settings** *(admin only)*

Header: logo (left) + tenant name + language toggle + theme toggle + notification bell + user avatar dropdown (with logout)

### Mobile — Bottom tab bar (5 tabs)
1. 📁 **Projects** → list → detail
2. 💵 **Finance** → list with AI-Drafts pill → Add Transaction screen → Drafts list
3. 📋 **DSR** (Daily Reports) → list → detail / create
4. 🔔 **Notifications**
5. 👤 **Profile** → custody balance, Fund Engineer (admin), directories (Clients/Suppliers/Workmen), language toggle, logout

Header per screen: title + back button (if stack child)

---

## 7. Mobile companion app — what it has

- **Built with**: React Native + Expo SDK 54, React 19.1, RN 0.81
- **5 bottom tabs** as listed above
- **14 screens** total
- **Camera + photo library** access via `expo-image-picker` (DSR, voice — Phase 7 — receipt capture)
- **GPS-tagged** photo capture
- **Pull-to-refresh** on every list
- **Offline-tolerant reads** — last-fetch cached in AsyncStorage
- **AR/EN with full RTL** via `I18nManager`
- **Auto-logout on 401** + token persistence

What's *not* on mobile (intentional):
- Settings / Company config — admin task, desktop-first
- Reports / chart-heavy views
- Full role/permission management
- Invoice creation (will add view + send in Phase 8 maybe; creation stays desktop)

---

## 8. Visual & interaction conventions already in use

These are the patterns we want the design system to formalize:

### Layout
- **Sidebar** + **content area** (web)
- **Bottom tabs** + per-tab stack (mobile)
- **Card** is the dominant container (rounded 8–12px, white bg in light mode, 1px border or subtle shadow)
- **Section headers**: small uppercase + lighter weight + gray color
- **Grid 2** / **Grid 3** layouts for stat cards

### Components
- **Status badges** — 9–12px rounded pill, bg+fg pair per status
- **Filter pills** — rounded pill buttons, active state filled with primary
- **Modals** — centered, max-width ~600px, backdrop dimmed
- **Lightbox** — for image preview (full-screen, click backdrop to close)
- **FAB** — circular button bottom-right (mobile)
- **Stat card** — 3-line: small uppercase label, big value, small subtitle
- **Empty states** — large icon + title + subtitle in muted gray
- **Spinners** — circular for loads
- **Inline action icons** — Lucide icons (web), Ionicons (mobile)

### Patterns
- **Pull-to-refresh** on list screens
- **Confirm-before-destructive** via `window.confirm` or `Alert.alert`
- **Toast / inline alerts** via custom AlertContext (no library)
- **Two-step destructive** for "delete user / cancel invoice" type actions
- **Real-time validation** on forms (Zod-backed; errors shown inline)

### Accessibility (current)
- Forms have labels
- Buttons have icons + text (not icon-only except in tight rows)
- Color is not the only signal (always pair with text label or icon)

### What's *missing* visually (for the designer to address)
- Inconsistent spacing/rhythm between pages
- No real type scale — everything's free-form pixel sizes
- No motion language — transitions are mostly default browser behavior
- Tables are a bit dense and unstyled in some places
- PDF invoice template is functional but plain
- No real illustrations / brand voice in empty states
- Mobile screens are stylistically inconsistent (different padding patterns, different card border-radii)

---

## 9. Roadmap — what we're designing for

### Already shipped (need refresh)
- Phases 1–5: Foundations / Quick UX wins / Photos & Documents / Daily Site Reports / Invoicing
- Phase 6.1: Sentry error monitoring (no UI)
- Phase 6.4: Paymob subscription billing (backend only — needs UI)

### In progress (Phase 7)
- **AI voice → draft transaction**: engineer records voice, Whisper transcribes, GPT-4o extracts amount/category/supplier → creates a DRAFT transaction with confidence score per field
- **AI receipt OCR → draft transaction**: engineer photographs receipt, GPT-4o-vision extracts the same → DRAFT
- **AI Drafts queue page** (web + mobile) — list of pending AI-extracted drafts with confidence indicators, review/edit form, approve to convert to a real transaction

### Coming (Phase 6 remainder)
- **Subscription billing UI** — pricing page (3 tiers), checkout flow via Paymob, plan badge in header, upgrade/downgrade flow, invoice history
- **Bank reconciliation** — CSV import → match to existing transactions → unmatched queue → manual link
- **Mobile invoice viewer** — view + send + payment-record on phone (creation stays desktop)

### Next phases (designer should leave room)
- **WhatsApp Business** invoice send
- **Bill of Quantities (BoQ)** builder — line items per project with progress tracking
- **S-curve forecasting** charts
- **Multi-step approval workflows** with visual flow editor
- **Document templates** for contracts/permits beyond simple PDF
- **Project Gantt view**
- **Budget alerts**

---

## 10. Deliverables we need from the designer

### Phase A — Design System (foundation)
1. **Logo & brand mark** — bilingual (Arabic + Latin), variations (full / mark-only / monochrome)
2. **Color palette** — primary, secondary, semantic (success/warning/danger/info), neutrals, light + dark themes with token names
3. **Typography scale** — heading sizes, body sizes, captions; Arabic font (Cairo or similar) + Latin font pairing
4. **Spacing scale** — 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 etc., named tokens
5. **Component library** in Figma:
   - Buttons (primary / secondary / tertiary / danger / icon-only) × sizes × states
   - Inputs (text / textarea / select / date / numeric / currency / search) × states (default/focus/error/disabled)
   - Cards (basic / stat / interactive)
   - Status badges (12 status pairs)
   - Filter pills + tab bars
   - Modals + drawers + popovers
   - Tables (with sort / filter / pagination)
   - Toasts / alerts / banners
   - Empty states + loading states + error states
   - Avatars + role badges
   - Sidebar nav (LTR + RTL versions)
   - Bottom tab bar (mobile)
6. **Iconography** — confirm Lucide for web, Ionicons for mobile, OR propose a custom set (preferred: stick with libraries to keep dev fast)

### Phase B — Web screen designs
Priority order (most important first):
1. **Login + 2FA challenge + Signup** (first impression)
2. **Dashboard** (stat density, charts, action cards)
3. **Projects list + Project Detail** (with all tab sections)
4. **Finance / Accounting list** (table density, AI Drafts integration)
5. **AI Drafts review screen** *(new — Phase 7)*
6. **Add Transaction modal** (multi-step? single?)
7. **Invoices list + Create form + View modal**
8. **PDF invoice template** (A4 layout for client-facing)
9. **DSR review modal** (manager side)
10. **Project Documents gallery + upload flow**
11. **Reports** (charts, period selector, export)
12. **Activity Log** (admin)
13. **Settings + 2FA + Approval thresholds**
14. **Team management**
15. **Pricing / Subscription page** (Phase 6 — design from scratch)
16. **Bank reconciliation page** (Phase 6 — new)
17. **Marketing landing page** (optional but valuable for sales)

### Phase C — Mobile screen designs
1. **Login + 2FA challenge** (mobile-friendly OTP UX)
2. **Dashboard / Projects tab**
3. **Project Detail**
4. **Finance tab + Add Transaction**
5. **AI Drafts list + Receipt-capture flow + Voice-capture flow** *(new — Phase 7)*
6. **DSR list + DSR detail + DSR Create** (camera-heavy, engineer flow)
7. **Notifications**
8. **Profile + Custody**
9. **Fund Engineer (admin)**
10. **Directories**

### Phase D — Edge cases & polish
- Empty states (every list has one)
- Error states (network failure, 403, 404, 500)
- Loading states (skeleton screens preferred over spinners for tables)
- Onboarding flow for new tenant (after first login)
- Permission-denied screens
- Confirm-before-destructive dialogs

### Phase E — Documentation
- **Design tokens file** (JSON or Figma Variables) the dev team can import into the codebase
- **Component spec sheet** — for each component, document: states, anatomy, do's and don'ts
- **Localization notes** — RTL behavior per component, Arabic font sizing adjustments

---

## 11. Tech constraints (so designs are buildable)

The designer should be aware of these so mockups translate cleanly to code:

### Web stack
- **React 18 + Vite**
- **Recharts** for charts (constrains visual style of charts to library capabilities — pie/donut/bar/line/area)
- **Lucide React** icon library (1000+ outline icons, consistent stroke)
- **i18next** for translations (string-based)
- **CSS** (no Tailwind currently; using vanilla CSS variables for theme tokens — designer can propose Tailwind migration if helpful)
- No animation library shipping yet — keep transitions subtle (200-300ms ease)

### Mobile stack
- **React Native + Expo SDK 54**
- **@expo/vector-icons** (Ionicons primarily)
- No fancy animation libraries — Reanimated could be added if required for premium feel
- Navigation handled by **React Navigation v7** (bottom tabs + native stacks)

### Things that are hard to change
- The bottom-tab-bar pattern on mobile (5 tabs is the constraint)
- The sidebar on web (could become collapsible drawer; could not become bottom nav)
- The `Card` is the universal container
- Status badges as colored pills

### Things easy to change
- All color values
- All spacing
- All typography
- Card border radius / shadow style
- Button styles
- Empty state illustrations

### Image hosting
- AWS S3 — designer-provided illustrations and brand assets will be uploaded there
- We'll need: app icons (web favicon + mobile launcher icons), splash screens (iOS + Android), social-share images (Open Graph), invoice header assets

### Fonts
- Currently using system fonts — open to **Cairo** for Arabic + **Inter** or **DM Sans** for Latin (free, Google-hosted, optimized for both LTR and RTL contexts)
- Whatever font system the designer chooses should ship as web fonts and be embeddable in the PDF generator (pdfkit)

---

## 12. Demo access

We can give the designer a working demo:

**Live system**: TBD (we'll spin up a hosted demo URL when needed)

**Test accounts** (after seed data is loaded):
| Role | Email | Password |
|---|---|---|
| Admin | admin@demo.local | Demo@1234 |
| Project Manager | manager@demo.local | Demo@1234 |
| Engineer | engineer@demo.local | Demo@1234 |
| Accountant | accountant@demo.local | Demo@1234 |

**Demo data populated**: 5 clients, 6 suppliers, 8 materials, 6 workmen, 3 projects across all statuses (in-progress / planning / completed), 17 transactions covering income / expense / inventory / management fees, 1 cement batch 50% consumed, 3 custody transfers, 4 cost items, 2 workmanship contracts, 3 notifications.

The designer can log in, click around, see real-shaped data, and propose improvements grounded in actual content.

---

## 13. Things to avoid / out-of-scope

- **No social features** (no team chat, no project comments thread, no activity feed for non-admins)
- **No calendar / scheduling** — projects have dates but we're not building a calendar
- **No CRM features** beyond Client management (no sales pipeline, no deal stages, no email tracking)
- **Don't lose Arabic-first feel** — every screen must work as well in Arabic as in English; if a layout breaks in RTL, it's a bug
- **Don't over-design for mobile-first on Pro features** — admins/accountants use desktop; engineers use mobile. Design accordingly per persona.
- **Conservative financial UI** — no aggressive gamification, no badges/points, no celebratory animations on payment received. This is accounting; users want predictability.
- **No multi-currency** — Egyptian SMEs operate in EGP only

---

## 14. Success criteria for the design system

- [ ] An engineer can complete the daily-report flow on mobile in **< 2 minutes** with one hand
- [ ] An accountant can scan the Finance list and identify pending approvals in **< 5 seconds**
- [ ] An admin can answer "what's our cash position right now" from the dashboard in **< 10 seconds**
- [ ] All screens work in both LTR (English) and RTL (Arabic) without bugs
- [ ] Light + dark themes are equally usable
- [ ] PDF invoice looks credible enough to send to enterprise clients
- [ ] Mobile + web feel like the same product (consistent visual language)
- [ ] Component library covers 90%+ of needed UI without custom code

---

## 15. Timeline suggestion (designer's call)

- **Week 1–2**: Brand mark + design system foundation (colors, typography, spacing, key components)
- **Week 3–4**: Top-priority web screens (Dashboard, Projects, Finance, Invoices) + mobile core (Tabs, DSR Create)
- **Week 5–6**: Phase 7 AI screens (Drafts queue, Receipt capture, Voice capture) + remaining web screens
- **Week 7**: Edge cases, empty states, error states, marketing/pricing pages
- **Week 8**: Handoff package, design tokens export, component spec sheets

---

## 16. Communication & handoff

- **Figma** preferred — we'll get a license for the dev team to inspect specs
- **Design tokens** exported as JSON or Figma Variables — dev imports as CSS variables
- **Walkthrough session** at end of each phase to keep dev unblocked
- **Component naming conventions** matter — what the designer calls a "Button-Primary-Lg" should match what the dev calls it

---

## Appendix A — Existing screen list (with implementation status)

| Screen | Web | Mobile | Notes |
|---|---|---|---|
| Login | ✅ | ✅ | Mobile shows API URL diagnostic |
| Login + 2FA challenge | ✅ | ⚠️ stub | Mobile needs the 2FA prompt step |
| Register Company | ✅ | — | Desktop only |
| Forgot/Reset Password | ✅ | — | Desktop only |
| Dashboard | ✅ | ✅ basic | Mobile is project list + stats |
| Projects list | ✅ | ✅ | |
| Project detail | ✅ | ✅ | Mobile has financials + transactions list |
| Project Documents | ✅ | — | Web only currently |
| Clients list | ✅ | ✅ read-only | Mobile is read-only list |
| Suppliers list | ✅ | ✅ read-only | |
| Workmen list | ✅ | ✅ read-only | Mobile shows stats |
| Materials | ✅ | — | |
| Inventory | ✅ | — | |
| Finance / Transactions list | ✅ | ✅ | Mobile has filter pills + approve inline |
| Add Transaction | ✅ | ✅ | |
| AI Drafts list | ⚠️ | ⚠️ stub | Phase 7 — needs design |
| AI Receipt capture | — | ⚠️ stub | Phase 7 — needs design |
| AI Voice capture | — | ⚠️ stub | Phase 7 — needs design |
| Reports | ✅ | — | Charts + CSV export |
| Daily Site Report list | ✅ | ✅ | |
| DSR detail | ✅ | ✅ | |
| DSR Create | — | ✅ | Mobile-only with camera |
| Invoices list | ✅ | — | |
| Create / View / Send Invoice | ✅ | — | |
| PDF Invoice template | ✅ functional | — | Needs design polish |
| Notifications | — bell only | ✅ | Web is just dropdown; consider full page |
| Profile | — modal only | ✅ | Mobile is dedicated tab |
| Custody Fund | ✅ basic | ✅ | |
| Activity Log (audit) | ✅ | — | Web admin only |
| Two-Factor Settings | ✅ | — | Web only |
| Team Management | ✅ | — | Web admin only |
| Company Settings | ✅ | — | Web admin only |
| Roles & Permissions | ✅ basic | — | Could use polish |
| Chat Assistant | ✅ | — | Web only |
| Subscription / Billing | ⚠️ Phase 6.4 | — | Backend done, UI pending — design from scratch |
| Bank reconciliation | ⏭️ Phase 6 | — | New screen — design from scratch |
| Pricing / Marketing | — | — | Could be valuable for sales — open question |

Legend: ✅ shipped • ⚠️ partial / needs design • — not built • ⏭️ planned

---

## Appendix B — One-page summary (TL;DR for first-meeting)

> Engineers Management is a multi-tenant SaaS Construction ERP for Egyptian engineering firms. Web app + React Native mobile companion. Bilingual Arabic-first with full RTL. Currently functional with Projects, Finance with V1.2 Profit-on-Expense, Daily Site Reports captured from mobile, Invoicing with PDF + email, AI voice/receipt capture (Phase 7 in progress), 2FA, audit log, soft-delete + restore, multi-tier approval workflows. We need: a design system (colors, typography, spacing, components), refreshed designs for ~15 web pages and ~10 mobile screens, designs for upcoming AI capture, billing, and bank reconciliation surfaces, plus brand identity work (logomark + bilingual wordmark). Tech: React 18 + Vite (web), React Native + Expo SDK 54 (mobile), Lucide/Ionicons, Recharts. Demo accounts available.

---

*This document is the canonical brief for the design engagement. Contact owner for live demo access, additional questions, or scope changes.*
