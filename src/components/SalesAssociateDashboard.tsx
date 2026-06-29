"use client";

import React, { useState, useEffect } from "react";
import { 
  Database, 
  ShieldCheck, 
  CheckCircle, 
  ShieldAlert, 
  AlertCircle, 
  HelpCircle, 
  Target 
} from "lucide-react";

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
}

export default function SalesAssociateDashboard({ initialStats }: SalesAssociateDashboardProps) {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [isSyncing, setIsSyncing] = useState(false);

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
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <div 
        className="animate-pulse"
        style={{
          width: "7px",
          height: "7px",
          background: "#10B981",
          borderRadius: "50%",
          boxShadow: "0 0 8px #10B981"
        }}
      ></div>
      <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {isSyncing ? "Syncing..." : "Live Connected"}
      </span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Section 1: Overall Operations */}
      <div className="glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--gold-primary)", letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>
            Overall Operations
          </h2>
          {renderLiveStatus()}
        </div>
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
            <div className="kpi-card-glow" style={{ opacity: 0.15 }}></div>
            <div className="kpi-header">
              <span className="kpi-title">Total Account</span>
              <div className="kpi-icon-wrapper"><Database size={18} /></div>
            </div>
            <div className="kpi-value">{stats.saTotalAccounts}</div>
            <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
              <span>Total registered accounts across all platforms</span>
            </div>
          </div>
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
          <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">FB Total Acc.</span>
              <div className="kpi-icon-wrapper"><Database size={18} /></div>
            </div>
            <div className="kpi-value">{stats.fbTotal}</div>
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
            <div className="kpi-value">{stats.fbActive}</div>
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
            <div className="kpi-value">{stats.fbVerified}</div>
            <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
              <span>Verification rate: {stats.fbTotal > 0 ? Math.round((stats.fbVerified / stats.fbTotal) * 100) : 0}%</span>
            </div>
          </div>

          {/* Card 4: FB Unverified Acc. */}
          <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">FB Unverified Acc.</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} style={{ color: "var(--orange-accent)" }} /></div>
            </div>
            <div className="kpi-value">{stats.fbUnverified}</div>
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
            <div className="kpi-value">{stats.fbMarketplace}</div>
            <div className="kpi-footer" style={{ color: stats.fbMarketplace > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
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
            <div className="kpi-value">{stats.fbIdentity}</div>
            <div className="kpi-footer" style={{ color: stats.fbIdentity > 0 ? "var(--color-warning)" : "var(--text-muted)" }}>
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
            <div className="kpi-value">{stats.fbTarget}</div>
            <div className="kpi-footer" style={{ color: "var(--text-muted)", flexDirection: "column", alignItems: "flex-start", gap: "0.4rem" }}>
              <span>Monthly FB quota target</span>
              <div style={{ width: "100%", height: "5px", background: "rgba(255,255,255,0.05)", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, stats.fbTarget > 0 ? Math.round((stats.fbActive / stats.fbTarget) * 100) : 0)}%`,
                  background: stats.fbActive >= stats.fbTarget ? "var(--color-success)" : "var(--gold-gradient)",
                  borderRadius: "99px",
                  transition: "width 0.6s ease"
                }}></div>
              </div>
              <span style={{ fontSize: "0.7rem" }}>{stats.fbActive}/{stats.fbTarget} active ({stats.fbTarget > 0 ? Math.round((stats.fbActive / stats.fbTarget) * 100) : 0}%)</span>
            </div>
          </div>

          {/* Card 8: FB Total Suspended */}
          <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Total Suspended Acc.</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} style={{ color: "var(--color-danger)" }} /></div>
            </div>
            <div className="kpi-value">{stats.fbSuspended}</div>
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
          <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Vinted Total Accounts</span>
              <div className="kpi-icon-wrapper"><Database size={18} /></div>
            </div>
            <div className="kpi-value">{stats.vintedTotal}</div>
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
            <div className="kpi-value">{stats.vintedVerified}</div>
            <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
              <span>Verification rate: {stats.vintedTotal > 0 ? Math.round((stats.vintedVerified / stats.vintedTotal) * 100) : 0}%</span>
            </div>
          </div>

          {/* Card 3: Vinted Unverified */}
          <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Vinted Unverified</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} style={{ color: "var(--orange-accent)" }} /></div>
            </div>
            <div className="kpi-value">{stats.vintedUnverified}</div>
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
            <div className="kpi-value">{stats.vintedSuspended}</div>
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
          <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Gumtree Total Accounts</span>
              <div className="kpi-icon-wrapper"><Database size={18} /></div>
            </div>
            <div className="kpi-value">{stats.gumtreeTotal}</div>
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
            <div className="kpi-value">{stats.gumtreeVerified}</div>
            <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
              <span>Verification rate: {stats.gumtreeTotal > 0 ? Math.round((stats.gumtreeVerified / stats.gumtreeTotal) * 100) : 0}%</span>
            </div>
          </div>

          {/* Card 3: Gumtree Unverified */}
          <div className="glass-panel kpi-card" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
            <div className="kpi-card-glow"></div>
            <div className="kpi-header">
              <span className="kpi-title">Gumtree Unverified</span>
              <div className="kpi-icon-wrapper"><ShieldAlert size={18} style={{ color: "var(--orange-accent)" }} /></div>
            </div>
            <div className="kpi-value">{stats.gumtreeUnverified}</div>
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
            <div className="kpi-value">{stats.gumtreeSuspended}</div>
            <div className="kpi-footer" style={{ color: stats.gumtreeSuspended > 0 ? "var(--color-danger)" : "var(--text-muted)" }}>
              <span>Active database suspensions</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
