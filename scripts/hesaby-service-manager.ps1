# ==============================================================================
# Hesaby ERP - Master Service Manager
# Central CLI tool to manage Database, Backend API, Frontend (IIS), and Watchdog.
# Usage:
#   .\scripts\hesaby-service-manager.ps1 [status | start | stop | restart | install-autostart | uninstall-autostart | logs]
# ==============================================================================

param (
    [Parameter(Position=0)]
    [ValidateSet("status", "start", "stop", "restart", "install-autostart", "uninstall-autostart", "logs")]
    [string]$Command = "status"
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ServerDir = Join-Path $ProjectRoot "server"
$LogDir = Join-Path $ProjectRoot "logs"

$BackendRunnerScript = Join-Path $ScriptDir "backend-runner.ps1"
$WatchdogScript = Join-Path $ScriptDir "watchdog.ps1"

function Write-Banner {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "         Hesaby ERP - Master Service Management Suite          " -ForegroundColor Yellow
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Check-Port([int]$port) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn) { return $true }
    }
    catch {}
    return $false
}

function Show-Status {
    Write-Banner
    Write-Host "=== CURRENT SYSTEM STATUS ===" -ForegroundColor White

    # 1. Database
    $pgSvc = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
    $pgPort = Check-Port 5432
    $dbOk = ($null -ne $pgSvc -and $pgSvc.Status -eq "Running" -and $pgPort)
    $dbQueryOk = $false
    if ($dbOk) {
        try {
            $env:PGPASSWORD = "HesabyApp@2026"
            $psqlOut = & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U hesaby_app -h 127.0.0.1 -d sitengineer -c "SELECT 1;" 2>&1
            if ($LASTEXITCODE -eq 0) { $dbQueryOk = $true }
        } catch {}
    }
    if ($dbQueryOk) {
        Write-Host "  [+] Database (PostgreSQL 18)   : HEALTHY & RESPONSIVE (Port: 5432)" -ForegroundColor Green
    } elseif ($dbOk) {
        Write-Host "  [!] Database (PostgreSQL 18)   : RUNNING (Port: 5432, Query Pending)" -ForegroundColor Yellow
    } else {
        Write-Host "  [-] Database (PostgreSQL 18)   : STOPPED / FAILED" -ForegroundColor Red
    }

    # 2. Backend API
    $backendPort = Check-Port 5000
    $backendHealth = $false
    $latencyMs = "N/A"
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $res = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
        $sw.Stop()
        if ($res.success -eq $true -and ($res.database -eq "connected" -or $res.status -eq "healthy")) {
            $backendHealth = $true
            $latencyMs = "$([math]::Round($sw.Elapsed.TotalMilliseconds)) ms"
        }
    } catch {}

    $pidFile = Join-Path $LogDir "backend.pid"
    $pidVal = if (Test-Path $pidFile) { (Get-Content $pidFile -Raw).Trim() } else { "N/A" }

    if ($backendHealth) {
        Write-Host "  [+] Backend API (Node.js/Prisma): HEALTHY  (Port: 5000, PID: $pidVal, Ping: $latencyMs)" -ForegroundColor Green
    } elseif ($backendPort) {
        Write-Host "  [!] Backend API (Node.js/Prisma): LISTENING (Port: 5000, PID: $pidVal, Health check pending)" -ForegroundColor Yellow
    } else {
        Write-Host "  [-] Backend API (Node.js/Prisma): STOPPED" -ForegroundColor Red
    }

    # 3. Frontend & Reverse Proxy (IIS)
    $w3svc = Get-Service -Name "W3SVC" -ErrorAction SilentlyContinue
    $iisPort = (Check-Port 80 -or Check-Port 443)

    if ($null -ne $w3svc -and $w3svc.Status -eq "Running" -and $iisPort) {
        Write-Host "  [+] Frontend & Proxy (IIS)     : RUNNING  (https://hesaby.aimicromind.com)" -ForegroundColor Green
    } else {
        Write-Host "  [-] Frontend & Proxy (IIS)     : STOPPED / DEGRADED (Service: $($w3svc.Status))" -ForegroundColor Red
    }

    # 4. Auto-Start Tasks & Watchdog
    $taskBackend = Get-ScheduledTask -TaskName "Hesaby-Backend-Service" -ErrorAction SilentlyContinue
    $taskWatchdog = Get-ScheduledTask -TaskName "Hesaby-Watchdog" -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "=== AUTOMATION & WATCHDOG STATUS ===" -ForegroundColor White
    if ($taskBackend) {
        Write-Host "  [+] Hesaby-Backend-Service Task: INSTALLED (State: $($taskBackend.State))" -ForegroundColor Green
    } else {
        Write-Host "  [-] Hesaby-Backend-Service Task: NOT REGISTERED" -ForegroundColor Yellow
    }

    if ($taskWatchdog) {
        Write-Host "  [+] Hesaby-Watchdog Daemon Task: INSTALLED (State: $($taskWatchdog.State))" -ForegroundColor Green
    } else {
        Write-Host "  [-] Hesaby-Watchdog Daemon Task: NOT REGISTERED" -ForegroundColor Yellow
    }

    Write-Host ""
}

