"use client";

import React, { useState, useEffect, useTransition } from "react";
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
  Users
} from "lucide-react";
import { toast } from "react-hot-toast";
import { 
  createPersonalNoteAction, 
  updatePersonalNoteAction, 
  deletePersonalNoteAction, 
  sharePersonalNoteWithTeamAction,
  cloneSharedAnnouncementAction
} from "@/app/actions/personalNotes";
import NotificationBell from "./NotificationBell";

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
  sharedFromTlName: string | null;
  sharedFromNoteId: string | null;
  category: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
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

export default function PersonalNotesDashboard({ initialNotes, user }: PersonalNotesDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<PersonalNote[]>(initialNotes);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("ALL");

  // Fullscreen expanded note card state
  const [expandedNote, setExpandedNote] = useState<PersonalNote | null>(null);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const handleAddNewNote = async () => {
    startTransition(async () => {
      try {
        const res = await createPersonalNoteAction({
          title: "Untitled Note",
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

  const handleShareWithTeam = async (id: string) => {
    if (!confirm("Are you sure you want to share this note as an announcement with all your assigned Sales Associates?")) return;
    startTransition(async () => {
      try {
        const res = await sharePersonalNoteWithTeamAction(id);
        if (res.success) {
          toast.success(`Note shared! Cloned into ${res.count} associates' workspaces.`);
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to share note.");
      }
    });
  };

  // Filter notes
  const filteredNotes = notes.filter(n => {
    const matchesSearch = 
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      activeCategoryFilter === "ALL" || 
      n.category === activeCategoryFilter;

    return matchesSearch && matchesCategory;
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
        border: "1px solid var(--border-dim)"
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
              placeholder="Search notes title or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="header-search-input"
            />
          </div>

          {/* Category Filter buttons */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>Filter:</span>
            {["ALL", "Work", "Personal", "Ideas", "Urgent"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={activeCategoryFilter === cat ? "btn-gold" : "btn-glass"}
                style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem", height: "auto" }}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Add New Note Float/Sticky button */}
          <button
            onClick={handleAddNewNote}
            className="btn-gold"
            disabled={isPending}
            style={{ padding: "0.45rem 1.2rem", gap: "0.4rem" }}
          >
            <Plus size={16} />
            <span>ADD NEW NOTE</span>
          </button>
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
  onShare: (id: string) => void;
  onClone: (id: string) => void;
  onExpand: (note: PersonalNote) => void;
}

function NoteCard({ note, userRole, onDelete, onShare, onClone, onExpand }: NoteCardProps) {
  const [localTitle, setLocalTitle] = useState(note.title);
  const [localContent, setLocalContent] = useState(note.content);
  const [localColor, setLocalColor] = useState(note.color);
  const [localCategory, setLocalCategory] = useState(note.category || "Work");
  const [localIsPinned, setLocalIsPinned] = useState(note.isPinned);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isCopied, setIsCopied] = useState(false);

  // Debounced auto-save effect
  useEffect(() => {
    if (
      localTitle === note.title &&
      localContent === note.content &&
      localColor === note.color &&
      localCategory === note.category &&
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
          category: localCategory,
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
  }, [localTitle, localContent, localColor, localCategory, localIsPinned]);

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
    if (note.isSharedAnnouncement) return; // read-only
    const updated = checklistItems.map(item => 
      item.id === itemId ? { ...item, done } : item
    );
    setLocalContent(JSON.stringify(updated));
  };

  const handleAddChecklistItem = (text: string) => {
    if (!text.trim()) return;
    const newItem = { id: `item-${Date.now()}-${Math.random()}`, text: text.trim(), done: false };
    const updated = [...checklistItems, newItem];
    setLocalContent(JSON.stringify(updated));
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    const updated = checklistItems.filter(item => item.id !== itemId);
    setLocalContent(JSON.stringify(updated));
  };

  const handleToggleMode = () => {
    if (note.isSharedAnnouncement) return; // read-only
    startTransition(async () => {
      try {
        const nextIsChecklist = !note.isChecklist;
        let nextContent = localContent;
        if (nextIsChecklist) {
          // Convert plaintext newline list to JSON checklist
          const items = localContent
            .split("\n")
            .filter(line => line.trim().length > 0)
            .map((line, idx) => ({ id: `item-${idx}-${Date.now()}`, text: line, done: false }));
          nextContent = JSON.stringify(items);
        } else {
          // Convert JSON checklist back to plaintext
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
        // Reload component
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

  const [, startTransition] = useTransition();

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
        border: `1px solid ${activeTheme.border}`,
        boxShadow: `0 4px 20px ${activeTheme.glow}`,
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
          📢 Team Announcement
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
          <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-primary)" }}>{localTitle}</span>
        ) : (
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            style={{
              background: "none",
              border: "none",
              fontWeight: 800,
              fontSize: "0.95rem",
              color: "var(--text-primary)",
              outline: "none",
              width: "70%"
            }}
            placeholder="Note Title..."
          />
        )}

        {/* Header Tools */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          
          {/* Pinned Status Toggle */}
          {!note.isSharedAnnouncement && (
            <button
              onClick={() => setLocalIsPinned(!localIsPinned)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.2rem",
                color: localIsPinned ? "#EF4444" : "var(--text-muted)",
                opacity: localIsPinned ? 1 : 0.4
              }}
              title={localIsPinned ? "Unpin Note" : "Pin to Top"}
            >
              <Pin size={15} style={{ fill: localIsPinned ? "#EF4444" : "none" }} />
            </button>
          )}

          {/* Fullscreen expanded */}
          <button
            onClick={() => onExpand({ ...note, title: localTitle, content: localContent, color: localColor, category: localCategory, isPinned: localIsPinned })}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.2rem",
              color: "var(--text-muted)",
              opacity: 0.6
            }}
            title="Expand Fullscreen"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      {/* Category Tag Selection */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
        {note.isSharedAnnouncement ? (
          <span className="badge developer" style={{ fontSize: "0.62rem", padding: "0.1rem 0.4rem" }}>
            {localCategory?.toUpperCase() || "WORK"}
          </span>
        ) : (
          <select
            value={localCategory}
            onChange={(e) => setLocalCategory(e.target.value)}
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "var(--gold-premium)",
              background: "rgba(0, 119, 182, 0.05)",
              border: "1px solid rgba(0, 119, 182, 0.15)",
              borderRadius: "4px",
              padding: "0.1rem 0.25rem",
              outline: "none",
              cursor: "pointer"
            }}
          >
            <option value="Work">WORK</option>
            <option value="Personal">PERSONAL</option>
            <option value="Ideas">IDEAS</option>
            <option value="Urgent">URGENT</option>
          </select>
        )}

        {/* Mode indicator badge click toggle */}
        {!note.isSharedAnnouncement && (
          <button
            onClick={handleToggleMode}
            style={{
              fontSize: "0.62rem",
              fontWeight: 700,
              color: note.isChecklist ? "var(--color-success)" : "var(--gold-premium)",
              background: note.isChecklist ? "rgba(46, 196, 182, 0.06)" : "rgba(2, 62, 138, 0.06)",
              border: note.isChecklist ? "1px solid rgba(46, 196, 182, 0.2)" : "1px solid rgba(2, 62, 138, 0.2)",
              borderRadius: "4px",
              padding: "0.1rem 0.4rem",
              cursor: "pointer"
            }}
            title="Click to toggle standard text / checklist format"
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
                  disabled={note.isSharedAnnouncement}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: note.isSharedAnnouncement ? "default" : "pointer",
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
                {!note.isSharedAnnouncement && (
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
                placeholder="+ Add checklist task..."
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
              onChange={(e) => setLocalContent(e.target.value)}
              placeholder="Start typing your note remarks here... Use **bold**, *italic*, or __underline__ for formatting."
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

      {/* Card Footer */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        borderTop: `1px solid ${activeTheme.headerBorder}`, 
        paddingTop: "0.6rem",
        marginTop: "0.85rem"
      }}>
        {/* Timestamp */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontStyle: "italic" }}>
            Updated: {formatDate(note.updatedAt || note.createdAt)}
          </span>
          {saveStatus === "saving" && (
            <span style={{ fontSize: "0.6rem", color: "var(--gold-premium)", fontWeight: 700 }}>
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span style={{ fontSize: "0.6rem", color: "#2EC4B6", fontWeight: 700 }}>
              ✓ Saved
            </span>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          
          {/* Color Picker tool */}
          {!note.isSharedAnnouncement && (
            <div style={{ display: "flex", gap: "0.15rem" }}>
              {["default", "yellow", "blue", "green", "red"].map((c) => (
                <button
                  key={c}
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
                    cursor: "pointer",
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

          {/* Share announcement (Team Lead only) */}
          {userRole === "TEAM_LEAD" && !note.isSharedAnnouncement && (
            note.isSharedByMe ? (
              <span 
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  color: "#2EC4B6",
                  background: "rgba(46, 196, 182, 0.1)",
                  border: "1px solid rgba(46, 196, 182, 0.25)",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "4px",
                  gap: "0.25rem",
                  cursor: "default"
                }}
                title="This note has been shared with your team."
              >
                <Users size={12} />
                Shared
              </span>
            ) : (
              <button
                onClick={() => onShare(note.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.2rem",
                  color: "var(--gold-premium)"
                }}
                title="Share with Team"
              >
                <Share2 size={14} />
              </button>
            )
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

          {/* Delete Card */}
          <button
            onClick={() => onDelete(note.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.2rem",
              color: "var(--color-danger)"
            }}
            title="Delete Note"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================
   FULLSCREEN FOCUS MODAL OVERLAY
   ========================================== */
interface FullscreenModalProps {
  note: PersonalNote;
  userRole: string;
  onClose: () => void;
  onSave: (id: string, data: any) => Promise<void>;
}

function FullscreenModal({ note, userRole, onClose, onSave }: FullscreenModalProps) {
  const [title, setTitle] = useState(note.title);
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
              {note.isSharedAnnouncement ? `Announcement: ${note.sharedFromTlName}` : `Fullscreen Focus Mode — ${category}`}
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
                placeholder="Start typing long-form notes..."
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
