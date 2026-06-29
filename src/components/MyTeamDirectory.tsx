"use client";

import React from "react";
import { Users, Mail, Clock, ShieldCheck, ShieldAlert, AlertCircle } from "lucide-react";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  status: string;
  lastActiveAt: Date | null;
}

interface MyTeamDirectoryProps {
  members: TeamMember[];
}

export default function MyTeamDirectory({ members }: MyTeamDirectoryProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }} className="text-gold-gradient">
          MY TEAM DIRECTORY
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
          Read-only directory of Sales Associates currently mapped to your node operations.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
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
          members.map((member) => {
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

            let statusBadgeClass = "pending";
            if (member.status === "APPROVED") statusBadgeClass = "verified";
            else if (member.status === "BLOCKED" || member.status === "REJECTED") statusBadgeClass = "danger";

            return (
              <div
                key={member.id}
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
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div className="user-avatar-gold" style={{ width: "48px", height: "48px", fontSize: "1.1rem" }}>
                    {initials}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "1.05rem",
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {member.name || "Unnamed Associate"}
                    </span>
                    <span
                      className={`badge ${statusBadgeClass}`}
                      style={{
                        fontSize: "0.65rem",
                        alignSelf: "flex-start",
                        marginTop: "0.25rem",
                        textTransform: "uppercase",
                      }}
                    >
                      {member.status}
                    </span>
                  </div>
                </div>

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
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                    <Mail size={14} style={{ color: "var(--gold-primary)", flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {member.email}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Clock size={14} style={{ color: "var(--gold-primary)", flexShrink: 0 }} />
                    <span>Last Active: {lastActive}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