function Start-AllServices {
    Write-Banner
    Write-Host "Starting all Hesaby ERP services in dependency order..." -ForegroundColor Cyan

    # 1. Start PostgreSQL
    Write-Host "1. Starting PostgreSQL Database..." -ForegroundColor White
    $pgSvc = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
    if ($pgSvc.Status -ne "Running") {
        Start-Service -Name "postgresql-x64-18" -ErrorAction Stop
        Start-Sleep -Seconds 2
    }
    Write-Host "   PostgreSQL is Running." -ForegroundColor Green

    # 2. Start IIS
    Write-Host "2. Starting IIS World Wide Web Service..." -ForegroundColor White
    $w3svc = Get-Service -Name "W3SVC" -ErrorAction SilentlyContinue
    if ($w3svc.Status -ne "Running") {
        Start-Service -Name "W3SVC" -ErrorAction SilentlyContinue
    }
    Write-Host "   IIS Service is Running." -ForegroundColor Green

    # 3. Start Backend
    Write-Host "3. Starting Backend API Supervisor..." -ForegroundColor White
    $taskBackend = Get-ScheduledTask -TaskName "Hesaby-Backend-Service" -ErrorAction SilentlyContinue
    if ($taskBackend) {
        Start-ScheduledTask -TaskName "Hesaby-Backend-Service" -ErrorAction SilentlyContinue
    } else {
        Start-Process -FilePath "powershell.exe" `
            -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$BackendRunnerScript`"" `
            -WorkingDirectory $ServerDir `
            -NoNewWindow
    }
    Write-Host "   Backend Supervisor Triggered." -ForegroundColor Green

    # 4. Start Watchdog
    Write-Host "4. Starting Self-Healing Watchdog..." -ForegroundColor White
    $taskWatchdog = Get-ScheduledTask -TaskName "Hesaby-Watchdog" -ErrorAction SilentlyContinue
    if ($taskWatchdog) {
        Start-ScheduledTask -TaskName "Hesaby-Watchdog" -ErrorAction SilentlyContinue
    } else {
        Start-Process -FilePath "powershell.exe" `
            -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$WatchdogScript`"" `
            -WorkingDirectory $ProjectRoot `
            -NoNewWindow
    }
    Write-Host "   Watchdog Triggered." -ForegroundColor Green

    Start-Sleep -Seconds 3
    Show-Status
}

function Stop-AllServices {
    Write-Banner
    Write-Host "Stopping all Hesaby ERP background services..." -ForegroundColor Yellow

    # Stop Scheduled Tasks
    Stop-ScheduledTask -TaskName "Hesaby-Watchdog" -ErrorAction SilentlyContinue
    Stop-ScheduledTask -TaskName "Hesaby-Backend-Service" -ErrorAction SilentlyContinue

    # Kill watchdog powershell scripts
    $watchdogProcs = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*watchdog.ps1*" -or $_.CommandLine -like "*backend-runner.ps1*" }
    foreach ($p in $watchdogProcs) {
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    }

    # Kill Node.js processes
    $pidFile = Join-Path $LogDir "backend.pid"
    if (Test-Path $pidFile) {
        $pidVal = (Get-Content $pidFile -Raw).Trim()
        Stop-Process -Id $pidVal -Force -ErrorAction SilentlyContinue
    }

    Write-Host "All background services stopped." -ForegroundColor Green
    Show-Status
}

function Restart-AllServices {
    Stop-AllServices
    Start-Sleep -Seconds 2
    Start-AllServices
}

