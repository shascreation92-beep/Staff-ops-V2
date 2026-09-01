"use client";

import React, { useState } from "react";
import { 
  Database, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  MinusCircle, 
  Store, 
  MessageSquare
} from "lucide-react";
import { useRouter } from "next/navigation";

interface TeamStats {
  totalAccounts: number;
  verifiedAccounts: number;
  unverifiedAccounts: number;
  fbAccounts: number;
  vintedAccounts: number;
  fbMarketplaceIssues: number;
  fbIdentityAccounts: number;
  fbCodeIssues: number;
  fbSuspendedMarketplaces: number;
  vintedVerified: number;
  vintedUnverified: number;
  vintedSuspended: number;
}

interface TeamLeadData {
  id: string;
  name: string;
  email: string;
  teamMembersCount: number;
  stats: TeamStats;
}

interface SimpleUser {
  id: string;
  name: string | null;
  teamLeadId: string | null;
}

interface TeamWiseBreakdownProps {
  initialTeamLeadsStats: TeamLeadData[];
  allSalesAssociates: SimpleUser[];
  allTeamLeads: { id: string; name: string | null }[];
  currentUserRole: string;
}

export default function TeamWiseBreakdown({
  initialTeamLeadsStats,
  currentUserRole
}: TeamWiseBreakdownProps) {
  const router = useRouter();
  const [teamLeadsStats] = useState<TeamLeadData[]>(initialTeamLeadsStats);

  // 1. Weakest Team Detection Logic
  // Calculate critical failure ratio: (unverified + fbSuspended + vintedSuspended + fbCodeIssues) / total
  const getTeamCriticalRatio = (stats: TeamStats) => {
    if (stats.totalAccounts === 0) return 0;
    const issues = stats.unverifiedAccounts + stats.fbSuspendedMarketplaces + stats.vintedSuspended + (stats.fbCodeIssues || 0);
    return issues / stats.totalAccounts;
  };

  // Find the critical priority target (highest critical ratio > 0)
  const criticalTarget = teamLeadsStats.reduce<TeamLeadData | null>((worst, current) => {
    const currentRatio = getTeamCriticalRatio(current.stats);
    if (currentRatio === 0) return worst;
    if (!worst) return current;
    const worstRatio = getTeamCriticalRatio(worst.stats);
    return currentRatio > worstRatio ? current : worst;
  }, null);

  // Sort the team leads so the Critical Target is hoisted to the absolute top, and others follow alphabetically
  const sortedTeamLeads = [...teamLeadsStats].sort((a, b) => {
    if (criticalTarget) {
      if (a.id === criticalTarget.id) return -1;
      if (b.id === criticalTarget.id) return 1;
    }
    return (a.name || "").localeCompare(b.name || "");
  });

  const allowedToModify = ["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"].includes(currentUserRole);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "3rem" }}>
        {sortedTeamLeads.length === 0 ? (
          <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", background: "#FFFFFF", border: "1px solid var(--border-dim)" }}>
            No active Team Leads registered in the system.
          </div>
        ) : (
          sortedTeamLeads.map((tl) => {
            const isCritical = criticalTarget && tl.id === criticalTarget.id;
            const criticalRatioPct = Math.round(getTeamCriticalRatio(tl.stats) * 100);

            return (
              <div 
                key={tl.id} 
                className={`glass-panel ${isCritical ? 'border-red-400/80 shadow-[0_0_15px_rgba(239,68,68,0.12)]' : ''}`}
                style={{
                  padding: "1.5rem",
                  borderRadius: "12px",
                  boxShadow: isCritical ? "0 0 15px rgba(239, 68, 68, 0.12)" : "var(--shadow-premium)",
                  background: "rgba(20, 18, 38, 0.75)",
                  backdropFilter: "blur(16px)",
                  border: isCritical ? "1px solid rgba(239, 68, 68, 0.8)" : "1px solid rgba(255, 255, 255, 0.09)",
                  transition: "all 0.3s ease"
                }}
              >
                {/* Team Lead Info Header Row */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  borderBottom: "1px solid var(--border-dim)",
                  paddingBottom: "1rem",
                  marginBottom: "1.25rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                        TEAM LEAD
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                          {tl.name}
                        </span>
                        {isCritical && (
                          <span 
                            className="animate-bounce"
                            style={{
                              background: "#FEF2F2",
                              color: "#DC2626",
                              border: "1px solid #FEE2E2",
                              borderRadius: "9999px",
                              padding: "0.15rem 0.6rem",
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem"
                            }}
                          >
                            ⚠️ Action Required ({criticalRatioPct}% Critical)
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {tl.email} • {tl.teamMembersCount} mapped associate{tl.teamMembersCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  {/* Actions Portal Trigger */}
                  {isCritical && allowedToModify && (
                    <button
                      onClick={() => router.push(`/chat-space?contactId=${tl.id}`)}
                      style={{
                        background: "#0250A1",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "8px",
                        padding: "0.5rem 1rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        boxShadow: "0 4px 12px rgba(2, 80, 161, 0.2)",
                        transition: "all 0.2s"
                      }}
                    >
                      <MessageSquare size={14} />
                      Ping Team Lead
                    </button>
                  )}
                </div>

                {/* Sub-Row A (Facebook Operations) */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <span style={{
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    color: "#0250A1",
                    background: "rgba(2, 80, 161, 0.08)",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    display: "inline-block"
                  }}>
                    Facebook Operations
                  </span>
                </div>

                {/* Facebook Stats Sub-Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "1rem"
                }}>
                  {/* Stat 1: Total accounts */}
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "0.75rem 1rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                      Total IDs
                    </span>
                    <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)" }}>
                      {tl.stats.fbAccounts}
                    </span>
                  </div>

                  {/* Stat 2: Verified */}
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "0.75rem 1rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                      Verified IDs
                    </span>
                    <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#10B981" }}>
                      {tl.stats.verifiedAccounts}
                    </span>
                  </div>

                  {/* Stat 3: Unverified */}
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "0.75rem 1rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                      Unverified IDs
                    </span>
                    <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#F59E0B" }}>
                      {tl.stats.unverifiedAccounts}
                    </span>
                  </div>

                  {/* Stat 4: Marketplace Issue */}
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "0.75rem 1rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                      MP Issues
                    </span>
                    <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#EF4444" }}>
                      {tl.stats.fbMarketplaceIssues}
                    </span>
                  </div>

                  {/* Stat 5: Identity Issue */}
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "0.75rem 1rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                      Identity Issues
                    </span>
                    <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#3B82F6" }}>
                      {tl.stats.fbIdentityAccounts}
                    </span>
                  </div>

                  {/* Stat 6: Code Issue */}
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "0.75rem 1rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                      Code Issues
                    </span>
                    <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#8B5CF6" }}>
                      {tl.stats.fbCodeIssues || 0}
                    </span>
                  </div>

                  {/* Stat 7: Suspended */}
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "0.75rem 1rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                      Suspended
                    </span>
                    <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#D97706" }}>
                      {tl.stats.fbSuspendedMarketplaces}
                    </span>
                  </div>
                </div>

                {/* Clean Horizontal Splitter */}
                <hr style={{ border: 0, borderTop: "1px solid var(--border-dim)", margin: "1.25rem 0" }} />

                {/* Sub-Row B (Vinted Operations) */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <span style={{
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    color: "#EF4444",
                    background: "rgba(239, 68, 68, 0.08)",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    display: "inline-block"
                  }}>
                    Vinted Operations
                  </span>
                </div>

                {/* Vinted Stats Sub-Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: "1rem"
                }}>
                  {/* Stat 1: Total Vinted */}
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "0.75rem 1rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                      Total Vinted
                    </span>
                    <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)" }}>
                      {tl.stats.vintedAccounts}
                    </span>
                  </div>

                  {/* Stat 2: Verified Vinted */}
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "0.75rem 1rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                      Verified
                    </span>
                    <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#10B981" }}>
                      {tl.stats.vintedVerified}
                    </span>
                  </div>

                  {/* Stat 3: Unverified Vinted */}
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "0.75rem 1rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                      Unverified
                    </span>
                    <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#F59E0B" }}>
                      {tl.stats.vintedUnverified}
                    </span>
                  </div>

                  {/* Stat 4: Suspended Vinted */}
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "0.75rem 1rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                      Suspended
                    </span>
                    <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#EF4444" }}>
                      {tl.stats.vintedSuspended}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </>
  );
}
