@echo off
:: StaffOps Native Workstation Sync 1-Click Installer
title StaffOps Workstation Sync Installer

echo =======================================================
echo   StaffOps Workstation Sync 1-Click Silent Setup
echo =======================================================
echo.

set "AGENT_DIR=%~dp0"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_LAUNCHER=%AGENT_DIR%run-agent-silent.vbs"

:: Create silent VBScript launcher if missing
echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_LAUNCHER%"
echo WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%AGENT_DIR%StaffOps-Agent.ps1""", 0, false >> "%VBS_LAUNCHER%"

:: Create shortcut in Windows Startup directory
powershell -NoProfile -ExecutionPolicy Bypass -Command "$wsh = New-Object -ComObject WScript.Shell; $sc = $wsh.CreateShortcut('%STARTUP_DIR%\StaffOpsWorkstationSync.lnk'); $sc.TargetPath = 'wscript.exe'; $sc.Arguments = '\"%VBS_LAUNCHER%\"'; $sc.WorkingDirectory = '%AGENT_DIR%'; $sc.WindowStyle = 7; $sc.Save()"

:: Launch background agent immediately
wscript.exe "%VBS_LAUNCHER%"

echo.
echo SUCCESS! StaffOps Workstation Sync has been installed and activated.
echo It will now run automatically in the background on Windows boot.
echo.
pause
