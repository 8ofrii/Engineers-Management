@echo off
setlocal
cd /d "%~dp0"
if "%~1"=="" (
    powershell.exe -ExecutionPolicy Bypass -File ".\scripts\hesaby-service-manager.ps1" status
) else (
    powershell.exe -ExecutionPolicy Bypass -File ".\scripts\hesaby-service-manager.ps1" %*
)
