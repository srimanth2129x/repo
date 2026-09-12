@echo off
title SentinelTwin - Backend Service
if exist "%~dp0backend\app.py" (cd /d "%~dp0") else if exist "%~dp0..\backend\app.py" (cd /d "%~dp0..") else if exist "%~dp0..\sentineltwin\backend\app.py" (cd /d "%~dp0..\sentineltwin") else if exist "%~dp0sentineltwin\backend\app.py" (cd /d "%~dp0sentineltwin")

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
    set PYTHON_CMD="C:\Users\srima\AppData\Local\Python\pythoncore-3.14-64\python.exe"
)

if not exist "data" mkdir data

echo [*] Using Python: %PYTHON_CMD%
echo [+] Starting server on http://127.0.0.1:5000...
%PYTHON_CMD% -m backend.app
pause
