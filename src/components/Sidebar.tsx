"use client";

import React from "react";
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
  LogOut
} from "lucide-react";
import { signOut } from "next-auth/react";
import { user_role } from "@prisma/client";

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
    </aside>
  );
}
