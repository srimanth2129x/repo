@echo off
title SentinelTwin - All Services Launcher
echo ======================================================================
echo   [+] SENTINELTWIN - ALL-IN-ONE SYSTEM LAUNCHER
echo ======================================================================
echo   1. Starting Flask Backend API in separate window...
start "SentinelTwin - Backend" cmd /k "%~dp0start_backend.bat"

timeout /t 2 /nobreak >nul

echo   2. Starting Frontend Console in separate window...
start "SentinelTwin - Frontend" cmd /k "%~dp0start_frontend.bat"

echo ======================================================================
echo   [+] All SentinelTwin services have been started!
echo   - SOC Web Console:  http://localhost:5173
echo   - Backend REST API: http://127.0.0.1:5000/api
echo ======================================================================
