"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Database, 
  ShieldCheck, 
  CheckCircle, 
  ShieldAlert, 
  AlertCircle, 
  HelpCircle, 
  Target,
  Clock,
  ShieldX
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

interface CombinedStats {
  totalCombinedAccounts: number;
  combinedFbTarget: number;
  fbTotalCombined: number;
  fbActiveCombined: number;
  fbVerifiedCombined: number;
  fbUnverifiedCombined: number;
  fbMarketplaceCombined: number;
  fbIdentityCombined: number;
  vintedTotalCombined: number;
  vintedVerifiedCombined: number;
  vintedUnverifiedCombined: number;
  vintedSuspendedCombined: number;
}

interface PersonalStats {
  saTotalAccounts: number;
  fbTotal: number;
  fbActive: number;
  fbVerified: number;
  fbUnverified: number;
  fbMarketplace: number;
  fbIdentity: number;
  fbSuspended: number;
  fbTarget: number;
  vintedTotal: number;
  vintedVerified: number;
  vintedUnverified: number;
  vintedSuspended: number;
  gumtreeTotal: number;
  gumtreeVerified: number;
  gumtreeUnverified: number;
  gumtreeSuspended: number;
}

interface TeamLeadDashboardProps {
  userName: string;
  combinedStats: CombinedStats;
  personalStats: PersonalStats;
  globalFeed: any[];
}

