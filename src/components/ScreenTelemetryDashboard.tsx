"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Monitor, ShieldAlert, Calendar, User, Download, RefreshCw, Trash2, Eye, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { getCompanyScreenshotsAction, getTamperLogsAction, manualCleanOldScreenshotsAction } from "@/app/actions/telemetry";
import MonitoringStatusDot from "./MonitoringStatusDot";
import { toast } from "react-hot-toast";

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  role: string;
  employee?: {
    employeeId: string;
  } | null;
}

interface ScreenshotItem {
  id: string;
  userId: string;
  companyId: string | null;
  imageUrl: string;
  capturedAt: Date | string;
  dutyStatus: string;
  isIdle: boolean;
  source: string;
  user: UserInfo;
}

interface TamperLogItem {
  id: string;
  userId: string;
  reason: string;
  details: string | null;
  severity: string;
  isResolved: boolean;
  createdAt: Date | string;
  user: UserInfo;
}

interface Props {
  currentUserRole: string;
  staffList: UserInfo[];
}

export default function ScreenTelemetryDashboard({ currentUserRole, staffList }: Props) {
  const [isPending, startTransition] = useTransition();
  const [snapshots, setSnapshots] = useState<ScreenshotItem[]>([]);
  const [tamperLogs, setTamperLogs] = useState<TamperLogItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [previewImage, setPreviewImage] = useState<ScreenshotItem | null>(null);

  const fetchTelemetryData = () => {
    startTransition(async () => {
      try {
        const snapRes = await getCompanyScreenshotsAction({
          targetUserId: selectedUserId === "ALL" ? undefined : selectedUserId,
          dateStr: selectedDate
        });
        if (snapRes.success && snapRes.snapshots) {
          setSnapshots(snapRes.snapshots as any);
        }

        const tamperRes = await getTamperLogsAction();
        if (tamperRes.success && tamperRes.logs) {
          setTamperLogs(tamperRes.logs as any);
        }
      } catch (err: any) {
        console.error("Failed to load screen telemetry:", err);
      }
    });
  };

  useEffect(() => {
    fetchTelemetryData();
    const interval = setInterval(fetchTelemetryData, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [selectedUserId, selectedDate]);

  const handleManualCleanup = async () => {
    if (!confirm("Are you sure you want to run 7-day retention cleanup? This will permanently delete screenshots older than 7 days.")) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await manualCleanOldScreenshotsAction();
        if (res.success) {
          toast.success("7-Day retention storage cleanup completed!");
          fetchTelemetryData();
        }
      } catch (err: any) {
        toast.error(err.message || "Cleanup failed.");
      }
    });
  };

  const handleDownloadAgent = () => {
    const agentCode = `
// StaffOps Silent Windows Desktop Agent Setup
// Run 'node staffops-agent.js' or execute 'powershell ./Install-Agent-Startup.ps1' on employee laptops.
    `;
    const blob = new Blob([agentCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "StaffOps-Desktop-Agent.js";
    a.click();
    toast.success("Desktop Agent script downloaded!");
  };

  const activeSnapshotsCount = snapshots.length;
  const idleCount = snapshots.filter(s => s.isIdle).length;
  const unresolvedTamperCount = tamperLogs.filter(t => !t.isResolved).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: "1.5rem 1.75rem",
        borderRadius: "16px",
        background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)",
        color: "#FFFFFF",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "rgba(139, 92, 246, 0.2)",
            border: "1px solid rgba(139, 92, 246, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#A78BFA"
          }}>
            <Monitor size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              40-Second Desktop Screen Audit
            </h1>
            <p style={{ fontSize: "0.82rem", color: "#94A3B8", margin: "0.2rem 0 0 0" }}>
              Silent 40s desktop telemetry, 7-day auto storage retention & tamper violation tracking
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={handleDownloadAgent}
            style={{
              padding: "0.55rem 1.1rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#FFFFFF",
              background: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)"
            }}
          >
            <Download size={15} />
            <span>Download Desktop Agent</span>
          </button>

          <button
            onClick={handleManualCleanup}
            disabled={isPending}
            style={{
              padding: "0.55rem 1rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#CBD5E1",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
            title="Clean screenshots older than 7 days"
          >
            <Trash2 size={15} />
            <span>7-Day Storage Clean</span>
          </button>

          <button
            onClick={fetchTelemetryData}
            disabled={isPending}
            style={{
              padding: "0.55rem 0.85rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#FFFFFF",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem"
            }}
          >
            <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <div className="card-stat" style={{ padding: "1.1rem 1.25rem", background: "#FFFFFF", borderRadius: "12px", border: "1px solid var(--border-dim)" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Total 40s Shots Today
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text-primary)", marginTop: "0.2rem" }}>
            {activeSnapshotsCount}
          </div>
        </div>

        <div className="card-stat" style={{ padding: "1.1rem 1.25rem", background: "#FFFFFF", borderRadius: "12px", border: "1px solid var(--border-dim)" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Idle Captures (&gt;2m)
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#F59E0B", marginTop: "0.2rem" }}>
            {idleCount}
          </div>
        </div>

        <div className="card-stat" style={{ padding: "1.1rem 1.25rem", background: "#FFFFFF", borderRadius: "12px", border: "1px solid var(--border-dim)" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Tamper Violations
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: unresolvedTamperCount > 0 ? "#EF4444" : "#10B981", marginTop: "0.2rem" }}>
            {unresolvedTamperCount}
          </div>
        </div>

        <div className="card-stat" style={{ padding: "1.1rem 1.25rem", background: "#FFFFFF", borderRadius: "12px", border: "1px solid var(--border-dim)" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Retention Policy
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#8B5CF6", marginTop: "0.35rem" }}>
            Auto 7-Day Purge
          </div>
        </div>
      </div>

      {/* Tamper Violations Alert Banner */}
      {unresolvedTamperCount > 0 && (
        <div style={{
          padding: "1rem 1.25rem",
          background: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#EF4444", fontWeight: 800, fontSize: "0.92rem" }}>
            <ShieldAlert size={18} />
            <span>🚨 REAL-TIME TAMPER & VIOLATION ALERTS ({unresolvedTamperCount})</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {tamperLogs.slice(0, 5).map(log => (
              <div key={log.id} style={{
                fontSize: "0.82rem",
                color: "var(--text-primary)",
                background: "#FFFFFF",
                padding: "0.5rem 0.8rem",
                borderRadius: "6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <strong>{log.user.name || log.user.email}</strong> ({log.user.employee?.employeeId || "N/A"}): {log.reason}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  {new Date(log.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div style={{
        padding: "1rem 1.25rem",
        background: "#FFFFFF",
        border: "1px solid var(--border-dim)",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {/* User Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <User size={15} style={{ color: "var(--text-muted)" }} />
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="select-gold"
              style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem", minWidth: "180px" }}
            >
              <option value="ALL">All Staff Members</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name || s.email} ({s.employee?.employeeId || "N/A"})
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Calendar size={15} style={{ color: "var(--text-muted)" }} />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="input-gold"
              style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem" }}
            />
          </div>
        </div>

        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>
          Auto-capturing every <strong>40 Seconds</strong>
        </div>
      </div>

      {/* Screenshot Timeline Gallery Grid */}
      {snapshots.length === 0 ? (
        <div style={{
          padding: "3rem",
          textAlign: "center",
          background: "#FFFFFF",
          border: "1px dashed var(--border-dim)",
          borderRadius: "12px",
          color: "var(--text-muted)"
        }}>
          <Monitor size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
          <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            No Desktop Screenshots Found
          </h3>
          <p style={{ fontSize: "0.82rem", marginTop: "0.25rem" }}>
            No 40-second screen telemetry captured for the selected user and date.
          </p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1.25rem"
        }}>
          {snapshots.map(snap => (
            <div key={snap.id} className="glass-panel" style={{
              background: "#FFFFFF",
              border: "1px solid var(--border-dim)",
              borderRadius: "12px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease"
            }}>
              {/* Image Preview Thumbnail */}
              <div 
                onClick={() => setPreviewImage(snap)}
                style={{
                  position: "relative",
                  width: "100%",
                  height: "155px",
                  background: "#0F172A",
                  cursor: "pointer",
                  overflow: "hidden"
                }}
              >
                <img
                  src={snap.imageUrl}
                  alt={`Screenshot ${snap.user.name || snap.user.email}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{
                  position: "absolute",
                  bottom: "0.5rem",
                  right: "0.5rem",
                  background: "rgba(15, 23, 42, 0.75)",
                  backdropFilter: "blur(4px)",
                  color: "#FFFFFF",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem"
                }}>
                  <Eye size={12} />
                  <span>Expand</span>
                </div>

                {snap.isIdle && (
                  <div style={{
                    position: "absolute",
                    top: "0.5rem",
                    left: "0.5rem",
                    background: "rgba(245, 158, 11, 0.9)",
                    color: "#FFFFFF",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    padding: "0.15rem 0.45rem",
                    borderRadius: "4px"
                  }}>
                    IDLE (&gt;2m)
                  </div>
                )}
              </div>

              {/* Card Meta Footer */}
              <div style={{ padding: "0.85rem 1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <MonitoringStatusDot status={snap.isIdle ? "IDLE" : "ACTIVE"} />
                    <span>{snap.user.name || snap.user.email}</span>
                  </span>
                  <span className="badge active" style={{ fontSize: "0.62rem", padding: "0.1rem 0.35rem" }}>
                    ID: {snap.user.employee?.employeeId || "N/A"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.74rem", color: "var(--text-muted)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Clock size={12} />
                    <span>{new Date(snap.capturedAt).toLocaleTimeString()}</span>
                  </div>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#8B5CF6" }}>
                    {snap.source}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-Screen Preview Modal */}
      {previewImage && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(8px)",
          zIndex: 2000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem"
        }}>
          <div style={{
            maxWidth: "1100px",
            width: "100%",
            background: "#FFFFFF",
            borderRadius: "16px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px rgba(0,0,0,0.4)"
          }}>
            <div style={{
              padding: "1rem 1.5rem",
              background: "#0F172A",
              color: "#FFFFFF",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>
                  {previewImage.user.name || previewImage.user.email} — Desktop Capture
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>
                  Captured at {new Date(previewImage.capturedAt).toLocaleString()} ({previewImage.source})
                </span>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                style={{ background: "none", border: "none", color: "#FFFFFF", fontSize: "1.4rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "1rem", background: "#000000", display: "flex", justifyContent: "center" }}>
              <img
                src={previewImage.imageUrl}
                alt="Desktop Preview"
                style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
