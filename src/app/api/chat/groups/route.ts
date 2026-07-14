import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerAuthSession();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const companyId = session.user.companyId;

  if (!companyId) {
    return NextResponse.json({ error: "No company associated with user" }, { status: 400 });
  }

  try {
    const memberships = await db.chatgroupmember.findMany({
      where: { userId },
      select: { groupId: true }
    });

    const joinedGroupIds = memberships.map(m => m.groupId);

    const joinedGroups = await db.chatgroup.findMany({
      where: {
        id: { in: joinedGroupIds },
        companyId
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        }
      }
    });

    const discoverableGroups = await db.chatgroup.findMany({
      where: {
        companyId,
        isPrivate: false,
        id: { notIn: joinedGroupIds.length > 0 ? joinedGroupIds : ["dummy-id-to-avoid-empty-notin"] }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const pins = await db.chatpin.findMany({
      where: { userId }
    });

    return NextResponse.json({
      joinedGroups,
      discoverableGroups,
      pins
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch groups and pins" }, { status: 500 });
  }
}
