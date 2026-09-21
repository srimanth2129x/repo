@echo off
setlocal enabledelayedexpansion
title SentinelTwin - Build Standalone Sensor Executable
:: Robust Project Root Resolution (Handles drive switching and Run As Administrator)
set "PROJECT_ROOT="
if exist "%~dp0sensor\windows_sensor.py" (
    for %%I in ("%~dp0.") do set "PROJECT_ROOT=%%~fI"
) else if exist "%~dp0..\sensor\windows_sensor.py" (
    for %%I in ("%~dp0..") do set "PROJECT_ROOT=%%~fI"
) else if exist "%~dp0..\sentineltwin\sensor\windows_sensor.py" (
    for %%I in ("%~dp0..\sentineltwin") do set "PROJECT_ROOT=%%~fI"
) else if exist "%~dp0sentineltwin\sensor\windows_sensor.py" (
    for %%I in ("%~dp0sentineltwin") do set "PROJECT_ROOT=%%~fI"
)

if defined PROJECT_ROOT (
    cd /d "!PROJECT_ROOT!"
)

:: Validate that we are inside the project root and NOT C:\Windows\System32
if not exist "sensor\windows_sensor.py" (
    echo.
    echo ======================================================================
    echo   [-] ERROR: Could not locate SentinelTwin project root directory.
    echo   [-] Current Directory: %CD%
    echo   [-] Expected 'sensor\windows_sensor.py' to exist.
    echo.
    echo   HINT:
    echo   1. Do NOT move or copy build_sensor_exe.bat outside the repository.
    echo   2. Run this script by double-clicking it inside the project folder
    echo      or open a command prompt inside the project folder:
    echo        cd /d D:\sentineltwin\sentineltwin
    echo        scripts\build_sensor_exe.bat
    echo ======================================================================
    echo.
    pause
    exit /b 1
)

echo ======================================================================
echo   [+] SentinelTwin - Building Standalone Windows Sensor Package
echo ======================================================================

:: 1. Detect Python Environment (Zero hardcoded development PC paths)
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
    echo [-] ERROR: Python with PyInstaller was not found in PATH or venv.
    echo [-] Please install Python and PyInstaller to build the executable.
    pause
    exit /b 1
)

echo [*] Using Python: %PYTHON_CMD%

:: 2. Determine Build-Time Server URL
:: Priority: (1) CLI argument %1, (2) Environment variable SENTINEL_SERVER_URL, (3) Central PC LAN IP:5000, (4) Default http://127.0.0.1:5000
set BUILD_SERVER_URL=%~1
if not defined BUILD_SERVER_URL (
    if defined SENTINEL_SERVER_URL (
        set BUILD_SERVER_URL=%SENTINEL_SERVER_URL%
    )
)
if not defined BUILD_SERVER_URL (
    %PYTHON_CMD% -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); open('build_ip.tmp', 'w').write(s.getsockname()[0]); s.close()" 2>nul
    if exist "build_ip.tmp" (
        set /p DETECTED_LAN_IP=<build_ip.tmp
        del build_ip.tmp >nul 2>&1
        if defined DETECTED_LAN_IP (
            if not "!DETECTED_LAN_IP!"=="127.0.0.1" (
                set BUILD_SERVER_URL=http://!DETECTED_LAN_IP!:5000
            )
        )
    )
)
if not defined BUILD_SERVER_URL set BUILD_SERVER_URL=http://127.0.0.1:5000

echo [*] Target Backend Server URL : %BUILD_SERVER_URL%

:: 3. Auto-generate build_config.py
echo [*] Embedding server URL into sensor\build_config.py...
(
    echo """Auto-generated build-time configuration for SentinelTwin sensor."""
    echo EMBEDDED_SERVER_URL = "%BUILD_SERVER_URL%"
) > sensor\build_config.py

if not exist "release" mkdir release

echo [*] Cleaning previous build artifacts...
if exist "build" rmdir /s /q "build"
if exist "release\SentinelTwin-Sensor\data" rmdir /s /q "release\SentinelTwin-Sensor\data"

