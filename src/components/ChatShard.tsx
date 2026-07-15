"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { 
  sendChatMessageAction, 
  createChatGroupAction, 
  togglePinChatAction, 
  joinPublicGroupAction, 
  sendGroupMessageAction,
  editChatMessageAction,
  deleteChatMessageAction,
  toggleStarMessageAction,
  getStarredMessagesAction,
  toggleEmojiReactionAction,
  toggleDndModeAction,
  forwardChatMessageAction,
  leaveGroupAction
} from "@/app/actions/chat";
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
  X,
  Megaphone,
  Bell,
  BellOff,
  Star,
  Pin,
  CornerUpRight,
  Edit3,
  Trash2,
  Lock,
  Volume2,
  VolumeX,
  LogOut,
  AtSign
} from "lucide-react";
import { user_role } from "@prisma/client";
import { toast } from "react-hot-toast";

interface ChatShardProps {
  currentUser: {
    id: string;
    role: user_role;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    isDnd?: boolean;
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
  const [allDirectMessages, setAllDirectMessages] = useState<any[]>(initialMessages);
  
  // Group, Pinning, and modal states
  const [joinedGroups, setJoinedGroups] = useState<any[]>([]);
  const [discoverableGroups, setDiscoverableGroups] = useState<any[]>([]);
  const [pins, setPins] = useState<any[]>([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupIsPrivate, setNewGroupIsPrivate] = useState(false);
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  const [activeContact, setActiveContact] = useState<any | null>(null);
  const [inputText, setInputText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // DND status state
  const [isDnd, setIsDnd] = useState(!!currentUser.isDnd);

  // Message Forwarding states
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessageContent, setForwardMessageContent] = useState("");
  const [forwardSearch, setForwardSearch] = useState("");
  const [selectedForwardTargets, setSelectedForwardTargets] = useState<{ id: string; isGroup: boolean }[]>([]);

  // Starred messages states
  const [showStarredDrawer, setShowStarredDrawer] = useState(false);
  const [starredMessagesList, setStarredMessagesList] = useState<any[]>([]);
  const [starredMessageIds, setStarredMessageIds] = useState<Set<string>>(new Set());

  // Editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Mute notifications state
  const [mutedGroups, setMutedGroups] = useState<string[]>([]);

  // Local persistence for muted notifications
  useEffect(() => {
    const stored = localStorage.getItem("muted_groups");
    if (stored) {
      try {
        setMutedGroups(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleToggleMuteGroup = (groupId: string) => {
    const isMuted = mutedGroups.includes(groupId);
    let updated: string[];
    if (isMuted) {
      updated = mutedGroups.filter(id => id !== groupId);
      toast.success("Group notifications unmuted.");
    } else {
      updated = [...mutedGroups, groupId];
      toast.success("Group notifications muted.");
    }
    setMutedGroups(updated);
    localStorage.setItem("muted_groups", JSON.stringify(updated));
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    startTransition(async () => {
      try {
        const res = await leaveGroupAction(groupId);
        if (res.success) {
          toast.success("Left group successfully!");
          setActiveContact(null);
          await fetchGroupsAndPins();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to leave group.");
      }
    });
  };

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "message" | "chat";
    visible: boolean;
    targetId: string;
    isGroup?: boolean;
    messageText?: string;
    isOwn?: boolean;
    isStarred?: boolean;
    isDeleted?: boolean;
    isPinned?: boolean;
  } | null>(null);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("contextmenu", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("contextmenu", closeMenu);
    };
  }, []);

  useEffect(() => {
    const initStars = async () => {
      try {
        const starred = await getStarredMessagesAction();
        setStarredMessageIds(new Set(starred.map((s: any) => s.id)));
      } catch (e) {
        console.error(e);
      }
    };
    initStars();
  }, []);

  // Set to track tagged message alerts (so we don't alert multiple times per tag)
  const notifiedMessageIds = useRef<Set<string>>(new Set());

  // Broadcast Panel states
  const [selectedBroadcastRecipients, setSelectedBroadcastRecipients] = useState<string[]>([]);
  const [broadcastMessageText, setBroadcastMessageText] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Single-digit formatter helper
  const formatNumber = (num: number | string) => {
    const parsed = parseInt(num.toString(), 10);
    if (isNaN(parsed)) return num;
    return parsed.toString();
  };

  // Helper to check if a chat is pinned
  const isPinned = (targetId: string) => {
    return pins.some(p => p.targetId === targetId);
  };

  // Helper to calculate unread message count for direct contacts
  const getUnreadCount = (contactId: string) => {
    return messages.filter(m => m.senderId === contactId && m.receiverId === currentUser.id && !m.isRead).length;
  };

  // Fetch groups and pinning records
  const fetchGroupsAndPins = async (selectContactId?: string) => {
    try {
      const res = await fetch("/api/chat/groups");
      if (res.ok) {
        const data = await res.json();
        setJoinedGroups(data.joinedGroups || []);
        setDiscoverableGroups(data.discoverableGroups || []);
        setPins(data.pins || []);

        // Initialize activeContact if not yet set
        const targetId = selectContactId || contactId;
        if (targetId) {
          const groupFound = data.joinedGroups.find((g: any) => g.id === targetId);
          if (groupFound) {
            setActiveContact({ ...groupFound, isGroup: true });
            return;
          }
          const userFound = users.find((u: any) => u.id === targetId);
          if (userFound) {
            setActiveContact(userFound);
            return;
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGroupsAndPins();
  }, []);

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
      const isGroup = !!activeContact.isGroup;
      try {
        const res = await fetch(`/api/chat/messages?contactId=${activeContact.id}&isGroup=${isGroup}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
          
          if (!isGroup) {
            setAllDirectMessages(prev => {
              const otherMsgs = prev.filter(m => 
                !((m.senderId === currentUser.id && m.receiverId === activeContact.id) ||
                  (m.senderId === activeContact.id && m.receiverId === currentUser.id))
              );
              return [...otherMsgs, ...data];
            });
          }

          if (isGroup) {
            data.forEach((m: any) => {
              if (m.senderId !== currentUser.id) {
                const mentionTag = `@${currentUser.name}`;
                if (m.message.includes(mentionTag) && !notifiedMessageIds.current.has(m.id)) {
                  notifiedMessageIds.current.add(m.id);
                  if (!mutedGroups.includes(activeContact.id)) {
                    alert(`🚨 HIGH-PRIORITY MENTION ALERT 🚨\n\n${m.sender?.name || "Colleague"} mentioned you in group:\n"${m.message}"`);
                  }
                }
              }
            });
          } else {
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
    if (!contact || contact === "BROADCAST" || contact.isGroup) {
      return { totalIds: 0, fbAccounts: 0, vintedAccounts: 0, unverifiedAccounts: 0, suspendedAccounts: 0 };
    }
    
    let allAccounts: any[] = [];
    if (contact.account_account_createdByIdTouser) {
      allAccounts = [...contact.account_account_createdByIdTouser];
    }
    
    if (contact.role === "TEAM_LEAD") {
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
    if (c.isDnd) {
      return { label: "DND (Do Not Disturb)", color: "#9CA3AF", isCritical: false, pulse: false };
    }
    if (c.role === "SUPER_ADMIN") {
      return { label: "Active (Online)", color: "#10B981", isCritical: false, pulse: false };
    }
    
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

  // Group creation & Pinning toggle handlers
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    startTransition(async () => {
      try {
        const res = await createChatGroupAction({
          name: newGroupName,
          isPrivate: newGroupIsPrivate,
          initialMembers: newGroupMembers
        });
        if (res.success) {
          toast.success("Group created successfully!");
          setShowCreateGroupModal(false);
          setNewGroupName("");
          setNewGroupIsPrivate(false);
          setNewGroupMembers([]);
          await fetchGroupsAndPins(res.groupId);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to create group.");
      }
    });
  };

  const handleTogglePin = async (targetId: string, isGroup: boolean) => {
    startTransition(async () => {
      try {
        const res = await togglePinChatAction(targetId, isGroup);
        if (res.success) {
          toast.success(res.pinned ? "Chat pinned!" : "Chat unpinned!");
          await fetchGroupsAndPins();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to toggle pin.");
      }
    });
  };

  const handleJoinGroup = async (groupId: string) => {
    startTransition(async () => {
      try {
        const res = await joinPublicGroupAction(groupId);
        if (res.success) {
          toast.success("Joined group successfully!");
          setSearchTerm("");
          await fetchGroupsAndPins(groupId);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to join group.");
      }
    });
  };

  // DND Toggle handler
  const handleToggleDnd = async () => {
    startTransition(async () => {
      try {
        const res = await toggleDndModeAction();
        if (res.success) {
          setIsDnd(res.isDnd);
          toast.success(res.isDnd ? "Do Not Disturb Activated (Zzz)" : "Do Not Disturb Deactivated");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to toggle DND.");
      }
    });
  };

  // Toggle Star / Bookmark handler
  const handleToggleStar = async (messageId: string, isGroup: boolean) => {
    try {
      const res = await toggleStarMessageAction(messageId, isGroup);
      if (res.success) {
        toast.success(res.starred ? "Message Starred! ⭐️" : "Message Unstarred");
        setStarredMessageIds(prev => {
          const next = new Set(prev);
          if (res.starred) {
            next.add(messageId);
          } else {
            next.delete(messageId);
          }
          return next;
        });
        if (showStarredDrawer) {
          const starred = await getStarredMessagesAction();
          setStarredMessagesList(starred);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle star.");
    }
  };

  // Load Starred Drawer handler
  const handleOpenStarredDrawer = async () => {
    try {
      const starred = await getStarredMessagesAction();
      setStarredMessagesList(starred);
      setShowStarredDrawer(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to load starred messages.");
    }
  };

  // Delete message for everyone handler
  const handleDeleteMessage = async (messageId: string, isGroup: boolean) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        return { ...m, message: "🚫 This message was deleted", isDeleted: true };
      }
      return m;
    }));
    if (!isGroup) {
      setAllDirectMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return { ...m, message: "🚫 This message was deleted", isDeleted: true };
        }
        return m;
      }));
    }

    startTransition(async () => {
      try {
        await deleteChatMessageAction(messageId, isGroup);
        toast.success("Message deleted for everyone.");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete message.");
      }
    });
  };

  // Emoji reaction handler
  const handleToggleReaction = async (messageId: string, isGroup: boolean, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        let reactions = [];
        try {
          reactions = msg.reactions ? JSON.parse(msg.reactions) : [];
        } catch (e) {
          reactions = [];
        }
        const rIndex = reactions.findIndex((r: any) => r.emoji === emoji);
        if (rIndex !== -1) {
          const r = reactions[rIndex];
          if (r.userIds.includes(currentUser.id)) {
            r.userIds = r.userIds.filter((id: string) => id !== currentUser.id);
          } else {
            r.userIds.push(currentUser.id);
          }
          if (r.userIds.length === 0) reactions.splice(rIndex, 1);
        } else {
          reactions.push({ emoji, userIds: [currentUser.id] });
        }
        return { ...msg, reactions: JSON.stringify(reactions) };
      }
      return msg;
    }));
    if (!isGroup) {
      setAllDirectMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          let reactions = [];
          try {
            reactions = msg.reactions ? JSON.parse(msg.reactions) : [];
          } catch (e) {
            reactions = [];
          }
          const rIndex = reactions.findIndex((r: any) => r.emoji === emoji);
          if (rIndex !== -1) {
            const r = reactions[rIndex];
            if (r.userIds.includes(currentUser.id)) {
              r.userIds = r.userIds.filter((id: string) => id !== currentUser.id);
            } else {
              r.userIds.push(currentUser.id);
            }
            if (r.userIds.length === 0) reactions.splice(rIndex, 1);
          } else {
            reactions.push({ emoji, userIds: [currentUser.id] });
          }
          return { ...msg, reactions: JSON.stringify(reactions) };
        }
        return msg;
      }));
    }

    startTransition(async () => {
      try {
        await toggleEmojiReactionAction(messageId, isGroup, emoji);
      } catch (err: any) {
        console.error(err);
      }
    });
  };

  // Forward message handler
  const handleForwardMessageConfirm = async (targetId: string, isTargetGroup: boolean) => {
    if (!forwardMessageContent) return;
    
    if (!isTargetGroup) {
      const optimisticForward = {
        id: crypto.randomUUID(),
        senderId: currentUser.id,
        receiverId: targetId,
        message: forwardMessageContent,
        isRead: false,
        isForwarded: true,
        createdAt: new Date().toISOString()
      };
      setAllDirectMessages(prev => [...prev, optimisticForward]);
      if (activeContact && activeContact.id === targetId && !activeContact.isGroup) {
        setMessages(prev => [...prev, optimisticForward]);
      }
    }

    startTransition(async () => {
      try {
        await forwardChatMessageAction(forwardMessageContent, targetId, isTargetGroup);
        toast.success("Message forwarded successfully!");
        setShowForwardModal(false);
        setForwardMessageContent("");
        setForwardSearch("");
      } catch (err: any) {
        toast.error(err.message || "Failed to forward message.");
      }
    });
  };

  // Unified message submission helper (Group + Direct)
  const submitMessage = (text: string) => {
    if (!activeContact || activeContact === "BROADCAST") return;

    if (editingMessageId) {
      const isGroup = !!activeContact.isGroup;
      const targetMsgId = editingMessageId;
      setEditingMessageId(null);

      // Optimistically update locally
      setMessages(prev => prev.map(m => {
        if (m.id === targetMsgId) {
          return { ...m, message: text, isEdited: true, editedAt: new Date().toISOString() };
        }
        return m;
      }));
      if (!isGroup) {
        setAllDirectMessages(prev => prev.map(m => {
          if (m.id === targetMsgId) {
            return { ...m, message: text, isEdited: true, editedAt: new Date().toISOString() };
          }
          return m;
        }));
      }

      startTransition(async () => {
        try {
          await editChatMessageAction(targetMsgId, isGroup, text);
          toast.success("Message updated!");
        } catch (err: any) {
          toast.error(err.message || "Failed to edit message.");
        }
      });
      return;
    }

    const tempId = crypto.randomUUID();
    const isGroup = !!activeContact.isGroup;

    if (isGroup) {
      const optimisticMessage = {
        id: tempId,
        groupId: activeContact.id,
        senderId: currentUser.id,
        message: text,
        createdAt: new Date().toISOString(),
        sender: {
          id: currentUser.id,
          name: currentUser.name || "Me",
          image: currentUser.image
        }
      };
      setMessages(prev => [...prev, optimisticMessage]);

      startTransition(async () => {
        try {
          await sendGroupMessageAction(activeContact.id, text);
        } catch (err: any) {
          toast.error(err.message || "Failed to transmit group message.");
          setMessages(prev => prev.filter(m => m.id !== tempId));
        }
      });
    } else {
      const optimisticMessage = {
        id: tempId,
        senderId: currentUser.id,
        receiverId: activeContact.id,
        message: text,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, optimisticMessage]);
      setAllDirectMessages(prev => [...prev, optimisticMessage]);

      startTransition(async () => {
        try {
          await sendChatMessageAction({
            receiverId: activeContact.id,
            message: text
          });

          // Simulated chatbot replies (Direct Messaging only)
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
        }
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeContact || activeContact === "BROADCAST") return;

    const text = inputText.trim();

    if (text.startsWith("/")) {
      executeSlashCommand(text);
      return;
    }

    setInputText("");
    setShowEmojiPicker(false);
    submitMessage(text);
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
      submitMessage(text);
      toast.success("Operations alert dispatched!");
    } else if (parsed === "/stats") {
      const stats = getColleagueStats(activeContact);
      const text = `📊 SYSTEM REPORT - ${activeContact.name}:\n• Total IDs: ${stats.totalIds}\n• Unverified: ${stats.unverifiedAccounts}\n• Suspended: ${stats.suspendedAccounts}\n• FB/Vinted: ${stats.fbAccounts}/${stats.vintedAccounts}`;
      submitMessage(text);
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

  // Helper to get last message timestamp for direct contact (ignoring deleted messages)
  const getDirectLastMessageTime = (contactId: string) => {
    const threadMsgs = allDirectMessages.filter(
      m => !m.isDeleted && (
           (m.senderId === currentUser.id && m.receiverId === contactId) ||
           (m.senderId === contactId && m.receiverId === currentUser.id)
      )
    );
    if (threadMsgs.length === 0) return 0;
    return new Date(threadMsgs[threadMsgs.length - 1].createdAt).getTime();
  };

  // Helper to determine if a contact is active (has non-deleted messages exchanged within the last 72 hours)
  const isDirectActive = (contactId: string) => {
    const threadMsgs = allDirectMessages.filter(
      m => !m.isDeleted && (
           (m.senderId === currentUser.id && m.receiverId === contactId) ||
           (m.senderId === contactId && m.receiverId === currentUser.id)
      )
    );
    if (threadMsgs.length === 0) return false;
    const lastMsgTime = new Date(threadMsgs[threadMsgs.length - 1].createdAt).getTime();
    return lastMsgTime >= Date.now() - 72 * 60 * 60 * 1000;
  };

  // Helper to get last message text preview for direct contact
  const getDirectLastMessageText = (contactId: string) => {
    const threadMsgs = allDirectMessages.filter(
      m => (m.senderId === currentUser.id && m.receiverId === contactId) ||
           (m.senderId === contactId && m.receiverId === currentUser.id)
    );
    if (threadMsgs.length === 0) return null;
    const lastMsg = threadMsgs[threadMsgs.length - 1];
    if (lastMsg.isDeleted) return "🚫 This message was deleted";
    return lastMsg.message;
  };

  // Prepare sidebar lists based on search mode
  let pinnedItems: any[] = [];
  let activeConversations: any[] = [];
  let searchableTeammates: any[] = [];
  let searchableJoinedGroups: any[] = [];
  let searchableDiscoverableGroups: any[] = [];

  if (!searchTerm.trim()) {
    // 1. PINNED items (both direct contacts and groups)
    const pinnedUsers = users
      .filter(u => u.id !== currentUser.id && isPinned(u.id))
      .map(u => ({ ...u, isGroup: false, lastActiveTime: getDirectLastMessageTime(u.id) || new Date(u.createdAt).getTime() }));

    const pinnedGps = joinedGroups
      .filter(g => isPinned(g.id))
      .map(g => {
        const gpMsgs = messages.filter(m => m.groupId === g.id && !m.isDeleted);
        const lastMsgTime = gpMsgs.length > 0 ? new Date(gpMsgs[gpMsgs.length - 1].createdAt).getTime() : new Date(g.createdAt).getTime();
        return { ...g, isGroup: true, lastActiveTime: lastMsgTime };
      });

    pinnedItems = [...pinnedUsers, ...pinnedGps].sort((a, b) => b.lastActiveTime - a.lastActiveTime);

    // 2. ACTIVE conversation rows (unpinned users with messages & joined groups)
    const activeUsers = users
      .filter(u => u.id !== currentUser.id && !isPinned(u.id) && isDirectActive(u.id))
      .map(u => ({ ...u, isGroup: false, lastActiveTime: getDirectLastMessageTime(u.id) }));

    const activeGps = joinedGroups
      .filter(g => !isPinned(g.id))
      .map(g => {
        const gpMsgs = messages.filter(m => m.groupId === g.id && !m.isDeleted);
        const lastMsgTime = gpMsgs.length > 0 ? new Date(gpMsgs[gpMsgs.length - 1].createdAt).getTime() : new Date(g.createdAt).getTime();
        return { ...g, isGroup: true, lastActiveTime: lastMsgTime };
      });

    activeConversations = [...activeUsers, ...activeGps].sort((a, b) => b.lastActiveTime - a.lastActiveTime);
  } else {
    // Search mode
    const searchLower = searchTerm.toLowerCase();
    searchableTeammates = users.filter(
      u => u.id !== currentUser.id && (u.name || "").toLowerCase().includes(searchLower)
    );
    searchableJoinedGroups = joinedGroups.filter(
      g => (g.name || "").toLowerCase().includes(searchLower)
    );
    searchableDiscoverableGroups = discoverableGroups.filter(
      g => (g.name || "").toLowerCase().includes(searchLower)
    );
  }

  // Filter messages belonging to the active thread and by search query
  const activeMessages = messages.filter(m => 
    activeContact && activeContact !== "BROADCAST" && (
      activeContact.isGroup 
        ? m.groupId === activeContact.id
        : (
            (m.senderId === currentUser.id && m.receiverId === activeContact.id) ||
            (m.senderId === activeContact.id && m.receiverId === currentUser.id)
          )
    )
  );

  const filteredMessages = activeMessages.filter(m => 
    !chatSearchQuery.trim() || 
    m.message.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

  const handleSendAttachment = (fileName: string, fileType: string) => {
    setShowAttachmentModal(false);
    const text = `📎 ATTACHMENT [${fileType}]: ${fileName}`;
    submitMessage(text);
    toast.success("Attachment file dispatched!");
  };

  const renderMessageContentWithMentions = (text: string, isOwnMessage: boolean) => {
    if (!text) return null;
    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span 
            key={index} 
            style={{ 
              fontWeight: 800, 
              color: isOwnMessage ? "#FFFFFF" : "#0250A1",
              background: isOwnMessage ? "rgba(255, 255, 255, 0.25)" : "rgba(2, 80, 161, 0.08)",
              padding: "0.05rem 0.25rem",
              borderRadius: "4px",
              display: "inline-block"
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const emojis = ["👍", "👌", "🔥", "🤝", "🚀", "💻", "✅", "⚠️", "👑", "👀"];

  // Slash commands auto-suggestions
  const showCommandSuggestions = inputText.startsWith("/");
  const commandOptions = [
    { name: "/stats", desc: "Dump colleague stats directly into chat feed" },
    { name: "/alert", desc: "Dispatch a high-priority warning alert notification" },
    { name: "/clear", desc: "Clear local thread message histories" }
  ].filter(c => c.name.toLowerCase().startsWith(inputText.toLowerCase()));

  // Mentions autocomplete logic
  const activeGroupDetails = activeContact && activeContact.isGroup
    ? joinedGroups.find((g: any) => g.id === activeContact.id)
    : null;
  const activeGroupMembers = activeGroupDetails?.members?.map((m: any) => m.user) || [];

  const mentionMatch = inputText.match(/@(\w*)$/);
  const showMentionSuggestions = !!(activeContact && activeContact.isGroup && mentionMatch);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : "";

  const mentionOptions = showMentionSuggestions
    ? [
        { id: "all", name: "all", label: "all (Mention everyone)" },
        ...activeGroupMembers
          .filter((m: any) => m && m.name && m.id !== currentUser.id)
          .map((m: any) => ({ id: m.id, name: m.name, label: m.name }))
      ].filter(o => o.name.toLowerCase().startsWith(mentionQuery))
    : [];

  const handleSelectMention = (name: string) => {
    setInputText(prev => {
      const match = prev.match(/@(\w*)$/);
      if (match) {
        const index = match.index ?? 0;
        return prev.substring(0, index) + `@${name} `;
      }
      return prev;
    });
  };

  const activeStatusInfo = activeContact && activeContact !== "BROADCAST" ? getColleagueStatusInfo(activeContact) : null;

  const isGroupMember = activeContact && activeContact !== "BROADCAST" && activeContact.isGroup
    ? joinedGroups.some(g => g.id === activeContact.id)
    : true;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: activeContact && activeContact !== "BROADCAST" && isGroupMember ? "280px 1fr 300px" : "280px 1fr",
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
        .reaction-menu-emoji {
          transition: all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        }
        .reaction-menu-emoji:hover {
          transform: scale(1.3) translateY(-2px);
          background: rgba(2, 80, 161, 0.1) !important;
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
            <Megaphone size={16} />
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

        {/* Do Not Disturb (DND) Operations Switch */}
        <div style={{
          padding: "0.5rem 1rem",
          borderBottom: "1px solid var(--border-dim)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(255, 255, 255, 0.4)",
          backdropFilter: "blur(4px)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {isDnd ? (
              <BellOff size={16} style={{ color: "#EF4444" }} />
            ) : (
              <Bell size={16} style={{ color: "#10B981" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>DND Operations</span>
              <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>{isDnd ? "Suppressed Alerts" : "Receiving Alerts"}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              type="button"
              onClick={handleOpenStarredDrawer}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.2rem",
                display: "flex"
              }}
              title="Starred Messages"
            >
              <Star size={18} style={{ color: "#F59E0B" }} fill="#F59E0B" />
            </button>
            <button
              type="button"
              onClick={handleToggleDnd}
              style={{
                padding: "0.25rem 0.6rem",
                fontSize: "0.68rem",
                borderRadius: "20px",
                border: isDnd ? "1px solid #EF4444" : "1px solid #10B981",
                background: isDnd ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.08)",
                color: isDnd ? "#EF4444" : "#10B981",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {isDnd ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        {/* Search & Create Group Trigger */}
        <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-dim)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div className="table-search-wrapper" style={{ width: "100%", flex: 1 }}>
            <Search className="header-search-icon" size={16} />
            <input
              type="text"
              placeholder="Search team or groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="header-search-input"
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.5rem 0.4rem 2rem" }}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCreateGroupModal(true)}
            className="btn-gold"
            style={{
              padding: "0.4rem 0.75rem",
              fontSize: "0.75rem",
              borderRadius: "6px",
              whiteSpace: "nowrap",
              height: "32px",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem"
            }}
            title="Create New Group Space"
          >
            <span>+ Group</span>
          </button>
        </div>

        {/* Directory lists container with independent scroll */}
        <div style={{ 
          flex: 1, 
          overflowY: "auto", 
          padding: "0.5rem", 
          display: "flex", 
          flexDirection: "column", 
          gap: "0.2rem",
          minHeight: 0
        }}>
          {!searchTerm.trim() ? (
            <>
              {/* Pinned Section */}
              {pinnedItems.length > 0 && (
                <>
                  <div style={{
                    padding: "0.5rem 0.75rem 0.25rem 0.75rem",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "var(--gold-premium)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem"
                  }}>
                    <Pin size={12} style={{ transform: "rotate(45deg)" }} />
                    <span>Pinned Chats</span>
                  </div>
                  {pinnedItems.map(item => {
                    const isSelected = activeContact && activeContact.id === item.id && !!activeContact.isGroup === item.isGroup;
                    const unreadCount = !item.isGroup ? getUnreadCount(item.id) : 0;
                    const statusInfo = !item.isGroup ? getColleagueStatusInfo(item) : null;

                    let subtitleText = "";
                    if (item.isGroup) {
                      const gpMsgs = messages.filter(m => m.groupId === item.id);
                      const lastGpMsg = gpMsgs.length > 0 ? gpMsgs[gpMsgs.length - 1] : null;
                      if (lastGpMsg) {
                        subtitleText = lastGpMsg.isDeleted ? "🚫 This message was deleted" : `${lastGpMsg.sender?.name || "Colleague"}: ${lastGpMsg.message}`;
                      } else {
                        subtitleText = item.isPrivate ? "Private Space" : "Public Channel";
                      }
                    } else {
                      const lastMsgText = getDirectLastMessageText(item.id);
                      subtitleText = lastMsgText ? lastMsgText : item.role.replace(/_/g, " ");
                    }

                    return (
                      <div
                        key={`${item.isGroup ? 'gp' : 'dir'}-${item.id}`}
                        onClick={() => setActiveContact(item)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            type: "chat",
                            visible: true,
                            targetId: item.id,
                            isGroup: item.isGroup,
                            isPinned: true
                          });
                        }}
                        className={`chat-channel-item ${isSelected ? 'active' : ''}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.6rem 0.75rem",
                          background: isSelected ? "rgba(2, 80, 161, 0.06)" : "transparent",
                          borderRadius: "6px",
                          cursor: "pointer",
                          transition: "background 0.2s",
                          position: "relative"
                        }}
                      >
                        <div className="user-avatar-gold" style={{
                          width: "2.25rem",
                          height: "2.25rem",
                          borderRadius: "50%",
                          position: "relative",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: item.isGroup ? "rgba(2, 80, 161, 0.08)" : "transparent"
                        }}>
                          {item.isGroup ? (
                            <span style={{ fontSize: "0.95rem" }}>{item.isPrivate ? "🔒" : "#"}</span>
                          ) : (
                            <img 
                              src={item.image || "/uploads/avatars/default-avatar.png"} 
                              alt={item.name || "User"} 
                              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                            />
                          )}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: isSelected ? "var(--text-primary)" : "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.name}
                            </span>
                            <span title="Pinned Chat" style={{ display: "inline-flex", opacity: 0.6 }}>
                              <Pin size={11} style={{ transform: "rotate(45deg)", color: "#0250A1" }} />
                            </span>
                          </div>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {subtitleText}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          {unreadCount > 0 && (
                            <div style={{
                              background: "#0250A1",
                              color: "#FFFFFF",
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              borderRadius: "50%",
                              width: "16px",
                              height: "16px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              {formatNumber(unreadCount)}
                            </div>
                          )}

                          {!item.isGroup && statusInfo && (
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
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Active Conversations Section */}
              <div style={{
                padding: "0.75rem 0.75rem 0.25rem 0.75rem",
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "var(--gold-premium)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem"
              }}>
                <MessageSquare size={12} />
                <span>Recent Chats & Groups</span>
              </div>

              {activeConversations.length === 0 && pinnedItems.length === 0 ? (
                <div style={{ padding: "2rem 1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  No active chats or groups. Use search above to start a conversation or join a public group.
                </div>
              ) : (
                activeConversations.map(item => {
                  const isSelected = activeContact && activeContact.id === item.id && !!activeContact.isGroup === item.isGroup;
                  const unreadCount = !item.isGroup ? getUnreadCount(item.id) : 0;
                  const statusInfo = !item.isGroup ? getColleagueStatusInfo(item) : null;

                  let subtitleText = "";
                  if (item.isGroup) {
                    const gpMsgs = messages.filter(m => m.groupId === item.id);
                    const lastGpMsg = gpMsgs.length > 0 ? gpMsgs[gpMsgs.length - 1] : null;
                    if (lastGpMsg) {
                      subtitleText = lastGpMsg.isDeleted ? "🚫 This message was deleted" : `${lastGpMsg.sender?.name || "Colleague"}: ${lastGpMsg.message}`;
                    } else {
                      subtitleText = item.isPrivate ? "Private Space" : "Public Channel";
                    }
                  } else {
                    const lastMsgText = getDirectLastMessageText(item.id);
                    subtitleText = lastMsgText ? lastMsgText : item.role.replace(/_/g, " ");
                  }

                  return (
                    <div
                      key={`${item.isGroup ? 'gp' : 'dir'}-${item.id}`}
                      onClick={() => setActiveContact(item)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          type: "chat",
                          visible: true,
                          targetId: item.id,
                          isGroup: item.isGroup,
                          isPinned: false
                        });
                      }}
                      className="chat-channel-item-container"
                      style={{ position: "relative" }}
                    >
                      <div
                        className={`chat-channel-item ${isSelected ? 'active' : ''}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.6rem 0.75rem",
                          background: isSelected ? "rgba(2, 80, 161, 0.06)" : "transparent",
                          borderRadius: "6px",
                          cursor: "pointer",
                          transition: "background 0.2s"
                        }}
                      >
                        <div className="user-avatar-gold" style={{
                          width: "2.25rem",
                          height: "2.25rem",
                          borderRadius: "50%",
                          position: "relative",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: item.isGroup ? "rgba(2, 80, 161, 0.08)" : "transparent"
                        }}>
                          {item.isGroup ? (
                            <span style={{ fontSize: "0.95rem" }}>{item.isPrivate ? "🔒" : "#"}</span>
                          ) : (
                            <img 
                              src={item.image || "/uploads/avatars/default-avatar.png"} 
                              alt={item.name || "User"} 
                              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                            />
                          )}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: isSelected ? "var(--text-primary)" : "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <span>{item.name}</span>
                            {item.isGroup && mutedGroups.includes(item.id) && (
                              <VolumeX size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                            )}
                          </span>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {subtitleText}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          {unreadCount > 0 && (
                            <div style={{
                              background: "#0250A1",
                              color: "#FFFFFF",
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              borderRadius: "50%",
                              width: "16px",
                              height: "16px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              {formatNumber(unreadCount)}
                            </div>
                          )}

                          {!item.isGroup && statusInfo && (
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
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Discover Public Channels Section */}
              {!searchTerm.trim() && discoverableGroups.length > 0 && (
                <>
                  <div style={{
                    padding: "1rem 0.75rem 0.25rem 0.75rem",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "var(--gold-premium)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    borderTop: "1px solid var(--border-dim)",
                    marginTop: "0.5rem"
                  }}>
                    <Activity size={12} />
                    <span>Discover Public Channels</span>
                  </div>
                  {discoverableGroups.map(g => (
                    <div
                      key={`sidebar-discover-${g.id}`}
                      className="chat-channel-item"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.6rem 0.75rem",
                        borderRadius: "6px",
                        cursor: "default"
                      }}
                    >
                      <div className="user-avatar-gold" style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(2, 80, 161, 0.08)"
                      }}>
                        <span style={{ fontSize: "0.95rem", color: "#0250A1", fontWeight: 800 }}>#</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {g.name}
                        </span>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Public Channel</span>
                      </div>
                      <button
                        onClick={() => handleJoinGroup(g.id)}
                        className="btn-gold"
                        style={{ padding: "0.25rem 0.6rem", fontSize: "0.68rem", borderRadius: "4px", fontWeight: 700 }}
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </>
              )}
            </>
          ) : (
            <>
              {/* Search Results: Matching Teammates */}
              {searchableTeammates.length > 0 && (
                <>
                  <div style={{
                    padding: "0.5rem 0.75rem 0.25rem 0.75rem",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "var(--gold-premium)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase"
                  }}>
                    Teammates
                  </div>
                  {searchableTeammates.map(c => {
                    const isSelected = activeContact && activeContact.id === c.id && !activeContact.isGroup;
                    const statusInfo = getColleagueStatusInfo(c);

                    return (
                      <div
                        key={`dir-search-${c.id}`}
                        onClick={() => { setActiveContact(c); setSearchTerm(""); }}
                        className={`chat-channel-item ${isSelected ? 'active' : ''}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.6rem 0.75rem",
                          background: isSelected ? "rgba(2, 80, 161, 0.06)" : "transparent",
                          borderRadius: "6px",
                          cursor: "pointer",
                          transition: "background 0.2s"
                        }}
                      >
                        <div className="user-avatar-gold" style={{ width: "2rem", height: "2rem", borderRadius: "50%", overflow: "hidden" }}>
                          <img 
                            src={c.image || "/uploads/avatars/default-avatar.png"} 
                            alt={c.name || "User"} 
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                          />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{c.name}</span>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{c.role.replace(/_/g, " ")}</span>
                        </div>
                        {statusInfo && (
                          <div 
                            className={statusInfo.pulse ? "pulse-critical-dot" : ""}
                            style={{ width: "8px", height: "8px", borderRadius: "50%", background: statusInfo.color }}
                            title={statusInfo.label}
                          />
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Search Results: Joined Groups */}
              {searchableJoinedGroups.length > 0 && (
                <>
                  <div style={{
                    padding: "0.75rem 0.75rem 0.25rem 0.75rem",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "var(--gold-premium)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase"
                  }}>
                    My Groups
                  </div>
                  {searchableJoinedGroups.map(g => {
                    const isSelected = activeContact && activeContact.id === g.id && activeContact.isGroup;

                    return (
                      <div
                        key={`joined-gp-search-${g.id}`}
                        onClick={() => { setActiveContact({ ...g, isGroup: true }); setSearchTerm(""); }}
                        className={`chat-channel-item ${isSelected ? 'active' : ''}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.6rem 0.75rem",
                          background: isSelected ? "rgba(2, 80, 161, 0.06)" : "transparent",
                          borderRadius: "6px",
                          cursor: "pointer",
                          transition: "background 0.2s"
                        }}
                      >
                        <div className="user-avatar-gold" style={{
                          width: "2rem",
                          height: "2rem",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(2, 80, 161, 0.08)"
                        }}>
                          <span style={{ fontSize: "0.95rem" }}>{g.isPrivate ? "🔒" : "#"}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{g.name}</span>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{g.isPrivate ? "Private Space" : "Public Channel"}</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Search Results: Discoverable Groups */}
              {searchableDiscoverableGroups.length > 0 && (
                <>
                  <div style={{
                    padding: "0.75rem 0.75rem 0.25rem 0.75rem",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "var(--gold-premium)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase"
                  }}>
                    Joinable Public Groups
                  </div>
                  {searchableDiscoverableGroups.map(g => (
                    <div
                      key={`discover-gp-search-${g.id}`}
                      className="chat-channel-item"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.6rem 0.75rem",
                        borderRadius: "6px",
                        cursor: "default"
                      }}
                    >
                      <div className="user-avatar-gold" style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(2, 80, 161, 0.08)"
                      }}>
                        <span style={{ fontSize: "0.95rem" }}>#</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{g.name}</span>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Public Channel</span>
                      </div>
                      <button
                        onClick={() => handleJoinGroup(g.id)}
                        className="btn-gold"
                        style={{ padding: "0.25rem 0.6rem", fontSize: "0.68rem", borderRadius: "4px" }}
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </>
              )}

              {searchableTeammates.length === 0 && searchableJoinedGroups.length === 0 && searchableDiscoverableGroups.length === 0 && (
                <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  No match found for "{searchTerm}"
                </div>
              )}
            </>
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
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: activeContact.isGroup ? "rgba(2, 80, 161, 0.08)" : "transparent" }}>
                  {activeContact.isGroup ? (
                    <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{activeContact.isPrivate ? "🔒" : "#"}</span>
                  ) : (
                    <img 
                      src={activeContact.image || "/uploads/avatars/default-avatar.png"} 
                      alt={activeContact.name || "User"} 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                    />
                  )}
                </div>
                {/* Active status dot on avatar */}
                {!activeContact.isGroup && (
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
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>{activeContact.name}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500 }}>
                  {activeContact.isGroup 
                    ? (activeContact.isPrivate ? "Private Space" : "Public Channel") 
                    : activeContact.role.replace(/_/g, " ")}
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
            minHeight: 0,
            position: "relative"
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              flex: 1,
              filter: !isGroupMember ? "blur(6px)" : "none",
              pointerEvents: !isGroupMember ? "none" : "auto",
              userSelect: !isGroupMember ? "none" : "auto"
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
                const isSystem = m.message.startsWith("📢 SYSTEM:");
                if (isSystem) {
                  const systemText = m.message.replace("📢 SYSTEM: ", "");
                  return (
                    <div 
                      key={m.id}
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        margin: "0.5rem 0",
                        width: "100%"
                      }}
                    >
                      <div className="glass-panel" style={{
                        background: "rgba(0, 0, 0, 0.05)",
                        color: "var(--text-muted)",
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        padding: "0.25rem 0.75rem",
                        borderRadius: "12px",
                        fontFamily: "var(--font-sans)",
                        textAlign: "center"
                      }}>
                        {systemText}
                      </div>
                    </div>
                  );
                }

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
                    <div 
                      onContextMenu={(e) => {
                        if (m.isDeleted) return; // Deleted messages cannot have context menu actions
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          type: "message",
                          visible: true,
                          targetId: m.id,
                          isGroup: !!activeContact.isGroup,
                          messageText: m.message,
                          isOwn: isOwn,
                          isStarred: starredMessageIds.has(m.id),
                          isDeleted: !!m.isDeleted
                        });
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        background: m.isDeleted ? "rgba(0, 0, 0, 0.05)" : isOwn ? "#0250A1" : "#EAEBEF",
                        color: m.isDeleted ? "var(--text-muted)" : isOwn ? "#FFFFFF" : "var(--text-primary)",
                        padding: "0.65rem 0.9rem",
                        borderRadius: isOwn ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                        maxWidth: "60%",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        position: "relative"
                      }}
                    >
                      {m.isForwarded && (
                        <span style={{ fontSize: "0.65rem", fontStyle: "italic", opacity: 0.7, marginBottom: "0.2rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          ↪️ Forwarded
                        </span>
                      )}

                      {activeContact.isGroup && !isOwn && (
                        <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--gold-premium)", marginBottom: "0.25rem", display: "block" }}>
                          {m.sender?.name || "Colleague"}
                        </span>
                      )}
                      
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
                        {isAttachment 
                          ? `Sent attachment file: ${fileName}` 
                          : renderMessageContentWithMentions(cleanMessage, isOwn)}
                        {m.isEdited && !m.isDeleted && (
                          <span style={{ fontSize: "0.65rem", opacity: 0.6, marginLeft: "0.3rem", fontStyle: "italic" }}>(edited)</span>
                        )}
                      </span>

                      {/* Emoji Reactions display */}
                      {(() => {
                        let parsedReactions: any[] = [];
                        try {
                          parsedReactions = m.reactions ? JSON.parse(m.reactions) : [];
                        } catch (e) {
                          parsedReactions = [];
                        }
                        if (parsedReactions.length === 0) return null;
                        return (
                          <div style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.25rem",
                            marginTop: "0.35rem"
                          }}>
                            {parsedReactions.map((r: any) => {
                              const hasReacted = r.userIds.includes(currentUser.id);
                              return (
                                <div
                                  key={r.emoji}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleReaction(m.id, !!activeContact.isGroup, r.emoji);
                                  }}
                                  style={{
                                    background: hasReacted ? "rgba(2, 80, 161, 0.12)" : "rgba(0,0,0,0.04)",
                                    border: hasReacted ? "1px solid rgba(2, 80, 161, 0.25)" : "1px solid rgba(0,0,0,0.06)",
                                    padding: "0.1rem 0.35rem",
                                    borderRadius: "10px",
                                    fontSize: "0.68rem",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.15rem",
                                    transition: "all 0.15s"
                                  }}
                                >
                                  <span>{r.emoji}</span>
                                  <span style={{ fontSize: "0.62rem", opacity: 0.8, color: hasReacted ? "#0250A1" : "var(--text-primary)" }}>{r.userIds.length}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

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
                        <span>{new Date(m.createdAt).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        {isOwn && !m.isDeleted && (
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
            </div>
            <div ref={messagesEndRef} />

            {/* Locked Group Overlay CTA */}
            {!isGroupMember && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(255, 255, 255, 0.4)",
                backdropFilter: "blur(4px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                padding: "2rem"
              }}>
                <div 
                  className="glass-panel"
                  style={{
                    background: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(20px)",
                    borderRadius: "20px",
                    padding: "2rem",
                    textAlign: "center",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.5)",
                    maxWidth: "340px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1.25rem"
                  }}
                >
                  <Lock size={36} style={{ color: "#0250A1" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <h4 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Public Channel Locked</h4>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, lineHeight: "1.4" }}>
                      You are not a member of <strong>{activeContact.name}</strong> yet. Join now to view transmissions and participate in conversations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleJoinGroup(activeContact.id)}
                    className="btn-gold"
                    style={{ width: "100%", padding: "0.65rem 1rem", borderRadius: "10px", fontWeight: 700 }}
                  >
                    Join Now
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pinned Input Bar at Bottom */}
          {!isGroupMember ? (
            <div style={{
              padding: "1.1rem 1.5rem",
              borderTop: "1px solid var(--border-dim)",
              background: "#FAFBFB",
              textAlign: "center",
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              flexShrink: 0
            }}>
              <Lock size={12} style={{ color: "var(--text-muted)" }} />
              <span>You must join this channel to participate in the conversation.</span>
            </div>
          ) : (
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

            {/* Interactive Mentions Autocomplete Popup suggestions */}
            {showMentionSuggestions && mentionOptions.length > 0 && (
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
                gap: "0.25rem",
                maxHeight: "200px",
                overflowY: "auto"
              }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--gold-premium)", padding: "0.25rem 0.5rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <AtSign size={10} />
                  <span>Mention Channel Members</span>
                </div>
                {mentionOptions.map(o => (
                  <div
                    key={o.id}
                    onClick={() => handleSelectMention(o.name)}
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
                    <strong style={{ color: "#0250A1" }}>@{o.name}</strong>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>{o.label}</span>
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
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: "0.5rem" }}>
          <MessageSquare size={48} style={{ color: "var(--border-gold)" }} />
          <span style={{ fontSize: "0.85rem" }}>No active communications sharding. Choose a colleague to chat.</span>
        </div>
      )}

      {/* Right Column details panel displaying active contact performance metrics or group details */}
      {activeContact && activeContact !== "BROADCAST" && isGroupMember && (
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
            <div className="user-avatar-gold" style={{ width: "4.25rem", height: "4.25rem", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: activeContact.isGroup ? "rgba(2, 80, 161, 0.08)" : "transparent" }}>
              {activeContact.isGroup ? (
                <span style={{ fontSize: "1.8rem", fontWeight: "bold" }}>{activeContact.isPrivate ? "🔒" : "#"}</span>
              ) : (
                <img 
                  src={activeContact.image || "/uploads/avatars/default-avatar.png"} 
                  alt={activeContact.name || "User"} 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                />
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>{activeContact.name}</h4>
              <span style={{
                fontSize: "0.65rem",
                fontWeight: 800,
                background: activeContact.isGroup ? "var(--gold-gradient)" : (activeContact.role === "SUPER_ADMIN" ? "var(--gold-gradient)" : "rgba(2, 80, 161, 0.08)"),
                color: (activeContact.isGroup || activeContact.role === "SUPER_ADMIN") ? "#FFFFFF" : "#0250A1",
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "inline-block",
                alignSelf: "center"
              }}>
                {activeContact.isGroup 
                  ? (activeContact.isPrivate ? "Private Space" : "Public Channel") 
                  : activeContact.role.replace(/_/g, " ")}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                {activeContact.isGroup ? "Group Chat" : activeContact.email}
              </span>
            </div>
          </div>

          {/* Operational Stats or Group Info */}
          {!activeContact.isGroup ? (
            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h5 style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--gold-premium)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Operational Stats
              </h5>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ background: "#FFFFFF", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Total IDs</span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>{formatNumber(getColleagueStats(activeContact).totalIds)}</span>
                </div>
                <div style={{ background: "#FFFFFF", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Unverified</span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, color: getColleagueStats(activeContact).unverifiedAccounts > 0 ? "#F59E0B" : "var(--text-primary)" }}>
                    {formatNumber(getColleagueStats(activeContact).unverifiedAccounts)}
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ background: "#FFFFFF", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Suspended</span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, color: getColleagueStats(activeContact).suspendedAccounts > 0 ? "#EF4444" : "var(--text-primary)" }}>
                    {formatNumber(getColleagueStats(activeContact).suspendedAccounts)}
                  </span>
                </div>
                <div style={{ background: "#FFFFFF", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>FB / Vinted</span>
                  <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", paddingTop: "0.25rem" }}>
                    {formatNumber(getColleagueStats(activeContact).fbAccounts)} / {formatNumber(getColleagueStats(activeContact).vintedAccounts)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h5 style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--gold-premium)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Group Info
              </h5>
              <div style={{ background: "#FFFFFF", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Privacy Setting</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {activeContact.isPrivate ? "Private Space" : "Public Channel"}
                </span>
              </div>

              {/* Members List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Members ({activeGroupMembers.length})
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: "160px", overflowY: "auto", paddingRight: "0.25rem" }}>
                  {activeGroupMembers.map((m: any) => {
                    if (!m) return null;
                    return (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.5rem", background: "#FFFFFF", borderRadius: "6px", border: "1px solid var(--border-dim)" }}>
                        <div className="user-avatar-gold" style={{ width: "1.25rem", height: "1.25rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(2, 80, 161, 0.08)" }}>
                          <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>{m.name?.[0]?.toUpperCase() || "?"}</span>
                        </div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                          {m.name}
                        </span>
                        {m.id === currentUser.id && (
                          <span style={{ fontSize: "0.58rem", color: "var(--gold-premium)", fontWeight: 800 }}>You</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => handleToggleMuteGroup(activeContact.id)}
                  className="btn-gold"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    fontSize: "0.78rem",
                    padding: "0.5rem",
                    borderRadius: "10px",
                    fontWeight: 700,
                    width: "100%",
                    background: mutedGroups.includes(activeContact.id) ? "var(--text-muted)" : "var(--gold-gradient)"
                  }}
                >
                  {mutedGroups.includes(activeContact.id) ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  <span>{mutedGroups.includes(activeContact.id) ? "Unmute Notifications" : "Mute Notifications"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLeaveGroup(activeContact.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    fontSize: "0.78rem",
                    padding: "0.5rem",
                    borderRadius: "10px",
                    fontWeight: 700,
                    width: "100%",
                    border: "1px solid #EF4444",
                    background: "transparent",
                    color: "#EF4444",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <LogOut size={14} />
                  <span>Leave Group</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Glassmorphic Group Creation Modal */}
      {showCreateGroupModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div 
            style={{
              width: "100%",
              maxWidth: "440px",
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: "24px",
              padding: "2rem",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              zIndex: 50
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>Create Group</h3>
              <button 
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setNewGroupName("");
                  setNewGroupIsPrivate(false);
                  setNewGroupMembers([]);
                  setMemberSearch("");
                }}
                style={{ border: "none", background: "none", cursor: "pointer", display: "flex", padding: "0.25rem" }}
              >
                <X size={20} />
              </button>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                Group Name
              </label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Operations Sync"
                className="input-gold"
                style={{ width: "100%", padding: "0.65rem 0.8rem", borderRadius: "10px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                Privacy Setting
              </label>
              <div style={{ display: "flex", gap: "1rem" }}>
                <label style={{ 
                  flex: 1, 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "0.25rem", 
                  padding: "0.85rem", 
                  borderRadius: "12px", 
                  border: newGroupIsPrivate ? "1px solid var(--border-dim)" : "2px solid #0250A1", 
                  background: newGroupIsPrivate ? "transparent" : "rgba(2, 80, 161, 0.04)", 
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}>
                  <input 
                    type="radio" 
                    name="privacy" 
                    checked={!newGroupIsPrivate} 
                    onChange={() => setNewGroupIsPrivate(false)} 
                    style={{ display: "none" }} 
                  />
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--text-primary)" }}>
                    <span style={{ color: "#0250A1", fontWeight: 800, fontSize: "1rem" }}>#</span>
                    <span>Public Channel</span>
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: "1.2" }}>Open to all domain personnel</span>
                </label>
                <label style={{ 
                  flex: 1, 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "0.25rem", 
                  padding: "0.85rem", 
                  borderRadius: "12px", 
                  border: newGroupIsPrivate ? "2px solid #0250A1" : "1px solid var(--border-dim)", 
                  background: newGroupIsPrivate ? "rgba(2, 80, 161, 0.04)" : "transparent", 
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}>
                  <input 
                    type="radio" 
                    name="privacy" 
                    checked={newGroupIsPrivate} 
                    onChange={() => setNewGroupIsPrivate(true)} 
                    style={{ display: "none" }} 
                  />
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--text-primary)" }}>
                    <Lock size={12} style={{ color: "#0250A1" }} />
                    <span>Private Space</span>
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: "1.2" }}>Invite-only; hidden from directory</span>
                </label>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                Invite Members ({formatNumber(newGroupMembers.length)} Invited)
              </label>
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search colleagues to invite..."
                className="input-gold"
                style={{ width: "100%", padding: "0.65rem 0.8rem", borderRadius: "10px", fontSize: "0.8rem", marginBottom: "0.5rem" }}
              />
              <div style={{ maxHeight: "140px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.25rem", border: "1px solid var(--border-dim)", borderRadius: "10px", padding: "0.5rem 0.75rem", background: "#FFFFFF" }}>
                {users
                  .filter(u => u.id !== currentUser.id && (u.name || "").toLowerCase().includes(memberSearch.toLowerCase()))
                  .map(u => {
                    const isChecked = newGroupMembers.includes(u.id);
                    return (
                      <label key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem", cursor: "pointer", fontSize: "0.8rem" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setNewGroupMembers(prev => prev.filter(id => id !== u.id));
                            } else {
                              setNewGroupMembers(prev => [...prev, u.id]);
                            }
                          }}
                        />
                        <span>{u.name} ({u.role.replace(/_/g, " ")})</span>
                      </label>
                    );
                  })}
              </div>
            </div>

            <button
              onClick={handleCreateGroup}
              disabled={isPending || !newGroupName.trim()}
              className="btn-gold"
              style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "12px", fontWeight: 700, marginTop: "0.5rem" }}
            >
              {isPending ? "Creating Group..." : "Create Group"}
            </button>
          </div>
        </div>
      )}

      {/* Starred Messages Glassmorphic Side Drawer */}
      {showStarredDrawer && (
        <div style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "360px",
          height: "100%",
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(20px)",
          boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.1)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.4)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border-dim)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Star size={20} style={{ color: "#F59E0B" }} fill="#F59E0B" />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0250A1" }}>Starred Messages</h3>
            </div>
            <button 
              onClick={() => setShowStarredDrawer(false)}
              style={{ border: "none", background: "none", cursor: "pointer", display: "flex", padding: "0.25rem" }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {starredMessagesList.length === 0 ? (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: "0.5rem" }}>
                <Star size={32} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                <span style={{ fontSize: "0.8rem" }}>No starred messages.</span>
              </div>
            ) : (
              starredMessagesList.map((m: any) => (
                <div 
                  key={m.id} 
                  style={{
                    background: "rgba(2, 80, 161, 0.03)",
                    border: "1px solid rgba(2, 80, 161, 0.08)",
                    borderRadius: "12px",
                    padding: "0.75rem",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--gold-premium)" }}>
                      {m.senderName || "Colleague"}
                    </span>
                    <span style={{ fontSize: "0.58rem", color: "var(--text-muted)" }}>
                      {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-primary)", whiteSpace: "pre-wrap", margin: 0, wordBreak: "break-word" }}>
                    {m.message}
                  </p>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.25rem" }}>
                    <button
                      onClick={() => handleToggleStar(m.id, !!m.groupId)}
                      style={{ border: "none", background: "none", color: "var(--color-danger)", fontSize: "0.65rem", cursor: "pointer", fontWeight: 700 }}
                    >
                      Remove Bookmark
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Forward Message Modal */}
      {showForwardModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div 
            className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl z-50"
            style={{
              width: "100%",
              maxWidth: "400px",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              maxHeight: "85vh"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>Forward Message</h3>
              <button 
                onClick={() => {
                  setShowForwardModal(false);
                  setForwardMessageContent("");
                  setForwardSearch("");
                  setSelectedForwardTargets([]);
                }}
                style={{ border: "none", background: "none", cursor: "pointer", display: "flex" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic", background: "rgba(0,0,0,0.03)", padding: "0.5rem", borderRadius: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              "{forwardMessageContent}"
            </p>

            <div className="table-search-wrapper" style={{ width: "100%" }}>
              <Search className="header-search-icon" size={14} />
              <input
                type="text"
                placeholder="Search recent conversations..."
                value={forwardSearch}
                onChange={(e) => setForwardSearch(e.target.value)}
                className="header-search-input"
                style={{ fontSize: "0.8rem", padding: "0.4rem 0.5rem 0.4rem 2rem" }}
              />
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem", minHeight: "200px" }}>
              {[...pinnedItems, ...activeConversations]
                .filter(item => !forwardSearch.trim() || item.name.toLowerCase().includes(forwardSearch.toLowerCase()))
                .map(item => {
                  const isSelected = selectedForwardTargets.some(t => t.id === item.id && t.isGroup === item.isGroup);
                  return (
                    <label
                      key={`${item.isGroup ? 'gp' : 'dir'}-${item.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.5rem 0.75rem",
                        background: isSelected ? "rgba(2, 80, 161, 0.04)" : "transparent",
                        borderRadius: "8px",
                        cursor: "pointer",
                        border: "1px solid transparent",
                        transition: "all 0.15s"
                      }}
                      className="chat-channel-item"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedForwardTargets(prev => [...prev, { id: item.id, isGroup: item.isGroup }]);
                          } else {
                            setSelectedForwardTargets(prev => prev.filter(t => !(t.id === item.id && t.isGroup === item.isGroup)));
                          }
                        }}
                        style={{ accentColor: "#0250A1", cursor: "pointer" }}
                      />
                      <div style={{
                        width: "1.75rem",
                        height: "1.75rem",
                        borderRadius: "50%",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(2, 80, 161, 0.08)",
                        fontSize: "0.8rem"
                      }} border-radius="50%">
                        {item.isGroup ? (item.isPrivate ? "🔒" : "#") : (
                          <img src={item.image || "/uploads/avatars/default-avatar.png"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.name}
                        </span>
                        <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>
                          {item.isGroup ? "Group Channel" : "Direct Chat"}
                        </span>
                      </div>
                    </label>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={selectedForwardTargets.length === 0}
              onClick={() => {
                selectedForwardTargets.forEach(t => {
                  handleForwardMessageConfirm(t.id, t.isGroup);
                });
                setShowForwardModal(false);
                setSelectedForwardTargets([]);
              }}
              className="btn-gold"
              style={{ width: "100%", padding: "0.6rem", fontSize: "0.82rem", fontWeight: 800 }}
            >
              Confirm Forward ({selectedForwardTargets.length})
            </button>
          </div>
        </div>
      )}

      {/* Sleek Glassmorphic Floating Context Menu */}
      {contextMenu && contextMenu.visible && (
        <div 
          style={{
            position: "fixed",
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.5)",
            padding: "0.5rem",
            zIndex: 99999,
            minWidth: "180px",
            display: "flex",
            flexDirection: "column",
            gap: "0.2rem"
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {contextMenu.type === "message" ? (
            <>
              {/* Horizontal 7 Reactions Palette */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.25rem 0.5rem",
                gap: "0.35rem",
                borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
                paddingBottom: "0.5rem",
                marginBottom: "0.25rem"
              }}>
                {["👍", "❤️", "😂", "😮", "😢", "🙏", "🚀"].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      handleToggleReaction(contextMenu.targetId, !!contextMenu.isGroup, emoji);
                      setContextMenu(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "1.2rem",
                      cursor: "pointer",
                      padding: "0.2rem",
                      borderRadius: "6px"
                    }}
                    className="reaction-menu-emoji"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Menu Actions */}
              <button
                onClick={() => {
                  handleToggleStar(contextMenu.targetId, !!contextMenu.isGroup);
                  setContextMenu(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  textAlign: "left",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%"
                }}
                className="chat-channel-item"
              >
                <Star size={14} style={{ color: contextMenu.isStarred ? "#F59E0B" : "var(--text-muted)" }} fill={contextMenu.isStarred ? "#F59E0B" : "none"} />
                <span>{contextMenu.isStarred ? "Unstar Message" : "Star Message"}</span>
              </button>

              <button
                onClick={() => {
                  setForwardMessageContent(contextMenu.messageText || "");
                  setShowForwardModal(true);
                  setContextMenu(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  textAlign: "left",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%"
                }}
                className="chat-channel-item"
              >
                <CornerUpRight size={14} style={{ color: "var(--text-muted)" }} />
                <span>Forward Message</span>
              </button>

              {contextMenu.isOwn && (
                <>
                  <button
                    onClick={() => {
                      setEditingMessageId(contextMenu.targetId);
                      setInputText(contextMenu.messageText || "");
                      setContextMenu(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      textAlign: "left",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      width: "100%"
                    }}
                    className="chat-channel-item"
                  >
                    <Edit3 size={14} style={{ color: "var(--text-muted)" }} />
                    <span>Edit Message</span>
                  </button>

                  <button
                    onClick={() => {
                      handleDeleteMessage(contextMenu.targetId, !!contextMenu.isGroup);
                      setContextMenu(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      textAlign: "left",
                      color: "#EF4444",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      width: "100%"
                    }}
                    className="chat-channel-item"
                  >
                    <Trash2 size={14} style={{ color: "#EF4444" }} />
                    <span>Delete Message</span>
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  handleTogglePin(contextMenu.targetId, !!contextMenu.isGroup);
                  setContextMenu(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  textAlign: "left",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%"
                }}
                className="chat-channel-item"
              >
                <Pin size={14} style={{ color: "var(--text-muted)", transform: "rotate(45deg)" }} />
                <span>{contextMenu.isPinned ? "Unpin Chat" : "Pin Chat"}</span>
              </button>

              {contextMenu.isGroup && (
                <>
                  <button
                    onClick={() => {
                      handleToggleMuteGroup(contextMenu.targetId);
                      setContextMenu(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      textAlign: "left",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      width: "100%"
                    }}
                    className="chat-channel-item"
                  >
                    <VolumeX size={14} style={{ color: "var(--text-muted)" }} />
                    <span>{mutedGroups.includes(contextMenu.targetId) ? "Unmute Notifications" : "Mute Notifications"}</span>
                  </button>

                  <button
                    onClick={() => {
                      handleLeaveGroup(contextMenu.targetId);
                      setContextMenu(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      textAlign: "left",
                      color: "#EF4444",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      width: "100%"
                    }}
                    className="chat-channel-item"
                  >
                    <LogOut size={14} style={{ color: "#EF4444" }} />
                    <span>Leave Group</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}
