"use client";

import React, { useState } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Laptop, 
  Crown, 
  ShieldCheck, 
  ShoppingCart, 
  Diamond, 
  ArrowUp,
  Monitor,
  UserCheck,
  Award
} from "lucide-react";

interface TeamStatsItem {
  userId: string;
  name: string;
  email: string;
  employeeId: string;
  image?: string | null;
  shiftStatus: string;
  laptops: string;
  teamLeadName: string;
  totalAccounts: number;
  totalFB: number;
  verifiedFB: number;
  unverifiedFB: number;
  identityFB: number;
  totalVinted: number;
  verifiedVinted: number;
  criticalRisks: number;
  submittedToday: boolean;
  lastSubmissionDate: string | null;
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
              <Sparkles size={24} style={{ color: "#48CAE4" }} />
              <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>TEAM MEMBERS PERFORMANCE &amp; ID STATS</h1>
            </div>
            <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.75)" }}>
              Real-time operational ID metrics card roster for your team. Sorted by lowest cataloged IDs first for instant TL intervention.
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
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: "0.85rem 1.25rem", background: "rgba(20, 18, 38, 0.75)", backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          {/* Search Box */}
          <div className="table-search-wrapper" style={{ width: "280px" }}>
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

      {/* Roster Cards List matching Demo Screenshot */}
      {filteredStats.length === 0 ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", background: "rgba(20, 18, 38, 0.75)", backdropFilter: "blur(16px)" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>No team members found matching search criteria.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {filteredStats.map((item, index) => {
            const formattedDate = item.lastSubmissionDate 
              ? new Date(item.lastSubmissionDate).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit"
                })
              : "No sync recorded";

            const serialBadge = `SD-0${(index % 5) + 2}`;

            return (
              <div
                key={item.userId}
                style={{
                  background: "#0D1B2A",
                  border: item.isLagging ? "1.5px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "14px",
                  padding: "1.25rem 1.5rem",
                  color: "#FFFFFF",
                  boxShadow: item.isLagging ? "0 10px 30px rgba(239, 68, 68, 0.15)" : "0 10px 25px rgba(0,0,0,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1.25rem",
                  flexWrap: "wrap"
                }}
              >
                {/* Left Column: Member Profile (DP + Name + Designation) */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: "1 1 260px", minWidth: "220px" }}>
                  {/* Circle DP */}
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1.5px solid rgba(255, 255, 255, 0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "1.1rem",
                    color: "#FFFFFF",
                    flexShrink: 0,
                    overflow: "hidden"
                  }}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      item.name.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  {/* Name and Designation */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#FFFFFF" }}>
                      {item.name}
                    </h3>
                    <div style={{ fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.65)", fontWeight: 500 }}>
                      Sales Representative
                    </div>
                  </div>
                </div>

                {/* Center Section: 6 Metric Stat Boxes matching Demo Screenshot */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, minmax(85px, 1fr))",
                  gap: "0.6rem",
                  flex: "2 1 540px"
                }}>
                  {/* Tile 1: Total FB */}
                  <div style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "0.75rem 0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center"
                  }}>
                    <Monitor size={16} style={{ color: "#38BDF8", marginBottom: "0.4rem" }} />
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#FFFFFF", lineHeight: 1 }}>
                      {item.totalFB}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "rgba(255, 255, 255, 0.5)", marginTop: "0.4rem", fontWeight: 600 }}>
                      Total FB (/80)
                    </div>
                  </div>

                  {/* Tile 2: Verified FB */}
                  <div style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "0.75rem 0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center"
                  }}>
                    <ShieldCheck size={16} style={{ color: "#F87171", marginBottom: "0.4rem" }} />
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#FFFFFF", lineHeight: 1 }}>
                      {item.verifiedFB}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "rgba(255, 255, 255, 0.5)", marginTop: "0.4rem", fontWeight: 600 }}>
                      Verified FB
                    </div>
                  </div>

                  {/* Tile 3: Unverified */}
                  <div style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "0.75rem 0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center"
                  }}>
                    <AlertTriangle size={16} style={{ color: "#FBBF24", marginBottom: "0.4rem" }} />
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#FFFFFF", lineHeight: 1 }}>
                      {item.unverifiedFB}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "rgba(255, 255, 255, 0.5)", marginTop: "0.4rem", fontWeight: 600 }}>
                      Unverified
                    </div>
                  </div>

                  {/* Tile 4: Identity FB */}
                  <div style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "0.75rem 0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center"
                  }}>
                    <Users size={16} style={{ color: "#94A3B8", marginBottom: "0.4rem" }} />
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#FFFFFF", lineHeight: 1 }}>
                      {item.identityFB}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "rgba(255, 255, 255, 0.5)", marginTop: "0.4rem", fontWeight: 600 }}>
                      Identity FB
                    </div>
                  </div>

                  {/* Tile 5: Total Vinted */}
                  <div style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "0.75rem 0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center"
                  }}>
                    <ShoppingCart size={16} style={{ color: "#38BDF8", marginBottom: "0.4rem" }} />
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#FFFFFF", lineHeight: 1 }}>
                      {item.totalVinted}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "rgba(255, 255, 255, 0.5)", marginTop: "0.4rem", fontWeight: 600 }}>
                      Total Vinted (/10)
                    </div>
                  </div>

                  {/* Tile 6: Verified Vt */}
                  <div style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "0.75rem 0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center"
                  }}>
                    <Diamond size={16} style={{ color: "#F97316", marginBottom: "0.4rem" }} />
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#FFFFFF", lineHeight: 1 }}>
                      {item.verifiedVinted}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "rgba(255, 255, 255, 0.5)", marginTop: "0.4rem", fontWeight: 600 }}>
                      Verified Vt
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
