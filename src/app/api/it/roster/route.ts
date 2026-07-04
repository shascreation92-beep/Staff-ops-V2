import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "IT_DEPARTMENT") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Active company context missing." }, { status: 400 });
    }

    // Fetch all Team Leads and their Sales Associates strictly scoped to the active tenant/company
    const teamLeads = await db.user.findMany({
      where: {
        companyId,
        role: "TEAM_LEAD",
        status: "APPROVED",
        isArchived: false
      },
      select: {
        id: true,
        name: true,
        email: true,
        lastActiveAt: true,
        other_user: {
          where: {
            status: "APPROVED",
            isArchived: false
          },
          select: {
            id: true,
            name: true,
            email: true,
            lastActiveAt: true,
            createdAt: true
          }
        }
      }
    });

    return NextResponse.json(teamLeads);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch IT live roster" }, { status: 500 });
  }
}
