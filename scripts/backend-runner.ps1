# ==============================================================================
# Hesaby ERP - Backend Supervisor Runner
# Automatically keeps the Node.js API server running 24/7 with crash recovery.
# ==============================================================================

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ServerDir = Join-Path $ProjectRoot "server"
$LogDir = Join-Path $ProjectRoot "logs"

if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$SupervisorLog = Join-Path $LogDir "backend-supervisor.log"
$PidFile = Join-Path $LogDir "backend.pid"

function Log-Message([string]$msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $msg"
    Write-Output $line
    Add-Content -Path $SupervisorLog -Value $line -ErrorAction SilentlyContinue
}

# Rotate log files if larger than 25MB
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

Log-Message "=== Starting Hesaby Backend Supervisor ==="
Log-Message "Server directory: $ServerDir"

Set-Location -Path $ServerDir

$nodeExe = (Get-Command "node.exe" -ErrorAction SilentlyContinue).Source
if (!$nodeExe) {
    $nodeExe = "C:\Program Files\nodejs\node.exe"
}

while ($true) {
    Rotate-Log $SupervisorLog

    Log-Message "Launching Node.js backend (server.js)..."
    
    try {
        # Check if a node server is already listening on 5000
        $existingPort = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($existingPort) {
            $existingPid = $existingPort.OwningProcess
            if ($existingPid -gt 0) {
                Set-Content -Path $PidFile -Value $existingPid -Force
                Log-Message "Node.js backend already running on PID: $existingPid. Monitoring process..."
                $proc = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
                if ($proc) {
                    $proc.WaitForExit()
                    Log-Message "Monitored backend process ($existingPid) exited. Restarting in 3 seconds..."
                    Start-Sleep -Seconds 3
                    continue
                }
            }
        }

        $process = Start-Process -FilePath $nodeExe `
            -ArgumentList "server.js" `
            -WorkingDirectory $ServerDir `
            -PassThru `
            -NoNewWindow

        Set-Content -Path $PidFile -Value $process.Id -Force
        Log-Message "Backend started with PID: $($process.Id)"
        
        $process.WaitForExit()
        $exitCode = $process.ExitCode
        Log-Message "Backend process ($($process.Id)) exited with code: $exitCode. Restarting in 3 seconds..."
    }
    catch {
        Log-Message "[ERROR] Failed to start/monitor backend process: $($_.Exception.Message)"
    }

    Start-Sleep -Seconds 3
}
