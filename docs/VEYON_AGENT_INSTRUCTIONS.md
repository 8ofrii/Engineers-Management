# 🤖 Veyon Developer Agent Runbook: Remote Deployment & VPS Access

> **Target Recipient**: Antigravity AI Agent & Developer for **VEYON** (`TeamSync`)  
> **Production Target**: `https://veyon.aimicromind.com` | VPS: `148.251.171.147`  
> **Status**: ✅ **SSH Authorization Complete**. Your public key (`colleague@veyon`) has been authorized on the server with full administrative permissions and strict Windows OpenSSH NTFS ACLs.

---

## ⚡ Quick Summary for the Agent

You now have direct remote SSH access to the production VPS (`148.251.171.147`). You do **not** need to log into the VPS or use the VPS GUI. You can build on your local machine and ship updates live using `scp` and `ssh`.

---

## 🔑 1. Verify Your Remote Connection (Step 1)

Run this command in your local PowerShell terminal to confirm that your private key authenticates:

```powershell
ssh -i "$HOME\.ssh\id_ed25519_veyon" -o StrictHostKeyChecking=no Administrator@148.251.171.147 "echo SSH_CONNECTION_SUCCESSFUL"
```

> **Expected Output**:
> ```text
> SSH_CONNECTION_SUCCESSFUL
> ```
> *If you named your private key file differently, adjust the path `-i "$HOME\.ssh\<your-private-key>"`. If Windows warns about private key permissions, run: `icacls "$HOME\.ssh\id_ed25519_veyon" /inheritance:r /grant "$($env:USERNAME):F"`.*

---

## 🌐 2. How to Deploy Frontend Updates (React / Vite)

Frontend updates are served as static files through IIS. Updating the frontend requires **zero downtime** and does not restart any services.

### Agent Workflow:
```powershell
# 1. Navigate to your client directory and build the production bundle
Set-Location -Path "client"
npm run build

# 2. Upload the built dist files directly to the IIS webroot on the VPS
scp -i "$HOME\.ssh\id_ed25519_veyon" -o StrictHostKeyChecking=no -r dist\* Administrator@148.251.171.147:C:/inetpub/veyon.aimicromind.com/

# 3. Verify the live site
curl.exe -I https://veyon.aimicromind.com
```

Visitors to `https://veyon.aimicromind.com` will immediately receive the new frontend assets on page reload.

---

## ⚙️ 3. How to Deploy Backend Updates (Node.js / Express / Socket.IO)

The backend runs at `C:\Projects\TeamSync\server` on `127.0.0.1:4000`, managed by a self-healing watchdog/supervisor script.

### Agent Workflow:
```powershell
# 1. Sync updated backend source files to the VPS
scp -i "$HOME\.ssh\id_ed25519_veyon" -o StrictHostKeyChecking=no -r server\src Administrator@148.251.171.147:C:/Projects/TeamSync/server/
scp -i "$HOME\.ssh\id_ed25519_veyon" -o StrictHostKeyChecking=no server\package.json Administrator@148.251.171.147:C:/Projects/TeamSync/server/

# 2. Sync Prisma schema and generate client (if database models changed)
if (Test-Path "server\prisma") {
    scp -i "$HOME\.ssh\id_ed25519_veyon" -o StrictHostKeyChecking=no -r server\prisma Administrator@148.251.171.147:C:/Projects/TeamSync/server/
    ssh -i "$HOME\.ssh\id_ed25519_veyon" -o StrictHostKeyChecking=no Administrator@148.251.171.147 "cd C:\Projects\TeamSync\server && npx prisma generate"
}

# 3. Restart the Veyon backend supervisor service
ssh -i "$HOME\.ssh\id_ed25519_veyon" -o StrictHostKeyChecking=no Administrator@148.251.171.147 "powershell -ExecutionPolicy Bypass -File C:\Projects\TeamSync\restart-all.ps1"

# 4. Verify backend health
Start-Sleep -Seconds 3
curl.exe -s "https://veyon.aimicromind.com/api/health"
```

---

