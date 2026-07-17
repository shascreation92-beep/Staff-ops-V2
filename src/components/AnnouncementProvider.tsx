"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { X, AlertTriangle } from "lucide-react";
import { FullscreenModal } from "./PersonalNotesDashboard";
import { getPersonalNoteByIdAction } from "@/app/actions/personalNotes";

interface Toast {
  id: string;
  title: string;
  message: string;
  noteId: string;
}

interface AnnouncementContextType {
  triggerToast: (toast: Omit<Toast, "id">) => void;
  openAnnouncementById: (noteId: string) => Promise<void>;
  activeStripAnn: any | null;
  dismissStrip: (annId: string) => void;
  openGlobalAnnDetails: (ann: any) => void;
}

const AnnouncementContext = createContext<AnnouncementContextType | undefined>(undefined);

export function useAnnouncements() {
  const context = useContext(AnnouncementContext);
  if (!context) {
    throw new Error("useAnnouncements must be used within an AnnouncementProvider");
  }
  return context;
}

// Procedural audio ping synthesis using Web Audio API
export function playChimeAlert() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // First high note: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.06, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second delayed higher note: A5 (880.00 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.00, now + 0.1);
    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.06, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn("Audio chime playback blocked by browser autocomplete/interact constraints:", e);
  }
}

