"use client";

import React, { useState, useEffect, useTransition, useRef, useMemo } from "react";
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
  Grid, 
  FileArchive, 
  Search,
  Package,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Wifi,
  WifiOff,
  Activity,
  Zap,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  CheckSquare,
  Square,
  AlertTriangle,
  ArrowUpDown,
  ArrowDown,
  ArrowUp
} from "lucide-react";
import { 
  getCompanyScreenshotsAction, 
  getTamperLogsAction, 
  manualCleanOldScreenshotsAction, 
  getUsersMonitoringStatusAction,
  deleteScreenshotsAction
} from "@/app/actions/telemetry";
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
  fileSizeFormatted?: string;
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

  // Bulk Selection State for Deletion
  const [selectedSnapIds, setSelectedSnapIds] = useState<string[]>([]);

  // Live 60s Ticker seconds remaining state (Clock-synced)
  const [countdownSec, setCountdownSec] = useState<number>(60);

  // View state: 'FOLDERS' | 'USER_FOLDER'
  const [activeFolderUser, setActiveFolderUser] = useState<UserInfo | null>(null);

  // Sync active user folder state with URL query parameter (?user=userId) so browser refreshes (F5) maintain active folder view
  const handleSelectUserFolder = (user: UserInfo | null) => {
    setActiveFolderUser(user);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (user) {
        url.searchParams.set("user", user.id);
      } else {
        url.searchParams.delete("user");
      }
      window.history.pushState({}, "", url.toString());
    }
  };

  useEffect(() => {
    const syncUserFromUrl = () => {
      if (typeof window !== "undefined" && staffList.length > 0) {
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get("user") || urlParams.get("userId");
        if (userParam) {
          const found = staffList.find(u => u.id === userParam);
          if (found) {
            setActiveFolderUser(found);
          }
        }
      }
    };

    syncUserFromUrl();
    window.addEventListener("popstate", syncUserFromUrl);
    return () => window.removeEventListener("popstate", syncUserFromUrl);
  }, [staffList]);

  // Search & Status Filter state for user folders grid
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ONLINE" | "OFFLINE">("ALL");

  const onlineCount = useMemo(() => {
    return staffList.filter(u => {
      const uStatus = statusMap[u.id];
      return uStatus?.status === "ACTIVE" || uStatus?.status === "IDLE";
    }).length;
  }, [staffList, statusMap]);

  const filteredStaffList = useMemo(() => {
    return staffList.filter(u => {
      const matchesSearch = !searchTerm || 
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const uStatus = statusMap[u.id];
      const isOnline = uStatus?.status === "ACTIVE" || uStatus?.status === "IDLE";

      if (statusFilter === "ONLINE") return matchesSearch && isOnline;
      if (statusFilter === "OFFLINE") return matchesSearch && !isOnline;
      return matchesSearch;
    });
  }, [staffList, searchTerm, statusFilter, statusMap]);

  // Lightbox Modal state: Index, Zoom & Pan
  const [modalImageIndex, setModalImageIndex] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panPos, setPanPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const previousSnapshotsCountRef = useRef<number>(0);

  // Safe background fetch protected from Next.js error boundary crashes
  const fetchTelemetryData = async () => {
    try {
      const snapRes = await getCompanyScreenshotsAction({
        targetUserId: selectedUserId === "ALL" ? undefined : selectedUserId,
        dateStr: selectedDate
      }).catch(() => null);

      if (snapRes?.success && snapRes?.snapshots) {
        const newSnaps = snapRes.snapshots as any[];
        if (previousSnapshotsCountRef.current > 0 && newSnaps.length > previousSnapshotsCountRef.current) {
          const newest = newSnaps[0];
          toast.success(`📸 New 1-minute screenshot captured for ${newest.user?.name || newest.user?.email || "staff member"}!`);
        }
        previousSnapshotsCountRef.current = newSnaps.length;
        setSnapshots(newSnaps);
      }

      const tamperRes = await getTamperLogsAction().catch(() => null);
      if (tamperRes?.success && tamperRes?.logs) {
        setTamperLogs(tamperRes.logs as any);
      }

      const statusRes = await getUsersMonitoringStatusAction().catch(() => null);
      if (statusRes?.success && statusRes?.userStatusMap) {
        setStatusMap(statusRes.userStatusMap as any);
      }
    } catch (err: any) {
      console.warn("Silent background refresh error:", err);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTelemetryData();
  }, [selectedUserId, selectedDate]);

  // Live 1-second countdown ticker timer (synced directly with system clock)
  useEffect(() => {
    const calculateSecs = () => {
      const currentSec = Math.floor(Date.now() / 1000);
      const secsRemaining = 60 - (currentSec % 60);
      setCountdownSec(secsRemaining === 0 ? 60 : secsRemaining);

      // Trigger safe telemetry update on boundary
      if (secsRemaining === 60 || secsRemaining === 1) {
        fetchTelemetryData();
      }
    };

    calculateSecs();
    const timer = setInterval(calculateSecs, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sort Order State: 'NEWEST' (Fresh First) | 'OLDEST'
  const [sortOrder, setSortOrder] = useState<"NEWEST" | "OLDEST">("NEWEST");

  // Filtered & Sorted snapshots for current folder view (Newest / Fresh First by default)
  const userSnaps = activeFolderUser ? snapshots.filter(s => s.userId === activeFolderUser.id) : snapshots;
  const filteredSnapshots = [...userSnaps].sort((a, b) => {
    const timeA = new Date(a.capturedAt).getTime();
    const timeB = new Date(b.capturedAt).getTime();
    return sortOrder === "NEWEST" ? timeB - timeA : timeA - timeB;
  });

  // Group snapshots by Date string for sleek Day Divider Banners
  const groupedSnapshotsByDate = useMemo(() => {
    const groups: { dateLabel: string; items: ScreenshotItem[] }[] = [];
    const map = new Map<string, ScreenshotItem[]>();

    filteredSnapshots.forEach(snap => {
      const d = new Date(snap.capturedAt);
      const dateLabel = d.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
      if (!map.has(dateLabel)) {
        map.set(dateLabel, []);
        groups.push({ dateLabel, items: map.get(dateLabel)! });
      }
      map.get(dateLabel)!.push(snap);
    });

    return groups;
  }, [filteredSnapshots]);


  // Active snapshots list for Lightbox modal
  const modalSnapshots = activeFolderUser ? filteredSnapshots : snapshots;
  const currentModalSnap = modalSnapshots[modalImageIndex] || previewImage;

  const openLightboxModal = (snap: ScreenshotItem) => {
    const idx = modalSnapshots.findIndex(s => s.id === snap.id);
    setModalImageIndex(idx !== -1 ? idx : 0);
    setPreviewImage(snap);
    setZoomScale(1);
    setPanPos({ x: 0, y: 0 });
  };

  // Checkbox selection handlers
  const toggleSelectSnap = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedSnapIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFolderSnaps = () => {
    const folderSnapIds = filteredSnapshots.map(s => s.id);
    const allSelected = folderSnapIds.every(id => selectedSnapIds.includes(id));
    if (allSelected) {
      setSelectedSnapIds(prev => prev.filter(id => !folderSnapIds.includes(id)));
    } else {
      setSelectedSnapIds(prev => Array.from(new Set([...prev, ...folderSnapIds])));
    }
  };

  // Bulk Delete Action
  const handleBulkDelete = async (idsToDelete?: string[]) => {
    const ids = idsToDelete || selectedSnapIds;
    if (ids.length === 0) {
      toast.error("No screenshots selected for deletion.");
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete ${ids.length} screenshot(s)?\nThis will remove them from the database and free up VPS disk space.`)) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await deleteScreenshotsAction(ids);
        if (res.success) {
          toast.success(`Successfully deleted ${res.count} screenshot(s) and freed VPS disk space!`);
          setSelectedSnapIds(prev => prev.filter(id => !ids.includes(id)));
          if (previewImage && ids.includes(previewImage.id)) {
            setPreviewImage(null);
          }
          fetchTelemetryData();
        } else {
          toast.error(res.error || "Failed to delete screenshots.");
        }
      } catch (err: any) {
        toast.error(err.message || "Deletion failed.");
      }
    });
  };

  // Keyboard navigation listener (Left, Right, Escape)
  useEffect(() => {
    if (!previewImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setModalImageIndex(prev => (prev > 0 ? prev - 1 : modalSnapshots.length - 1));
        setZoomScale(1);
        setPanPos({ x: 0, y: 0 });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setModalImageIndex(prev => (prev < modalSnapshots.length - 1 ? prev + 1 : 0));
        setZoomScale(1);
        setPanPos({ x: 0, y: 0 });
      } else if (e.key === "Escape") {
        e.preventDefault();
        setPreviewImage(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewImage, modalSnapshots.length]);

  // Mouse wheel zoom handler inside modal
  const handleModalWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomScale(prev => Math.min(prev + 0.25, 4));
    } else {
      setZoomScale(prev => {
        const next = Math.max(prev - 0.25, 1);
        if (next === 1) setPanPos({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Pan drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale > 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoomScale > 1) {
      setPanPos({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleManualCleanup = async () => {
    if (!confirm("⚠️ 7-DAY BACKUP WARNING:\nThis action will permanently delete screenshots older than 7 days from the server to free disk space.\n\nMake sure you have downloaded any 7-Day Backup ZIP archives you want to keep on your personal laptop!\n\nClick 'OK' to proceed with deletion, or 'Cancel' to save your backup first.")) {
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

if "%USER_ID%"=="" set /p USER_ID="Enter Employee Email or ID for this Workstation (e.g. ahmad@gmail.com): "

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

  const handleDownloadUserFolderZip = async (userToZip: UserInfo) => {
    toast.success(`Preparing screenshot ZIP archive for ${userToZip.name || userToZip.email}...`);
    try {
      let res = await fetch(`/api/telemetry/download-zip?userId=${userToZip.id}&dateStr=${selectedDate}`);
      if (!res.ok) {
        // Automatic fallback to all 7 days if selected date has no screenshots
        res = await fetch(`/api/telemetry/download-zip?userId=${userToZip.id}&all7days=true`);
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || "No screenshots found for this user.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanName = (userToZip.name || userToZip.email.split("@")[0]).replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `Screenshots_${cleanName}_Backup.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Screenshot ZIP archive downloaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to download ZIP archive.");
    }
  };

  const handleDownloadFull7DayZip = async (userToZip: UserInfo) => {
    toast.success(`Preparing full 7-day screenshot backup ZIP for ${userToZip.name || userToZip.email}...`);
    try {
      const res = await fetch(`/api/telemetry/download-zip?userId=${userToZip.id}&all7days=true`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || "No screenshots found for this user in the past 7 days.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanName = (userToZip.name || userToZip.email.split("@")[0]).replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `Screenshots_${cleanName}_FULL_7DAY_BACKUP.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("7-Day Backup ZIP downloaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to download 7-Day Backup ZIP.");
    }
  };

  const handleDownloadAllStaffZip = async () => {
    toast.success("Preparing consolidated 7-day ZIP backup for ALL staff members...");
    try {
      const res = await fetch("/api/telemetry/download-zip?allStaff7Days=true");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || "No staff screenshots found in the past 7 days.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `ALL_STAFF_7DAY_FULL_BACKUP_${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("All-Staff 7-Day Backup ZIP downloaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to download All-Staff ZIP archive.");
    }
  };

  const handleDownloadSingleImage = (imgUrl: string, fileNameStr: string) => {
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = fileNameStr;
    a.click();
  };

  const activeSnapshotsCount = snapshots.length;
  const idleCount = snapshots.filter(s => s.isIdle).length;
  const unresolvedTamperCount = tamperLogs.filter(t => !t.isResolved).length;

  const isAllFolderSelected = filteredSnapshots.length > 0 && filteredSnapshots.every(s => selectedSnapIds.includes(s.id));

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
              1-Minute Desktop Screen Audit & User Folders
            </h1>
            <p style={{ fontSize: "0.82rem", color: "#94A3B8", margin: "0.2rem 0 0 0" }}>
              Silent 1m desktop telemetry, live agent running status & auto 7-day retention
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
            title="Clean screenshots older than 7 days to free VPS disk space"
          >
            <Trash2 size={15} />
            <span>7-Day Storage Clean</span>
          </button>

          <button
            onClick={handleDownloadAllStaffZip}
            style={{
              padding: "0.55rem 1rem",
              fontSize: "0.8rem",
              fontWeight: 800,
              color: "#FFFFFF",
              background: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 4px 12px rgba(217, 119, 6, 0.3)"
            }}
            title="Download consolidated 7-Day backup ZIP for ALL staff members in 1 click"
          >
            <Package size={15} />
            <span>Download All-Staff 7-Day ZIP</span>
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
            Total 1m Shots Today
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
            <span>Ticking Every 60s</span>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation Bar (Only displayed when inside a user folder) */}
      {activeFolderUser && (
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
              onClick={() => handleSelectUserFolder(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                fontWeight: 800
              }}
            >
              <Folder size={18} />
              <span>All Staff User Folders</span>
            </button>

            <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
            <span style={{ color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <FolderOpen size={18} style={{ color: "#8B5CF6" }} />
              <span>{activeFolderUser.name || activeFolderUser.email}</span>
              <span className="badge active" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem", marginLeft: "0.2rem" }}>
                {activeFolderUser.employee?.employeeId || "N/A"}
              </span>
            </span>
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
          </div>
        </div>
      )}

      {/* VIEW MODE 1: ALL USER FOLDERS GRID */}
      {!activeFolderUser ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Instant Search Bar & Live Status Filter Pills */}
          <div style={{
            padding: "0.85rem 1.25rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            borderRadius: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem"
          }}>
            {/* Search Input */}
            <div style={{ position: "relative", minWidth: "240px", flex: 1 }}>
              <Search size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search staff member by name or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-gold"
                style={{ width: "100%", paddingLeft: "2.4rem", fontSize: "0.85rem", height: "38px" }}
              />
              {searchTerm && (
                <X
                  size={15}
                  onClick={() => setSearchTerm("")}
                  style={{ position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", cursor: "pointer" }}
                />
              )}
            </div>

            {/* Date Calendar Picker */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Calendar size={15} style={{ color: "var(--text-muted)" }} />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="input-gold"
                style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem", height: "38px" }}
              />
            </div>

            {/* Quick Filter Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#F1F5F9", padding: "0.25rem", borderRadius: "10px" }}>
              <button
                onClick={() => setStatusFilter("ALL")}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  background: statusFilter === "ALL" ? "#FFFFFF" : "transparent",
                  color: statusFilter === "ALL" ? "#1E293B" : "#64748B",
                  boxShadow: statusFilter === "ALL" ? "0 2px 6px rgba(0,0,0,0.06)" : "none"
                }}
              >
                All Staff ({staffList.length})
              </button>

              <button
                onClick={() => setStatusFilter("ONLINE")}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  background: statusFilter === "ONLINE" ? "#10B981" : "transparent",
                  color: statusFilter === "ONLINE" ? "#FFFFFF" : "#059669",
                  boxShadow: statusFilter === "ONLINE" ? "0 2px 6px rgba(16,185,129,0.3)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: statusFilter === "ONLINE" ? "#FFFFFF" : "#10B981" }} />
                <span>Working Now ({onlineCount})</span>
              </button>

              <button
                onClick={() => setStatusFilter("OFFLINE")}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  background: statusFilter === "OFFLINE" ? "#64748B" : "transparent",
                  color: statusFilter === "OFFLINE" ? "#FFFFFF" : "#64748B",
                  boxShadow: statusFilter === "OFFLINE" ? "0 2px 6px rgba(100,116,139,0.3)" : "none"
                }}
              >
                Offline ({staffList.length - onlineCount})
              </button>
            </div>
          </div>

          {filteredStaffList.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", background: "#FFFFFF", borderRadius: "12px", border: "1px dashed var(--border-dim)" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>No staff members match your filter</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Try clearing your search keyword or switching status filter to "All Staff".
              </p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1.25rem"
            }}>
              {filteredStaffList.map(u => {
            const userSnaps = snapshots.filter(s => s.userId === u.id);
            const latestSnap = userSnaps[0];
            const userIdleCount = userSnaps.filter(s => s.isIdle).length;
            const uStatus = statusMap[u.id];

            const isAgentActive = uStatus?.status === "ACTIVE" || uStatus?.status === "IDLE";

            return (
              <div
                key={u.id}
                style={{
                  background: "linear-gradient(145deg, #0F172A 0%, #1E1B4B 100%)",
                  border: isAgentActive ? "1.5px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "16px",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  boxShadow: isAgentActive ? "0 8px 24px rgba(16, 185, 129, 0.15)" : "0 8px 20px rgba(0, 0, 0, 0.3)",
                  color: "#FFFFFF",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  position: "relative"
                }}
              >
                {/* Header: User Avatar + Name & Employee ID */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: isAgentActive ? "linear-gradient(135deg, #10B981 0%, #059669 100%)" : "linear-gradient(135deg, #334155 0%, #1E293B 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#FFFFFF",
                      fontSize: "0.9rem",
                      fontWeight: 900,
                      boxShadow: isAgentActive ? "0 4px 12px rgba(16, 185, 129, 0.3)" : "none"
                    }}>
                      {(u.name || u.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#FFFFFF" }}>
                        {u.name || u.email.split("@")[0]}
                      </h3>
                      <div style={{ fontSize: "0.72rem", color: "#94A3B8", marginTop: "0.1rem" }}>
                        {u.email}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#A78BFA",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    padding: "0.2rem 0.55rem",
                    borderRadius: "6px",
                    border: "1px solid rgba(167, 139, 250, 0.2)"
                  }}>
                    {u.employee?.employeeId || "STAFF"}
                  </span>
                </div>

                {/* Live Running Status Pill */}
                <div style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: "8px",
                  background: isAgentActive ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  border: isAgentActive ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(239, 68, 68, 0.35)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: isAgentActive ? "#34D399" : "#F87171" }}>
                    {isAgentActive ? <Wifi size={14} className="animate-pulse" /> : <WifiOff size={14} />}
                    <span>{isAgentActive ? "Live Agent Running (60s)" : "Agent Offline on PC"}</span>
                  </div>

                  {isAgentActive && (
                    <span style={{ fontSize: "0.7rem", color: "#34D399", fontWeight: 800 }}>
                      Next SS: {countdownSec}s
                    </span>
                  )}
                </div>

                {/* Screen Preview Monitor Display */}
                <div 
                  onClick={() => handleSelectUserFolder(u)}
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "155px",
                    background: "#020617",
                    borderRadius: "10px",
                    overflow: "hidden",
                    cursor: "pointer",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    boxShadow: "inset 0 2px 6px rgba(0,0,0,0.5)"
                  }}
                >
                  {latestSnap && isAgentActive ? (
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
                      <Monitor size={32} style={{ opacity: 0.4, marginBottom: "0.4rem" }} />
                      <span style={{ fontWeight: 700, color: "#94A3B8" }}>
                        {isAgentActive ? "No Captures Today" : "Agent Offline"}
                      </span>
                    </div>
                  )}

                  <div style={{
                    position: "absolute",
                    bottom: "0.6rem",
                    right: "0.6rem",
                    background: "rgba(15, 23, 42, 0.9)",
                    backdropFilter: "blur(6px)",
                    color: "#FFFFFF",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    padding: "0.25rem 0.65rem",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.15)"
                  }}>
                    📁 Open Folder ({userSnaps.length})
                  </div>
                </div>

                {/* Folder Stats & Retention Quick Bar */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.76rem",
                  color: "#94A3B8",
                  padding: "0 0.2rem"
                }}>
                  <div>
                    Shots Today: <strong style={{ color: "#FFFFFF" }}>{userSnaps.length}</strong>
                  </div>
                  <div>
                    Idle: <strong style={{ color: userIdleCount > 0 ? "#F59E0B" : "#FFFFFF" }}>{userIdleCount}</strong>
                  </div>
                </div>

                {/* Actions Row */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => handleSelectUserFolder(u)}
                    style={{
                      flex: 1,
                      padding: "0.6rem",
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      color: "#FFFFFF",
                      background: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                      boxShadow: "0 4px 14px rgba(139, 92, 246, 0.3)"
                    }}
                  >
                    <FolderOpen size={15} />
                    <span>View User Folder</span>
                  </button>

                  <button
                    onClick={() => handleDownloadFull7DayZip(u)}
                    style={{
                      padding: "0.6rem 0.75rem",
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      color: "#FFFFFF",
                      background: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      boxShadow: "0 4px 12px rgba(217, 119, 6, 0.3)"
                    }}
                    title="Download 7-Day Screenshot Backup ZIP Archive"
                  >
                    <Download size={14} />
                    <span>7-Day ZIP</span>
                  </button>

                  {userSnaps.length > 0 && (
                    <button
                      onClick={() => handleBulkDelete(userSnaps.map(s => s.id))}
                      style={{
                        padding: "0.6rem 0.75rem",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        color: "#F87171",
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "10px",
                        cursor: "pointer"
                      }}
                      title="Delete all screenshots in this folder to free VPS space"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  ) : (
        /* VIEW MODE 2: USER FOLDER DETAIL (IMAGE GALLERY GRID / SLIDESHOW) */
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Orange 7-Day Backup Warning Banner inside User Folder */}
          <div style={{
            padding: "0.85rem 1.25rem",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
            border: "1px solid #F59E0B",
            color: "#78350F",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            boxShadow: "0 4px 12px rgba(245, 158, 11, 0.15)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <AlertTriangle size={20} style={{ color: "#D97706", flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: "0.88rem" }}>7-Day Auto Storage Retention Notice</strong>
                <div style={{ fontSize: "0.76rem", color: "#92400E", marginTop: "0.1rem" }}>
                  Screenshots older than 7 days are automatically cleaned daily from VPS storage. Save a 7-day backup ZIP directly to your personal PC to preserve permanent records!
                </div>
              </div>
            </div>
            {activeFolderUser && (
              <button
                onClick={() => handleDownloadFull7DayZip(activeFolderUser)}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: "#FFFFFF",
                  background: "#D97706",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  boxShadow: "0 2px 8px rgba(217, 119, 6, 0.3)",
                  whiteSpace: "nowrap"
                }}
                title="Download 7-Day Full Screenshot Backup ZIP Archive to PC"
              >
                <FileArchive size={15} />
                <span>Save 7-Day Backup ZIP</span>
              </button>
            )}
          </div>
          {/* Sub-toolbar with Bulk Selection & View Switcher */}
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
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button
                onClick={() => handleSelectUserFolder(null)}
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

              {/* Bulk Selection Controls Bar */}
              {filteredSnapshots.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", borderLeft: "1px solid #E2E8F0", paddingLeft: "1rem" }}>
                  <button
                    onClick={toggleSelectAllFolderSnaps}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-primary)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem"
                    }}
                  >
                    {isAllFolderSelected ? <CheckSquare size={16} style={{ color: "#8B5CF6" }} /> : <Square size={16} style={{ color: "#94A3B8" }} />}
                    <span>{isAllFolderSelected ? "Deselect All" : "Select All"}</span>
                  </button>

                  {selectedSnapIds.length > 0 && (
                    <button
                      onClick={() => handleBulkDelete()}
                      disabled={isPending}
                      style={{
                        padding: "0.35rem 0.85rem",
                        fontSize: "0.78rem",
                        fontWeight: 800,
                        color: "#FFFFFF",
                        background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)"
                      }}
                    >
                      <Trash2 size={14} />
                      <span>Delete Selected ({selectedSnapIds.length})</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Switcher Mode Tabs & Sort Order Toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                onClick={() => setSortOrder(prev => prev === "NEWEST" ? "OLDEST" : "NEWEST")}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  cursor: "pointer",
                  background: "#FFFFFF",
                  color: "#1E293B",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}
                title="Toggle Screenshot Sort Order"
              >
                <ArrowUpDown size={14} style={{ color: "#8B5CF6" }} />
                <span>{sortOrder === "NEWEST" ? "Fresh First ⬇️" : "Oldest First ⬆️"}</span>
              </button>

              <div style={{
                padding: "0.4rem 0.85rem",
                fontSize: "0.78rem",
                fontWeight: 800,
                borderRadius: "8px",
                background: "rgba(139, 92, 246, 0.12)",
                color: "#8B5CF6",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                <Grid size={14} />
                <span>Image Gallery Grid ({filteredSnapshots.length})</span>
              </div>
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
                No 1-minute screen telemetry captured for {activeFolderUser.name || activeFolderUser.email} on this date.
              </p>
            </div>
          ) : (
            /* THUMBNAIL GALLERY GRID MODE WITH DAY DIVIDER BANNERS */
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {groupedSnapshotsByDate.map(group => (
                <div key={group.dateLabel} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Sticky Day Divider Banner Header */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 1.25rem",
                    background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)",
                    color: "#FFFFFF",
                    borderRadius: "12px",
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.18)",
                    flexWrap: "wrap",
                    gap: "0.5rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <Calendar size={18} style={{ color: "#A78BFA" }} />
                      <span style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "-0.01em" }}>
                        {group.dateLabel}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{
                        background: "rgba(139, 92, 246, 0.2)",
                        border: "1px solid rgba(139, 92, 246, 0.4)",
                        color: "#C4B5FD",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 800
                      }}>
                        📸 {group.items.length} {group.items.length === 1 ? "Screenshot" : "Screenshots"}
                      </span>
                    </div>
                  </div>

                  {/* 4-Column Responsive Gallery Grid for this Day */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: "1.25rem"
                  }}>
                    {group.items.map(snap => {
                      const isSelected = selectedSnapIds.includes(snap.id);

                      return (
                        <div 
                          key={snap.id} 
                          className="glass-panel" 
                          style={{
                            background: "#FFFFFF",
                            border: isSelected ? "2px solid #8B5CF6" : "1px solid var(--border-dim)",
                            borderRadius: "12px",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            boxShadow: isSelected ? "0 4px 16px rgba(139, 92, 246, 0.25)" : "0 2px 8px rgba(0, 0, 0, 0.04)",
                            position: "relative"
                          }}
                        >
                          {/* Checkbox Overlay Top-Left */}
                          <div 
                            onClick={(e) => toggleSelectSnap(snap.id, e)}
                            style={{
                              position: "absolute",
                              top: "0.5rem",
                              left: "0.5rem",
                              zIndex: 10,
                              background: isSelected ? "#8B5CF6" : "rgba(15, 23, 42, 0.65)",
                              color: "#FFFFFF",
                              padding: "0.2rem",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
                            }}
                            title={isSelected ? "Deselect Screenshot" : "Select Screenshot for Deletion"}
                          >
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </div>

                          <div 
                            onClick={() => openLightboxModal(snap)}
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
                                right: "0.5rem",
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
                            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.38rem" }}>
                              <Clock size={13} style={{ color: "#8B5CF6" }} />
                              <span>
                                {new Date(snap.capturedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}, {new Date(snap.capturedAt).toLocaleTimeString("en-GB", { hour12: false })}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBulkDelete([snap.id]);
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#EF4444",
                                  cursor: "pointer",
                                  padding: "0.2rem"
                                }}
                                title="Delete Screenshot"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* State-of-the-Art Interactive Lightbox Preview Modal */}
      {previewImage && currentModalSnap && (
        <div 
          onWheel={handleModalWheel}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(12px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem 1.5rem 1.5rem 18rem",
            userSelect: "none"
          }}
        >
          <div style={{
            maxWidth: "1200px",
            width: "100%",
            background: "#0F172A",
            borderRadius: "20px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
            zIndex: 100000
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "1rem 1.5rem",
              background: "#1E293B",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#FFFFFF",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.01em" }}>
                  {currentModalSnap.user.name || currentModalSnap.user.email} — 40s Desktop Screenshot
                </h3>
                <div style={{ fontSize: "0.78rem", color: "#94A3B8", marginTop: "0.2rem", display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                  <span>Captured: <strong>{new Date(currentModalSnap.capturedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}, {new Date(currentModalSnap.capturedAt).toLocaleTimeString("en-GB", { hour12: false })}</strong></span>
                  <span>•</span>
                  <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981", padding: "0.15rem 0.55rem", borderRadius: "4px", fontWeight: 800, border: "1px solid rgba(16, 185, 129, 0.3)", fontSize: "0.72rem" }}>
                    💾 File Size: {currentModalSnap.fileSizeFormatted || "120 KB"}
                  </span>
                  <span>•</span>
                  <span style={{ color: "#A78BFA", fontWeight: 700 }}>{currentModalSnap.source}</span>
                </div>
              </div>

              {/* Lightbox Header Toolbar (Zoom & Actions) */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                {/* Zoom Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "rgba(255,255,255,0.08)", padding: "0.25rem 0.5rem", borderRadius: "8px" }}>
                  <button
                    onClick={() => setZoomScale(prev => Math.max(prev - 0.25, 1))}
                    style={{ background: "none", border: "none", color: "#FFFFFF", cursor: "pointer", padding: "0.2rem" }}
                    title="Zoom Out (-)"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, minWidth: "40px", textAlign: "center" }}>
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 4))}
                    style={{ background: "none", border: "none", color: "#FFFFFF", cursor: "pointer", padding: "0.2rem" }}
                    title="Zoom In (+)"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setZoomScale(1);
                      setPanPos({ x: 0, y: 0 });
                    }}
                    style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: "0.68rem", fontWeight: 700, marginLeft: "0.2rem" }}
                    title="Reset Zoom"
                  >
                    Reset
                  </button>
                </div>

                {/* Delete Screenshot Button */}
                <button
                  onClick={() => handleBulkDelete([currentModalSnap.id])}
                  style={{
                    padding: "0.45rem 0.85rem",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    background: "rgba(239, 68, 68, 0.85)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem"
                  }}
                  title="Delete Screenshot to free VPS disk space"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>

                {/* Download Image Button */}
                <button
                  onClick={() => handleDownloadSingleImage(currentModalSnap.imageUrl, `Screenshot_${currentModalSnap.user.email}_${new Date(currentModalSnap.capturedAt).getTime()}.png`)}
                  style={{
                    padding: "0.45rem 0.85rem",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem"
                  }}
                  title="Download Image"
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>

                {/* Close Modal Button */}
                <button
                  onClick={() => setPreviewImage(null)}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "none",
                    color: "#FFFFFF",
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    marginLeft: "0.4rem"
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Main Interactive Canvas Area with Nav Arrows */}
            <div 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                position: "relative",
                padding: "1rem",
                background: "#000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "68vh",
                overflow: "hidden",
                cursor: zoomScale > 1 ? (isPanning ? "grabbing" : "grab") : "default"
              }}
            >
              {/* Left Arrow Button */}
              <button
                onClick={() => {
                  setModalImageIndex(prev => (prev > 0 ? prev - 1 : modalSnapshots.length - 1));
                  setZoomScale(1);
                  setPanPos({ x: 0, y: 0 });
                }}
                style={{
                  position: "absolute",
                  left: "1.25rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 20,
                  background: "rgba(15, 23, 42, 0.75)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#FFFFFF",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                  transition: "transform 0.15s ease"
                }}
                title="Previous Image (Left Arrow)"
              >
                <ChevronLeft size={24} />
              </button>

              {/* Center Image Canvas */}
              <img
                src={currentModalSnap.imageUrl}
                alt="Desktop Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  transform: `scale(${zoomScale}) translate(${panPos.x / zoomScale}px, ${panPos.y / zoomScale}px)`,
                  transition: isPanning ? "none" : "transform 0.2s cubic-bezier(0.1, 0.7, 0.1, 1)"
                }}
              />

              {/* Right Arrow Button */}
              <button
                onClick={() => {
                  setModalImageIndex(prev => (prev < modalSnapshots.length - 1 ? prev + 1 : 0));
                  setZoomScale(1);
                  setPanPos({ x: 0, y: 0 });
                }}
                style={{
                  position: "absolute",
                  right: "1.25rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 20,
                  background: "rgba(15, 23, 42, 0.75)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#FFFFFF",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                  transition: "transform 0.15s ease"
                }}
                title="Next Image (Right Arrow)"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Bottom Footer Control & Counter Bar */}
            <div style={{
              padding: "0.85rem 1.5rem",
              background: "#1E293B",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#FFFFFF",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              {/* Keyboard Shortcuts Hint */}
              <div style={{ fontSize: "0.74rem", color: "#94A3B8" }}>
                Shortcuts: <kbd style={{ background: "rgba(255,255,255,0.15)", padding: "0.1rem 0.4rem", borderRadius: "4px", color: "#FFF" }}>←</kbd> Prev &nbsp;|&nbsp; <kbd style={{ background: "rgba(255,255,255,0.15)", padding: "0.1rem 0.4rem", borderRadius: "4px", color: "#FFF" }}>→</kbd> Next &nbsp;|&nbsp; <kbd style={{ background: "rgba(255,255,255,0.15)", padding: "0.1rem 0.4rem", borderRadius: "4px", color: "#FFF" }}>Esc</kbd> Close
              </div>

              {/* Bottom Center Image Counter Badge */}
              <div style={{
                background: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                padding: "0.35rem 1rem",
                borderRadius: "20px",
                fontSize: "0.82rem",
                fontWeight: 800,
                color: "#FFFFFF",
                boxShadow: "0 4px 12px rgba(139, 92, 246, 0.4)"
              }}>
                Image {modalImageIndex + 1} of {modalSnapshots.length}
              </div>

              {/* Time Stamp */}
              <div style={{ fontSize: "0.75rem", color: "#CBD5E1", fontWeight: 700 }}>
                {new Date(currentModalSnap.capturedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}, {new Date(currentModalSnap.capturedAt).toLocaleTimeString("en-GB", { hour12: false })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
