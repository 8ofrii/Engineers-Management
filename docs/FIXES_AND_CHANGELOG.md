# 📋 Hesaby ERP — Changelog & Master Progress Log

This document provides a clean, unified, and chronological record of all features, fixes, and architectural upgrades completed during development.

---

## 🛠️ Detailed Log of Completed Items

### 1. 🚀 Initial Environment & Database Provisioning
* **Status**: ✅ Done
* **Summary**:
  * Set up the development workspace, Node.js runtimes, and dependencies for both frontend and backend.
  * Connected the application to the remote PostgreSQL database (`sitengineer`).
  * Migrated database schemas and seeded 4 role-based demo accounts:
    * **Admin**: `admin@demo.local`
    * **Project Manager**: `manager@demo.local`
    * **Site Engineer**: `engineer@demo.local`
    * **Accountant**: `accountant@demo.local`

---

### 2. 📊 Fixed Dashboard Top Metric Cards
* **Status**: ✅ Fixed
* **Summary**:
  * Resolved an issue where Total Income, Expenses, and Net Balance cards remained at `EGP 0` due to a case-sensitivity mismatch (`INCOME`/`EXPENSE` in the database vs. lowercase filter).

---

### 3. ✏️ Fixed "Paid By" Transaction Editing Bug
* **Status**: ✅ Fixed
* **Summary**:
  * Fixed a backend controller error (`payerUserId is not defined`) when editing transaction payers and linked suppliers/workmen.

---

### 4. 🏢 Project Card Financial Breakdown
* **Status**: ✅ Upgraded
* **Summary**:
  * Clarified and visually styled the distinction between **Actual Spent (المصروف)**, **Project Safe Balance (خزينة المشروع)**, and **Office Profit (أرباح المكتب)**.

---

### 5. 🏷️ Added App Logo & Brand Header
* **Status**: ✅ Added
* **Summary**:
  * Added the official Hesaby logo icon and brand title to the global top navigation bar across all views.

---

### 6. 👤 User Profile Quick-Edit Button
* **Status**: ✅ Added
* **Summary**:
  * Added a dedicated profile edit action button next to the user name and avatar in the sidebar footer.

---

### 7. ↔️ Sidebar Minimize / Full-Screen Mode
* **Status**: ✅ Added
* **Summary**:
  * Added a collapsible sidebar toggle with browser state persistence, enabling full-screen canvas viewing.

---

### 8. 📝 Optional Transaction Descriptions
* **Status**: ✅ Updated
* **Summary**:
  * Made the description field optional across all transaction creation and edit modals, with smart fallback defaults.

---

### 9. 🔍 Fixed Visibility of Pending Transactions
* **Status**: ✅ Fixed
* **Summary**:
  * Updated the Finance ledger so that pending approval transactions (>5,000 EGP) remain immediately visible to engineers and managers with their amber status tags.

---

### 10. 🛡️ Project Manager Budget Update Permissions
* **Status**: ✅ Fixed
* **Summary**:
  * Expanded project modification rights so Project Managers and Admins can update budgets, timelines, and details without authorization errors.

---

### 11. 💰 Auto-Approved Incomes & High-Value Approvals
* **Status**: ✅ Fixed
* **Summary**:
  * Configured incoming client payments to auto-approve instantly.
  * Granted Project Managers authority to approve all expense thresholds.

---

### 12. 💬 Global Translation & Alert Strings Cleanup
* **Status**: ✅ Polished
* **Summary**:
  * Replaced all raw code identifiers (e.g. `common.success`, `finance.approvedSuccess`) with localized English and Arabic strings.

---

### 13. 🤖 Persistent Right-Side AI Assistant Copilot
* **Status**: ✅ Added & Integrated
* **Summary**:
  * Embedded a persistent, collapsible right-side AI assistant with floating launcher, docked drawer, and voice/text interaction.

---

### 14. 🔄 AI Conversation Reset with Confirmation
* **Status**: ✅ Added
* **Summary**:
  * Added a reset conversation action with an "Are You Sure?" confirmation modal to prevent accidental chat history loss.

---

### 15. 🔔 Advanced Notification Center
* **Status**: ✅ Added & Polished
* **Summary**:
  * Implemented "Clear All", per-notification deletion, and an expandable full-screen notification center with status filters.

---

### 16. 👷 Assigned Engineer Selector in Projects
* **Status**: ✅ Added & Fixed
* **Summary**:
  * Added an Assigned Engineer dropdown in the project modal and fixed the double percentage symbol `(%) (%)` in the fee label.

---

### 17. 🧠 Custom Micromind AI Agent Integration
* **Status**: ✅ Live & Connected
* **Summary**:
  * Linked the assistant backend directly to the Micromind Autonomous Agent endpoint (`gpt-5.6-luna-pro`) with real-time PostgreSQL database querying.