export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [activeModalNote, setActiveModalNote] = useState<any>(null);
  
  // System Announcements State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<string[]>([]);
  const [dismissedStripIds, setDismissedStripIds] = useState<string[]>([]);
  const [focusedAnnDetails, setFocusedAnnDetails] = useState<any | null>(null);

  // Request native OS notification permissions on mount
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Register background Service Worker and listen for notification click messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker registered with scope:', reg.scope))
        .catch((err) => console.error('Service Worker registration failed:', err));
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.action === 'view-note') {
        const noteId = event.data.noteId;
        if (noteId) {
          openAnnouncementById(noteId);
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
  }, []);

  // Check URL parameters on mount to open focused note if redirect occurred from background click
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const openNoteId = params.get('openNoteId');
      if (openNoteId && session?.user?.id) {
        openAnnouncementById(openNoteId);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [session?.user?.id]);

  // Load local storage states on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ackStr = localStorage.getItem("acknowledged_announcements");
      if (ackStr) {
        setAcknowledgedAlerts(JSON.parse(ackStr));
      }
      const disStr = localStorage.getItem("dismissed_strip_announcements");
      if (disStr) {
        setDismissedStripIds(JSON.parse(disStr));
      }
    }
  }, []);

  const parseAnnTitle = (rawTitle: string) => {
    try {
      const parsed = JSON.parse(rawTitle);
      if (parsed && typeof parsed === 'object' && 'sender' in parsed) {
        return parsed as { sender: "COMPANY_HQ" | "IT_DEPARTMENT"; type: "COMPANY_UPDATE" | "URGENT_ALERT" | "SALES_CELEBRATION"; text: string };
      }
    } catch (e) {}
    return { sender: "COMPANY_HQ" as const, type: "COMPANY_UPDATE" as const, text: rawTitle };
  };

  // Poll database notifications for team personal notes announcements AND system wide global announcements
  useEffect(() => {
    if (!session?.user?.id) return;

    const checkNewAnnouncements = async () => {
      try {
        // 1. Fetch team announcements
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const seenStr = localStorage.getItem("seen_announcement_toasts");
            const seenIds: string[] = seenStr ? JSON.parse(seenStr) : [];
            let playSound = false;
            let triggeredCount = 0;

            for (const notif of data) {
              if (notif.type === "TEAM_ANNOUNCEMENT" && !seenIds.includes(notif.id)) {
                const match = notif.message.match(/^\[NOTE_ID:([^\]]+)\]\s*(.*)/);
                if (match) {
                  const noteId = match[1];
                  const textSnippet = match[2];
                  seenIds.push(notif.id);
                  triggeredCount++;
                  
                  if ('Notification' in window && Notification.permission === 'granted') {
                    navigator.serviceWorker?.ready.then((registration) => {
                      registration.showNotification("📢 New Team Announcement", {
                        body: textSnippet,
                        icon: "/logo.png",
                        badge: "/logo.png",
                        data: { noteId },
                        tag: notif.id,
                        requireInteraction: true
                      });
                    });
                  }
                  playSound = true;
                }
              }
            }

            if (triggeredCount > 0) {
              localStorage.setItem("seen_announcement_toasts", JSON.stringify(seenIds));
              if (playSound) playChimeAlert();
            }
          }
        }

        // 2. Fetch system-wide global announcements
        const sysRes = await fetch("/api/announcements");
        if (sysRes.ok) {
          const sysData = await sysRes.json();
          if (Array.isArray(sysData)) {
            setAnnouncements(sysData);

            // Trigger Native OS-level Desktop Notification for unseen system announcements
            const seenSysStr = localStorage.getItem("seen_sys_announcements");
            const seenSysIds: string[] = seenSysStr ? JSON.parse(seenSysStr) : [];
            let newSysTriggered = false;

            for (const ann of sysData) {
              if (!seenSysIds.includes(ann.id)) {
                seenSysIds.push(ann.id);
                newSysTriggered = true;
                
                const parsed = parseAnnTitle(ann.title);
                const senderDisplay = parsed.sender === "COMPANY_HQ" ? "Company HQ" : "IT Department";

                if ('Notification' in window && Notification.permission === 'granted') {
                  navigator.serviceWorker?.ready.then((registration) => {
                    registration.showNotification(`📢 System Announcement from [${senderDisplay}]`, {
                      body: `${parsed.text}: ${ann.content.slice(0, 80)}...`,
                      icon: "/logo.png",
                      badge: "/logo.png",
                      data: { noteId: "global-" + ann.id },
                      tag: ann.id,
                      requireInteraction: true
                    });
                  });
                }
              }
            }

            if (newSysTriggered) {
              localStorage.setItem("seen_sys_announcements", JSON.stringify(seenSysIds));
              playChimeAlert();
            }
          }
        }
      } catch (err) {
        console.error("Failed to check new announcements:", err);
      }
    };

    checkNewAnnouncements();
    const timer = setInterval(checkNewAnnouncements, 5000);
    return () => clearInterval(timer);
  }, [session?.user?.id]);

  const triggerToast = (toast: Omit<Toast, "id">) => {
    playChimeAlert();
    if ('Notification' in window && Notification.permission === 'granted') {
      navigator.serviceWorker?.ready.then((registration) => {
        registration.showNotification(toast.title, {
          body: toast.message,
          icon: "/logo.png",
          badge: "/logo.png",
          data: { noteId: toast.noteId },
          tag: Math.random().toString(),
          requireInteraction: true
        });
      });
    }
  };

  async function openAnnouncementById(noteId: string) {
    if (noteId.startsWith("global-")) {
      const realAnnId = noteId.replace("global-", "");
      const found = announcements.find(a => a.id === realAnnId);
      if (found) {
        setFocusedAnnDetails(found);
      }
      return;
    }
    try {
      const res = await getPersonalNoteByIdAction(noteId);
      if (res.success && res.note) {
        setActiveModalNote(res.note);
      }
    } catch (e: any) {
      alert(e.message || "Failed to load announcement details.");
    }
  }

  const handleAcknowledgeAlert = (annId: string) => {
    const updated = [...acknowledgedAlerts, annId];
    setAcknowledgedAlerts(updated);
    localStorage.setItem("acknowledged_announcements", JSON.stringify(updated));
  };

  const handleDismissStrip = (annId: string) => {
    const updated = [...dismissedStripIds, annId];
    setDismissedStripIds(updated);
    localStorage.setItem("dismissed_strip_announcements", JSON.stringify(updated));
  };

  // Filter urgent announcements requiring center-screen frosted-glass modals
  const activeUrgentAlert = announcements.find(ann => {
    const parsed = parseAnnTitle(ann.title);
    return parsed.type === "URGENT_ALERT" && !acknowledgedAlerts.includes(ann.id);
  });

  // Filter latest strip announcements to display in top-bar
  const activeStripAnn = announcements.find(ann => {
    const parsed = parseAnnTitle(ann.title);
    return parsed.type !== "URGENT_ALERT" && !dismissedStripIds.includes(ann.id);
  });

  return (
    <AnnouncementContext.Provider value={{ 
      triggerToast, 
      openAnnouncementById,
      activeStripAnn,
      dismissStrip: handleDismissStrip,
      openGlobalAnnDetails: setFocusedAnnDetails
    }}>
      {children}

      {/* High-Priority Alerts Frosted-Glass Modal */}
      {activeUrgentAlert && (() => {
        const parsed = parseAnnTitle(activeUrgentAlert.title);
        const senderBadge = parsed.sender === "COMPANY_HQ" ? "🏢 Company HQ" : "💻 IT Department";

        return (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(255, 255, 255, 0.4)",
              backdropFilter: "blur(12px)",
              zIndex: 9999999,
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            <div
              style={{
                background: "#FFFFFF",
                border: "2px solid #EF4444",
                borderRadius: "12px",
                padding: "2rem",
                width: "450px",
                maxWidth: "90%",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                textAlign: "center"
              }}
            >
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ background: "rgba(239,68,68,0.08)", padding: "0.75rem", borderRadius: "50%", color: "#EF4444" }}>
                  <AlertTriangle size={32} />
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.68rem", background: "rgba(239, 68, 68, 0.08)", color: "#EF4444", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 800 }}>
                  ⚠️ URGENT ALERT from [{senderBadge}]
                </span>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, marginTop: "0.5rem", color: "var(--text-primary)" }}>
                  {parsed.text}
                </h3>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                {activeUrgentAlert.content}
              </p>
              <button
                onClick={() => handleAcknowledgeAlert(activeUrgentAlert.id)}
                className="btn-gold"
                style={{ width: "100%", height: "38px", background: "#EF4444", color: "#FFFFFF", border: "1px solid #EF4444" }}
              >
                Got it!
              </button>
            </div>
          </div>
        );
      })()}

      {/* Global System Announcement Details Viewer Modal */}
      {focusedAnnDetails && (() => {
        const parsed = parseAnnTitle(focusedAnnDetails.title);
        const senderBadge = parsed.sender === "COMPANY_HQ" ? "🏢 Company HQ" : "💻 IT Department";
        let typeBadge = "[Company Update]";
        let typeColor = "#0250A1";
        if (parsed.type === "URGENT_ALERT") {
          typeBadge = "[Urgent Alert]";
          typeColor = "#EF4444";
        } else if (parsed.type === "SALES_CELEBRATION") {
          typeBadge = "[Sales Celebration]";
          typeColor = "#10B981";
        }

        return (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 9999999,
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--border-dim)",
                borderRadius: "12px",
                padding: "2rem",
                width: "500px",
                maxWidth: "90%",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
                position: "relative"
              }}
            >
              <button
                onClick={() => setFocusedAnnDetails(null)}
                style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={16} />
              </button>
              
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                  <span style={{ fontSize: "0.62rem", background: "rgba(2, 80, 161, 0.05)", color: "#0250A1", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 800 }}>
                    {senderBadge}
                  </span>
                  <span style={{ fontSize: "0.62rem", background: "rgba(0,0,0,0.03)", color: typeColor, padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 800 }}>
                    {typeBadge}
                  </span>
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {parsed.text}
                </h3>
              </div>

              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", padding: "0.5rem 0" }}>
                {focusedAnnDetails.content}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Broadcast date: {new Date(focusedAnnDetails.createdAt).toLocaleString()}
              </div>

              <button
                onClick={() => setFocusedAnnDetails(null)}
                className="btn-gold"
                style={{ width: "100%", height: "36px" }}
              >
                Close Announcement
              </button>
            </div>
          </div>
        );
      })()}

      {/* Global Preview Modal */}
      {activeModalNote && (
        <FullscreenModal
          note={activeModalNote}
          userRole={session?.user?.role || "SALES_ASSOCIATE"}
          onClose={() => setActiveModalNote(null)}
          onSave={async () => {}} // shared announcements are read-only
        />
      )}
    </AnnouncementContext.Provider>
  );
}