export default function TeamLeadDashboard({ 
  userName, 
  combinedStats, 
  personalStats, 
  globalFeed 
}: TeamLeadDashboardProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const pollInterval = setInterval(() => {
      setIsSyncing(true);
      startTransition(() => {
        router.refresh();
      });
      setTimeout(() => setIsSyncing(false), 800);
    }, 5000); // Sync every 5 seconds

    return () => clearInterval(pollInterval);
  }, [router]);

  const renderLiveStatus = () => (
    <div 
      className="animate-pulse"
      style={{
        width: "7px",
        height: "7px",
        background: "#10B981",
        borderRadius: "50%",
        boxShadow: "0 0 8px #10B981",
        cursor: "help"
      }}
      title={isSyncing ? "Syncing..." : "Live Connected"}
    ></div>
  );

  const getStatusStyle = (acc: any) => {
    if (acc.status === "PENDING_TL") {
      return {
        color: "#60A5FA",
        text: "Requested to TL",
        bg: "rgba(96, 165, 250, 0.08)",
        border: "rgba(96, 165, 250, 0.25)"
      };
    }
    if (acc.status === "FORWARDED_TO_IT") {
      if (acc.user_account_createdByIdTouser?.role === "TEAM_LEAD") {
        return {
          color: "#A78BFA",
          text: "Direct to IT",
          bg: "rgba(167, 139, 250, 0.08)",
          border: "rgba(167, 139, 250, 0.25)"
        };
      }
      const tlName = acc.user_account_updatedByIdTouser?.name || "Udeen";
      return {
        color: "#A78BFA",
        text: `Approved by TL (${tlName})`,
        bg: "rgba(167, 139, 250, 0.08)",
        border: "rgba(167, 139, 250, 0.25)"
      };
    }
    if (acc.status === "IT_PENDING") {
      return {
        color: "#F59E0B",
        text: "Pending",
        bg: "rgba(245, 158, 11, 0.08)",
        border: "rgba(245, 158, 11, 0.25)"
      };
    }
    if (acc.status === "SORTED") {
      const issue = acc.issueType || "Active";
      if (issue === "Active") {
        return {
          color: "#22C55E",
          text: "Active",
          bg: "rgba(34, 197, 94, 0.08)",
          border: "rgba(34, 197, 94, 0.3)"
        };
      }
      if (issue === "Marketplace Issue") {
        return {
          color: "var(--color-warning)",
          text: "Marketplace Issue",
          bg: "rgba(245, 158, 11, 0.08)",
          border: "rgba(245, 158, 11, 0.25)"
        };
      }
      if (issue === "Suspended" || issue === "Suspension Issue") {
        return {
          color: "var(--color-danger)",
          text: "Suspension Issue",
          bg: "rgba(239, 68, 68, 0.1)",
          border: "rgba(239, 68, 68, 0.3)"
        };
      }
      if (issue === "Identity Issue") {
        return {
          color: "#0250A1",
          text: "Identity Issue",
          bg: "rgba(2, 80, 161, 0.08)",
          border: "rgba(2, 80, 161, 0.25)"
        };
      }
    }
    if (acc.status === "REJECTED") {
      return {
        color: "var(--color-danger)",
        text: "Rejected by TL",
        bg: "rgba(239, 68, 68, 0.1)",
        border: "rgba(239, 68, 68, 0.3)"
      };
    }
    return {
      color: "var(--text-secondary)",
      text: acc.status.replace(/_/g, " "),
      bg: "rgba(255, 255, 255, 0.02)",
      border: "var(--border-dim)"
    };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .fb-team-grid-forced {
          display: grid !important;
          grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
          gap: 1.25rem !important;
        }
        .vinted-team-grid-forced {
          display: grid !important;
          grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
          gap: 1.25rem !important;
        }
        @media (min-width: 768px) {
          .fb-team-grid-forced {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          .vinted-team-grid-forced {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
        }
      `}} />
      
      {/* Welcome Area & Live Sync status */}
      <div className="glass-panel" style={{
        padding: "1.75rem 2rem",
        marginBottom: "0.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1.5rem",
        position: "relative",
        zIndex: 50,
        background: "#FFFFFF"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <h1 className="text-gold-gradient" style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
            TEAM CONSOLE: {userName.toUpperCase()}
          </h1>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Aggregated team dashboard with global operations activity feeds.
          </span>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          {/* Pulse Live Sync */}
          {renderLiveStatus()}
          <NotificationBell />
        </div>
      </div>

      {/* 1. Top Combined KPI Cards Panel */}
      {/* Row 1: Overview & Goals */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", margin: 0 }}>
          📊 Team Overview & Goals
        </h3>
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {/* Card 1: Total Combined Accounts */}
          <div className="glass-panel kpi-card kpi-info">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Total Combined Accounts</span>
              <div className="kpi-icon-wrapper"><Database size={18} /></div>
            </div>
            <div className="kpi-value">{combinedStats.totalCombinedAccounts}</div>
            <div className="kpi-footer">
              <span>Collective team-wide accounts</span>
            </div>
          </div>

          {/* Card 2: Combined FB Target */}
          <div className="glass-panel kpi-card kpi-warning">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Total Target to Maintain</span>
              <div className="kpi-icon-wrapper"><Target size={18} /></div>
            </div>
            <div className="kpi-value">{combinedStats.combinedFbTarget}</div>
            <div className="kpi-footer" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.25rem", width: "100%" }}>
              <span>Combined FB active target progress</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%" }}>
                <div style={{ flex: 1, height: "5px", background: "rgba(0,0,0,0.06)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min(100, combinedStats.combinedFbTarget > 0 ? Math.round((combinedStats.fbActiveCombined / combinedStats.combinedFbTarget) * 100) : 0)}%`,
                    background: combinedStats.fbActiveCombined >= combinedStats.combinedFbTarget ? "#10B981" : "#F59E0B",
                    borderRadius: "99px",
                    transition: "width 0.6s ease"
                  }}></div>
                </div>
                <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", fontWeight: 700, whiteSpace: "nowrap" }}>
                  {combinedStats.fbActiveCombined}/{combinedStats.combinedFbTarget} ({combinedStats.combinedFbTarget > 0 ? Math.round((combinedStats.fbActiveCombined / combinedStats.combinedFbTarget) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Facebook Team Operations */}
      <div className="glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--gold-primary)", letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>
            Facebook Team Operations
          </h2>
          {renderLiveStatus()}
        </div>
        <div className="fb-team-grid-forced">
          {/* Card 1: FB Total Combined */}
          <div className="glass-panel kpi-card kpi-info">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">FB Total Accounts</span>
              <div className="kpi-icon-wrapper"><Database size={18} /></div>
            </div>
            <div className="kpi-value">{combinedStats.fbTotalCombined}</div>
            <div className="kpi-footer">
              <span>Team Facebook registered accounts</span>
            </div>
          </div>

          {/* Card 2: FB Active Combined */}
          <div className="glass-panel kpi-card kpi-success">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">FB Active Accounts</span>
              <div className="kpi-icon-wrapper"><CheckCircle size={18} /></div>
            </div>
            <div className="kpi-value">{combinedStats.fbActiveCombined}</div>
            <div className="kpi-footer">
              <span>Active operational team accounts</span>
            </div>
          </div>

          {/* Card 3: FB Verified Combined */}
          <div className="glass-panel kpi-card kpi-success">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">FB Verified Accounts</span>
              <div className="kpi-icon-wrapper"><ShieldCheck size={18} /></div>
            </div>
            <div className="kpi-value">{combinedStats.fbVerifiedCombined}</div>
            <div className="kpi-footer">
              <span>Verification rate: {combinedStats.fbTotalCombined > 0 ? Math.round((combinedStats.fbVerifiedCombined / combinedStats.fbTotalCombined) * 100) : 0}%</span>
            </div>
          </div>

          {/* Card 4: FB Unverified Combined */}
          <div className="glass-panel kpi-card kpi-warning">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">FB Unverified Accounts</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} /></div>
            </div>
            <div className="kpi-value">{combinedStats.fbUnverifiedCombined}</div>
            <div className="kpi-footer">
              <span>Awaiting verification submit</span>
            </div>
          </div>

          {/* Card 5: FB Marketplace Issue Combined */}
          <div className="glass-panel kpi-card kpi-danger">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">FB Marketplace Issue</span>
              <div className="kpi-icon-wrapper"><AlertCircle size={18} /></div>
            </div>
            <div className="kpi-value">{combinedStats.fbMarketplaceCombined}</div>
            <div className="kpi-footer" style={{ color: combinedStats.fbMarketplaceCombined > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
              <span>Platform level rejections</span>
            </div>
          </div>

          {/* Card 6: FB Identity Issue Combined */}
          <div className="glass-panel kpi-card kpi-danger">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">FB Identity Issue</span>
              <div className="kpi-icon-wrapper"><HelpCircle size={18} /></div>
            </div>
            <div className="kpi-value">{combinedStats.fbIdentityCombined}</div>
            <div className="kpi-footer" style={{ color: combinedStats.fbIdentityCombined > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
              <span>Verification hold status</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Vinted Team Operations */}
      <div className="glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--gold-primary)", letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>
            Vinted Team Operations
          </h2>
          {renderLiveStatus()}
        </div>
        <div className="vinted-team-grid-forced">
          {/* Card 1: Vinted Total Combined */}
          <div className="glass-panel kpi-card kpi-info">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Vinted Total Accounts</span>
              <div className="kpi-icon-wrapper"><Database size={18} /></div>
            </div>
            <div className="kpi-value">{combinedStats.vintedTotalCombined}</div>
            <div className="kpi-footer">
              <span>Vinted team registered accounts</span>
            </div>
          </div>

          {/* Card 2: Vinted Verified Combined */}
          <div className="glass-panel kpi-card kpi-success">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Vinted Verified</span>
              <div className="kpi-icon-wrapper"><ShieldCheck size={18} /></div>
            </div>
            <div className="kpi-value">{combinedStats.vintedVerifiedCombined}</div>
            <div className="kpi-footer">
              <span>Verification rate: {combinedStats.vintedTotalCombined > 0 ? Math.round((combinedStats.vintedVerifiedCombined / combinedStats.vintedTotalCombined) * 100) : 0}%</span>
            </div>
          </div>

          {/* Card 3: Vinted Unverified Combined */}
          <div className="glass-panel kpi-card kpi-warning">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Vinted Unverified</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} /></div>
            </div>
            <div className="kpi-value">{combinedStats.vintedUnverifiedCombined}</div>
            <div className="kpi-footer">
              <span>Awaiting verification submit</span>
            </div>
          </div>

          {/* Card 4: Vinted Suspended Combined */}
          <div className="glass-panel kpi-card kpi-danger">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Vinted Suspended Accounts</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} /></div>
            </div>
            <div className="kpi-value">{combinedStats.vintedSuspendedCombined}</div>
            <div className="kpi-footer" style={{ color: combinedStats.vintedSuspendedCombined > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
              <span>Active database suspensions</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Global Operations Feed Table */}
      <div className="glass-panel table-panel">
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-dim)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--gold-primary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
            Recent Team Operations Feed
          </h2>
          {renderLiveStatus()}
        </div>
        <div className="table-container-outer">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>ID Serial</th>
                <th>ID Name</th>
                <th>Ads</th>
                <th>Verified</th>
                <th>Status</th>
                <th onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Date of Entry {sortOrder === "desc" ? "↓" : "↑"}
                </th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {globalFeed.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    No recent team operations cataloged.
                  </td>
                </tr>
              ) : (
                (() => {
                  const sortedFeed = [...globalFeed].sort((a, b) => {
                    const dateA = new Date(a.createdAt).getTime();
                    const dateB = new Date(b.createdAt).getTime();
                    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
                  });
                  return sortedFeed.map((acc) => {
                  const style = getStatusStyle(acc);
                  const isTL = acc.user_account_createdByIdTouser?.role === "TEAM_LEAD";
                  
                  return (
                    <tr key={acc.id}>
                      <td>
                        <span className="badge developer" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                          {acc.platform?.name}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 500 }}>
                        {acc.serialCode}
                      </td>
                      <td style={{ fontWeight: 600 }}>{acc.idName}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        {acc.adsPublished} ads
                      </td>
                      <td>
                        {acc.verificationStatus === "Yes" ? (
                          <span className="badge verified" style={{ gap: "0.25rem" }}>
                            <ShieldCheck size={12} /> Yes
                          </span>
                        ) : (
                          <span className="badge suspended" style={{ gap: "0.25rem" }}>
                            <ShieldX size={12} /> No
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: style.bg,
                          border: `1px solid ${style.border}`,
                          color: style.color,
                          fontSize: "0.7rem",
                          letterSpacing: "0.02em"
                        }}>
                          {style.text}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: "1.2" }}>
                        {(() => {
                          const d = new Date(acc.createdAt);
                          const datePart = `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}, ${d.getFullYear()}`;
                          const timePart = d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                              <span style={{ fontWeight: 600 }}>{datePart}</span>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{timePart}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.8rem" }}>
                            {acc.user_account_createdByIdTouser?.name || "N/A"}
                          </span>
                          {isTL ? (
                            <span className="badge" style={{ background: "rgba(2, 80, 161, 0.08)", border: "1px solid rgba(2, 80, 161, 0.2)", color: "#0250A1", fontSize: "0.65rem", padding: "0.1rem 0.4rem", marginLeft: "0.5rem", fontWeight: 700 }}>
                              👑 TL
                            </span>
                          ) : (
                            <span className="badge" style={{ background: "rgba(212, 175, 55, 0.08)", border: "1px solid rgba(212, 175, 55, 0.2)", color: "var(--gold-primary)", fontSize: "0.65rem", padding: "0.1rem 0.4rem", marginLeft: "0.5rem", fontWeight: 700 }}>
                              👤 Associate
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Bottom Personal Workspace wrapped in a tighter flex container */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Visual Separator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0.25rem 0",
          position: "relative"
        }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border-dim)" }}></div>
          <div style={{
            padding: "0.3rem 1.2rem",
            background: "var(--gold-primary)",
            color: "#FFFFFF",
            borderRadius: "999px",
            fontSize: "0.78rem",
            fontWeight: 700,
            boxShadow: "0 4px 12px rgba(212, 175, 55, 0.2)",
            margin: "0 1rem",
            letterSpacing: "0.03em",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <span>🛠️ My Personal Workspace (میری ذاتی آئی ڈیز)</span>
          </div>
          <div style={{ flex: 1, height: "1px", background: "var(--border-dim)" }}></div>
        </div>

        {/* Section 2: Facebook Operations */}
        <div className="glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--gold-primary)", letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>
            Facebook Operations
          </h2>
          {renderLiveStatus()}
        </div>
        <div className="kpi-grid">
          {/* Card 1: FB Total Accounts */}
          <div className="glass-panel kpi-card kpi-info">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">FB Total Acc.</span>
              <div className="kpi-icon-wrapper"><Database size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.fbTotal}</div>
            <div className="kpi-footer">
              <span>Facebook registered accounts</span>
            </div>
          </div>

          {/* Card 2: FB Active Acc. */}
          <div className="glass-panel kpi-card kpi-success">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">FB Active Acc.</span>
              <div className="kpi-icon-wrapper"><CheckCircle size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.fbActive}</div>
            <div className="kpi-footer">
              <span>Live operational nodes</span>
            </div>
          </div>

          {/* Card 3: FB Verified Acc. */}
          <div className="glass-panel kpi-card kpi-success">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">FB Verified Acc.</span>
              <div className="kpi-icon-wrapper"><ShieldCheck size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.fbVerified}</div>
            <div className="kpi-footer">
              <span>Verification rate: {personalStats.fbTotal > 0 ? Math.round((personalStats.fbVerified / personalStats.fbTotal) * 100) : 0}%</span>
            </div>
          </div>

          {/* Card 4: FB Unverified Acc. */}
          <div className="glass-panel kpi-card kpi-warning">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">FB Unverified Acc.</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.fbUnverified}</div>
            <div className="kpi-footer">
              <span>Awaiting verification submit</span>
            </div>
          </div>

          {/* Card 5: FB Marketplace Issue */}
          <div className="glass-panel kpi-card kpi-danger">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">FB Marketplace Issue</span>
              <div className="kpi-icon-wrapper"><AlertCircle size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.fbMarketplace}</div>
            <div className="kpi-footer" style={{ color: personalStats.fbMarketplace > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
              <span>Platform level rejections</span>
            </div>
          </div>

          {/* Card 6: FB Identity Issue */}
          <div className="glass-panel kpi-card kpi-danger">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">FB Identity Issue</span>
              <div className="kpi-icon-wrapper"><HelpCircle size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.fbIdentity}</div>
            <div className="kpi-footer" style={{ color: personalStats.fbIdentity > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
              <span>Verification hold status</span>
            </div>
          </div>

          {/* Card 7: Target to Maintain FB */}
          <div className="glass-panel kpi-card kpi-warning">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Target to Maintain</span>
              <div className="kpi-icon-wrapper"><Target size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.fbTarget}</div>
            <div className="kpi-footer" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.25rem", width: "100%" }}>
              <span>Monthly FB quota target</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%" }}>
                <div style={{ flex: 1, height: "5px", background: "rgba(0,0,0,0.06)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min(100, personalStats.fbTarget > 0 ? Math.round((personalStats.fbActive / personalStats.fbTarget) * 100) : 0)}%`,
                    background: personalStats.fbActive >= personalStats.fbTarget ? "#10B981" : "#F59E0B",
                    borderRadius: "99px",
                    transition: "width 0.6s ease"
                  }}></div>
                </div>
                <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", fontWeight: 700, whiteSpace: "nowrap" }}>
                  {personalStats.fbActive}/{personalStats.fbTarget} ({personalStats.fbTarget > 0 ? Math.round((personalStats.fbActive / personalStats.fbTarget) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* Card 8: FB Total Suspended */}
          <div className="glass-panel kpi-card kpi-danger">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Total Suspended Acc.</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.fbSuspended}</div>
            <div className="kpi-footer" style={{ color: personalStats.fbSuspended > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
              <span>Active database suspensions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Vinted Operations */}
      <div className="glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--gold-primary)", letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>
            Vinted Operations
          </h2>
          {renderLiveStatus()}
        </div>
        <div className="kpi-grid">
          {/* Card 1: Vinted Total */}
          <div className="glass-panel kpi-card kpi-info">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Vinted Total Accounts</span>
              <div className="kpi-icon-wrapper"><Database size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.vintedTotal}</div>
            <div className="kpi-footer">
              <span>Vinted registered accounts</span>
            </div>
          </div>

          {/* Card 2: Vinted Verified */}
          <div className="glass-panel kpi-card kpi-success">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Vinted Verified</span>
              <div className="kpi-icon-wrapper"><ShieldCheck size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.vintedVerified}</div>
            <div className="kpi-footer">
              <span>Verification rate: {personalStats.vintedTotal > 0 ? Math.round((personalStats.vintedVerified / personalStats.vintedTotal) * 100) : 0}%</span>
            </div>
          </div>

          {/* Card 3: Vinted Unverified */}
          <div className="glass-panel kpi-card kpi-warning">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Vinted Unverified</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.vintedUnverified}</div>
            <div className="kpi-footer">
              <span>Awaiting verification submit</span>
            </div>
          </div>

          {/* Card 4: Vinted Suspended */}
          <div className="glass-panel kpi-card kpi-danger">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Vinted Suspended Accounts</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.vintedSuspended}</div>
            <div className="kpi-footer" style={{ color: personalStats.vintedSuspended > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
              <span>Active database suspensions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Gumtree Operations */}
      <div className="glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--gold-primary)", letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>
            Gumtree Operations
          </h2>
          {renderLiveStatus()}
        </div>
        <div className="kpi-grid">
          {/* Card 1: Gumtree Total */}
          <div className="glass-panel kpi-card kpi-info">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Gumtree Total Accounts</span>
              <div className="kpi-icon-wrapper"><Database size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.gumtreeTotal}</div>
            <div className="kpi-footer">
              <span>Gumtree registered accounts</span>
            </div>
          </div>

          {/* Card 2: Gumtree Verified */}
          <div className="glass-panel kpi-card kpi-success">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Gumtree Verified</span>
              <div className="kpi-icon-wrapper"><ShieldCheck size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.gumtreeVerified}</div>
            <div className="kpi-footer">
              <span>Verification rate: {personalStats.gumtreeTotal > 0 ? Math.round((personalStats.gumtreeVerified / personalStats.gumtreeTotal) * 100) : 0}%</span>
            </div>
          </div>

          {/* Card 3: Gumtree Unverified */}
          <div className="glass-panel kpi-card kpi-warning">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Gumtree Unverified</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.gumtreeUnverified}</div>
            <div className="kpi-footer">
              <span>Awaiting verification submit</span>
            </div>
          </div>

          {/* Card 4: Gumtree Suspended */}
          <div className="glass-panel kpi-card kpi-danger">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Gumtree Suspended Accounts</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} /></div>
            </div>
            <div className="kpi-value">{personalStats.gumtreeSuspended}</div>
            <div className="kpi-footer" style={{ color: personalStats.gumtreeSuspended > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
              <span>Active database suspensions</span>
            </div>
          </div>
        </div>
      </div>

      </div> {/* Closing personal workspace wrapper */}
    </div>
  );
}
