"use client";

import React, { useState } from "react";
import { Search, Mail, Shield, User, CircleDot, Database } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

interface Account {
  id: string;
  serialCode: string;
  idName: string;
  adsPublished: number;
  status: string;
  createdAt: Date | string;
  platform: {
    id: string;
    name: string;
  };
  user_account_createdByIdTouser: {
    name: string | null;
    email: string;
    role: string;
    user?: {
      name: string | null;
    } | null;
  };
}

interface Platform {
  id: string;
  name: string;
}

interface MasterAccountsListProps {
  initialAccounts: Account[];
  platforms: Platform[];
  currentUserRole: string;
}

export default function MasterAccountsList({ initialAccounts, platforms, currentUserRole }: MasterAccountsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const filteredAccounts = initialAccounts.filter((acc) => {
    // Search filter
    const term = searchTerm.toLowerCase();
    const serialMatch = acc.serialCode.toLowerCase().includes(term);
    const idNameMatch = acc.idName.toLowerCase().includes(term);
    const addedByMatch = (acc.user_account_createdByIdTouser.name || "").toLowerCase().includes(term);
    const searchMatch = serialMatch || idNameMatch || addedByMatch;

    // Platform filter
    const platformMatch = selectedPlatform === "ALL" || acc.platform.id === selectedPlatform;

    // Status filter
    const statusMatch = selectedStatus === "ALL" || acc.status === selectedStatus;

    return searchMatch && platformMatch && statusMatch;
  });

  const getStatusBadge = (status: string) => {
    const cleanStatus = status.replace(/^IT_/, "").replace(/_/g, " ");
    const isPending = ["PENDING", "PENDING_TL", "PENDING TL"].includes(cleanStatus.toUpperCase());
    
    if (isPending) {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          fontSize: "0.72rem",
          fontWeight: 700,
          background: "rgba(245, 158, 11, 0.08)",
          color: "#D97706",
          padding: "0.2rem 0.6rem",
          borderRadius: "4px",
          border: "1px solid rgba(245, 158, 11, 0.2)"
        }}>
          {cleanStatus}
        </span>
      );
    }
    
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: "0.72rem",
        fontWeight: 700,
        background: "rgba(2, 80, 161, 0.05)",
        color: "#0250A1",
        padding: "0.2rem 0.6rem",
        borderRadius: "4px",
        border: "1px solid rgba(2, 80, 161, 0.15)"
      }}>
        {cleanStatus}
      </span>
    );
  };

  const formatDate = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month}, ${year}`;
  };

  const formatTime = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    const hrs = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    const secs = d.getSeconds().toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Merged Header & Filters card */}
      <div className="glass-panel" style={{
        padding: "1rem 1.5rem",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: "1.5rem",
        background: "#FFFFFF",
        border: "1px solid var(--border-dim)",
        position: "relative",
        zIndex: 40
      }}>
        {/* Left Filters Group */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "1rem", flex: 1, minWidth: "280px" }}>
          {/* Search */}
          <div style={{ flex: "1 1 250px", display: "flex", alignItems: "center", gap: "0.5rem", background: "#F9FAFB", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-dim)" }}>
            <Search size={16} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search serial, name, or creator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontSize: "0.82rem",
                background: "transparent",
                color: "var(--text-primary)"
              }}
            />
          </div>

          {/* Platform Dropdown */}
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="select-gold"
            style={{
              flex: "0 1 180px",
              height: "36px",
              background: "#FFFFFF",
              border: "1px solid var(--border-dim)",
              borderRadius: "6px",
              padding: "0 0.5rem",
              fontSize: "0.82rem",
              color: "var(--text-primary)",
              outline: "none",
              cursor: "pointer",
              position: "relative",
              zIndex: 40
            }}
          >
            <option value="ALL">All Platforms</option>
            {platforms.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="select-gold"
            style={{
              flex: "0 1 180px",
              height: "36px",
              background: "#FFFFFF",
              border: "1px solid var(--border-dim)",
              borderRadius: "6px",
              padding: "0 0.5rem",
              fontSize: "0.82rem",
              color: "var(--text-primary)",
              outline: "none",
              cursor: "pointer",
              position: "relative",
              zIndex: 40
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED_BY_TEAM_LEAD">Approved by TL</option>
            <option value="FORWARDED_TO_IT">Forwarded to IT</option>
            <option value="ACTIVE">Active</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Right Notification Group */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginLeft: "auto", position: "relative", zIndex: 50 }}>
          <NotificationBell />
        </div>
      </div>

      {/* Unified Accounts Sheet Table */}
      <div className="glass-panel" style={{ padding: "0", background: "#FFFFFF", overflowX: "auto", border: "1px solid var(--border-dim)" }}>
        {filteredAccounts.length === 0 ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            No accounts found matching the current search filters.
          </div>
        ) : (
          <table className="compact-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
            <thead>
              <tr style={{ background: "#0250A1" }}>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)" }}>ADDED BY</th>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)" }}>TEAM LEAD</th>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)" }}>PLATFORM</th>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)" }}>ID SERIAL</th>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)" }}>ID NAME</th>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)" }}>ADS PUB.</th>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)" }}>TIME OF ENTRY</th>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((acc) => {
                const creatorName = acc.user_account_createdByIdTouser.name || acc.user_account_createdByIdTouser.email;
                const managerName = acc.user_account_createdByIdTouser.role === "TEAM_LEAD" 
                  ? "Self" 
                  : (acc.user_account_createdByIdTouser.user?.name || "-");

                return (
                  <tr key={acc.id} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    <td style={{ padding: "0.5rem 0.6rem", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>{creatorName}</td>
                    <td style={{ padding: "0.5rem 0.6rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>{managerName}</td>
                    <td style={{ padding: "0.5rem 0.6rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>{acc.platform.name}</td>
                    <td style={{ padding: "0.5rem 0.6rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>{acc.serialCode}</td>
                    <td style={{ padding: "0.5rem 0.6rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>{acc.idName}</td>
                    <td style={{ padding: "0.5rem 0.6rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>{acc.adsPublished.toString().padStart(2, "0")}</td>
                    <td style={{ padding: "0.5rem 0.6rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.05rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-primary)" }}>{formatDate(acc.createdAt)}</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{formatTime(acc.createdAt)}</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem" }}>{getStatusBadge(acc.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
