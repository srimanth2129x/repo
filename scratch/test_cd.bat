@echo off
echo START: %CD%
for %%I in ("%~dp0..") do set "PROJECT_ROOT=%%~FI"
cd /d "%PROJECT_ROOT%"
echo END: %CD%
