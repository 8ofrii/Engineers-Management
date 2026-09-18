# ==============================================================================
# Hesaby ERP - Self-Healing Watchdog Daemon (Production Hardened)
# Continuously monitors Database, MinIO Storage, Backend API, and IIS Frontend health.
# Features:
#   - Consecutive failure thresholds (prevents thrashing/death loops)
#   - Recovery mode detection (never kills PostgreSQL during WAL replay)
#   - Graceful service restarts (prevents data/WAL corruption)
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

Log-Event "INFO" "WATCHDOG" "Hesaby ERP Watchdog Daemon started (Hardened Mode with MinIO). Monitoring interval: 30s."

$dbFailCount = 0
$minioFailCount = 0
$backendFailCount = 0
$FAIL_THRESHOLD = 3  # Require 3 consecutive failures (90s) before restarting

while ($true) {
    try {
        Check-LogRotation

        # ----------------------------------------------------------------------
        # 1. Check PostgreSQL Database Service & Query Responsiveness
        # ----------------------------------------------------------------------
        $pgService = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
        $dbQueryHealthy = $false
        $isInRecovery = $false

        if ($null -ne $pgService -and $pgService.Status -eq "Running") {
            try {
                $env:PGPASSWORD = "HesabyApp@2026"
                $psqlOut = & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U hesaby_app -h 127.0.0.1 -d sitengineer -c "SELECT 1;" 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    $dbQueryHealthy = $true
                    $dbFailCount = 0
                } else {
                    $outText = ($psqlOut | Out-String)
                    if ($outText -match "recovery mode") {
                        $isInRecovery = $true
                    }
                }
            }
            catch {
                $dbQueryHealthy = $false
            }
        }

        if ($isInRecovery) {
            Log-Event "INFO" "DATABASE" "PostgreSQL is actively replaying WAL / in recovery mode. Allowing it to complete startup gracefully."
            $dbFailCount = 0  # Do NOT count normal recovery against failure threshold
        }
        elseif (!$dbQueryHealthy) {
            $dbFailCount++
            Log-Event "WARN" "DATABASE" "PostgreSQL query check failed (Consecutive failures: $dbFailCount/$FAIL_THRESHOLD)."

            if ($dbFailCount -ge $FAIL_THRESHOLD) {
                Log-Event "WARN" "DATABASE" "Failure threshold reached ($dbFailCount). Attempting graceful database recovery..."
                try {
                    $currentPg = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
                    if ($null -ne $currentPg -and $currentPg.Status -eq "Running") {
                        # Graceful stop first to avoid WAL corruption
                        Stop-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
                        Start-Sleep -Seconds 5
                    }
                    Start-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 5
                    
                    $currentPg = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
                    if ($null -ne $currentPg -and $currentPg.Status -eq "Running") {
                        Log-Event "INFO" "DATABASE" "PostgreSQL service recovered gracefully."
                        $dbFailCount = 0
                    }
                }
                catch {
                    Log-Event "ERROR" "DATABASE" "Failed to restart PostgreSQL gracefully: $($_.Exception.Message)"
                }
            }
        }

        # ----------------------------------------------------------------------
        # 2. Check MinIO Object Storage (http://127.0.0.1:9000/minio/health/live)
        # ----------------------------------------------------------------------
        $minioHealthy = $false
        $minioErr = ""
        try {
            $minioRes = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:9000/minio/health/live" -Method Get -TimeoutSec 5 -ErrorAction Stop
            if ($minioRes.StatusCode -eq 200) {
                $minioHealthy = $true
                $minioFailCount = 0
            }
        }
        catch {
            $minioHealthy = $false
            $minioErr = $_.Exception.Message
        }

        if (!$minioHealthy) {
            $minioFailCount++
            Log-Event "WARN" "STORAGE-MINIO" "MinIO health check failed: $minioErr (Consecutive failures: $minioFailCount/$FAIL_THRESHOLD)."

            if ($minioFailCount -ge $FAIL_THRESHOLD) {
                Log-Event "WARN" "STORAGE-MINIO" "MinIO failure threshold reached ($minioFailCount). Initiating restart..."
                
                $minioPidFile = Join-Path $LogDir "minio.pid"
                if (Test-Path $minioPidFile) {
                    $oldPid = (Get-Content $minioPidFile -Raw).Trim()
                    Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
                }

                $minioTask = Get-ScheduledTask -TaskName "Hesaby-MinIO-Service" -ErrorAction SilentlyContinue
                if ($minioTask) {
                    try {
                        Stop-ScheduledTask -TaskName "Hesaby-MinIO-Service" -ErrorAction SilentlyContinue
                        Start-Sleep -Seconds 2
                        Start-ScheduledTask -TaskName "Hesaby-MinIO-Service" -ErrorAction Stop
                        Log-Event "INFO" "STORAGE-MINIO" "Triggered Hesaby-MinIO-Service task restart."
                        $minioFailCount = 0
                    }
                    catch {
                        Log-Event "ERROR" "STORAGE-MINIO" "Failed to restart MinIO scheduled task: $($_.Exception.Message)"
                    }
                }
            }
        }

        # ----------------------------------------------------------------------
        # 3. Check Backend API Endpoint (http://localhost:5000/api/health)
        # ----------------------------------------------------------------------
        $backendHealthy = $false
        $errorDetail = ""
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
            if ($response.success -eq $true -and ($response.database -eq "connected" -or $response.status -eq "healthy")) {
                $backendHealthy = $true
                $backendFailCount = 0
            }
        }
        catch {
            $backendHealthy = $false
            $errorDetail = $_.Exception.Message
        }

        if (!$backendHealthy) {
            $backendFailCount++
            Log-Event "WARN" "BACKEND" "Backend health check failed: $errorDetail (Consecutive failures: $backendFailCount/$FAIL_THRESHOLD)."

            if ($backendFailCount -ge $FAIL_THRESHOLD) {
                Log-Event "WARN" "BACKEND" "Backend failure threshold reached ($backendFailCount). Initiating restart..."
                
                # Stop old process if running
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
                        $backendFailCount = 0
                    }
                    catch {
                        Log-Event "ERROR" "BACKEND" "Failed to trigger scheduled task restart: $($_.Exception.Message)"
                    }
                }
            }
        }

        # ----------------------------------------------------------------------
        # 4. Check IIS Web Server (W3SVC)
        # ----------------------------------------------------------------------
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
