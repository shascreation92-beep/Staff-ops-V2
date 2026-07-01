import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import TeamLiveRosterList from "@/components/TeamLiveRosterList";

export const dynamic = "force-dynamic";

export default async function TeamLiveRosterPage() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD"]);

  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name;
  }

  let accounts: any[] = [];

  if (user.role === "SUPER_ADMIN") {
    accounts = await db.account.findMany({
      where: { isArchived: false },
      include: {
        platform: true,
        user_account_createdByIdTouser: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  } else if (user.role === "COMPANY_OWNER") {
    accounts = await db.account.findMany({
      where: { companyId: user.companyId, isArchived: false },
      include: {
        platform: true,
        user_account_createdByIdTouser: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  } else if (user.role === "TEAM_LEAD") {
    // Strictly fetch accounts of mapped associates (createdById in mapped associate IDs)
    const associates = await db.user.findMany({
      where: { teamLeadId: user.id, isArchived: false },
      select: { id: true }
    });
    const associateIds = associates.map(a => a.id);
    
    accounts = await db.account.findMany({
      where: {
        createdById: { in: associateIds },
        isArchived: false
      },
      include: {
        platform: true,
        user_account_createdByIdTouser: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <TeamLiveRosterList initialAccounts={accounts} user={user} />
    </DashboardLayout>
  );
}
