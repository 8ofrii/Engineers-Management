@echo off
echo ========================================================
echo   Hesaby ERP Client Build and IIS Deployment
echo ========================================================

cd /d C:\Users\Administrator\Engineers-Management\client
echo Building Vite production bundle...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Vite build failed!
    exit /b %errorlevel%
)

echo Deploying to IIS root C:\inetpub\hesaby.aimicromind.com...
xcopy /E /Y /I dist\* C:\inetpub\hesaby.aimicromind.com\
if %errorlevel% neq 0 (
    echo [ERROR] Copy to IIS failed!
    exit /b %errorlevel%
)

echo [SUCCESS] Client build and deployment completed successfully.
