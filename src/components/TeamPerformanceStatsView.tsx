"use client";

import React, { useState } from "react";
import { 
  Users, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  ShieldAlert, 
  Award, 
  BarChart3,
  Sparkles,
  ArrowUp
} from "lucide-react";

interface TeamStatsItem {
  userId: string;
  name: string;
  email: string;
  employeeId: string;
  image?: string | null;
  shiftStatus: string;
  totalAccounts: number;
  activeAccounts: number;
  pendingAccounts: number;
  unverifiedAccounts: number;
  totalAdsPublished: number;
  platformCounts: Record<string, number>;
  lastSubmissionDate: string | null;
  targetGoal: number;
  targetProgressPct: number;
  isLagging: boolean;
}

interface TeamPerformanceStatsViewProps {
  initialStats: TeamStatsItem[];
  currentUserRole: string;
}

export default function TeamPerformanceStatsView({ initialStats, currentUserRole }: TeamPerformanceStatsViewProps) {
  const [stats, setStats] = useState<TeamStatsItem[]>(initialStats);
  const [searchTerm, setSearchTerm] = useState("");
  const [shiftFilter, setShiftFilter] = useState("ALL");
  const [laggingFilter, setLaggingFilter] = useState("ALL");

  // KPI Metrics
  const totalMembers = stats.length;
  const totalTeamAccounts = stats.reduce((acc, curr) => acc + curr.totalAccounts, 0);
  const laggingCount = stats.filter(s => s.isLagging).length;
  const totalTeamAds = stats.reduce((acc, curr) => acc + curr.totalAdsPublished, 0);

  // Filter items
  const filteredStats = stats.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesShift = shiftFilter === "ALL" || item.shiftStatus === shiftFilter;
    const matchesLagging = laggingFilter === "ALL" || (laggingFilter === "LAGGING" ? item.isLagging : !item.isLagging);

    return matchesSearch && matchesShift && matchesLagging;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: "1.5rem 1.75rem", background: "linear-gradient(135deg, #03045E 0%, #023E8A 100%)", color: "#FFFFFF" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <BarChart3 size={24} style={{ color: "#48CAE4" }} />
              <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>TEAM MEMBERS PERFORMANCE &amp; ID STATS</h1>
            </div>
            <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.75)" }}>
              Real-time operational account counts for your team members. Sorted by lowest cataloged IDs first so underperforming members are immediately visible.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-info">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Team Members</span>
            <Users size={18} style={{ color: "#3B82F6" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#03045E", marginTop: "0.4rem" }}>{totalMembers}</div>
        </div>

        <div className="kpi-card kpi-success">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Team IDs</span>
            <Award size={18} style={{ color: "#10B981" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#10B981", marginTop: "0.4rem" }}>{totalTeamAccounts}</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: "4px solid #EF4444" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Attention Needed (&lt;5 IDs)</span>
            <AlertTriangle size={18} style={{ color: "#EF4444" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#EF4444", marginTop: "0.4rem" }}>{laggingCount} Members</div>
        </div>

        <div className="kpi-card kpi-info">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Team Ads</span>
            <Sparkles size={18} style={{ color: "#0284C7" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0284C7", marginTop: "0.4rem" }}>{totalTeamAds} Ads</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: "0.85rem 1.25rem", background: "#FFFFFF" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          {/* Search Box */}
          <div className="table-search-wrapper" style={{ width: "260px" }}>
            <Search className="header-search-icon" />
            <input
              type="text"
              placeholder="Search member name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="header-search-input"
            />
          </div>

          {/* Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="table-select-filter"
            >
              <option value="ALL">ALL SHIFT DUTIES</option>
              <option value="ON_DUTY">🟢 ON DUTY</option>
              <option value="ON_BREAK">🟡 ON BREAK</option>
              <option value="OFF_DUTY">🔴 OFF DUTY</option>
            </select>

            <select
              value={laggingFilter}
              onChange={(e) => setLaggingFilter(e.target.value)}
              className="table-select-filter"
            >
              <option value="ALL">ALL PERFORMANCE</option>
              <option value="LAGGING">⚠️ ATTENTION NEEDED (&lt;5 IDs)</option>
              <option value="NORMAL">✅ ON TRACK (&gt;=5 IDs)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel table-panel table-panel-flat" style={{ background: "#FFFFFF" }}>
        <div className="table-container-outer">
          <table className="compact-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0250A1" }}>
                <th style={{ color: "#FFFFFF", padding: "0.6rem 0.75rem", fontSize: "0.76rem", fontWeight: 700 }}>TEAM MEMBER</th>
                <th style={{ color: "#FFFFFF", padding: "0.6rem 0.75rem", fontSize: "0.76rem", fontWeight: 700, textAlign: "center" }}>SHIFT DUTY</th>
                <th style={{ color: "#FFFFFF", padding: "0.6rem 0.75rem", fontSize: "0.76rem", fontWeight: 700, textAlign: "center", background: "#0077B6" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}>
                    <span>TOTAL IDs</span>
                    <span title="Sorted Ascending (Lowest IDs at Top)"><ArrowUp size={14} /></span>
                  </div>
                </th>
                <th style={{ color: "#FFFFFF", padding: "0.6rem 0.75rem", fontSize: "0.76rem", fontWeight: 700, textAlign: "center" }}>TARGET PROGRESS</th>
                <th style={{ color: "#FFFFFF", padding: "0.6rem 0.75rem", fontSize: "0.76rem", fontWeight: 700, textAlign: "center" }}>ACTIVE / UNVERIFIED</th>
                <th style={{ color: "#FFFFFF", padding: "0.6rem 0.75rem", fontSize: "0.76rem", fontWeight: 700, textAlign: "center" }}>ADS PUBLISHED</th>
                <th style={{ color: "#FFFFFF", padding: "0.6rem 0.75rem", fontSize: "0.76rem", fontWeight: 700, textAlign: "center" }}>LAST SUBMISSION</th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    No team members found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredStats.map((item, index) => {
                  const formattedDate = item.lastSubmissionDate 
                    ? new Date(item.lastSubmissionDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "No submissions yet";

                  return (
                    <tr key={item.userId} style={{
                      borderBottom: "1px solid var(--border-dim)",
                      background: item.isLagging ? "rgba(239, 68, 68, 0.02)" : "transparent"
                    }}>
                      {/* Team Member Info */}
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <div style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            background: item.isLagging ? "linear-gradient(135deg, #EF4444, #DC2626)" : "linear-gradient(135deg, #0077B6, #023E8A)",
                            color: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "0.8rem",
                            boxShadow: item.isLagging ? "0 0 10px rgba(239, 68, 68, 0.3)" : "none"
                          }}>
                            {item.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#03045E" }}>{item.name}</span>
                              {item.isLagging && (
                                <span style={{
                                  fontSize: "0.65rem",
                                  fontWeight: 800,
                                  color: "#EF4444",
                                  background: "rgba(239, 68, 68, 0.1)",
                                  border: "1px solid rgba(239, 68, 68, 0.25)",
                                  padding: "0.1rem 0.4rem",
                                  borderRadius: "4px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.2rem"
                                }}>
                                  <AlertTriangle size={10} /> Low IDs
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              ID: {item.employeeId} • {item.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Shift Duty Status */}
                      <td style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>
                        {item.shiftStatus === "ON_DUTY" && (
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#10B981", background: "rgba(16, 185, 129, 0.1)", padding: "0.25rem 0.55rem", borderRadius: "12px", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                            🟢 On Duty
                          </span>
                        )}
                        {item.shiftStatus === "ON_BREAK" && (
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#F59E0B", background: "rgba(245, 158, 11, 0.1)", padding: "0.25rem 0.55rem", borderRadius: "12px", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
                            🟡 On Break
                          </span>
                        )}
                        {item.shiftStatus === "OFF_DUTY" && (
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6B7280", background: "rgba(107, 114, 128, 0.1)", padding: "0.25rem 0.55rem", borderRadius: "12px", border: "1px solid rgba(107, 114, 128, 0.25)" }}>
                            🔴 Off Duty
                          </span>
                        )}
                      </td>

                      {/* Total Accounts (Ascending) */}
                      <td style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>
                        <span style={{
                          fontSize: "1.1rem",
                          fontWeight: 800,
                          color: item.totalAccounts < 5 ? "#EF4444" : item.totalAccounts < 10 ? "#D97706" : "#10B981"
                        }}>
                          {item.totalAccounts} IDs
                        </span>
                      </td>

                      {/* Target Progress Bar */}
                      <td style={{ padding: "0.6rem 0.75rem", textAlign: "center", minWidth: "140px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", alignItems: "center" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                            <span>{item.totalAccounts} / {item.targetGoal} Target</span>
                            <span>{item.targetProgressPct}%</span>
                          </div>
                          <div style={{ width: "100%", height: "6px", background: "#E5E7EB", borderRadius: "9999px", overflow: "hidden" }}>
                            <div style={{
                              height: "100%",
                              width: `${item.targetProgressPct}%`,
                              background: item.targetProgressPct >= 100 
                                ? "#10B981" 
                                : item.targetProgressPct >= 50 
                                  ? "#F59E0B" 
                                  : "#EF4444",
                              borderRadius: "9999px",
                              transition: "width 0.3s ease"
                            }} />
                          </div>
                        </div>
                      </td>

                      {/* Active / Unverified */}
                      <td style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#10B981", background: "rgba(16, 185, 129, 0.08)", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                            ✓ {item.activeAccounts} Active
                          </span>
                          {item.unverifiedAccounts > 0 && (
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#EF4444", background: "rgba(239, 68, 68, 0.08)", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                              ✕ {item.unverifiedAccounts} Unverified
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Ads Published */}
                      <td style={{ padding: "0.6rem 0.75rem", textAlign: "center", fontWeight: 700, fontSize: "0.85rem", color: "#03045E" }}>
                        {item.totalAdsPublished} Ads
                      </td>

                      {/* Last Submission */}
                      <td style={{ padding: "0.6rem 0.75rem", textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {formattedDate}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
