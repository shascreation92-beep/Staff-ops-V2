import React from "react";
import { enforceAuth, getCompanyFilter } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
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
    const rulesList = await db.rule.findMany({
      where: { companyId: user.companyId || "" }
    });

    const targetRuleFB = rulesList.find(r => r.key === "targetToMaintainFB");
    const targetRuleGlobal = rulesList.find(r => r.key === "targetToMaintain");
    fbTarget = targetRuleFB ? (parseInt(targetRuleFB.value, 10) || 15) : (targetRuleGlobal ? (parseInt(targetRuleGlobal.value, 10) || 15) : 15);

    const dbPlatforms = await db.platform.findMany({
      where: { isArchived: false }
    });

    const fbPlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("facebook"));
    const vintedPlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("vinted"));
    const gumtreePlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("gumtree"));

    const fbWhere = fbPlatform ? { platformId: fbPlatform.id } : { platform: { name: { contains: "facebook", mode: "insensitive" as any } } };
    const vintedWhere = vintedPlatform ? { platformId: vintedPlatform.id } : { platform: { name: { contains: "vinted", mode: "insensitive" as any } } };
    const gumtreeWhere = gumtreePlatform ? { platformId: gumtreePlatform.id } : { platform: { name: { contains: "gumtree", mode: "insensitive" as any } } };

    // Overall Total Accounts
    saTotalAccounts = await db.account.count({
      where: { createdById: user.id, isArchived: false }
    });

    // Facebook
    fbTotal = await db.account.count({
      where: { createdById: user.id, isArchived: false, ...fbWhere }
    });
    fbActive = await db.account.count({
      where: { createdById: user.id, status: "ACTIVE", isArchived: false, ...fbWhere }
    });
    fbVerified = await db.account.count({
      where: { createdById: user.id, verificationStatus: "Yes", isArchived: false, ...fbWhere }
    });
    fbUnverified = await db.account.count({
      where: { createdById: user.id, verificationStatus: "No", isArchived: false, ...fbWhere }
    });
    fbMarketplace = await db.account.count({
      where: { createdById: user.id, status: "REJECTED", isArchived: false, ...fbWhere }
    });
    fbIdentity = await db.account.count({
      where: { createdById: user.id, status: "UNDER_REVIEW", verificationStatus: "No", isArchived: false, ...fbWhere }
    });
    fbSuspended = await db.account.count({
      where: { createdById: user.id, status: "REJECTED", isArchived: false, ...fbWhere }
    });

    // Vinted
    vintedTotal = await db.account.count({
      where: { createdById: user.id, isArchived: false, ...vintedWhere }
    });
    vintedVerified = await db.account.count({
      where: { createdById: user.id, verificationStatus: "Yes", isArchived: false, ...vintedWhere }
    });
    vintedUnverified = await db.account.count({
      where: { createdById: user.id, verificationStatus: "No", isArchived: false, ...vintedWhere }
    });
    vintedSuspended = await db.account.count({
      where: { createdById: user.id, status: "REJECTED", isArchived: false, ...vintedWhere }
    });

    // Gumtree
    gumtreeTotal = await db.account.count({
      where: { createdById: user.id, isArchived: false, ...gumtreeWhere }
    });
    gumtreeVerified = await db.account.count({
      where: { createdById: user.id, verificationStatus: "Yes", isArchived: false, ...gumtreeWhere }
    });
    gumtreeUnverified = await db.account.count({
      where: { createdById: user.id, verificationStatus: "No", isArchived: false, ...gumtreeWhere }
    });
    gumtreeSuspended = await db.account.count({
      where: { createdById: user.id, status: "REJECTED", isArchived: false, ...gumtreeWhere }
    });
  }

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      {/* Welcome Area */}
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

      {/* KPI Cards Grid */}
      {user.role === "SALES_ASSOCIATE" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Section 1: Overall Operations */}
          <div className="glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--gold-primary)", marginBottom: "1.25rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Overall Operations
            </h2>
            <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow" style={{ opacity: 0.15 }}></div>
                <div className="kpi-header">
                  <span className="kpi-title">Total Account</span>
                  <div className="kpi-icon-wrapper"><Database size={18} /></div>
                </div>
                <div className="kpi-value">{saTotalAccounts}</div>
                <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
                  <span>Total registered accounts across all platforms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Facebook Operations */}
          <div className="glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--gold-primary)", marginBottom: "1.25rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Facebook Operations
            </h2>
            <div className="kpi-grid">
              {/* Card 1: FB Total Accounts */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">FB Total Acc.</span>
                  <div className="kpi-icon-wrapper"><Database size={18} /></div>
                </div>
                <div className="kpi-value">{fbTotal}</div>
                <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
                  <span>Facebook registered accounts</span>
                </div>
              </div>

              {/* Card 2: FB Active Acc. */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">FB Active Acc.</span>
                  <div className="kpi-icon-wrapper"><CheckCircle size={18} style={{ color: "var(--color-success)" }} /></div>
                </div>
                <div className="kpi-value">{fbActive}</div>
                <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
                  <span>Live operational nodes</span>
                </div>
              </div>

              {/* Card 3: FB Verified Acc. */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">FB Verified Acc.</span>
                  <div className="kpi-icon-wrapper"><ShieldCheck size={18} style={{ color: "var(--gold-premium)" }} /></div>
                </div>
                <div className="kpi-value">{fbVerified}</div>
                <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
                  <span>Verification rate: {fbTotal > 0 ? Math.round((fbVerified / fbTotal) * 100) : 0}%</span>
                </div>
              </div>

              {/* Card 4: FB Unverified Acc. */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">FB Unverified Acc.</span>
                  <div className="kpi-icon-wrapper"><ShieldAlert size={18} style={{ color: "var(--orange-accent)" }} /></div>
                </div>
                <div className="kpi-value">{fbUnverified}</div>
                <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
                  <span>Awaiting verification submit</span>
                </div>
              </div>

              {/* Card 5: FB Marketplace Issue */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">FB Marketplace Issue</span>
                  <div className="kpi-icon-wrapper"><AlertCircle size={18} style={{ color: "var(--color-danger)" }} /></div>
                </div>
                <div className="kpi-value">{fbMarketplace}</div>
                <div className="kpi-footer" style={{ color: fbMarketplace > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
                  <span>Platform level rejections</span>
                </div>
              </div>

              {/* Card 6: FB Identity Issue */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">FB Identity Issue</span>
                  <div className="kpi-icon-wrapper"><HelpCircle size={18} style={{ color: "var(--color-warning)" }} /></div>
                </div>
                <div className="kpi-value">{fbIdentity}</div>
                <div className="kpi-footer" style={{ color: fbIdentity > 0 ? "var(--color-warning)" : "var(--text-muted)" }}>
                  <span>Verification hold status</span>
                </div>
              </div>

              {/* Card 7: Target to Maintain FB */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Target to Maintain</span>
                  <div className="kpi-icon-wrapper"><Target size={18} style={{ color: "var(--gold-premium)" }} /></div>
                </div>
                <div className="kpi-value">{fbTarget}</div>
                <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
                  <span>Monthly FB quota target</span>
                </div>
              </div>

              {/* Card 8: FB Total Suspended */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Total Suspended Acc.</span>
                  <div className="kpi-icon-wrapper"><ShieldAlert size={18} style={{ color: "var(--color-danger)" }} /></div>
                </div>
                <div className="kpi-value">{fbSuspended}</div>
                <div className="kpi-footer" style={{ color: fbSuspended > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
                  <span>Active database suspensions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Vinted Operations */}
          <div className="glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--gold-primary)", marginBottom: "1.25rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Vinted Operations
            </h2>
            <div className="kpi-grid">
              {/* Card 1: Vinted Total */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Vinted Total Accounts</span>
                  <div className="kpi-icon-wrapper"><Database size={18} /></div>
                </div>
                <div className="kpi-value">{vintedTotal}</div>
                <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
                  <span>Vinted registered accounts</span>
                </div>
              </div>

              {/* Card 2: Vinted Verified */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Vinted Verified</span>
                  <div className="kpi-icon-wrapper"><ShieldCheck size={18} style={{ color: "var(--gold-premium)" }} /></div>
                </div>
                <div className="kpi-value">{vintedVerified}</div>
                <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
                  <span>Verification rate: {vintedTotal > 0 ? Math.round((vintedVerified / vintedTotal) * 100) : 0}%</span>
                </div>
              </div>

              {/* Card 3: Vinted Unverified */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Vinted Unverified</span>
                  <div className="kpi-icon-wrapper"><ShieldAlert size={18} style={{ color: "var(--orange-accent)" }} /></div>
                </div>
                <div className="kpi-value">{vintedUnverified}</div>
                <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
                  <span>Awaiting verification submit</span>
                </div>
              </div>

              {/* Card 4: Vinted Suspended */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Vinted Suspended Accounts</span>
                  <div className="kpi-icon-wrapper"><ShieldAlert size={18} style={{ color: "var(--color-danger)" }} /></div>
                </div>
                <div className="kpi-value">{vintedSuspended}</div>
                <div className="kpi-footer" style={{ color: vintedSuspended > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
                  <span>Active database suspensions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Gumtree Operations */}
          <div className="glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--gold-primary)", marginBottom: "1.25rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Gumtree Operations
            </h2>
            <div className="kpi-grid">
              {/* Card 1: Gumtree Total */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Gumtree Total Accounts</span>
                  <div className="kpi-icon-wrapper"><Database size={18} /></div>
                </div>
                <div className="kpi-value">{gumtreeTotal}</div>
                <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
                  <span>Gumtree registered accounts</span>
                </div>
              </div>

              {/* Card 2: Gumtree Verified */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Gumtree Verified</span>
                  <div className="kpi-icon-wrapper"><ShieldCheck size={18} style={{ color: "var(--gold-premium)" }} /></div>
                </div>
                <div className="kpi-value">{gumtreeVerified}</div>
                <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
                  <span>Verification rate: {gumtreeTotal > 0 ? Math.round((gumtreeVerified / gumtreeTotal) * 100) : 0}%</span>
                </div>
              </div>

              {/* Card 3: Gumtree Unverified */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Gumtree Unverified</span>
                  <div className="kpi-icon-wrapper"><ShieldAlert size={18} style={{ color: "var(--orange-accent)" }} /></div>
                </div>
                <div className="kpi-value">{gumtreeUnverified}</div>
                <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
                  <span>Awaiting verification submit</span>
                </div>
              </div>

              {/* Card 4: Gumtree Suspended */}
              <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="kpi-card-glow"></div>
                <div className="kpi-header">
                  <span className="kpi-title">Gumtree Suspended Accounts</span>
                  <div className="kpi-icon-wrapper"><ShieldAlert size={18} style={{ color: "var(--color-danger)" }} /></div>
                </div>
                <div className="kpi-value">{gumtreeSuspended}</div>
                <div className="kpi-footer" style={{ color: gumtreeSuspended > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
                  <span>Active database suspensions</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="kpi-grid">
          <div className="glass-panel kpi-card">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Total Accounts</span>
              <div className="kpi-icon-wrapper"><Database size={18} /></div>
            </div>
            <div className="kpi-value">{totalAccounts}</div>
            <div className="kpi-footer kpi-trend-up">
              <span>Scoped shard db records</span>
            </div>
          </div>

          <div className="glass-panel kpi-card">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Verified Accounts</span>
              <div className="kpi-icon-wrapper"><ShieldCheck size={18} /></div>
            </div>
            <div className="kpi-value">{verifiedAccounts}</div>
            <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
              <span>Verification rate: {totalAccounts > 0 ? Math.round((verifiedAccounts / totalAccounts) * 100) : 0}%</span>
            </div>
          </div>

          <div className="glass-panel kpi-card">
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

          <div className="glass-panel kpi-card">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Active Employees</span>
              <div className="kpi-icon-wrapper"><Users size={18} /></div>
            </div>
            <div className="kpi-value">{activeEmployees}</div>
            <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
              <span>Hardware/VPN catalog items</span>
            </div>
          </div>

          {user.role === "SUPER_ADMIN" ? (
            <div className="glass-panel kpi-card">
              <div className="kpi-card-glow"></div>
              <div className="kpi-header">
                <span className="kpi-title">Total Companies</span>
                <div className="kpi-icon-wrapper"><Building size={18} /></div>
              </div>
              <div className="kpi-value">{companyCount}</div>
              <div className="kpi-footer kpi-trend-up">
                <span>SaaS tenant company count</span>
              </div>
            </div>
          ) : (
            <div className="glass-panel kpi-card">
              <div className="kpi-card-glow"></div>
              <div className="kpi-header">
                <span className="kpi-title">Teammates</span>
                <div className="kpi-icon-wrapper"><UserCheck size={18} /></div>
              </div>
              <div className="kpi-value">{totalSystemUsers}</div>
              <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
                <span>Users in company registry</span>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
