"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { sendChatMessageAction } from "@/app/actions/chat";
import { 
  Send, 
  Search, 
  MessageSquare, 
  Smile, 
  Check, 
  CheckCheck,
  Clock,
  Terminal,
  Activity
} from "lucide-react";
import { user_role } from "@prisma/client";

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
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<any[]>(initialMessages);
  const [activeContact, setActiveContact] = useState<any | null>(users[0] || null);
  const [inputText, setInputText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";

  // Filter contacts by search query
  const filteredContacts = users.filter(u => 
    u.id !== currentUser.id && 
    (u.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Poll for new messages every 3 seconds to simulate real-time Pusher updates
  useEffect(() => {
    const fetchLatestMessages = async () => {
      if (!activeContact) return;
      try {
        const res = await fetch(`/api/chat/messages?contactId=${activeContact.id}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeContact) return;

    const text = inputText;
    setInputText("");
    setShowEmojiPicker(false);

    // Optimistically update message feed
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

        // Trigger a mock interactive response if sending to someone else
        // for an immersive demo experience
        setTimeout(async () => {
          try {
            await fetch(`/api/chat/simulate-reply`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                senderId: activeContact.id,
                receiverId: currentUser.id,
                message: `Copy that! Operations are fully monitored. (${activeContact.role.replace("_", " ")})`
              })
            });
          } catch (e) {
            console.error(e);
          }
        }, 3000);

      } catch (err: any) {
        alert(err.message);
        // Remove optimistic message on fail
        setMessages(prev => prev.filter(m => m.id !== tempId));
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

  const activeMessages = messages.filter(m => 
    activeContact && (
      (m.senderId === currentUser.id && m.receiverId === activeContact.id) ||
      (m.senderId === activeContact.id && m.receiverId === currentUser.id)
    )
  );

  const emojis = ["👍", "👌", "🔥", "🤝", "🚀", "💻", "✅", "⚠️", "👑", "👀"];

  return (
    <div className="glass-panel" style={{
      display: "grid",
      gridTemplateColumns: "280px 1fr",
      height: "calc(100vh - var(--header-height) - 7.5rem)",
      background: "#FFFFFF",
      border: "1px solid var(--border-dim)",
      borderRadius: "var(--border-radius-md)",
      overflow: "hidden",
      boxShadow: "var(--shadow-premium)"
    }}>
      
      {/* Sidebar: Teammates List */}
      <div style={{
        borderRight: "1px solid var(--border-dim)",
        display: "flex",
        flexDirection: "column",
        background: "#F9FAFB"
      }}>
        {/* Search */}
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--border-dim)" }}>
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

        {/* Contacts list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          {filteredContacts.length === 0 ? (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem" }}>
              No teammates found.
            </div>
          ) : (
            filteredContacts.map((c) => {
              const isActive = activeContact?.id === c.id;
              const initials = getInitials(c.name || "User");
              
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
                    background: isActive ? "rgba(0, 176, 116, 0.08)" : "transparent"
                  }}
                >
                  <div className="user-avatar-gold" style={{
                    width: "2rem",
                    height: "2rem",
                    fontSize: "0.75rem",
                    background: isActive ? "var(--gold-gradient)" : "rgba(0, 0, 0, 0.02)",
                    color: isActive ? "#FFFFFF" : "var(--gold-primary)",
                    border: isActive ? "1px solid var(--gold-glow)" : "1px solid var(--border-gold)"
                  }}>
                    {initials}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: isActive ? "var(--text-primary)" : "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.name}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.role.replace("_", " ")}
                    </span>
                  </div>
                  {/* Status dot simulation */}
                  <div style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: c.role === "SUPER_ADMIN" || c.name.includes("Owner") || c.name.includes("Lead") ? "var(--color-success)" : "var(--color-warning)",
                    boxShadow: c.role === "SUPER_ADMIN" ? "0 0 5px var(--color-success)" : "none"
                  }} />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Board */}
      <div style={{ display: "flex", flexDirection: "column", background: "#FFFFFF" }}>
        {activeContact ? (
          <>
            {/* Header info */}
            <div style={{
              padding: "1rem 1.5rem",
              borderBottom: "1px solid var(--border-dim)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#F9FAFB"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div className="user-avatar-gold" style={{ width: "2.25rem", height: "2.25rem", fontSize: "0.85rem" }}>
                  {getInitials(activeContact.name || "User")}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>{activeContact.name}</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--gold-premium)" }}>
                    {activeContact.role.replace("_", " ")} | SECURE TUNNEL ACTIVE
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--color-success)" }}>
                <Activity size={14} className="animate-pulse" />
                <span style={{ fontFamily: "var(--font-mono)" }}>ONLINE</span>
              </div>
            </div>

            {/* Message Feed */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem"
            }}>
              {activeMessages.length === 0 ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: "0.5rem" }}>
                  <MessageSquare size={36} style={{ color: "var(--border-gold)" }} />
                  <span style={{ fontSize: "0.8rem" }}>No previous transmission logs. Start chatting below!</span>
                </div>
              ) : (
                activeMessages.map((m) => {
                  const isOwn = m.senderId === currentUser.id;
                  return (
                    <div 
                      key={m.id}
                      style={{
                        display: "flex",
                        justifyContent: isOwn ? "flex-end" : "flex-start",
                        width: "100%"
                      }}
                    >
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                        maxWidth: "60%"
                      }}>
                        <div style={{
                          background: isOwn ? "var(--gold-gradient)" : "#F3F4F6",
                          border: isOwn ? "none" : "1px solid var(--border-dim)",
                          color: isOwn ? "#FFFFFF" : "var(--text-primary)",
                          padding: "0.75rem 1rem",
                          borderRadius: isOwn ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                          fontSize: "0.9rem",
                          lineHeight: "1.4",
                          boxShadow: isOwn ? "0 4px 12px rgba(0, 176, 116, 0.15)" : "none"
                        }}>
                          {m.message}
                        </div>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "0.35rem",
                          fontSize: "0.65rem",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)"
                        }}>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isOwn && (
                            m.isRead ? (
                              <CheckCheck size={12} style={{ color: "var(--color-success)" }} />
                            ) : (
                              <Check size={12} />
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

            {/* Input bar */}
            <form onSubmit={handleSendMessage} style={{
              padding: "1rem 1.5rem",
              borderTop: "1px solid var(--border-dim)",
              background: "#F9FAFB",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              position: "relative"
            }}>
              
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
                placeholder={`Encrypt payload and send to ${activeContact.name}...`}
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
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: "0.5rem" }}>
            <MessageSquare size={48} style={{ color: "var(--border-gold)" }} />
            <span style={{ fontSize: "0.85rem" }}>No active communications sharding. Choose a colleague to chat.</span>
          </div>
        )}
      </div>

    </div>
  );
}
