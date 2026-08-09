# StaffOps Pure Native Windows Agent PowerShell Engine
# Captures 40-second Windows Desktop Screenshots & Idle Telemetry with ZERO dependencies.

param(
    [string]$ServerUrl = "https://51-38-71-134.sslip.io",
    [string]$UserId = "",
    [string]$SecretToken = "staffops_agent_token",
    [int]$IntervalSec = 60,
    [int]$IdleThresholdSec = 120
)

$ScriptAgentVersion = "2.4"

# Enable TLS 1.2 & TLS 1.3 for secure HTTPS API communication
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

Add-Type -AssemblyName System.Windows.Forms,System.Drawing -ErrorAction SilentlyContinue

function Check-SelfAutoUpdate {
    try {
        $vUrl = "$ServerUrl/desktop-agent/version.txt"
        $remoteVer = (Invoke-RestMethod -Uri $vUrl -TimeoutSec 8).Trim()
        if ($remoteVer -and $remoteVer -ne $ScriptAgentVersion) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [Auto-Update Engine] New Agent Version ($remoteVer) detected! Upgrading from v$ScriptAgentVersion..." -ForegroundColor Yellow
            $scriptPath = $MyInvocation.MyCommand.Path
            if ($scriptPath) {
                [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
                (New-Object System.Net.WebClient).DownloadFile("$ServerUrl/desktop-agent/StaffOps-Agent.ps1", $scriptPath)
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [Auto-Update Engine] Upgrade complete! Restarting agent..." -ForegroundColor Green
                
                $vbsLauncher = Join-Path (Split-Path $scriptPath) "run-agent-silent.vbs"
                if (Test-Path $vbsLauncher) {
                    Start-Process "wscript.exe" -ArgumentList "`"$vbsLauncher`""
                    Exit
                }
            }
        }
    } catch {}
}

# Win32 GetLastInputInfo, SetProcessDPIAware & GDI Desktop Capture API binding
$User32Signature = @"
[DllImport("user32.dll")]
public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

[DllImport("user32.dll")]
public static extern bool SetProcessDPIAware();

[DllImport("user32.dll")]
public static extern IntPtr GetDC(IntPtr hwnd);

[DllImport("user32.dll")]
public static extern int ReleaseDC(IntPtr hwnd, IntPtr hdc);

public struct LASTINPUTINFO {
    public uint cbSize;
    public uint dwTime;
}
"@

$Gdi32Signature = @"
[DllImport("gdi32.dll")]
public static extern bool BitBlt(IntPtr hdcDest, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hdcSrc, int nXSrc, int nYSrc, int dwRop);
"@

Add-Type -MemberDefinition $User32Signature -Name User32API -Namespace Win32Utils -ErrorAction SilentlyContinue
Add-Type -MemberDefinition $Gdi32Signature -Name Gdi32API -Namespace Win32Utils -ErrorAction SilentlyContinue

try {
    [Win32Utils.User32API]::SetProcessDPIAware() | Out-Null
} catch {}

function Get-SystemIdleSeconds {
    try {
        $struct = New-Object Win32Utils.LASTINPUTINFO
        $struct.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($struct)
        if ([Win32Utils.User32API]::GetLastInputInfo([ref]$struct)) {
            $idleMs = [Environment]::TickCount - $struct.dwTime
            return [Math]::Round($idleMs / 1000)
        }
    } catch {}
    return 0
}

function Capture-DesktopBase64 {
    try {
        try {
            [Win32Utils.User32API]::SetProcessDPIAware() | Out-Null
        } catch {}

        $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
        if ($null -eq $bounds -or $bounds.Width -le 0 -or $bounds.Height -le 0) {
            $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        }

        $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
        $graphics = [System.Drawing.Graphics]::FromImage($bmp)
        
        # Primary Capture: SourceCopy mode handles hardware-accelerated browsers (Chrome, Edge, Firefox, FB Marketplace) & active windows
        try {
            $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size, [System.Drawing.CopyPixelOperation]::SourceCopy)
        } catch {
            # Secondary Native Win32 BitBlt Direct DC Fallback
            $hdcSrc = [Win32Utils.User32API]::GetDC([IntPtr]::Zero)
            $hdcDest = $graphics.GetHdc()
            [Win32Utils.Gdi32API]::BitBlt($hdcDest, 0, 0, $bounds.Width, $bounds.Height, $hdcSrc, 0, 0, 0x00CC0020) | Out-Null
            $graphics.ReleaseHdc($hdcDest)
            [Win32Utils.User32API]::ReleaseDC([IntPtr]::Zero, $hdcSrc) | Out-Null
        }

        $encoder = [System.Drawing.Imaging.Encoder]::Quality
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, [long]75)
        $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }

        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, $jpegCodec, $encoderParams)
        $bytes = $ms.ToArray()
        
        $graphics.Dispose()
        $bmp.Dispose()
        $ms.Dispose()

        $base64 = [Convert]::ToBase64String($bytes)
        return "data:image/jpeg;base64,$base64"
    } catch {
        # Fallback: Create placeholder bitmap if screen is locked or sleeping
        try {
            $fallbackBmp = New-Object System.Drawing.Bitmap 800, 450
            $g = [System.Drawing.Graphics]::FromImage($fallbackBmp)
            $g.Clear([System.Drawing.Color]::FromArgb(15, 23, 42))
            $font = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
            $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248, 113, 113))
            $g.DrawString("🔒 Windows Screen Locked / Display Sleeping", $font, $brush, 180, 210)
            
            $ms = New-Object System.IO.MemoryStream
            $fallbackBmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Jpeg)
            $bytes = $ms.ToArray()
            $g.Dispose()
            $fallbackBmp.Dispose()
            $ms.Dispose()
            return "data:image/jpeg;base64,$([Convert]::ToBase64String($bytes))"
        } catch {
            return $null
        }
    }
}

function Send-TelemetryPayload ($base64Img, $isIdle) {
    if ([string]::IsNullOrEmpty($base64Img)) { return }

    $payloadObj = @{
        base64Image = $base64Img
        dutyStatus = "ON_DUTY"
        isIdle = $isIdle
        source = "DESKTOP_AGENT_NATIVE"
        agentVersion = $ScriptAgentVersion
        secretToken = $SecretToken
    }

    if (-not [string]::IsNullOrEmpty($UserId)) {
        $payloadObj["userId"] = $UserId
    }

    $payload = $payloadObj | ConvertTo-Json -Depth 3

    try {
        $endpoint = "$ServerUrl/api/telemetry/screenshot"
        $response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 20
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [40s Screen Telemetry (v$ScriptAgentVersion)] Upload Successful! Snapshot ID: $($response.snapshotId)" -ForegroundColor Green

        # Execute Pending Remote IT Commands
        if ($response.pendingCommands -and $response.pendingCommands.Count -gt 0) {
            foreach ($cmd in $response.pendingCommands) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [Remote IT Command] Executing '$cmd'..." -ForegroundColor Cyan
                switch ($cmd) {
                    "RESTART_AGENT" {
                        Write-Host "[Remote IT Command] Restarting desktop agent process..." -ForegroundColor Yellow
                        $scriptPath = $MyInvocation.MyCommand.Path
                        $vbsLauncher = Join-Path (Split-Path $scriptPath) "run-agent-silent.vbs"
                        if (Test-Path $vbsLauncher) {
                            Start-Process "wscript.exe" -ArgumentList "`"$vbsLauncher`""
                            Exit
                        }
                    }
                    "CLEAR_CACHE" {
                        Write-Host "[Remote IT Command] Clearing local telemetry cache & temporary logs..." -ForegroundColor Yellow
                        Get-ChildItem -Path "$env:LOCALAPPDATA\WorknodeAgent" -Include *.tmp,*.log -Recurse | Remove-Item -Force -ErrorAction SilentlyContinue
                    }
                    "FLUSH_DNS" {
                        Write-Host "[Remote IT Command] Flushing Windows DNS Cache..." -ForegroundColor Yellow
                        ipconfig /flushdns | Out-Null
                    }
                    "FORCE_SYNC" {
                        Write-Host "[Remote IT Command] Force Telemetry Sync executed!" -ForegroundColor Yellow
                    }
                }
            }
        }
    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [40s Screen Telemetry (v$ScriptAgentVersion)] Error uploading: $_" -ForegroundColor Red
    }
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   Worknode 40s Silent Agent Engine (v$ScriptAgentVersion)  " -ForegroundColor Gold
Write-Host "   Server: $ServerUrl                           " -ForegroundColor Gray
if ($UserId) { Write-Host "   Target User ID: $UserId                      " -ForegroundColor Gray }
Write-Host "=================================================" -ForegroundColor Cyan

# Infinite 40-Second Native Worker Loop with Auto-Self-Update Check
while ($true) {
    try {
        Check-SelfAutoUpdate
        $idleSec = Get-SystemIdleSeconds
        $isIdle = $idleSec -ge $IdleThresholdSec
        $base64Data = Capture-DesktopBase64
        Send-TelemetryPayload -base64Img $base64Data -isIdle $isIdle
    } catch {
        Write-Host "Loop execution error: $_" -ForegroundColor Red
    }

    Start-Sleep -Seconds $IntervalSec
}
