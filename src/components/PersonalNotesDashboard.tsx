"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Plus, 
  Trash2, 
  Pin, 
  Share2, 
  Copy, 
  Maximize2, 
  Minimize2, 
  CheckSquare, 
  Square, 
  FileText, 
  AlertCircle,
  HelpCircle,
  Edit2,
  Check,
  Users,
  Lock,
  Unlock,
  Eraser,
  Clock
} from "lucide-react";
import { toast } from "react-hot-toast";
import { 
  createPersonalNoteAction, 
  updatePersonalNoteAction, 
  deletePersonalNoteAction, 
  sharePersonalNoteWithTeamAction,
  cloneSharedAnnouncementAction,
  updateNoteTimerAction,
  acknowledgeSharedAnnouncementAction,
  getTeamMembersAction,
  getNoteShareTargetsAction
} from "@/app/actions/personalNotes";
import NotificationBell from "./NotificationBell";
import { playChimeAlert } from "./AnnouncementProvider";

interface PersonalNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  isPinned: boolean;
  color: string;
  isChecklist: boolean;
  isSharedAnnouncement: boolean;
  isSharedByMe: boolean;
  isGlobalPinned: boolean;
  timerExpiresAt: string | Date | null;
  isAcknowledged: boolean;
  sharedFromTlName: string | null;
  sharedFromNoteId: string | null;
  category: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  sharesCount?: number;
  readCount?: number;
  readByNames?: string[];
}

interface PersonalNotesDashboardProps {
  initialNotes: PersonalNote[];
  user: {
    id: string;
    role: string;
    name?: string | null;
    email?: string | null;
  };
}

const colorThemes: Record<string, { bg: string, border: string, headerBorder: string, glow: string }> = {
  default: { 
    bg: "#FFFFFF", 
    border: "var(--border-gold)", 
    headerBorder: "rgba(0, 119, 182, 0.1)", 
    glow: "rgba(0, 0, 0, 0.02)" 
  },
  yellow: { 
    bg: "#FFFDF2", 
    border: "rgba(245, 158, 11, 0.3)", 
    headerBorder: "rgba(245, 158, 11, 0.15)", 
    glow: "rgba(245, 158, 11, 0.05)" 
  },
  blue: { 
    bg: "#F4F9FF", 
    border: "rgba(59, 130, 246, 0.3)", 
    headerBorder: "rgba(59, 130, 246, 0.15)", 
    glow: "rgba(59, 130, 246, 0.05)" 
  },
  green: { 
    bg: "#F5FFF7", 
    border: "rgba(34, 197, 94, 0.3)", 
    headerBorder: "rgba(34, 197, 94, 0.15)", 
    glow: "rgba(34, 197, 94, 0.05)" 
  },
  red: { 
    bg: "#FFF5F5", 
    border: "rgba(239, 68, 68, 0.3)", 
    headerBorder: "rgba(239, 68, 68, 0.15)", 
    glow: "rgba(239, 68, 68, 0.05)" 
  }
};

const formatDate = (dateInput: string | Date) => {
  const d = new Date(dateInput);
  const datePart = `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}, ${d.getFullYear()}`;
  const timePart = d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return `${datePart} | ${timePart}`;
};

const renderMarkdown = (text: string) => {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/__(.*?)__/g, "<u>$1</u>");
  
  return html.replace(/\n/g, "<br />");
};

const executeFallbackCopy = (text: string) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand("copy");
  } catch (err) {
    console.error("Fallback copy failed", err);
  }
  document.body.removeChild(textArea);
};

const fallbackCopyToClipboard = (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(err => {
      console.warn("navigator.clipboard failed, using fallback", err);
      executeFallbackCopy(text);
    });
  } else {
    executeFallbackCopy(text);
  }
};

const evaluateMathInline = (text: string): string => {
  const mathRegex = /([\d\s\.\+\-\*\/]+)\s*=\s*$/;
  const match = text.match(mathRegex);
  if (match) {
    const expression = match[1].replace(/\s+/g, ""); // strip spaces
    if (/^[0-9\.\+\-\*\/]+$/.test(expression)) {
      try {
        const result = new Function(`return (${expression})`)();
        if (typeof result === "number" && !isNaN(result)) {
          return text + ` ${result}`;
        }
      } catch (e) {
        console.warn("Math evaluation failed", e);
      }
    }
  }
  return text;
};

const getWordCount = (text: string) => {
  if (!text) return 0;
  let cleanText = text;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      cleanText = parsed.map(i => i.text).join(" ");
    }
  } catch (e) {}
  const words = cleanText.trim().split(/\s+/).filter(w => w.length > 0);
  return words.length;
};

const getCharCount = (text: string) => {
  if (!text) return 0;
  let cleanText = text;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      cleanText = parsed.map(i => i.text).join(" ");
    }
  } catch (e) {}
  return cleanText.length;
};

