# StaffOps Pure Native Windows Agent PowerShell Engine
# Captures 40-second Windows Desktop Screenshots & Idle Telemetry with ZERO dependencies.

param(
    [string]$ServerUrl = "http://116.203.213.113",
    [string]$SecretToken = "staffops_agent_token",
    [int]$IntervalSec = 40,
    [int]$IdleThresholdSec = 120
)

Add-Type -AssemblyName System.Windows.Forms,System.Drawing

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

        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $bytes = $ms.ToArray()
        
        $graphics.Dispose()
        $bmp.Dispose()
        $ms.Dispose()

        $base64 = [Convert]::ToBase64String($bytes)
        return "data:image/png;base64,$base64"
    } catch {
        return $null
    }
}

function Send-TelemetryPayload ($base64Img, $isIdle) {
    if ([string]::IsNullOrEmpty($base64Img)) { return }

    $payload = @{
        base64Image = $base64Img
        dutyStatus = "ON_DUTY"
        isIdle = $isIdle
        source = "DESKTOP_AGENT_NATIVE"
        secretToken = $SecretToken
    } | ConvertTo-Json -Depth 3

    try {
        $endpoint = "$ServerUrl/api/telemetry/screenshot"
        $response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 15
    } catch {}
}

# Infinite 40-Second Native Worker Loop
while ($true) {
    try {
        $idleSec = Get-SystemIdleSeconds
        $isIdle = $idleSec -ge $IdleThresholdSec
        $base64Data = Capture-DesktopBase64
        Send-TelemetryPayload -base64Img $base64Data -isIdle $isIdle
    } catch {}

    Start-Sleep -Seconds $IntervalSec
}
