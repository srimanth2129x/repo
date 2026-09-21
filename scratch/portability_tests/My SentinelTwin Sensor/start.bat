@echo off
setlocal enabledelayedexpansion
title SentinelTwin - Endpoint Telemetry Sensor
cd /d "%~dp0"

echo ======================================================================
echo   [+] SentinelTwin - Endpoint Telemetry Sensor Launcher
echo ======================================================================
echo.

if not exist "%~dp0SentinelTwin-Sensor.exe" (
    echo [-] ERROR: SentinelTwin-Sensor.exe was not found in:
    echo     "%~dp0"
    echo.
    echo Please keep start.bat in the same folder as SentinelTwin-Sensor.exe.
    pause
    exit /b 1
)

echo [*] Starting SentinelTwin-Sensor.exe...
echo.
"%~dp0SentinelTwin-Sensor.exe" %*
if errorlevel 1 (
    echo.
    echo [-] Sensor exited with an error code. Check console or data\sensor.log for details.
    pause
)
