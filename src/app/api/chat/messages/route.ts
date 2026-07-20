import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerAuthSession();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  const isGroup = searchParams.get("isGroup") === "true";

  if (!contactId) {
    try {
      const allMsgs = await db.chatmessage.findMany({
        where: {
          OR: [
            { senderId: session.user.id },
            { receiverId: session.user.id }
          ]
        },
        orderBy: {
          createdAt: "asc"
        }
      });
      return NextResponse.json(allMsgs);
    } catch (error: any) {
      return NextResponse.json({ error: error.message || "Failed to fetch all messages" }, { status: 500 });
    }
  }

  try {
    if (isGroup) {
      // Group membership guard
      if (session.user.role !== "SUPER_ADMIN") {
        const membership = await db.chatgroupmember.findFirst({
          where: {
            groupId: contactId,
            userId: session.user.id
          }
        });
        if (!membership) {
          return NextResponse.json({ error: "Forbidden: Not a member of this chat group" }, { status: 403 });
        }
      }

      const messages = await db.chatgroupmessage.findMany({
        where: { groupId: contactId },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      });
      return NextResponse.json(messages);
    }

    // Automatically mark direct messages as read when loading thread
    await db.chatmessage.updateMany({
      where: {
        senderId: contactId,
        receiverId: session.user.id,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    const messages = await db.chatmessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: contactId },
          { senderId: contactId, receiverId: session.user.id }
        ]
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch messages" }, { status: 500 });
  }
}
