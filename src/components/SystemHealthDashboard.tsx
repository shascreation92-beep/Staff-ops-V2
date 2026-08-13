"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Activity, 
  RefreshCw, 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  Terminal, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Zap, 
  Copy,
  Layers,
  MemoryStick
} from "lucide-react";
import { toast } from "react-hot-toast";

interface SystemData {
  timestamp: string;
  system: {
    hostname: string;
    platform: string;
    arch: string;
    uptimeSeconds: number;
    loadAvg: number[];
  };
  cpu: {
    model: string;
    cores: number;
    usagePercent: number;
  };
  memory: {
    totalMb: number;
    usedMb: number;
    freeMb: number;
    totalGb: number;
    usedGb: number;
    freeGb: number;
    usagePercent: number;
  };
  nodeProcess: {
    pid: number;
    nodeVersion: string;
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    uptimeSeconds: number;
  };
  disk: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
    usedPercent: number;
    mount: string;
  };
  pm2: {
    name: string;
    pm_id: number;
    status: string;
    restarts: number;
    uptimeSeconds: number;
    memoryMb: number;
    cpuPercent: number;
    pid: number;
  };
  logs: Array<{ type: "out" | "error"; text: string }>;
}

export default function SystemHealthDashboard() {
  const [data, setData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(3000); // 3s default
  const [isPaused, setIsPaused] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [logFilter, setLogFilter] = useState<"ALL" | "OUT" | "ERR">("ALL");
  const [logSearch, setLogSearch] = useState("");
  const logTerminalRef = useRef<HTMLDivElement>(null);

  const fetchHealth = async (showToast = false) => {
    try {
      const res = await fetch("/api/system-health");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (showToast) toast.success("Telemetry updated");
      } else {
        if (showToast) toast.error("Failed to fetch system telemetry");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    if (isPaused) return;

    const timer = setInterval(() => {
      if (!document.hidden) {
        fetchHealth();
      }
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [refreshInterval, isPaused]);

  const handlePm2Restart = async () => {
    if (!confirm("Are you sure you want to trigger a PM2 soft restart for staffops?")) return;
    setActionPending(true);
    try {
      const res = await fetch("/api/system-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart_pm2" })
      });
      if (res.ok) {
        toast.success("PM2 restart signal sent successfully!");
        setTimeout(() => fetchHealth(true), 3000);
      } else {
        toast.error("Failed to restart PM2 process");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to trigger restart");
    } finally {
      setActionPending(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to clear server log history?")) return;
    setActionPending(true);
    try {
      const res = await fetch("/api/system-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_logs" })
      });
      if (res.ok) {
        toast.success("Server log files cleared!");
        fetchHealth();
      } else {
        toast.error("Failed to clear logs");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to clear logs");
    } finally {
      setActionPending(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
  };

  const filteredLogs = (data?.logs || []).filter(l => {
    if (logFilter === "OUT" && l.type !== "out") return false;
    if (logFilter === "ERR" && l.type !== "error") return false;
    if (logSearch && !l.text.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (percent: number) => {
    if (percent >= 85) return "#EF4444"; // Red alert
    if (percent >= 70) return "#F59E0B"; // Amber warning
    return "#10B981"; // Green healthy
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* 1. Header Toolbar */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: "1.25rem 1.5rem", 
          position: "relative", 
          zIndex: 50,
          background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          borderRadius: "16px"
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(56, 189, 248, 0.12)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#38BDF8",
              boxShadow: "0 0 15px rgba(56, 189, 248, 0.2)"
            }}>
              <Server size={24} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }} className="text-gold-gradient">
                  HOSTING & SERVER TELEMETRY
                </h2>
                <span className="badge" style={{
                  background: data?.memory.usagePercent && data.memory.usagePercent > 85 ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                  border: data?.memory.usagePercent && data.memory.usagePercent > 85 ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(16, 185, 129, 0.4)",
                  color: data?.memory.usagePercent && data.memory.usagePercent > 85 ? "#EF4444" : "#10B981",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  boxShadow: data?.memory.usagePercent && data.memory.usagePercent > 85 ? "0 0 10px rgba(239, 68, 68, 0.2)" : "0 0 10px rgba(16, 185, 129, 0.2)"
                }}>
                  <span className="pulse-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: data?.memory.usagePercent && data.memory.usagePercent > 85 ? "#EF4444" : "#10B981" }}></span>
                  {data?.memory.usagePercent && data.memory.usagePercent > 85 ? "HIGH RESOURCE LOAD" : "SYSTEM OPTIMAL"}
                </span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "#94A3B8", marginTop: "0.15rem" }}>
                Live Linux VPS task manager monitoring CPU, RAM, SSD Storage, and PM2 node execution runtime.
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
            
            {/* Auto Refresh Toggle Pills */}
            <div style={{ display: "flex", alignItems: "center", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "0.2rem" }}>
              <button
                onClick={() => { setRefreshInterval(3000); setIsPaused(false); }}
                style={{
                  padding: "0.3rem 0.65rem",
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  borderRadius: "6px",
                  border: "none",
                  background: refreshInterval === 3000 && !isPaused ? "rgba(56, 189, 248, 0.2)" : "transparent",
                  color: refreshInterval === 3000 && !isPaused ? "#38BDF8" : "#94A3B8",
                  boxShadow: refreshInterval === 3000 && !isPaused ? "0 0 10px rgba(56, 189, 248, 0.2)" : "none",
                  cursor: "pointer"
                }}
              >
                3s
              </button>
              <button
                onClick={() => { setRefreshInterval(5000); setIsPaused(false); }}
                style={{
                  padding: "0.3rem 0.65rem",
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  borderRadius: "6px",
                  border: "none",
                  background: refreshInterval === 5000 && !isPaused ? "rgba(56, 189, 248, 0.2)" : "transparent",
                  color: refreshInterval === 5000 && !isPaused ? "#38BDF8" : "#94A3B8",
                  boxShadow: refreshInterval === 5000 && !isPaused ? "0 0 10px rgba(56, 189, 248, 0.2)" : "none",
                  cursor: "pointer"
                }}
              >
                5s
              </button>
              <button
                onClick={() => { setRefreshInterval(10000); setIsPaused(false); }}
                style={{
                  padding: "0.3rem 0.65rem",
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  borderRadius: "6px",
                  border: "none",
                  background: refreshInterval === 10000 && !isPaused ? "rgba(56, 189, 248, 0.2)" : "transparent",
                  color: refreshInterval === 10000 && !isPaused ? "#38BDF8" : "#94A3B8",
                  boxShadow: refreshInterval === 10000 && !isPaused ? "0 0 10px rgba(56, 189, 248, 0.2)" : "none",
                  cursor: "pointer"
                }}
              >
                10s
              </button>
              <button
                onClick={() => setIsPaused(!isPaused)}
                title={isPaused ? "Resume live polling" : "Pause live polling"}
                style={{
                  padding: "0.3rem 0.5rem",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: "none",
                  background: isPaused ? "rgba(239, 68, 68, 0.15)" : "transparent",
                  color: isPaused ? "#EF4444" : "#64748B",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {isPaused ? <Play size={13} /> : <Pause size={13} />}
              </button>
            </div>

            <button
              onClick={() => fetchHealth(true)}
              disabled={loading}
              className="btn-glass"
              style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handlePm2Restart}
              disabled={actionPending}
              className="btn-gold"
              style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              <RotateCcw size={14} />
              <span>Restart PM2</span>
            </button>
          </div>

        </div>
      </div>

      {/* 2. Primary Resource Gauges (4 Cards - Sidebar Dark Theme) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
        
        {/* CPU Load Gauge */}
        <div 
          className="glass-panel" 
          style={{ 
            padding: "1.35rem", 
            background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)", 
            border: "1px solid rgba(255, 255, 255, 0.08)", 
            borderTop: "3px solid #38BDF8",
            borderRadius: "16px", 
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            display: "flex", 
            flexDirection: "column", 
            gap: "0.85rem" 
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <div style={{ padding: "0.45rem", borderRadius: "10px", background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38BDF8" }}>
                <Cpu size={18} />
              </div>
              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#FFFFFF", letterSpacing: "0.02em" }}>CPU Load</span>
            </div>
            <span style={{ fontSize: "1.4rem", fontWeight: 900, fontFamily: "var(--font-mono)", color: getStatusColor(data?.cpu.usagePercent || 0), textShadow: `0 0 12px ${getStatusColor(data?.cpu.usagePercent || 0)}40` }}>
              {data?.cpu.usagePercent ?? 0}%
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ height: "8px", width: "100%", background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${data?.cpu.usagePercent ?? 0}%`,
              background: getStatusColor(data?.cpu.usagePercent || 0),
              borderRadius: "4px",
              boxShadow: `0 0 10px ${getStatusColor(data?.cpu.usagePercent || 0)}`,
              transition: "width 0.5s ease"
            }}></div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#94A3B8" }}>
            <span>Cores: <strong style={{ color: "#FFFFFF", fontFamily: "var(--font-mono)" }}>{data?.cpu.cores ?? 1} Cores</strong></span>
            <span>Load: <strong style={{ color: "#FFFFFF", fontFamily: "var(--font-mono)" }}>{data?.system.loadAvg?.[0] ?? 0.0}</strong></span>
          </div>
          <p style={{ fontSize: "0.72rem", color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }} title={data?.cpu.model}>
            {data?.cpu.model ?? "Intel/AMD Virtual CPU"}
          </p>
        </div>

        {/* RAM Memory Gauge */}
        <div 
          className="glass-panel" 
          style={{ 
            padding: "1.35rem", 
            background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)", 
            border: "1px solid rgba(255, 255, 255, 0.08)", 
            borderTop: "3px solid #10B981",
            borderRadius: "16px", 
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            display: "flex", 
            flexDirection: "column", 
            gap: "0.85rem" 
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <div style={{ padding: "0.45rem", borderRadius: "10px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10B981" }}>
                <MemoryStick size={18} />
              </div>
              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#FFFFFF", letterSpacing: "0.02em" }}>RAM Memory</span>
            </div>
            <span style={{ fontSize: "1.4rem", fontWeight: 900, fontFamily: "var(--font-mono)", color: getStatusColor(data?.memory.usagePercent || 0), textShadow: `0 0 12px ${getStatusColor(data?.memory.usagePercent || 0)}40` }}>
              {data?.memory.usagePercent ?? 0}%
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ height: "8px", width: "100%", background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${data?.memory.usagePercent ?? 0}%`,
              background: getStatusColor(data?.memory.usagePercent || 0),
              borderRadius: "4px",
              boxShadow: `0 0 10px ${getStatusColor(data?.memory.usagePercent || 0)}`,
              transition: "width 0.5s ease"
            }}></div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#94A3B8" }}>
            <span>Used: <strong style={{ color: "#FFFFFF", fontFamily: "var(--font-mono)" }}>{data?.memory.usedGb ?? 0} GB</strong></span>
            <span>Total: <strong style={{ color: "#FFFFFF", fontFamily: "var(--font-mono)" }}>{data?.memory.totalGb ?? 0} GB</strong></span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#64748B" }}>
            <span>Free RAM: <span style={{ color: "#94A3B8" }}>{data?.memory.freeGb ?? 0} GB</span></span>
            <span><span style={{ color: "#94A3B8" }}>{data?.memory.usedMb ?? 0} MB</span> used</span>
          </div>
        </div>

        {/* SSD Disk Storage Gauge */}
        <div 
          className="glass-panel" 
          style={{ 
            padding: "1.35rem", 
            background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)", 
            border: "1px solid rgba(255, 255, 255, 0.08)", 
            borderTop: "3px solid #A855F7",
            borderRadius: "16px", 
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            display: "flex", 
            flexDirection: "column", 
            gap: "0.85rem" 
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <div style={{ padding: "0.45rem", borderRadius: "10px", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", color: "#A855F7" }}>
                <HardDrive size={18} />
              </div>
              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#FFFFFF", letterSpacing: "0.02em" }}>SSD Storage</span>
            </div>
            <span style={{ fontSize: "1.4rem", fontWeight: 900, fontFamily: "var(--font-mono)", color: getStatusColor(data?.disk.usedPercent || 0), textShadow: `0 0 12px ${getStatusColor(data?.disk.usedPercent || 0)}40` }}>
              {data?.disk.usedPercent ?? 0}%
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ height: "8px", width: "100%", background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${data?.disk.usedPercent ?? 0}%`,
              background: getStatusColor(data?.disk.usedPercent || 0),
              borderRadius: "4px",
              boxShadow: `0 0 10px ${getStatusColor(data?.disk.usedPercent || 0)}`,
              transition: "width 0.5s ease"
            }}></div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#94A3B8" }}>
            <span>Used: <strong style={{ color: "#FFFFFF", fontFamily: "var(--font-mono)" }}>{data?.disk.usedGb ?? 0} GB</strong></span>
            <span>Total: <strong style={{ color: "#FFFFFF", fontFamily: "var(--font-mono)" }}>{data?.disk.totalGb ?? 0} GB</strong></span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#64748B" }}>
            <span>Available: <span style={{ color: "#94A3B8" }}>{data?.disk.freeGb ?? 0} GB</span></span>
            <span>Mount: <span style={{ color: "#94A3B8" }}>{data?.disk.mount ?? "/"}</span></span>
          </div>
        </div>

        {/* PM2 Runtime Status */}
        <div 
          className="glass-panel" 
          style={{ 
            padding: "1.35rem", 
            background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)", 
            border: "1px solid rgba(255, 255, 255, 0.08)", 
            borderTop: "3px solid #F59E0B",
            borderRadius: "16px", 
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            display: "flex", 
            flexDirection: "column", 
            gap: "0.85rem" 
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <div style={{ padding: "0.45rem", borderRadius: "10px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#F59E0B" }}>
                <Zap size={18} />
              </div>
              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#FFFFFF", letterSpacing: "0.02em" }}>PM2 Process</span>
            </div>
            <span className="badge" style={{
              background: data?.pm2.status === "online" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
              border: data?.pm2.status === "online" ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(239, 68, 68, 0.4)",
              color: data?.pm2.status === "online" ? "#10B981" : "#EF4444",
              fontSize: "0.72rem",
              fontWeight: 800,
              boxShadow: data?.pm2.status === "online" ? "0 0 10px rgba(16, 185, 129, 0.2)" : "0 0 10px rgba(239, 68, 68, 0.2)"
            }}>
              {data?.pm2.status?.toUpperCase() || "ONLINE"}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "0.78rem", color: "#94A3B8" }}>Uptime:</span>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#10B981", textShadow: "0 0 10px rgba(16, 185, 129, 0.3)" }}>
              {formatUptime(data?.pm2.uptimeSeconds || 0)}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#94A3B8" }}>
            <span>Restarts: <strong style={{ color: "#38BDF8", fontFamily: "var(--font-mono)" }}>↺ {data?.pm2.restarts ?? 0}</strong></span>
            <span>Heap: <strong style={{ color: "#FFFFFF", fontFamily: "var(--font-mono)" }}>{data?.nodeProcess.heapUsedMb ?? 0} MB</strong></span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#64748B" }}>
            <span>PID: <span style={{ color: "#94A3B8", fontFamily: "var(--font-mono)" }}>{data?.pm2.pid ?? process.pid}</span></span>
            <span>Node <span style={{ color: "#94A3B8", fontFamily: "var(--font-mono)" }}>{data?.nodeProcess.nodeVersion ?? "v20"}</span></span>
          </div>
        </div>

      </div>

      {/* 3. Deep System Metrics & Node.js Memory Heap */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
        
        {/* Node.js Heap Breakdown */}
        <div 
          className="glass-panel" 
          style={{ 
            padding: "1.35rem", 
            background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)", 
            border: "1px solid rgba(255, 255, 255, 0.08)", 
            borderTop: "3px solid #38BDF8",
            borderRadius: "16px", 
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            display: "flex", 
            flexDirection: "column", 
            gap: "0.85rem" 
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "0.65rem" }}>
            <div style={{ padding: "0.4rem", borderRadius: "8px", background: "rgba(56, 189, 248, 0.15)", color: "#38BDF8" }}>
              <Layers size={16} />
            </div>
            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#FFFFFF", letterSpacing: "0.02em" }}>Node.js Memory Heap Allocation</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)", padding: "0.6rem 0.85rem", borderRadius: "10px" }}>
              <span style={{ color: "#94A3B8", fontSize: "0.8rem", fontWeight: 600 }}>Heap Used (Active Objects)</span>
              <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "#FFFFFF" }}>{data?.nodeProcess.heapUsedMb ?? 0} MB</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)", padding: "0.6rem 0.85rem", borderRadius: "10px" }}>
              <span style={{ color: "#94A3B8", fontSize: "0.8rem", fontWeight: 600 }}>Total Allocated Heap</span>
              <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "#FFFFFF" }}>{data?.nodeProcess.heapTotalMb ?? 0} MB</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(56, 189, 248, 0.06)", border: "1px solid rgba(56, 189, 248, 0.2)", padding: "0.6rem 0.85rem", borderRadius: "10px" }}>
              <span style={{ color: "#94A3B8", fontSize: "0.8rem", fontWeight: 600 }}>RSS (Resident Set Memory)</span>
              <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "#38BDF8", textShadow: "0 0 8px rgba(56, 189, 248, 0.3)" }}>{data?.nodeProcess.rssMb ?? 0} MB</span>
            </div>
          </div>
        </div>

        {/* Server OS & Uptime Specs */}
        <div 
          className="glass-panel" 
          style={{ 
            padding: "1.35rem", 
            background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)", 
            border: "1px solid rgba(255, 255, 255, 0.08)", 
            borderTop: "3px solid #10B981",
            borderRadius: "16px", 
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            display: "flex", 
            flexDirection: "column", 
            gap: "0.85rem" 
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "0.65rem" }}>
            <div style={{ padding: "0.4rem", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}>
              <Clock size={16} />
            </div>
            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#FFFFFF", letterSpacing: "0.02em" }}>Host Server Environment & Uptime</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)", padding: "0.6rem 0.85rem", borderRadius: "10px" }}>
              <span style={{ color: "#94A3B8", fontSize: "0.8rem", fontWeight: 600 }}>Hostname</span>
              <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "#FFFFFF" }}>{data?.system.hostname ?? "VPS"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)", padding: "0.6rem 0.85rem", borderRadius: "10px" }}>
              <span style={{ color: "#94A3B8", fontSize: "0.8rem", fontWeight: 600 }}>OS Architecture</span>
              <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "#FFFFFF" }}>{data?.system.platform ?? "linux"} ({data?.system.arch ?? "x64"})</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "0.6rem 0.85rem", borderRadius: "10px" }}>
              <span style={{ color: "#94A3B8", fontSize: "0.8rem", fontWeight: 600 }}>Server Uptime</span>
              <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "#10B981", textShadow: "0 0 8px rgba(16, 185, 129, 0.3)" }}>{formatUptime(data?.system.uptimeSeconds || 0)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. PM2 & Server Terminal Log Viewer */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: "1.35rem", 
          background: "linear-gradient(180deg, #0E0C1B 0%, #080612 100%)", 
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 12px 35px rgba(0, 0, 0, 0.6)",
          color: "#F8FAFC", 
          borderRadius: "16px" 
        }}
      >
        
        {/* Terminal Header Bar */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "0.75rem", marginBottom: "0.85rem" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <div style={{ padding: "0.35rem", borderRadius: "6px", background: "rgba(56, 189, 248, 0.15)", color: "#38BDF8" }}>
              <Terminal size={18} />
            </div>
            <span style={{ fontSize: "0.88rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#FFFFFF" }}>
              PM2 OPERATIONAL TERMINAL LOGS
            </span>
            <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "6px", background: "rgba(255, 255, 255, 0.08)", color: "#94A3B8", border: "1px solid rgba(255, 255, 255, 0.06)", fontWeight: 700 }}>
              {filteredLogs.length} entries
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {/* Filter Buttons */}
            <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "6px", padding: "0.15rem" }}>
              <button
                onClick={() => setLogFilter("ALL")}
                style={{
                  padding: "0.25rem 0.55rem",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  borderRadius: "4px",
                  border: "none",
                  background: logFilter === "ALL" ? "#38BDF8" : "transparent",
                  color: logFilter === "ALL" ? "#0F172A" : "#94A3B8",
                  cursor: "pointer"
                }}
              >
                ALL
              </button>
              <button
                onClick={() => setLogFilter("OUT")}
                style={{
                  padding: "0.25rem 0.55rem",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  borderRadius: "4px",
                  border: "none",
                  background: logFilter === "OUT" ? "#10B981" : "transparent",
                  color: logFilter === "OUT" ? "#0F172A" : "#94A3B8",
                  cursor: "pointer"
                }}
              >
                STDOUT
              </button>
              <button
                onClick={() => setLogFilter("ERR")}
                style={{
                  padding: "0.25rem 0.55rem",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  borderRadius: "4px",
                  border: "none",
                  background: logFilter === "ERR" ? "#EF4444" : "transparent",
                  color: logFilter === "ERR" ? "#FFFFFF" : "#94A3B8",
                  cursor: "pointer"
                }}
              >
                STDERR
              </button>
            </div>

            {/* Log Search Input */}
            <input
              type="text"
              placeholder="Filter log text..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              style={{
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#F8FAFC",
                fontSize: "0.74rem",
                padding: "0.3rem 0.6rem",
                borderRadius: "6px",
                outline: "none",
                width: "140px"
              }}
            />

            <button
              onClick={handleClearLogs}
              title="Clear log file"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#FCA5A5",
                fontSize: "0.72rem",
                padding: "0.3rem 0.6rem",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                fontWeight: 700
              }}
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          </div>

        </div>

        {/* Terminal Text Body */}
        <div 
          ref={logTerminalRef}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.76rem",
            lineHeight: "1.6",
            background: "#04030A",
            padding: "0.85rem 1rem",
            borderRadius: "10px",
            maxHeight: "260px",
            overflowY: "auto",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "inset 0 2px 10px rgba(0, 0, 0, 0.7)"
          }}
        >
          {filteredLogs.length === 0 ? (
            <div style={{ color: "#64748B", textAlign: "center", padding: "1.5rem" }}>
              No log messages matching filter.
            </div>
          ) : (
            filteredLogs.map((log, idx) => (
              <div key={idx} style={{ display: "flex", gap: "0.75rem", wordBreak: "break-all" }}>
                <span style={{ color: "#475569", userSelect: "none", minWidth: "24px" }}>{idx + 1}</span>
                <span style={{
                  color: log.type === "error" ? "#FCA5A5" : "#38BDF8",
                  fontWeight: log.type === "error" ? 700 : 400
                }}>
                  {log.text}
                </span>
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
}
