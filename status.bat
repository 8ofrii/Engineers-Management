@echo off
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -File ".\scripts\hesaby-service-manager.ps1" status
