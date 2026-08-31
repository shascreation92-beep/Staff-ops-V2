import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: { onlyRead?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty, default onlyRead to true
      body = { onlyRead: true };
    }

    const whereClause: any = {
      userId: session.user.id,
      isArchived: false,
    };

    if (body.onlyRead !== false) {
      whereClause.isRead = true;
    }

    const result = await db.notification.updateMany({
      where: whereClause,
      data: {
        isArchived: true,
      },
    });
    
    return NextResponse.json({ success: true, archivedCount: result.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to archive notifications" }, { status: 500 });
  }
}
