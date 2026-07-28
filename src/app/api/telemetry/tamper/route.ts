import { NextRequest, NextResponse } from "next/server";
import { reportTamperViolationAction } from "@/app/actions/telemetry";

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = { reason: text || "Tab closed or monitoring stopped while On Duty" };
      }
    }

    const result = await reportTamperViolationAction({
      reason: body.reason || "Screen monitoring stopped unexpectedly while On Duty.",
      details: body.details,
      targetUserId: body.userId
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("API /api/telemetry/tamper error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
