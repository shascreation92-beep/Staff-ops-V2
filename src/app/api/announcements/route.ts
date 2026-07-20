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

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";

    if (!session.user.companyId && !isSuperAdmin) {
      return NextResponse.json([]);
    }

    const announcements = await db.announcement.findMany({
      where: {
        isArchived: false,
        OR: isSuperAdmin
          ? undefined
          : [
              { companyId: session.user.companyId },
              { companyId: null }
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