export default function PersonalNotesDashboard({ initialNotes, user }: PersonalNotesDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<PersonalNote[]>(initialNotes);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("ALL");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Fullscreen expanded note card state
  const [expandedNote, setExpandedNote] = useState<PersonalNote | null>(null);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await getTeamMembersAction();
        if (res.success && res.members) {
          setTeamMembers(res.members);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchTeam();
  }, []);

  const handleAddNewNote = async () => {
    startTransition(async () => {
      try {
        const res = await createPersonalNoteAction({
          title: "",
          content: "",
          isChecklist: false,
          color: "default",
          category: "Work"
        });
        if (res.success && res.note) {
          toast.success("New note created!");
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to create note.");
      }
    });
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    startTransition(async () => {
      try {
        const res = await deletePersonalNoteAction(id);
        if (res.success) {
          toast.success("Note deleted successfully.");
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to delete note.");
      }
    });
  };

  const handleCloneAnnouncement = async (id: string) => {
    startTransition(async () => {
      try {
        const res = await cloneSharedAnnouncementAction(id);
        if (res.success && res.note) {
          toast.success("Announcement cloned to personal workspace!");
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to clone announcement.");
      }
    });
  };

  const handleShareWithTeam = async (id: string, isGlobalPinned: boolean = false, targetUserIds?: string[]) => {
    startTransition(async () => {
      try {
        const res = await sharePersonalNoteWithTeamAction(id, isGlobalPinned, targetUserIds);
        if (res.success) {
          toast.success(`Note shared! Cloned into ${res.count} workspaces.`);
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to share note.");
      }
    });
  };

  // Filter notes
  const filteredNotes = notes.filter(n => {
    return (
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Header Panel */}
      <div className="glass-panel" style={{
        padding: "1.5rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1.5rem",
        background: "#FFFFFF",
        border: "1px solid var(--border-dim)",
        position: "relative",
        zIndex: 50
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }} className="text-gold-gradient">
            📝 MY PERSONAL NOTES & WORKSPACE
          </h2>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Create unlimited scratchpads, manage checklists, customize color codes, and view team announcements.
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <NotificationBell />
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="glass-panel" style={{ padding: "1rem 1.5rem", background: "#FFFFFF", border: "1px solid var(--border-dim)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          
          {/* Search bar */}
          <div className="table-search-wrapper" style={{ width: "300px" }}>
            <Search className="header-search-icon" size={16} />
            <input
              type="text"
              placeholder="Search note titles or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="header-search-input"
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button 
              onClick={handleAddNewNote} 
              disabled={isPending}
              className="btn-gold"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.6rem 1.25rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                height: "40px"
              }}
            >
              <Plus size={16} />
              Add New Note
            </button>
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", background: "#FFFFFF" }}>
          <AlertCircle size={40} style={{ color: "var(--text-muted)", opacity: 0.5, marginBottom: "0.75rem" }} />
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>No Notes Found</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            {searchTerm ? "No notes matched your search query." : "Click '+ Add New Note' above to create your first personal note card."}
          </p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
          gap: "1.5rem"
        }}>
          {filteredNotes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              userRole={user.role}
              onDelete={handleDeleteNote}
              onShare={handleShareWithTeam}
              onClone={handleCloneAnnouncement}
              onExpand={(n) => setExpandedNote(n)}
              teamMembers={teamMembers}
            />
          ))}
        </div>
      )}

      {/* Fullscreen Overlay Focus Modal */}
      {expandedNote && (
        <FullscreenModal
          note={expandedNote}
          userRole={user.role}
          onClose={() => {
            setExpandedNote(null);
            router.refresh();
          }}
          onSave={async (id, data) => {
            await updatePersonalNoteAction(id, data);
          }}
        />
      )}
    </div>
  );
}

/* ==========================================
   NOTE CARD CHILD COMPONENT
   ========================================== */
interface NoteCardProps {
  note: PersonalNote;
  userRole: string;
  onDelete: (id: string) => void;
  onShare: (id: string, isGlobalPinned?: boolean, targetUserIds?: string[]) => void;
  onClone: (id: string) => void;
  onExpand: (note: PersonalNote) => void;
  teamMembers: any[];
}

