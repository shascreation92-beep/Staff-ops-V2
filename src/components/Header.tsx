"use client";

import React from "react";
import { usePathname } from "next/navigation";
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
    if (pathname === "/") return "Dashboard";
    if (pathname.startsWith("/accounts")) return "User Data";
    if (pathname.startsWith("/associates-requests")) return "Associates Requests";
    if (pathname.startsWith("/employees")) return "Asset Registry (Laptops/VPNs)";
    if (pathname.startsWith("/my-team")) return "My Team";
    if (pathname.startsWith("/team-live-roster")) return "Team Live Roster";
    if (pathname.startsWith("/pending")) return "Pending Onboarding";
    if (pathname.startsWith("/settings")) return "Global Platform Rule Engine";
    if (pathname.startsWith("/team-leads")) return "Team Leads";
    if (pathname.startsWith("/audit-logs")) return "SOC2 System Audit Logs";
    return "StaffOps Console";
  };

  return (
    <header className="header-container" style={{ position: "relative" }}>
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
