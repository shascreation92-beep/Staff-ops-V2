import React from "react";
import { enforceAuth, getCompanyFilter } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
import DashboardLayout from "@/components/DashboardLayout";
import SalesAssociateDashboard from "@/components/SalesAssociateDashboard";
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
  Target
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
      {user.role !== "SALES_ASSOCIATE" && (
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

      {/* KPI Cards Grid */}
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
      ) : (
        <div className="kpi-grid">
          <div className="glass-panel kpi-card kpi-info">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Total Accounts</span>
              <div className="kpi-icon-wrapper"><Database size={18} /></div>
            </div>
            <div className="kpi-value">{totalAccounts}</div>
            <div className="kpi-footer">
              <span>Scoped shard db records</span>
            </div>
          </div>

          <div className="glass-panel kpi-card kpi-success">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Verified Accounts</span>
              <div className="kpi-icon-wrapper"><ShieldCheck size={18} /></div>
            </div>
            <div className="kpi-value">{verifiedAccounts}</div>
            <div className="kpi-footer">
              <span>Verification rate: {totalAccounts > 0 ? Math.round((verifiedAccounts / totalAccounts) * 100) : 0}%</span>
            </div>
          </div>

          <div className="glass-panel kpi-card kpi-warning">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Pending Reviews</span>
              <div className="kpi-icon-wrapper"><Clock size={18} /></div>
            </div>
            <div className="kpi-value">{pendingReviews}</div>
            <div className="kpi-footer" style={{ color: pendingReviews > 0 ? "var(--color-warning)" : "var(--text-muted)" }}>
              <span>Awaiting authorization</span>
            </div>
          </div>

          <div className="glass-panel kpi-card kpi-info">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Active Employees</span>
              <div className="kpi-icon-wrapper"><Users size={18} /></div>
            </div>
            <div className="kpi-value">{activeEmployees}</div>
            <div className="kpi-footer">
              <span>Hardware/VPN catalog items</span>
            </div>
          </div>

          {user.role === "SUPER_ADMIN" ? (
            <div className="glass-panel kpi-card kpi-info">
              <div className="kpi-card-glow"></div>
              <div className="kpi-header">
                <span className="kpi-title">Total Companies</span>
                <div className="kpi-icon-wrapper"><Building size={18} /></div>
              </div>
              <div className="kpi-value">{companyCount}</div>
              <div className="kpi-footer">
                <span>SaaS tenant company count</span>
              </div>
            </div>
          ) : (
            <div className="glass-panel kpi-card kpi-info">
              <div className="kpi-card-glow"></div>
              <div className="kpi-header">
                <span className="kpi-title">Teammates</span>
                <div className="kpi-icon-wrapper"><UserCheck size={18} /></div>
              </div>
              <div className="kpi-value">{totalSystemUsers}</div>
              <div className="kpi-footer">
                <span>Users in company registry</span>
              </div>
            </div>
          )}
        </div>
      )}

      {["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"].includes(user.role) && (
        <PendingOnboardingList pendingUsers={pendingUsers} />
      )}
    </DashboardLayout>
  );
}
