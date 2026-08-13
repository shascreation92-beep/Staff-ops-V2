"use client";

import React, { useState, useEffect } from "react";
import { 
  Monitor, 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  ShieldCheck, 
  ShieldAlert, 
  Wifi, 
  Download, 
  Upload, 
  Search, 
  RefreshCw, 
  Play, 
  Pause, 
  Square, 
  UserCheck, 
  AlertTriangle, 
  Globe, 
  Zap, 
  CheckCircle,
  XCircle,
  Info
} from "lucide-react";
import { toast } from "react-hot-toast";
import { toggleUserTelemetryPauseAction } from "@/app/actions/telemetry";

interface Workstation {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
  companyName: string;
  employeeId: string;
  designation: string;
  isPaused: boolean;
  hardware: {
    ramUsedGb: number;
    ramTotalGb: number;
    ramPercent: number;
    diskUsedGb: number;
    diskTotalGb: number;
    diskPercent: number;
    cpuPercent: number;
    cpuCores: number;
    downloadMbps: number;
    uploadMbps: number;
  };
  network: {
    isVpnActive: boolean;
    ipAddress: string;
    country: string;
    city: string;
    countryCode: string;
  };
  status: string;
  lastSeenAgo: string;
}

interface TelemetryPayload {
  timestamp: string;
  totalConnected: number;
  vpnConnectedCount: number;
  highLoadCount: number;
  avgRamPercent: number;
  workstations: Workstation[];
}

