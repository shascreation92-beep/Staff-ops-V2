# StaffOps Pure Native Windows Agent PowerShell Engine
# Captures 40-second Windows Desktop Screenshots & Idle Telemetry with ZERO dependencies.

param(
    [string]$ServerUrl = "https://51-38-71-134.sslip.io",
    [string]$UserId = "",
    [string]$SecretToken = "staffops_agent_token",
    [int]$IntervalSec = 60,
    [int]$IdleThresholdSec = 120
)

# Enable TLS 1.2 & TLS 1.3 for secure HTTPS API communication
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

Add-Type -AssemblyName System.Windows.Forms,System.Drawing -ErrorAction SilentlyContinue

# Win32 GetLastInputInfo API binding for native idle detection
$User32Signature = @"
[DllImport("user32.dll")]
public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

public struct LASTINPUTINFO {
    public uint cbSize;
    public uint dwTime;
}
"@
Add-Type -MemberDefinition $User32Signature -Name User32API -Namespace Win32Utils -ErrorAction SilentlyContinue

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
        $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
        $graphics = [System.Drawing.Graphics]::FromImage($bmp)
        $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)

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
        return $null
    }
}

function Send-TelemetryPayload ($base64Img, $isIdle) {
    if ([string]::IsNullOrEmpty($base64Img)) { return }

    $payloadObj = @{
        base64Image = $base64Img
        dutyStatus = "ON_DUTY"
        isIdle = $isIdle
        source = "DESKTOP_AGENT_NATIVE"
        secretToken = $SecretToken
    }

    if (-not [string]::IsNullOrEmpty($UserId)) {
        $payloadObj["userId"] = $UserId
    }

    $payload = $payloadObj | ConvertTo-Json -Depth 3

    try {
        $endpoint = "$ServerUrl/api/telemetry/screenshot"
        $response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 20
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [40s Screen Telemetry] Upload Successful! Snapshot ID: $($response.snapshotId)" -ForegroundColor Green
    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [40s Screen Telemetry] Error uploading: $_" -ForegroundColor Red
    }
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   Worknode 40s Silent Windows Desktop Agent    " -ForegroundColor Gold
Write-Host "   Server: $ServerUrl                           " -ForegroundColor Gray
if ($UserId) { Write-Host "   Target User ID: $UserId                      " -ForegroundColor Gray }
Write-Host "=================================================" -ForegroundColor Cyan

# Infinite 40-Second Native Worker Loop
while ($true) {
    try {
        $idleSec = Get-SystemIdleSeconds
        $isIdle = $idleSec -ge $IdleThresholdSec
        $base64Data = Capture-DesktopBase64
        Send-TelemetryPayload -base64Img $base64Data -isIdle $isIdle
    } catch {
        Write-Host "Loop execution error: $_" -ForegroundColor Red
    }

    Start-Sleep -Seconds $IntervalSec
}