function Install-AutoStart {
    Write-Banner
    Write-Host "Configuring automatic boot startup and crash recovery..." -ForegroundColor Cyan

    # 1. PostgreSQL Service Startup & Failure Recovery
    Write-Host "1. Configuring PostgreSQL Windows Service..." -ForegroundColor White
    Set-Service -Name "postgresql-x64-18" -StartupType Automatic
    & sc.exe failure "postgresql-x64-18" reset= 86400 actions= restart/5000/restart/10000/restart/30000 | Out-Null
    & sc.exe failureflag "postgresql-x64-18" 1 | Out-Null
    Write-Host "   PostgreSQL set to Automatic with Auto-Restart Recovery & Non-Crash Failure Flag." -ForegroundColor Green

    # 2. IIS Service Startup
    Write-Host "2. Configuring IIS Windows Service..." -ForegroundColor White
    Set-Service -Name "W3SVC" -StartupType Automatic
    Set-Service -Name "IISADMIN" -StartupType Automatic -ErrorAction SilentlyContinue
    Write-Host "   IIS set to Automatic startup." -ForegroundColor Green

    # 3. Create Hesaby-Backend-Service Scheduled Task
    Write-Host "3. Registering Hesaby-Backend-Service Task..." -ForegroundColor White
    $actionBackend = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$BackendRunnerScript`"" -WorkingDirectory $ServerDir
    $triggerBoot = New-ScheduledTaskTrigger -AtStartup
    $principalSystem = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Days 365) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)

    Unregister-ScheduledTask -TaskName "Hesaby-Backend-Service" -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName "Hesaby-Backend-Service" -Action $actionBackend -Trigger $triggerBoot -Principal $principalSystem -Settings $settings | Out-Null
    Write-Host "   Hesaby-Backend-Service registered (Runs at Windows Boot)." -ForegroundColor Green

    # 4. Create Hesaby-Watchdog Scheduled Task
    Write-Host "4. Registering Hesaby-Watchdog Task..." -ForegroundColor White
    $actionWatchdog = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$WatchdogScript`"" -WorkingDirectory $ProjectRoot
    Unregister-ScheduledTask -TaskName "Hesaby-Watchdog" -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName "Hesaby-Watchdog" -Action $actionWatchdog -Trigger $triggerBoot -Principal $principalSystem -Settings $settings | Out-Null
    Write-Host "   Hesaby-Watchdog registered (Runs at Windows Boot)." -ForegroundColor Green

    # Start tasks now
    Start-ScheduledTask -TaskName "Hesaby-Backend-Service" -ErrorAction SilentlyContinue
    Start-ScheduledTask -TaskName "Hesaby-Watchdog" -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Host "Auto-start and crash recovery successfully installed!" -ForegroundColor Green
    Start-Sleep -Seconds 3
    Show-Status
}

function Uninstall-AutoStart {
    Write-Banner
    Write-Host "Uninstalling Hesaby auto-start tasks..." -ForegroundColor Yellow
    Stop-AllServices
    Unregister-ScheduledTask -TaskName "Hesaby-Backend-Service" -Confirm:$false -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName "Hesaby-Watchdog" -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Scheduled tasks removed." -ForegroundColor Green
}

function View-Logs {
    Write-Banner
    Write-Host "=== RECENT WATCHDOG LOGS ===" -ForegroundColor White
    $watchdogLog = Join-Path $LogDir "watchdog.log"
    if (Test-Path $watchdogLog) {
        Get-Content $watchdogLog -Tail 15
    } else {
        Write-Host "No watchdog logs found yet." -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "=== RECENT BACKEND SUPERVISOR LOGS ===" -ForegroundColor White
    $supLog = Join-Path $LogDir "backend-supervisor.log"
    if (Test-Path $supLog) {
        Get-Content $supLog -Tail 15
    } else {
        Write-Host "No backend supervisor logs found yet." -ForegroundColor Gray
    }
}

# Route command
switch ($Command) {
    "status"             { Show-Status }
    "start"              { Start-AllServices }
    "stop"               { Stop-AllServices }
    "restart"            { Restart-AllServices }
    "install-autostart"  { Install-AutoStart }
    "uninstall-autostart"{ Uninstall-AutoStart }
    "logs"               { View-Logs }
}
