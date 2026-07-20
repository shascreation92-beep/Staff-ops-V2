import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { sanitizeInput } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const rawEndpoint = body?.endpoint;
    const rawP256dh = body?.keys?.p256dh;
    const rawAuth = body?.keys?.auth;

    if (!rawEndpoint || !rawP256dh || !rawAuth) {
      return NextResponse.json({ error: "Invalid subscription details" }, { status: 400 });
    }

    const endpoint = sanitizeInput(rawEndpoint);
    const p256dh = sanitizeInput(rawP256dh);
    const auth = sanitizeInput(rawAuth);

    // Upsert subscription
    await db.pushsubscription.upsert({
      where: { endpoint },
      update: {
        userId: session.user.id,
        p256dh,
        auth
      },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh,
        auth
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to subscribe:", err);
    return NextResponse.json({ error: err.message || "Failed to subscribe" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const rawEndpoint = body?.endpoint;

    if (!rawEndpoint) {
      return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
    }

    const endpoint = sanitizeInput(rawEndpoint);

    await db.pushsubscription.deleteMany({
      where: {
        userId: session.user.id,
        endpoint
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to unsubscribe:", err);
    return NextResponse.json({ error: err.message || "Failed to unsubscribe" }, { status: 500 });
  }
}
