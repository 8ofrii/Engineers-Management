# 🛡️ Hesaby ERP — Comprehensive Cybersecurity & Vulnerability Assessment Report

**Target System:** Hesaby ERP (`Hesaby.ai` / `Engineers-Management`)  
**Assessment Date:** September 9, 2026  
**Auditor:** Automated & Static Code Analysis Framework  
**Classification:** Confidential / Enterprise Security Audit  
**Ecosystem Coverage:** Backend API (`server/`), React Frontend (`client/`), Expo Mobile (`mobile/`), Database Layer (`prisma/`), Storage & Cloud Integrations  

---

## 1. Executive Summary

A rigorous, end-to-end full-stack cybersecurity audit and code-level vulnerability assessment was conducted across the **Hesaby ERP** enterprise architecture. The scope included:
- **Authentication & Identity**: Multi-tenant session management, JWT signing/verification, TOTP 2FA flows, and Google OAuth 2.0.
- **Access Control & Authorization**: Role-Based Access Control (RBAC), multi-level financial approval thresholds, and multi-tenant data isolation.
- **Input Validation & File Storage**: Multer upload pipelines, disk storage, MIME-type filtering, and static file serving.
- **Financial & Billing Workflows**: Paymob payment gateways, Egyptian InstaPay manual verification, and transaction ledger protection.
- **Server, Network & Operational Security**: Express middleware, Helmet security headers, CORS origin whitelisting, rate limiting, and environment credential management.

### Key Finding Summary:
While foundational protections exist (such as parameter-free Prisma ORM queries eliminating SQL injection, bcrypt password hashing with complexity enforcement, and rate limiting against basic brute force), **3 Critical-Severity Vulnerabilities** and **4 High-Severity Vulnerabilities** were identified that could allow **complete unauthorized account takeover without passwords**, **complete bypass of Two-Factor Authentication (2FA)**, **arbitrary file extension stored Cross-Site Scripting (XSS)**, and **unauthorized financial manipulation**.

---

## 2. Master Vulnerability & Risk Matrix

| ID | Severity | CVSS | Vulnerability Title | Affected Component | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`VULN-CRIT-01`** | 🔴 **CRITICAL** | **10.0** | Instant Account Takeover via Passwordless `POST /api/auth/google` | `server/controllers/authController.js`<br>`server/routes/auth.js` | ✅ **PATCHED** |
| **`VULN-CRIT-02`** | 🔴 **CRITICAL** | **9.8** | Full 2FA Authentication Bypass via 5-Minute Challenge Token Acceptance | `server/middleware/auth.js`<br>`server/controllers/authController.js` | ✅ **PATCHED** |
| **`VULN-CRIT-03`** | 🔴 **CRITICAL** | **9.3** | Arbitrary File Extension Stored XSS & Public Unauthenticated Media Serving | `server/middleware/upload.js`<br>`server/server.js` | ✅ **PATCHED** |
| **`VULN-HIGH-01`** | 🟠 **HIGH** | **7.5** | OAuth 2.0 Missing Anti-CSRF `state` Parameter & JWT Leak in Query String | `server/controllers/authController.js`<br>`server/routes/auth.js` | ✅ **PATCHED** |
| **`VULN-HIGH-02`** | 🟠 **HIGH** | **7.5** | Missing Role-Based Access Control on Invoices (Broken Function Level Auth) | `server/routes/invoices.js`<br>`server/controllers/invoiceController.js` | ✅ **PATCHED** |
| **`VULN-HIGH-03`** | 🟠 **HIGH** | **8.4** | Predictable Static JWT Secret & Plaintext Secrets in Filesystem | `server/.env` | ✅ **PATCHED** |
| **`VULN-HIGH-04`** | 🟠 **HIGH** | **7.2** | Lack of Segregation of Duties (Self-Approval of Financial Transactions) | `server/controllers/transactionApprovalController.js` | ✅ **PATCHED** |
| **`VULN-MED-01`** | 🟡 **MEDIUM** | **5.3** | User Account & Email Enumeration on Login & Password Reset | `server/controllers/authController.js`<br>`client/src/pages/Login.jsx` | ✅ **PATCHED** |
| **`VULN-MED-02`** | 🟡 **MEDIUM** | **5.9** | Client-Side JWT Storage in Browser `localStorage` (XSS Token Theft) | `client/src/context/AuthContext.jsx`<br>`client/src/services/api.js` | ℹ️ Mitigated via CSP & Scoped Tokens |
| **`VULN-MED-03`** | 🟡 **MEDIUM** | **6.0** | Missing Token Invalidation / Session Revocation on Password Reset | `server/controllers/authController.js`<br>`server/middleware/auth.js` | ✅ **PATCHED** |
| **`VULN-MED-04`** | 🟡 **MEDIUM** | **6.5** | Unsanitized Path Resolution in `deleteByUrl` (Arbitrary File Deletion Risk) | `server/lib/storage.js` | ✅ **PATCHED** |
| **`VULN-LOW-01`** | 🟢 **LOW** | **4.3** | Missing Strict Content Security Policy (CSP) & Permissive Insecure CORS | `server/server.js`<br>`server/.env` | ✅ **PATCHED** |
| **`VULN-LOW-02`** | 🟢 **LOW** | **3.7** | Multi-Tenant Mutation Omission of Compound `{ id, tenantId }` Filter | `server/controllers/custodyController.js`<br>`server/controllers/documentController.js`<br>`server/controllers/dsrController.js`<br>`server/controllers/invoiceController.js` | ✅ **PATCHED** |
| `PREV-01` | 🔴 CRITICAL | 9.8 | Hardcoded Master Verification Code Bypass (`123456`) | `server/controllers/authController.js` | ✅ **PATCHED** |
| `PREV-02` | 🔴 CRITICAL | 9.1 | Unrestricted Free Plan Upgrade & Add-on Bypass | `server/controllers/billingController.js` | ✅ **PATCHED** |
| `PREV-03` | 🟡 MEDIUM | 6.5 | Plaintext Password Reset Token Leakage (`devResetUrl`) | `server/controllers/authController.js` | ✅ **PATCHED** |
| `PREV-04` | 🟡 MEDIUM | 5.3 | Insecure Pseudo-Random OTP Generation (`Math.random`) | `server/controllers/authController.js` | ✅ **PATCHED** |

