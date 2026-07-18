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
      
      {/* Page Header */}
      <div className="glass-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem", borderRadius: "12px", background: "rgba(255, 255, 255, 0.45)", border: "1px solid var(--border-dim)" }}>
        <div>
          <h1 style={{ fontSize: "1.55rem", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileSpreadsheet style={{ color: "var(--gold-premium)" }} size={26} />
            IT Operational Logs
          </h1>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            CEO Master Audit: Monitor real-time spreadsheet parsing metrics and download operational data ledgers.
          </p>
        </div>
        
        <button
          onClick={handleManualRefresh}
          className="btn-glass"
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.85rem", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700 }}
        >
          <RefreshCw size={13} />
          Sync Logs
        </button>
      </div>

      {/* Dynamic Agent Cards Workspace Section */}
      <div>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <Users size={18} style={{ color: "var(--gold-premium)" }} />
          Dynamic IT Agent Discovery ({pad(agents.length)})
        </h2>

        {agents.length === 0 ? (
          <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", borderRadius: "12px", background: "#FFFFFF", border: "1px solid var(--border-dim)" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No active users with role "IT_DEPARTMENT" found in this tenant.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {agents.map((agent) => {
              const isTop = agent.id === topAgentId;
              
              return (
                <div 
                  key={agent.id}
                  className="glass-panel hover-card"
                  style={{
                    padding: "1.1rem",
                    borderRadius: "16px",
                    background: "#FFFFFF",
                    border: "1px solid var(--border-dim)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "0.85rem",
                    position: "relative",
                    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)"
                  }}
                >
                  {isTop && (
                    <span style={{
                      position: "absolute",
                      top: "0.85rem",
                      right: "0.85rem",
                      fontSize: "0.58rem",
                      fontWeight: 900,
                      color: "rgb(220, 38, 38)",
                      background: "rgba(254, 226, 226, 0.85)",
                      padding: "0.15rem 0.45rem",
                      borderRadius: "20px",
                      border: "1px solid rgba(220, 38, 38, 0.15)"
                    }}>
                      🔥 Top Loader
                    </span>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
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
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: isTop ? "2px solid var(--gold-premium)" : "1px solid var(--border-dim)",
                          boxShadow: isTop ? "0 0 8px rgba(212, 175, 55, 0.4)" : "none",
                          transition: "transform 0.2s ease",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1.0)"}
                      />
                    ) : (
                      <div style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "rgba(15, 23, 42, 0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        color: "var(--gold-premium)",
                        border: isTop ? "2px solid var(--gold-premium)" : "1px solid var(--border-dim)"
                      }}>
                        {agent.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>{agent.name}</h3>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{agent.email}</span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", background: "rgba(15, 23, 42, 0.015)", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border-dim)" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Today</span>
                      <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--text-primary)" }}>{pad(agent.totalToday)}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>All-Time</span>
                      <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--text-primary)" }}>{pad(agent.totalAllTime)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadCSV(agent)}
                    className="btn-glass"
                    style={{
                      width: "100%",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "0.45rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.25rem",
                      borderRadius: "6px"
                    }}
                  >
                    <Download size={13} />
                    Download CSV Audit
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Aggregate Ledger History Table */}
      <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "16px", background: "#FFFFFF", border: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
            Aggregate Master Ledger Audit
          </h2>

          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Search size={14} style={{ color: "var(--text-muted)" }} />
            <select
              value={selectedAgentFilter}
              onChange={(e) => handleAgentFilterChange(e.target.value)}
              className="input-gold"
              style={{ fontSize: "0.75rem", padding: "0.4rem 1.8rem 0.4rem 0.6rem" }}
            >
              <option value="ALL">All IT Agents</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}>
                <th style={{ padding: "0.6rem 0.4rem" }}>#</th>
                <th style={{ padding: "0.6rem 0.4rem" }}>Agent</th>
                <th style={{ padding: "0.6rem 0.4rem" }}>Series Code</th>
                <th style={{ padding: "0.6rem 0.4rem" }}>Password</th>
                <th style={{ padding: "0.6rem 0.4rem" }}>Owner Name</th>
                <th style={{ padding: "0.6rem 0.4rem" }}>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No matching account logs found.
                  </td>
                </tr>
              ) : (
                ledger.map((acc, idx) => {
                  const uploadingAgent = agents.find(a => a.id === acc.agentId);
                  
                  return (
                    <tr key={acc.id} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      <td style={{ padding: "0.6rem 0.4rem", fontWeight: 700 }}>
                        {pad((currentPage - 1) * 50 + idx + 1)}
                      </td>
                      <td style={{ padding: "0.6rem 0.4rem", fontWeight: 700 }}>
                        {uploadingAgent ? uploadingAgent.name : "IT Agent"}
                      </td>
                      <td style={{ padding: "0.6rem 0.4rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {acc.seriesNumber}
                      </td>
                      <td style={{ padding: "0.6rem 0.4rem", fontFamily: "monospace" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <span>{showHistoryPasswords[acc.id] ? acc.password : "••••••••"}</span>
                          <button 
                            onClick={() => toggleHistoryPassword(acc.id)}
                            style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "flex", color: "var(--text-muted)" }}
                          >
                            {showHistoryPasswords[acc.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "0.6rem 0.4rem", color: "var(--text-secondary)" }}>
                        {acc.name}
                      </td>
                      <td style={{ padding: "0.6rem 0.4rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
          <span>
            Showing 1-50 of {pad(totalRecords)} entries
          </span>
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn-glass"
                style={{ padding: "0.3rem", borderRadius: "6px" }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontWeight: 700 }}>{pad(currentPage)} / {pad(totalPages)}</span>
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="btn-glass"
                style={{ padding: "0.3rem", borderRadius: "6px" }}
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
