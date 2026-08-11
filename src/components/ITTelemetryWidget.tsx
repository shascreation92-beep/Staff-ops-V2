"use client";

import React from "react";
import { 
  Laptop, 
  Wifi, 
  ShieldCheck, 
  Users, 
  Activity, 
  Cpu, 
  Key, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

export interface TelemetryData {
  totalEmployeesCount: number;
  onlineCount: number;
  offlineCount: number;
  brandCounts: { HP: number; Dell: number; ThinkPad: number; Other: number };
  osCounts: { Windows_11: number; Windows_10: number; Other: number };
  vpnCounts: {
    Surfshark: number;
    ExpressVPN: number;
    NordVPN: number;
    ProtonVPN: number;
    PureVPN: number;
    HideMe: number;
    Unassigned: number;
  };
  hasLaptopPasswordCount: number;
  hasVpnCredentialsCount: number;
}

interface ITTelemetryWidgetProps {
  data: TelemetryData;
}

export default function ITTelemetryWidget({ data }: ITTelemetryWidgetProps) {
  const {
    totalEmployeesCount,
    onlineCount,
    offlineCount,
    brandCounts,
    osCounts,
    vpnCounts,
    hasLaptopPasswordCount,
    hasVpnCredentialsCount,
  } = data;

  const onlinePercent = totalEmployeesCount > 0 ? Math.round((onlineCount / totalEmployeesCount) * 100) : 0;
  const passPercent = totalEmployeesCount > 0 ? Math.round((hasLaptopPasswordCount / totalEmployeesCount) * 100) : 0;
  const vpnPercent = totalEmployeesCount > 0 ? Math.round((hasVpnCredentialsCount / totalEmployeesCount) * 100) : 0;

  // Calculate top VPN provider
  const vpnEntries = Object.entries(vpnCounts).filter(([k]) => k !== "Unassigned");
  const topVpn = vpnEntries.sort((a, b) => b[1] - a[1])[0] || ["None", 0];

  return (
    <div
      className="glass-panel"
      style={{
        padding: "1.75rem",
        marginBottom: "2.25rem",
        background: "rgba(20, 18, 38, 0.75)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.09)",
        borderRadius: "14px",
        boxShadow: "var(--shadow-premium)",
        position: "relative"
      }}
    >
      {/* Header Section */}
      <div
        style={{
          borderLeft: "4px solid #0077B6",
          paddingLeft: "0.75rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid var(--border-dim)",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Activity size={18} style={{ color: "#0077B6" }} />
            <h2
              style={{
                fontSize: "0.95rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                margin: 0
              }}
            >
              OPERATIONS & IT TELEMETRY SHARD
            </h2>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Real-time associate connectivity, hardware specs distribution, and VPN deployment health
          </span>
        </div>

        {/* Live System Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: "20px",
            padding: "0.3rem 0.8rem",
            fontSize: "0.75rem",
            color: "#10B981",
            fontWeight: 700
          }}
        >
          <span
            className="pulse-dot"
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#10B981",
              display: "inline-block"
            }}
          />
          <span>Telemetry Active ({onlinePercent}% Online)</span>
        </div>
      </div>

      {/* Grid Layout: 3 Columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem"
        }}
      >
        {/* Column 1: Live Associate Activity Ratio */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Associate Presence
            </span>
            <Users size={16} style={{ color: "var(--gold-primary)" }} />
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
              {onlineCount}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
              / {totalEmployeesCount} Active Associates
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div style={{ width: "100%", height: "8px", background: "rgba(255, 255, 255, 0.06)", borderRadius: "4px", overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${onlinePercent}%`, background: "#10B981", height: "100%", transition: "width 0.4s ease" }} />
              <div style={{ width: `${100 - onlinePercent}%`, background: "#9CA3AF", height: "100%", opacity: 0.3 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
              <span style={{ color: "#10B981" }}>🟢 {onlineCount} Online Now</span>
              <span>⚫ {offlineCount} Offline</span>
            </div>
          </div>
        </div>

        {/* Column 2: Hardware Brands & Windows OS Distribution */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              OS & Hardware Share
            </span>
            <Cpu size={16} style={{ color: "var(--gold-primary)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {/* Windows 11 vs 10 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Windows 11</span>
                <span style={{ color: "var(--text-muted)" }}>{osCounts.Windows_11} Units</span>
              </div>
              <div style={{ width: "100%", height: "5px", background: "rgba(255, 255, 255, 0.06)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${totalEmployeesCount > 0 ? (osCounts.Windows_11 / totalEmployeesCount) * 100 : 0}%`, background: "#38BDF8", height: "100%" }} />
              </div>
            </div>

            {/* Windows 10 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Windows 10</span>
                <span style={{ color: "var(--text-muted)" }}>{osCounts.Windows_10} Units</span>
              </div>
              <div style={{ width: "100%", height: "5px", background: "rgba(255, 255, 255, 0.06)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${totalEmployeesCount > 0 ? (osCounts.Windows_10 / totalEmployeesCount) * 100 : 0}%`, background: "#0284C7", height: "100%" }} />
              </div>
            </div>

            {/* Hardware Brands Breakdown */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem" }}>
              <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.4rem", background: "rgba(56, 189, 248, 0.15)", color: "#38BDF8", borderRadius: "4px", fontWeight: 700, border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                HP: {brandCounts.HP}
              </span>
              <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.4rem", background: "rgba(2, 132, 199, 0.15)", color: "#38BDF8", borderRadius: "4px", fontWeight: 700, border: "1px solid rgba(2, 132, 199, 0.3)" }}>
                Dell: {brandCounts.Dell}
              </span>
              <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.4rem", background: "rgba(245, 158, 11, 0.15)", color: "#F59E0B", borderRadius: "4px", fontWeight: 700, border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                ThinkPad: {brandCounts.ThinkPad}
              </span>
            </div>
          </div>
        </div>

        {/* Column 3: VPN Networks & Credential Compliance */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              VPN & Security Seal
            </span>
            <ShieldCheck size={16} style={{ color: "var(--gold-primary)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Wifi size={13} style={{ color: "#0077B6" }} />
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Top VPN Network:</span>
              </div>
              <span style={{ fontWeight: 800, color: "#0077B6" }}>{topVpn[0]} ({topVpn[1]})</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Key size={13} style={{ color: "var(--gold-primary)" }} />
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Laptop Credentialing:</span>
              </div>
              <span style={{ fontWeight: 800, color: passPercent >= 80 ? "#10B981" : "#F59E0B" }}>
                {hasLaptopPasswordCount}/{totalEmployeesCount} ({passPercent}%)
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <CheckCircle2 size={13} style={{ color: vpnPercent >= 80 ? "#10B981" : "#EF4444" }} />
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>VPN Provisioning:</span>
              </div>
              <span style={{ fontWeight: 800, color: vpnPercent >= 80 ? "#10B981" : "#EF4444" }}>
                {hasVpnCredentialsCount}/{totalEmployeesCount} ({vpnPercent}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
