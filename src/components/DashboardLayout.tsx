"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { user_role } from "@prisma/client";
import { Shield, Check, X, Loader2, Megaphone } from "lucide-react";
import { useAnnouncements } from "./AnnouncementProvider";
import CommandPalette from "./CommandPalette";
import { 
  getUpgradeInvitationAction, 
  acceptUpgradeAction, 
  declineInvitationAction 
} from "@/app/actions/users";
import { webHeartbeatAction } from "@/app/actions/telemetry";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: user_role;
    companyName?: string | null;
    teamLeadName?: string | null;
    image?: string | null;
    bio?: string | null;
  };
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const pathname = usePathname();
  const hideHeader = pathname === "/" || pathname === "/accounts";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [invitation, setInvitation] = useState<{ id: string; title: string; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Read Announcements context
  const { activeStripAnn, dismissStrip, openGlobalAnnDetails } = useAnnouncements();

  // Automatic ChunkLoadError recovery after deployment updates
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const errorMsg = (event as any)?.message || (event as any)?.reason?.message || "";
      if (
        errorMsg.includes("Failed to load chunk") ||
        errorMsg.includes("Loading chunk") ||
        errorMsg.includes("ChunkLoadError")
      ) {
        console.warn("[DashboardLayout] ChunkLoadError detected due to deployment build update. Refreshing client bundles...");
        const lastReload = sessionStorage.getItem("chunk_reload_ts");
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem("chunk_reload_ts", now.toString());
          window.location.reload();
        }
      }
    };

    window.addEventListener("error", handleChunkError as any);
    window.addEventListener("unhandledrejection", handleChunkError as any);
    return () => {
      window.removeEventListener("error", handleChunkError as any);
      window.removeEventListener("unhandledrejection", handleChunkError as any);
    };
  }, []);

  // Web Browser presence heartbeat (pings every 30 seconds)
  useEffect(() => {
    webHeartbeatAction().catch(() => {});
    const interval = setInterval(() => {
      webHeartbeatAction().catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user.role === "SALES_ASSOCIATE") {
      getUpgradeInvitationAction().then((res) => {
        if (res.invitation) {
          setInvitation(res.invitation);
        }
      }).catch(err => console.error("Failed to check upgrade invitations", err));
    }
  }, [user.role]);

  const handleAcceptUpgrade = async () => {
    if (!invitation) return;
    setActionLoading(true);
    try {
      const res = await acceptUpgradeAction(invitation.id);
      if (res.success) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to accept upgrade", error);
      setActionLoading(false);
    }
  };

  const handleDeclineUpgrade = async () => {
    if (!invitation) return;
    setActionLoading(true);
    try {
      const res = await declineInvitationAction(invitation.id, false);
      if (res.success) {
        setInvitation(null);
      }
    } catch (error) {
      console.error("Failed to decline upgrade", error);
    } finally {
      setActionLoading(false);
    }
  };

  const parseAnnTitle = (rawTitle: string) => {
    try {
      const parsed = JSON.parse(rawTitle);
      if (parsed && typeof parsed === 'object' && 'sender' in parsed) {
        return parsed as { sender: "COMPANY_HQ" | "IT_DEPARTMENT"; type: "COMPANY_UPDATE" | "URGENT_ALERT" | "SALES_CELEBRATION"; text: string };
      }
    } catch (e) {}
    return { sender: "COMPANY_HQ" as const, type: "COMPANY_UPDATE" as const, text: rawTitle };
  };

  return (
    <div className="app-container" style={{ display: "flex", flexDirection: "column" }}>
      {/* CSS marquee and glowing capsule style definitions */}
      <style>{`
        @keyframes marquee-rtl {
          0% { transform: translate3d(100%, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
        .marquee-container {
          overflow: hidden;
          white-space: nowrap;
          width: 100%;
          position: relative;
          height: 100%;
          display: flex;
          align-items: center;
        }
        .marquee-text-scroll {
          display: inline-block;
          white-space: nowrap;
          animation: marquee-rtl 22s linear infinite;
        }
        .marquee-text-scroll:hover {
          animation-play-state: paused;
          cursor: pointer;
        }
        @keyframes border-glow-pulse {
          0% { box-shadow: 0 0 4px rgba(2, 80, 161, 0.15), 0 0 0 1px rgba(2, 80, 161, 0.1); }
          50% { box-shadow: 0 0 12px rgba(2, 80, 161, 0.35), 0 0 0 1.5px rgba(2, 80, 161, 0.25); }
          100% { box-shadow: 0 0 4px rgba(2, 80, 161, 0.15), 0 0 0 1px rgba(2, 80, 161, 0.1); }
        }
        .capsule-pulse-glow {
          animation: border-glow-pulse 3.5s infinite ease-in-out;
        }
      `}</style>

      {invitation && (
        <div style={{
          width: "100%",
          background: "linear-gradient(90deg, rgba(212, 175, 55, 0.15) 0%, rgba(20, 20, 20, 0.95) 100%)",
          borderBottom: "1px solid rgba(212, 175, 55, 0.3)",
          padding: "0.75rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backdropFilter: "blur(8px)",
          zIndex: 100,
          gap: "1rem",
          flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "50%",
              background: "rgba(212, 175, 55, 0.1)",
              border: "1px solid rgba(212, 175, 55, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--gold-primary)",
              boxShadow: "0 0 10px rgba(212, 175, 55, 0.1)"
            }}>
              <Shield size={14} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {invitation.title}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {invitation.message}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={handleAcceptUpgrade}
              disabled={actionLoading}
              className="btn-gold"
              style={{
                padding: "0.4rem 1rem",
                fontSize: "0.75rem",
                height: "30px",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem"
              }}
            >
              {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              <span>Accept Upgrade</span>
            </button>
            <button
              onClick={handleDeclineUpgrade}
              disabled={actionLoading}
              className="btn-glass"
              style={{
                padding: "0.4rem 0.75rem",
                fontSize: "0.75rem",
                height: "30px",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                border: "1px solid rgba(255, 255, 255, 0.15)"
              }}
            >
              <X size={12} />
              <span>Decline</span>
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar navigation */}
        <Sidebar 
          user={user} 
          isOpen={sidebarOpen} 
          setIsOpen={setSidebarOpen} 
        />

        {/* Mobile Sidebar overlay */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 90,
              backdropFilter: "blur(4px)"
            }}
          />
        )}

        {/* Main Viewport */}
        <main className="main-content" style={{ position: "relative", overflow: "hidden" }}>
          {/* Animated Background Blobs */}
          <div className="bg-blobs-container">
            <div className="bg-blob blob-1"></div>
            <div className="bg-blob blob-2"></div>
            <div className="bg-blob blob-3"></div>
          </div>

          {/* Mobile menu trigger */}
          <button 
            onClick={() => setSidebarOpen(true)}
            className="mobile-sidebar-toggle"
            style={{
              position: "fixed",
              bottom: "1.5rem",
              right: "1.5rem",
              width: "3.5rem",
              height: "3.5rem",
              borderRadius: "50%",
              background: "var(--gold-primary)",
              color: "white",
              border: "none",
              boxShadow: "0 4px 14px rgba(0, 119, 182, 0.4)",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 80,
              cursor: "pointer"
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 10 }}>
            {/* Centered Eye-Catching Animated Announcement Bar */}
            {activeStripAnn && (() => {
              const parsed = parseAnnTitle(activeStripAnn.title);
              const labelText = parsed.sender === "IT_DEPARTMENT" ? "Company / IT Dept" : "Company";

              return (
                <div 
                  className="capsule-pulse-glow"
                  style={{
                    width: "100%",
                    maxWidth: "896px", // max-w-4xl is 56rem (896px)
                    margin: "1rem auto 0 auto",
                    background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "9999px",
                    height: "38px",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 1.25rem",
                    zIndex: 50,
                    overflow: "hidden",
                    position: "relative"
                  }}
                >
                  {/* Fixed left badges (scrolling text slides out from underneath) */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", zIndex: 10, background: "transparent", paddingRight: "0.85rem", height: "100%", flexShrink: 0 }}>
                    <span style={{ fontSize: "0.72rem", color: "#38BDF8", fontWeight: 800, whiteSpace: "nowrap" }}>
                      {labelText}
                    </span>
                  </div>

                  {/* Right-to-Left Animated Text Area */}
                  <div className="marquee-container" onClick={() => openGlobalAnnDetails(activeStripAnn)}>
                    <div className="marquee-text-scroll" style={{ paddingLeft: "10%" }}>
                      <span style={{ fontWeight: 700, color: "#FFFFFF", fontSize: "0.78rem" }}>
                        {parsed.text}:
                      </span>
                      <span style={{ marginLeft: "0.25rem", color: "#94A3B8", fontSize: "0.78rem" }}>
                        {activeStripAnn.content}
                      </span>
                    </div>
                  </div>

                  {/* Close button with left dark fade */}
                  <button
                    onClick={() => dismissStrip(activeStripAnn.id)}
                    style={{ border: "none", cursor: "pointer", zIndex: 10, paddingLeft: "0.5rem", background: "transparent", height: "100%", display: "flex", alignItems: "center", color: "#94A3B8", opacity: 0.8, flexShrink: 0, fontSize: "0.78rem", fontWeight: 700 }}
                    title="Dismiss Announcement"
                  >
                    ✕
                  </button>
                </div>
              );
            })()}

            {children}
          </div>
        </main>
      </div>

      {/* Global Quick-Jump Command Palette (Ctrl+K) */}
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
      />
    </div>
  );
}
