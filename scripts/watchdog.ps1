# ==============================================================================
# Hesaby ERP - Self-Healing Watchdog Daemon
# Continuously verifies Database, Backend API, and IIS Frontend health.
# Automatically detects failures and restarts affected services.
# ==============================================================================

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$LogDir = Join-Path $ProjectRoot "logs"

if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$WatchdogLog = Join-Path $LogDir "watchdog.log"

function Log-Event([string]$level, [string]$component, [string]$msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$level] [$component] $msg"
    Write-Output $line
    Add-Content -Path $WatchdogLog -Value $line -ErrorAction SilentlyContinue
}

# Rotate log file if larger than 15MB
function Check-LogRotation {
    if (Test-Path $WatchdogLog) {
        $fileInfo = Get-Item $WatchdogLog
        if ($fileInfo.Length -gt 15MB) {
            $oldPath = "$WatchdogLog.old"
            if (Test-Path $oldPath) { Remove-Item $oldPath -Force -ErrorAction SilentlyContinue }
            Move-Item -Path $WatchdogLog -Destination $oldPath -Force -ErrorAction SilentlyContinue
        }
    }
}

Log-Event "INFO" "WATCHDOG" "Hesaby ERP Watchdog Daemon started. Monitoring interval: 30s."

while ($true) {
    try {
        Check-LogRotation

    # --------------------------------------------------------------------------
    # 1. Check PostgreSQL Database Service & Query Responsiveness
    # --------------------------------------------------------------------------
    $pgService = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
    $dbQueryHealthy = $false
    if ($null -ne $pgService -and $pgService.Status -eq "Running") {
        try {
            $env:PGPASSWORD = "HesabyApp@2026"
            $psqlOut = & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U hesaby_app -h 127.0.0.1 -d sitengineer -c "SELECT 1; ALTER ROLE postgres WITH LOGIN;" 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dbQueryHealthy = $true
            }
        }
        catch {}
    }

    if (!$dbQueryHealthy) {
        Log-Event "WARN" "DATABASE" "PostgreSQL service or live query check failed. Attempting service recovery..."
        try {
            $currentPg = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
            if ($null -ne $currentPg -and $currentPg.Status -eq "Running") {
                Restart-Service -Name "postgresql-x64-18" -Force -ErrorAction SilentlyContinue
            } else {
                Start-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
            }
            Start-Sleep -Seconds 3
            $currentPg = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
            if ($null -ne $currentPg -and $currentPg.Status -eq "Running") {
                Log-Event "INFO" "DATABASE" "PostgreSQL service recovered and running successfully."
            } else {
                & net.exe start "postgresql-x64-18" 2>&1 | Out-Null
                Log-Event "INFO" "DATABASE" "PostgreSQL fallback net start command executed."
            }
        }
        catch {
            Log-Event "ERROR" "DATABASE" "Failed to restart/start PostgreSQL: $($_.Exception.Message)"
        }
    }

    # --------------------------------------------------------------------------
    # 2. Check Backend API Endpoint (http://localhost:5000/api/health)
    # --------------------------------------------------------------------------
    $backendHealthy = $false
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
        if ($response.success -eq $true -and ($response.database -eq "connected" -or $response.status -eq "healthy")) {
            $backendHealthy = $true
        }
    }
    catch {
        $backendHealthy = $false
        $errorDetail = $_.Exception.Message
    }

    if (!$backendHealthy) {
        Log-Event "WARN" "BACKEND" "Backend health check failed ($errorDetail). Initiating backend recovery..."
        
        # Read PID file and stop process if needed
        $pidFile = Join-Path $LogDir "backend.pid"
        if (Test-Path $pidFile) {
            $oldPid = (Get-Content $pidFile -Raw).Trim()
            Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
        }

        # Restart scheduled task
        $backendTask = Get-ScheduledTask -TaskName "Hesaby-Backend-Service" -ErrorAction SilentlyContinue
        if ($backendTask) {
            try {
                Stop-ScheduledTask -TaskName "Hesaby-Backend-Service" -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
                Start-ScheduledTask -TaskName "Hesaby-Backend-Service" -ErrorAction Stop
                Log-Event "INFO" "BACKEND" "Triggered Hesaby-Backend-Service task restart."
            }
            catch {
                Log-Event "ERROR" "BACKEND" "Failed to trigger scheduled task restart: $($_.Exception.Message)"
            }
        }
    }

    # --------------------------------------------------------------------------
    # 3. Check IIS Web Server (W3SVC & IISADMIN)
    # --------------------------------------------------------------------------
    $w3svc = Get-Service -Name "W3SVC" -ErrorAction SilentlyContinue
    if ($null -ne $w3svc -and $w3svc.Status -ne "Running") {
        Log-Event "WARN" "FRONTEND-IIS" "W3SVC service is not running (Status: $($w3svc.Status)). Restarting IIS..."
        try {
            Start-Service -Name "W3SVC" -ErrorAction Stop
            Log-Event "INFO" "FRONTEND-IIS" "W3SVC restarted successfully."
        }
        catch {
            Log-Event "ERROR" "FRONTEND-IIS" "Failed to start W3SVC: $($_.Exception.Message)"
        }
    }
    }
    catch {
        Log-Event "ERROR" "WATCHDOG" "Unhandled loop exception: $($_.Exception.Message)"
    }

    Start-Sleep -Seconds 30
}
