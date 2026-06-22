import React from "react";
import { enforceAuth, getCompanyFilter } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import TelemetryGauges from "@/components/TelemetryGauges";
import { 
  Database, 
  ShieldCheck, 
  Clock, 
  Users, 
  Building,
  Activity,
  UserCheck,
  ArrowUpRight,
  Shield
} from "lucide-react";
import Link from "next/link";

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

  // Fetch dashboard stats
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

  // Fetch recent activity audit logs
  const activityLogs = await db.auditlog.findMany({
    where: user.role === "SUPER_ADMIN" ? {} : {
      user: {
        companyId: user.companyId
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 5,
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

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

      {/* Telemetry and Activity Feed Grid */}
      <div className="dashboard-grid">
        {/* Left Side: VPS telemetry */}
        <TelemetryGauges />

        {/* Right Side: Activity Log Feed */}
        <div className="glass-panel activity-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Activity size={18} style={{ color: "var(--gold-primary)" }} />
              <span>Operation Logs</span>
            </h2>
            {user.role === "SUPER_ADMIN" && (
              <Link href="/audit-logs" style={{ fontSize: "0.75rem", color: "var(--gold-premium)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <span>View all</span> <ArrowUpRight size={12} />
              </Link>
            )}
          </div>

          <div className="activity-list">
            {activityLogs.length === 0 ? (
              <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                No recent database activities logged.
              </div>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="activity-item">
                  <div className="activity-indicator info"></div>
                  <div className="activity-details">
                    <span className="activity-item-title">
                      {log.action}
                    </span>
                    <span className="activity-item-desc">
                      {log.entity} {log.entityId ? `#${log.entityId.slice(0,8)}` : ""} by {log.user?.name || log.userEmail || "System"}
                    </span>
                    <span className="activity-item-time">
                      {new Date(log.createdAt).toLocaleString()} | {log.country || "Local"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
