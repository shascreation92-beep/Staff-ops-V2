import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const announcements = await db.announcement.findMany({
      where: {
        isArchived: false,
        OR: [
          { companyId: null },
          { companyId: session.user.companyId || undefined }
        ]
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    });

    return NextResponse.json(announcements);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch announcements" }, { status: 500 });
  }
}
