"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  Users, 
  Eye, 
  EyeOff, 
  Download, 
  RefreshCw, 
  ShieldCheck, 
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "react-hot-toast";
import { 
  getITAgentsWithCountsAction, 
  getParsedAccountsLedgerAction, 
  exportAgentAccountsCSVAction 
} from "@/app/actions/it-parsed-accounts";
import { formatDate12h } from "@/lib/date-formatter";

interface AgentItem {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  lastActiveAt?: Date | null;
  totalToday: number;
  totalAllTime: number;
}

interface ITOperationalLogsClientProps {
  initialAgents: AgentItem[];
  initialAccounts: any[];
  initialTotal: number;
  user: {
    id: string;
    role: string;
    companyId?: string | null;
  };
}

export default function ITOperationalLogsClient({
  initialAgents,
  initialAccounts,
  initialTotal,
  user
}: ITOperationalLogsClientProps) {
  const [agents, setAgents] = useState<AgentItem[]>(initialAgents);
  const [ledger, setLedger] = useState<any[]>(initialAccounts);
  const [totalRecords, setTotalRecords] = useState<number>(initialTotal);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>("ALL");
  const [showHistoryPasswords, setShowHistoryPasswords] = useState<{ [key: string]: boolean }>({});
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  
  const [isPending, startTransition] = useTransition();

  // Padding helper for single-digit integers (e.g. "05" instead of "5")
  const pad = (num: number): string => {
    return num < 10 ? `0${num}` : String(num);
  };

  // 1. Reactive Background Polling (updates every 6 seconds without page reload)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await getITAgentsWithCountsAction();
        if (res.success && res.agents) {
          setAgents(res.agents as AgentItem[]);
        }
      } catch (err) {
        console.error("Error polling IT agents stats:", err);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // 2. Refetch stats on manual trigger
  const handleManualRefresh = async () => {
    toast.loading("Refreshing live IT metrics...", { id: "refresh-logs" });
    try {
      const res = await getITAgentsWithCountsAction();
      const ledgerRes = await getParsedAccountsLedgerAction(currentPage, selectedAgentFilter === "ALL" ? undefined : selectedAgentFilter);
      
      if (res.success && res.agents) {
        setAgents(res.agents as AgentItem[]);
      }
      if (ledgerRes.success) {
        setLedger(ledgerRes.accounts || []);
        setTotalRecords(ledgerRes.total || 0);
      }
      toast.success("Metrics and ledger up to date", { id: "refresh-logs" });
    } catch (e) {
      toast.error("Failed to sync metrics", { id: "refresh-logs" });
    }
  };

  // 3. Filter ledger by specific agent
  const handleAgentFilterChange = async (agentId: string) => {
    setSelectedAgentFilter(agentId);
    try {
      const filter = agentId === "ALL" ? undefined : agentId;
      const ledgerRes = await getParsedAccountsLedgerAction(1, filter);
      if (ledgerRes.success) {
        setLedger(ledgerRes.accounts || []);
        setTotalRecords(ledgerRes.total || 0);
        setCurrentPage(1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1) return;
    try {
      const filter = selectedAgentFilter === "ALL" ? undefined : selectedAgentFilter;
      const ledgerRes = await getParsedAccountsLedgerAction(newPage, filter);
      if (ledgerRes.success) {
        setLedger(ledgerRes.accounts || []);
        setTotalRecords(ledgerRes.total || 0);
        setCurrentPage(newPage);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Download agent CSV spreadsheet action
  const handleDownloadCSV = async (agent: AgentItem) => {
    toast.loading(`Compiling CSV ledger for ${agent.name}...`, { id: "csv-export" });
    try {
      const res = await exportAgentAccountsCSVAction(agent.id);
      if (res.success && res.csvData) {
        // Trigger browser file download
        const blob = new Blob([res.csvData], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `it_accounts_${agent.name.toLowerCase().replace(/\s+/g, "_")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`CSV exported successfully for ${agent.name}`, { id: "csv-export" });
      } else {
        toast.error(res.error || "Failed to compile export logs", { id: "csv-export" });
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred", { id: "csv-export" });
    }
  };

  const toggleHistoryPassword = (id: string) => {
    setShowHistoryPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Determine top contributor agent based on today's loading entries count
  const getTopAgentId = (): string | null => {
    let topId: string | null = null;
    let maxCount = -1;
    agents.forEach(a => {
      if (a.totalToday > maxCount && a.totalToday > 0) {
        maxCount = a.totalToday;
        topId = a.id;
      }
    });
    return topId;
  };

  const topAgentId = getTopAgentId();
  const totalPages = Math.max(1, Math.ceil(totalRecords / 50));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", height: "100%", width: "100%", overflowY: "auto", paddingBottom: "1.5rem" }}>
      
      {/* Cyber Command Header Banner */}
      <div 
        className="glass-panel" 
        style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "1.35rem 1.5rem", 
          borderRadius: "16px", 
          background: "linear-gradient(135deg, rgba(20, 18, 38, 0.95) 0%, rgba(11, 9, 22, 0.95) 100%)", 
          border: "1px solid rgba(56, 189, 248, 0.25)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.1)",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <FileSpreadsheet style={{ color: "#38BDF8" }} size={28} />
              IT Operational Logs
            </h1>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.62rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#10B981",
              background: "rgba(16, 185, 129, 0.12)",
              padding: "0.2rem 0.55rem",
              borderRadius: "20px",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              textTransform: "uppercase"
            }}>
              <span className="status-dot-pulse" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }} />
              Live Audit Sync
            </span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            CEO Master Audit: Real-time spreadsheet ingestion metrics, parsed account ledgers & team activity tracking.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Quick Stat Pill: Total Records */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255, 255, 255, 0.04)", padding: "0.45rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)", fontSize: "0.75rem" }}>
            <TrendingUp size={14} style={{ color: "#38BDF8" }} />
            <span style={{ color: "var(--text-muted)" }}>Ledger Entries:</span>
            <strong style={{ color: "#FFFFFF", fontFamily: "var(--font-mono)" }}>{pad(totalRecords)}</strong>
          </div>

          <button
            onClick={handleManualRefresh}
            className="btn-glass"
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.45rem", 
              padding: "0.55rem 1rem", 
              borderRadius: "8px", 
              fontSize: "0.78rem", 
              fontWeight: 800, 
              background: "rgba(56, 189, 248, 0.12)", 
              border: "1px solid rgba(56, 189, 248, 0.35)", 
              color: "#38BDF8",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <RefreshCw size={14} className={isPending ? "spin" : ""} />
            Sync Metrics
          </button>
        </div>
      </div>

      {/* Dynamic Agent Cards Workspace Section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Users size={18} style={{ color: "#38BDF8" }} />
            Dynamic IT Agent Discovery ({pad(agents.length)})
          </h2>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            Real-time spreadsheet contribution metrics
          </span>
        </div>

        {agents.length === 0 ? (
          <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", borderRadius: "16px", background: "rgba(20, 18, 38, 0.85)", border: "1px solid var(--border-dim)" }}>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>No active users with role "IT_DEPARTMENT" found in this tenant workspace.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1.25rem" }}>
            {agents.map((agent) => {
              const isTop = agent.id === topAgentId;
              
              return (
                <div 
                  key={agent.id}
                  className="glass-panel hover-card"
                  style={{
                    padding: "1.2rem",
                    borderRadius: "16px",
                    background: "rgba(20, 18, 38, 0.85)",
                    border: isTop ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "1rem",
                    position: "relative",
                    boxShadow: isTop ? "0 10px 25px rgba(0,0,0,0.4), 0 0 15px rgba(56, 189, 248, 0.15)" : "var(--shadow-premium)",
                    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}
                >
                  {isTop && (
                    <span style={{
                      position: "absolute",
                      top: "0.85rem",
                      right: "0.85rem",
                      fontSize: "0.6rem",
                      fontWeight: 900,
                      color: "#EF4444",
                      background: "rgba(239, 68, 68, 0.15)",
                      padding: "0.2rem 0.55rem",
                      borderRadius: "20px",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}>
                      🔥 Top Loader
                    </span>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {agent.image && !imageErrors[agent.id] ? (
                      <img 
                        src={agent.image} 
                        alt={agent.name} 
                        onError={() => {
                          setImageErrors(prev => ({
                            ...prev,
                            [agent.id]: true
                          }));
                        }}
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: isTop ? "2px solid #38BDF8" : "1.5px solid rgba(255, 255, 255, 0.15)",
                          boxShadow: isTop ? "0 0 12px rgba(56, 189, 248, 0.4)" : "none",
                          transition: "transform 0.2s ease",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.08)"}
                        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1.0)"}
                      />
                    ) : (
                      <div style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        background: "rgba(56, 189, 248, 0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: "0.95rem",
                        color: "#38BDF8",
                        border: isTop ? "2px solid #38BDF8" : "1.5px solid rgba(255, 255, 255, 0.12)"
                      }}>
                        {agent.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                      <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#FFFFFF" }}>{agent.name}</h3>
                      <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>{agent.email}</span>
                      <span style={{ fontSize: "0.62rem", color: "#10B981", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.15rem" }}>
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10B981" }} />
                        ● Active Agent
                      </span>
                    </div>
                  </div>

                  {/* Stats Dual Container */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", background: "rgba(255, 255, 255, 0.03)", padding: "0.75rem 0.85rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.63rem", color: "#64748B", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.05em" }}>Today</span>
                      <span style={{ fontSize: "1.3rem", fontWeight: 900, color: "#FFFFFF", fontFamily: "var(--font-mono)" }}>{pad(agent.totalToday)}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.63rem", color: "#64748B", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.05em" }}>All-Time</span>
                      <span style={{ fontSize: "1.3rem", fontWeight: 900, color: "#38BDF8", fontFamily: "var(--font-mono)" }}>{pad(agent.totalAllTime)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadCSV(agent)}
                    className="btn-glass"
                    style={{
                      width: "100%",
                      fontSize: "0.76rem",
                      fontWeight: 800,
                      padding: "0.55rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                      borderRadius: "8px",
                      background: "rgba(56, 189, 248, 0.08)",
                      border: "1px solid rgba(56, 189, 248, 0.25)",
                      color: "#38BDF8",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <Download size={14} />
                    Download CSV Audit
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Aggregate Master Ledger Audit Table */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: "1.35rem", 
          borderRadius: "16px", 
          background: "rgba(20, 18, 38, 0.85)", 
          border: "1px solid rgba(56, 189, 248, 0.2)", 
          boxShadow: "0 15px 35px rgba(0, 0, 0, 0.45)",
          display: "flex", 
          flexDirection: "column", 
          gap: "1rem" 
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#FFFFFF", display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <ShieldCheck size={20} style={{ color: "#38BDF8" }} />
            Aggregate Master Ledger Audit
          </h2>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Search size={15} style={{ color: "#94A3B8" }} />
            <select
              value={selectedAgentFilter}
              onChange={(e) => handleAgentFilterChange(e.target.value)}
              className="table-select-filter"
              style={{ fontSize: "0.78rem" }}
            >
              <option value="ALL">All IT Agents</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#64748B", borderBottom: "1px solid rgba(255, 255, 255, 0.09)", background: "rgba(255, 255, 255, 0.02)" }}>
                <th style={{ padding: "0.75rem 0.65rem", fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>#</th>
                <th style={{ padding: "0.75rem 0.65rem", fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Agent</th>
                <th style={{ padding: "0.75rem 0.65rem", fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Series Code</th>
                <th style={{ padding: "0.75rem 0.65rem", fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</th>
                <th style={{ padding: "0.75rem 0.65rem", fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Owner Name</th>
                <th style={{ padding: "0.75rem 0.65rem", fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
                    No matching account logs found for this filter.
                  </td>
                </tr>
              ) : (
                ledger.map((acc, idx) => {
                  const uploadingAgent = agents.find(a => a.id === acc.agentId);
                  
                  return (
                    <tr 
                      key={acc.id} 
                      style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", transition: "background 0.15s ease" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "0.75rem 0.65rem", fontWeight: 800, color: "#38BDF8", fontFamily: "var(--font-mono)" }}>
                        {pad((currentPage - 1) * 50 + idx + 1)}
                      </td>
                      <td style={{ padding: "0.75rem 0.65rem", fontWeight: 700, color: "#FFFFFF" }}>
                        {uploadingAgent ? uploadingAgent.name : "IT Agent"}
                      </td>
                      <td style={{ padding: "0.75rem 0.65rem", fontWeight: 800, color: "#38BDF8", fontFamily: "var(--font-mono)" }}>
                        {acc.seriesNumber}
                      </td>
                      <td style={{ padding: "0.75rem 0.65rem", fontFamily: "var(--font-mono)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span style={{ color: "#FFFFFF", letterSpacing: showHistoryPasswords[acc.id] ? "normal" : "0.15em" }}>
                            {showHistoryPasswords[acc.id] ? acc.password : "••••••••"}
                          </span>
                          <button 
                            onClick={() => toggleHistoryPassword(acc.id)}
                            style={{ border: "none", background: "none", cursor: "pointer", padding: "0.15rem", display: "flex", color: "#64748B", transition: "color 0.2s" }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#38BDF8"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "#64748B"}
                          >
                            {showHistoryPasswords[acc.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 0.65rem", color: "#94A3B8" }}>
                        {acc.name}
                      </td>
                      <td style={{ padding: "0.75rem 0.65rem", color: "#64748B", whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                        <span className="show-seconds-desktop">{formatDate12h(acc.createdAt, true)}</span>
                        <span className="hide-seconds-mobile" style={{ display: "none" }}>{formatDate12h(acc.createdAt, false)}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Verbatim pagination footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", fontSize: "0.78rem", color: "#64748B" }}>
          <span>
            Showing 1-50 of <strong style={{ color: "#FFFFFF", fontFamily: "var(--font-mono)" }}>{pad(totalRecords)}</strong> entries
          </span>
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn-glass"
                style={{ padding: "0.35rem 0.5rem", borderRadius: "6px", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontWeight: 800, color: "#FFFFFF", fontFamily: "var(--font-mono)" }}>{pad(currentPage)} / {pad(totalPages)}</span>
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="btn-glass"
                style={{ padding: "0.35rem 0.5rem", borderRadius: "6px", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

