# StaffOps Desktop Agent Windows Startup Installer
# Installs StaffOps Silent Desktop Agent to run automatically on Windows boot.

$AgentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$StartupFolder = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $StartupFolder "StaffOpsDesktopAgent.lnk"

Write-Host "Installing StaffOps 40-Second Silent Desktop Agent to Windows Startup..." -ForegroundColor Green

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$AgentDir\run-silent.vbs`""
$Shortcut.WorkingDirectory = $AgentDir
$Shortcut.WindowStyle = 7 # Minimized/Hidden
$Shortcut.Save()

# Create run-silent.vbs launcher
$VbsPath = Join-Path $AgentDir "run-silent.vbs"
$VbsContent = 'Set WshShell = CreateObject("WScript.Shell")' + "`r`n" + 'WshShell.Run "node staffops-agent.js", 0, false'
Set-Content -Path $VbsPath -Value $VbsContent -Force

Write-Host "SUCCESS! StaffOps Agent is installed in Windows Startup." -ForegroundColor Cyan
Write-Host "Location: $ShortcutPath" -ForegroundColor Gray
