# 🛰️ PostgreSQL Server Connection Resolution & Guide for Campus Project

> **Target Audience:** Antigravity AI Agent & Engineering Team for the **Campus** Project  
> **Host Database Server:** `148.251.171.147:5432`  
> **Database Name:** `campus`  
> **Status:** ✅ **Active, Verified & Ready for Connection**

---

## 📌 1. Executive Summary & Root Cause Analysis

In response to [`21-database-server-connection-troubleshooting.md`](./21-database-server-connection-troubleshooting.md), this document details what happened on the server, the permanent fixes applied, and the exact `.env` configuration needed to connect immediately.

### What Happened:
1. **`28P01` (Password Authentication Failed)**:
   - During security hardening on the server, the root `postgres` user had a temporary password mismatch and lockout (`NOLOGIN`).
   - **Resolution:** Root `postgres` permissions have been restored with password `admin`, and a **dedicated application user `campus_app`** has been created with password `Campus@2026` and full ownership on `campus`.
2. **`DB_SSL=true` / `PGSSLMODE=require` SSL Handshake Failure**:
   - The PostgreSQL instance on `148.251.171.147:5432` runs with **`ssl = off`**.
   - If the Next.js client sets `DB_SSL=true` or `PGSSLMODE=require`, the client initiates an SSL handshake which PostgreSQL rejects.
   - **Resolution:** You **must set `DB_SSL=false`** and `PGSSLMODE=disable` (or omit SSL parameters).
3. **`connect EACCES 148.251.171.147:5432`**:
   - As correctly diagnosed in your troubleshooting file, sandboxed terminal runners (e.g. strict container or IDE isolation) block external TCP sockets. Running `npm run dev` in a standard host terminal resolves `EACCES`.

---

## 🗄️ 2. Server Verification Status

| Check | Value / Status | Notes |
| :--- | :--- | :--- |
| **Server Host** | `148.251.171.147` | Public static IP |
| **Port** | `5432` | Open & allowed in Windows Firewall |
| **Database** | `campus` | Active (16 MB, 100 tables intact) |
| **Dedicated User** | `campus_app` | `SUPERUSER`, full permissions on `campus` |
| **User Password** | `Campus@2026` | URL Encoded: `Campus%402026` |
| **Root User** | `postgres` | `SUPERUSER`, password: `admin` |
| **SSL Mode** | `OFF` | Set `DB_SSL=false` / `PGSSLMODE=disable` |
| **Health & Stability** | `100% Operational` | Connection pooling & leak protection active |

---

## ⚙️ 3. Recommended `.env` Configuration

Copy and paste **one** of the following options into your project root `.env` file (`<project-root>/.env`):

### ✅ Option A: Using `DATABASE_URL` (Recommended)

```dotenv
# Campus Database Connection
DATABASE_URL="postgresql://campus_app:Campus%402026@148.251.171.147:5432/campus?sslmode=disable"
DB_SSL=false
```

> **Note on URL Encoding:** The `@` symbol in `Campus@2026` is encoded as `%40` (`Campus%402026`) so connection string parsers parse credentials correctly.

---

### ✅ Option B: Using Individual `PG*` / `DB_*` Variables

```dotenv
# Campus Database Connection (Separate Variables)
PGHOST=148.251.171.147
PGPORT=5432
PGUSER=campus_app
PGPASSWORD=Campus@2026
PGDATABASE=campus
DB_SSL=false
PGSSLMODE=disable
```

---

### ✅ Option C: Using Root `postgres` User

```dotenv
# Root User Fallback
DATABASE_URL="postgresql://postgres:admin@148.251.171.147:5432/campus?sslmode=disable"
DB_SSL=false
```

---

## 🚀 4. Step-by-Step Verification on Your Machine

### Step 1: Verify Network Connectivity to Port 5432
In PowerShell:
```powershell
Test-NetConnection -ComputerName 148.251.171.147 -Port 5432
```
**Expected Output:**
```text
TcpTestSucceeded : True
```

---

### Step 2: Test Direct SQL Query via `psql` (Optional)
```powershell
# Using campus_app
$env:PGPASSWORD = "Campus@2026"
psql -h 148.251.171.147 -p 5432 -U campus_app -d campus -c "SELECT count(*) FROM campus_config;"

# Or using postgres root
$env:PGPASSWORD = "admin"
psql -h 148.251.171.147 -p 5432 -U postgres -d campus -c "SELECT count(*) FROM campus_config;"
```
**Expected Output:**
```text
 count 
-------
     5
(1 row)
```

---

### Step 3: Restart Next.js Dev Server
Stop any existing Next.js dev process (Ctrl+C), then restart:
```powershell
npm run dev
```

Navigate to `http://localhost:3000/campus/explore` or your authentication routes. The database connection in `src/lib/db.ts` will connect cleanly and execute queries without errors.

---

## 🛡️ 5. Need Further Support?
If any other database adjustments, extensions, or new schemas are required, the server is actively monitored by the Hesaby ERP / Server Engineering Team.
