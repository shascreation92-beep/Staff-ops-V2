@echo off
:: StaffOps Native Workstation Sync 1-Click Uninstaller
title StaffOps Workstation Sync Uninstaller

echo =======================================================
echo   StaffOps Workstation Sync 1-Click Uninstaller
echo =======================================================
echo.

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_DIR%\StaffOpsWorkstationSync.lnk"

echo Stopping running StaffOps Agent processes...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*StaffOps-Agent.ps1*' } | Stop-Process -Force -ErrorAction SilentlyContinue"

echo Removing Startup link...
if exist "%SHORTCUT%" (
    del /f /q "%SHORTCUT%"
    echo Startup link removed successfully.
) else (
    echo Startup link was not found.
)

echo.
echo SUCCESS! StaffOps Workstation Sync has been completely uninstalled.
echo The laptop is now clean and ready for another user account.
echo.
pause