function NoteCard({ note, userRole, onDelete, onShare, onClone, onExpand, teamMembers }: NoteCardProps) {
  const router = useRouter();
  const [localTitle, setLocalTitle] = useState(note.title === "Untitled Note" ? "" : note.title);
  const [localContent, setLocalContent] = useState(note.content);
  const [localColor, setLocalColor] = useState(note.color);
  const [localCategory] = useState(note.category || "Work");
  const [localIsPinned, setLocalIsPinned] = useState(note.isPinned);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isCopied, setIsCopied] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [reminderTime, setReminderTime] = useState<number | null>(null);

  // Read Acknowledgments State
  const [showAckDropdown, setShowAckDropdown] = useState(false);

  // Share targets state
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [shareTargets, setShareTargets] = useState<string[]>([]);
  const [shareGlobalPin, setShareGlobalPin] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleOpenShareDropdown = async () => {
    if (showShareDropdown) {
      setShowShareDropdown(false);
      return;
    }
    
    try {
      const res = await getNoteShareTargetsAction(note.id);
      if (res.success) {
        setShareTargets(res.targetUserIds);
        setShareGlobalPin(res.isGlobalPinned);
      }
    } catch (e) {
      console.error(e);
    }
    setShowShareDropdown(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setShareTargets(teamMembers.map(m => m.id));
    } else {
      setShareTargets([]);
    }
  };

  const handleToggleTarget = (userId: string) => {
    setShareTargets(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveShare = () => {
    onShare(note.id, shareGlobalPin, shareTargets);
    setShowShareDropdown(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowShareDropdown(false);
      }
    }
    if (showShareDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showShareDropdown]);

  // Countdown Timer State
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!note.timerExpiresAt) {
      setTimeLeftSeconds(null);
      setIsExpired(false);
      return;
    }

    const expiresTime = new Date(note.timerExpiresAt).getTime();
    
    const updateCountdown = () => {
      const now = Date.now();
      const diff = expiresTime - now;
      if (diff <= 0) {
        setTimeLeftSeconds(0);
        setIsExpired(true);
        return;
      }
      const secs = Math.floor(diff / 1000);
      setTimeLeftSeconds(secs);
      setIsExpired(false);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [note.timerExpiresAt]);

  // 5 Minutes Remaining Desktop Notification System-level alert
  useEffect(() => {
    if (timeLeftSeconds === 300) {
      playChimeAlert();
      if ('Notification' in window && Notification.permission === 'granted') {
        navigator.serviceWorker?.ready.then((registration) => {
          registration.showNotification("⏰ 5 Minutes Remaining!", {
            body: `The countdown timer for announcement "${localTitle || 'Untitled Note'}" is at exactly 5 minutes remaining!`,
            icon: "/logo.png",
            badge: "/logo.png",
            data: { noteId: note.id, timerAlert: true },
            tag: `timer-alert-${note.id}`,
            requireInteraction: true
          });
        });
      }
    }
  }, [timeLeftSeconds, note.id, localTitle]);

  const handleSetCountdown = async () => {
    if (isLocked) return;
    const minsStr = prompt("Append action countdown timer (minutes) - e.g. 15, 30, 60.\nEnter 0 or leave empty to clear current timer.");
    if (minsStr === null) return;
    
    const mins = minsStr.trim() === "" ? 0 : parseFloat(minsStr);
    if (isNaN(mins) || mins < 0) {
      toast.error("Please enter a valid positive number.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateNoteTimerAction(note.id, mins === 0 ? null : mins);
        if (res.success) {
          toast.success(mins === 0 ? "Timer cleared!" : `Urgency countdown set for ${mins} minutes!`);
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to update timer.");
      }
    });
  };

  const handleAcknowledge = async () => {
    startTransition(async () => {
      try {
        const res = await acknowledgeSharedAnnouncementAction(note.id);
        if (res.success) {
          toast.success("Announcement acknowledged!");
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to acknowledge.");
      }
    });
  };

  // Debounced auto-save effect
  useEffect(() => {
    if (
      localTitle === note.title &&
      localContent === note.content &&
      localColor === note.color &&
      localIsPinned === note.isPinned
    ) {
      return;
    }

    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        await updatePersonalNoteAction(note.id, {
          title: localTitle,
          content: localContent,
          color: localColor,
          isPinned: localIsPinned
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 1500);
      } catch (err) {
        setSaveStatus("idle");
        console.error("Auto-save failed", err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [localTitle, localContent, localColor, localIsPinned]);

  const activeTheme = colorThemes[localColor] || colorThemes.default;

  // Checklist Helpers
  const checklistItems = note.isChecklist ? (() => {
    try {
      const parsed = JSON.parse(localContent);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  })() : [];

  const handleChecklistToggle = (itemId: string, done: boolean) => {
    if (note.isSharedAnnouncement || isLocked) return;
    const updated = checklistItems.map(item => 
      item.id === itemId ? { ...item, done } : item
    );
    setLocalContent(JSON.stringify(updated));
  };

  const handleAddChecklistItem = (text: string) => {
    if (!text.trim() || isLocked) return;
    const newItem = { id: `item-${Date.now()}-${Math.random()}`, text: text.trim(), done: false };
    const updated = [...checklistItems, newItem];
    setLocalContent(JSON.stringify(updated));
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    if (isLocked) return;
    const updated = checklistItems.filter(item => item.id !== itemId);
    setLocalContent(JSON.stringify(updated));
  };

  const handleToggleMode = () => {
    if (note.isSharedAnnouncement || isLocked) return;
    startTransition(async () => {
      try {
        const nextIsChecklist = !note.isChecklist;
        let nextContent = localContent;
        if (nextIsChecklist) {
          const items = localContent
            .split("\n")
            .filter(line => line.trim().length > 0)
            .map((line, idx) => ({ id: `item-${idx}-${Date.now()}`, text: line, done: false }));
          nextContent = JSON.stringify(items);
        } else {
          try {
            const parsed = JSON.parse(localContent);
            if (Array.isArray(parsed)) {
              nextContent = parsed.map(item => item.text).join("\n");
            }
          } catch (e) {}
        }

        await updatePersonalNoteAction(note.id, {
          isChecklist: nextIsChecklist,
          content: nextContent
        });
        setLocalContent(nextContent);
        toast.success(nextIsChecklist ? "Toggled to Checklist Mode" : "Toggled to Standard Text Mode");
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || "Failed to switch mode.");
      }
    });
  };

  const handleCopyClipboard = () => {
    let copyText = "";
    if (note.isChecklist) {
      copyText = checklistItems.map(item => `[${item.done ? "x" : " "}] ${item.text}`).join("\n");
    } else {
      copyText = localContent;
    }
    fallbackCopyToClipboard(`${localTitle}\n\n${copyText}`);
    setIsCopied(true);
    toast.success("Note content copied!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleContentChange = (val: string) => {
    if (isLocked) return;
    let newContent = val;
    if (val.endsWith("=")) {
      newContent = evaluateMathInline(val);
    }
    setLocalContent(newContent);
  };

  const handleClearContent = () => {
    if (isLocked) return;
    if (confirm("Are you sure you want to clear all contents of this note?")) {
      setLocalContent(note.isChecklist ? "[]" : "");
      toast.success("Note text cleared!");
    }
  };

  const handleSetReminder = () => {
    const minutesStr = prompt("Set a reminder alert in how many minutes? (e.g. 5, 15, 60)");
    if (!minutesStr) return;
    const mins = parseFloat(minutesStr);
    if (isNaN(mins) || mins <= 0) {
      toast.error("Please enter a valid positive number.");
      return;
    }

    const delayMs = mins * 60 * 1000;
    setReminderTime(Date.now() + delayMs);
    toast.success(`Reminder scheduled for ${mins} minutes from now!`);

    setTimeout(() => {
      toast((t) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span style={{ fontWeight: 800 }}>🔔 NOTE REMINDER</span>
          <span style={{ fontSize: "0.85rem" }}>Your reminder for "{localTitle || "Untitled Note"}" has arrived!</span>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
            <button 
              onClick={() => {
                toast.dismiss(t.id);
                onExpand({ ...note, title: localTitle, content: localContent, color: localColor, isPinned: localIsPinned, isSharedByMe: note.isSharedByMe });
              }}
              style={{
                background: "var(--gold-primary)",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "0.25rem 0.6rem",
                fontSize: "0.75rem",
                cursor: "pointer",
                fontWeight: 700
              }}
            >
              Open Note
            </button>
            <button 
              onClick={() => toast.dismiss(t.id)}
              style={{
                background: "rgba(0,0,0,0.05)",
                color: "var(--text-primary)",
                border: "none",
                borderRadius: "4px",
                padding: "0.25rem 0.6rem",
                fontSize: "0.75rem",
                cursor: "pointer"
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ), { duration: 15000 });
      setReminderTime(null);
    }, delayMs);
  };

  const [, startTransition] = useTransition();

  const formatMMSS = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `⏱️ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} remaining`;
  };

  // Progress calculations
  const totalChecklist = checklistItems.length;
  const completedChecklist = checklistItems.filter(i => i.done).length;
  const progressPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  return (
    <div 
      className="glass-panel" 
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "340px",
        background: activeTheme.bg,
        border: isExpired ? "1.5px solid rgba(239, 68, 68, 0.45)" : note.isGlobalPinned ? "2px solid #0250A1" : `1px solid ${activeTheme.border}`,
        boxShadow: note.isGlobalPinned ? "0 4px 20px rgba(2, 80, 161, 0.25)" : `0 4px 20px ${activeTheme.glow}`,
        opacity: isExpired ? 0.82 : 1,
        padding: "1.25rem",
        position: "relative",
        borderRadius: "12px",
        transition: "all 0.25s ease",
        animation: "fade-in 0.3s ease"
      }}
    >
      {/* Pinned announcement tags/border badges */}
      {note.isSharedAnnouncement && (
        <div style={{
          position: "absolute",
          top: "-10px",
          left: "15px",
          background: "#0250A1",
          color: "#FFFFFF",
          fontSize: "0.65rem",
          fontWeight: 800,
          padding: "0.2rem 0.6rem",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 2px 8px rgba(2, 80, 161, 0.25)",
          textTransform: "uppercase",
          letterSpacing: "0.03em"
        }}>
          📢 Team Announcement {note.isGlobalPinned && "• Pinned to Team"}
        </div>
      )}

      {/* Card Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        borderBottom: `1px solid ${activeTheme.headerBorder}`, 
        paddingBottom: "0.6rem",
        marginTop: note.isSharedAnnouncement ? "0.4rem" : "0"
      }}>
        {note.isSharedAnnouncement ? (
          <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{localTitle}</span>
        ) : (
          <input
            type="text"
            value={localTitle}
            disabled={isLocked}
            onChange={(e) => setLocalTitle(e.target.value)}
            style={{
              background: "none",
              border: "none",
              fontWeight: 800,
              fontSize: "0.95rem",
              color: "var(--text-primary)",
              outline: "none",
              flex: 1,
              minWidth: 0
            }}
            placeholder="Note Title..."
          />
        )}

        {/* Header Tools */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginLeft: "0.5rem", flexShrink: 0 }}>
          
          {/* Live countdown timer display */}
          {note.timerExpiresAt && timeLeftSeconds !== null && (
            <span 
              onClick={handleSetCountdown}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
                isExpired ? "" : timeLeftSeconds < 600 ? "animate-pulse" : ""
              }`}
              style={{ 
                cursor: (note.isSharedAnnouncement || isLocked) ? "default" : "pointer",
                background: isExpired ? "#EF4444" : timeLeftSeconds < 600 ? "#FEE2E2" : "rgba(0, 0, 0, 0.04)",
                color: isExpired ? "#FFFFFF" : timeLeftSeconds < 600 ? "#991B1B" : "var(--text-secondary)",
                border: isExpired ? "1px solid #DC2626" : timeLeftSeconds < 600 ? "1px solid #FCA5A5" : "1px solid rgba(0, 0, 0, 0.08)",
                fontSize: "0.72rem",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title={note.isSharedAnnouncement ? "Countdown deadline" : "Click to edit countdown timer"}
            >
              {isExpired ? "⏰ Time's Up" : formatMMSS(timeLeftSeconds)}
            </span>
          )}

          {/* Action Countdown Timer button setter (⏱️) */}
          {!note.isSharedAnnouncement && (
            <button
              onClick={handleSetCountdown}
              disabled={isLocked}
              style={{
                background: "none",
                border: "none",
                cursor: isLocked ? "default" : "pointer",
                padding: "0.3rem",
                color: note.timerExpiresAt ? "var(--gold-premium)" : "var(--text-muted)",
                opacity: note.timerExpiresAt ? 1 : 0.4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Set Urgency Countdown Timer (⏱️)"
            >
              <span style={{ fontSize: "0.9rem" }}>⏱️</span>
            </button>
          )}

          {/* Note Edit Lock (🔒) */}
          {!note.isSharedAnnouncement && (
            <button
              onClick={() => setIsLocked(!isLocked)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.3rem",
                color: isLocked ? "#EF4444" : "var(--text-muted)",
                opacity: isLocked ? 1 : 0.4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title={isLocked ? "Unlock Note" : "Lock Note (Read Only)"}
            >
              {isLocked ? <Lock size={15} /> : <Unlock size={15} />}
            </button>
          )}

          {/* Pinned Status Toggle */}
          {!note.isSharedAnnouncement && (
            <button
              onClick={() => !isLocked && setLocalIsPinned(!localIsPinned)}
              disabled={isLocked}
              style={{
                background: "none",
                border: "none",
                cursor: isLocked ? "default" : "pointer",
                padding: "0.3rem",
                color: localIsPinned ? "#EF4444" : "var(--text-muted)",
                opacity: localIsPinned ? 1 : 0.4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title={localIsPinned ? "Unpin Note" : "Pin to Top"}
            >
              <Pin size={15} style={{ fill: localIsPinned ? "#EF4444" : "none" }} />
            </button>
          )}

          {/* Fullscreen expanded */}
          <button
            onClick={() => onExpand({ ...note, title: localTitle, content: localContent, color: localColor, category: localCategory, isPinned: localIsPinned, isSharedByMe: note.isSharedByMe })}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.3rem",
              color: "var(--text-muted)",
              opacity: 0.6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Expand Fullscreen"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      {/* Mode toggle row */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: "0.5rem" }}>
        {!note.isSharedAnnouncement && (
          <button
            onClick={() => !isLocked && handleToggleMode()}
            disabled={isLocked}
            style={{
              fontSize: "0.62rem",
              fontWeight: 700,
              color: note.isChecklist ? "var(--color-success)" : "var(--gold-premium)",
              background: note.isChecklist ? "rgba(46, 196, 182, 0.06)" : "rgba(2, 62, 138, 0.06)",
              border: note.isChecklist ? "1px solid rgba(46, 196, 182, 0.2)" : "1px solid rgba(2, 62, 138, 0.2)",
              borderRadius: "4px",
              padding: "0.1rem 0.4rem",
              cursor: isLocked ? "default" : "pointer"
            }}
            title={isLocked ? "Unlock to switch mode" : "Click to toggle standard text / checklist format"}
          >
            {note.isChecklist ? "CHECKLIST MODE" : "TEXT MODE"}
          </button>
        )}
      </div>

      {/* Checklist Progress Bar */}
      {note.isChecklist && (
        <div style={{ marginTop: "0.65rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.65rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
            <span>PROGRESS</span>
            <span>{completedChecklist}/{totalChecklist} ({progressPercent}%)</span>
          </div>
          <div style={{ width: "100%", background: "rgba(0,0,0,0.06)", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ background: "#2EC4B6", height: "100%", width: `${progressPercent}%`, transition: "width 0.3s ease" }}></div>
          </div>
        </div>
      )}

      {/* Card Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", marginTop: "0.85rem", overflowY: "auto" }}>
        {note.isChecklist ? (
          /* CHECKLIST RENDERING */
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {checklistItems.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  onClick={() => handleChecklistToggle(item.id, !item.done)}
                  disabled={note.isSharedAnnouncement || isLocked}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: (note.isSharedAnnouncement || isLocked) ? "default" : "pointer",
                    padding: 0,
                    color: item.done ? "#2EC4B6" : "var(--text-muted)",
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  {item.done ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
                <span style={{
                  fontSize: "0.82rem",
                  color: item.done ? "var(--text-muted)" : "var(--text-primary)",
                  textDecoration: item.done ? "line-through" : "none",
                  opacity: item.done ? 0.6 : 1,
                  wordBreak: "break-all"
                }}>
                  {item.text}
                </span>
                {!note.isSharedAnnouncement && !isLocked && (
                  <button 
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", opacity: 0.3, marginLeft: "auto" }}
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}
            
            {/* Input to add checklist item */}
            {!note.isSharedAnnouncement && (
              <input
                type="text"
                disabled={isLocked}
                placeholder={isLocked ? "Unlock to add items..." : "+ Add checklist task..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddChecklistItem((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: "1px dashed var(--border-gold)",
                  outline: "none",
                  fontSize: "0.82rem",
                  padding: "0.15rem 0",
                  color: "var(--text-primary)",
                  marginTop: "0.4rem"
                }}
              />
            )}
          </div>
        ) : (
          /* TEXT EDITOR RENDERING */
          note.isSharedAnnouncement ? (
            <div 
              style={{
                fontSize: "0.84rem",
                color: "var(--text-primary)",
                lineHeight: "1.5",
                whiteSpace: "pre-wrap",
                maxHeight: "160px",
                overflowY: "auto"
              }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(localContent) }}
            />
          ) : (
            <textarea
              value={localContent}
              onChange={(e) => handleContentChange(e.target.value)}
              readOnly={isLocked}
              placeholder="Start typing your note here..."
              style={{
                width: "100%",
                height: "140px",
                background: "none",
                border: "none",
                resize: "none",
                outline: "none",
                fontSize: "0.82rem",
                lineHeight: "1.4",
                color: "var(--text-primary)",
                fontFamily: "inherit"
              }}
            />
          )
        )}
      </div>

      {/* Associate Read Acknowledgment button */}
      {note.isSharedAnnouncement && (
        <div style={{ marginTop: "0.55rem" }}>
          {note.isAcknowledged ? (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: "0.75rem",
              fontWeight: 800,
              color: "#2EC4B6",
              gap: "0.25rem"
            }}>
              ✓ Read Confirmation Received
            </span>
          ) : (
            <button
              onClick={handleAcknowledge}
              className="btn-gold"
              style={{
                width: "100%",
                padding: "0.35rem 0.75rem",
                fontSize: "0.72rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.25rem",
                borderRadius: "4px"
              }}
            >
              <span>I Have Read This</span>
              <Check size={12} />
            </button>
          )}
        </div>
      )}

      {/* Acknowledgment dashboard tracker */}
      {note.isSharedByMe && (
        <div style={{ marginTop: "0.55rem" }}>
          <button
            onClick={() => setShowAckDropdown(!showAckDropdown)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "var(--gold-premium)",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: 0
            }}
          >
            <span>Read by {note.readCount || 0}/{note.sharesCount || 0} {userRole === "TEAM_LEAD" ? "Associates" : "Members"}</span>
            <span style={{ fontSize: "0.55rem" }}>{showAckDropdown ? "▲" : "▼"}</span>
          </button>
          {showAckDropdown && (
            <div style={{
              marginTop: "0.35rem",
              background: "rgba(0, 0, 0, 0.03)",
              borderRadius: "6px",
              padding: "0.45rem",
              maxHeight: "100px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              border: "1px solid rgba(0, 0, 0, 0.05)"
            }}>
              {note.readByNames && note.readByNames.length > 0 ? (
                note.readByNames.map((name, idx) => (
                  <span key={idx} style={{ fontSize: "0.68rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Check size={10} style={{ color: "#2EC4B6" }} /> {name}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontStyle: "italic" }}>No acknowledgments yet.</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Card Footer */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        borderTop: `1px solid ${activeTheme.headerBorder}`, 
        paddingTop: "0.6rem",
        marginTop: "0.85rem"
      }}>
        {/* Precise Created Timestamp & Live Counter */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontStyle: "italic" }}>
            Created on: {formatDate(note.createdAt)}
          </span>
          <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
            {getWordCount(localContent)} words | {getCharCount(localContent)} chars
          </span>
          {saveStatus === "saving" && (
            <span style={{ fontSize: "0.6rem", color: "var(--gold-premium)", fontWeight: 700, marginTop: "0.15rem" }}>
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span style={{ fontSize: "0.6rem", color: "#2EC4B6", fontWeight: 700, marginTop: "0.15rem" }}>
              ✓ Saved
            </span>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          
          {/* Reminder Alert Clock Icon */}
          {!note.isSharedAnnouncement && (
            <button
              onClick={handleSetReminder}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.2rem",
                color: reminderTime ? "#0250A1" : "var(--text-muted)",
                opacity: reminderTime ? 1 : 0.6
              }}
              title={reminderTime ? `Reminder active at ${new Date(reminderTime).toLocaleTimeString()}` : "Set Reminder Timer"}
            >
              <Clock size={14} />
            </button>
          )}

          {/* Color Picker tool */}
          {!note.isSharedAnnouncement && (
            <div style={{ display: "flex", gap: "0.15rem", opacity: isLocked ? 0.4 : 1, pointerEvents: isLocked ? "none" : "auto" }}>
              {["default", "yellow", "blue", "green", "red"].map((c) => (
                <button
                  key={c}
                  disabled={isLocked}
                  onClick={() => setLocalColor(c)}
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    border: localColor === c ? "1px solid #000" : "1px solid rgba(0,0,0,0.1)",
                    background: c === "default" ? "#FFFFFF" : 
                                c === "yellow" ? "#FEF08A" : 
                                c === "blue" ? "#BFDBFE" : 
                                c === "green" ? "#BBF7D0" : "#FECACA",
                    cursor: isLocked ? "default" : "pointer",
                    padding: 0
                  }}
                  title={`pastel ${c}`}
                />
              ))}
            </div>
          )}

          {/* Copy to Clipboard */}
          <button
            onClick={handleCopyClipboard}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.2rem",
              color: isCopied ? "#2EC4B6" : "var(--text-muted)",
              opacity: 0.8
            }}
            title="Copy to Clipboard"
          >
            {isCopied ? (
              <Check size={14} style={{ color: "#2EC4B6" }} />
            ) : (
              <Copy size={14} />
            )}
          </button>

          {/* Share note (Team Lead & Sales Associate) */}
          {!note.isSharedAnnouncement && (userRole === "TEAM_LEAD" || userRole === "SALES_ASSOCIATE") && (
            <div style={{ position: "relative" }} ref={dropdownRef}>
              <button
                disabled={isLocked}
                onClick={handleOpenShareDropdown}
                style={{
                  background: note.isSharedByMe ? "rgba(46, 196, 182, 0.1)" : "none",
                  border: note.isSharedByMe ? "1px solid rgba(46, 196, 182, 0.25)" : "none",
                  borderRadius: "4px",
                  cursor: isLocked ? "default" : "pointer",
                  padding: "0.2rem 0.4rem",
                  color: note.isSharedByMe ? "#2EC4B6" : "var(--gold-premium)",
                  opacity: isLocked ? 0.4 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.68rem",
                  fontWeight: 800
                }}
                title="Share Note"
              >
                <Share2 size={14} />
                {note.isSharedByMe && "Shared"}
              </button>

              {showShareDropdown && (
                <div style={{
                  position: "absolute",
                  bottom: "100%",
                  right: 0,
                  marginBottom: "0.5rem",
                  background: "#FFFFFF",
                  border: "1px solid var(--border-dim)",
                  borderRadius: "8px",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
                  padding: "0.75rem",
                  width: "240px",
                  zIndex: 9999,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.35rem" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--gold-primary)", textTransform: "uppercase" }}>
                      Share Targets
                    </span>
                    <button
                      onClick={() => setShowShareDropdown(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--text-muted)", padding: 0 }}
                    >
                      ✕
                    </button>
                  </div>

                  {userRole === "TEAM_LEAD" && (
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={shareTargets.length === teamMembers.length && teamMembers.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        style={{ accentColor: "var(--gold-primary)" }}
                      />
                      <span>Select All (Global)</span>
                    </label>
                  )}

                  <div style={{
                    maxHeight: "120px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                    padding: "0.1rem 0"
                  }}>
                    {teamMembers.length > 0 ? (
                      teamMembers.map((member) => (
                        <label key={member.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={shareTargets.includes(member.id)}
                            onChange={() => handleToggleTarget(member.id)}
                            style={{ accentColor: "var(--gold-primary)" }}
                          />
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {member.name}
                          </span>
                        </label>
                      ))
                    ) : (
                      <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                        No members available.
                      </span>
                    )}
                  </div>

                  {userRole === "TEAM_LEAD" && (
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", borderTop: "1px solid var(--border-dim)", paddingTop: "0.4rem", color: "var(--text-primary)", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={shareGlobalPin}
                        onChange={(e) => setShareGlobalPin(e.target.checked)}
                        style={{ accentColor: "var(--gold-primary)" }}
                      />
                      <span>Pin to Team Workspace</span>
                    </label>
                  )}

                  <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.25rem" }}>
                    <button
                      onClick={() => setShowShareDropdown(false)}
                      className="btn-gold"
                      style={{
                        flex: 1,
                        background: "none",
                        border: "1px solid var(--border-dim)",
                        color: "var(--text-primary)",
                        padding: "0.25rem",
                        fontSize: "0.68rem",
                        height: "auto"
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveShare}
                      className="btn-gold"
                      style={{
                        flex: 1,
                        padding: "0.25rem",
                        fontSize: "0.68rem",
                        height: "auto"
                      }}
                    >
                      Save Share
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Clone shared announcement (Sales Associate only) */}
          {note.isSharedAnnouncement && (
            <button
              onClick={() => onClone(note.id)}
              style={{
                background: "rgba(0, 119, 182, 0.08)",
                border: "1px solid rgba(0, 119, 182, 0.2)",
                borderRadius: "4px",
                padding: "0.1rem 0.35rem",
                fontSize: "0.62rem",
                fontWeight: 700,
                color: "var(--gold-primary)",
                cursor: "pointer"
              }}
              title="Clone to Edit"
            >
              CLONE
            </button>
          )}

          {/* 🧹 Sweep Clear (Internal) */}
          {!note.isSharedAnnouncement && (
            <button
              disabled={isLocked}
              onClick={handleClearContent}
              style={{
                background: "none",
                border: "none",
                cursor: isLocked ? "default" : "pointer",
                padding: "0.2rem",
                color: "var(--text-secondary)",
                opacity: isLocked ? 0.3 : 0.7
              }}
              title="Clear Note Text"
            >
              <Eraser size={14} />
            </button>
          )}

          {/* Delete Card */}
          {(!note.isSharedAnnouncement || !note.isGlobalPinned) && (
            <button
              disabled={isLocked}
              onClick={() => !isLocked && onDelete(note.id)}
              style={{
                background: "none",
                border: "none",
                cursor: isLocked ? "default" : "pointer",
                padding: "0.2rem",
                color: "var(--color-danger)",
                opacity: isLocked ? 0.4 : 1
              }}
              title="Delete Note"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================
   FULLSCREEN FOCUS MODAL OVERLAY
   ========================================== */
export interface FullscreenModalProps {
  note: PersonalNote;
  userRole: string;
  onClose: () => void;
  onSave: (id: string, data: any) => Promise<void>;
}

export function FullscreenModal({ note, userRole, onClose, onSave }: FullscreenModalProps) {
  const [title, setTitle] = useState(note.title === "Untitled Note" ? "" : note.title);
  const [content, setContent] = useState(note.content);
  const [category, setCategory] = useState(note.category || "Work");
  const [color, setColor] = useState(note.color);
  const [isSaving, setIsSaving] = useState(false);

  // Parse checklist items
  const checklistItems = note.isChecklist ? (() => {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  })() : [];

  const handleChecklistToggle = (itemId: string, done: boolean) => {
    if (note.isSharedAnnouncement) return;
    const updated = checklistItems.map(item => 
      item.id === itemId ? { ...item, done } : item
    );
    setContent(JSON.stringify(updated));
  };

  const handleAddChecklistItem = (text: string) => {
    if (!text.trim()) return;
    const newItem = { id: `item-modal-${Date.now()}`, text: text.trim(), done: false };
    const updated = [...checklistItems, newItem];
    setContent(JSON.stringify(updated));
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    const updated = checklistItems.filter(item => item.id !== itemId);
    setContent(JSON.stringify(updated));
  };

  const handleManualSave = async () => {
    if (note.isSharedAnnouncement) return;
    setIsSaving(true);
    try {
      await onSave(note.id, {
        title,
        content,
        color,
        category
      });
      toast.success("Changes saved successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeTheme = colorThemes[color] || colorThemes.default;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(255, 255, 255, 0.75)",
      backdropFilter: "blur(8px)",
      zIndex: 2000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem"
    }}>
      <div className="glass-panel" style={{
        maxWidth: "800px",
        width: "100%",
        height: "80vh",
        background: activeTheme.bg,
        border: `1px solid ${activeTheme.border}`,
        boxShadow: "var(--shadow-premium), 0 10px 40px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        padding: "2.5rem",
        borderRadius: "16px",
        position: "relative"
      }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px solid ${activeTheme.headerBorder}`, paddingBottom: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", width: "80%" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--gold-premium)", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase" }}>
              {note.isSharedAnnouncement ? "Team Announcement" : "Fullscreen Focus Mode"}
            </span>
            {note.isSharedAnnouncement ? (
              <h2 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>{title}</h2>
            ) : (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  background: "none",
                  border: "none",
                  fontWeight: 800,
                  fontSize: "1.45rem",
                  color: "var(--text-primary)",
                  outline: "none",
                  width: "100%"
                }}
                placeholder="Note Title..."
              />
            )}
          </div>

          <button 
            onClick={onClose} 
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
          >
            <Minimize2 size={22} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, marginTop: "1.5rem", overflowY: "auto" }}>
          {note.isChecklist ? (
            /* Checklist Overlay */
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "600px" }}>
              {checklistItems.map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <button
                    onClick={() => handleChecklistToggle(item.id, !item.done)}
                    disabled={note.isSharedAnnouncement}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: note.isSharedAnnouncement ? "default" : "pointer",
                      padding: 0,
                      color: item.done ? "#2EC4B6" : "var(--text-muted)"
                    }}
                  >
                    {item.done ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                  <span style={{
                    fontSize: "0.95rem",
                    color: item.done ? "var(--text-muted)" : "var(--text-primary)",
                    textDecoration: item.done ? "line-through" : "none",
                    opacity: item.done ? 0.6 : 1
                  }}>
                    {item.text}
                  </span>
                  {!note.isSharedAnnouncement && (
                    <button 
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", opacity: 0.3, marginLeft: "auto" }}
                    >
                      ❌
                    </button>
                  )}
                </div>
              ))}
              
              {!note.isSharedAnnouncement && (
                <input
                  type="text"
                  placeholder="+ Add task to checklist..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddChecklistItem((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: "1px dashed var(--border-gold)",
                    outline: "none",
                    fontSize: "0.95rem",
                    padding: "0.25rem 0",
                    color: "var(--text-primary)",
                    marginTop: "0.6rem"
                  }}
                />
              )}
            </div>
          ) : (
            /* Normal Textarea */
            note.isSharedAnnouncement ? (
              <div 
                style={{
                  fontSize: "1rem",
                  color: "var(--text-primary)",
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap"
                }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start typing your note here..."
                style={{
                  width: "100%",
                  height: "90%",
                  background: "none",
                  border: "none",
                  resize: "none",
                  outline: "none",
                  fontSize: "0.95rem",
                  lineHeight: "1.6",
                  color: "var(--text-primary)",
                  fontFamily: "inherit"
                }}
              />
            )
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${activeTheme.headerBorder}`, paddingTop: "1rem", marginTop: "1rem" }}>
          
          {/* Colors Selection (Modal) */}
          {!note.isSharedAnnouncement ? (
            <div style={{ display: "flex", gap: "0.35rem" }}>
              {["default", "yellow", "blue", "green", "red"].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    border: color === c ? "2px solid #000" : "1px solid rgba(0,0,0,0.15)",
                    background: c === "default" ? "#FFFFFF" : 
                                c === "yellow" ? "#FEF08A" : 
                                c === "blue" ? "#BFDBFE" : 
                                c === "green" ? "#BBF7D0" : "#FECACA",
                    cursor: "pointer",
                    padding: 0
                  }}
                  title={c}
                />
              ))}
            </div>
          ) : (
            <div />
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={onClose}
              className="btn-glass"
              style={{ padding: "0.45rem 1.25rem", fontSize: "0.85rem" }}
            >
              {note.isSharedAnnouncement ? "Close Focus View" : "Close without Saving"}
            </button>

            {!note.isSharedAnnouncement && (
              <button
                onClick={handleManualSave}
                className="btn-gold"
                disabled={isSaving}
                style={{ padding: "0.45rem 1.25rem", fontSize: "0.85rem" }}
              >
                {isSaving ? "Saving..." : "Save Remarks"}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
