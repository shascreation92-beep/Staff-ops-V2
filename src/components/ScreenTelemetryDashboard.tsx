"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { 
  Folder, 
  FolderOpen, 
  Monitor, 
  ShieldAlert, 
  Calendar, 
  User, 
  Download, 
  RefreshCw, 
  Trash2, 
  Eye, 
  Clock, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Film, 
  Grid, 
  FileArchive, 
  ArrowLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Activity,
  Zap
} from "lucide-react";
import { getCompanyScreenshotsAction, getTamperLogsAction, manualCleanOldScreenshotsAction, getUsersMonitoringStatusAction } from "@/app/actions/telemetry";
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

interface UserStatusInfo {
  status: "ACTIVE" | "IDLE" | "INTERRUPTED" | "OFF_DUTY";
  lastCapturedAt: string | null;
}

interface Props {
  currentUserRole: string;
  staffList: UserInfo[];
}

export default function ScreenTelemetryDashboard({ currentUserRole, staffList }: Props) {
  const [isPending, startTransition] = useTransition();
  const [snapshots, setSnapshots] = useState<ScreenshotItem[]>([]);
  const [tamperLogs, setTamperLogs] = useState<TamperLogItem[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, UserStatusInfo>>({});
  const [selectedUserId, setSelectedUserId] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [previewImage, setPreviewImage] = useState<ScreenshotItem | null>(null);

  // Live 40s Ticker seconds remaining state
  const [countdownSec, setCountdownSec] = useState<number>(40);

  // View state: 'FOLDERS' | 'USER_FOLDER'
  const [activeFolderUser, setActiveFolderUser] = useState<UserInfo | null>(null);
  const [folderViewMode, setFolderViewMode] = useState<"FILMSTRIP" | "GRID">("GRID");

  // Filmstrip Timeline Player state
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms per frame

  const previousSnapshotsCountRef = useRef<number>(0);

  const fetchTelemetryData = () => {
    startTransition(async () => {
      try {
        const snapRes = await getCompanyScreenshotsAction({
          targetUserId: selectedUserId === "ALL" ? undefined : selectedUserId,
          dateStr: selectedDate
        });
        if (snapRes.success && snapRes.snapshots) {
          const newSnaps = snapRes.snapshots as any[];
          if (previousSnapshotsCountRef.current > 0 && newSnaps.length > previousSnapshotsCountRef.current) {
            const newest = newSnaps[0];
            toast.success(`📸 New 40s screenshot captured for ${newest.user?.name || newest.user?.email || "staff member"}!`);
          }
          previousSnapshotsCountRef.current = newSnaps.length;
          setSnapshots(newSnaps);
        }

        const tamperRes = await getTamperLogsAction();
        if (tamperRes.success && tamperRes.logs) {
          setTamperLogs(tamperRes.logs as any);
        }

        const statusRes = await getUsersMonitoringStatusAction();
        if (statusRes.success && statusRes.userStatusMap) {
          setStatusMap(statusRes.userStatusMap as any);
        }
      } catch (err: any) {
        console.error("Failed to load screen telemetry:", err);
      }
    });
  };

  // Initial fetch
  useEffect(() => {
    fetchTelemetryData();
  }, [selectedUserId, selectedDate]);

  // Live 1-second countdown ticker timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSec(prev => {
        if (prev <= 1) {
          fetchTelemetryData(); // Auto fetch when countdown hits 0
          return 40;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Filmstrip Player interval logic
  const filteredSnapshots = activeFolderUser
    ? snapshots.filter(s => s.userId === activeFolderUser.id).sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
    : [];

  useEffect(() => {
    let timer: any;
    if (isPlaying && filteredSnapshots.length > 0) {
      timer = setInterval(() => {
        setCurrentFrameIndex(prev => (prev + 1) % filteredSnapshots.length);
      }, playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, filteredSnapshots.length, playbackSpeed]);

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
    const serverUrl = typeof window !== "undefined" ? window.location.origin : "https://51-38-71-134.sslip.io";
    const targetUserId = activeFolderUser ? activeFolderUser.id : (selectedUserId !== "ALL" ? selectedUserId : "");

    const installerContent = `@echo off
:: Worknode Workstation 40s Silent Screen Telemetry Agent 1-Click Installer
title Worknode Workstation Sync Installer

echo =======================================================
echo   Worknode Workstation 40s Silent Agent Setup
echo =======================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\\WorknodeAgent"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

set "SERVER_URL=${serverUrl}"
set "USER_ID=${targetUserId}"
set "AGENT_PS1=%TARGET_DIR%\\StaffOps-Agent.ps1"
set "VBS_LAUNCHER=%TARGET_DIR%\\run-agent-silent.vbs"
set "STARTUP_DIR=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"

echo Downloading Worknode Desktop Agent Engine from Server...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%SERVER_URL%/desktop-agent/StaffOps-Agent.ps1', '%AGENT_PS1%')"

echo Creating silent background VBScript launcher...
echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_LAUNCHER%"
echo WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%AGENT_PS1%"" -ServerUrl ""%SERVER_URL%"" -UserId ""%USER_ID%""", 0, false >> "%VBS_LAUNCHER%"

echo Creating shortcut in Windows Startup folder...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$wsh = New-Object -ComObject WScript.Shell; $sc = $wsh.CreateShortcut('%STARTUP_DIR%\\WorknodeWorkstationSync.lnk'); $sc.TargetPath = 'wscript.exe'; $sc.Arguments = '\"%VBS_LAUNCHER%\"'; $sc.WorkingDirectory = '%TARGET_DIR%'; $sc.WindowStyle = 7; $sc.Save()"

echo Launching 40-second desktop telemetry engine...
wscript.exe "%VBS_LAUNCHER%"

echo.
echo SUCCESS! Worknode Workstation Sync has been installed and activated.
echo It will capture 40-second desktop telemetry automatically on Windows boot.
echo.
pause
`;

    const blob = new Blob([installerContent], { type: "application/x-bat" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Install-Workstation-Sync.bat";
    a.click();
    toast.success("Workstation Agent 1-Click Installer downloaded!");
  };

  const handleDownloadUserFolderZip = (userToZip: UserInfo) => {
    const zipUrl = `/api/telemetry/download-zip?userId=${userToZip.id}&dateStr=${selectedDate}`;
    toast.success(`Preparing screenshot ZIP archive for ${userToZip.name || userToZip.email}...`);
    window.open(zipUrl, "_blank");
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
              40-Second Desktop Screen Audit & User Folders
            </h1>
            <p style={{ fontSize: "0.82rem", color: "#94A3B8", margin: "0.2rem 0 0 0" }}>
              Silent 40s desktop telemetry, live agent running status & auto 7-day retention
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Live Countdown Ticker Pill */}
          <div style={{
            padding: "0.45rem 0.85rem",
            borderRadius: "8px",
            background: "rgba(139, 92, 246, 0.15)",
            border: "1px solid rgba(139, 92, 246, 0.35)",
            color: "#C4B5FD",
            fontSize: "0.78rem",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: "0.45rem"
          }}>
            <Zap size={14} className="animate-pulse" style={{ color: "#F59E0B" }} />
            <span>Next Capture: <strong>{countdownSec}s</strong></span>
          </div>

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
            Live Sync Status
          </div>
          <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#10B981", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Activity size={16} className="animate-pulse" />
            <span>Ticking Every 40s</span>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div style={{
        padding: "0.85rem 1.25rem",
        background: "#FFFFFF",
        border: "1px solid var(--border-dim)",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.9rem", fontWeight: 700 }}>
          <button
            onClick={() => setActiveFolderUser(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: activeFolderUser ? "var(--text-muted)" : "var(--primary-color)",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontWeight: 800
            }}
          >
            <Folder size={18} />
            <span>All Staff User Folders</span>
          </button>

          {activeFolderUser && (
            <>
              <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
              <span style={{ color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <FolderOpen size={18} style={{ color: "#8B5CF6" }} />
                <span>{activeFolderUser.name || activeFolderUser.email}</span>
                <span className="badge active" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem", marginLeft: "0.2rem" }}>
                  {activeFolderUser.employee?.employeeId || "N/A"}
                </span>
              </span>
            </>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
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

          {activeFolderUser && (
            <button
              onClick={() => handleDownloadUserFolderZip(activeFolderUser)}
              style={{
                padding: "0.4rem 0.9rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "#1E293B",
                background: "#F1F5F9",
                border: "1px solid #CBD5E1",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <FileArchive size={15} style={{ color: "#8B5CF6" }} />
              <span>Download User ZIP</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: ALL USER FOLDERS GRID */}
      {!activeFolderUser ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "1.25rem"
        }}>
          {staffList.map(u => {
            const userSnaps = snapshots.filter(s => s.userId === u.id);
            const latestSnap = userSnaps[0];
            const userIdleCount = userSnaps.filter(s => s.isIdle).length;
            const uStatus = statusMap[u.id];

            const isAgentActive = uStatus?.status === "ACTIVE" || uStatus?.status === "IDLE";

            return (
              <div
                key={u.id}
                className="glass-panel"
                style={{
                  background: "#FFFFFF",
                  border: isAgentActive ? "1.5px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--border-dim)",
                  borderRadius: "14px",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  boxShadow: isAgentActive ? "0 4px 16px rgba(16, 185, 129, 0.12)" : "0 4px 12px rgba(0, 0, 0, 0.04)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  position: "relative"
                }}
              >
                {/* Live Agent Running Status Indicator Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: isAgentActive ? "rgba(16, 185, 129, 0.12)" : "rgba(100, 116, 139, 0.12)",
                      border: isAgentActive ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(100, 116, 139, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isAgentActive ? "#10B981" : "#64748B"
                    }}>
                      <Folder size={24} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
                        {u.name || u.email.split("@")[0]}
                      </h3>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                        {u.email}
                      </div>
                    </div>
                  </div>

                  <span className="badge active" style={{ fontSize: "0.62rem" }}>
                    {u.employee?.employeeId || "N/A"}
                  </span>
                </div>

                {/* Live Workstation Agent Running Status Pill */}
                <div style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: "8px",
                  background: isAgentActive ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                  border: isAgentActive ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.74rem",
                  fontWeight: 700
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: isAgentActive ? "#059669" : "#DC2626" }}>
                    {isAgentActive ? <Wifi size={14} className="animate-pulse" /> : <WifiOff size={14} />}
                    <span>{isAgentActive ? "Workstation Sync Running" : "Installer Not Running on PC"}</span>
                  </div>

                  {isAgentActive && (
                    <span style={{ fontSize: "0.68rem", color: "#059669", fontWeight: 800 }}>
                      Next SS in {countdownSec}s
                    </span>
                  )}
                </div>

                {/* Folder Thumbnail / Status Preview */}
                <div 
                  onClick={() => {
                    setActiveFolderUser(u);
                    setCurrentFrameIndex(0);
                  }}
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "140px",
                    background: "#0F172A",
                    borderRadius: "8px",
                    overflow: "hidden",
                    cursor: "pointer"
                  }}
                >
                  {latestSnap ? (
                    <img
                      src={latestSnap.imageUrl}
                      alt="Latest capture"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#64748B",
                      fontSize: "0.78rem"
                    }}>
                      <Monitor size={28} style={{ opacity: 0.4, marginBottom: "0.4rem" }} />
                      <span>No Captures Today</span>
                    </div>
                  )}

                  <div style={{
                    position: "absolute",
                    bottom: "0.5rem",
                    right: "0.5rem",
                    background: "rgba(15, 23, 42, 0.85)",
                    color: "#FFFFFF",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.55rem",
                    borderRadius: "4px"
                  }}>
                    📁 Open Folder ({userSnaps.length})
                  </div>
                </div>

                {/* Folder Meta Stats */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <div>
                    Shots Today: <strong style={{ color: "var(--text-primary)" }}>{userSnaps.length}</strong>
                  </div>
                  <div>
                    Idle Shots: <strong style={{ color: userIdleCount > 0 ? "#F59E0B" : "var(--text-primary)" }}>{userIdleCount}</strong>
                  </div>
                </div>

                {/* Action Toolbar */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      setActiveFolderUser(u);
                      setCurrentFrameIndex(0);
                    }}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#FFFFFF",
                      background: "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.3rem"
                    }}
                  >
                    <FolderOpen size={14} />
                    <span>View User Folder</span>
                  </button>

                  <button
                    onClick={() => handleDownloadUserFolderZip(u)}
                    style={{
                      padding: "0.5rem 0.7rem",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#334155",
                      background: "#F1F5F9",
                      border: "1px solid #CBD5E1",
                      borderRadius: "8px",
                      cursor: "pointer"
                    }}
                    title="Download 40s Screenshots ZIP Archive"
                  >
                    <FileArchive size={15} style={{ color: "#8B5CF6" }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW MODE 2: USER FOLDER DETAIL (IMAGE GALLERY GRID / SLIDESHOW) */
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Sub-toolbar */}
          <div style={{
            padding: "0.75rem 1.25rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            borderRadius: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem"
          }}>
            <button
              onClick={() => setActiveFolderUser(null)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to All User Folders</span>
            </button>

            {/* Switcher Mode Tabs */}
            <div style={{ display: "flex", gap: "0.5rem", background: "#F1F5F9", padding: "0.25rem", borderRadius: "8px" }}>
              <button
                onClick={() => setFolderViewMode("GRID")}
                style={{
                  padding: "0.35rem 0.85rem",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: folderViewMode === "GRID" ? "#FFFFFF" : "transparent",
                  color: folderViewMode === "GRID" ? "#8B5CF6" : "#64748B",
                  boxShadow: folderViewMode === "GRID" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem"
                }}
              >
                <Grid size={14} />
                <span>Image Gallery Grid ({filteredSnapshots.length})</span>
              </button>

              <button
                onClick={() => setFolderViewMode("FILMSTRIP")}
                style={{
                  padding: "0.35rem 0.85rem",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: folderViewMode === "FILMSTRIP" ? "#FFFFFF" : "transparent",
                  color: folderViewMode === "FILMSTRIP" ? "#8B5CF6" : "#64748B",
                  boxShadow: folderViewMode === "FILMSTRIP" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem"
                }}
              >
                <Film size={14} />
                <span>Timeline Slideshow</span>
              </button>
            </div>
          </div>

          {filteredSnapshots.length === 0 ? (
            <div style={{
              padding: "3rem",
              textAlign: "center",
              background: "#FFFFFF",
              border: "1px dashed var(--border-dim)",
              borderRadius: "12px",
              color: "var(--text-muted)"
            }}>
              <Folder size={40} style={{ margin: "0 auto 0.75rem", opacity: 0.3 }} />
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                User Folder Empty for {selectedDate}
              </h3>
              <p style={{ fontSize: "0.82rem", marginTop: "0.25rem" }}>
                No 40-second screen telemetry captured for {activeFolderUser.name || activeFolderUser.email} on this date.
              </p>
            </div>
          ) : folderViewMode === "FILMSTRIP" ? (
            /* FILMSTRIP TIMELINE PLAYER MODE */
            <div style={{
              background: "#0F172A",
              borderRadius: "16px",
              padding: "1.25rem",
              color: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              boxShadow: "0 15px 35px rgba(0, 0, 0, 0.3)"
            }}>
              {/* Screen Frame Display */}
              <div style={{
                position: "relative",
                width: "100%",
                height: "480px",
                background: "#000000",
                borderRadius: "10px",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {filteredSnapshots[currentFrameIndex] && (
                  <img
                    src={filteredSnapshots[currentFrameIndex].imageUrl}
                    alt="Timeline Frame"
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                )}

                {/* Frame Badge Meta Header Overlay */}
                {filteredSnapshots[currentFrameIndex] && (
                  <div style={{
                    position: "absolute",
                    top: "1rem",
                    left: "1rem",
                    background: "rgba(15, 23, 42, 0.85)",
                    backdropFilter: "blur(6px)",
                    padding: "0.4rem 0.8rem",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    fontSize: "0.78rem"
                  }}>
                    <Clock size={14} style={{ color: "#A78BFA" }} />
                    <span>
                      Frame {currentFrameIndex + 1} / {filteredSnapshots.length} — {new Date(filteredSnapshots[currentFrameIndex].capturedAt).toLocaleTimeString()}
                    </span>
                    {filteredSnapshots[currentFrameIndex].isIdle && (
                      <span style={{ background: "#F59E0B", color: "#FFFFFF", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 800 }}>
                        IDLE
                      </span>
                    )}
                  </div>
                )}

                <button
                  onClick={() => filteredSnapshots[currentFrameIndex] && setPreviewImage(filteredSnapshots[currentFrameIndex])}
                  style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    background: "rgba(255, 255, 255, 0.15)",
                    backdropFilter: "blur(6px)",
                    border: "none",
                    color: "#FFFFFF",
                    padding: "0.4rem 0.7rem",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    fontSize: "0.75rem",
                    fontWeight: 700
                  }}
                >
                  <Eye size={14} />
                  <span>Full Screen</span>
                </button>
              </div>

              {/* Player Timeline Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Timeline Scrubber Range Slider */}
                <input
                  type="range"
                  min={0}
                  max={filteredSnapshots.length - 1}
                  value={currentFrameIndex}
                  onChange={e => setCurrentFrameIndex(parseInt(e.target.value, 10))}
                  style={{ width: "100%", accentColor: "#8B5CF6", cursor: "pointer" }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                      onClick={() => setCurrentFrameIndex(prev => Math.max(0, prev - 1))}
                      style={{ background: "rgba(255, 255, 255, 0.1)", border: "none", color: "#FFFFFF", padding: "0.4rem", borderRadius: "6px", cursor: "pointer" }}
                    >
                      <SkipBack size={16} />
                    </button>

                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      style={{
                        background: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                        border: "none",
                        color: "#FFFFFF",
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontSize: "0.82rem"
                      }}
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                      <span>{isPlaying ? "Pause Playback" : "Play Timeline"}</span>
                    </button>

                    <button
                      onClick={() => setCurrentFrameIndex(prev => Math.min(filteredSnapshots.length - 1, prev + 1))}
                      style={{ background: "rgba(255, 255, 255, 0.1)", border: "none", color: "#FFFFFF", padding: "0.4rem", borderRadius: "6px", cursor: "pointer" }}
                    >
                      <SkipForward size={16} />
                    </button>
                  </div>

                  {/* Playback Speed Selector */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#94A3B8" }}>
                    <span>Playback Speed:</span>
                    {[1000, 500, 250].map(speed => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        style={{
                          background: playbackSpeed === speed ? "#8B5CF6" : "rgba(255,255,255,0.1)",
                          border: "none",
                          color: "#FFFFFF",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        {speed === 1000 ? "1x" : speed === 500 ? "2x" : "4x"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filmstrip Carousel Bar */}
                <div style={{
                  display: "flex",
                  gap: "0.5rem",
                  overflowX: "auto",
                  padding: "0.5rem 0",
                  scrollBehavior: "smooth"
                }}>
                  {filteredSnapshots.map((snap, idx) => (
                    <div
                      key={snap.id}
                      onClick={() => setCurrentFrameIndex(idx)}
                      style={{
                        flexShrink: 0,
                        width: "85px",
                        height: "55px",
                        borderRadius: "6px",
                        overflow: "hidden",
                        border: idx === currentFrameIndex ? "2px solid #8B5CF6" : "1px solid rgba(255,255,255,0.2)",
                        cursor: "pointer",
                        opacity: idx === currentFrameIndex ? 1 : 0.6,
                        position: "relative"
                      }}
                    >
                      <img src={snap.imageUrl} alt="thumb" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{
                        position: "absolute",
                        bottom: 0, left: 0, right: 0,
                        background: "rgba(0,0,0,0.7)",
                        fontSize: "0.58rem",
                        textAlign: "center",
                        padding: "0.05rem"
                      }}>
                        {new Date(snap.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* THUMBNAIL GALLERY GRID MODE */
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "1.25rem"
            }}>
              {filteredSnapshots.map(snap => (
                <div key={snap.id} className="glass-panel" style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border-dim)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
                }}>
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

                  <div style={{ padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Clock size={13} style={{ color: "var(--text-muted)" }} />
                      <span>{new Date(snap.capturedAt).toLocaleTimeString()}</span>
                    </div>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#8B5CF6" }}>
                      {snap.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                  {previewImage.user.name || previewImage.user.email} — 40s Desktop Screenshot
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