## 🚀 4. Automated 1-Click Deployment Script (`deploy-remote.ps1`)

Create this script at the root of your local `TeamSync` repository (`TeamSync/deploy-remote.ps1`). Your Antigravity agent or developer can run it anytime:

```powershell
<#
.SYNOPSIS
  One-Click Remote Deployment for Veyon (TeamSync) to veyon.aimicromind.com
.EXAMPLE
  .\deploy-remote.ps1 -Target frontend
  .\deploy-remote.ps1 -Target backend
  .\deploy-remote.ps1 -Target all
  .\deploy-remote.ps1 -Target status
#>
param (
    [ValidateSet('frontend', 'backend', 'all', 'status')]
    [string]$Target = 'all',
    [string]$KeyPath = "$HOME\.ssh\id_ed25519_veyon",
    [string]$Server = "Administrator@148.251.171.147"
)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
if (-not (Test-Path "$projectRoot\client")) { $projectRoot = Get-Location }

$iisPath = "C:/inetpub/veyon.aimicromind.com"
$vpsRoot = "C:/Projects/TeamSync"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 Veyon Remote Deployment -> https://veyon.aimicromind.com" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 0. STATUS CHECK
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
        Write-Host "⚙️ Applying Prisma Client generation..." -ForegroundColor Yellow
        ssh -i $KeyPath -o StrictHostKeyChecking=no $Server "cd $vpsRoot/server && npx prisma generate"
    }

    Write-Host "`n[2/3] 🔄 Restarting Veyon backend supervisor..." -ForegroundColor Yellow
    ssh -i $KeyPath -o StrictHostKeyChecking=no $Server "powershell -ExecutionPolicy Bypass -File $vpsRoot/restart-all.ps1"

    Start-Sleep -Seconds 3
    Write-Host "`n[3/3] 🩺 Verifying API health..." -ForegroundColor Yellow
    ssh -i $KeyPath -o StrictHostKeyChecking=no $Server "powershell -ExecutionPolicy Bypass -File $vpsRoot/status.ps1"
    Write-Host "✅ Backend updated and online!" -ForegroundColor Green
}

Write-Host "`n🎉 Deployment finished! Test live at: https://veyon.aimicromind.com" -ForegroundColor Cyan
```

---

## 📋 5. VPS Environment Reference Table

| Property | Value | Notes |
| :--- | :--- | :--- |
| **Server IP** | `148.251.171.147` | Dedicated Windows Server 2022 |
| **SSH User** | `Administrator` | Authorized with your ed25519 key |
| **Public URL** | `https://veyon.aimicromind.com` | Automated SSL via Let's Encrypt |
| **IIS Frontend Directory** | `C:\inetpub\veyon.aimicromind.com` | Destination for `client/dist/*` |
| **Backend Project Directory**| `C:\Projects\TeamSync` | Root of Git repo and services on VPS |
| **Node.js API Port** | `127.0.0.1:4000` | Reverse-proxied by IIS URL Rewrite |
| **Database** | `localhost:5432/teamsync` | PostgreSQL 18 |
| **Health Check Endpoint** | `https://veyon.aimicromind.com/api/health` | Returns `{"status":"ok"}` |

---

## 🛠️ 6. Useful Remote Diagnostic Commands for the Agent

To check server health anytime:
```powershell
# Check running Node processes and services
ssh -i "$HOME\.ssh\id_ed25519_veyon" -o StrictHostKeyChecking=no Administrator@148.251.171.147 "powershell -ExecutionPolicy Bypass -File C:\Projects\TeamSync\status.ps1"

# View recent backend logs
ssh -i "$HOME\.ssh\id_ed25519_veyon" -o StrictHostKeyChecking=no Administrator@148.251.171.147 "Get-Content C:\Projects\TeamSync\logs\server.log -Tail 50"

# Restart all Veyon services
ssh -i "$HOME\.ssh\id_ed25519_veyon" -o StrictHostKeyChecking=no Administrator@148.251.171.147 "powershell -ExecutionPolicy Bypass -File C:\Projects\TeamSync\restart-all.ps1"
```
