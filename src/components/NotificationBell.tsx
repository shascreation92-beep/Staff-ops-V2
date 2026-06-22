"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, Archive, RefreshCw } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchNotifications());
    // Poll notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
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
        <div className="glass-panel" style={{
          position: "absolute",
          top: "120%",
          right: 0,
          width: "340px",
          zIndex: 1000,
          background: "rgba(10, 10, 10, 0.98)",
          border: "1px solid var(--border-gold)",
          boxShadow: "var(--shadow-premium), var(--shadow-gold-glow)",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxHeight: "400px",
          overflowY: "auto"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.80rem", fontWeight: 700, color: "var(--gold-primary)", fontFamily: "var(--font-mono)" }}>
              ALERTS ({unreadCount} UNREAD)
            </span>
            <button 
              onClick={fetchNotifications} 
              disabled={loadingNotifications}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              <RefreshCw size={13} className={loadingNotifications ? "animate-spin" : ""} />
            </button>
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
              No active system alerts.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                    padding: "0.6rem",
                    borderRadius: "4px",
                    background: n.isRead ? "transparent" : "rgba(255, 215, 0, 0.02)",
                    borderLeft: n.isRead ? "1px solid transparent" : "2px solid var(--gold-primary)",
                    textAlign: "left"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>{n.title}</span>
                    {n.type !== "IT_READ_ONLY" && (
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        {!n.isRead && (
                          <button 
                            onClick={() => handleMarkAsRead(n.id)}
                            title="Mark as read"
                            style={{ background: "none", border: "none", color: "var(--color-success)", cursor: "pointer" }}
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleArchive(n.id)}
                          title="Archive"
                          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                        >
                          <Archive size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>{n.message}</p>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {new Date(n.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