---

### 18. 🚀 Global Copilot UI Traversal & Action Engine
* **Status**: ✅ Live & Functional
* **Summary**:
  * Built `CopilotContext.jsx` enabling the AI to navigate between tabs (`/inventory`, `/projects`, `/finance`, etc.) and pre-fill modals on voice or text command.

---

### 19. 💬 Natural Chronological Chat Flow & Contrast
* **Status**: ✅ Fixed & Polished
* **Summary**:
  * Fixed chat message ordering from top-to-bottom and enhanced message bubble contrast for effortless readability.

---

### 20. 🎨 Eye-Friendly Executive Dark Mode
* **Status**: ✅ Upgraded
* **Summary**:
  * Replaced harsh saturated blue colors with calm executive charcoal and slate tones (`#141414`, `#1c1c1c`, `#262626`).

---

### 21. 🎨 Live Theme Switcher with 3 Curated Palettes
* **Status**: ✅ Added & Interactive
* **Summary**:
  * Implemented a 1-click theme switcher in the topbar offering:
    1. **Monochrome Minimal** (Default matte charcoal `#141414` & crisp off-white).
    2. **Obsidian & Emerald** (Deep onyx `#0a0a0c` with frosted cards & mint emerald `#10b981`).
    3. **Clean Light Mode** (Daytime slate canvas `#f8fafc`).

---

### 22. 🔘 Floating Action Button (FAB) Contrast & Theme Dots
* **Status**: ✅ Fixed
* **Summary**:
  * Fixed text contrast on the floating Voice and Receipt pills and assigned unique color dots in the theme dropdown.

---

### 23. 💡 Elevated Floating Action Button (FAB) Visibility
* **Status**: ✅ Polished
* **Summary**:
  * Upgraded floating pills with an elevated background (`--bg-tertiary`), crisp border, and subtle backdrop blur so they stand out clearly against all cards and charts.

---

### 24. 🧱 Fixed "Invalid Query" on Record Material Usage
* **Status**: ✅ Fixed & Verified
* **Summary**:
  * Resolved database failure on inventory usage by implementing smart automatic material catalog resolution for unlinked batches.

---

### 25. 🚫 Removed Number Input Spinners & Cleaned Invoice Grid
* **Status**: ✅ Fixed & Cleaned
* **Summary**:
  * Globally removed ugly browser number spinners from all inputs and broadened Quantity/Unit Price columns in the invoice line item editor.

---

### 26. 💵 Direct Payment Recording on Invoices & SMTP Delivery
* **Status**: ✅ Configured & Live
* **Summary**:
  * Enabled direct payment recording on all open invoices without requiring mandatory email dispatch first.
  * Configured live Gmail SMTP delivery (`sitengineer04@gmail.com`) for automated PDF invoice emailing.

---

### 30. 🌐 Complete Arabic Localization for DSR, Invoices & Bank Reconciliation
* **Status**: ✅ Fully Localized & Verified
* **Summary**:
  * Added extensive Arabic dictionaries in `ar.json` and linked dynamic `t()` translation hooks across:
    * **Daily Site Reports (التقارير اليومية)**: Headers, status pills (مسودة / قيد المراجعة / تم الاعتماد), weather tags, hours logged, and all modal form fields.
    * **Invoices (الفواتير)**: Status pills (مسودة / تم الإرسال / مدفوعة جزئياً / مدفوعة بالكامل / متأخرة / ملغاة), data table columns, line items, create modal, payment recording modal, and email dispatch modal.
    * **Bank Reconciliation (مطابقة الحسابات البنكية)**: CSV upload instructions, status tags (قيد الانتظار / قيد المراجعة / مكتمل), and match progress breakdown.

---

### 31. 🔄 Arabic RTL Layout Alignment (Sidebar Collapse & Left AI Copilot)
* **Status**: ✅ Fixed & Polished
* **Summary**:
  * **Sidebar Collapse in RTL**: Fixed the collapse transform from `-100%` (leftwards) to `+100%` (rightwards) so the Arabic right-docked sidebar slides neatly off-screen when minimized, and zeroed out `margin-right` on `.main-content`.
  * **Dynamic Collapse Chevron**: Added dynamic arrow flipping (`<ChevronRight />` in Arabic to point toward the right edge for minimizing, `<ChevronLeft />` in English).
  * **AI Copilot RTL Positioning**: Positioned the floating AI Copilot button and the docked/floating chat drawer to the **bottom-left & left-dock** in Arabic RTL mode, preventing any overlap with the Arabic right sidebar.

---

