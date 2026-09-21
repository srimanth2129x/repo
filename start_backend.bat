@echo off
title SentinelTwin - Backend Service
:: Robust Project Root Resolution
set "PROJECT_ROOT="
if exist "%~dp0backend\app.py" (
    for %%I in ("%~dp0.") do set "PROJECT_ROOT=%%~fI"
) else if exist "%~dp0..\backend\app.py" (
    for %%I in ("%~dp0..") do set "PROJECT_ROOT=%%~fI"
) else if exist "%~dp0..\sentineltwin\backend\app.py" (
    for %%I in ("%~dp0..\sentineltwin") do set "PROJECT_ROOT=%%~fI"
) else if exist "%~dp0sentineltwin\backend\app.py" (
    for %%I in ("%~dp0sentineltwin") do set "PROJECT_ROOT=%%~fI"
)
if defined PROJECT_ROOT cd /d "%PROJECT_ROOT%"

echo ======================================================================
echo   [+] SentinelTwin SOC - Starting Backend API Service (Port 5000)
echo ======================================================================

set PYTHONPATH=.
set FLASK_ENV=development

set PYTHON_CMD=

if exist "venv\Scripts\python.exe" (
    venv\Scripts\python.exe -c "import flask, jwt" >nul 2>&1
    if not errorlevel 1 set PYTHON_CMD="venv\Scripts\python.exe"
)
if not defined PYTHON_CMD if exist "..\venv\Scripts\python.exe" (
    ..\venv\Scripts\python.exe -c "import flask, jwt" >nul 2>&1
    if not errorlevel 1 set PYTHON_CMD="..\venv\Scripts\python.exe"
)
if not defined PYTHON_CMD (
    where python >nul 2>&1
    if not errorlevel 1 set PYTHON_CMD=python
)
if not defined PYTHON_CMD (
    where py >nul 2>&1
    if not errorlevel 1 set PYTHON_CMD=py
)
if not defined PYTHON_CMD (
    echo [-] ERROR: Python with Flask was not found in PATH or venv.
    pause
    exit /b 1
)

if not exist "data" mkdir data

echo [*] Using Python: %PYTHON_CMD%
echo [+] Starting server on http://127.0.0.1:5000...
%PYTHON_CMD% -m backend.app
pause
