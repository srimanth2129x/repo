@echo off
setlocal enabledelayedexpansion
title SentinelTwin - Endpoint Telemetry Sensor
if exist "%~dp0sensor\windows_sensor.py" (cd /d "%~dp0") else if exist "%~dp0..\sensor\windows_sensor.py" (cd /d "%~dp0..") else if exist "%~dp0..\sentineltwin\sensor\windows_sensor.py" (cd /d "%~dp0..\sentineltwin") else if exist "%~dp0sentineltwin\sensor\windows_sensor.py" (cd /d "%~dp0sentineltwin")

echo ======================================================================
echo   [+] SentinelTwin - Starting Windows Telemetry Sensor
echo ======================================================================

:: 1. Prefer compiled standalone executable if available
if exist "%~dp0..\release\SentinelTwin-Sensor\SentinelTwin-Sensor.exe" (
    echo [*] Running standalone executable: release\SentinelTwin-Sensor\SentinelTwin-Sensor.exe
    "%~dp0..\release\SentinelTwin-Sensor\SentinelTwin-Sensor.exe" %*
    pause
    exit /b !errorlevel!
)
if exist "%~dp0..\release\SentinelTwin-Sensor.exe" (
    echo [*] Running standalone executable: release\SentinelTwin-Sensor.exe
    "%~dp0..\release\SentinelTwin-Sensor.exe" %*
    pause
    exit /b !errorlevel!
)
if exist "release\SentinelTwin-Sensor\SentinelTwin-Sensor.exe" (
    echo [*] Running standalone executable: release\SentinelTwin-Sensor\SentinelTwin-Sensor.exe
    "release\SentinelTwin-Sensor\SentinelTwin-Sensor.exe" %*
    pause
    exit /b !errorlevel!
)
if exist "release\SentinelTwin-Sensor.exe" (
    echo [*] Running standalone executable: release\SentinelTwin-Sensor.exe
    "release\SentinelTwin-Sensor.exe" %*
    pause
    exit /b !errorlevel!
)

:: 2. Fallback: Run from Python source (Development environment)
set PYTHONPATH=.
set PYTHON_CMD=

if exist "venv\Scripts\python.exe" (
    set PYTHON_CMD="venv\Scripts\python.exe"
) else if exist "..\venv\Scripts\python.exe" (
    set PYTHON_CMD="..\venv\Scripts\python.exe"
) else (
    where python >nul 2>&1
    if not errorlevel 1 set PYTHON_CMD=python
)
if not defined PYTHON_CMD (
    where py >nul 2>&1
    if not errorlevel 1 set PYTHON_CMD=py
)

if not defined PYTHON_CMD (
    echo [-] ERROR: Python is not found in PATH or venv, and standalone SentinelTwin-Sensor.exe was not found.
    echo [-] To build the standalone executable: run scripts\build_sensor_exe.bat
    echo [-] Target laptops only require SentinelTwin-Sensor.exe and do NOT require Python.
    pause
    exit /b 1
)

echo [*] Using Python: %PYTHON_CMD%
%PYTHON_CMD% sensor\windows_sensor.py %*
pause
