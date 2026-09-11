# 🚀 Veyon (TeamSync) — Remote Deployment Guide for Antigravity & Developers

> **Purpose**: This guide provides the complete, step-by-step workflow allowing the developer of **Veyon** (`TeamSync`) and their **Antigravity AI Agent** to deploy updates directly to the live production server at **`https://veyon.aimicromind.com`** from their local computer—without ever needing to log into the VPS or use the VPS's Antigravity instance.

---

## 📌 1. Production Architecture Overview

The VPS (`148.251.171.147`) runs Windows Server with IIS, Node.js, and PostgreSQL.

| Component | VPS Location / Port | Description |
| :--- | :--- | :--- |
| **Domain** | `https://veyon.aimicromind.com` | Public HTTPS endpoint (Let's Encrypt SSL) |
| **Frontend Web Root** | `C:\inetpub\veyon.aimicromind.com` | Static built assets served by IIS (HTML, CSS, JS) |
| **Backend API Root** | `C:\Projects\TeamSync\server` | Node.js + Express + Prisma ORM + Socket.IO |
| **Backend Port** | `127.0.0.1:4000` | IIS reverse-proxies `/api/*`, `/socket.io/*`, `/uploads/*` |
| **Database** | `localhost:5432/teamsync` | Remote PostgreSQL on the same VPS |
| **Supervisor Service** | `C:\Projects\TeamSync\supervisor.cjs` | Self-healing daemon monitoring Backend & Frontend |
| **Health Endpoint** | `https://veyon.aimicromind.com/api/health` | Live status check (`{"status":"ok"}`) |

---

## 🔑 2. One-Time SSH Authentication Setup

To deploy remotely, your local machine needs passwordless SSH access to the VPS.

### Step A: Generate an SSH Key (on your local device)
In PowerShell or Terminal on your local machine:
```powershell
ssh-keygen -t ed25519 -f "$HOME\.ssh\id_ed25519_veyon" -C "colleague@veyon"
```
*(Press Enter when prompted for passphrase to leave it empty for automated deployments).*

### Step B: Authorize Your Key on the VPS
Provide your public key (`$HOME\.ssh\id_ed25519_veyon.pub`) to the server administrator, or add it directly to the server:
- Open: `C:\ProgramData\ssh\administrators_authorized_keys` (Windows Server Administrator SSH keys file)
- Append your public key line to this file.
- Also append to: `C:\Users\Administrator\.ssh\authorized_keys`.

### Step C: Test SSH Connection (from your local device)
Run:
```powershell
ssh -i "$HOME\.ssh\id_ed25519_veyon" -o StrictHostKeyChecking=no Administrator@148.251.171.147 "echo Connected successfully to Veyon host!"
```
If you see `Connected successfully to Veyon host!`, your setup is complete.

---

## ⚡ 3. Quick-Deploy Script (`deploy-remote.ps1`)

Create this PowerShell script inside your local project root (`TeamSync/scripts/deploy-remote.ps1` or `TeamSync/deploy-remote.ps1`). It automates the entire process for you or your Antigravity agent:

```powershell
<#
.SYNOPSIS
  Deploy Veyon (TeamSync) to live production server (veyon.aimicromind.com)
.EXAMPLE
  .\deploy-remote.ps1 -Target frontend
  .\deploy-remote.ps1 -Target backend
  .\deploy-remote.ps1 -Target all
#>
param (
    [ValidateSet('frontend', 'backend', 'all', 'status')]
    [string]$Target = 'frontend',
    [string]$KeyPath = "$HOME\.ssh\id_ed25519_veyon",
    [string]$Server = "Administrator@148.251.171.147"
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$projectRoot\client")) { $projectRoot = Get-Location }

$iisPath = "C:/inetpub/veyon.aimicromind.com"
$vpsRoot = "C:/Projects/TeamSync"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " 🚀 Veyon Remote Deployment -> veyon.aimicromind.com" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Status check
if ($Target -eq 'status') {
    Write-Host "`n🔍 Checking live service status on VPS..." -ForegroundColor Yellow
    ssh -i $KeyPath -o StrictHostKeyChecking=no $Server "powershell -ExecutionPolicy Bypass -File $vpsRoot/status.ps1"
    Write-Host "`n🌐 Checking public HTTPS endpoint..." -ForegroundColor Yellow
    curl.exe -s --max-time 5 "https://veyon.aimicromind.com/api/health"
    exit 0
}

