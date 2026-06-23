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
  Key
} from "lucide-react";
import { signOut } from "next-auth/react";
import { user_role } from "@prisma/client";
import { updateUserPasswordAction } from "@/app/actions/users";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: user_role;
    companyName?: string | null;
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

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);
    setChangePassSuccess(false);

    if (!newPassword.trim()) {
      setChangePassError("Password cannot be empty.");
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
      label: "User Data", 
      path: "/accounts", 
      icon: Database,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"] 
    },
    { 
      id: "employees", 
      label: "Employees DB", 
      path: "/employees", 
      icon: Laptop,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "IT_DEPARTMENT"] 
    },
    { 
      id: "chat", 
      label: "Chat Box", 
      path: "/chat", 
      icon: MessageSquare,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"] 
    },
    { 
      id: "settings", 
      label: user.role === "SUPER_ADMIN" ? "Platform Shard" : "Rule Engine", 
      path: "/settings", 
      icon: Sliders,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER"] 
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

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo">
        <Shield className="sidebar-logo-icon" size={24} />
        <span className="sidebar-logo-text">STAFFOPS</span>
      </div>

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
              {isActive && (
                <div 
                  style={{
                    position: "absolute",
                    left: 0,
                    width: "3px",
                    height: "60%",
                    background: "var(--gold-gradient)",
                    borderRadius: "0 4px 4px 0",
                    boxShadow: "0 0 10px var(--gold-glow)"
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, flex: 1 }}>
          <div className="user-avatar-gold" style={{ flexShrink: 0 }}>{userInitials}</div>
          <div className="sidebar-user-info" style={{ minWidth: 0, flex: 1 }}>
            <span className="sidebar-user-name" title={user.name || "User"}>
              {user.name || "Operator"}
            </span>
            <span className="sidebar-user-role" style={{ fontSize: "0.7rem", color: "var(--gold-primary)" }}>
              {user.role.replace("_", " ")}
            </span>
            {user.companyName && (
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.companyName}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
          {["SUPER_ADMIN", "COMPANY_OWNER"].includes(user.role) && (
            <button
              onClick={() => {
                setNewPassword("");
                setChangePassError(null);
                setChangePassSuccess(false);
                setShowChangePassModal(true);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
                transition: "all 0.2s ease"
              }}
              className="change-pass-btn"
              title="Change Password"
            >
              <Key size={16} />
            </button>
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              transition: "all 0.2s ease"
            }}
            className="signout-btn"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.85)",
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
            background: "rgba(10,10,10,0.98)",
            border: "1px solid var(--border-gold)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem"
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
