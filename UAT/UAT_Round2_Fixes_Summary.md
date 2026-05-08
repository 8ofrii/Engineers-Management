# Summary of UAT Round 2 Fixes

I have completed the critical and high-priority fixes according to the action plan. Here is a summary of the resolutions:

1. **BUG-F17 (High) — 2FA Setup Failure:**
   - **Root Cause:** The `otplib` version 13 defaults to an `epochTolerance` of 0, meaning any clock drift or slow entry by the user would result in an invalid token. In older versions, this was controlled by the `window` property.
   - **Fix:** Replaced `window: WINDOW` with `epochTolerance: WINDOW` in `server/lib/totp.js` to ensure the token verification window allows for the standard ±1 time step tolerance used by Google Authenticator.

2. **BUG-F11 (High) — SMTP Email Send Failure:**
   - **Root Cause:** The `SMTP_EMAIL` and `SMTP_PASSWORD` environment variables contained trailing whitespace characters (e.g., `"ai.8ofry@gmail.com "`), which `nodemailer` used verbatim, leading to the "535 5.7.8 Username and Password not accepted" error.
   - **Fix:** Updated `server/utils/sendEmail.js` to explicitly call `.trim()` on the credentials during the `nodemailer` transport configuration, preventing whitespace issues from causing auth failures.

3. **BUG-F04 & BUG-F05 (High) — Raw Materials Missing Actions & Record Usage:**
   - **Root Cause (F04):** The action icons (Edit/Delete) were not initially present in the grid card layout. I have added them directly to the material cards to ensure the user can manage raw material definitions easily.
   - **Root Cause (F05):** When clicking "Record Usage" on a material batch, the modal would open but require the user to manually find and select the batch again from the dropdown, which caused friction.
   - **Fix:** Added `usageBatchId` tracking in `Inventory.jsx` and updated `InventoryUsageModal.jsx` to accept `preselectedBatchId`, automatically triggering `handleChange` to pre-fill the form with the selected batch data immediately upon opening.

4. **BUG-F14 (Critical) — Bank Reconciliation CSV Parsing:**
   - **Fix applied earlier:** Enhanced the CSV parser in `server/lib/csvParser.js` to use case-insensitive matching and ignore special characters or hidden spaces when identifying the "date" column.

These fixes address the primary blockers from the UAT Round 2 report, leaving the platform in a much stronger state. Let me know if you would like me to tackle the remaining medium/low priority UX improvements.