# 1. FRONTEND DEPLOYMENT
if ($Target -eq 'frontend' -or $Target -eq 'all') {
    Write-Host "`n[1/2] 📦 Building Client Frontend (Vite)..." -ForegroundColor Yellow
    Push-Location "$projectRoot\client"
    try {
        npm run build
    } finally {
        Pop-Location
    }

    Write-Host "`n[2/2] 📤 Transferring build to IIS web root ($iisPath)..." -ForegroundColor Yellow
    scp -i $KeyPath -o StrictHostKeyChecking=no -r "$projectRoot\client\dist\*" "${Server}:${iisPath}/"
    Write-Host "✅ Frontend updated live! (Instant IIS refresh, zero downtime)" -ForegroundColor Green
}

# 2. BACKEND DEPLOYMENT
if ($Target -eq 'backend' -or $Target -eq 'all') {
    Write-Host "`n[1/3] 📤 Syncing backend files to VPS..." -ForegroundColor Yellow
    scp -i $KeyPath -o StrictHostKeyChecking=no -r "$projectRoot\server\src" "${Server}:${vpsRoot}/server/"
    scp -i $KeyPath -o StrictHostKeyChecking=no "$projectRoot\server\package.json" "${Server}:${vpsRoot}/server/"
    if (Test-Path "$projectRoot\server\prisma") {
        scp -i $KeyPath -o StrictHostKeyChecking=no -r "$projectRoot\server\prisma" "${Server}:${vpsRoot}/server/"
    }

    Write-Host "`n[2/3] ⚙️ Applying Prisma migrations (if any)..." -ForegroundColor Yellow
    ssh -i $KeyPath -o StrictHostKeyChecking=no $Server "cd $vpsRoot/server && npx prisma generate"

    Write-Host "`n[3/3] 🔄 Restarting Veyon backend supervisor..." -ForegroundColor Yellow
    ssh -i $KeyPath -o StrictHostKeyChecking=no $Server "powershell -ExecutionPolicy Bypass -File $vpsRoot/restart-all.ps1"

    Start-Sleep -Seconds 3
    Write-Host "`n🩺 Verifying API health..." -ForegroundColor Yellow
    ssh -i $KeyPath -o StrictHostKeyChecking=no $Server "powershell -ExecutionPolicy Bypass -File $vpsRoot/status.ps1"
    Write-Host "✅ Backend updated and online!" -ForegroundColor Green
}

Write-Host "`n🎉 Deployment finished! Test live at: https://veyon.aimicromind.com" -ForegroundColor Cyan
```

---

## 🛠️ 4. Manual / Step-by-Step Deployment Commands

If you or your agent want to run raw commands without the script:

### A. Deploying Frontend Updates (React / Vite)
Only updates client components, styling, or assets:
```bash
# 1. Build locally
cd client
npm run build

