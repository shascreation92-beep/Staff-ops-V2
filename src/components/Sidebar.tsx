"use client";

import React, { useState, useEffect, useTransition } from "react";
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
  Megaphone,
  Wallet
} from "lucide-react";
import { signOut } from "next-auth/react";
import { user_role } from "@prisma/client";
import { updateUserPasswordAction } from "@/app/actions/users";
import { getPendingTLRequestsCountAction } from "@/app/actions/accounts";
import { useITConfig } from "./ITConfigProvider";

const DatabaseCubeIcon = ({ className, size = 20 }: { className?: string; size?: number }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Connected Cube Lines */}
    <line x1="12" y1="3" x2="5" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="3" x2="19" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="3" x2="12" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

    <line x1="5" y1="7" x2="5" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="5" y1="7" x2="9" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

    <line x1="19" y1="7" x2="19" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="19" y1="7" x2="15" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

    <line x1="12" y1="21" x2="5" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="21" x2="19" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="21" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

    <line x1="5" y1="17" x2="9" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="19" y1="17" x2="15" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

    {/* Database Cylinder Stack in Center (with white fill to mask behind lines) */}
    <path
      d="M 9 10 L 9 14 A 3 1.2 0 0 0 15 14 L 15 10 A 3 1.2 0 0 0 9 10 Z"
      fill="white"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <ellipse cx="12" cy="10" rx="3" ry="1.2" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <path d="M 9 12 A 3 1.2 0 0 0 15 12" fill="none" stroke="currentColor" strokeWidth="1.5" />

    {/* Six Outer Nodes (Circles) */}
    <circle cx="12" cy="3" r="1.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="5" cy="7" r="1.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="19" cy="7" r="1.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="5" cy="17" r="1.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="19" cy="17" r="1.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="21" r="1.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

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

  // IT Configurations state
  const [showITConfigOverlay, setShowITConfigOverlay] = useState(false);
  const { verificationCost, updateVerificationCost } = useITConfig();
  const [tempCost, setTempCost] = useState(verificationCost.toString());

  useEffect(() => {
    setTempCost(verificationCost.toString());
  }, [verificationCost]);

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
      id: "master-accounts-pool",
      label: "Master Accounts Pool",
      path: "/master-accounts-pool",
      icon: DatabaseCubeIcon,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]
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
      id: "it-management", 
      label: "IT Management", 
      path: "/it-management", 
      icon: Shield,
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
      id: "personal-notes", 
      label: "My Personal Notes", 
      path: "/personal-notes", 
      icon: FileText,
      roles: ["TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"] 
    },
    { 
      id: "announcements", 
      label: "Announcements", 
      path: "/announcements", 
      icon: Megaphone,
      roles: ["COMPANY_OWNER", "IT_DEPARTMENT"] 
    },
    {
      id: "it-config",
      label: "IT Configurations",
      path: "#it-config",
      icon: Wallet,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]
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
          
          if (item.id === "it-config") {
            return (
              <button
                key={item.id}
                onClick={() => {
                  setIsOpen(false);
                  setShowITConfigOverlay(true);
                }}
                className="sidebar-item"
                style={{
                  background: "none",
                  border: "none",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  color: "var(--text-secondary)",
                  borderRadius: "8px",
                  fontSize: "0.88rem",
                  fontWeight: 500,
                  gap: "0.75rem"
                }}
              >
                <Icon className="sidebar-icon" size={20} />
                <span>{item.label}</span>
              </button>
            );
          }

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
      {/* IT Configurations Sliding Panel Overlay */}
      {showITConfigOverlay && (
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
          justifyContent: "flex-end",
          animation: "fade-in 0.25s ease"
        }}
        onClick={() => setShowITConfigOverlay(false)}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes slide-in-right {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          ` }} />
          <div className="glass-panel" 
            style={{
              width: "360px",
              height: "100%",
              padding: "2rem",
              background: "#FFFFFF",
              borderLeft: "1px solid var(--border-dim)",
              boxShadow: "var(--shadow-premium)",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              animation: "slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>
                IT Configurations
              </h2>
              <button 
                onClick={() => setShowITConfigOverlay(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.4", margin: 0 }}>
              Adjust operational cost configurations for unverified account verification tracking.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase" }}>
                Verification Cost per Account (PKR)
              </label>
              <input
                type="number"
                min="0"
                value={tempCost}
                onChange={(e) => setTempCost(e.target.value)}
                placeholder="300"
                className="input-gold"
                style={{
                  fontSize: "0.85rem",
                  padding: "0.6rem 0.85rem"
                }}
              />
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                This multiplier determines the estimated cost display on the overall dashboard.
              </span>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "auto" }}>
              <button
                type="button"
                onClick={() => setShowITConfigOverlay(false)}
                className="btn-glass"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-gold"
                style={{ flex: 1 }}
                onClick={async () => {
                  const val = parseFloat(tempCost);
                  if (isNaN(val) || val < 0) {
                    alert("Please enter a valid verification cost.");
                    return;
                  }
                  const success = await updateVerificationCost(val);
                  if (success) {
                    setShowITConfigOverlay(false);
                    // Force reload to refresh server component page states immediately
                    window.location.reload();
                  } else {
                    alert("Failed to update IT configurations.");
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
