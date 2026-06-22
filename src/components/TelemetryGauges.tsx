"use client";

import React, { useState, useEffect } from "react";
import { Server, Activity, Database, Cpu } from "lucide-react";

export default function TelemetryGauges() {
  const [metrics, setMetrics] = useState({
    cpu: 28,
    ram: 62,
    connections: 1248,
    shards: 3
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(15, Math.min(95, prev.cpu + Math.floor(Math.random() * 9) - 4)),
        ram: Math.max(50, Math.min(90, prev.ram + Math.floor(Math.random() * 3) - 1)),
        connections: Math.max(1100, Math.min(1400, prev.connections + Math.floor(Math.random() * 11) - 5)),
        shards: prev.shards
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const radius = 35;
  const circumference = 2 * Math.PI * radius;

  const getStrokeOffset = (percentage: number) => {
    return circumference - (percentage / 100) * circumference;
  };

  return (
    <div className="glass-panel chart-panel" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="chart-header">
        <div className="chart-title-wrapper">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Activity size={18} style={{ color: "var(--gold-primary)" }} />
            <span>Telemetry & Teleports</span>
          </h2>
          <span className="chart-subtitle">Real-time system telemetry and shard statuses</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.5rem", padding: "0.5rem 0" }}>
        
        {/* CPU Progress Ring */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ position: "relative", width: "90px", height: "90px" }}>
            <svg width="90" height="90" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="45" cy="45" r={radius} fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="5" />
              <circle
                cx="45"
                cy="45"
                r={radius}
                fill="transparent"
                stroke="url(#goldGradient)"
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={getStrokeOffset(metrics.cpu)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
              <defs>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D4AF37" />
                  <stop offset="50%" stopColor="#FBBF24" />
                  <stop offset="100%" stopColor="#FFD700" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.95rem",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "var(--gold-glow)"
            }}>
              {metrics.cpu}%
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Cpu size={14} style={{ color: "var(--gold-premium)" }} /> CPU Cluster
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Core processor load</span>
          </div>
        </div>

        {/* RAM Progress Ring */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ position: "relative", width: "90px", height: "90px" }}>
            <svg width="90" height="90" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="45" cy="45" r={radius} fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="5" />
              <circle
                cx="45"
                cy="45"
                r={radius}
                fill="transparent"
                stroke="url(#goldGradient)"
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={getStrokeOffset(metrics.ram)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1.5s ease" }}
              />
            </svg>
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.95rem",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "var(--gold-glow)"
            }}>
              {metrics.ram}%
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Server size={14} style={{ color: "var(--gold-premium)" }} /> Memory
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Ram cache buffer</span>
          </div>
        </div>

        {/* Shard Databases indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ position: "relative", width: "90px", height: "90px" }}>
            <svg width="90" height="90" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="45" cy="45" r={radius} fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="5" />
              <circle
                cx="45"
                cy="45"
                r={radius}
                fill="transparent"
                stroke="url(#goldGradient)"
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={getStrokeOffset(100)} // 100% full
                strokeLinecap="round"
              />
            </svg>
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.95rem",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "var(--gold-glow)"
            }}>
              {metrics.shards} Region
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Database size={14} style={{ color: "var(--gold-premium)" }} /> Database
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Region shards synced</span>
          </div>
        </div>

      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-dim)", paddingTop: "0.75rem", fontFamily: "var(--font-mono)" }}>
        <span>Secure Active Tunnel: 127.0.0.1:443 &rarr; WAN</span>
        <span>Connections: {metrics.connections} active</span>
      </div>
    </div>
  );
}
