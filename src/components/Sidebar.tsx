"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Sliders, 
  Shield, 
  Database, 
  Laptop, 
  FileText,
  UserCheck,
  LogOut,
  Key,
  ClipboardCheck,
  Megaphone
} from "lucide-react";
import { signOut } from "next-auth/react";
import { user_role } from "@prisma/client";
import { updateUserPasswordAction } from "@/app/actions/users";
import { getPendingTLRequestsCountAction } from "@/app/actions/accounts";
import { useEffect } from "react";

interface SidebarProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: user_role;
    companyName?: string | null;
    teamLeadName?: string | null;
  };
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ user, isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();

  // Change Password state
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changePassError, setChangePassError] = useState<string | null>(null);
  const [changePassSuccess, setChangePassSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Dynamic notification count for TL requests
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  useEffect(() => {
    if (user.role !== "TEAM_LEAD") return;

    const fetchCount = () => {
      getPendingTLRequestsCountAction()
        .then(count => setPendingRequestsCount(count))
        .catch(err => console.error("Failed to fetch pending requests count", err));
    };

    fetchCount();
    const interval = setInterval(fetchCount, 15000); // refresh every 15 seconds
    return () => clearInterval(interval);
  }, [user.role]);

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);
    setChangePassSuccess(false);

    if (!newPassword.trim()) {
      setChangePassError("Password cannot be empty.");
      return;
    }

    if (newPassword.trim().length < 8) {
      setChangePassError("Password must be at least 8 characters.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateUserPasswordAction(newPassword.trim());
        if (res.success) {
          setChangePassSuccess(true);
          setNewPassword("");
          setTimeout(() => {
            setShowChangePassModal(false);
            setChangePassSuccess(false);
          }, 2000);
        }
      } catch (err: any) {
        setChangePassError(err.message || "Failed to change password.");
      }
    });
  };

  // Define sidebar menu options based on user role permissions
  const menuItems = [
    { 
      id: "dashboard", 
      label: "Dashboard", 
      path: "/", 
      icon: LayoutDashboard,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"] 
    },
    { 
      id: "accounts", 
      label: user.role === "TEAM_LEAD" ? "My Data / Add Account" : "User Data", 
      path: "/accounts", 
      icon: Database,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"] 
    },
    { 
      id: "personal-notes", 
      label: "My Personal Notes", 
      path: "/personal-notes", 
      icon: FileText,
      roles: ["TEAM_LEAD", "SALES_ASSOCIATE"] 
    },
    {
      id: "team-live-roster",
      label: "Team Live Roster",
      path: "/team-live-roster",
      icon: Users,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD"]
    },
    { 
      id: "associates-requests", 
      label: "Associates Requests", 
      path: "/associates-requests", 
      icon: ClipboardCheck,
      roles: ["TEAM_LEAD"] 
    },
    { 
      id: "my-team", 
      label: "My Team", 
      path: "/my-team", 
      icon: UserCheck,
      roles: ["TEAM_LEAD"] 
    },
    { 
      id: "team-leads", 
      label: "Team Leads", 
      path: "/team-leads", 
      icon: UserCheck,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER"] 
    },

    { 
      id: "settings", 
      label: user.role === "SUPER_ADMIN" ? "Platform Shard" : (user.role === "IT_DEPARTMENT" ? "User Management" : "Rule Engine"), 
      path: "/settings", 
      icon: Sliders,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"] 
    },
    { 
      id: "announcements", 
      label: "Announcements", 
      path: "/announcements", 
      icon: Megaphone,
      roles: ["COMPANY_OWNER", "IT_DEPARTMENT"] 
    },
    { 
      id: "audit-logs", 
      label: "Audit Logs", 
      path: "/audit-logs", 
      icon: FileText,
      roles: ["SUPER_ADMIN"] 
    }
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));
  const userInitials = user.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "OP";

  const getDesignation = (role: user_role) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "COMPANY_OWNER":
        return "Company Owner";
      case "TEAM_LEAD":
        return "Team Lead";
      case "SALES_ASSOCIATE":
        return "Sales Associate";
      case "IT_DEPARTMENT":
        return "IT Operations";
      default:
        return "Member";
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      {/* Omagie/Boltz Logo Container */}
      <div className="sidebar-logo-container">
        <div className="sidebar-logo-brand">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="var(--border-dim)" />
            <path d="M17 5L9 17H16L15 27L23 15H16L17 5Z" fill="var(--gold-primary)" />
          </svg>
          <span className="sidebar-logo-text">StaffOps</span>
        </div>
      </div>

      {/* User Profile Header (Top-ish, below Logo) */}
      <div className="sidebar-profile">
        {/* Change Password Button */}
        {["SUPER_ADMIN", "COMPANY_OWNER"].includes(user.role) && (
          <button
            onClick={() => {
              setNewPassword("");
              setChangePassError(null);
              setChangePassSuccess(false);
              setShowChangePassModal(true);
            }}
            className="profile-key-btn"
            title="Change Password"
          >
            <Key size={13} />
          </button>
        )}

        <div className="profile-avatar-container">
          <div className="profile-avatar-circle">
            {userInitials}
          </div>
        </div>

        <div className="profile-info">
          <span className="profile-greeting">HELLO</span>
          <span className="profile-name" title={`${user.name || "Operator"} - ${getDesignation(user.role)}`}>
            <strong>{user.name || "Operator"}</strong> - <span className="profile-designation">{getDesignation(user.role)}</span>
          </span>
          <span className="profile-email" title={user.email || ""}>
            {user.email || ""}
          </span>
        </div>
      </div>

      {user.role === "SALES_ASSOCIATE" && user.teamLeadName && (
        <div className="sidebar-reporting-badge">
          <span className="reporting-label">Reporting To</span>
          <span className="reporting-name">{user.teamLeadName}</span>
        </div>
      )}

      <nav className="sidebar-menu">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.id}
              href={item.path}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <Icon className="sidebar-icon" size={20} />
              <span>{item.label}</span>
              {item.id === "associates-requests" && pendingRequestsCount > 0 && (
                <span 
                  style={{
                    marginLeft: "auto",
                    background: "linear-gradient(135deg, #ff4d4d, #cc0000)",
                    color: "white",
                    borderRadius: "9999px",
                    padding: "0.15rem 0.5rem",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                    lineHeight: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 8px rgba(239, 68, 68, 0.4)",
                    animation: "pulse 2s infinite"
                  }}
                >
                  🔴 {pendingRequestsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {user.role === "IT_DEPARTMENT" && (
        <ITLiveRosterAccordion />
      )}

      <div className="sidebar-footer-wrap">
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="sidebar-logout-btn"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>

      {/* Clean minimal footer credits */}
      <div className="sidebar-credit-footer">
        <span>StaffOps Console</span>
        <span>© 2026 All Rights Reserved</span>
      </div>

      {/* Change Password Modal */}
      {showChangePassModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.3)",
          backdropFilter: "blur(6px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem"
        }}>
          <div className="glass-panel" style={{
            maxWidth: "400px",
            width: "100%",
            padding: "2rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            boxShadow: "var(--shadow-premium)"
          }}>
            <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>CHANGE PASSWORD</h2>

            {changePassError && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                {changePassError}
              </div>
            )}

            {changePassSuccess && (
              <div style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-success)", fontSize: "0.85rem" }}>
                Password changed and synchronized in real-time.
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-gold"
                  disabled={isPending}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowChangePassModal(false)}
                  className="btn-glass"
                  style={{ flex: 1 }}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold"
                  style={{ flex: 1 }}
                  disabled={isPending}
                >
                  {isPending ? "Saving..." : "Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}

function ITLiveRosterAccordion() {
  const [teamLeads, setTeamLeads] = useState<any[]>([]);
  const [expandedLeads, setExpandedLeads] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const res = await fetch("/api/it/roster");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setTeamLeads(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch IT live roster:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoster();
    const interval = setInterval(fetchRoster, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleLead = (leadId: string) => {
    if (expandedLeads.includes(leadId)) {
      setExpandedLeads(expandedLeads.filter(id => id !== leadId));
    } else {
      setExpandedLeads([...expandedLeads, leadId]);
    }
  };

  const getUptimeString = (createdAtStr: string, lastActiveStr: string | null) => {
    if (!lastActiveStr) return "-";
    const lastActiveTime = new Date(lastActiveStr).getTime();
    const isOnline = (now - lastActiveTime) < 5 * 60 * 1000;
    if (!isOnline) return "-";

    const startTime = new Date(createdAtStr).getTime();
    const diff = Math.max(0, Math.floor((now - startTime) / 1000));
    const hrs = Math.floor(diff / 3600).toString().padStart(2, "0");
    const mins = Math.floor((diff % 3600) / 60).toString().padStart(2, "0");
    const secs = (diff % 60).toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const checkIsOnline = (lastActiveStr: string | null) => {
    if (!lastActiveStr) return false;
    return (now - new Date(lastActiveStr).getTime()) < 5 * 60 * 1000;
  };

  return (
    <div style={{ marginTop: "1rem", padding: "0 0.75rem", borderTop: "1px solid var(--border-dim)", paddingTop: "1rem" }}>
      <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: "0.5rem" }}>
        Live Team Roster
      </span>
      {loading && teamLeads.length === 0 ? (
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", padding: "0 0.5rem" }}>Loading roster...</span>
      ) : teamLeads.length === 0 ? (
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", padding: "0 0.5rem" }}>No team leads found.</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {teamLeads.map((lead) => {
            const isExpanded = expandedLeads.includes(lead.id);
            const leadOnline = checkIsOnline(lead.lastActiveAt);
            return (
              <div key={lead.id} style={{ display: "flex", flexDirection: "column" }}>
                <button
                  onClick={() => toggleLead(lead.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "0.4rem 0.5rem",
                    background: isExpanded ? "rgba(2, 80, 161, 0.04)" : "none",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--text-primary)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    transition: "background 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span>{leadOnline ? "🟢" : "⚫"}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }}>
                      {lead.name}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>

                {isExpanded && (
                  <div style={{ paddingLeft: "1rem", marginTop: "0.2rem", display: "flex", flexDirection: "column", gap: "0.25rem", borderLeft: "1px dashed var(--border-gold)" }}>
                    {!lead.other_user || lead.other_user.length === 0 ? (
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", padding: "0.2rem 0.5rem" }}>
                        No members
                      </span>
                    ) : (
                      lead.other_user.map((assoc: any) => {
                        const online = checkIsOnline(assoc.lastActiveAt);
                        const uptime = getUptimeString(assoc.createdAt, assoc.lastActiveAt);
                        return (
                          <div
                            key={assoc.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "0.25rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "0.72rem"
                            }}
                          >
                            <span style={{ color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80px" }} title={assoc.name}>
                              {assoc.name}
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ fontSize: "0.68rem", color: online ? "var(--color-success)" : "var(--text-muted)", fontWeight: 700 }}>
                                {online ? `🟢 ${uptime}` : "⚫ Off"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
