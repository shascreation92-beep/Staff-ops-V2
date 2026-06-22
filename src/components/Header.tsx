"use client";

import React, { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { usePathname } from "next/navigation";
import { 
  Bell, 
  Menu, 
  ChevronDown, 
  Terminal, 
  AlertCircle, 
  Check, 
  Archive,
  RefreshCw
} from "lucide-react";
import { user_role } from "@prisma/client";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface HeaderProps {
  user: {
    email?: string | null;
    role: user_role;
  };
  onToggleSidebar: () => void;
}

export default function Header({ user, onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();
  const [selectedEmail, setSelectedEmail] = useState(user.email || "");
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
    fetchNotifications();
    // Poll notifications every 30 seconds for live feel
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

  const handleImpersonation = async (email: string) => {
    setSelectedEmail(email);
    try {
      await signIn("developer-login", {
        email,
        callbackUrl: pathname,
        redirect: true,
      });
    } catch (err) {
      console.error("Impersonation failed:", err);
    }
  };

  const getPageTitle = () => {
    if (pathname === "/") return "Control Panel";
    if (pathname.startsWith("/accounts")) return "Accounts Database Shard";
    if (pathname.startsWith("/employees")) return "Asset Registry (Laptops/VPNs)";
    if (pathname.startsWith("/chat")) return "Direct Channels & Communications";
    if (pathname.startsWith("/settings")) return "Global Platform Rule Engine";
    if (pathname.startsWith("/audit-logs")) return "SOC2 System Audit Logs";
    return "StaffOps Console";
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="header-container" style={{ position: "relative" }}>
      {/* Sidebar Trigger for Mobile */}
      <button 
        onClick={onToggleSidebar} 
        className="header-btn" 
        style={{ marginRight: "1rem" }}
      >
        <Menu size={22} style={{ color: "var(--gold-primary)" }} />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <h1 className="text-gold-gradient" style={{
          fontSize: "1.15rem",
          fontWeight: 800,
          letterSpacing: "0.02em",
          textTransform: "uppercase"
        }}>
          {getPageTitle()}
        </h1>
      </div>

      <div className="header-actions">
        {/* Server status telemetry */}
        <div className="server-status-pill">
          <div className="status-dot-active"></div>
          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
            NODE_4: SYNCED
          </span>
        </div>

        {/* Developer Impersonation Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-gold)", borderRadius: "var(--border-radius-sm)", padding: "0.2rem 0.5rem" }}>
          <Terminal size={14} style={{ color: "var(--gold-primary)" }} />
          <select
            value={selectedEmail}
            onChange={(e) => handleImpersonation(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              outline: "none",
              cursor: "pointer"
            }}
          >
            <option value="admin@staffops.com" style={{ background: "#0a0a0a" }}>admin@staffops.com (SUPER_ADMIN)</option>
            <option value="owner@acme.com" style={{ background: "#0a0a0a" }}>owner@acme.com (COMPANY_OWNER)</option>
            <option value="lead@acme.com" style={{ background: "#0a0a0a" }}>lead@acme.com (TEAM_LEAD)</option>
            <option value="sales@acme.com" style={{ background: "#0a0a0a" }}>sales@acme.com (SALES_ASSOCIATE)</option>
            <option value="it@acme.com" style={{ background: "#0a0a0a" }}>it@acme.com (IT_DEPARTMENT)</option>
            <option value="owner@betacorp.com" style={{ background: "#0a0a0a" }}>owner@betacorp.com (PENDING OWNER)</option>
          </select>
        </div>

        {/* Notifications Panel */}
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <button 
            className="header-btn" 
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) fetchNotifications();
            }}
          >
            <Bell size={20} />
            {unreadCount > 0 && <div className="notification-badge"></div>}
          </button>

          {showNotifications && (
            <div className="glass-panel" style={{
              position: "absolute",
              top: "100%",
              right: 0,
              width: "360px",
              marginTop: "0.75rem",
              zIndex: 1000,
              background: "rgba(10, 10, 10, 0.98)",
              border: "1px solid var(--border-gold)",
              boxShadow: "var(--shadow-premium), var(--shadow-gold-glow)",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              maxHeight: "450px",
              overflowY: "auto"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--gold-primary)" }}>NOTIFICATIONS ({unreadCount} UNREAD)</span>
                <button 
                  onClick={fetchNotifications} 
                  disabled={loadingNotifications}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                >
                  <RefreshCw size={14} className={loadingNotifications ? "animate-spin" : ""} />
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
                        borderLeft: n.isRead ? "1px solid transparent" : "2px solid var(--gold-primary)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>{n.title}</span>
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
      </div>
    </header>
  );
}
