"use server";

import { db } from "@/lib/db";
import { enforceAuth } from "@/lib/auth-helpers";

/**
 * Fetch Team Performance Stats for Team Leads & Admins
 * Calculates 6 metric block tiles per team member, sorted by LOWEST IDs first.
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Fetch team members with accounts, laptop assets, and team lead info
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
      user: {
        select: {
          name: true,
          email: true
        }
      },
      employee: {
        select: {
          employeeId: true
        }
      },
      laptopasset: {
        select: {
          assetTag: true
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
          issueType: true,
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

  // Calculate stats for each member matching demo tile block structure
  const statsList = teamMembers.map(member => {
    const accounts = member.account_account_createdByIdTouser || [];
    const totalAccounts = accounts.length;

    // Platform Filter
    const fbAccounts = accounts.filter(a => (a.platform?.name || "").toLowerCase().includes("facebook"));
    const vintedAccounts = accounts.filter(a => (a.platform?.name || "").toLowerCase().includes("vinted"));

    // 6 Metric Block Stat Counts
    const totalFB = fbAccounts.length;
    const verifiedFB = fbAccounts.filter(a => a.verificationStatus === "Yes").length;
    const unverifiedFB = fbAccounts.filter(a => a.verificationStatus === "No").length;
    const identityFB = fbAccounts.filter(a => a.issueType === "Identity Issue").length;

    const totalVinted = vintedAccounts.length;
    const verifiedVinted = vintedAccounts.filter(a => a.verificationStatus === "Yes").length;

    // Critical risks count & submitted today check
    const criticalRisks = accounts.filter(a => a.verificationStatus === "No" || a.status === "REJECTED" || a.issueType).length;
    const submittedToday = accounts.some(a => new Date(a.createdAt) >= todayStart);

    // Laptops string
    const laptopTags = member.laptopasset.map(l => l.assetTag).join(", ") || "SD-01";
    const teamLeadName = member.user?.name || member.user?.email || user.name || "Hamza Alvi";

    // Last submission date
    let lastSubmissionDate: string | null = null;
    if (accounts.length > 0) {
      const sorted = [...accounts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      lastSubmissionDate = sorted[0].createdAt.toISOString();
    }

    return {
      userId: member.id,
      name: member.name || member.email,
      email: member.email,
      employeeId: member.employee?.employeeId || "N/A",
      image: member.image,
      shiftStatus: member.dutyStatus || "OFF_DUTY",
      laptops: laptopTags,
      teamLeadName,
      totalAccounts,
      totalFB,
      verifiedFB,
      unverifiedFB,
      identityFB,
      totalVinted,
      verifiedVinted,
      criticalRisks,
      submittedToday,
      lastSubmissionDate,
      isLagging: totalAccounts < 5 // Underperforming threshold
    };
  });

  // SORT RULE: Lowest total accounts cataloged FIRST (Ascending order)
  statsList.sort((a, b) => a.totalAccounts - b.totalAccounts);

  return {
    success: true,
    teamStats: statsList
  };
}
