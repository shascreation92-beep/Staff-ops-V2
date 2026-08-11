import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const zipPath = path.join(process.cwd(), "public", "desktop-agent", "StaffOps-Agent-Setup.zip");

    if (!fs.existsSync(zipPath)) {
      return NextResponse.json({ error: "Agent package not found." }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(zipPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="StaffOps-Agent-Setup.zip"',
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "no-store, max-age=0"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to download agent." }, { status: 500 });
  }
}
