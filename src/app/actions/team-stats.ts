"use server";

import { db } from "@/lib/db";
import { enforceAuth } from "@/lib/auth-helpers";

/**
 * Fetch Team Performance Stats for Team Leads & Admins
 * Calculates account metrics for each team member, sorted by LOWEST IDs first.
 */
export async function getTeamPerformanceStatsAction() {
  const user = await enforceAuth(["TEAM_LEAD", "SUPER_ADMIN", "COMPANY_OWNER"]);

  // Determine member filter
  let memberFilter: any = {};
  if (user.role === "TEAM_LEAD") {
    memberFilter = { teamLeadId: user.id, isArchived: false, status: "APPROVED" };
  } else if (user.role === "COMPANY_OWNER" && user.companyId) {
    memberFilter = { companyId: user.companyId, role: "SALES_ASSOCIATE", isArchived: false, status: "APPROVED" };
  } else {
    // Super Admin: all sales associates
    memberFilter = { role: "SALES_ASSOCIATE", isArchived: false, status: "APPROVED" };
  }

  // Fetch team members with their accounts & shift duty logs
  const teamMembers = await db.user.findMany({
    where: memberFilter,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      dutyStatus: true,
      image: true,
      createdAt: true,
      employee: {
        select: {
          employeeId: true
        }
      },
      account_account_createdByIdTouser: {
        where: {
          isArchived: false
        },
        select: {
          id: true,
          idName: true,
          serialCode: true,
          status: true,
          verificationStatus: true,
          adsPublished: true,
          createdAt: true,
          platform: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  // Calculate stats for each member
  const statsList = teamMembers.map(member => {
    const accounts = member.account_account_createdByIdTouser || [];
    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter(a => ["ACTIVE", "APPROVED_BY_TEAM_LEAD", "COMPLETED"].includes(a.status)).length;
    const pendingAccounts = accounts.filter(a => ["PENDING_TL", "FORWARDED_TO_IT", "SUBMITTED"].includes(a.status)).length;
    const unverifiedAccounts = accounts.filter(a => a.verificationStatus === "No").length;
    const totalAdsPublished = accounts.reduce((acc, a) => acc + (a.adsPublished || 0), 0);

    // Platform breakdown
    const platformCounts: Record<string, number> = {};
    accounts.forEach(a => {
      const pName = a.platform?.name || "Other";
      platformCounts[pName] = (platformCounts[pName] || 0) + 1;
    });

    // Last submission date
    let lastSubmissionDate: string | null = null;
    if (accounts.length > 0) {
      const sorted = [...accounts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      lastSubmissionDate = sorted[0].createdAt.toISOString();
    }

    // Daily target (default 10 accounts target per team member)
    const targetGoal = 10;
    const targetProgressPct = Math.min(100, Math.round((totalAccounts / targetGoal) * 100));

    return {
      userId: member.id,
      name: member.name || member.email,
      email: member.email,
      employeeId: member.employee?.employeeId || "N/A",
      image: member.image,
      shiftStatus: member.dutyStatus || "OFF_DUTY",
      totalAccounts,
      activeAccounts,
      pendingAccounts,
      unverifiedAccounts,
      totalAdsPublished,
      platformCounts,
      lastSubmissionDate,
      targetGoal,
      targetProgressPct,
      isLagging: totalAccounts < 5 // Underperforming threshold
    };
  });

  // SORT RULE: Lowest accounts cataloged FIRST (Ascending order)
  statsList.sort((a, b) => a.totalAccounts - b.totalAccounts);

  return {
    success: true,
    teamStats: statsList
  };
}