### 32. ⚡ Arabic Instant Transportation & Navigation in AI Copilot
* **Status**: ✅ Upgraded & Verified
* **Summary**:
  * **Arabic Normalization Engine**: Implemented robust normalization stripping Arabic diacritics (tashkeel), unifying alef variants (`أ`, `إ`, `آ` → `ا`), dotless yaa (`ى` → `ي`), and `ة` → `ه`.
  * **Broad Navigation Dictionary**: Added broad recognition for colloquial and standard Egyptian/Arabic navigation intents:
    * `وديني`, `وديني الي`, `وديني على`, `روح`, `افتح`, `هات`, `حولني`, `وريني`, `خدني`, `صفحة`, `قايمة`.
    * Supports direct instant jumping to: **الحسابات / المصاريف** (`/finance`)، **الموردين** (`/suppliers`)، **المشاريع** (`/projects`)، **المخزن** (`/inventory`)، **العمالة** (`/workforce`)، **العملاء** (`/clients`)، **الفواتير** (`/invoices`)، **التقارير** (`/reports`)، **التقارير اليومية** (`/dsr`)، **مطابقة البنك** (`/reconcile`)، **المسودات** (`/drafts`)، و **الرئيسية** (`/dashboard`).

---

## 📌 Master Summary Table

| # | Feature / Issue Addressed | Module / Location | Status |
|---|---------------------------|-------------------|--------|
| **1** | App environment, remote DB & demo accounts | System Setup | ✅ Complete |
| **2** | Dashboard top metric cards showing 0 | Dashboard Screen | ✅ Fixed |
| **3** | "Paid By" field error on editing transactions | Accounting / Ledger | ✅ Fixed |
| **4** | Project Spent vs. Income vs. Safe balance clarity | Projects Screen | ✅ Upgraded |
| **5** | Hesaby logo and brand title in top navigation | Global Layout | ✅ Added |
| **6** | User profile edit button in sidebar footer | Sidebar | ✅ Added |
| **7** | Sidebar collapse / full-screen toggle | Sidebar & Topbar | ✅ Added |
| **8** | Optional descriptions across transaction modals | Add Transaction Modal | ✅ Updated |
| **9** | Visibility of pending approval transactions (>5,000 EGP) | Finance Ledger | ✅ Fixed |
| **10** | Project Manager budget update authorization | Projects Modal | ✅ Fixed |
| **11** | Auto-approved client incomes & PM approval rights | Approvals Engine | ✅ Fixed |
| **12** | Raw code string cleanup in alert and success popups | Global Popups | ✅ Fixed |
| **13** | Persistent right-side AI Copilot Assistant | Global Layout | ✅ Added |
| **14** | AI chat reset with confirmation dialog | AI Assistant Panel | ✅ Added |
| **15** | Notification center with Clear All and expanded view | Topbar Notifications | ✅ Added |
| **16** | Assigned engineer selector in project modal | Projects Modal | ✅ Added |
| **17** | Custom Micromind AI Agent integration (GPT-5.6 Luna Pro) | AI Backend & Chat | ✅ Live |
| **18** | Full-app Copilot navigation & modal prefill engine | Global UI / Router | ✅ Live |
| **19** | Chronological top-to-bottom chat message flow | AI Assistant Drawer | ✅ Fixed |
| **20** | Executive eye-friendly dark mode palette | Global CSS | ✅ Upgraded |
| **21** | 3 Curated theme palettes (Monochrome, Obsidian, Light) | Topbar Theme Menu | ✅ Added |
| **22** | Floating Action Button (FAB) text contrast & theme dots | Global FAB / Topbar | ✅ Fixed |
| **23** | Elevated Floating Action Button (FAB) pill styling | Global FAB | ✅ Polished |
| **24** | Fixed "Invalid query" on material batch usage recording | Inventory / Usage Modal | ✅ Fixed |
| **25** | Removed number input spinners & widened invoice columns | Global CSS / Invoices | ✅ Fixed |
| **26** | Direct payment recording & live Gmail SMTP delivery | Invoices & Backend | ✅ Live |
| **27** | New Daily Report button & modal form | Daily Site Reports | ✅ Added |
| **28** | Complete Financial Reports & Analytics suite | Reports Screen | ✅ Upgraded |
| **29** | Relocated 2FA to sidebar footer quick button | Sidebar Footer | ✅ Polished |
| **30** | Arabic localization for DSR, Invoices & Reconciliation | Global i18n | ✅ Localized |
| **31** | RTL Sidebar collapse & Left AI Copilot in Arabic | Global RTL Layout | ✅ Fixed |
| **32** | Arabic Instant Transportation & Navigation in AI Copilot | AI Assistant / Router | ✅ Upgraded |

---

*Document updated and verified.*
