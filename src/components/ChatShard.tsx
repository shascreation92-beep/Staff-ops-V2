"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { sendChatMessageAction } from "@/app/actions/chat";
import { useSearchParams } from "next/navigation";
import { 
  Send, 
  Search, 
  MessageSquare, 
  Smile, 
  Check, 
  CheckCheck,
  Activity,
  Paperclip,
  X
} from "lucide-react";
import { user_role } from "@prisma/client";
import { toast } from "react-hot-toast";

interface ChatShardProps {
  currentUser: {
    id: string;
    role: user_role;
    email?: string | null;
    name?: string | null;
  };
  users: any[];
  initialMessages: any[];
}

export default function ChatShard({
  currentUser,
  users,
  initialMessages
}: ChatShardProps) {
  const searchParams = useSearchParams();
  const contactId = searchParams.get("contactId");

  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<any[]>(initialMessages);
  const [activeContact, setActiveContact] = useState<any | null>(() => {
    if (contactId) {
      const found = users.find(u => u.id === contactId);
      if (found) return found;
    }
    return users.find(u => u.id !== currentUser.id) || null;
  });
  const [inputText, setInputText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Broadcast Panel states
  const [selectedBroadcastRecipients, setSelectedBroadcastRecipients] = useState<string[]>([]);
  const [broadcastMessageText, setBroadcastMessageText] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Filter contacts by search query
  const filteredContacts = users.filter(u => 
    u.id !== currentUser.id && 
    (u.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sync activeContact if query param contactId changes
  useEffect(() => {
    if (contactId) {
      const found = users.find(u => u.id === contactId);
      if (found) {
        setActiveContact(found);
      }
    }
  }, [contactId, users]);

  // Reset typing state and search on contact change
  useEffect(() => {
    setIsTyping(false);
    setChatSearchQuery("");
    setShowChatSearch(false);
  }, [activeContact]);

  // Poll for new messages every 3 seconds to simulate real-time updates
  useEffect(() => {
    const fetchLatestMessages = async () => {
      if (!activeContact || activeContact === "BROADCAST") return;
      try {
        const res = await fetch(`/api/chat/messages?contactId=${activeContact.id}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
          
          // If we receive simulated replies, stop the typing simulation
          const hasReplied = data.some(
            (m: any) => m.senderId === activeContact.id && (
              m.message.includes("Copy that! Operations are fully monitored") ||
              m.message.includes("System diagnosis payload sent successfully")
            )
          );
          if (hasReplied) {
            setIsTyping(false);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchLatestMessages();
    const interval = setInterval(fetchLatestMessages, 3000);
    return () => clearInterval(interval);
  }, [activeContact]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Compute live statistics for the active colleague (Sales Associate or Team Lead)
  const getColleagueStats = (contact: any) => {
    if (!contact || contact === "BROADCAST") return { totalIds: 0, fbAccounts: 0, vintedAccounts: 0, unverifiedAccounts: 0, suspendedAccounts: 0 };
    
    let allAccounts: any[] = [];
    if (contact.account_account_createdByIdTouser) {
      allAccounts = [...contact.account_account_createdByIdTouser];
    }
    
    if (contact.role === "TEAM_LEAD") {
      // Find all team members belonging to this lead
      const teamMembers = users.filter(u => u.teamLeadId === contact.id);
      teamMembers.forEach(tm => {
        if (tm.account_account_createdByIdTouser) {
          allAccounts.push(...tm.account_account_createdByIdTouser);
        }
      });
    }

    const totalIds = allAccounts.length;
    let fbAccounts = 0;
    let vintedAccounts = 0;
    let unverifiedAccounts = 0;
    let suspendedAccounts = 0;

    allAccounts.forEach(acc => {
      const platformName = (acc.platform?.name || "").toLowerCase();
      if (platformName.includes("facebook")) {
        fbAccounts++;
      } else if (platformName.includes("vinted")) {
        vintedAccounts++;
      }

      if (acc.verificationStatus === "No") {
        unverifiedAccounts++;
      }

      if (acc.issueType === "Suspended") {
        suspendedAccounts++;
      }
    });

    return {
      totalIds,
      fbAccounts,
      vintedAccounts,
      unverifiedAccounts,
      suspendedAccounts
    };
  };

  // Compute dynamic operational status info for each colleague
  const getColleagueStatusInfo = (c: any) => {
    if (c.role === "SUPER_ADMIN") {
      return { label: "Active (Online)", color: "#10B981", isCritical: false, pulse: false };
    }
    
    // Calculate critical ratio for all team leads to identify the weakest team lead
    const tls = users.filter(u => u.role === "TEAM_LEAD");
    let worstTlId = "";
    let highestRatio = 0;
    
    tls.forEach(tl => {
      const stats = getColleagueStats(tl);
      if (stats.totalIds > 0) {
        const ratio = (stats.unverifiedAccounts + stats.suspendedAccounts) / stats.totalIds;
        if (ratio > highestRatio) {
          highestRatio = ratio;
          worstTlId = tl.id;
        }
      }
    });

    const isMemberOfWeakestTeam = c.id === worstTlId || c.teamLeadId === worstTlId;
    
    if (isMemberOfWeakestTeam && highestRatio > 0) {
      return { label: "🚨 Critical Alert", color: "#EF4444", isCritical: true, pulse: true };
    }

    const colleagueStats = getColleagueStats(c);
    if (colleagueStats.unverifiedAccounts > 0 || colleagueStats.suspendedAccounts > 0) {
      return { label: "Busy (Resolving Issues)", color: "#F59E0B", isCritical: false, pulse: false };
    }

    return { label: "Active (Online)", color: "#10B981", isCritical: false, pulse: false };
  };

  // Direct Message submit helper
  const submitMessageDirectly = (text: string) => {
    if (!activeContact || activeContact === "BROADCAST") return;
    const tempId = crypto.randomUUID();
    const optimisticMessage = {
      id: tempId,
      senderId: currentUser.id,
      receiverId: activeContact.id,
      message: text,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMessage]);

    startTransition(async () => {
      try {
        await sendChatMessageAction({
          receiverId: activeContact.id,
          message: text
        });

        // Simulating interactive chatbot responses after sending
        setTimeout(() => {
          setIsTyping(true);
        }, 1000);

        setTimeout(async () => {
          try {
            let responseText = `Copy that! Operations are fully monitored. (${activeContact.role.replace("_", " ")})`;
            if (text.includes("📎 ATTACHMENT")) {
              responseText = `Received attachment log. System diagnosis payload sent successfully.`;
            }

            await fetch(`/api/chat/simulate-reply`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                senderId: activeContact.id,
                receiverId: currentUser.id,
                message: responseText
              })
            });
            setIsTyping(false);
          } catch (e) {
            console.error(e);
            setIsTyping(false);
          }
        }, 3500);

      } catch (err: any) {
        toast.error(err.message || "Failed to transmit message.");
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setIsTyping(false);
      }
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeContact || activeContact === "BROADCAST") return;

    const text = inputText.trim();

    // Check if input is a slash command
    if (text.startsWith("/")) {
      executeSlashCommand(text);
      return;
    }

    setInputText("");
    setShowEmojiPicker(false);
    submitMessageDirectly(text);
  };

  const executeSlashCommand = (cmd: string) => {
    setInputText("");
    if (!activeContact || activeContact === "BROADCAST") return;

    const parsed = cmd.split(" ")[0].toLowerCase();
    
    if (parsed === "/clear") {
      setMessages([]);
      toast.success("Chat history cleared from active session!");
    } else if (parsed === "/alert") {
      const text = "⚠️ PRIORITY OPERATIONS ALERT: Immediate performance optimization required for active ID allocations.";
      submitMessageDirectly(text);
      toast.success("Operations alert dispatched!");
    } else if (parsed === "/stats") {
      const stats = getColleagueStats(activeContact);
      const text = `📊 SYSTEM REPORT - ${activeContact.name}:\n• Total IDs: ${stats.totalIds}\n• Unverified: ${stats.unverifiedAccounts}\n• Suspended: ${stats.suspendedAccounts}\n• FB/Vinted: ${stats.fbAccounts}/${stats.vintedAccounts}`;
      submitMessageDirectly(text);
      toast.success("Colleague stats loaded into thread.");
    } else {
      toast.error("Unknown operational command. Use /stats, /alert, or /clear.");
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBroadcastRecipients.length === 0 || !broadcastMessageText.trim()) return;

    const text = broadcastMessageText.trim();
    setIsBroadcasting(true);

    startTransition(async () => {
      let successCount = 0;
      let errorCount = 0;

      for (const recipientId of selectedBroadcastRecipients) {
        try {
          await sendChatMessageAction({
            receiverId: recipientId,
            message: text
          });

          // Append to messages log locally
          const tempId = crypto.randomUUID();
          const optimisticMsg = {
            id: tempId,
            senderId: currentUser.id,
            receiverId: recipientId,
            message: text,
            isRead: false,
            createdAt: new Date().toISOString()
          };
          setMessages(prev => [...prev, optimisticMsg]);
          
          successCount++;
        } catch (err) {
          console.error(`Failed to broadcast message to user ${recipientId}:`, err);
          errorCount++;
        }
      }

      setIsBroadcasting(false);
      if (successCount > 0) {
        toast.success(`Announcement broadcast successfully to ${successCount} colleagues!`);
        setBroadcastMessageText("");
        setSelectedBroadcastRecipients([]);
        
        // Auto-select the first recipient to view progress
        const firstRecipient = users.find(u => u.id === selectedBroadcastRecipients[0]);
        if (firstRecipient) {
          setActiveContact(firstRecipient);
        }
      } else {
        toast.error("Failed to transmit broadcast announcements.");
      }
    });
  };

  const addEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Filter messages belonging to the active thread and by search query
  const activeMessages = messages.filter(m => 
    activeContact && activeContact !== "BROADCAST" && (
      (m.senderId === currentUser.id && m.receiverId === activeContact.id) ||
      (m.senderId === activeContact.id && m.receiverId === currentUser.id)
    )
  );

  const filteredMessages = activeMessages.filter(m => 
    !chatSearchQuery.trim() || 
    m.message.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

  const handleSendAttachment = (fileName: string, fileType: string) => {
    setShowAttachmentModal(false);
    const text = `📎 ATTACHMENT [${fileType}]: ${fileName}`;
    submitMessageDirectly(text);
    toast.success("Attachment file dispatched!");
  };

  const emojis = ["👍", "👌", "🔥", "🤝", "🚀", "💻", "✅", "⚠️", "👑", "👀"];

  // Slash commands auto-suggestions
  const showCommandSuggestions = inputText.startsWith("/");
  const commandOptions = [
    { name: "/stats", desc: "Dump colleague stats directly into chat feed" },
    { name: "/alert", desc: "Dispatch a high-priority warning alert notification" },
    { name: "/clear", desc: "Clear local thread message histories" }
  ].filter(c => c.name.toLowerCase().startsWith(inputText.toLowerCase()));

  const activeStatusInfo = activeContact && activeContact !== "BROADCAST" ? getColleagueStatusInfo(activeContact) : null;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: activeContact && activeContact !== "BROADCAST" ? "280px 1fr 300px" : "280px 1fr",
      height: "100%",
      flex: 1,
      minHeight: 0,
      background: "#FFFFFF",
      overflow: "hidden",
      transition: "grid-template-columns 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
    }}>
      
      {/* Custom CSS for new message animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .message-bubble-animate {
          animation: slideInFromBottom 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes pulseAlert {
          0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          50% { transform: scale(1.1); opacity: 0.8; box-shadow: 0 0 6px 3px rgba(239, 68, 68, 0.3); }
        }
        .pulse-critical-dot {
          animation: pulseAlert 1.5s infinite;
        }
      ` }} />

      {/* Sidebar (User List) - Independent Scroll Area */}
      <div style={{
        borderRight: "1px solid var(--border-dim)",
        display: "flex",
        flexDirection: "column",
        background: "#F9FAFB",
        height: "100%",
        minHeight: 0,
        overflow: "hidden"
      }}>
        {/* Broadcast Announcement Button */}
        <div
          onClick={() => setActiveContact("BROADCAST")}
          className={`chat-channel-item ${activeContact === "BROADCAST" ? 'active' : ''}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem",
            background: activeContact === "BROADCAST" ? "rgba(2, 80, 161, 0.08)" : "transparent",
            border: activeContact === "BROADCAST" ? "1px solid rgba(2, 80, 161, 0.15)" : "1px solid transparent",
            borderRadius: "8px",
            cursor: "pointer",
            margin: "0.75rem 0.5rem 0.25rem 0.5rem",
            transition: "all 0.2s"
          }}
        >
          <div className="user-avatar-gold" style={{
            width: "2.25rem",
            height: "2.25rem",
            fontSize: "1rem",
            borderRadius: "50%",
            background: activeContact === "BROADCAST" ? "var(--gold-gradient)" : "rgba(2, 80, 161, 0.08)",
            color: activeContact === "BROADCAST" ? "#FFFFFF" : "#0250A1",
            border: "1px solid var(--border-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            📢
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)" }}>
              Broadcast Announcement
            </span>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Transmit to multiple colleagues
            </span>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-dim)" }}>
          <div className="table-search-wrapper" style={{ width: "100%" }}>
            <Search className="header-search-icon" size={16} />
            <input
              type="text"
              placeholder="Search team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="header-search-input"
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.5rem 0.4rem 2rem" }}
            />
          </div>
        </div>

        {/* Directory header */}
        <div style={{
          padding: "0.75rem 1rem 0.25rem 1rem",
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "var(--gold-premium)",
          letterSpacing: "0.08em",
          textTransform: "uppercase"
        }}>
          Direct Communications
        </div>

        {/* User list container with independent scroll */}
        <div style={{ 
          flex: 1, 
          overflowY: "auto", 
          padding: "0.5rem", 
          display: "flex", 
          flexDirection: "column", 
          gap: "0.2rem",
          minHeight: 0
        }}>
          {filteredContacts.length === 0 ? (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem" }}>
              No teammates found.
            </div>
          ) : (
            filteredContacts.map((c) => {
              const isActive = activeContact && activeContact !== "BROADCAST" && activeContact.id === c.id;
              const initials = getInitials(c.name || "User");
              const statusInfo = getColleagueStatusInfo(c);
              
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveContact(c)}
                  className={`chat-channel-item ${isActive ? 'active' : ''}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.6rem 0.75rem",
                    background: isActive ? "rgba(2, 80, 161, 0.06)" : "transparent",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                >
                  <div className="user-avatar-gold" style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "50%",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <img 
                      src={c.image || "/uploads/avatars/default-avatar.png"} 
                      alt={c.name || "User"} 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: isActive ? "var(--text-primary)" : "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.name}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.role.replace(/_/g, " ")}
                    </span>
                  </div>
                  
                  {/* Dynamic Status Dot Indicator */}
                  <div 
                    className={statusInfo.pulse ? "pulse-critical-dot" : ""}
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: statusInfo.color,
                      transition: "background 0.3s ease"
                    }} 
                    title={statusInfo.label}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat / Broadcast Area */}
      {activeContact === "BROADCAST" ? (
        /* Multi-User Broadcast Panel */
        <div style={{ display: "flex", flexDirection: "column", background: "#FFFFFF", height: "100%", padding: "1.5rem", minHeight: 0, overflow: "hidden" }}>
          <div style={{ borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>📢 Broadcast Operations Announcement</h3>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              Transmit a system announcement simultaneously to multiple colleague direct threads.
            </p>
          </div>

          <form onSubmit={handleSendBroadcast} style={{ display: "flex", flex: 1, flexDirection: "column", gap: "1.25rem", minHeight: 0 }}>
            {/* Scrollable Recipient list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, minHeight: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--gold-premium)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Select Recipients ({selectedBroadcastRecipients.length} Selected)
                </span>
                
                {/* Quick Select Panel */}
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBroadcastRecipients(users.filter(u => u.id !== currentUser.id).map(u => u.id));
                    }}
                    className="btn-glass"
                    style={{ padding: "0.2rem 0.4rem", fontSize: "0.62rem", height: "auto" }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBroadcastRecipients(users.filter(u => u.id !== currentUser.id && u.role === "TEAM_LEAD").map(u => u.id));
                    }}
                    className="btn-glass"
                    style={{ padding: "0.2rem 0.4rem", fontSize: "0.62rem", height: "auto" }}
                  >
                    Team Leads
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBroadcastRecipients(users.filter(u => u.id !== currentUser.id && u.role === "SALES_ASSOCIATE").map(u => u.id));
                    }}
                    className="btn-glass"
                    style={{ padding: "0.2rem 0.4rem", fontSize: "0.62rem", height: "auto" }}
                  >
                    Associates
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBroadcastRecipients([])}
                    className="btn-glass"
                    style={{ padding: "0.2rem 0.4rem", fontSize: "0.62rem", height: "auto", color: "var(--color-danger)" }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Recipient Checkboxes List Container */}
              <div style={{
                border: "1px solid var(--border-dim)",
                borderRadius: "8px",
                padding: "0.75rem",
                background: "#F9FAFB",
                overflowY: "auto",
                flex: 1,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.6rem",
                minHeight: 0
              }}>
                {users
                  .filter(u => u.id !== currentUser.id)
                  .map(u => {
                    const isChecked = selectedBroadcastRecipients.includes(u.id);
                    const statusInfo = getColleagueStatusInfo(u);
                    return (
                      <label
                        key={u.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          padding: "0.4rem 0.6rem",
                          background: isChecked ? "#FFFFFF" : "transparent",
                          border: isChecked ? "1px solid var(--gold-glow)" : "1px solid transparent",
                          borderRadius: "6px",
                          cursor: "pointer",
                          boxShadow: isChecked ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                          transition: "all 0.15s"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBroadcastRecipients(prev => [...prev, u.id]);
                            } else {
                              setSelectedBroadcastRecipients(prev => prev.filter(id => id !== u.id));
                            }
                          }}
                          style={{ accentColor: "var(--gold-primary)", cursor: "pointer" }}
                        />
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
                          <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>{u.role.replace(/_/g, " ")}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <span style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: statusInfo.color }} />
                          <span style={{ fontSize: "0.62rem", fontWeight: 600, color: statusInfo.color }}>
                            {statusInfo.label.replace(/🚨/g, "").trim()}
                          </span>
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Broadcast Composer */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexShrink: 0 }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                Broadcast Announcement Message
              </label>
              <textarea
                rows={3}
                value={broadcastMessageText}
                onChange={(e) => setBroadcastMessageText(e.target.value)}
                placeholder="Compose announcement message payload..."
                className="input-gold"
                style={{ width: "100%", padding: "0.6rem 0.75rem", fontSize: "0.82rem", resize: "none", height: "80px" }}
                disabled={isBroadcasting}
              />
              <button
                type="submit"
                disabled={isBroadcasting || selectedBroadcastRecipients.length === 0 || !broadcastMessageText.trim()}
                className="btn-gold"
                style={{ alignSelf: "flex-end", padding: "0.5rem 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem" }}
              >
                {isBroadcasting ? "Transmitting Announcement..." : `Transmit Broadcast to ${selectedBroadcastRecipients.length} Recipients`}
              </button>
            </div>
          </form>
        </div>
      ) : activeContact ? (
        /* Standard Direct Messaging Feed */
        <div style={{ display: "flex", flexDirection: "column", background: "#FFFFFF", height: "100%", minHeight: 0, overflow: "hidden" }}>
          {/* Sticky Header displaying Name, Role/Designation, and green status dot */}
          <div style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid var(--border-dim)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#FFFFFF",
            position: "sticky",
            top: 0,
            zIndex: 10,
            height: "70px",
            flexShrink: 0
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div className="user-avatar-gold" style={{ width: "2.5rem", height: "2.5rem", borderRadius: "50%", position: "relative", overflow: "visible" }}>
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img 
                    src={activeContact.image || "/uploads/avatars/default-avatar.png"} 
                    alt={activeContact.name || "User"} 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  />
                </div>
                {/* Active status dot on avatar */}
                <div 
                  className={activeStatusInfo?.pulse ? "pulse-critical-dot" : ""}
                  style={{
                    position: "absolute",
                    bottom: "1px",
                    right: "1px",
                    width: "9px",
                    height: "9px",
                    borderRadius: "50%",
                    background: activeStatusInfo?.color || "#10B981",
                    border: "2px solid #FFFFFF",
                    boxShadow: `0 0 4px ${activeStatusInfo?.color || "#10B981"}`
                  }} 
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>{activeContact.name}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500 }}>
                  {activeContact.role.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Message History Search and Status / Typing Indicators */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {showChatSearch ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", border: "1px solid var(--border-dim)", borderRadius: "4px", padding: "0.2rem 0.5rem" }}>
                  <Search size={14} style={{ color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    style={{ border: "none", outline: "none", fontSize: "0.75rem", width: "120px" }}
                  />
                  <button onClick={() => { setShowChatSearch(false); setChatSearchQuery(""); }} style={{ border: "none", background: "none", cursor: "pointer", display: "flex" }}>
                    <X size={14} style={{ color: "var(--text-muted)" }} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowChatSearch(true)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                  <Search size={18} />
                </button>
              )}

              <div style={{ display: "flex", alignItems: "center", minWidth: "120px", justifyContent: "flex-end" }}>
                {isTyping ? (
                  <span style={{ 
                    fontSize: "0.75rem", 
                    color: "#0250A1", 
                    fontWeight: 700, 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "0.25rem" 
                  }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0250A1] animate-bounce" style={{ display: "inline-block", animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0250A1] animate-bounce" style={{ display: "inline-block", animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0250A1] animate-bounce" style={{ display: "inline-block", animationDelay: "300ms" }} />
                    <span>typing...</span>
                  </span>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", color: activeStatusInfo?.color || "#10B981", fontWeight: 700 }}>
                    <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: activeStatusInfo?.color || "#10B981" }} className={activeStatusInfo?.pulse ? "pulse-critical-dot" : ""} />
                    <span style={{ textTransform: "uppercase" }}>{activeStatusInfo?.label}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Message Feed - Independent Scroll Region */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            background: "#FAFBFB",
            minHeight: 0
          }}>
            {filteredMessages.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: "0.5rem" }}>
                <MessageSquare size={36} style={{ color: "var(--border-gold)" }} />
                <span style={{ fontSize: "0.8rem" }}>
                  {chatSearchQuery ? "No matches found." : "No previous transmission logs. Start chatting below!"}
                </span>
              </div>
            ) : (
              filteredMessages.map((m) => {
                const isOwn = m.senderId === currentUser.id;
                const isAttachment = m.message.startsWith("📎 ATTACHMENT");
                
                let fileName = "";
                let fileType = "";
                let cleanMessage = m.message;

                if (isAttachment) {
                  const match = m.message.match(/📎 ATTACHMENT \[(.*?)\]: (.*)/);
                  if (match) {
                    fileType = match[1];
                    fileName = match[2];
                  }
                }

                return (
                  <div 
                    key={m.id}
                    className="message-bubble-animate"
                    style={{
                      display: "flex",
                      justifyContent: isOwn ? "flex-end" : "flex-start",
                      width: "100%"
                    }}
                  >
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      background: isOwn ? "#0250A1" : "#EAEBEF",
                      color: isOwn ? "#FFFFFF" : "var(--text-primary)",
                      padding: "0.65rem 0.9rem",
                      borderRadius: isOwn ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      maxWidth: "60%",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      position: "relative"
                    }}>
                      
                      {/* Structured media preview card for future image/thumbnail rendering */}
                      {isAttachment && (
                        <div className="media-preview-container" style={{
                          background: isOwn ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.04)",
                          border: "1px solid rgba(0, 0, 0, 0.08)",
                          borderRadius: "8px",
                          padding: "0.75rem",
                          marginBottom: "0.5rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          width: "220px"
                        }}>
                          <div style={{
                            width: "2.25rem",
                            height: "2.25rem",
                            background: isOwn ? "#FFFFFF" : "var(--gold-primary)",
                            color: isOwn ? "#0250A1" : "#FFFFFF",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.2rem",
                            fontWeight: "bold"
                          }}>
                            {fileType === "image" ? "🖼️" : fileType === "csv" ? "📊" : "📄"}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {fileName}
                            </span>
                            <span style={{ fontSize: "0.62rem", opacity: 0.8 }}>
                              {fileType === "image" ? "1.2 MB • PNG Image" : fileType === "csv" ? "12 KB • CSV Sheet" : "8 KB • Text Log"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Message payload */}
                      <span style={{ fontSize: "0.86rem", lineHeight: "1.4", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                        {isAttachment ? `Sent attachment file: ${fileName}` : cleanMessage}
                      </span>

                      {/* Timestamp & Receipts checkmarks inside bubble (bottom-right) */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "0.2rem",
                        fontSize: "0.62rem",
                        color: isOwn ? "rgba(255, 255, 255, 0.75)" : "var(--text-muted)",
                        marginTop: "0.25rem",
                        alignSelf: "flex-end",
                        fontFamily: "var(--font-mono)"
                      }}>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isOwn && (
                          m.isRead ? (
                            <CheckCheck size={11} style={{ color: "#34D399" }} />
                          ) : (
                            <Check size={11} style={{ color: "rgba(255, 255, 255, 0.6)" }} />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pinned Input Bar at Bottom */}
          <form onSubmit={handleSendMessage} style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--border-dim)",
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            position: "relative",
            flexShrink: 0
          }}>
            
            {/* Interactive Slash Commands Popup suggestions */}
            {showCommandSuggestions && commandOptions.length > 0 && (
              <div className="glass-panel" style={{
                position: "absolute",
                bottom: "100%",
                left: "1.5rem",
                right: "1.5rem",
                marginBottom: "0.5rem",
                padding: "0.5rem",
                background: "#FFFFFF",
                zIndex: 200,
                boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem"
              }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--gold-premium)", padding: "0.25rem 0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Operational Shortcuts
                </div>
                {commandOptions.map(c => (
                  <div
                    key={c.name}
                    onClick={() => executeSlashCommand(c.name)}
                    style={{
                      padding: "0.4rem 0.5rem",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.78rem"
                    }}
                    className="chat-channel-item"
                  >
                    <strong style={{ color: "#0250A1" }}>{c.name}</strong>
                    <span style={{ color: "var(--text-muted)" }}>{c.desc}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Attachment Clip selector button */}
            <button
              type="button"
              onClick={() => setShowAttachmentModal(!showAttachmentModal)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
              title="Simulate Attachment"
            >
              <Paperclip size={20} />
            </button>

            {/* Attachment selector popup */}
            {showAttachmentModal && (
              <div className="glass-panel" style={{
                position: "absolute",
                bottom: "100%",
                left: "1.5rem",
                marginBottom: "0.5rem",
                padding: "0.75rem",
                background: "#FFFFFF",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                width: "240px",
                boxShadow: "var(--shadow-premium)"
              }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--gold-premium)", textTransform: "uppercase" }}>
                  Select Simulated File
                </div>
                <button
                  type="button"
                  onClick={() => handleSendAttachment("error_diagnostics.png", "image")}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", textAlign: "left", padding: "0.25rem 0", color: "var(--text-secondary)" }}
                  className="chat-channel-item"
                >
                  🖼️ error_diagnostics.png
                </button>
                <button
                  type="button"
                  onClick={() => handleSendAttachment("sys_blockage.txt", "log")}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", textAlign: "left", padding: "0.25rem 0", color: "var(--text-secondary)" }}
                  className="chat-channel-item"
                >
                  📄 sys_blockage.txt
                </button>
                <button
                  type="button"
                  onClick={() => handleSendAttachment("operations_roster.csv", "csv")}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", textAlign: "left", padding: "0.25rem 0", color: "var(--text-secondary)" }}
                  className="chat-channel-item"
                >
                  📊 operations_roster.csv
                </button>
              </div>
            )}
            
            {/* Emoji Picker trigger */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{ background: "none", border: "none", color: "var(--gold-premium)", cursor: "pointer", display: "flex" }}
              >
                <Smile size={20} />
              </button>

              {showEmojiPicker && (
                <div className="glass-panel" style={{
                  position: "absolute",
                  bottom: "100%",
                  left: 0,
                  marginBottom: "0.5rem",
                  padding: "0.5rem",
                  display: "flex",
                  gap: "0.35rem",
                  zIndex: 100,
                  background: "#FFFFFF"
                }}>
                  {emojis.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => addEmoji(e)}
                      style={{ background: "none", border: "none", fontSize: "1.15rem", cursor: "pointer", padding: "0.2rem" }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              type="text"
              placeholder={showCommandSuggestions ? "Choose an operational shortcut..." : `Encrypt payload and send to ${activeContact.name}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="input-gold"
              style={{ flex: 1, height: "40px", fontSize: "0.85rem" }}
              disabled={isPending}
            />

            <button
              type="submit"
              disabled={isPending || !inputText.trim()}
              className="btn-gold"
              style={{ width: "40px", height: "40px", padding: 0 }}
            >
              <Send size={16} style={{ color: "var(--bg-primary)" }} />
            </button>
          </form>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: "0.5rem" }}>
          <MessageSquare size={48} style={{ color: "var(--border-gold)" }} />
          <span style={{ fontSize: "0.85rem" }}>No active communications sharding. Choose a colleague to chat.</span>
        </div>
      )}

      {/* Right Column details panel displaying active contact performance metrics */}
      {activeContact && activeContact !== "BROADCAST" && (
        <div style={{
          borderLeft: "1px solid var(--border-dim)",
          background: "#F9FAFB",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflowY: "auto",
          padding: "1.5rem"
        }}>
          {/* Profile summary */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", textAlign: "center", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border-dim)" }}>
            <div className="user-avatar-gold" style={{ width: "4.25rem", height: "4.25rem", borderRadius: "50%", overflow: "hidden" }}>
              <img 
                src={activeContact.image || "/uploads/avatars/default-avatar.png"} 
                alt={activeContact.name || "User"} 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>{activeContact.name}</h4>
              <span style={{
                fontSize: "0.65rem",
                fontWeight: 800,
                background: activeContact.role === "SUPER_ADMIN" ? "var(--gold-gradient)" : "rgba(2, 80, 161, 0.08)",
                color: activeContact.role === "SUPER_ADMIN" ? "#FFFFFF" : "#0250A1",
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "inline-block",
                alignSelf: "center"
              }}>
                {activeContact.role.replace(/_/g, " ")}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>{activeContact.email}</span>
            </div>
          </div>

          {/* Operational Stats Section */}
          <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h5 style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--gold-premium)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Operational Stats
            </h5>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div style={{ background: "#FFFFFF", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Total IDs</span>
                <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>{getColleagueStats(activeContact).totalIds}</span>
              </div>
              <div style={{ background: "#FFFFFF", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Unverified</span>
                <span style={{ fontSize: "1.2rem", fontWeight: 800, color: getColleagueStats(activeContact).unverifiedAccounts > 0 ? "#F59E0B" : "var(--text-primary)" }}>
                  {getColleagueStats(activeContact).unverifiedAccounts}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div style={{ background: "#FFFFFF", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Suspended</span>
                <span style={{ fontSize: "1.2rem", fontWeight: 800, color: getColleagueStats(activeContact).suspendedAccounts > 0 ? "#EF4444" : "var(--text-primary)" }}>
                  {getColleagueStats(activeContact).suspendedAccounts}
                </span>
              </div>
              <div style={{ background: "#FFFFFF", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>FB / Vinted</span>
                <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", paddingTop: "0.25rem" }}>
                  {getColleagueStats(activeContact).fbAccounts} / {getColleagueStats(activeContact).vintedAccounts}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
