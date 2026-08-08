import { NextRequest, NextResponse } from "next/server";
import { getPausedUserIds } from "@/app/actions/telemetry";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || searchParams.get("user");

    const pausedSet = await getPausedUserIds();

    if (userId) {
      const isPaused = pausedSet.has(userId);
      return NextResponse.json({
        success: true,
        userId,
        isPaused,
        status: isPaused ? "PAUSED_BY_ADMIN" : "ACTIVE",
        message: isPaused ? "Screen telemetry is paused by admin." : "Screen telemetry is active."
      });
    }

    return NextResponse.json({
      success: true,
      pausedUserIds: Array.from(pausedSet)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
