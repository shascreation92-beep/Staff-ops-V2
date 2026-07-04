"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { X } from "lucide-react";
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
function playChimeAlert() {
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeModalNote, setActiveModalNote] = useState<any>(null);

  // Poll database notifications for new announcements
  useEffect(() => {
    if (!session?.user?.id) return;

    const checkNewAnnouncements = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;

        // Retrieve previously seen announcement toast notifications
        const seenStr = localStorage.getItem("seen_announcement_toasts");
        const seenIds: string[] = seenStr ? JSON.parse(seenStr) : [];

        let playSound = false;
        const newToasts: Toast[] = [];

        for (const notif of data) {
          if (notif.type === "TEAM_ANNOUNCEMENT" && !seenIds.includes(notif.id)) {
            // Extract note ID embedded in the message format: "[NOTE_ID:id] content..."
            const match = notif.message.match(/^\[NOTE_ID:([^\]]+)\]\s*(.*)/);
            if (match) {
              const noteId = match[1];
              const textSnippet = match[2];
              
              seenIds.push(notif.id);
              newToasts.push({
                id: notif.id,
                title: notif.title || "📢 New Team Announcement",
                message: textSnippet,
                noteId
              });
              playSound = true;
            }
          }
        }

        if (newToasts.length > 0) {
          localStorage.setItem("seen_announcement_toasts", JSON.stringify(seenIds));
          setToasts(prev => [...prev, ...newToasts]);
          if (playSound) {
            playChimeAlert();
          }

          // Setup auto-dismiss for each new toast
          newToasts.forEach((nt) => {
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== nt.id));
            }, 8000);
          });
        }
      } catch (err) {
        console.error("Failed to check new team announcements:", err);
      }
    };

    // Run check initially
    checkNewAnnouncements();

    // Poll every 5 seconds
    const timer = setInterval(checkNewAnnouncements, 5000);
    return () => clearInterval(timer);
  }, [session?.user?.id]);

  const triggerToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    playChimeAlert();
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 8000);
  };

  const openAnnouncementById = async (noteId: string) => {
    try {
      const res = await getPersonalNoteByIdAction(noteId);
      if (res.success && res.note) {
        setActiveModalNote(res.note);
      }
    } catch (e: any) {
      alert(e.message || "Failed to load announcement details.");
    }
  };

  return (
    <AnnouncementContext.Provider value={{ triggerToast, openAnnouncementById }}>
      {children}

      {/* Global In-App Toast Container Stack */}
      <div 
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: "360px",
          pointerEvents: "none"
        }}
      >
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className="glass-panel"
            style={{
              padding: "1.25rem",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.95)",
              border: "1px solid rgba(2, 80, 161, 0.15)",
              boxShadow: "0 10px 30px rgba(2, 80, 161, 0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
              pointerEvents: "auto",
              animation: "slide-in-right 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
              position: "relative"
            }}
          >
            {/* Header info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0250A1", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {toast.title}
              </span>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "0.1rem",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Truncated message text */}
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.4" }}>
              {toast.message}
            </p>

            {/* CTA action button */}
            <button
              onClick={() => {
                openAnnouncementById(toast.noteId);
                // Dismiss the toast
                setToasts(prev => prev.filter(t => t.id !== toast.id));
              }}
              className="btn-gold"
              style={{
                width: "100%",
                padding: "0.4rem",
                fontSize: "0.76rem",
                fontWeight: 700,
                textAlign: "center",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.3rem",
                borderRadius: "6px",
                height: "auto",
                marginTop: "0.2rem"
              }}
            >
              👀 View Note
            </button>
          </div>
        ))}
      </div>

      {/* Global Preview Modal */}
      {activeModalNote && (
        <FullscreenModal
          note={activeModalNote}
          userRole={session?.user?.role || "SALES_ASSOCIATE"}
          onClose={() => setActiveModalNote(null)}
          onSave={async () => {}} // shared announcements are read-only
        />
      )}

      {/* Embedded slide-in animation styles */}
      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(110%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </AnnouncementContext.Provider>
  );
}
