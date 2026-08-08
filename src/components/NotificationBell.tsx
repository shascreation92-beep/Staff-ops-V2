"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, Archive, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate12h } from "@/lib/date-formatter";
import { useAnnouncements } from "./AnnouncementProvider";

/**
 * Web Audio API synthesized Crystal Glass Chime sound tone
 */
export function playCrystalChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

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

    const now = ctx.currentTime;
    // Pleasant Glassy E6 & B6 Chime Sequence
    playNote(1318.51, now, 0.45, 0.25);          // E6
    playNote(2637.02, now, 0.45, 0.05);          // E7 harmonic
    playNote(1975.53, now + 0.08, 0.65, 0.35);   // B6
    playNote(3951.07, now + 0.08, 0.65, 0.06);   // B7 harmonic
  } catch (e) {
    console.error("Audio playback error:", e);
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
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

export default function NotificationBell() {
  const router = useRouter();
  const announcements = useAnnouncements();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
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

  const cleanMessage = (msg: string) => {
    return msg.replace(/^\[(?:NOTE|CHAT)_ID:[^\]]+\]\s*/, "");
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) {
      handleMarkAsRead(n.id);
    }

    const isTeamAnnouncement = n.type === "TEAM_ANNOUNCEMENT" || n.message.includes("[NOTE_ID:");
    const isItTicket = n.type === "IT Processing Ticket" || n.title.includes("IT Processing Ticket") || n.type === "IT_READ_ONLY";
    const isChatNotification = n.type === "CHAT_MENTION" || n.type === "CHAT_DIRECT" || n.message.includes("[CHAT_ID:");

    if (isTeamAnnouncement) {
      const match = n.message.match(/\[NOTE_ID:([^\]]+)\]/);
      const noteId = match ? match[1] : null;
      if (noteId) {
        if (window.location.pathname === "/personal-notes") {
          announcements.openAnnouncementById(noteId);
        } else {
          router.push(`/personal-notes?openNoteId=${noteId}`);
        }
      }
    } else if (isItTicket) {
      router.push("/accounts");
    } else if (isChatNotification) {
      const match = n.message.match(/\[CHAT_ID:([^\]]+)\]/);
      const chatId = match ? match[1] : null;
      if (chatId) {
        router.push(`/chat-space?contactId=${chatId}`);
      } else {
        router.push("/chat-space");
      }
    }
    setShowNotifications(false);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button 
        onClick={() => {
          setShowNotifications(!showNotifications);
          if (!showNotifications) fetchNotifications();
        }}
        style={{
          background: "rgba(255, 215, 0, 0.05)",
          border: "1px solid var(--border-gold)",
          color: "var(--gold-primary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "2.5rem",
          height: "2.5rem",
          borderRadius: "50%",
          transition: "all 0.2s ease",
          boxShadow: "0 0 10px rgba(255, 215, 0, 0.1)",
          position: "relative"
        }}
        title="System Alerts"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <div style={{
            position: "absolute",
            top: "2px",
            right: "2px",
            width: "8px",
            height: "8px",
            background: "var(--color-danger)",
            borderRadius: "50%",
            boxShadow: "0 0 6px var(--color-danger)"
          }}></div>
        )}
      </button>

      {showNotifications && (
        <div style={{
          position: "absolute",
          top: "120%",
          right: 0,
          width: "350px",
          zIndex: 999999,
          background: "#FFFFFF",
          border: "1px solid var(--border-dim)",
          boxShadow: "0 20px 45px rgba(0, 0, 0, 0.18)",
          borderRadius: "12px",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          backdropFilter: "none"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.80rem", fontWeight: 700, color: "var(--gold-primary)", fontFamily: "var(--font-mono)" }}>
              ALERTS ({unreadCount} UNREAD)
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={toggleSound}
                style={{
                  background: soundEnabled ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  border: soundEnabled ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "6px",
                  padding: "0.2rem 0.45rem",
                  color: soundEnabled ? "#10B981" : "#EF4444",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}
                title={soundEnabled ? "Notification sound enabled (Click to test/mute)" : "Notification sound muted (Click to enable)"}
              >
                {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                <span>{soundEnabled ? "Chime ON" : "Muted"}</span>
              </button>
              <button 
                onClick={fetchNotifications} 
                disabled={loadingNotifications}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                title="Refresh notifications"
              >
                <RefreshCw size={13} className={loadingNotifications ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div style={{ overflowY: "auto", maxHeight: "300px", display: "flex", flexDirection: "column", gap: "0.75rem", paddingRight: "0.25rem" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                No active system alerts.
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                    padding: "0.6rem",
                    borderRadius: "4px",
                    background: n.isRead ? "transparent" : "rgba(255, 215, 0, 0.02)",
                    borderLeft: n.isRead ? "1px solid transparent" : "2px solid var(--gold-primary)",
                    textAlign: "left",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>{n.title}</span>
                    {n.type !== "IT_READ_ONLY" && (
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        {!n.isRead && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(n.id);
                            }}
                            title="Mark as read"
                            style={{ background: "none", border: "none", color: "var(--color-success)", cursor: "pointer" }}
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchive(n.id);
                          }}
                          title="Archive"
                          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                        >
                          <Archive size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    {cleanMessage(n.message)}
                  </p>
                  <span
                    title={formatDate12h(n.createdAt, true)}
                    style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", cursor: "help" }}
                  >
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
