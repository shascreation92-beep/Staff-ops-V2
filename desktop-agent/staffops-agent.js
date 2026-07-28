/**
 * StaffOps Silent Windows Desktop Agent
 * Captures full Windows desktop screen every 40 seconds with zero prompts.
 * Includes Windows GetLastInputInfo idle detection and auto WebP telemetry upload.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { exec, execSync } = require('child_process');

// Config parameters
const CONFIG = {
  SERVER_URL: process.env.STAFFOPS_SERVER_URL || 'http://localhost:3000',
  USER_ID: process.env.STAFFOPS_USER_ID || '',
  SECRET_TOKEN: process.env.STAFFOPS_SECRET_TOKEN || 'staffops_agent_token',
  INTERVAL_MS: 40000, // 40 seconds
  IDLE_THRESHOLD_SEC: 120 // 2 minutes
};

// Check system idle time using PowerShell GetLastInputInfo API
function getSystemIdleSeconds() {
  try {
    const psScript = `
      $signature = '[DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);'
      Add-Type -MemberDefinition $signature -Name User32 -Namespace Win32
      $struct = New-Object Win32.User32+LASTINPUTINFO
      $struct.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($struct)
      if ([Win32.User32]::GetLastInputInfo([ref]$struct)) {
        $idleMs = [Environment]::TickCount - $struct.dwTime
        [Math]::Round($idleMs / 1000)
      } else { 0 }
    `;
    const result = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, ' ')}"`, { encoding: 'utf8' });
    return parseInt(result.trim(), 10) || 0;
  } catch (err) {
    return 0;
  }
}

// Take full Windows desktop screenshot via GDI+ PowerShell script
function captureWindowsDesktopBase64() {
  return new Promise((resolve, reject) => {
    const tempPath = path.join(process.env.TEMP || '.', `staffops_snap_${Date.now()}.png`);
    const psCommand = `
      Add-Type -AssemblyName System.Windows.Forms,System.Drawing;
      $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
      $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height;
      $g = [System.Drawing.Graphics]::FromImage($bmp);
      $g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size);
      $bmp.Save('${tempPath.replace(/\\/g, '/')}', [System.Drawing.Imaging.ImageFormat]::Png);
      $g.Dispose();
      $bmp.Dispose();
    `;

    exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand.replace(/\n/g, ' ')}"`, (err) => {
      if (err || !fs.existsSync(tempPath)) {
        return reject(err || new Error("Failed to generate screenshot file."));
      }

      try {
        const fileBuffer = fs.readFileSync(tempPath);
        const base64 = `data:image/png;base64,${fileBuffer.toString('base64')}`;
        fs.unlinkSync(tempPath); // Clean temp file
        resolve(base64);
      } catch (readErr) {
        reject(readErr);
      }
    });
  });
}

// Post snapshot to StaffOps Telemetry API
function uploadSnapshot(base64Image, isIdle) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      base64Image,
      dutyStatus: 'ON_DUTY',
      isIdle,
      source: 'DESKTOP_AGENT',
      userId: CONFIG.USER_ID,
      secretToken: CONFIG.SECRET_TOKEN
    });

    const targetUrl = new URL('/api/telemetry/screenshot', CONFIG.SERVER_URL);
    const client = targetUrl.protocol === 'https:' ? https : http;

    const req = client.request(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Server returned HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Main 40-second worker loop
async function runAgentCycle() {
  try {
    const idleSec = getSystemIdleSeconds();
    const isIdle = idleSec >= CONFIG.IDLE_THRESHOLD_SEC;

    console.log(`[StaffOps Agent] Capturing 40s Desktop Screenshot (Idle: ${idleSec}s, Status: ${isIdle ? 'IDLE' : 'ACTIVE'})...`);
    const base64Img = await captureWindowsDesktopBase64();
    const result = await uploadSnapshot(base64Img, isIdle);
    console.log(`[StaffOps Agent] Upload Successful! ID: ${result.snapshotId || 'OK'}`);
  } catch (err) {
    console.error(`[StaffOps Agent Error]: ${err.message}`);
  }
}

console.log("=================================================");
console.log("   StaffOps Silent Windows Desktop Agent v2.0    ");
console.log("   Capture Frequency: Every 40 Seconds            ");
console.log("=================================================");

// Run initial capture
runAgentCycle();

// Schedule every 40 seconds
setInterval(runAgentCycle, CONFIG.INTERVAL_MS);
