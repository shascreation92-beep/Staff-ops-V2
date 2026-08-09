import { NextRequest, NextResponse } from "next/server";
import { uploadScreenshotAction } from "@/app/actions/telemetry";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await uploadScreenshotAction(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      snapshotId: result.snapshotId, 
      imageUrl: result.imageUrl,
      pendingCommands: result.pendingCommands || []
    });
  } catch (err: any) {
    console.error("API /api/telemetry/screenshot error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
