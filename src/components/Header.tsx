"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { user_role } from "@prisma/client";
import NotificationBell from "./NotificationBell";

interface HeaderProps {
  user: {
    email?: string | null;
    role: user_role;
  };
  onToggleSidebar: () => void;
}

export default function Header({ user, onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname === "/") return "Control Panel";
    if (pathname.startsWith("/accounts")) return "Accounts Database Shard";
    if (pathname.startsWith("/employees")) return "Asset Registry (Laptops/VPNs)";
    if (pathname.startsWith("/chat")) return "Direct Channels & Communications";
    if (pathname.startsWith("/settings")) return "Global Platform Rule Engine";
    if (pathname.startsWith("/audit-logs")) return "SOC2 System Audit Logs";
    return "StaffOps Console";
  };

  return (
    <header className="header-container" style={{ position: "relative" }}>
      {/* Sidebar Trigger for Mobile */}
      <button 
        onClick={onToggleSidebar} 
        className="header-btn" 
        style={{ marginRight: "1rem" }}
      >
        <Menu size={22} style={{ color: "var(--gold-primary)" }} />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <h1 className="text-gold-gradient" style={{
          fontSize: "1.15rem",
          fontWeight: 800,
          letterSpacing: "0.02em",
          textTransform: "uppercase"
        }}>
          {getPageTitle()}
        </h1>
      </div>

      <div className="header-actions">
        <NotificationBell />
      </div>
    </header>
  );
}
