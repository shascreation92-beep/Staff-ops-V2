import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerAuthSession();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notifications = await db.notification.findMany({
      where: {
        userId: session.user.id,
        isArchived: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });
    
    return NextResponse.json(notifications);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch notifications" }, { status: 500 });
  }
}
