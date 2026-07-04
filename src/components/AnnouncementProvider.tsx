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

  // Poll database notifications for new announcements
  useEffect(() => {
    if (!session?.user?.id) return;

    const checkNewAnnouncements = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;

        // Retrieve previously seen announcement desktop notifications
        const seenStr = localStorage.getItem("seen_announcement_toasts");
        const seenIds: string[] = seenStr ? JSON.parse(seenStr) : [];

        let playSound = false;
        let triggeredCount = 0;

        for (const notif of data) {
          if (notif.type === "TEAM_ANNOUNCEMENT" && !seenIds.includes(notif.id)) {
            // Extract note ID embedded in the message format: "[NOTE_ID:id] content..."
            const match = notif.message.match(/^\[NOTE_ID:([^\]]+)\]\s*(.*)/);
            if (match) {
              const noteId = match[1];
              const textSnippet = match[2];
              
              seenIds.push(notif.id);
              triggeredCount++;
              
              // Trigger Native Windows Desktop Notification
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
          if (playSound) {
            playChimeAlert();
          }
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