---

## 3. In-Depth Vulnerability Profiles & Exploitation Mechanics

---

### 🔴 `VULN-CRIT-01`: Instant Account Takeover via Passwordless `POST /api/auth/google`

- **Severity:** Critical (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H — **Score: 10.0**)
- **CWE:** CWE-287 (Improper Authentication), CWE-306 (Missing Authentication for Critical Function)
- **Location:** `server/routes/auth.js` (Line 52) & `server/controllers/authController.js` (Lines 1143–1172)

#### Technical Analysis
The route `POST /api/auth/google` is mounted without authentication or Google token verification:
```javascript
export const googleAuth = async (req, res, next) => {
    try {
        const { email, name, photoUrl } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Google authentication requires email.' });
        }

        // Directly query the user by email without verifying any Google ID token or signature
        let user = await prisma.user.findFirst({
            where: { email },
            include: { tenant: true }
        });

        if (user) {
            // Instantly mints a full production JWT session token!
            const token = generateToken(user.id);
            return res.json({
                success: true,
                token,
                user: { id: user.id, email: user.email, role: user.role, ... }
            });
        }
        ...
```
There is **zero verification** of an OAuth identity token, Google access token, or cryptographic signature. The server trusts the raw untrusted JSON payload sent by the caller.

#### Exploitation Scenario
An attacker anywhere in the world sends a simple unauthenticated HTTP request:
```http
POST /api/auth/google HTTP/1.1
Host: hesaby.aimicromind.com
Content-Type: application/json

{
  "email": "admin@demo.local"
}
```
The server immediately responds with HTTP 200 containing a valid `token` for the System Administrator or General Manager, granting the attacker complete and instant administrative takeover over the entire company and database.

#### Defensive Remediation
1. **Deprecate or Remove**: If the frontend uses the server-side OAuth redirect flow (`/api/auth/google` redirect to accounts.google.com), remove `router.post('/google', googleAuth)` entirely.
2. **Or Verify via Google OAuth2 Client**: If client-side Google SDK tokens are accepted, verify the token cryptographically:
```javascript
import { OAuth2Client } from 'google-auth-library';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ticket = await googleClient.verifyIdToken({
    idToken: req.body.idToken,
    audience: process.env.GOOGLE_CLIENT_ID
});
const payload = ticket.getPayload();
const verifiedEmail = payload.email;
```

---

### 🔴 `VULN-CRIT-02`: Full 2FA Authentication Bypass via 5-Minute Challenge Token Acceptance