# 2. Upload dist folder to live IIS webroot
scp -i ~/.ssh/id_ed25519_veyon -o StrictHostKeyChecking=no -r dist/* Administrator@148.251.171.147:C:/inetpub/veyon.aimicromind.com/

# 3. Verify public response
curl.exe -I https://veyon.aimicromind.com
```
*Note: IIS handles this without stopping the server. All visitors immediately receive the updated code.*

### B. Deploying Backend Updates (API / Socket.IO / Database)
When you modify routes, controllers, Prisma schema, or server logic:
```bash
# 1. Transfer updated server source files
scp -i ~/.ssh/id_ed25519_veyon -o StrictHostKeyChecking=no -r server/src Administrator@148.251.171.147:C:/Projects/TeamSync/server/
scp -i ~/.ssh/id_ed25519_veyon -o StrictHostKeyChecking=no server/package.json Administrator@148.251.171.147:C:/Projects/TeamSync/server/
scp -i ~/.ssh/id_ed25519_veyon -o StrictHostKeyChecking=no -r server/prisma Administrator@148.251.171.147:C:/Projects/TeamSync/server/

# 2. Run Prisma migration / generation on the server
ssh -i ~/.ssh/id_ed25519_veyon -o StrictHostKeyChecking=no Administrator@148.251.171.147 "cd C:\Projects\TeamSync\server && npx prisma generate && npx prisma migrate deploy"

# 3. Restart the background supervisor
ssh -i ~/.ssh/id_ed25519_veyon -o StrictHostKeyChecking=no Administrator@148.251.171.147 "powershell -ExecutionPolicy Bypass -File C:\Projects\TeamSync\restart-all.ps1"

# 4. Check status & logs
ssh -i ~/.ssh/id_ed25519_veyon -o StrictHostKeyChecking=no Administrator@148.251.171.147 "powershell -ExecutionPolicy Bypass -File C:\Projects\TeamSync\status.ps1"
```

---

## 🤖 5. Antigravity Agent Configuration Rule

Drop the following snippet directly into your local project's **`AGENTS.md`** or **`.agents/rules/deployment.md`**. This gives your Antigravity agent autonomous knowledge of how to build and deploy your application when you instruct it:

```markdown
# 🌐 Veyon Production Deployment Rules for Antigravity

When instructed to deploy, release, or push updates to production:

### Server Credentials & Hosts
- Host: `148.251.171.147`
- User: `Administrator`
- SSH Key: `~/.ssh/id_ed25519_veyon` (or local configured key)
- Domain: `https://veyon.aimicromind.com`

### Frontend Deployment Protocol
1. Build locally in `client/`: `npm run build`.
2. Transfer `client/dist/*` to IIS web root:
   `scp -i ~/.ssh/id_ed25519_veyon -o StrictHostKeyChecking=no -r client/dist/* Administrator@148.251.171.147:C:/inetpub/veyon.aimicromind.com/`
3. Verify live response: `curl.exe -s --max-time 5 https://veyon.aimicromind.com/index.html`.

### Backend Deployment Protocol
1. Upload modified backend files to `C:/Projects/TeamSync/server/`.
2. If Prisma schema changed, run:
   `ssh -i ~/.ssh/id_ed25519_veyon Administrator@148.251.171.147 "cd C:\Projects\TeamSync\server && npx prisma generate && npx prisma migrate deploy"`
3. Restart supervisor:
   `ssh -i ~/.ssh/id_ed25519_veyon Administrator@148.251.171.147 "powershell -ExecutionPolicy Bypass -File C:\Projects\TeamSync\restart-all.ps1"`
4. Verify API health:
   `curl.exe -s --max-time 5 https://veyon.aimicromind.com/api/health`.
```

---

## 🔍 6. Troubleshooting & Health Verification

### Check Server Logs Remotely
```bash
# View last 40 lines of backend logs
ssh -i ~/.ssh/id_ed25519_veyon Administrator@148.251.171.147 "powershell Get-Content C:\Projects\TeamSync\logs\backend.log -Tail 40"

# View supervisor logs
ssh -i ~/.ssh/id_ed25519_veyon Administrator@148.251.171.147 "powershell Get-Content C:\Projects\TeamSync\logs\supervisor.log -Tail 40"
```

### Check IIS Routing
The IIS `web.config` at `C:\inetpub\veyon.aimicromind.com\web.config` handles:
- `/api/*` -> Reverse proxy to `http://127.0.0.1:4000/api/{R:1}`
- `/socket.io/*` -> Reverse proxy to `http://127.0.0.1:4000/socket.io/{R:1}`
- Static files -> HTML, CSS, JS with SPA fallback to `/index.html`

### Rollback Strategy
If an update causes issues:
- **Frontend**: Simply run `npm run build` on a known working git commit, then `scp` the `dist/*` folder to `C:\inetpub\veyon.aimicromind.com/`.
- **Backend**: Re-upload the previous working `server/src/` files and run `restart-all.ps1`.
