import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import TeamLeadDashboard from "@/components/TeamLeadDashboard";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function LiveTeamOperationsMirrorPage({ params }: PageProps) {
  // Resolve params
  const resolvedParams = await params;
  const targetTLId = resolvedParams.id;

  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  // Fetch the target Team Lead
  const targetTL = await db.user.findUnique({
    where: { id: targetTLId }
  });

  if (!targetTL || targetTL.role !== "TEAM_LEAD" || targetTL.isArchived) {
    return notFound();
  }

  // Strict tenant isolation: IT operator must only access Team Leads in their active company
  if (user.role !== "SUPER_ADMIN" && targetTL.companyId !== user.companyId) {
    return notFound();
  }

  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name;
  }

  // Load platform-specific counts for targetTL
  const [rulesList, dbPlatforms, teamMembers] = await Promise.all([
    db.rule.findMany({ where: { companyId: targetTL.companyId || "" } }),
    db.platform.findMany({ where: { isArchived: false } }),
    db.user.findMany({ where: { teamLeadId: targetTL.id, isArchived: false }, select: { id: true } })
  ]);

  const teamUserIds = [targetTL.id, ...teamMembers.map(m => m.id)];

  const targetRuleFB = rulesList.find(r => r.key === "targetToMaintainFB");
  const targetRuleGlobal = rulesList.find(r => r.key === "targetToMaintain");
  const fbTarget = targetRuleFB ? (parseInt(targetRuleFB.value, 10) || 15) : (targetRuleGlobal ? (parseInt(targetRuleGlobal.value, 10) || 15) : 15);
  const combinedFbTarget = fbTarget * teamUserIds.length;

  const fbPlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("facebook"));
  const vintedPlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("vinted"));
  const gumtreePlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("gumtree"));

  const fbWhere = fbPlatform ? { platformId: fbPlatform.id } : { platform: { name: { contains: "facebook" } } };
  const vintedWhere = vintedPlatform ? { platformId: vintedPlatform.id } : { platform: { name: { contains: "vinted" } } };
  const gumtreeWhere = gumtreePlatform ? { platformId: gumtreePlatform.id } : { platform: { name: { contains: "gumtree" } } };

  const [
    totalCombinedAccounts,
    fbTotalCombined,
    fbActiveCombined,
    fbVerifiedCombined,
    fbUnverifiedCombined,
    fbMarketplaceCombined,
    fbIdentityCombined,
    vintedTotalCombined,
    vintedVerifiedCombined,
    vintedUnverifiedCombined,
    vintedSuspendedCombined,

    saTotalAccounts,
    fbTotal, fbActive, fbVerified, fbUnverified, fbMarketplace, fbIdentity, fbSuspended,
    vintedTotal, vintedVerified, vintedUnverified, vintedSuspended,
    gumtreeTotal, gumtreeVerified, gumtreeUnverified, gumtreeSuspended,

    feed
  ] = await Promise.all([
    db.account.count({ where: { createdById: { in: teamUserIds }, isArchived: false } }),
    db.account.count({ where: { createdById: { in: teamUserIds }, isArchived: false, ...fbWhere } }),
    db.account.count({ where: { createdById: { in: teamUserIds }, status: "SORTED", issueType: { notIn: ["Marketplace Issue", "Identity Issue", "Suspended"] }, isArchived: false, ...fbWhere } }),
    db.account.count({ where: { createdById: { in: teamUserIds }, verificationStatus: "Yes", isArchived: false, ...fbWhere } }),
    db.account.count({ where: { createdById: { in: teamUserIds }, verificationStatus: "No", isArchived: false, ...fbWhere } }),
    db.account.count({ where: { createdById: { in: teamUserIds }, status: "SORTED", issueType: "Marketplace Issue", isArchived: false, ...fbWhere } }),
    db.account.count({ where: { createdById: { in: teamUserIds }, status: "SORTED", issueType: "Identity Issue", isArchived: false, ...fbWhere } }),
    db.account.count({ where: { createdById: { in: teamUserIds }, isArchived: false, ...vintedWhere } }),
    db.account.count({ where: { createdById: { in: teamUserIds }, verificationStatus: "Yes", isArchived: false, ...vintedWhere } }),
    db.account.count({ where: { createdById: { in: teamUserIds }, verificationStatus: "No", isArchived: false, ...vintedWhere } }),
    db.account.count({ where: { createdById: { in: teamUserIds }, status: "SORTED", issueType: "Suspended", isArchived: false, ...vintedWhere } }),

    db.account.count({ where: { createdById: targetTL.id, isArchived: false } }),
    db.account.count({ where: { createdById: targetTL.id, isArchived: false, ...fbWhere } }),
    db.account.count({ where: { createdById: targetTL.id, status: "SORTED", issueType: { notIn: ["Marketplace Issue", "Identity Issue", "Suspended"] }, isArchived: false, ...fbWhere } }),
    db.account.count({ where: { createdById: targetTL.id, verificationStatus: "Yes", isArchived: false, ...fbWhere } }),
    db.account.count({ where: { createdById: targetTL.id, verificationStatus: "No", isArchived: false, ...fbWhere } }),
    db.account.count({ where: { createdById: targetTL.id, status: "SORTED", issueType: "Marketplace Issue", isArchived: false, ...fbWhere } }),
    db.account.count({ where: { createdById: targetTL.id, status: "SORTED", issueType: "Identity Issue", isArchived: false, ...fbWhere } }),
    db.account.count({ where: { createdById: targetTL.id, status: "SORTED", issueType: "Suspended", isArchived: false, ...fbWhere } }),
    db.account.count({ where: { createdById: targetTL.id, isArchived: false, ...vintedWhere } }),
    db.account.count({ where: { createdById: targetTL.id, verificationStatus: "Yes", isArchived: false, ...vintedWhere } }),
    db.account.count({ where: { createdById: targetTL.id, verificationStatus: "No", isArchived: false, ...vintedWhere } }),
    db.account.count({ where: { createdById: targetTL.id, status: "SORTED", issueType: "Suspended", isArchived: false, ...vintedWhere } }),
    db.account.count({ where: { createdById: targetTL.id, isArchived: false, ...gumtreeWhere } }),
    db.account.count({ where: { createdById: targetTL.id, verificationStatus: "Yes", isArchived: false, ...gumtreeWhere } }),
    db.account.count({ where: { createdById: targetTL.id, verificationStatus: "No", isArchived: false, ...gumtreeWhere } }),
    db.account.count({ where: { createdById: targetTL.id, status: "SORTED", issueType: "Suspended", isArchived: false, ...gumtreeWhere } }),

    db.account.findMany({
      where: { createdById: { in: teamUserIds }, isArchived: false },
      include: {
        platform: { select: { name: true } },
        user_account_createdByIdTouser: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  const combinedStats = {
    totalCombinedAccounts,
    combinedFbTarget,
    fbTotalCombined,
    fbActiveCombined,
    fbVerifiedCombined,
    fbUnverifiedCombined,
    fbMarketplaceCombined,
    fbIdentityCombined,
    vintedTotalCombined,
    vintedVerifiedCombined,
    vintedUnverifiedCombined,
    vintedSuspendedCombined
  };

  const personalStats = {
    saTotalAccounts,
    fbTotal,
    fbActive,
    fbVerified,
    fbUnverified,
    fbMarketplace,
    fbIdentity,
    fbSuspended,
    fbTarget,
    vintedTotal,
    vintedVerified,
    vintedUnverified,
    vintedSuspended,
    gumtreeTotal,
    gumtreeVerified,
    gumtreeUnverified,
    gumtreeSuspended
  };

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <div className="dashboard-container" style={{ padding: "2rem" }}>
        
        {/* Mirror Active Banner */}
        <div className="glass-panel" style={{
          padding: "1rem 1.5rem",
          background: "rgba(2, 80, 161, 0.05)",
          border: "1px solid rgba(2, 80, 161, 0.15)",
          borderRadius: "8px",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 4px 20px rgba(2, 80, 161, 0.04)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.2rem" }}>🎛️</span>
            <div>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0250A1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Live Dashboard Mirroring Active
              </span>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0 }}>
                You are currently viewing a live operational mirror for <strong>{targetTL.name || targetTL.email}</strong>'s team.
              </p>
            </div>
          </div>
          <span style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            background: "rgba(16, 185, 129, 0.1)",
            color: "#10B981",
            padding: "0.2rem 0.6rem",
            borderRadius: "9999px",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            textTransform: "uppercase"
          }}>
            ● Mirrored
          </span>
        </div>

        {/* Mirrored Dashboard View */}
        <TeamLeadDashboard 
          userName={targetTL.name || targetTL.email.split("@")[0]} 
          combinedStats={combinedStats} 
          personalStats={personalStats} 
          globalFeed={feed} 
        />
      </div>
    </DashboardLayout>
  );
}
