@echo off
title SentinelTwin - All Services + Sensor Launcher
echo ======================================================================
echo   [+] SENTINELTWIN - FULL SUITE LAUNCHER (BACKEND + FRONTEND + SENSOR)
echo ======================================================================
echo   1. Starting Flask Backend API in separate window...
start "SentinelTwin - Backend" cmd /k "%~dp0start_backend.bat"

timeout /t 2 /nobreak >nul

echo   2. Starting Frontend Console in separate window...
start "SentinelTwin - Frontend" cmd /k "%~dp0start_frontend.bat"

timeout /t 1 /nobreak >nul

echo   3. Starting Windows Telemetry Sensor in separate window...
start "SentinelTwin - Sensor" cmd /k "%~dp0start_sensor.bat"

echo ======================================================================
echo   [+] All SentinelTwin services + Telemetry Sensor have been started!
echo   - SOC Web Console:  http://localhost:5173
echo   - Backend REST API: http://127.0.0.1:5000/api
echo   - Telemetry Sensor: Live Windows & Sysmon ingestion active
echo ======================================================================