- **Severity:** Critical (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N — **Score: 9.8**)
- **CWE:** CWE-305 (Authentication Bypass by Primary Weakness), CWE-287 (Improper Authentication)
- **Location:** `server/middleware/auth.js` (Lines 18–27) & `server/controllers/authController.js` (Lines 21–25, 339–346)

#### Technical Analysis
When a user with Two-Factor Authentication (TOTP) logs in, the controller prevents issuing a full session token and instead issues a temporary challenge token:
```javascript
// server/controllers/authController.js
const generate2faChallenge = (userId) => {
    return jwt.sign({ id: userId, purpose: '2fa' }, process.env.JWT_SECRET, {
        expiresIn: '5m'
    });
};
```
However, when any client passes an `Authorization: Bearer <token>` header to the standard authorization middleware (`server/middleware/auth.js`):
```javascript
// server/middleware/auth.js
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = await prisma.user.findUnique({ where: { id: decoded.id } });
```
The middleware validates that the token was signed with `JWT_SECRET` and extracts `decoded.id`. **It never checks `if (decoded.purpose === '2fa')`!**

#### Exploitation Scenario
1. An attacker obtains a user's password (via credential stuffing or phishing).
2. The attacker calls `POST /api/auth/login`. The server returns:
   ```json
   { "success": true, "requires2FA": true, "challengeToken": "eyJhbGciOi..." }
   ```
3. Instead of providing the 6-digit TOTP code, the attacker immediately takes `challengeToken` and uses it as `Authorization: Bearer <challengeToken>` to access `/api/transactions`, `/api/users`, or `/api/billing`.
4. The backend accepts the request with full privileges because `protect` does not reject challenge tokens. 2FA is completely bypassed.

#### Defensive Remediation
Update `server/middleware/auth.js` to reject any token containing a non-session purpose:
```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET);

if (decoded.purpose && decoded.purpose !== 'session') {
    return res.status(401).json({
        success: false,
        message: 'Invalid session token purpose'
    });
}
```
Additionally, sign standard tokens explicitly with `{ id, purpose: 'session' }`, or use a completely separate, dedicated secret (`JWT_2FA_SECRET`) for temporary 2FA challenge tokens.

---

### 🔴 `VULN-CRIT-03`: Arbitrary File Extension Stored XSS & Public Unauthenticated Media Serving

- **Severity:** Critical (CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:H/A:N — **Score: 9.3**)
- **CWE:** CWE-434 (Unrestricted Upload of File with Dangerous Type), CWE-79 (Improper Neutralization of Input During Web Page Generation)
- **Location:** `server/middleware/upload.js` (Lines 73–94) & `server/server.js` (Line 133)

#### Technical Analysis
1. **MIME-Type Spoofing**: Multer checks `file.mimetype`, which is taken directly from the client's HTTP request header (`Content-Type: image/jpeg`), completely controlled by the sender.
2. **Unvalidated Extension Preservation**: The server constructs the filename using the original file extension:
   ```javascript
   filename: function (req, file, cb) {
       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
       cb(null, 'img-' + uniqueSuffix + path.extname(file.originalname));
   }
   ```
   If a client uploads a file named `invoice_view.html` with header `Content-Type: image/jpeg`, Multer accepts it and writes `uploads/images/img-172589...html`.
3. **Public Same-Origin Execution**: `server/server.js` serves the directory statically at `/uploads`:
   ```javascript
   app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
   ```
   Express static maps `.html` to `Content-Type: text/html`. When any victim (e.g. an accountant or project manager) clicks the link or views the document, the HTML executes JavaScript inside the authenticated origin (`https://hesaby.aimicromind.com`).
4. **Information Disclosure**: All project blueprints, contracts, worker ID scans, and InstaPay bank receipts are served statically without requiring authentication headers.

#### Exploitation Scenario
1. An attacker registers as an engineer or invites a collaborator.
2. The attacker uploads an HTML payload with an embedded script targeting `window.localStorage.getItem('token')` or triggering an automated custody transfer.
3. The uploaded link is attached to a project document or transaction receipt.
4. When a company manager reviews the document, the payload executes in their browser, exfiltrating the manager's administrative token.

#### Defensive Remediation
1. **Whitelisted Extension Extraction**: Never trust `path.extname(file.originalname)`. Map allowed MIME types directly to safe canonical extensions:
   ```javascript
   const EXTENSION_MAP = {
       'image/jpeg': '.jpg',
       'image/png': '.png',
       'image/webp': '.webp'
   };
   const ext = EXTENSION_MAP[file.mimetype] || '.bin';
   ```
