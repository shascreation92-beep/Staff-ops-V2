"use client";

import React, { useState, useEffect } from "react";
import { 
  Database, 
  ShieldCheck, 
  CheckCircle, 
  ShieldAlert, 
  AlertCircle, 
  HelpCircle, 
  Target,
  UserCheck
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

interface Stats {
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

interface SalesAssociateDashboardProps {
  initialStats: Stats;
  userName: string;
  teamLeadName?: string | null;
}

export default function SalesAssociateDashboard({ initialStats, userName, teamLeadName }: SalesAssociateDashboardProps) {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [isSyncing, setIsSyncing] = useState(false);

  const formatNumber = (num: number | string | null | undefined): string => {
    if (num === null || num === undefined) return "0";
    const n = typeof num === "string" ? parseInt(num, 10) : num;
    if (isNaN(n)) return num.toString();
    if (n < 0) return n.toString();
    return n.toString();
  };

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        setIsSyncing(true);
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to sync dashboard stats:", err);
      } finally {
        // Add a slight delay to the syncing state to make it look smooth
        setTimeout(() => setIsSyncing(false), 800);
      }
    }, 5000); // sync every 5 seconds

    return () => clearInterval(pollInterval);
  }, []);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Relocated Welcome Area & Overall Operations Card */}
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
            WELCOME BACK, {userName.toUpperCase()}
          </h1>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Current node operations running at normal threshold parameters.
          </span>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {/* Reporting To Pill Card */}
          {teamLeadName && (
            <div className="glass-panel" style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.4rem 0.85rem",
              background: "rgba(173, 232, 244, 0.25)",
              border: "1px solid rgba(0, 119, 182, 0.15)",
              borderRadius: "8px",
              height: "36px"
            }}>
              <UserCheck size={14} style={{ color: "var(--gold-primary)" }} />
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                Reporting To :{" "}
                <span style={{ color: "var(--gold-premium)", fontWeight: 800 }}>
                  {teamLeadName}
                </span>
              </span>
            </div>
          )}

          {/* Compact Total Account Card */}
          <div className="glass-panel" style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.4rem 0.85rem",
            background: "rgba(0, 119, 182, 0.08)",
            border: "1px solid rgba(0, 119, 182, 0.2)",
            borderRadius: "8px",
            height: "36px"
          }}>
            <Database size={14} style={{ color: "var(--gold-primary)" }} />
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>
              Total Accounts :{" "}
              <span style={{ color: "var(--gold-primary)", fontWeight: 800 }}>
                {formatNumber(stats.saTotalAccounts)}
              </span>
            </span>
          </div>

          {/* Pulsing Live Sync status */}
          {renderLiveStatus()}

          {/* Notification Bell */}
          <NotificationBell />
        </div>
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
            <div className="kpi-value">{formatNumber(stats.fbTotal)}</div>
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
            <div className="kpi-value">{formatNumber(stats.fbActive)}</div>
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
            <div className="kpi-value">{formatNumber(stats.fbVerified)}</div>
            <div className="kpi-footer">
              <span>Verification rate: {stats.fbTotal > 0 ? Math.round((stats.fbVerified / stats.fbTotal) * 100) : 0}%</span>
            </div>
          </div>

          {/* Card 4: FB Unverified Acc. */}
          <div className="glass-panel kpi-card kpi-warning">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">FB Unverified Acc.</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} /></div>
            </div>
            <div className="kpi-value">{formatNumber(stats.fbUnverified)}</div>
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
            <div className="kpi-value">{formatNumber(stats.fbMarketplace)}</div>
            <div className="kpi-footer" style={{ color: stats.fbMarketplace > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
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
            <div className="kpi-value">{formatNumber(stats.fbIdentity)}</div>
            <div className="kpi-footer" style={{ color: stats.fbIdentity > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
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
            <div className="kpi-value">{formatNumber(stats.fbTarget)}</div>
            <div className="kpi-footer" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.25rem", width: "100%" }}>
              <span>Monthly FB quota target</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%" }}>
                <div style={{ flex: 1, height: "5px", background: "rgba(0,0,0,0.06)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min(100, stats.fbTarget > 0 ? Math.round((stats.fbActive / stats.fbTarget) * 100) : 0)}%`,
                    background: stats.fbActive >= stats.fbTarget ? "#10B981" : "#F59E0B",
                    borderRadius: "99px",
                    transition: "width 0.6s ease"
                  }}></div>
                </div>
                <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", fontWeight: 700, whiteSpace: "nowrap" }}>
                  {formatNumber(stats.fbActive)}/{formatNumber(stats.fbTarget)} ({stats.fbTarget > 0 ? Math.round((stats.fbActive / stats.fbTarget) * 100) : 0}%)
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
            <div className="kpi-value">{formatNumber(stats.fbSuspended)}</div>
            <div className="kpi-footer" style={{ color: stats.fbSuspended > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
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
            <div className="kpi-value">{formatNumber(stats.vintedTotal)}</div>
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
            <div className="kpi-value">{formatNumber(stats.vintedVerified)}</div>
            <div className="kpi-footer">
              <span>Verification rate: {stats.vintedTotal > 0 ? Math.round((stats.vintedVerified / stats.vintedTotal) * 100) : 0}%</span>
            </div>
          </div>

          {/* Card 3: Vinted Unverified */}
          <div className="glass-panel kpi-card kpi-warning">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Vinted Unverified</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} /></div>
            </div>
            <div className="kpi-value">{formatNumber(stats.vintedUnverified)}</div>
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
            <div className="kpi-value">{formatNumber(stats.vintedSuspended)}</div>
            <div className="kpi-footer" style={{ color: stats.vintedSuspended > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
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
            <div className="kpi-value">{formatNumber(stats.gumtreeTotal)}</div>
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
            <div className="kpi-value">{formatNumber(stats.gumtreeVerified)}</div>
            <div className="kpi-footer">
              <span>Verification rate: {stats.gumtreeTotal > 0 ? Math.round((stats.gumtreeVerified / stats.gumtreeTotal) * 100) : 0}%</span>
            </div>
          </div>

          {/* Card 3: Gumtree Unverified */}
          <div className="glass-panel kpi-card kpi-warning">
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Gumtree Unverified</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} /></div>
            </div>
            <div className="kpi-value">{formatNumber(stats.gumtreeUnverified)}</div>
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
            <div className="kpi-value">{formatNumber(stats.gumtreeSuspended)}</div>
            <div className="kpi-footer" style={{ color: stats.gumtreeSuspended > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
              <span>Active database suspensions</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
