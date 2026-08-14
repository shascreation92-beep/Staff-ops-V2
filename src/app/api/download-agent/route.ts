import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth-helpers";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pass = searchParams.get("pass") || req.headers.get("x-agent-password");

    const expectedPass = process.env.STAFFOPS_AGENT_PASSWORD || process.env.STAFFOPS_SECRET_TOKEN || "Mango@9090";

    // Allow download if valid agent password is provided OR if user is authenticated with authorized role
    let isAuthorized = false;

    if (pass && pass === expectedPass) {
      isAuthorized = true;
    } else {
      const session = await getServerAuthSession();
      if (session?.user && ["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT", "TEAM_LEAD"].includes(session.user.role)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Invalid security credentials. Access denied." }, { status: 401 });
    }

    const zipPath = path.join(process.cwd(), "public", "desktop-agent", "StaffOps-Agent-Setup.zip");

    if (!fs.existsSync(zipPath)) {
      return NextResponse.json({ error: "Agent package not found." }, { status: 404 });
    }

    const stat = fs.statSync(zipPath);
    const nodeStream = fs.createReadStream(zipPath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="StaffOps-Agent-Setup.zip"',
        "Content-Length": stat.size.toString(),
        "Cache-Control": "no-store, max-age=0"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to download agent." }, { status: 500 });
  }
}
