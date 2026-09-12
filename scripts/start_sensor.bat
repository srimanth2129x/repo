@echo off
title SentinelTwin - Endpoint Telemetry Sensor
if exist "%~dp0sensor\windows_sensor.py" (cd /d "%~dp0") else if exist "%~dp0..\sensor\windows_sensor.py" (cd /d "%~dp0..") else if exist "%~dp0..\sentineltwin\sensor\windows_sensor.py" (cd /d "%~dp0..\sentineltwin") else if exist "%~dp0sentineltwin\sensor\windows_sensor.py" (cd /d "%~dp0sentineltwin")

echo ======================================================================
echo   [+] SentinelTwin - Starting Windows Telemetry Sensor
echo ======================================================================

set PYTHONPATH=.

set PYTHON_CMD=

if exist "venv\Scripts\python.exe" (
    venv\Scripts\python.exe -c "import requests" >nul 2>&1
    if not errorlevel 1 set PYTHON_CMD="venv\Scripts\python.exe"
)
if not defined PYTHON_CMD if exist "..\venv\Scripts\python.exe" (
    ..\venv\Scripts\python.exe -c "import requests" >nul 2>&1
    if not errorlevel 1 set PYTHON_CMD="..\venv\Scripts\python.exe"
)
if not defined PYTHON_CMD (
    set PYTHON_CMD="C:\Users\srima\AppData\Local\Python\pythoncore-3.14-64\python.exe"
)

echo [*] Using Python: %PYTHON_CMD%
echo [*] Connecting to Backend at http://localhost:5000...
%PYTHON_CMD% sensor\windows_sensor.py
pause
