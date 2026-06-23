"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Search, 
  LogIn, 
  Terminal, 
  Globe, 
  User, 
  Monitor,
  Eye
} from "lucide-react";

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
                {filteredAudits.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      No audit logs captured.
                    </td>
                  </tr>
                ) : (
                  filteredAudits.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                        {new Date(log.createdAt).toLocaleString()}
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
                {filteredLogins.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      No authentication sessions recorded.
                    </td>
                  </tr>
                ) : (
                  filteredLogins.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                        {new Date(log.loginTime).toLocaleString()}
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: log.logoutTime ? "var(--text-primary)" : "var(--color-success)" }}>
                        {log.logoutTime ? new Date(log.logoutTime).toLocaleString() : "ACTIVE SESSION"}
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
      </div>

    </div>
  );
}
