# ==============================================================================
# Hesaby ERP - MinIO Object Storage Supervisor Runner
# Keeps MinIO S3 Server running 24/7 on port 9000 with auto-restart on exit.
# ==============================================================================

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$LogDir = Join-Path $ProjectRoot "logs"

if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$SupervisorLog = Join-Path $LogDir "minio.log"
$PidFile = Join-Path $LogDir "minio.pid"
$DataDir = "C:\minio-data"

if (!(Test-Path $DataDir)) {
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

function Log-Message([string]$msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $msg"
    Write-Output $line
    Add-Content -Path $SupervisorLog -Value $line -ErrorAction SilentlyContinue
}

function Rotate-Log([string]$path) {
    if (Test-Path $path) {
        $fileInfo = Get-Item $path
        if ($fileInfo.Length -gt 25MB) {
            $oldPath = "$path.old"
            if (Test-Path $oldPath) { Remove-Item $oldPath -Force -ErrorAction SilentlyContinue }
            Move-Item -Path $path -Destination $oldPath -Force -ErrorAction SilentlyContinue
        }
    }
}

Log-Message "=== Starting Hesaby MinIO Supervisor ==="

$minioExe = "C:\Program Files\MinIO\bin\minio.exe"
if (!(Test-Path $minioExe)) {
    $minioExe = "C:\Users\Administrator\go\bin\minio.exe"
}
if (!(Test-Path $minioExe)) {
    $minioExe = (Get-Command "minio.exe" -ErrorAction SilentlyContinue).Source
}

if (!$minioExe -or !(Test-Path $minioExe)) {
    Log-Message "[FATAL] minio.exe not found at $minioExe! Exiting runner."
    exit 1
}

Log-Message "Using MinIO executable: $minioExe"
Log-Message "Storage directory: $DataDir"

# MinIO Root Credentials
$env:MINIO_ROOT_USER = "hesaby_admin"
$env:MINIO_ROOT_PASSWORD = "HesabyMinio@2026!"

while ($true) {
    Rotate-Log $SupervisorLog

    Log-Message "Launching MinIO server (127.0.0.1:9000)..."

    try {
        # Check if MinIO is already listening on 9000
        $existingPort = Get-NetTCPConnection -LocalPort 9000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($existingPort) {
            $existingPid = $existingPort.OwningProcess
            if ($existingPid -gt 0) {
                Set-Content -Path $PidFile -Value $existingPid -Force
                Log-Message "MinIO already running on PID: $existingPid. Monitoring process..."
                $proc = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
                if ($proc) {
                    $proc.WaitForExit()
                    Log-Message "Monitored MinIO process ($existingPid) exited. Restarting in 3 seconds..."
                    Start-Sleep -Seconds 3
                    continue
                }
            }
        }

        $process = Start-Process -FilePath $minioExe `
            -ArgumentList "server $DataDir --address `"127.0.0.1:9000`" --console-address `"127.0.0.1:9001`"" `
            -PassThru `
            -NoNewWindow

        Set-Content -Path $PidFile -Value $process.Id -Force
        Log-Message "MinIO started with PID: $($process.Id)"

        $process.WaitForExit()
        $exitCode = $process.ExitCode
        Log-Message "MinIO process ($($process.Id)) exited with code: $exitCode. Restarting in 3 seconds..."
    }
    catch {
        Log-Message "[ERROR] Failed to start/monitor MinIO process: $($_.Exception.Message)"
    }

    Start-Sleep -Seconds 3
}
