"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Mail, Clock, Laptop, Key, Shield, Network, Eye, EyeOff, Edit3, X, Save, AlertCircle, Copy } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { toast } from "react-hot-toast";
import { saveAssociateEmployeeITAction } from "@/app/actions/employees";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  status: string;
  role: string;
  lastActiveAt: Date | null;
  employee?: {
    id: string;
    employeeId: string;
    laptopBrand: string | null;
    laptopModel: string | null;
    laptopSerialNumber: string | null;
    windowsVersion: string | null;
    vpnProvider: string | null;
    laptopPassword?: string | null;
    vpnCredentials?: string | null;
  } | null;
}

interface MyTeamDirectoryProps {
  members: TeamMember[];
}

export default function MyTeamDirectory({ members }: MyTeamDirectoryProps) {
  const [currentPage, setCurrentPage] = React.useState(1);

  const ITEMS_PER_PAGE = 50;
  const totalRecords = members.length;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRecords);
  const paginatedMembers = members.slice(startIndex, endIndex);

  const getPageNumbers = () => {
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
      <div className="glass-panel" style={{ padding: "1.5rem", position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }} className="text-gold-gradient">
            MY TEAM DIRECTORY
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Operational directory of Sales Associates currently mapped to your node operations.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <NotificationBell />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
        {members.length === 0 ? (
          <div className="glass-panel" style={{ gridColumn: "1 / -1", padding: "3rem", textAlign: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              <Users size={36} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
              <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>No associates assigned to your team.</span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Contact system administration to map associates to your Team Lead ID.
              </span>
            </div>
          </div>
        ) : (
          paginatedMembers.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))
        )}
      </div>

      {/* Premium Minimalist Pagination Control Bar */}
      {totalRecords > 0 && (
        <div className="glass-panel" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 1.5rem",
          background: "#FFFFFF",
          border: "1px solid var(--border-dim)",
          borderRadius: "var(--border-radius)",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
            Showing {totalRecords === 0 ? 0 : startIndex + 1}-{endIndex} of {totalRecords} entries
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
            {getPageNumbers().map((pageNum, idx) => {
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
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              style={{
                background: "transparent",
                border: "1px solid var(--border-dim)",
                borderRadius: "6px",
                padding: "0.35rem 0.75rem",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: currentPage === totalPages ? "var(--text-muted)" : "var(--text-primary)",
                cursor: currentPage === totalPages ? "default" : "pointer",
                opacity: currentPage === totalPages ? 0.5 : 1,
                transition: "all 0.2s ease"
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form states for IT Deployment specs
  const [laptopBrand, setLaptopBrand] = useState<string>(member.employee?.laptopBrand || "");
  const [laptopModel, setLaptopModel] = useState<string>(member.employee?.laptopModel || "");
  const [laptopSerialNumber, setLaptopSerialNumber] = useState<string>(member.employee?.laptopSerialNumber || "");
  const [laptopPassword, setLaptopPassword] = useState<string>(member.employee?.laptopPassword || "");
  const [windowsVersion, setWindowsVersion] = useState<string>(member.employee?.windowsVersion || "");
  const [vpnProvider, setVpnProvider] = useState<string>(member.employee?.vpnProvider || "");
  const [vpnCredentials, setVpnCredentials] = useState<string>(member.employee?.vpnCredentials || "");
  const [employeeId, setEmployeeId] = useState<string>(member.employee?.employeeId || "");

  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showVpn, setShowVpn] = useState(false);

  const initials = member.name
    ? member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "SA";

  const lastActive = member.lastActiveAt
    ? new Date(member.lastActiveAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";

  // Calculate if associate is online (active in the last 5 minutes)
  const isOnline = member.lastActiveAt
    ? (Date.now() - new Date(member.lastActiveAt).getTime() < 5 * 60 * 1000)
    : false;

  const ipAddress = `10.8.0.${(member.id.charCodeAt(0) % 254) + 1}`;

  let statusBadgeClass = "pending";
  if (member.status === "APPROVED") statusBadgeClass = "verified";
  else if (member.status === "BLOCKED" || member.status === "REJECTED") statusBadgeClass = "danger";

  const handleCopyText = (text: string, label: string) => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard!`);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        toast.success(`${label} copied to clipboard!`);
      }
    } catch (err) {
      toast.error("Failed to copy details.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await saveAssociateEmployeeITAction(member.id, {
          employeeId: employeeId || undefined,
          laptopBrand: (laptopBrand as any) || null,
          laptopModel: laptopModel || null,
          laptopSerialNumber: laptopSerialNumber || null,
          windowsVersion: (windowsVersion as any) || null,
          vpnProvider: (vpnProvider as any) || null,
          laptopPassword: laptopPassword || null,
          vpnCredentials: vpnCredentials || null,
        });

        if (res.success) {
          toast.success("IT Deployment details saved!");
          setIsEditing(false);
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to save details.");
      }
    });
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        position: "relative",
        transition: "all 0.3s ease",
        border: "1px solid var(--border-dim)",
        background: "#FFFFFF",
        boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
      }}
    >
      {/* Employee Database Profile (Employee DP / Front-Face) */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        <div className="user-avatar-gold" style={{ width: "48px", height: "48px", fontSize: "1.1rem", flexShrink: 0, marginTop: "0.25rem" }}>
          {initials}
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: "1.05rem",
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {member.name || "Unnamed Associate"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem" }}>
            <span
              style={{
                fontSize: "0.62rem",
                background: "rgba(2, 80, 161, 0.08)",
                color: "#0250A1",
                padding: "0.1rem 0.35rem",
                borderRadius: "4px",
                fontWeight: 800,
                textTransform: "uppercase"
              }}
            >
              {member.role.replace("_", " ")}
            </span>
            <span
              className={`badge ${statusBadgeClass}`}
              style={{
                fontSize: "0.62rem",
                textTransform: "uppercase",
                padding: "0.1rem 0.35rem"
              }}
            >
              {member.status}
            </span>
          </div>

          {/* Email Address Rendering Cleanly Under Name/DP area */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", minWidth: 0, marginTop: "0.4rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            <Mail size={12} style={{ color: "var(--gold-primary)", flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={member.email}>
              {member.email}
            </span>
            {/* Live Status Badge next to Gmail string */}
            <span style={{ fontSize: "0.7rem", display: "inline-flex", alignItems: "center", gap: "0.25rem", marginLeft: "0.5rem" }}>
              {isOnline ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#10B981", fontWeight: 700 }} className="animate-pulse">
                  🟢 Online
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#9CA3AF" }}>
                  ⚫ Offline
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Clock Icon Metadata Row - completely omit if Last Active is Never */}
      {lastActive !== "Never" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            borderTop: "1px solid var(--border-dim)",
            paddingTop: "0.75rem",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Clock size={14} style={{ color: "var(--gold-primary)", flexShrink: 0 }} />
            <span>Last Active: {lastActive}</span>
          </div>
        </div>
      )}

      {/* IT Deployment Details Section */}
      <div style={{ borderTop: "1px dashed var(--border-dim)", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <button
          onClick={() => {
            setIsExpanded(!isExpanded);
            if (isEditing) setIsEditing(false);
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--gold-primary)",
            fontSize: "0.75rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: 0,
            width: "fit-content"
          }}
        >
          {isExpanded ? "▼ Hide IT Deployment" : "▶ Show IT Deployment Details"}
        </button>

        {isExpanded && (
          <div style={{ background: "#F9FAFB", borderRadius: "8px", padding: "0.75rem", marginTop: "0.25rem" }}>
            {isEditing ? (
              /* Inline Edit Form */
              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div>
                    <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.15rem" }}>
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="e.g. EMP-101"
                      style={{ width: "100%", fontSize: "0.75rem", padding: "0.25rem 0.4rem", border: "1px solid var(--border-dim)", borderRadius: "4px", background: "#FFFFFF", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.15rem" }}>
                      Laptop Brand
                    </label>
                    <select
                      value={laptopBrand}
                      onChange={(e) => setLaptopBrand(e.target.value)}
                      style={{ width: "100%", fontSize: "0.75rem", padding: "0.25rem 0.4rem", border: "1px solid var(--border-dim)", borderRadius: "4px", background: "#FFFFFF", color: "var(--text-primary)" }}
                    >
                      <option value="">Select Brand...</option>
                      <option value="HP">HP</option>
                      <option value="Dell">Dell</option>
                      <option value="ThinkPad">ThinkPad</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div>
                    <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.15rem" }}>
                      Laptop Model
                    </label>
                    <input
                      type="text"
                      value={laptopModel}
                      onChange={(e) => setLaptopModel(e.target.value)}
                      placeholder="e.g. EliteBook 840"
                      style={{ width: "100%", fontSize: "0.75rem", padding: "0.25rem 0.4rem", border: "1px solid var(--border-dim)", borderRadius: "4px", background: "#FFFFFF", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.15rem" }}>
                      OS Version
                    </label>
                    <select
                      value={windowsVersion}
                      onChange={(e) => setWindowsVersion(e.target.value)}
                      style={{ width: "100%", fontSize: "0.75rem", padding: "0.25rem 0.4rem", border: "1px solid var(--border-dim)", borderRadius: "4px", background: "#FFFFFF", color: "var(--text-primary)" }}
                    >
                      <option value="">Select OS...</option>
                      <option value="Windows_10">Windows 10</option>
                      <option value="Windows_11">Windows 11</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.15rem" }}>
                    Laptop Serial Number
                  </label>
                  <input
                    type="text"
                    value={laptopSerialNumber}
                    onChange={(e) => setLaptopSerialNumber(e.target.value)}
                    placeholder="e.g. CND1234567"
                    style={{ width: "100%", fontSize: "0.75rem", padding: "0.25rem 0.4rem", border: "1px solid var(--border-dim)", borderRadius: "4px", background: "#FFFFFF", color: "var(--text-primary)" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.15rem" }}>
                    Laptop Password
                  </label>
                  <input
                    type="text"
                    value={laptopPassword}
                    onChange={(e) => setLaptopPassword(e.target.value)}
                    placeholder="Laptop login credential"
                    style={{ width: "100%", fontSize: "0.75rem", padding: "0.25rem 0.4rem", border: "1px solid var(--border-dim)", borderRadius: "4px", background: "#FFFFFF", color: "var(--text-primary)" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div>
                    <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.15rem" }}>
                      VPN Provider
                    </label>
                    <select
                      value={vpnProvider}
                      onChange={(e) => setVpnProvider(e.target.value)}
                      style={{ width: "100%", fontSize: "0.75rem", padding: "0.25rem 0.4rem", border: "1px solid var(--border-dim)", borderRadius: "4px", background: "#FFFFFF", color: "var(--text-primary)" }}
                    >
                      <option value="">Select VPN...</option>
                      <option value="Surfshark">Surfshark</option>
                      <option value="ExpressVPN">ExpressVPN</option>
                      <option value="NordVPN">NordVPN</option>
                      <option value="ProtonVPN">ProtonVPN</option>
                      <option value="PureVPN">PureVPN</option>
                      <option value="HideMe">HideMe</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.15rem" }}>
                      VPN Credentials
                    </label>
                    <input
                      type="text"
                      value={vpnCredentials}
                      onChange={(e) => setVpnCredentials(e.target.value)}
                      placeholder="Username / Password details"
                      style={{ width: "100%", fontSize: "0.75rem", padding: "0.25rem 0.4rem", border: "1px solid var(--border-dim)", borderRadius: "4px", background: "#FFFFFF", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-gold"
                    style={{
                      flex: 1,
                      padding: "0.35rem 0.5rem",
                      fontSize: "0.72rem",
                      height: "auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.25rem"
                    }}
                  >
                    <Save size={12} /> {isPending ? "Saving..." : "Save Details"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    style={{
                      flex: 1,
                      padding: "0.35rem 0.5rem",
                      fontSize: "0.72rem",
                      background: "rgba(0,0,0,0.04)",
                      border: "1px solid var(--border-dim)",
                      borderRadius: "4px",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.25rem"
                    }}
                  >
                    <X size={12} /> Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* Read-Only Details Panel */
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", fontSize: "0.75rem" }}>
                {/* Technical IP Address Frame & Copy Button */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", background: "rgba(2, 80, 161, 0.03)", padding: "0.3rem 0.5rem", borderRadius: "6px", border: "1px solid rgba(2, 80, 161, 0.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Network size={13} style={{ color: "var(--gold-primary)", flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>IP Address:</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--text-primary)" }}>{ipAddress}</span>
                  </div>
                  <button
                    onClick={() => handleCopyText(ipAddress, "IP Address")}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "0.15rem", color: "var(--text-muted)", opacity: 0.6, display: "flex", alignItems: "center" }}
                    title="Copy IP Address"
                  >
                    <Copy size={12} />
                  </button>
                </div>

                {member.employee ? (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                      <Laptop size={14} style={{ color: "var(--gold-primary)", marginTop: "0.1rem", flexShrink: 0 }} />
                      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          <span style={{ fontWeight: 800, color: "var(--text-primary)" }}>
                            {member.employee.laptopBrand || "N/A"} {member.employee.laptopModel || ""}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginTop: "0.1rem" }}>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                            S/N: {member.employee.laptopSerialNumber || "N/A"} | OS: {member.employee.windowsVersion?.replace("_", " ") || "N/A"}
                          </span>
                          {member.employee.laptopSerialNumber && (
                            <button
                              onClick={() => handleCopyText(member.employee!.laptopSerialNumber || "", "Serial Number")}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text-muted)", opacity: 0.6, display: "inline-flex" }}
                              title="Copy Serial Number"
                            >
                              <Copy size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                      <Key size={14} style={{ color: "var(--gold-primary)", marginTop: "0.1rem", flexShrink: 0 }} />
                      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        <span style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.7rem" }}>Laptop Login</span>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "0.72rem" }}>
                              {showPassword ? (member.employee.laptopPassword || "N/A") : "••••••••"}
                            </span>
                            {member.employee.laptopPassword && (
                              <button
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "inline-flex" }}
                              >
                                {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>
                            )}
                          </div>
                          {member.employee.laptopPassword && (
                            <button
                              onClick={() => handleCopyText(member.employee!.laptopPassword || "", "Laptop Password")}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text-muted)", opacity: 0.6, display: "inline-flex" }}
                              title="Copy Laptop Password"
                            >
                              <Copy size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                      <Shield size={14} style={{ color: "var(--gold-primary)", marginTop: "0.1rem", flexShrink: 0 }} />
                      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        <span style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.7rem" }}>VPN ({member.employee.vpnProvider || "N/A"})</span>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              {showVpn ? (member.employee.vpnCredentials || "N/A") : "••••••••"}
                            </span>
                            {member.employee.vpnCredentials && (
                              <button
                                onClick={() => setShowVpn(!showVpn)}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "inline-flex" }}
                              >
                                {showVpn ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>
                            )}
                          </div>
                          {member.employee.vpnCredentials && (
                            <button
                              onClick={() => handleCopyText(member.employee!.vpnCredentials || "", "VPN Credentials")}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text-muted)", opacity: 0.6, display: "inline-flex" }}
                              title="Copy VPN Credentials"
                            >
                              <Copy size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-muted)", fontSize: "0.7rem", padding: "0.25rem 0" }}>
                    <AlertCircle size={12} />
                    <span>No hardware specs assigned yet.</span>
                  </div>
                )}

                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    background: "rgba(2, 80, 161, 0.05)",
                    border: "1px solid rgba(2, 80, 161, 0.15)",
                    borderRadius: "4px",
                    padding: "0.3rem 0.5rem",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    color: "#0250A1",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.25rem",
                    marginTop: "0.25rem",
                    width: "100%"
                  }}
                >
                  <Edit3 size={11} /> ✏️ Edit IT Details
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
