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
  let saTotalAccounts = 0;
  let saActiveAccounts = 0;
  let saVerifiedAccounts = 0;
  let saUnverifiedAccounts = 0;
  let saMarketplaceIssues = 0;
  let saIdentityIssues = 0;
  let saTargetToMaintain = 15;
  let saTodaySuspensions = 0;

  if (user.role === "SALES_ASSOCIATE") {
    saTotalAccounts = await db.account.count({
      where: {
        createdById: user.id,
        isArchived: false
      }
    });

    saActiveAccounts = await db.account.count({
      where: {
        createdById: user.id,
        status: "ACTIVE",
        isArchived: false
      }
    });

    saVerifiedAccounts = await db.account.count({
      where: {
        createdById: user.id,
        verificationStatus: "Yes",
        isArchived: false
      }
    });

    saUnverifiedAccounts = await db.account.count({
      where: {
        createdById: user.id,
        verificationStatus: "No",
        isArchived: false
      }
    });

    saMarketplaceIssues = await db.account.count({
      where: {
        createdById: user.id,
        status: "REJECTED",
        isArchived: false
      }
    });

    saIdentityIssues = await db.account.count({
      where: {
        createdById: user.id,
        status: "UNDER_REVIEW",
        verificationStatus: "No",
        isArchived: false
      }
    });

    // Target to maintain: read from rules or default to 15
    const rulesList = await db.rule.findMany({
      where: {
        companyId: user.companyId || ""
      }
    });
    const targetRule = rulesList.find(r => r.key === "targetToMaintain");
    saTargetToMaintain = targetRule ? (parseInt(targetRule.value, 10) || 15) : 15;

    // Today suspensions
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    saTodaySuspensions = await db.account.count({
      where: {
        createdById: user.id,
        status: "REJECTED",
        updatedAt: { gte: todayStart },
        isArchived: false
      }
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
        gap: "1rem"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }} className="text-gold-gradient">
            WELCOME BACK, {user.name?.toUpperCase() || "OPERATOR"}
          </h1>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Current node operations running at normal threshold parameters.
          </span>
        </div>
        <div style={{
          display: "flex",
          gap: "1.5rem",
          fontSize: "0.8rem",
          fontFamily: "var(--font-mono)",
          color: "var(--text-muted)"
        }}>
          <div>
            ROLE: <span style={{ color: "var(--gold-primary)" }}>{user.role.replace("_", " ")}</span>
          </div>
          <div>
            SHARD DOMAIN: <span style={{ color: "var(--gold-primary)" }}>{companyName || "SYSTEM GLOBAL"}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {user.role === "SALES_ASSOCIATE" ? (
        <div className="kpi-grid">
          {/* Card 1: Total Account */}
          <div className="glass-panel kpi-card">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Total Account</span>
              <div className="kpi-icon-wrapper"><Database size={18} /></div>
            </div>
            <div className="kpi-value">{saTotalAccounts}</div>
            <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
              <span>Personal registered accounts</span>
            </div>
          </div>

          {/* Card 2: Active Accounts */}
          <div className="glass-panel kpi-card">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Active Accounts</span>
              <div className="kpi-icon-wrapper"><CheckCircle size={18} style={{ color: "var(--color-success)" }} /></div>
            </div>
            <div className="kpi-value">{saActiveAccounts}</div>
            <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
              <span>Live operational nodes</span>
            </div>
          </div>

          {/* Card 3: Verified Accounts */}
          <div className="glass-panel kpi-card">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Verified Accounts</span>
              <div className="kpi-icon-wrapper"><ShieldCheck size={18} style={{ color: "var(--gold-premium)" }} /></div>
            </div>
            <div className="kpi-value">{saVerifiedAccounts}</div>
            <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
              <span>Verification rate: {saTotalAccounts > 0 ? Math.round((saVerifiedAccounts / saTotalAccounts) * 100) : 0}%</span>
            </div>
          </div>

          {/* Card 4: Unverified Accounts */}
          <div className="glass-panel kpi-card">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Unverified Accounts</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} style={{ color: "var(--orange-accent)" }} /></div>
            </div>
            <div className="kpi-value">{saUnverifiedAccounts}</div>
            <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
              <span>Awaiting verification submit</span>
            </div>
          </div>

          {/* Card 5: Marketplace Issue */}
          <div className="glass-panel kpi-card">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Marketplace Issue</span>
              <div className="kpi-icon-wrapper"><AlertCircle size={18} style={{ color: "var(--color-danger)" }} /></div>
            </div>
            <div className="kpi-value">{saMarketplaceIssues}</div>
            <div className="kpi-footer" style={{ color: saMarketplaceIssues > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
              <span>Platform level rejections</span>
            </div>
          </div>

          {/* Card 6: Identity Issue */}
          <div className="glass-panel kpi-card">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Identity Issue</span>
              <div className="kpi-icon-wrapper"><HelpCircle size={18} style={{ color: "var(--color-warning)" }} /></div>
            </div>
            <div className="kpi-value">{saIdentityIssues}</div>
            <div className="kpi-footer" style={{ color: saIdentityIssues > 0 ? "var(--color-warning)" : "var(--text-muted)" }}>
              <span>Verification hold status</span>
            </div>
          </div>

          {/* Card 7: Target To Maintain */}
          <div className="glass-panel kpi-card">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Target To Maintain</span>
              <div className="kpi-icon-wrapper"><Target size={18} style={{ color: "var(--gold-premium)" }} /></div>
            </div>
            <div className="kpi-value">{saTargetToMaintain}</div>
            <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
              <span>Monthly operational quota</span>
            </div>
          </div>

          {/* Card 8: Today Suspension */}
          <div className="glass-panel kpi-card">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Today Suspension</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} style={{ color: "var(--color-danger)" }} /></div>
            </div>
            <div className="kpi-value">{saTodaySuspensions}</div>
            <div className="kpi-footer" style={{ color: saTodaySuspensions > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
              <span>Suspended in the last 24h</span>
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
