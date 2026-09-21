@echo off
title SentinelTwin - Frontend Console
:: Robust Frontend Directory Resolution
set "FRONTEND_DIR="
if exist "%~dp0frontend\package.json" (
    for %%I in ("%~dp0frontend") do set "FRONTEND_DIR=%%~fI"
) else if exist "%~dp0..\frontend\package.json" (
    for %%I in ("%~dp0..\frontend") do set "FRONTEND_DIR=%%~fI"
) else if exist "%~dp0..\sentineltwin\frontend\package.json" (
    for %%I in ("%~dp0..\sentineltwin\frontend") do set "FRONTEND_DIR=%%~fI"
) else if exist "%~dp0sentineltwin\frontend\package.json" (
    for %%I in ("%~dp0sentineltwin\frontend") do set "FRONTEND_DIR=%%~fI"
) else if exist "package.json" (
    for %%I in (".") do set "FRONTEND_DIR=%%~fI"
)
if defined FRONTEND_DIR cd /d "%FRONTEND_DIR%"

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
