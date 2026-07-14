import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerAuthSession();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { senderId, receiverId, message } = await req.json();

    const newMessage = await db.chatmessage.create({
      data: {
        id: crypto.randomUUID(),
        senderId,
        receiverId,
        message,
        isRead: false,
        createdAt: new Date()
      }
    });

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to simulate reply" }, { status: 500 });
  }
}
