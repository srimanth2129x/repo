@echo off
setlocal enabledelayedexpansion

echo ======================================================================
echo       SENTINELTWIN INDIVIDUAL USER DESKTOP APP BUILDER
echo ======================================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "APP_DIR=%ROOT_DIR%\individual-user-app"
set "RELEASE_DIR=%ROOT_DIR%\release"

echo [*] Target App Directory: %APP_DIR%
echo [*] Target Release Dir  : %RELEASE_DIR%
echo.

if not exist "%APP_DIR%" (
    echo [!] ERROR: App directory does not exist: %APP_DIR%
    exit /b 1
)

cd /d "%APP_DIR%"

if not exist "%APP_DIR%\node_modules" (
    echo [*] Installing dependencies in individual-user-app...
    call npm install
    if errorlevel 1 (
        echo [!] ERROR: npm install failed.
        exit /b 1
    )
)

echo [*] Step 1/3: Building React desktop UI with Vite...
call npm run build
if errorlevel 1 (
    echo [!] ERROR: Vite build failed.
    exit /b 1
)
echo [+] React UI build complete.
echo.

echo [*] Step 2/3: Packaging standalone Windows Electron desktop application...
call npm run package
if errorlevel 1 (
    echo [!] ERROR: Electron Builder packaging failed.
    exit /b 1
)
echo [+] Electron packaging complete.
echo.

echo [*] Step 3/3: Synchronizing output to release directory...
if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"

if exist "%APP_DIR%\dist_package\SentinelTwin-User.exe" (
    copy /Y "%APP_DIR%\dist_package\SentinelTwin-User.exe" "%RELEASE_DIR%\SentinelTwin-User.exe" >nul
    echo [+] Copied SentinelTwin-User.exe to %RELEASE_DIR%\SentinelTwin-User.exe
) else (
    echo [!] WARNING: SentinelTwin-User.exe was not found in %APP_DIR%\dist_package
)

if exist "%APP_DIR%\dist_package\win-unpacked" (
    if not exist "%RELEASE_DIR%\SentinelTwin-User" mkdir "%RELEASE_DIR%\SentinelTwin-User"
    xcopy /E /I /Y /Q "%APP_DIR%\dist_package\win-unpacked\*" "%RELEASE_DIR%\SentinelTwin-User\" >nul
    echo [+] Synchronized unpacked distribution to %RELEASE_DIR%\SentinelTwin-User\
)

if not exist "%RELEASE_DIR%\sentinel_user_config.json" (
    (
        echo {
        echo   "serverUrl": "http://127.0.0.1:5000",
        echo   "socWebUrl": "http://localhost:5173",
        echo   "refreshInterval": 5000,
        echo   "theme": "dark",
        echo   "autoConnect": true
        echo }
    ) > "%RELEASE_DIR%\sentinel_user_config.json"
    echo [+] Created default configuration in %RELEASE_DIR%\sentinel_user_config.json
)

echo.
echo ======================================================================
echo [+] SUCCESS: SentinelTwin Individual User Desktop Application is ready!
echo [+] Standalone Executable: %RELEASE_DIR%\SentinelTwin-User.exe
echo ======================================================================
echo.
exit /b 0