export default function WorkstationTelemetryDashboard() {
  const [data, setData] = useState<TelemetryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(3000);
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [vpnFilter, setVpnFilter] = useState("ALL");
  const [alertFilter, setAlertFilter] = useState("ALL");
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const fetchTelemetry = async (showToast = false) => {
    try {
      const res = await fetch("/api/workstation-telemetry");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (showToast) toast.success("Workstation hardware telemetry refreshed");
      } else {
        if (showToast) toast.error("Failed to fetch workstation telemetry");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    if (isPaused) return;

    const timer = setInterval(() => {
      if (!document.hidden) {
        fetchTelemetry();
      }
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [refreshInterval, isPaused]);

  const handleTogglePause = async (userId: string, currentIsPaused: boolean) => {
    setTogglingUserId(userId);
    try {
      const newPausedState = !currentIsPaused;
      const res = await toggleUserTelemetryPauseAction(userId, newPausedState);
      if (res.success) {
        toast.success(newPausedState ? "Screen & telemetry paused for staff" : "Screen & telemetry resumed for staff");
        fetchTelemetry();
      } else {
        toast.error("Failed to update staff telemetry status");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to toggle telemetry");
    } finally {
      setTogglingUserId(null);
    }
  };

  const getCountryFlag = (code: string) => {
    if (code === "GB") return "🇬🇧";
    if (code === "DE") return "🇩🇪";
    if (code === "US") return "🇺🇸";
    if (code === "NL") return "🇳🇱";
    if (code === "PK") return "🇵🇰";
    return "🌐";
  };

  const getStatusColor = (percent: number) => {
    if (percent >= 85) return "#EF4444"; // Red alert
    if (percent >= 75) return "#F59E0B"; // Amber warning
    return "#10B981"; // Green healthy
  };

  const filteredWorkstations = (data?.workstations || []).filter(w => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = w.name.toLowerCase().includes(q);
      const matchEmail = w.email.toLowerCase().includes(q);
      const matchId = w.employeeId.toLowerCase().includes(q);
      const matchIp = w.network.ipAddress.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchId && !matchIp) return false;
    }

    if (roleFilter !== "ALL" && w.role !== roleFilter) return false;
    if (vpnFilter === "VPN_ONLY" && !w.network.isVpnActive) return false;
    if (vpnFilter === "DIRECT_ONLY" && w.network.isVpnActive) return false;
    if (alertFilter === "HIGH_LOAD_ONLY" && w.hardware.ramPercent <= 80 && w.hardware.cpuPercent <= 80) return false;

    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* 1. Header Title & Actions */}
      <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", position: "relative", zIndex: 50 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(59, 130, 246, 0.12)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#3B82F6"
            }}>
              <Monitor size={24} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }} className="text-gold-gradient">
                  EMPLOYEE WORKSTATION HARDWARE & NETWORK TELEMETRY
                </h2>
                <span className="badge" style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#10B981",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}>
                  <span className="pulse-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }}></span>
                  {data?.totalConnected ?? 0} ACTIVE WORKSTATIONS
                </span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                Real-time monitoring of employee computer RAM, SSD storage, CPU temperature, internet speeds & VPN IP location.
              </p>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", background: "#F1F5F9", border: "1px solid var(--border-dim)", borderRadius: "8px", padding: "0.2rem" }}>
              <button
                onClick={() => { setRefreshInterval(3000); setIsPaused(false); }}
                style={{
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: "none",
                  background: refreshInterval === 3000 && !isPaused ? "#FFFFFF" : "transparent",
                  color: refreshInterval === 3000 && !isPaused ? "var(--gold-primary)" : "var(--text-muted)",
                  boxShadow: refreshInterval === 3000 && !isPaused ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  cursor: "pointer"
                }}
              >
                3s
              </button>
              <button
                onClick={() => { setRefreshInterval(5000); setIsPaused(false); }}
                style={{
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: "none",
                  background: refreshInterval === 5000 && !isPaused ? "#FFFFFF" : "transparent",
                  color: refreshInterval === 5000 && !isPaused ? "var(--gold-primary)" : "var(--text-muted)",
                  boxShadow: refreshInterval === 5000 && !isPaused ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  cursor: "pointer"
                }}
              >
                5s
              </button>
              <button
                onClick={() => setIsPaused(!isPaused)}
                title={isPaused ? "Resume telemetry polling" : "Pause telemetry polling"}
                style={{
                  padding: "0.3rem 0.5rem",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: "none",
                  background: isPaused ? "rgba(239, 68, 68, 0.1)" : "transparent",
                  color: isPaused ? "#EF4444" : "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {isPaused ? <Play size={13} /> : <Pause size={13} />}
              </button>
            </div>

            <button
              onClick={() => fetchTelemetry(true)}
              disabled={loading}
              className="btn-glass"
              style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>

        </div>
      </div>

      {/* 2. Top Summary KPI Cards (4 Metric Cards) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
        
        {/* Total Connected Workstations */}
        <div className="glass-panel" style={{ padding: "1.25rem", background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)", backdropFilter: "blur(16px)", border: "1px solid rgba(255, 255, 255, 0.08)", borderLeft: "4px solid #3B82F6", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>Connected PCs</span>
            <Monitor size={18} style={{ color: "#3B82F6" }} />
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#FFFFFF", marginTop: "0.3rem", fontFamily: "var(--font-mono)" }}>
            {data?.totalConnected ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "0.2rem" }}>
            Active company workstation telemetry agents
          </div>
        </div>

        {/* Avg Company RAM Usage */}
        <div className="glass-panel" style={{ padding: "1.25rem", background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)", backdropFilter: "blur(16px)", border: "1px solid rgba(255, 255, 255, 0.08)", borderLeft: "4px solid #10B981", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>Avg RAM Usage</span>
            <MemoryStick size={18} style={{ color: "#10B981" }} />
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: getStatusColor(data?.avgRamPercent || 0), marginTop: "0.3rem", fontFamily: "var(--font-mono)" }}>
            {data?.avgRamPercent ?? 0}%
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "0.2rem" }}>
            Company-wide average memory utilization
          </div>
        </div>

        {/* VPN Security Active */}
        <div className="glass-panel" style={{ padding: "1.25rem", background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)", backdropFilter: "blur(16px)", border: "1px solid rgba(255, 255, 255, 0.08)", borderLeft: "4px solid #8B5CF6", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>VPN Security</span>
            <ShieldCheck size={18} style={{ color: "#8B5CF6" }} />
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#A855F7", marginTop: "0.3rem", fontFamily: "var(--font-mono)" }}>
            {data?.vpnConnectedCount ?? 0} / {data?.totalConnected ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "0.2rem" }}>
            Workstations connected via encrypted VPN
          </div>
        </div>

        {/* High Resource Load Warnings */}
        <div className="glass-panel" style={{ padding: "1.25rem", background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)", backdropFilter: "blur(16px)", border: "1px solid rgba(255, 255, 255, 0.08)", borderLeft: "4px solid #F59E0B", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>High Load Alerts</span>
            <AlertTriangle size={18} style={{ color: "#F59E0B" }} />
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: (data?.highLoadCount || 0) > 0 ? "#EF4444" : "#10B981", marginTop: "0.3rem", fontFamily: "var(--font-mono)" }}>
            {data?.highLoadCount ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "0.2rem" }}>
            PCs with RAM or CPU utilization exceeding 80%
          </div>
        </div>

      </div>

      {/* 3. Search & Filter Bar */}
      <div className="glass-panel" style={{ padding: "0.85rem 1.25rem", background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)", backdropFilter: "blur(16px)", position: "relative", zIndex: 40, border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "14px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          
          <div className="table-search-wrapper" style={{ width: "240px" }}>
            <Search className="header-search-icon" />
            <input
              type="text"
              placeholder="Search staff, email or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="header-search-input"
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="table-select-filter"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="COMPANY_OWNER">Company Owner</option>
              <option value="IT_DEPARTMENT">IT Department</option>
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employee</option>
            </select>

            <select
              value={vpnFilter}
              onChange={(e) => setVpnFilter(e.target.value)}
              className="table-select-filter"
            >
              <option value="ALL">ALL CONNECTIONS</option>
              <option value="VPN_ONLY">🔒 VPN CONNECTED ONLY</option>
              <option value="DIRECT_ONLY">🌐 DIRECT IP ONLY</option>
            </select>

            <select
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value)}
              className="table-select-filter"
            >
              <option value="ALL">ALL WORKSTATIONS</option>
              <option value="HIGH_LOAD_ONLY">⚠️ HIGH RAM/CPU ONLY</option>
            </select>
          </div>

        </div>
      </div>

      {/* 4. Employee Workstation Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
        {filteredWorkstations.length === 0 ? (
          <div className="glass-panel" style={{ gridColumn: "1 / -1", padding: "4rem 2rem", textAlign: "center", background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)", borderRadius: "16px" }}>
            <Monitor size={48} style={{ color: "var(--text-muted)", margin: "0 auto 1rem auto", opacity: 0.5 }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>No Workstations Found</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              No active workstation telemetry reporting matching your filters.
            </p>
          </div>
        ) : (
          filteredWorkstations.map((w) => (
            <div 
              key={w.id} 
              className="glass-panel" 
              style={{
                padding: "1.25rem",
                background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)", backdropFilter: "blur(16px)",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                borderRadius: "16px",
                border: w.hardware.ramPercent > 85 ? "2px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: w.hardware.ramPercent > 85 ? "0 0 15px rgba(239, 68, 68, 0.15)" : "0 10px 30px rgba(0, 0, 0, 0.5)"
              }}
            >
              {/* Employee Top Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <div style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: "var(--gold-gradient)",
                    color: "var(--bg-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "1rem"
                  }}>
                    {w.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFFFFF" }}>{w.name}</h4>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.1rem" }}>
                      <span className="badge" style={{ fontSize: "0.65rem", padding: "0.05rem 0.4rem", background: "rgba(56, 189, 248, 0.12)", color: "#38BDF8", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                        {w.designation}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>
                        {w.employeeId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remote Telemetry Pause/Resume Button */}
                <button
                  onClick={() => handleTogglePause(w.id, w.isPaused)}
                  disabled={togglingUserId === w.id}
                  title={w.isPaused ? "Resume telemetry collection" : "Pause telemetry collection for staff"}
                  style={{
                    padding: "0.3rem 0.6rem",
                    borderRadius: "6px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    background: w.isPaused ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    border: w.isPaused ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                    color: w.isPaused ? "#10B981" : "#EF4444"
                  }}
                >
                  {w.isPaused ? <Play size={12} /> : <Square size={11} />}
                  <span>{w.isPaused ? "Start" : "Stop"}</span>
                </button>
              </div>

              {/* Hardware Telemetry Progress Bars */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                
                {/* RAM Progress */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 600, color: "#94A3B8", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <MemoryStick size={13} style={{ color: "#10B981" }} /> RAM Memory
                    </span>
                    <span style={{ fontWeight: 700, color: getStatusColor(w.hardware.ramPercent), fontFamily: "var(--font-mono)" }}>
                      {w.hardware.ramUsedGb} / {w.hardware.ramTotalGb} GB ({w.hardware.ramPercent}%)
                    </span>
                  </div>
                  <div style={{ height: "6px", width: "100%", background: "rgba(255, 255, 255, 0.08)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${w.hardware.ramPercent}%`,
                      background: getStatusColor(w.hardware.ramPercent),
                      borderRadius: "3px"
                    }}></div>
                  </div>
                </div>

                {/* Disk Progress */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 600, color: "#94A3B8", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <HardDrive size={13} style={{ color: "#A855F7" }} /> SSD Storage
                    </span>
                    <span style={{ fontWeight: 700, color: "#FFFFFF", fontFamily: "var(--font-mono)" }}>
                      {w.hardware.diskUsedGb} / {w.hardware.diskTotalGb} GB ({w.hardware.diskPercent}%)
                    </span>
                  </div>
                  <div style={{ height: "6px", width: "100%", background: "rgba(255, 255, 255, 0.08)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${w.hardware.diskPercent}%`,
                      background: "#A855F7",
                      borderRadius: "3px"
                    }}></div>
                  </div>
                </div>

                {/* CPU Load Progress */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 600, color: "#94A3B8", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Cpu size={13} style={{ color: "#3B82F6" }} /> CPU Processing Load
                    </span>
                    <span style={{ fontWeight: 700, color: getStatusColor(w.hardware.cpuPercent), fontFamily: "var(--font-mono)" }}>
                      {w.hardware.cpuPercent}% ({w.hardware.cpuCores} Cores)
                    </span>
                  </div>
                  <div style={{ height: "6px", width: "100%", background: "rgba(255, 255, 255, 0.08)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${w.hardware.cpuPercent}%`,
                      background: getStatusColor(w.hardware.cpuPercent),
                      borderRadius: "3px"
                    }}></div>
                  </div>
                </div>

              </div>

              {/* Bandwidth & Network Speeds */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255, 255, 255, 0.03)", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", color: "#10B981", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                  <Download size={13} />
                  <span>⬇ {w.hardware.downloadMbps} MB/s</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", color: "#3B82F6", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                  <Upload size={13} />
                  <span>⬆ {w.hardware.uploadMbps} MB/s</span>
                </div>
              </div>

              {/* VPN & Geolocation Badge */}
              <div style={{
                padding: "0.55rem 0.75rem",
                borderRadius: "8px",
                background: w.network.isVpnActive ? "rgba(139, 92, 246, 0.12)" : "rgba(255, 255, 255, 0.03)",
                border: w.network.isVpnActive ? "1px solid rgba(139, 92, 246, 0.3)" : "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", overflow: "hidden" }}>
                  <span style={{ fontSize: "1rem" }}>{getCountryFlag(w.network.countryCode)}</span>
                  <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: w.network.isVpnActive ? "#A855F7" : "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {w.network.isVpnActive ? "🔒 VPN CONNECTED" : "🌐 DIRECT CONNECTION"} ({w.network.city})
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>
                      IP: {w.network.ipAddress} ({w.network.country})
                    </span>
                  </div>
                </div>

                <span style={{ fontSize: "0.68rem", color: w.isPaused ? "#EF4444" : "#10B981", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                  {w.isPaused ? "PAUSED" : "ONLINE"}
                </span>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}
