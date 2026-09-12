@echo off
title SentinelTwin - Frontend Console
if exist "%~dp0frontend\package.json" (cd /d "%~dp0frontend") else if exist "%~dp0..\frontend\package.json" (cd /d "%~dp0..") else if exist "%~dp0..\sentineltwin\frontend\package.json" (cd /d "%~dp0..\sentineltwin\frontend") else if exist "%~dp0sentineltwin\frontend\package.json" (cd /d "%~dp0sentineltwin\frontend")

echo ======================================================================
echo   [+] SentinelTwin SOC - Starting Frontend Console (Port 5173)
echo ======================================================================

if not exist "node_modules" (
    echo [*] node_modules not found. Running npm install...
    call npm install
)

echo [+] Starting Vite dev server on http://localhost:5173...
call npm run dev
pause
