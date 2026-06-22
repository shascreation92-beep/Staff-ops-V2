import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senderId, receiverId, message } = body;

    if (!senderId || !receiverId || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

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
    return NextResponse.json({ error: error.message || "Failed to simulate message" }, { status: 500 });
  }
}
