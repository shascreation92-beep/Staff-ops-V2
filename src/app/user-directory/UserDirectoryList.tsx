"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Mail, Shield, User, CircleDot, Key, Lock, CheckCircle2, X } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { toast } from "react-hot-toast";
import { approveAndAssignPasswordITAction } from "@/app/actions/accounts";
import { getUsersMonitoringStatusAction } from "@/app/actions/telemetry";

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  image: string | null;
}

interface UserDirectoryListProps {
  initialUsers: UserData[];
  currentUserRole?: string;
}

export default function UserDirectoryList({ initialUsers, currentUserRole }: UserDirectoryListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredUsers = initialUsers.filter((u) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = (u.name || "").toLowerCase().includes(term);
    const emailMatch = u.email.toLowerCase().includes(term);
    return nameMatch || emailMatch;
  });

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const ITEMS_PER_PAGE = 50;
  const totalRecords = filteredUsers.length;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRecords);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

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

  const handleITApprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!passwordInput || passwordInput.trim().length < 6) {
      toast.error("Please enter a password with at least 6 characters.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await approveAndAssignPasswordITAction({
          userId: selectedUser.id,
          password: passwordInput
        });

        if (res.success) {
          toast.success(`Account for ${selectedUser.name || selectedUser.email} approved & password assigned!`);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("notification-updated"));
          }
          setSelectedUser(null);
          setPasswordInput("");
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to approve user and set password.");
      }
    });
  };

  const isITUser = currentUserRole === "IT_DEPARTMENT" || currentUserRole === "SUPER_ADMIN";

  const getInitials = (name: string | null) => {
    if (!name) return "OP";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    if (role === "TEAM_LEAD") return "Team Lead";
    if (role === "SALES_ASSOCIATE") return "Sales Representative";
    return role;
  };

  const [userStatusMap, setUserStatusMap] = useState<Record<string, { status: "ACTIVE" | "IDLE" | "INTERRUPTED" | "OFF_DUTY"; lastCapturedAt: string | null }>>({});

  React.useEffect(() => {
    const fetchStatus = () => {
      getUsersMonitoringStatusAction().then(res => {
        if (res?.success && res.userStatusMap) {
          setUserStatusMap(res.userStatusMap as any);
        }
      }).catch(() => {});
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 10000);
    return () => clearInterval(timer);
  }, []);

  const getTimeAgo = (dateIso: string | null) => {
    if (!dateIso) return "No sync data";
    const diffSec = Math.floor((Date.now() - new Date(dateIso).getTime()) / 1000);
    if (diffSec < 10) return "Synced just now";
    if (diffSec < 60) return `Synced ${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Synced ${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `Synced ${diffHr}h ago`;
  };

  const getAgentBadge = (userId: string) => {
    const monitoring = userStatusMap[userId];
    const status = monitoring?.status || "OFF_DUTY";
    const lastSyncStr = getTimeAgo(monitoring?.lastCapturedAt || null);

    let bg = "rgba(100, 116, 139, 0.08)";
    let color = "#64748B";
    let border = "rgba(100, 116, 139, 0.2)";
    let label = "OFFLINE";
    let dotColor = "#94A3B8";
    let pulse = false;

    if (status === "ACTIVE") {
      bg = "rgba(16, 185, 129, 0.08)";
      color = "#10B981";
      border = "rgba(16, 185, 129, 0.2)";
      label = "ONLINE";
      dotColor = "#10B981";
      pulse = true;
    } else if (status === "IDLE") {
      bg = "rgba(245, 158, 11, 0.08)";
      color = "#D97706";
      border = "rgba(245, 158, 11, 0.2)";
      label = "IDLE";
      dotColor = "#F59E0B";
    } else if (status === "INTERRUPTED") {
      bg = "rgba(239, 68, 68, 0.08)";
      color = "#EF4444";
      border = "rgba(239, 68, 68, 0.25)";
      label = "OFFLINE";
      dotColor = "#EF4444";
      pulse = false;
    }

    return (
      <a
        href={`/screen-telemetry?targetUserId=${userId}`}
        title={`Click to view live screen telemetry audit for this user (${lastSyncStr})`}
        style={{
          display: "inline-flex",
          flexDirection: "column",
          gap: "0.15rem",
          textDecoration: "none"
        }}
      >
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          fontSize: "0.72rem",
          fontWeight: 700,
          background: bg,
          color: color,
          padding: "0.25rem 0.65rem",
          borderRadius: "9999px",
          border: `1px solid ${border}`,
          transition: "all 0.2s ease"
        }}>
          <span 
            className={pulse ? "animate-pulse" : ""} 
            style={{ 
              width: "6px", 
              height: "6px", 
              borderRadius: "50%", 
              background: dotColor,
              display: "inline-block" 
            }} 
          />
          {label}
        </span>
        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginLeft: "0.2rem" }}>
          {lastSyncStr}
        </span>
      </a>
    );
  };

  const getStatusBadge = (status: string) => {
    const normalized = status.toUpperCase();
    if (normalized === "APPROVED") {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          fontSize: "0.72rem",
          fontWeight: 700,
          background: "rgba(34, 197, 94, 0.08)",
          color: "#22C55E",
          padding: "0.2rem 0.6rem",
          borderRadius: "9999px",
          border: "1px solid rgba(34, 197, 94, 0.2)"
        }}>
          <CircleDot size={10} fill="#22C55E" />
          Active
        </span>
      );
    }
    if (normalized === "PENDING" || normalized === "PENDING_TL") {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          fontSize: "0.72rem",
          fontWeight: 700,
          background: "rgba(245, 158, 11, 0.08)",
          color: "#D97706",
          padding: "0.2rem 0.6rem",
          borderRadius: "9999px",
          border: "1px solid rgba(245, 158, 11, 0.2)"
        }}>
          <CircleDot size={10} fill="#D97706" />
          Pending Onboarding
        </span>
      );
    }
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        fontSize: "0.72rem",
        fontWeight: 700,
        background: "rgba(239, 68, 68, 0.08)",
        color: "#EF4444",
        padding: "0.2rem 0.6rem",
        borderRadius: "9999px",
        border: "1px solid rgba(239, 68, 68, 0.2)"
      }}>
        <CircleDot size={10} fill="#EF4444" />
        {status.replace(/_/g, " ").toLowerCase()}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Search Header card */}
      <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem", position: "relative", zIndex: 40, background: "#FFFFFF" }}>
        <div style={{ flex: 1, minWidth: "280px" }}>
          <h1 className="text-gold-gradient" style={{ fontSize: "1.5rem", fontWeight: 800 }}>👥 SYSTEM USER DIRECTORY</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Search and view active Team Leads and Sales Representatives registered inside this organization.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginLeft: "auto", position: "relative", zIndex: 50 }}>
          <NotificationBell />
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem", background: "#FFFFFF", border: "1px solid var(--border-dim)" }}>
        <Search size={18} style={{ color: "var(--text-muted)", marginLeft: "0.25rem" }} />
        <input
          type="text"
          placeholder="Search users by name or email address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: "0.88rem",
            color: "var(--text-primary)",
            background: "transparent"
          }}
        />
      </div>

      {/* Grid of Users */}
      {filteredUsers.length === 0 ? (
        <div className="glass-panel" style={{ padding: "3rem 1.5rem", textAlign: "center", background: "#FFFFFF" }}>
          <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
            No registered users found matching "{searchTerm}" in this business unit.
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.5rem"
          }}>
            {paginatedUsers.map((u) => {
              const initials = getInitials(u.name);
              return (
                <div
                  key={u.id}
                  className="glass-panel"
                  style={{
                    padding: "1.5rem",
                    background: "#FFFFFF",
                    border: "1px solid var(--border-dim)",
                    borderRadius: "var(--border-radius)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    position: "relative",
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                >
                  {/* Header profile row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{
                      width: "3.25rem",
                      height: "3.25rem",
                      borderRadius: "50%",
                      background: u.role === "TEAM_LEAD" ? "rgba(2, 80, 161, 0.08)" : "rgba(212, 175, 55, 0.08)",
                      border: u.role === "TEAM_LEAD" ? "1.5px solid rgba(2, 80, 161, 0.2)" : "1.5px solid rgba(212, 175, 55, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                      overflow: "hidden"
                    }}>
                      <img
                        src={u.image || "/uploads/avatars/default-avatar.png"}
                        alt={u.name || "Avatar"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={u.name || "Operator"}>
                        {u.name || "Operator"}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: u.role === "TEAM_LEAD" ? "#0250A1" : "var(--text-secondary)", fontWeight: 700, marginTop: "0.15rem" }}>
                        {getRoleLabel(u.role)}
                      </span>
                    </div>
                  </div>

                  {/* divider */}
                  <div style={{ height: "1px", background: "var(--border-dim)" }} />

                  {/* technical credentials row */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      <Mail size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={u.email}>
                        {u.email}
                      </span>
                    </div>
                  </div>

                  {/* Footer status row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {getStatusBadge(u.status)}
                    </div>
                    <div>
                      {getAgentBadge(u.id)}
                    </div>
                  </div>

                  {/* IT Action: Approve & Assign Password */}
                  {isITUser && u.status.toUpperCase() === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setPasswordInput("");
                      }}
                      style={{
                        width: "100%",
                        padding: "0.55rem",
                        borderRadius: "8px",
                        background: "linear-gradient(135deg, #0077B6 0%, #0096C7 100%)",
                        color: "#FFFFFF",
                        border: "none",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.4rem",
                        marginTop: "0.25rem",
                        boxShadow: "0 2px 8px rgba(0, 119, 182, 0.2)"
                      }}
                    >
                      <Key size={14} />
                      <span>Approve & Set Password</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* IT Approval & Password Assignment Modal */}
          {selectedUser && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 8, 20, 0.75)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "1rem"
            }}>
              <div className="glass-panel" style={{
                width: "100%",
                maxWidth: "460px",
                background: "#FFFFFF",
                borderRadius: "16px",
                padding: "2rem",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
                position: "relative"
              }}>
                <button
                  onClick={() => setSelectedUser(null)}
                  style={{
                    position: "absolute",
                    top: "1.25rem",
                    right: "1.25rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748B"
                  }}
                >
                  <X size={20} />
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(0, 119, 182, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0077B6" }}>
                    <Key size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#0F172A" }}>
                      IT Approval & Password Assignment
                    </h3>
                    <p style={{ fontSize: "0.8rem", color: "#64748B", margin: 0 }}>
                      Set official credentials to activate account.
                    </p>
                  </div>
                </div>

                <div style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "0.85rem",
                  marginBottom: "1.25rem"
                }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A" }}>
                    {selectedUser.name || "Sales Representative"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.15rem" }}>
                    {selectedUser.email}
                  </div>
                </div>

                <form onSubmit={handleITApprove} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Assign Account Password <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pass123!Secure"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.65rem 0.85rem",
                        borderRadius: "8px",
                        border: "1px solid #CBD5E1",
                        fontSize: "0.85rem",
                        outline: "none"
                      }}
                    />
                    <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block", marginTop: "0.35rem" }}>
                      Only this password assigned by IT will grant login access to the representative.
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      style={{
                        flex: 1,
                        padding: "0.65rem",
                        borderRadius: "8px",
                        border: "1px solid #CBD5E1",
                        background: "#F8FAFC",
                        color: "#475569",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer"
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      style={{
                        flex: 1.5,
                        padding: "0.65rem",
                        borderRadius: "8px",
                        border: "none",
                        background: "#0077B6",
                        color: "#FFFFFF",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem"
                      }}
                    >
                      {isPending ? "Approving..." : "Approve & Activate Account"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Premium Minimalist Pagination Control Bar */}
          {totalRecords > 0 && (
            <div className="glass-panel" style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 1.5rem",
              background: "rgba(20, 18, 38, 0.75)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.09)",
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
      )}
    </div>
  );
}
