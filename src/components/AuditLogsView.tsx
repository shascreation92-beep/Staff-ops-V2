"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Search, 
  LogIn, 
  Terminal, 
  Globe, 
  User, 
  Monitor,
  Eye,
  Download,
  Trash2
} from "lucide-react";
import NotificationBell from "./NotificationBell";
import { formatDate12h } from "@/lib/date-formatter";
import { downloadCSV } from "@/lib/csv-exporter";
import { clearAuditLogsAction } from "@/app/actions/audit-logs";
import { toast } from "react-hot-toast";

interface AuditLogsViewProps {
  auditLogs: any[];
  loginLogs: any[];
}

export default function AuditLogsView({
  auditLogs,
  loginLogs
}: AuditLogsViewProps) {
  const [activeTab, setActiveTab] = useState<"AUDIT" | "LOGIN">("AUDIT");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleExportCSV = () => {
    if (activeTab === "AUDIT") {
      const headers = ["Timestamp", "Operator", "Role", "Action", "Entity", "Entity ID", "IP Address", "Country"];
      const rows = filteredAudits.map(log => [
        new Date(log.createdAt).toLocaleString(),
        log.user?.name || log.userEmail || "System",
        log.userRole || "SYSTEM",
        log.action,
        log.entity,
        log.entityId || "",
        log.ipAddress,
        log.country || "US"
      ]);
      downloadCSV(headers, rows, `audit_system_operations_${new Date().toISOString().slice(0,10)}`);
    } else {
      const headers = ["Login Time", "Logout Time", "Operator Name", "Operator Email", "Device", "Browser", "IP Address", "Country", "Duration (Minutes)"];
      const rows = filteredLogins.map(log => [
        new Date(log.loginTime).toLocaleString(),
        log.logoutTime ? new Date(log.logoutTime).toLocaleString() : "ACTIVE SESSION",
        log.user?.name || "N/A",
        log.user?.email || "N/A",
        log.device || "Desktop",
        log.browser || "Chrome",
        log.ipAddress,
        log.country || "US",
        log.sessionLength ? Math.round(log.sessionLength / 60).toString() : "Ongoing"
      ]);
      downloadCSV(headers, rows, `audit_login_sessions_${new Date().toISOString().slice(0,10)}`);
    }
  };

  const handleClearLogs = () => {
    const doubleConfirm = window.confirm("WARNING: This will permanently delete ALL system audit logs and login logs from the database. Are you absolutely sure?");
    if (!doubleConfirm) return;

    startTransition(async () => {
      try {
        const res = await clearAuditLogsAction();
        if (res.success) {
          toast.success("Logs cleared successfully.");
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to clear logs.");
      }
    });
  };

  const filteredAudits = auditLogs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.userEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.user?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogins = loginLogs.filter(log => 
    (log.user?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.user?.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.browser || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.device || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.country || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const ITEMS_PER_PAGE = 50;

  const totalAudits = filteredAudits.length;
  const auditPages = Math.ceil(totalAudits / ITEMS_PER_PAGE) || 1;
  const auditStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const auditEnd = Math.min(auditStart + ITEMS_PER_PAGE, totalAudits);
  const paginatedAudits = filteredAudits.slice(auditStart, auditEnd);

  const totalLogins = filteredLogins.length;
  const loginPages = Math.ceil(totalLogins / ITEMS_PER_PAGE) || 1;
  const loginStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const loginEnd = Math.min(loginStart + ITEMS_PER_PAGE, totalLogins);
  const paginatedLogins = filteredLogins.slice(loginStart, loginEnd);

  const getPageNumbers = (totalPages: number) => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Tab Select & Search bar */}
      <div className="glass-panel table-panel" style={{ padding: "0.6rem 1.25rem", marginBottom: 0 }}>
        <div className="table-toolbar">
          <div style={{ display: "flex", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-gold)", borderRadius: "var(--border-radius-sm)", padding: "0.2rem" }}>
            <button
              onClick={() => { setActiveTab("AUDIT"); setSearchTerm(""); }}
              className={`chart-tab ${activeTab === "AUDIT" ? "active" : ""}`}
            >
              System Operations
            </button>
            <button
              onClick={() => { setActiveTab("LOGIN"); setSearchTerm(""); }}
              className={`chart-tab ${activeTab === "LOGIN" ? "active" : ""}`}
            >
              Login Sessions
            </button>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "1.5rem" }}>
            <button 
              className="btn-gold" 
              onClick={handleExportCSV}
              style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", padding: "0.45rem 0.75rem" }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <button 
              className="btn-gold" 
              onClick={handleClearLogs}
              disabled={isPending}
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "0.35rem", 
                fontSize: "0.78rem", 
                padding: "0.45rem 0.75rem", 
                background: "rgba(239, 68, 68, 0.08)", 
                border: "1px solid rgba(239, 68, 68, 0.25)", 
                color: "#f87171" 
              }}
            >
              <Trash2 size={14} />
              <span>{isPending ? "Clearing..." : "Clear Logs"}</span>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginLeft: "auto" }}>
            <div className="table-search-wrapper" style={{ width: "280px" }}>
              <Search className="header-search-icon" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="header-search-input"
              />
            </div>
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel table-panel">
        <div className="table-container-outer">
          
          {activeTab === "AUDIT" ? (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Operator</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                  <th>Geolocation</th>
                </tr>
              </thead>
              <tbody>
                {totalAudits === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      No audit logs captured.
                    </td>
                  </tr>
                ) : (
                  paginatedAudits.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        <span className="show-seconds-desktop">{formatDate12h(log.createdAt, true)}</span>
                        <span className="hide-seconds-mobile" style={{ display: "none" }}>{formatDate12h(log.createdAt, false)}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {log.user?.name || log.userEmail || "System"}
                      </td>
                      <td>
                        <span className="badge developer" style={{ fontSize: "0.65rem", border: "1px solid rgba(255,255,255,0.05)" }}>
                          {log.userRole || "SYSTEM"}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: log.action.includes("CREATE") ? "rgba(34,197,94,0.06)" : log.action.includes("DELETE") || log.action.includes("ARCHIVE") ? "rgba(239,68,68,0.06)" : "rgba(255,215,0,0.04)",
                          border: log.action.includes("CREATE") ? "1px solid rgba(34,197,94,0.2)" : log.action.includes("DELETE") || log.action.includes("ARCHIVE") ? "1px solid rgba(239,68,68,0.2)" : "1px solid var(--border-gold)",
                          color: log.action.includes("CREATE") ? "var(--color-success)" : log.action.includes("DELETE") || log.action.includes("ARCHIVE") ? "var(--color-danger)" : "var(--gold-primary)",
                          fontSize: "0.65rem"
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--gold-premium)" }}>
                        {log.entity} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ""}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {log.oldValue && <span>From: {log.oldValue.slice(0,60)} </span>}
                        {log.newValue && <span>To: {log.newValue.slice(0,60)}</span>}
                        {!log.oldValue && !log.newValue && <span style={{ color: "var(--text-muted)" }}>None</span>}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                          <Globe size={12} style={{ color: "var(--gold-primary)" }} />
                          <span>{log.ipAddress} ({log.country || "US"})</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Login Time</th>
                  <th>Logout Time</th>
                  <th>Operator</th>
                  <th>Device / Host</th>
                  <th>Browser Agent</th>
                  <th>IP Address</th>
                  <th>Session Duration</th>
                </tr>
              </thead>
              <tbody>
                {totalLogins === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      No authentication sessions recorded.
                    </td>
                  </tr>
                ) : (
                  paginatedLogins.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        <span className="show-seconds-desktop">{formatDate12h(log.loginTime, true)}</span>
                        <span className="hide-seconds-mobile" style={{ display: "none" }}>{formatDate12h(log.loginTime, false)}</span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: log.logoutTime ? "var(--text-primary)" : "var(--color-success)", whiteSpace: "nowrap" }}>
                        {log.logoutTime ? (
                          <>
                            <span className="show-seconds-desktop">{formatDate12h(log.logoutTime, true)}</span>
                            <span className="hide-seconds-mobile" style={{ display: "none" }}>{formatDate12h(log.logoutTime, false)}</span>
                          </>
                        ) : "ACTIVE SESSION"}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {log.user?.name}
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{log.user?.email}</div>
                      </td>
                      <td style={{ fontSize: "0.8rem" }}>{log.device || "Desktop"}</td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{log.browser || "Chrome"}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                        {log.ipAddress} ({log.country || "US"})
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 600 }}>
                        {log.sessionLength ? `${Math.round(log.sessionLength / 60)} min` : "Ongoing"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

        </div>

        {/* Premium Minimalist Pagination Control Bar */}
        {(() => {
          const currentTotal = activeTab === "AUDIT" ? totalAudits : totalLogins;
          const currentPages = activeTab === "AUDIT" ? auditPages : loginPages;
          const currentStart = activeTab === "AUDIT" ? auditStart : loginStart;
          const currentEnd = activeTab === "AUDIT" ? auditEnd : loginEnd;

          if (currentTotal === 0) return null;

          return (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 1.5rem",
              borderTop: "1px solid var(--border-dim)",
              background: "#FFFFFF",
              flexWrap: "wrap",
              gap: "1rem"
            }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
                Showing {currentTotal === 0 ? 0 : currentStart + 1}-{currentEnd} of {currentTotal} entries
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-dim)",
                    borderRadius: "6px",
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: currentPage === 1 ? "var(--text-muted)" : "var(--text-primary)",
                    cursor: currentPage === 1 ? "default" : "pointer",
                    opacity: currentPage === 1 ? 0.5 : 1,
                    transition: "all 0.2s ease"
                  }}
                >
                  Previous
                </button>

                {/* Page numbers */}
                {getPageNumbers(currentPages).map((pageNum, idx) => {
                  if (pageNum === '...') {
                    return (
                      <span key={`dots-${idx}`} style={{ padding: "0 0.5rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                        ...
                      </span>
                    );
                  }
                  const isSelected = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum as number)}
                      style={{
                        background: isSelected ? "var(--gold-primary)" : "transparent",
                        border: isSelected ? "1px solid var(--gold-primary)" : "1px solid var(--border-dim)",
                        borderRadius: "6px",
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: isSelected ? "#FFFFFF" : "var(--text-secondary)",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  disabled={currentPage === currentPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, currentPages))}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-dim)",
                    borderRadius: "6px",
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: currentPage === currentPages ? "var(--text-muted)" : "var(--text-primary)",
                    cursor: currentPage === currentPages ? "default" : "pointer",
                    opacity: currentPage === currentPages ? 0.5 : 1,
                    transition: "all 0.2s ease"
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
