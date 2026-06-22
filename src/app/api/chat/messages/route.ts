import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");

  if (!contactId) {
    return NextResponse.json({ error: "Contact ID is required" }, { status: 400 });
  }

  try {
    const messages = await db.chatmessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: contactId },
          { senderId: contactId, receiverId: session.user.id }
        ]
      },
      orderBy: {
        createdAt: "asc"
      },
      take: 50
    });

    // Mark these retrieved messages as read if the recipient is the logged-in user
    await db.chatmessage.updateMany({
      where: {
        senderId: contactId,
        receiverId: session.user.id,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load chat history" }, { status: 500 });
  }
}
