import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function POST() {
  const session = await getServerAuthSession();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await db.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
        isArchived: false,
      },
      data: {
        isRead: true,
      },
    });
    
    return NextResponse.json({ success: true, updatedCount: result.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to mark all as read" }, { status: 500 });
  }
}
