@echo off
:: Worknode Workstation 1-Minute Silent Screen Telemetry Agent 1-Click Installer
title Worknode Workstation Sync Installer

echo =======================================================
echo   Worknode Workstation 1-Minute Silent Agent Setup
echo =======================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\WorknodeAgent"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

set "SERVER_URL=https://51-38-71-134.sslip.io"
set "AGENT_PS1=%TARGET_DIR%\StaffOps-Agent.ps1"
set "VBS_LAUNCHER=%TARGET_DIR%\run-agent-silent.vbs"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

if "%USER_ID%"=="" set "USER_ID=ahmad@gmail.com"

echo Workstation User Account: %USER_ID%
echo.

echo Downloading Worknode Desktop Agent Engine from Server...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%SERVER_URL%/desktop-agent/StaffOps-Agent.ps1', '%AGENT_PS1%')"

echo Creating silent background VBScript launcher...
echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_LAUNCHER%"
echo WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%AGENT_PS1%"" -ServerUrl ""%SERVER_URL%"" -UserId ""%USER_ID%""", 0, false >> "%VBS_LAUNCHER%"

echo Creating shortcut in Windows Startup folder...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$wsh = New-Object -ComObject WScript.Shell; $sc = $wsh.CreateShortcut('%STARTUP_DIR%\WorknodeWorkstationSync.lnk'); $sc.TargetPath = 'wscript.exe'; $sc.Arguments = '\"%VBS_LAUNCHER%\"'; $sc.WorkingDirectory = '%TARGET_DIR%'; $sc.WindowStyle = 7; $sc.Save()"

echo Launching 1-minute desktop telemetry engine...
wscript.exe "%VBS_LAUNCHER%"

echo.
echo SUCCESS! Worknode Workstation Sync has been installed and activated for %USER_ID%.
echo It will capture 1-minute desktop telemetry automatically on Windows boot.
echo.
pause
