"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Archive, 
  Trash2, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Laptop, 
  MessageSquare, 
  Megaphone, 
  Calendar, 
  Shield, 
  Sparkles, 
  ArrowUpRight, 
  Clock,
  Inbox,
  ExternalLink
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate12h } from "@/lib/date-formatter";
import { useAnnouncements } from "./AnnouncementProvider";
import { sendDesktopNotification, requestNotificationPermission, isNotificationSupported } from "@/lib/push-notifications";

let globalAudioCtx: AudioContext | null = null;

function getGlobalAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === "suspended") {
    globalAudioCtx.resume().catch(() => null);
  }
  return globalAudioCtx;
}

if (typeof window !== "undefined") {
  const unlockAudio = () => {
    getGlobalAudioContext();
  };
  window.addEventListener("click", unlockAudio);
  window.addEventListener("keydown", unlockAudio);
  window.addEventListener("touchstart", unlockAudio);
}

/**
 * Web Audio API synthesized Crystal Glass Chime sound tone
 */
export function playCrystalChime() {
  try {
    const ctx = getGlobalAudioContext();
    if (!ctx) return;

    const playNotes = () => {
      const now = ctx.currentTime;

      const playNote = (freq: number, startTime: number, duration: number, gainVal: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      // Pleasant Glassy E6 & B6 Chime Sequence
      playNote(1318.51, now, 0.45, 0.35);          // E6
      playNote(2637.02, now, 0.45, 0.08);          // E7 harmonic
      playNote(1975.53, now + 0.08, 0.65, 0.45);   // B6
      playNote(3951.07, now + 0.08, 0.65, 0.10);   // B7 harmonic
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(() => playNotes()).catch(() => null);
    } else {
      playNotes();
    }
  } catch (e) {
    console.error("Audio playback error:", e);
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

type TabCategory = "ALL" | "UNREAD" | "IT_OPS" | "COMMS";

function getNotificationMeta(n: Notification) {
  const titleLower = (n.title || "").toLowerCase();
  const typeLower = (n.type || "").toLowerCase();
  const msgLower = (n.message || "").toLowerCase();

  if (
    typeLower.includes("it") ||
    typeLower.includes("account") ||
    titleLower.includes("it processing") ||
    titleLower.includes("account") ||
    msgLower.includes("it queue") ||
    msgLower.includes("approved and forwarded")
  ) {
    return {
      category: "IT_OPS" as const,
      label: "IT Routing",
      icon: Laptop,
      color: "#38BDF8", // Cyan
      bg: "rgba(56, 189, 248, 0.12)",
      border: "rgba(56, 189, 248, 0.3)",
      actionLabel: "View Queue",
    };
  }

  if (
    typeLower.includes("chat") ||
    msgLower.includes("[chat_id:") ||
    titleLower.includes("chat") ||
    titleLower.includes("message")
  ) {
    return {
      category: "COMMS" as const,
      label: "Chat DM",
      icon: MessageSquare,
      color: "#C084FC", // Purple
      bg: "rgba(192, 132, 252, 0.12)",
      border: "rgba(192, 132, 252, 0.3)",
      actionLabel: "Open Chat",
    };
  }

  if (
    typeLower.includes("announcement") ||
    typeLower.includes("note") ||
    msgLower.includes("[note_id:") ||
    titleLower.includes("note") ||
    titleLower.includes("broadcast")
  ) {
    return {
      category: "COMMS" as const,
      label: "Team Note",
      icon: Megaphone,
      color: "#FBBF24", // Amber
      bg: "rgba(251, 191, 36, 0.12)",
      border: "rgba(251, 191, 36, 0.3)",
      actionLabel: "Read Note",
    };
  }

  if (
    typeLower.includes("leave") ||
    titleLower.includes("leave")
  ) {
    return {
      category: "IT_OPS" as const,
      label: "Leave Approval",
      icon: Calendar,
      color: "#F472B6", // Rose
      bg: "rgba(244, 114, 182, 0.12)",
      border: "rgba(244, 114, 182, 0.3)",
      actionLabel: "Review Leave",
    };
  }

  if (
    typeLower.includes("special_request") ||
    titleLower.includes("special request") ||
    titleLower.includes("associate request")
  ) {
    return {
      category: "IT_OPS" as const,
      label: "Special Request",
      icon: Sparkles,
      color: "#2DD4BF", // Teal
      bg: "rgba(45, 212, 191, 0.12)",
      border: "rgba(45, 212, 191, 0.3)",
      actionLabel: "View Request",
    };
  }

  return {
    category: "OTHER" as const,
    label: "System Alert",
    icon: Shield,
    color: "#34D399", // Emerald
    bg: "rgba(52, 211, 153, 0.12)",
    border: "rgba(52, 211, 153, 0.3)",
    actionLabel: "View Details",
  };
}

export default function NotificationBell() {
  const router = useRouter();
  const announcements = useAnnouncements();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<TabCategory>("ALL");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const prevUnreadCountRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("worknode_notification_sound");
    if (saved !== null) {
      setSoundEnabled(saved === "true");
    }
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("worknode_notification_sound", String(next));
    if (next) {
      playCrystalChime();
    }
  };

  // Close notifications dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data: Notification[] = await res.json();
        const unreadCount = data.filter(n => !n.isRead).length;

        // Play chime tone if new unread notification arrived
        if (prevUnreadCountRef.current !== null && unreadCount > prevUnreadCountRef.current) {
          if (soundEnabled) {
            playCrystalChime();
          }
          // Trigger Native Desktop Notification
          const latest = data.find(n => !n.isRead) || data[0];
          if (latest) {
            sendDesktopNotification({
              title: latest.title || "StaffOps Alert",
              body: latest.message ? latest.message.replace(/^\[(?:NOTE|CHAT)_ID:[^\]]+\]\s*/, "") : "New system alert received",
              url: latest.type === "CHAT_DIRECT" ? "/chat-space" : "/accounts",
              playSound: false // Sound already played above
            });
          }
        }
        prevUnreadCountRef.current = unreadCount;
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    const handlePoll = () => {
      if (document.hidden) return;
      fetchNotifications();
    };
    handlePoll();

    // Fast live polling every 3 seconds when tab is active
    const interval = setInterval(handlePoll, 3000);

    // Listen for instant notification update events across the app
    window.addEventListener("notification-updated", handlePoll);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notification-updated", handlePoll);
    };
  }, [soundEnabled]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowNotifications(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (bulkActionLoading) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/archive`, { method: "POST" });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveAllRead = async () => {
    if (bulkActionLoading) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/notifications/archive-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlyRead: true })
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => !n.isRead));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const cleanMessage = (msg: string) => {
    return msg.replace(/^\[(?:NOTE|CHAT)_ID:[^\]]+\]\s*/, "");
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) {
      handleMarkAsRead(n.id);
    }

    const titleLower = (n.title || "").toLowerCase();
    const typeLower = (n.type || "").toLowerCase();
    const msgLower = (n.message || "").toLowerCase();

    const isTeamAnnouncement = typeLower.includes("announcement") || msgLower.includes("[note_id:");
    const isItTicket = typeLower.includes("it") || titleLower.includes("it processing") || typeLower === "it_read_only";
    const isChatNotification = typeLower.includes("chat") || msgLower.includes("[chat_id:");
    const isLeave = typeLower.includes("leave") || titleLower.includes("leave");
    const isSpecialReq = typeLower.includes("special_request") || titleLower.includes("special request");

    if (isTeamAnnouncement) {
      const match = n.message.match(/\[NOTE_ID:([^\]]+)\]/);
      const noteId = match ? match[1] : null;
      if (noteId) {
        if (window.location.pathname === "/personal-notes") {
          announcements.openAnnouncementById(noteId);
        } else {
          router.push(`/personal-notes?openNoteId=${noteId}`);
        }
      } else {
        router.push("/personal-notes");
      }
    } else if (isChatNotification) {
      const match = n.message.match(/\[CHAT_ID:([^\]]+)\]/);
      const chatId = match ? match[1] : null;
      if (chatId) {
        router.push(`/chat-space?contactId=${chatId}`);
      } else {
        router.push("/chat-space");
      }
    } else if (isLeave) {
      router.push("/leave-requests");
    } else if (isSpecialReq) {
      router.push("/special-requests");
    } else if (isItTicket) {
      router.push("/accounts");
    } else {
      router.push("/accounts");
    }
    setShowNotifications(false);
  };

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);
  const readCount = useMemo(() => notifications.filter(n => n.isRead).length, [notifications]);

  const itOpsCount = useMemo(() => {
    return notifications.filter(n => getNotificationMeta(n).category === "IT_OPS").length;
  }, [notifications]);

  const commsCount = useMemo(() => {
    return notifications.filter(n => getNotificationMeta(n).category === "COMMS").length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === "UNREAD") return notifications.filter(n => !n.isRead);
    if (activeTab === "IT_OPS") return notifications.filter(n => getNotificationMeta(n).category === "IT_OPS");
    if (activeTab === "COMMS") return notifications.filter(n => getNotificationMeta(n).category === "COMMS");
    return notifications;
  }, [notifications, activeTab]);

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <style>{`
        .cyber-notification-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .cyber-notification-scroll::-webkit-scrollbar-track {
          background: rgba(11, 9, 22, 0.4);
          border-radius: 4px;
        }
        .cyber-notification-scroll::-webkit-scrollbar-thumb {
          background: rgba(56, 189, 248, 0.25);
          border-radius: 4px;
        }
        .cyber-notification-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(56, 189, 248, 0.5);
        }
        @keyframes notifPopIn {
          0% {
            opacity: 0;
            transform: scale(0.96) translateY(-8px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
          }
          50% {
            box-shadow: 0 0 20px rgba(56, 189, 248, 0.7);
          }
        }
      `}</style>

      {/* Bell Trigger Button */}
      <button 
        onClick={() => {
          setShowNotifications(!showNotifications);
          if (!showNotifications) fetchNotifications();
        }}
        style={{
          background: showNotifications 
            ? "rgba(56, 189, 248, 0.15)" 
            : "rgba(56, 189, 248, 0.06)",
          border: showNotifications 
            ? "1px solid rgba(56, 189, 248, 0.45)" 
            : "1px solid rgba(56, 189, 248, 0.2)",
          color: "#38BDF8",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "2.6rem",
          height: "2.6rem",
          borderRadius: "50%",
          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: showNotifications 
            ? "0 0 15px rgba(56, 189, 248, 0.35)" 
            : "0 0 10px rgba(56, 189, 248, 0.1)",
          position: "relative"
        }}
        title="System Alerts & Notifications"
      >
        <Bell size={18} className={unreadCount > 0 ? "animate-pulse" : ""} />
        {unreadCount > 0 && (
          <div style={{
            position: "absolute",
            top: "-2px",
            right: "-2px",
            minWidth: "18px",
            height: "18px",
            padding: "0 4px",
            background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
            color: "#FFFFFF",
            borderRadius: "10px",
            fontSize: "0.65rem",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 10px rgba(239, 68, 68, 0.6)",
            border: "1.5px solid #0B0916",
            fontFamily: "var(--font-mono)"
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </button>

      {/* Cyber Dark Glassmorphism Dropdown */}
      {showNotifications && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 12px)",
          right: 0,
          width: "410px",
          maxWidth: "calc(100vw - 2rem)",
          zIndex: 999999,
          background: "linear-gradient(180deg, rgba(16, 13, 31, 0.97) 0%, rgba(9, 7, 19, 0.98) 100%)",
          border: "1px solid rgba(56, 189, 248, 0.22)",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.75), 0 0 30px rgba(56, 189, 248, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          backdropFilter: "blur(24px) saturate(190%)",
          animation: "notifPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          {/* Header Row */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)", 
            paddingBottom: "0.65rem" 
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: "rgba(56, 189, 248, 0.12)",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#38BDF8"
              }}>
                <Bell size={13} />
              </div>
              <span style={{ 
                fontSize: "0.82rem", 
                fontWeight: 800, 
                color: "#FFFFFF", 
                letterSpacing: "0.03em",
                fontFamily: "var(--font-mono)",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                SYSTEM ALERTS
                {unreadCount > 0 && (
                  <span style={{
                    fontSize: "0.68rem",
                    padding: "0.15rem 0.4rem",
                    background: "rgba(56, 189, 248, 0.15)",
                    border: "1px solid rgba(56, 189, 248, 0.35)",
                    color: "#38BDF8",
                    borderRadius: "12px",
                    fontWeight: 700
                  }}>
                    {unreadCount} NEW
                  </span>
                )}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                style={{
                  background: soundEnabled ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                  border: soundEnabled ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(239, 68, 68, 0.35)",
                  borderRadius: "7px",
                  padding: "0.22rem 0.5rem",
                  color: soundEnabled ? "#34D399" : "#F87171",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  transition: "all 0.2s ease"
                }}
                title={soundEnabled ? "Chime sound enabled (Click to mute)" : "Chime sound muted (Click to enable)"}
              >
                {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                <span>{soundEnabled ? "Chime ON" : "Muted"}</span>
              </button>

              {/* Refresh Button */}
              <button 
                onClick={fetchNotifications} 
                disabled={loadingNotifications}
                style={{ 
                  background: "rgba(255, 255, 255, 0.05)", 
                  border: "1px solid rgba(255, 255, 255, 0.1)", 
                  color: "var(--text-secondary)", 
                  cursor: "pointer",
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease"
                }}
                title="Refresh notifications"
              >
                <RefreshCw size={12} className={loadingNotifications ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Bulk Controls & Filter Tabs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {/* Filter Tabs */}
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.3rem",
              background: "rgba(0, 0, 0, 0.25)",
              padding: "0.25rem",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.05)"
            }}>
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                style={{
                  flex: 1,
                  padding: "0.25rem 0.4rem",
                  fontSize: "0.7rem",
                  fontWeight: activeTab === "ALL" ? 700 : 500,
                  background: activeTab === "ALL" ? "rgba(56, 189, 248, 0.18)" : "transparent",
                  color: activeTab === "ALL" ? "#38BDF8" : "var(--text-muted)",
                  border: activeTab === "ALL" ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid transparent",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                All ({notifications.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("UNREAD")}
                style={{
                  flex: 1,
                  padding: "0.25rem 0.4rem",
                  fontSize: "0.7rem",
                  fontWeight: activeTab === "UNREAD" ? 700 : 500,
                  background: activeTab === "UNREAD" ? "rgba(56, 189, 248, 0.18)" : "transparent",
                  color: activeTab === "UNREAD" ? "#38BDF8" : "var(--text-muted)",
                  border: activeTab === "UNREAD" ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid transparent",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                Unread ({unreadCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("IT_OPS")}
                style={{
                  flex: 1,
                  padding: "0.25rem 0.4rem",
                  fontSize: "0.7rem",
                  fontWeight: activeTab === "IT_OPS" ? 700 : 500,
                  background: activeTab === "IT_OPS" ? "rgba(56, 189, 248, 0.18)" : "transparent",
                  color: activeTab === "IT_OPS" ? "#38BDF8" : "var(--text-muted)",
                  border: activeTab === "IT_OPS" ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid transparent",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                IT & Ops ({itOpsCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("COMMS")}
                style={{
                  flex: 1,
                  padding: "0.25rem 0.4rem",
                  fontSize: "0.7rem",
                  fontWeight: activeTab === "COMMS" ? 700 : 500,
                  background: activeTab === "COMMS" ? "rgba(56, 189, 248, 0.18)" : "transparent",
                  color: activeTab === "COMMS" ? "#38BDF8" : "var(--text-muted)",
                  border: activeTab === "COMMS" ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid transparent",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                Comms ({commsCount})
              </button>
            </div>

            {/* Quick Bulk Action Buttons */}
            {(unreadCount > 0 || readCount > 0) && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 0.1rem" }}>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    disabled={bulkActionLoading}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#38BDF8",
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.15rem 0.3rem",
                      borderRadius: "4px",
                      opacity: bulkActionLoading ? 0.6 : 1
                    }}
                  >
                    <CheckCheck size={13} />
                    <span>Mark all read</span>
                  </button>
                ) : <div />}

                {readCount > 0 && (
                  <button
                    type="button"
                    onClick={handleArchiveAllRead}
                    disabled={bulkActionLoading}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      fontSize: "0.68rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.15rem 0.3rem",
                      borderRadius: "4px",
                      opacity: bulkActionLoading ? 0.6 : 1
                    }}
                  >
                    <Trash2 size={12} />
                    <span>Clear read</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Notifications Scrollable Stream */}
          <div 
            className="cyber-notification-scroll"
            style={{ 
              overflowY: "auto", 
              maxHeight: "360px", 
              display: "flex", 
              flexDirection: "column", 
              gap: "0.55rem", 
              paddingRight: "0.2rem" 
            }}
          >
            {filteredNotifications.length === 0 ? (
              <div style={{ 
                padding: "2.5rem 1rem", 
                textAlign: "center", 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                gap: "0.6rem",
                color: "var(--text-muted)" 
              }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "rgba(56, 189, 248, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#38BDF8"
                }}>
                  <Inbox size={20} />
                </div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  All caught up!
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", maxWidth: "220px", lineHeight: "1.3" }}>
                  {activeTab === "UNREAD" 
                    ? "You have zero unread notifications."
                    : activeTab === "IT_OPS" 
                    ? "No pending IT routing or queue alerts." 
                    : activeTab === "COMMS" 
                    ? "No new chat mentions or team notes." 
                    : "No system alerts in your log right now."}
                </div>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const meta = getNotificationMeta(n);
                const IconComponent = meta.icon;

                return (
                  <div 
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                      padding: "0.75rem",
                      borderRadius: "10px",
                      background: n.isRead 
                        ? "rgba(255, 255, 255, 0.02)" 
                        : "rgba(56, 189, 248, 0.06)",
                      border: n.isRead 
                        ? "1px solid rgba(255, 255, 255, 0.05)" 
                        : "1px solid rgba(56, 189, 248, 0.22)",
                      borderLeft: n.isRead 
                        ? "3px solid transparent" 
                        : `3px solid ${meta.color}`,
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      position: "relative"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = n.isRead 
                        ? "rgba(255, 255, 255, 0.05)" 
                        : "rgba(56, 189, 248, 0.1)";
                      e.currentTarget.style.borderColor = n.isRead 
                        ? "rgba(255, 255, 255, 0.12)" 
                        : "rgba(56, 189, 248, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = n.isRead 
                        ? "rgba(255, 255, 255, 0.02)" 
                        : "rgba(56, 189, 248, 0.06)";
                      e.currentTarget.style.borderColor = n.isRead 
                        ? "rgba(255, 255, 255, 0.05)" 
                        : "rgba(56, 189, 248, 0.22)";
                    }}
                  >
                    {/* Top Meta Line: Category Badge + Timestamp + Action Icons */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "6px",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          background: meta.bg,
                          border: `1px solid ${meta.border}`,
                          color: meta.color,
                          fontFamily: "var(--font-mono)"
                        }}>
                          <IconComponent size={11} />
                          {meta.label}
                        </span>

                        <span
                          title={formatDate12h(n.createdAt, true)}
                          style={{ 
                            fontSize: "0.65rem", 
                            color: "var(--text-muted)", 
                            fontFamily: "var(--font-mono)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.2rem"
                          }}
                        >
                          <Clock size={10} />
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>

                      {/* Quick Item Actions */}
                      {n.type !== "IT_READ_ONLY" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          {!n.isRead && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(n.id);
                              }}
                              title="Mark as read"
                              style={{ 
                                background: "rgba(16, 185, 129, 0.12)", 
                                border: "1px solid rgba(16, 185, 129, 0.3)", 
                                color: "#34D399", 
                                cursor: "pointer",
                                width: "20px",
                                height: "20px",
                                borderRadius: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.15s ease"
                              }}
                            >
                              <Check size={11} />
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(n.id);
                            }}
                            title="Archive"
                            style={{ 
                              background: "rgba(255, 255, 255, 0.04)", 
                              border: "1px solid rgba(255, 255, 255, 0.08)", 
                              color: "var(--text-muted)", 
                              cursor: "pointer",
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <Archive size={11} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <div style={{ 
                      fontSize: "0.8rem", 
                      fontWeight: n.isRead ? 600 : 700, 
                      color: n.isRead ? "var(--text-secondary)" : "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}>
                      <span>{n.title}</span>
                    </div>

                    {/* Message Body */}
                    <p style={{ 
                      fontSize: "0.74rem", 
                      color: n.isRead ? "var(--text-muted)" : "var(--text-secondary)", 
                      lineHeight: "1.4",
                      margin: 0
                    }}>
                      {cleanMessage(n.message)}
                    </p>

                    {/* Quick Jump indicator */}
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "flex-end", 
                      alignItems: "center",
                      marginTop: "0.1rem"
                    }}>
                      <span style={{ 
                        fontSize: "0.68rem", 
                        color: meta.color, 
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.2rem",
                        opacity: 0.9
                      }}>
                        {meta.actionLabel}
                        <ArrowUpRight size={11} />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: "0.55rem",
            fontSize: "0.68rem",
            color: "var(--text-muted)"
          }}>
            <span>Showing {filteredNotifications.length} of {notifications.length} alerts</span>
            {isNotificationSupported() && (
              <button
                type="button"
                onClick={async () => {
                  await requestNotificationPermission();
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#38BDF8",
                  cursor: "pointer",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}
              >
                <span>Desktop Push</span>
                <ExternalLink size={10} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
