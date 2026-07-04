import React from "react";
import { enforceAuth, getCompanyFilter } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
import DashboardLayout from "@/components/DashboardLayout";
import SalesAssociateDashboard from "@/components/SalesAssociateDashboard";
import TeamLeadDashboard from "@/components/TeamLeadDashboard";
import { 
  Database, 
  ShieldCheck, 
  Clock, 
  Users, 
  Building,
  UserCheck,
  CheckCircle,
  ShieldAlert,
  AlertCircle,
  HelpCircle,
  Target,
  AlertTriangle,
  MinusCircle,
  Store
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import PendingOnboardingList from "@/components/PendingOnboardingList";

export default async function DashboardPage() {
  // Enforce server-side authentication and status checks
  const user = await enforceAuth();
  
  // Get scoped company filter
  const companyFilter = getCompanyFilter(user);

  // Fetch company details if not Super Admin
  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name;
  }

  // Fetch standard dashboard stats
  const totalAccounts = await db.account.count({
    where: {
      ...companyFilter,
      isArchived: false
    }
  });

  const verifiedAccounts = await db.account.count({
    where: {
      ...companyFilter,
      isArchived: false,
      verificationStatus: "Yes"
    }
  });

  const pendingReviews = await db.account.count({
    where: {
      ...companyFilter,
      isArchived: false,
      status: "UNDER_REVIEW"
    }
  });

  const activeEmployees = await db.employee.count({
    where: {
      ...companyFilter,
      isArchived: false,
      status: "ACTIVE"
    }
  });

  // Role-specific stats
  let companyCount = 0;
  let totalSystemUsers = 0;
  
  if (user.role === "SUPER_ADMIN") {
    companyCount = await db.company.count({
      where: { isArchived: false }
    });
    totalSystemUsers = await db.user.count({
      where: { isArchived: false }
    });
  } else {
    totalSystemUsers = await db.user.count({
      where: { 
        isArchived: false,
        companyId: user.companyId 
      }
    });
  }

  // Fetch pending onboarding requests (status is PENDING, role is SALES_ASSOCIATE)
  let pendingUsers: any[] = [];
  if (["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"].includes(user.role)) {
    pendingUsers = await db.user.findMany({
      where: {
        status: "PENDING",
        role: "SALES_ASSOCIATE",
        companyId: user.role === "SUPER_ADMIN" ? undefined : (user.companyId || "")
      },
      include: {
        company: {
          select: { name: true }
        },
        user: { // team lead relation
          select: { name: true }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  // Fetch number of active team leads in active company context
  const companyTeamLeadsCount = await db.user.count({
    where: {
      ...companyFilter,
      role: "TEAM_LEAD",
      isArchived: false
    }
  });

  // Fetch the target rule value
  const targetRule = await db.rule.findFirst({
    where: {
      companyId: user.companyId || undefined,
      key: { in: ["targetToMaintainFB", "targetToMaintain"] }
    }
  });
  const targetValuePerTL = targetRule ? (parseInt(targetRule.value, 10) || 15) : 15;
  const totalOfficeTarget = targetValuePerTL * companyTeamLeadsCount;

  // Find FB and Vinted platforms
  const dbPlatforms = await db.platform.findMany({ where: { isArchived: false } });
  const fbPlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("facebook"));
  const vintedPlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("vinted"));

  const fbWhere = fbPlatform ? { platformId: fbPlatform.id } : { platform: { name: { contains: "facebook", mode: "insensitive" as any } } };
  const vintedWhere = vintedPlatform ? { platformId: vintedPlatform.id } : { platform: { name: { contains: "vinted", mode: "insensitive" as any } } };

  // Row 2 Queries: Facebook Dedicated Operations
  const [
    itTotalFbAccounts,
    itFbVerifiedAccounts,
    itFbUnverifiedAccounts,
    itFbMarketplaceIssues,
    itFbIdentityAccounts,
    itFbSuspendedMarketplaces
  ] = await Promise.all([
    db.account.count({ where: { ...companyFilter, isArchived: false, ...fbWhere } }),
    db.account.count({ where: { ...companyFilter, isArchived: false, verificationStatus: "Yes", ...fbWhere } }),
    db.account.count({ where: { ...companyFilter, isArchived: false, verificationStatus: "No", ...fbWhere } }),
    db.account.count({ where: { ...companyFilter, status: "SORTED", issueType: "Marketplace Issue", isArchived: false, ...fbWhere } }),
    db.account.count({ where: { ...companyFilter, status: "SORTED", issueType: "Identity Issue", isArchived: false, ...fbWhere } }),
    db.account.count({ where: { ...companyFilter, status: "SORTED", issueType: "Suspended", isArchived: false, ...fbWhere } })
  ]);

  // Row 3 Queries: Vinted Dedicated Operations
  const [
    itTotalVintedAccounts,
    itVintedVerified,
    itVintedUnverified,
    itVintedSuspended
  ] = await Promise.all([
    db.account.count({ where: { ...companyFilter, isArchived: false, ...vintedWhere } }),
    db.account.count({ where: { ...companyFilter, isArchived: false, verificationStatus: "Yes", ...vintedWhere } }),
    db.account.count({ where: { ...companyFilter, isArchived: false, verificationStatus: "No", ...vintedWhere } }),
    db.account.count({ where: { ...companyFilter, status: "SORTED", issueType: "Suspended", isArchived: false, ...vintedWhere } })
  ]);

  // Team Lead specific metrics
  let combinedStats = {
    totalCombinedAccounts: 0,
    combinedFbTarget: 0,

    fbTotalCombined: 0,
    fbActiveCombined: 0,
    fbVerifiedCombined: 0,
    fbUnverifiedCombined: 0,
    fbMarketplaceCombined: 0,
    fbIdentityCombined: 0,

    vintedTotalCombined: 0,
    vintedVerifiedCombined: 0,
    vintedUnverifiedCombined: 0,
    vintedSuspendedCombined: 0
  };

  let tlPersonalStats = {
    saTotalAccounts: 0,
    fbTotal: 0,
    fbActive: 0,
    fbVerified: 0,
    fbUnverified: 0,
    fbMarketplace: 0,
    fbIdentity: 0,
    fbSuspended: 0,
    fbTarget: 15,
    vintedTotal: 0,
    vintedVerified: 0,
    vintedUnverified: 0,
    vintedSuspended: 0,
    gumtreeTotal: 0,
    gumtreeVerified: 0,
    gumtreeUnverified: 0,
    gumtreeSuspended: 0
  };

  let tlGlobalFeed: any[] = [];

  // Sales Associate specific metrics
  // Load platform-specific counts for Sales Associate
  let saTotalAccounts = 0;
  
  // Facebook metrics
  let fbTotal = 0, fbActive = 0, fbVerified = 0, fbUnverified = 0;
  let fbMarketplace = 0, fbIdentity = 0, fbTarget = 15, fbSuspended = 0;
  
  // Vinted metrics
  let vintedTotal = 0, vintedVerified = 0, vintedUnverified = 0, vintedSuspended = 0;
  
  // Gumtree metrics
  let gumtreeTotal = 0, gumtreeVerified = 0, gumtreeUnverified = 0, gumtreeSuspended = 0;

  if (user.role === "TEAM_LEAD") {
    const [rulesList, dbPlatforms, teamMembers] = await Promise.all([
      db.rule.findMany({ where: { companyId: user.companyId || "" } }),
      db.platform.findMany({ where: { isArchived: false } }),
      db.user.findMany({ where: { teamLeadId: user.id, isArchived: false }, select: { id: true } })
    ]);

    const teamUserIds = [user.id, ...teamMembers.map(m => m.id)];

    const targetRuleFB = rulesList.find(r => r.key === "targetToMaintainFB");
    const targetRuleGlobal = rulesList.find(r => r.key === "targetToMaintain");
    const fbTarget = targetRuleFB ? (parseInt(targetRuleFB.value, 10) || 15) : (targetRuleGlobal ? (parseInt(targetRuleGlobal.value, 10) || 15) : 15);
    const combinedFbTarget = fbTarget * teamUserIds.length;

    const fbPlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("facebook"));
    const vintedPlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("vinted"));
    const gumtreePlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("gumtree"));

    const fbWhere = fbPlatform ? { platformId: fbPlatform.id } : { platform: { name: { contains: "facebook", mode: "insensitive" as any } } };
    const vintedWhere = vintedPlatform ? { platformId: vintedPlatform.id } : { platform: { name: { contains: "vinted", mode: "insensitive" as any } } };
    const gumtreeWhere = gumtreePlatform ? { platformId: gumtreePlatform.id } : { platform: { name: { contains: "gumtree", mode: "insensitive" as any } } };

    const [
      _totalCombinedAccounts,
      _fbTotalCombined,
      _fbActiveCombined,
      _fbVerifiedCombined,
      _fbUnverifiedCombined,
      _fbMarketplaceCombined,
      _fbIdentityCombined,
      _vintedTotalCombined,
      _vintedVerifiedCombined,
      _vintedUnverifiedCombined,
      _vintedSuspendedCombined,

      _saTotalAccounts,
      _fbTotal, _fbActive, _fbVerified, _fbUnverified, _fbMarketplace, _fbIdentity, _fbSuspended,
      _vintedTotal, _vintedVerified, _vintedUnverified, _vintedSuspended,
      _gumtreeTotal, _gumtreeVerified, _gumtreeUnverified, _gumtreeSuspended,

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

      db.account.count({ where: { createdById: user.id, isArchived: false } }),
      db.account.count({ where: { createdById: user.id, isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: user.id, status: "SORTED", issueType: { notIn: ["Marketplace Issue", "Identity Issue", "Suspended"] }, isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: user.id, verificationStatus: "Yes", isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: user.id, verificationStatus: "No", isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: user.id, status: "SORTED", issueType: "Marketplace Issue", isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: user.id, status: "SORTED", issueType: "Identity Issue", isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: user.id, status: "SORTED", issueType: "Suspended", isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: user.id, isArchived: false, ...vintedWhere } }),
      db.account.count({ where: { createdById: user.id, verificationStatus: "Yes", isArchived: false, ...vintedWhere } }),
      db.account.count({ where: { createdById: user.id, verificationStatus: "No", isArchived: false, ...vintedWhere } }),
      db.account.count({ where: { createdById: user.id, status: "SORTED", issueType: "Suspended", isArchived: false, ...vintedWhere } }),
      db.account.count({ where: { createdById: user.id, isArchived: false, ...gumtreeWhere } }),
      db.account.count({ where: { createdById: user.id, verificationStatus: "Yes", isArchived: false, ...gumtreeWhere } }),
      db.account.count({ where: { createdById: user.id, verificationStatus: "No", isArchived: false, ...gumtreeWhere } }),
      db.account.count({ where: { createdById: user.id, status: "SORTED", issueType: "Suspended", isArchived: false, ...gumtreeWhere } }),

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

    combinedStats = {
      totalCombinedAccounts: _totalCombinedAccounts,
      combinedFbTarget,
      fbTotalCombined: _fbTotalCombined,
      fbActiveCombined: _fbActiveCombined,
      fbVerifiedCombined: _fbVerifiedCombined,
      fbUnverifiedCombined: _fbUnverifiedCombined,
      fbMarketplaceCombined: _fbMarketplaceCombined,
      fbIdentityCombined: _fbIdentityCombined,
      vintedTotalCombined: _vintedTotalCombined,
      vintedVerifiedCombined: _vintedVerifiedCombined,
      vintedUnverifiedCombined: _vintedUnverifiedCombined,
      vintedSuspendedCombined: _vintedSuspendedCombined
    };

    tlPersonalStats = {
      saTotalAccounts: _saTotalAccounts,
      fbTotal: _fbTotal,
      fbActive: _fbActive,
      fbVerified: _fbVerified,
      fbUnverified: _fbUnverified,
      fbMarketplace: _fbMarketplace,
      fbIdentity: _fbIdentity,
      fbSuspended: _fbSuspended,
      fbTarget,
      vintedTotal: _vintedTotal,
      vintedVerified: _vintedVerified,
      vintedUnverified: _vintedUnverified,
      vintedSuspended: _vintedSuspended,
      gumtreeTotal: _gumtreeTotal,
      gumtreeVerified: _gumtreeVerified,
      gumtreeUnverified: _gumtreeUnverified,
      gumtreeSuspended: _gumtreeSuspended
    };

    tlGlobalFeed = feed;
  }

  if (user.role === "SALES_ASSOCIATE") {
    const [rulesList, dbPlatforms] = await Promise.all([
      db.rule.findMany({ where: { companyId: user.companyId || "" } }),
      db.platform.findMany({ where: { isArchived: false } })
    ]);

    const targetRuleFB = rulesList.find(r => r.key === "targetToMaintainFB");
    const targetRuleGlobal = rulesList.find(r => r.key === "targetToMaintain");
    fbTarget = targetRuleFB ? (parseInt(targetRuleFB.value, 10) || 15) : (targetRuleGlobal ? (parseInt(targetRuleGlobal.value, 10) || 15) : 15);

    const fbPlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("facebook"));
    const vintedPlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("vinted"));
    const gumtreePlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("gumtree"));

    const fbWhere = fbPlatform ? { platformId: fbPlatform.id } : { platform: { name: { contains: "facebook", mode: "insensitive" as any } } };
    const vintedWhere = vintedPlatform ? { platformId: vintedPlatform.id } : { platform: { name: { contains: "vinted", mode: "insensitive" as any } } };
    const gumtreeWhere = gumtreePlatform ? { platformId: gumtreePlatform.id } : { platform: { name: { contains: "gumtree", mode: "insensitive" as any } } };

    const [
      _saTotalAccounts,
      _fbTotal, _fbActive, _fbVerified, _fbUnverified, _fbMarketplace, _fbIdentity, _fbSuspended,
      _vintedTotal, _vintedVerified, _vintedUnverified, _vintedSuspended,
      _gumtreeTotal, _gumtreeVerified, _gumtreeUnverified, _gumtreeSuspended
    ] = await Promise.all([
      db.account.count({ where: { createdById: user.id, isArchived: false } }),
      db.account.count({ where: { createdById: user.id, isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: user.id, status: "SORTED", issueType: { notIn: ["Marketplace Issue", "Identity Issue", "Suspended"] }, isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: user.id, verificationStatus: "Yes", isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: user.id, verificationStatus: "No", isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: user.id, status: "SORTED", issueType: "Marketplace Issue", isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: user.id, status: "SORTED", issueType: "Identity Issue", isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: user.id, status: "SORTED", issueType: "Suspended", isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: user.id, isArchived: false, ...vintedWhere } }),
      db.account.count({ where: { createdById: user.id, verificationStatus: "Yes", isArchived: false, ...vintedWhere } }),
      db.account.count({ where: { createdById: user.id, verificationStatus: "No", isArchived: false, ...vintedWhere } }),
      db.account.count({ where: { createdById: user.id, status: "SORTED", issueType: "Suspended", isArchived: false, ...vintedWhere } }),
      db.account.count({ where: { createdById: user.id, isArchived: false, ...gumtreeWhere } }),
      db.account.count({ where: { createdById: user.id, verificationStatus: "Yes", isArchived: false, ...gumtreeWhere } }),
      db.account.count({ where: { createdById: user.id, verificationStatus: "No", isArchived: false, ...gumtreeWhere } }),
      db.account.count({ where: { createdById: user.id, status: "SORTED", issueType: "Suspended", isArchived: false, ...gumtreeWhere } }),
    ]);

    saTotalAccounts = _saTotalAccounts;
    fbTotal = _fbTotal; fbActive = _fbActive; fbVerified = _fbVerified; fbUnverified = _fbUnverified;
    fbMarketplace = _fbMarketplace; fbIdentity = _fbIdentity; fbSuspended = _fbSuspended;
    vintedTotal = _vintedTotal; vintedVerified = _vintedVerified; vintedUnverified = _vintedUnverified; vintedSuspended = _vintedSuspended;
    gumtreeTotal = _gumtreeTotal; gumtreeVerified = _gumtreeVerified; gumtreeUnverified = _gumtreeUnverified; gumtreeSuspended = _gumtreeSuspended;
  }

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      {/* Welcome Area */}
      {user.role !== "SALES_ASSOCIATE" && user.role !== "TEAM_LEAD" && (
        <div className="glass-panel" style={{
          padding: "1.75rem 2rem",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          position: "relative",
          zIndex: 50
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }} className="text-gold-gradient">
              WELCOME BACK, {user.name?.toUpperCase() || "OPERATOR"}
            </h1>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Current node operations running at normal threshold parameters.
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <NotificationBell />
          </div>
        </div>
      )}

      {/* KPI Cards Grid / Dashboards */}
      {user.role === "SALES_ASSOCIATE" ? (
        <SalesAssociateDashboard 
          userName={user.name || "OPERATOR"}
          initialStats={{
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
          }}
        />
      ) : user.role === "TEAM_LEAD" ? (
        <TeamLeadDashboard 
          userName={user.name || "OPERATOR"}
          combinedStats={combinedStats}
          personalStats={tlPersonalStats}
          globalFeed={tlGlobalFeed}
        />
      ) : (
        <>
          {/* New Top-Level Global KPI Row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.5rem",
            marginBottom: "1.5rem"
          }}>
            {/* Card 1: TOTAL ACCOUNTS (OVERALL) */}
            <div className="glass-panel kpi-card kpi-info" style={{
              background: "linear-gradient(135deg, #0250A1 0%, #0077B6 100%)",
              color: "#FFFFFF",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 8px 32px rgba(2, 80, 161, 0.15)"
            }}>
              <div className="kpi-card-glow" style={{ opacity: 0.1 }}></div>
              <div className="kpi-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="kpi-title" style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Total Accounts (Overall)
                </span>
                <div className="kpi-icon-wrapper" style={{ background: "rgba(255, 255, 255, 0.1)", color: "#FFFFFF" }}>
                  <Database size={16} />
                </div>
              </div>
              <div className="kpi-value" style={{ fontSize: "2.5rem", fontWeight: 800, margin: "0.5rem 0", color: "#FFFFFF" }}>
                {totalAccounts < 10 ? `0${totalAccounts}` : totalAccounts}
              </div>
              <div className="kpi-footer" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "0.5rem", fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.6)" }}>
                <span>Company-wide aggregated accounts database</span>
              </div>
            </div>

            {/* Card 2: TOTAL OFFICE TARGET */}
            <div className="glass-panel kpi-card kpi-info" style={{
              background: "linear-gradient(135deg, #D4AF37 0%, #AA8F24 100%)",
              color: "#FFFFFF",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 8px 32px rgba(212, 175, 55, 0.15)"
            }}>
              <div className="kpi-card-glow" style={{ opacity: 0.1 }}></div>
              <div className="kpi-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="kpi-title" style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Total Office Target
                </span>
                <div className="kpi-icon-wrapper" style={{ background: "rgba(255, 255, 255, 0.1)", color: "#FFFFFF" }}>
                  <Target size={16} />
                </div>
              </div>
              <div className="kpi-value" style={{ fontSize: "2.5rem", fontWeight: 800, margin: "0.5rem 0", color: "#FFFFFF" }}>
                {totalOfficeTarget < 10 ? `0${totalOfficeTarget}` : totalOfficeTarget}
              </div>
              <div className="kpi-footer" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "0.5rem", fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.6)" }}>
                <span>Combined operational goals of {companyTeamLeadsCount} team lead{companyTeamLeadsCount === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>

          {/* Row 2: Facebook Dedicated Operations */}
          <div style={{ marginBottom: "1rem", marginTop: "2rem" }}>
            <h2 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--gold-primary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              💻 Facebook Dedicated Operations
            </h2>
          </div>

          <div className="fb-operations-grid">
            {/* Card 1: TOTAL FB ACCOUNTS */}
            <Link href={`/master-accounts-pool?platform=${fbPlatform?.id || "ALL"}`} style={{ textDecoration: "none", cursor: "pointer", display: "block" }}>
              <div className="glass-panel kpi-card kpi-info" style={{ height: "100%" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Total FB Accounts</span>
                  <div className="kpi-icon-wrapper"><Database size={16} /></div>
                </div>
                <div className="kpi-value">{itTotalFbAccounts < 10 ? `0${itTotalFbAccounts}` : itTotalFbAccounts}</div>
                <div className="kpi-footer">
                  <span>Active company registry</span>
                </div>
              </div>
            </Link>

            {/* Card 2: TOTAL VERIFIED ACCOUNTS */}
            <Link href={`/master-accounts-pool?platform=${fbPlatform?.id || "ALL"}&status=ACTIVE`} style={{ textDecoration: "none", cursor: "pointer", display: "block" }}>
              <div className="glass-panel kpi-card kpi-success" style={{ height: "100%" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Total Verified Accounts</span>
                  <div className="kpi-icon-wrapper"><ShieldCheck size={16} /></div>
                </div>
                <div className="kpi-value">{itFbVerifiedAccounts < 10 ? `0${itFbVerifiedAccounts}` : itFbVerifiedAccounts}</div>
                <div className="kpi-footer">
                  <span>Cleared verification checks</span>
                </div>
              </div>
            </Link>

            {/* Card 3: TOTAL UNVERIFIED ACCOUNTS */}
            <Link href={`/master-accounts-pool?platform=${fbPlatform?.id || "ALL"}`} style={{ textDecoration: "none", cursor: "pointer", display: "block" }}>
              <div className="glass-panel kpi-card kpi-warning" style={{ height: "100%" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Total Unverified Accounts</span>
                  <div className="kpi-icon-wrapper"><Clock size={16} /></div>
                </div>
                <div className="kpi-value">{itFbUnverifiedAccounts < 10 ? `0${itFbUnverifiedAccounts}` : itFbUnverifiedAccounts}</div>
                <div className="kpi-footer">
                  <span>Profiles awaiting setup</span>
                </div>
              </div>
            </Link>

            {/* Card 4: FB MARKETPLACE ISSUE */}
            <Link href={`/master-accounts-pool?platform=${fbPlatform?.id || "ALL"}&search=Marketplace+Issue`} style={{ textDecoration: "none", cursor: "pointer", display: "block" }}>
              <div className="glass-panel kpi-card kpi-warning" style={{
                height: "100%",
                borderLeft: "4px solid #F59E0B"
              }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Fb Marketplace Issue</span>
                  <div className="kpi-icon-wrapper" style={{ color: "#F59E0B" }}><Store size={16} /></div>
                </div>
                <div className="kpi-value" style={{ color: "#F59E0B" }}>{itFbMarketplaceIssues < 10 ? `0${itFbMarketplaceIssues}` : itFbMarketplaceIssues}</div>
                <div className="kpi-footer">
                  <span>Accounts with marketplace blocks</span>
                </div>
              </div>
            </Link>

            {/* Card 5: FB IDENTITY ACCOUNTS */}
            <Link href={`/master-accounts-pool?platform=${fbPlatform?.id || "ALL"}&search=Identity+Issue`} style={{ textDecoration: "none", cursor: "pointer", display: "block" }}>
              <div className="glass-panel kpi-card kpi-info" style={{ height: "100%" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">FB Identity Accounts</span>
                  <div className="kpi-icon-wrapper"><AlertTriangle size={16} /></div>
                </div>
                <div className="kpi-value">{itFbIdentityAccounts < 10 ? `0${itFbIdentityAccounts}` : itFbIdentityAccounts}</div>
                <div className="kpi-footer">
                  <span>Locked under checkpoints</span>
                </div>
              </div>
            </Link>

            {/* Card 6: SUSPENDED MARKETPLACES */}
            <Link href={`/master-accounts-pool?platform=${fbPlatform?.id || "ALL"}&search=Suspended`} style={{ textDecoration: "none", cursor: "pointer", display: "block" }}>
              <div className="glass-panel kpi-card kpi-warning" style={{
                height: "100%",
                borderLeft: "4px solid #F59E0B"
              }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Suspended Marketplaces</span>
                  <div className="kpi-icon-wrapper" style={{ color: "#F59E0B" }}><MinusCircle size={16} /></div>
                </div>
                <div className="kpi-value" style={{ color: "#F59E0B" }}>{itFbSuspendedMarketplaces < 10 ? `0${itFbSuspendedMarketplaces}` : itFbSuspendedMarketplaces}</div>
                <div className="kpi-footer">
                  <span>Suspended platform entities</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Row 3: Vinted Dedicated Operations */}
          <div style={{ marginBottom: "1rem", marginTop: "2rem" }}>
            <h2 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--gold-primary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              🛍️ Vinted Dedicated Operations
            </h2>
          </div>

          <div className="vinted-operations-grid">
            {/* Card 1: TOTAL VINTED ACCOUNTS */}
            <Link href={`/master-accounts-pool?platform=${vintedPlatform?.id || "ALL"}`} style={{ textDecoration: "none", cursor: "pointer", display: "block" }}>
              <div className="glass-panel kpi-card kpi-info" style={{ height: "100%" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Total Vinted Accounts</span>
                  <div className="kpi-icon-wrapper"><Database size={16} /></div>
                </div>
                <div className="kpi-value">{itTotalVintedAccounts < 10 ? `0${itTotalVintedAccounts}` : itTotalVintedAccounts}</div>
                <div className="kpi-footer">
                  <span>Active company Vinted pool</span>
                </div>
              </div>
            </Link>

            {/* Card 2: VINTED VERIFIED */}
            <Link href={`/master-accounts-pool?platform=${vintedPlatform?.id || "ALL"}`} style={{ textDecoration: "none", cursor: "pointer", display: "block" }}>
              <div className="glass-panel kpi-card kpi-success" style={{ height: "100%" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Vinted Verified</span>
                  <div className="kpi-icon-wrapper"><ShieldCheck size={16} /></div>
                </div>
                <div className="kpi-value">{itVintedVerified < 10 ? `0${itVintedVerified}` : itVintedVerified}</div>
                <div className="kpi-footer">
                  <span>Cleared operational profiles</span>
                </div>
              </div>
            </Link>

            {/* Card 3: VINTED UNVERIFIED */}
            <Link href={`/master-accounts-pool?platform=${vintedPlatform?.id || "ALL"}`} style={{ textDecoration: "none", cursor: "pointer", display: "block" }}>
              <div className="glass-panel kpi-card kpi-warning" style={{ height: "100%" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Vinted Unverified</span>
                  <div className="kpi-icon-wrapper"><Clock size={16} /></div>
                </div>
                <div className="kpi-value">{itVintedUnverified < 10 ? `0${itVintedUnverified}` : itVintedUnverified}</div>
                <div className="kpi-footer">
                  <span>Awaiting setup details</span>
                </div>
              </div>
            </Link>

            {/* Card 4: VINTED SUSPENDED */}
            <Link href={`/master-accounts-pool?platform=${vintedPlatform?.id || "ALL"}&search=Suspended`} style={{ textDecoration: "none", cursor: "pointer", display: "block" }}>
              <div className="glass-panel kpi-card kpi-danger" style={{
                height: "100%",
                borderLeft: "4px solid #EF4444"
              }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Vinted Suspended</span>
                  <div className="kpi-icon-wrapper" style={{ color: "#EF4444" }}><MinusCircle size={16} /></div>
                </div>
                <div className="kpi-value" style={{ color: "#EF4444" }}>{itVintedSuspended < 10 ? `0${itVintedSuspended}` : itVintedSuspended}</div>
                <div className="kpi-footer">
                  <span>Awaiting IT intervention</span>
                </div>
              </div>
            </Link>
          </div>
        </>
      )}

      {["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"].includes(user.role) && (
        <PendingOnboardingList pendingUsers={pendingUsers} />
      )}
    </DashboardLayout>
  );
}