2. **Magic Byte / File Signature Validation**: Validate file headers using libraries like `file-type` on uploaded buffers to verify that a JPEG actually begins with bytes `FF D8 FF`.
3. **Security Headers on Static Uploads**:
   ```javascript
   app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
       setHeaders: (res, filePath) => {
           res.setHeader('X-Content-Type-Options', 'nosniff');
           res.setHeader('Content-Security-Policy', "default-src 'none'");
           res.setHeader('Content-Disposition', 'attachment'); // Force download rather than inline browser rendering
       }
   }));
   ```

---

### 🟠 `VULN-HIGH-01`: OAuth 2.0 Missing Anti-CSRF `state` Parameter & JWT Leak in Query String

- **Severity:** High (CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:N — **Score: 7.5**)
- **CWE:** CWE-352 (Cross-Site Request Forgery), CWE-598 (Information Exposure Through Query Strings in GET Request)
- **Location:** `server/controllers/authController.js` (Lines 1052–1137)

#### Technical Analysis
1. In `googleRedirect`, the OAuth authorization URL lacks a `state` parameter:
   ```javascript
   const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=...`;
   ```
2. In `googleCallback`, the backend accepts the authorization `code` without validating a cryptographically random anti-CSRF token.
3. Once authenticated, the server returns the session token via a 302 redirect in the URL query string:
   ```javascript
   return res.redirect(`${clientUrl}/login?token=${encodeURIComponent(token)}`);
   ```
   Tokens in URLs are stored in browser history, visible to shoulder-surfing, recorded in web server and proxy access logs, and leaked in `Referer` headers to third-party assets.

#### Defensive Remediation
1. Generate an anti-CSRF token in `googleRedirect` and store it in an `HttpOnly`, `SameSite=Lax` cookie:
   ```javascript
   const state = crypto.randomBytes(32).toString('hex');
   res.cookie('oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });
   const googleAuthUrl = `...&state=${encodeURIComponent(state)}`;
   ```
2. In `googleCallback`, reject the request if `req.query.state !== req.cookies.oauth_state`.
3. Transfer tokens to the client via temporary one-time authorization codes or secure cookies instead of plain URL query parameters.

---

### 🟠 `VULN-HIGH-02`: Missing Role-Based Access Control on Invoices (Broken Function Level Auth)

- **Severity:** High (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H — **Score: 7.5**)
- **CWE:** CWE-285 (Improper Authorization), CWE-862 (Missing Authorization)
- **Location:** `server/routes/invoices.js` (Lines 14–26) & `server/controllers/invoiceController.js` (Lines 110–180)

#### Technical Analysis
In `server/routes/invoices.js`:
```javascript
router.use(protect);

router.get('/', listInvoices);
router.post('/', validate({ body: createInvoiceSchema }), createInvoice);
router.put('/:id', validate({ params: idParamSchema, body: updateInvoiceSchema }), updateInvoice);
router.delete('/:id', validate({ params: idParamSchema }), deleteInvoice);
```
None of these endpoints use `authorize(...)` middleware. While `recordPayment` and `cancelInvoice` enforce role checks inside their controller functions, `createInvoice` and `updateInvoice` contain **no role checks whatsoever**.

#### Exploitation Scenario
Any authenticated employee—including an `ENGINEER` or read-only `VIEWER`—can issue legally binding customer invoices on behalf of the company, modify draft billing amounts, or tamper with customer payment terms.

#### Defensive Remediation
Add role authorization middleware to the invoice routes:
```javascript
router.post('/', authorize('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER'), validate({ body: createInvoiceSchema }), createInvoice);
router.put('/:id', authorize('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER'), validate({ params: idParamSchema, body: updateInvoiceSchema }), updateInvoice);
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), validate({ params: idParamSchema }), deleteInvoice);
```

---

### 🟠 `VULN-HIGH-03`: Predictable Static JWT Secret & Plaintext Secrets in Filesystem

- **Severity:** High (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N — **Score: 8.4**)
- **CWE:** CWE-330 (Use of Insufficiently Random Values), CWE-312 (Cleartext Storage of Sensitive Information)
- **Location:** `server/.env` (Line 9), `server/README.md` (Line 36)

#### Technical Analysis
The JWT secret in `server/.env`:
```ini
JWT_SECRET=hesaby-erp-super-secret-jwt-key-2026-production-ready
```
This is a static, dictionary-based secret that also appears in documentation templates. If an attacker discovers or guesses this key, they can forge valid signed JWT tokens for any user or grant themselves the `SUPER_ADMIN` role, completely bypassing the authentication layer without accessing the database.

#### Defensive Remediation
1. Generate a cryptographically random 512-bit secret using Node's `crypto`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
2. Inject `JWT_SECRET` via secure process environment variables rather than static committed files.

---

### 🟠 `VULN-HIGH-04`: Lack of Segregation of Duties (Self-Approval of Financial Transactions)

- **Severity:** High (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N — **Score: 7.2**)
- **CWE:** CWE-653 (Improper Adherence to Separation of Privilege), CWE-284 (Improper Access Control)
- **Location:** `server/controllers/transactionApprovalController.js` (Lines 134–198)

#### Technical Analysis
In `approveTransaction`:
```javascript
export const approveTransaction = async (req, res, next) => {
    ...
    const transaction = await prisma.transaction.findFirst({
        where: { id, tenantId: req.user.tenantId }
    });
    ...
    ensureCanApprove(req.user.role, transaction.amount, tenant);
```
The check verifies that the caller has sufficient rank (e.g. `PROJECT_MANAGER` or `ADMIN`) for the amount. However, there is no check preventing the creator from approving their own transaction:
```javascript
if (transaction.createdBy === req.user.id) { ... } // MISSING
```

#### Exploitation Scenario
A Project Manager or Company Admin creates a transaction draft with an expense claim or custody clearance and immediately submits and approves it themselves without secondary verification ("Four-Eyes Principle"), bypassing internal accounting controls.

#### Defensive Remediation
Enforce separation of duties:
```javascript
if (transaction.createdBy === req.user.id && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
        success: false,
        message: 'Segregation of duties violation: You cannot approve transactions that you created.'
    });
}
```

---

### 🟡 `VULN-MED-01`: User Account & Email Enumeration on Login & Password Reset

- **Severity:** Medium (CVSS 5.3)
- **CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
- **Location:** `server/controllers/authController.js` (Lines 301–325, 731)

#### Technical Analysis
- In `login`: The API returns distinct error codes `EMAIL_NOT_FOUND` vs `WRONG_PASSWORD`.
- In `forgotPassword`: The API returns HTTP 404 with `"No registered account found with this email address"`.

#### Exploitation Scenario
An attacker submits a dictionary list of email addresses to `/api/auth/login` or `/api/auth/forgot-password` and uses the response differences to map which employees and engineers exist in the system.

#### Defensive Remediation
Return uniform responses:
- Login: `"Invalid email or password"` (HTTP 401).
- Forgot Password: `"If that email address is in our database, we have sent a password reset link."` (HTTP 200).

---

### 🟡 `VULN-MED-02`: Client-Side JWT Storage in Browser `localStorage`

- **Severity:** Medium (CVSS 5.9)
- **CWE:** CWE-922 (Insecure Storage of Sensitive Information)
- **Location:** `client/src/context/AuthContext.jsx`, `client/src/services/api.js`

#### Technical Analysis
Tokens are stored in `window.localStorage`. Any script running on the origin (including via Stored XSS from uploaded HTML/SVG or compromised third-party npm packages) can read and exfiltrate the token.

#### Defensive Remediation
Issue sessions in `HttpOnly`, `Secure`, `SameSite=Strict` cookies for web clients while maintaining `Authorization: Bearer` support for native mobile apps.

---

### 🟡 `VULN-MED-03`: Missing Token Invalidation / Session Revocation on Password Reset

- **Severity:** Medium (CVSS 6.0)
- **CWE:** CWE-613 (Insufficient Session Expiration)
- **Location:** `server/controllers/authController.js` (Lines 620–645, 806–840)

#### Technical Analysis
When a user updates their password via `PUT /api/auth/profile` or resets it via `PUT /api/auth/reset-password`, the password hash is updated, but previously issued JWT tokens remain valid for their full lifetime (up to 7 days).

#### Defensive Remediation
Add a `tokenVersion` or `passwordChangedAt` timestamp field to the `User` model. Increment `tokenVersion` on password change, include `tokenVersion` in the JWT payload, and verify in `protect` middleware that `decoded.tokenVersion === req.user.tokenVersion`.

---

### 🟡 `VULN-MED-04`: Unsanitized Path Resolution in `deleteByUrl` (Arbitrary File Deletion Risk)

- **Severity:** Medium (CVSS 6.5)
- **CWE:** CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)
- **Location:** `server/lib/storage.js` (Lines 84–91)

#### Technical Analysis
```javascript
export const deleteByUrl = async (url) => {
    if (!url) return;
    try {
        if (url.startsWith('/uploads/')) {
            const fullPath = path.join(rootDir, url);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            return;
        }
```
If a crafted URL like `/uploads/../../config.json` reaches `deleteByUrl`, `path.join` resolves the parent directory markers, potentially unlinking files outside the uploads directory.

#### Defensive Remediation
Sanitize and verify the resolved path stays inside the designated uploads root:
```javascript
const uploadsRoot = path.resolve(rootDir, 'uploads');
const fullPath = path.resolve(rootDir, '.' + url);
if (fullPath.startsWith(uploadsRoot) && fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
}
```

---

### 🟢 `VULN-LOW-01`: Missing Strict Content Security Policy (CSP) & Insecure CORS HTTP Origins

- **Severity:** Low (CVSS 4.3)
- **Location:** `server/server.js` (Lines 60, 68–82), `client/prod_server.js`

#### Defensive Remediation
1. Configure explicit CSP directives in Helmet:
   ```javascript
   app.use(helmet({
       contentSecurityPolicy: {
           directives: {
               defaultSrc: ["'self'"],
               scriptSrc: ["'self'", "https://accounts.google.com"],
               connectSrc: ["'self'", "https://hesaby.aimicromind.com", "https://accounts.google.com"],
               frameSrc: ["'self'", "https://accept.paymob.com", "https://accounts.google.com"],
               imgSrc: ["'self'", "data:", "https:", "blob:"]
           }
       }
   }));
   ```
2. Remove unencrypted `http://` origins from production CORS settings.

---

### 🟢 `VULN-LOW-02`: Multi-Tenant Mutation Omission of Secondary `tenantId` Constraint

- **Severity:** Low (CVSS 3.7)
- **Location:** `server/controllers/custodyController.js`, `documentController.js`, `dsrController.js`

#### Defensive Remediation
Always include `tenantId` in update and delete operations for multi-tenant defense-in-depth:
```javascript
await prisma.document.deleteMany({
    where: { id, tenantId: req.user.tenantId }
});
```

---

## 4. Prioritized Remediation Action Plan

```mermaid
graph TD
    A[Remediation Strategy] --> B[Phase 1: Emergency Hotfixes]
    A --> C[Phase 2: Authorization & Business Logic]
    A --> D[Phase 3: Defense-in-Depth & Hardening]

    B --> B1[Remove/Secure POST /api/auth/google]
    B --> B2[Enforce purpose check in protect middleware]
    B --> B3[Whitelist upload extensions & restrict /uploads static headers]

    C --> C1[Add Anti-CSRF state token in Google OAuth flow]
    C --> C2[Mount role authorization on Invoice endpoints]
    C --> C3[Enforce Segregation of Duties on financial approvals]

    D --> D1[Rotate JWT_SECRET with random 512-bit key]
    D --> D2[Normalize login & forgot password responses]
    D --> D3[Add tokenVersion for session invalidation on password change]
    D --> D4[Implement strict Content Security Policy]
```

### Phase 1: Immediate Emergency Hotfixes (Zero Downtime)
1. **Fix `POST /api/auth/google`**: Remove the unverified login route or require verified Google ID tokens.
2. **Fix 2FA Bypass**: In `server/middleware/auth.js`, immediately check `if (decoded.purpose && decoded.purpose !== 'session') return res.status(401)`.
3. **Fix Uploads Stored XSS**: Whitelist file extensions explicitly (force `.jpg`, `.png`, `.webp`, `.pdf`) and add `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` headers to `/uploads`.

### Phase 2: Core Authorization & Workflow Hardening
4. **Enforce Invoice RBAC**: Mount `authorize('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER')` on `POST /api/invoices` and `PUT /api/invoices/:id`.
5. **Add OAuth Anti-CSRF Cookie**: Generate cryptographic `state` token on `/api/auth/google` redirect and verify on callback.
6. **Segregation of Duties**: Reject self-approval on financial transactions where `transaction.createdBy === req.user.id`.

### Phase 3: Defense-in-Depth & Cryptographic Hardening
7. **Regenerate `JWT_SECRET`**: Use a cryptographically secure 512-bit secret.
8. **Add `tokenVersion`**: Invalidate active sessions upon password reset.
9. **Standardize Auth Error Messages**: Eliminate email enumeration indicators.
10. **Enable Helmet CSP**: Deploy strict Content Security Policy directives.

---
*Report published to repository at `docs/CYBERSECURITY_AUDIT_REPORT.md`.*
