@echo off
title SentinelTwin - Stop Services
echo ======================================================================
echo   [-] Stopping SentinelTwin Services on Ports 5000 and 5173...
echo ======================================================================

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do (
    taskkill /f /pid %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /f /pid %%a 2>nul
)

echo [+] All services stopped.
pause