echo [*] Compiling standalone executable via PyInstaller...
%PYTHON_CMD% -m PyInstaller ^
    --name SentinelTwin-Sensor ^
    --onefile ^
    --console ^
    --clean ^
    --hidden-import win32evtlog ^
    --hidden-import win32api ^
    --hidden-import win32con ^
    --hidden-import win32event ^
    --hidden-import pywintypes ^
    --hidden-import requests ^
    --hidden-import urllib3 ^
    --hidden-import sensor.build_config ^
    --hidden-import build_config ^
    --collect-submodules requests ^
    --collect-submodules urllib3 ^
    --distpath release ^
    --workpath build ^
    --specpath build ^
    sensor\windows_sensor.py

if errorlevel 1 (
    echo [-] Build failed! Check PyInstaller output above.
    pause
    exit /b 1
)

:: 4. Assemble Clean Portable Deployment Folder (release\SentinelTwin-Sensor)
echo [*] Assembling clean portable deployment folder...
set DEPLOY_DIR=release\SentinelTwin-Sensor
if not exist "%DEPLOY_DIR%" mkdir "%DEPLOY_DIR%"

copy /y "release\SentinelTwin-Sensor.exe" "%DEPLOY_DIR%\SentinelTwin-Sensor.exe" >nul

%PYTHON_CMD% -c "import os, json; deploy = r'%DEPLOY_DIR%'; url = r'%BUILD_SERVER_URL%'; sb = '@echo off\r\nsetlocal enabledelayedexpansion\r\ntitle SentinelTwin - Endpoint Telemetry Sensor\r\ncd /d \"%%~dp0\"\r\n\r\necho ======================================================================\r\necho   [+] SentinelTwin - Endpoint Telemetry Sensor Launcher\r\necho ======================================================================\r\necho.\r\n\r\nif not exist \"%%~dp0SentinelTwin-Sensor.exe\" (\r\n    echo [-] ERROR: SentinelTwin-Sensor.exe was not found in:\r\n    echo     \"%%~dp0\"\r\n    echo.\r\n    echo Please keep start.bat in the same folder as SentinelTwin-Sensor.exe.\r\n    pause\r\n    exit /b 1\r\n)\r\n\r\necho [*] Starting SentinelTwin-Sensor.exe...\r\necho.\r\n\"%%~dp0SentinelTwin-Sensor.exe\" %%*\r\nif errorlevel 1 (\r\n    echo.\r\n    echo [-] Sensor exited with an error code. Check console or data\\sensor.log for details.\r\n    pause\r\n)\r\n'; open(os.path.join(deploy, 'start.bat'), 'w', encoding='utf-8').write(sb); cfg = {'server': url, 'interval': 5}; open(os.path.join(deploy, 'sentinel_sensor.json'), 'w', encoding='utf-8').write(json.dumps(cfg, indent=2)); rm = f'======================================================================\r\n  SentinelTwin - Standalone Windows Endpoint Sensor\r\n======================================================================\r\n\r\nZero-Configuration Deployment:\r\n1. Copy this entire folder to any authorized Windows laptop.\r\n2. Double-click \"start.bat\" or \"SentinelTwin-Sensor.exe\".\r\n3. The sensor automatically connects to: {url}\r\n4. Approve the new endpoint in the SentinelTwin Dashboard (Devices tab).\r\n\r\nRequirements:\r\n- NO Python installation required.\r\n- NO pip or virtual environment required.\r\n- Run as Administrator to monitor Windows Security Event Log (Logon/Process events).\r\n\r\nOptional Customization:\r\n- To change the server URL, edit \"sentinel_sensor.json\" or run:\r\n    SentinelTwin-Sensor.exe --server http://<server-ip>:5000\r\n\r\nLogs and persistent runtime state are stored in the local \"data\\\" subfolder.\r\n'; open(os.path.join(deploy, 'README.txt'), 'w', encoding='utf-8').write(rm)"

:: Clean any accidental device credentials from deployment folder
if exist "%DEPLOY_DIR%\data" rmdir /s /q "%DEPLOY_DIR%\data"

echo.
echo ======================================================================
echo   [+] Standalone Sensor Deployment Package Ready!
echo   [+] Embedded Server URL : %BUILD_SERVER_URL%
echo   [+] Deployment Folder   : %DEPLOY_DIR%\
echo   [+] Files in Package    :
echo         - SentinelTwin-Sensor.exe (Standalone executable)
echo         - start.bat               (Location-independent launcher)
echo         - sentinel_sensor.json    (Pre-configured server settings)
echo         - README.txt              (Operations guide)
echo ======================================================================
