import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pass = searchParams.get("pass") || req.headers.get("x-agent-password");

  if (pass !== "Mango@9090") {
    return NextResponse.json({ error: "Invalid security password. Access denied." }, { status: 401 });
  }

  const commandText = `=========================================================================
  STAFFOPS WORKSTATION AGENT V-2.4 1-CLICK POWERSHELL INSTALLATION
=========================================================================

INSTRUCTIONS:
1. Open PowerShell on your Windows laptop (Start -> type PowerShell -> Enter).
2. Copy the single command below, paste it into PowerShell, and press Enter.
3. The agent will automatically unblock security flags and install in 3 seconds.

-------------------------------------------------------------------------
COMMAND TO COPY & PASTE:
-------------------------------------------------------------------------

powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13; iwr -useb 'https://51-38-71-134.sslip.io/desktop-agent/Install-StaffOps-Workstation.bat' -OutFile '$env:TEMP\\Install-StaffOps.bat'; Unblock-File '$env:TEMP\\Install-StaffOps.bat'; & '$env:TEMP\\Install-StaffOps.bat'"

=========================================================================
`;

  return new NextResponse(commandText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="Install-StaffOps-Command.txt"',
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
