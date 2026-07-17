"use client";

import React, { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  createSpecialRequestAction, 
  updateSpecialRequestStatusAction,
  markSpecialRequestsAsReadAction
} from "@/app/actions/special-requests";
import { 
  Ticket, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  AlertTriangle, 
  CornerDownRight,
  ChevronRight,
  MessageSquare
} from "lucide-react";
import { toast } from "react-hot-toast";

interface SpecialRequestsListProps {
  initialRequests: any[];
  currentUser: {
    id: string;
    role: string;
    name: string | null;
  };
  companyUsers?: any[];
}

export default function SpecialRequestsList({ 
  initialRequests, 
  currentUser,
  companyUsers = []
}: SpecialRequestsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requests, setRequests] = useState<any[]>(initialRequests);
  
  // Tabs and filters
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | "IT" | "COMPANY">("ALL");

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    category: "IT" as "IT" | "COMPANY",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    title: "",
    description: ""
  });
  const [selectedCcUserIds, setSelectedCcUserIds] = useState<string[]>([]);
  const [ccSearchQuery, setCcSearchQuery] = useState("");

  // Action/Resolution Modal state
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [actionStatus, setActionStatus] = useState<"PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED">("RESOLVED");
  const [adminNotes, setAdminNotes] = useState("");

  const isRequester = ["TEAM_LEAD", "SALES_ASSOCIATE"].includes(currentUser.role);
  const isHandler = ["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"].includes(currentUser.role);

  useEffect(() => {
    const clearNotifications = async () => {
      try {
        await markSpecialRequestsAsReadAction();
      } catch (err) {
        console.error("Failed to mark ticket notifications as read on load", err);
      }
    };
    clearNotifications();
  }, []);

  // Filter logic
  const filteredRequests = requests.filter(req => {
    const tabMatch = 
      activeTab === "ALL" || 
      (activeTab === "PENDING" && req.status === "PENDING") ||
      (activeTab === "IN_PROGRESS" && req.status === "IN_PROGRESS") ||
      (activeTab === "COMPLETED" && (req.status === "RESOLVED" || req.status === "REJECTED"));

    const catMatch = 
      selectedCategory === "ALL" || 
      req.category === selectedCategory;

    return tabMatch && catMatch;
  });

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createSpecialRequestAction({
          category: newTicket.category,
          priority: newTicket.priority,
          title: newTicket.title,
          description: newTicket.description,
          ccUserIds: selectedCcUserIds
        });

        if (res.success) {
          toast.success("Ticket submitted successfully!");
          setShowCreateModal(false);
          setNewTicket({
            category: "IT",
            priority: "MEDIUM",
            title: "",
            description: ""
          });
          setSelectedCcUserIds([]);
          setCcSearchQuery("");
          // Update local state by adding the new ticket to top
          const ticketWithRequester = {
            ...res.ticket,
            requester: { name: currentUser.name }
          };
          setRequests(prev => [ticketWithRequester, ...prev]);
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to submit ticket.");
      }
    });
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    startTransition(async () => {
      try {
        const res = await updateSpecialRequestStatusAction(
          selectedTicket.id,
          actionStatus,
          adminNotes
        );

        if (res.success) {
          toast.success(`Ticket set to ${actionStatus} successfully!`);
          setShowActionModal(false);
          setAdminNotes("");
          // Update local list
          setRequests(prev => prev.map(r => r.id === selectedTicket.id ? { ...r, status: actionStatus, notes: adminNotes } : r));
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to update ticket status.");
      }
    });
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "URGENT": return { bg: "rgba(239, 68, 68, 0.08)", text: "#EF4444", border: "rgba(239, 68, 68, 0.2)" };
      case "HIGH": return { bg: "rgba(245, 158, 11, 0.08)", text: "#D97706", border: "rgba(245, 158, 11, 0.2)" };
      case "MEDIUM": return { bg: "rgba(59, 130, 246, 0.08)", text: "#3B82F6", border: "rgba(59, 130, 246, 0.2)" };
      default: return { bg: "rgba(107, 114, 128, 0.08)", text: "#6B7280", border: "rgba(107, 114, 128, 0.2)" };
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "RESOLVED": return { bg: "#DEF7EC", text: "#03543F", icon: <CheckCircle2 size={12} /> };
      case "REJECTED": return { bg: "#FBD5D5", text: "#9B1C1C", icon: <XCircle size={12} /> };
      case "IN_PROGRESS": return { bg: "#E1EFFE", text: "#1E429F", icon: <Clock size={12} /> };
      default: return { bg: "#FEF08A", text: "#713F12", icon: <HelpCircle size={12} /> };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* 1. Header Card */}
      <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }} className="text-gold-gradient">
            SPECIAL SUPPORT TICKETS
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Submit and manage administrative or technical requests routed directly to IT Operations or the Company Owner.
          </p>
        </div>
        
        {isRequester && (
          <button 
            type="button" 
            onClick={() => setShowCreateModal(true)}
            className="btn-gold"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.6rem 1.2rem" }}
          >
            <Plus size={16} />
            Create Request Ticket
          </button>
        )}
      </div>

      {/* 2. Filter Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        {/* Status Tabs */}
        <div style={{ display: "flex", gap: "0.35rem", background: "rgba(15, 23, 42, 0.03)", border: "1px solid var(--border-dim)", borderRadius: "8px", padding: "0.25rem" }}>
          {(["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? "#FFFFFF" : "transparent",
                color: activeTab === tab ? "var(--text-primary)" : "var(--text-secondary)",
                border: "none",
                boxShadow: activeTab === tab ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                padding: "0.45rem 1rem",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {tab === "ALL" ? "All Tickets" : tab === "COMPLETED" ? "Resolved / Rejected" : tab.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Category Filters */}
        <div style={{ display: "flex", gap: "0.35rem", background: "rgba(15, 23, 42, 0.03)", border: "1px solid var(--border-dim)", borderRadius: "8px", padding: "0.25rem" }}>
          {(["ALL", "IT", "COMPANY"] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? "#FFFFFF" : "transparent",
                color: selectedCategory === cat ? "var(--text-primary)" : "var(--text-secondary)",
                border: "none",
                boxShadow: selectedCategory === cat ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                padding: "0.45rem 0.85rem",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {cat === "ALL" ? "All Targets" : cat === "IT" ? "IT Dept Support" : "Company Owner"}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Ticket List Grid */}
      {filteredRequests.length === 0 ? (
        <div className="glass-panel" style={{ padding: "3rem 1.5rem", textAlign: "center", background: "#FFFFFF", border: "1px solid var(--border-dim)", borderRadius: "12px" }}>
          <div style={{ display: "inline-flex", padding: "0.75rem", background: "rgba(218, 165, 32, 0.08)", borderRadius: "50%", color: "var(--gold-premium)", marginBottom: "1rem" }}>
            <Ticket size={24} />
          </div>
          <h4 style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>No Tickets Found</h4>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            There are no support request tickets matching the selected status and target filter categories.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
          {filteredRequests.map(req => {
            const pColors = getPriorityColor(req.priority);
            const statusBadge = getStatusBadge(req.status);

            return (
              <div 
                key={req.id} 
                className="glass-panel"
                style={{ 
                  padding: "1.25rem", 
                  background: "#FFFFFF", 
                  border: `1px solid ${req.priority === "URGENT" && req.status === "PENDING" ? "rgba(239, 68, 68, 0.4)" : "var(--border-dim)"}`, 
                  borderRadius: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem"
                }}
              >
                {/* Upper Metadata Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    {/* Category Label */}
                    <span style={{ 
                      fontSize: "0.65rem", 
                      fontWeight: 800, 
                      color: req.category === "IT" ? "#0250A1" : "#D97706",
                      background: req.category === "IT" ? "rgba(2, 80, 161, 0.06)" : "rgba(217, 119, 6, 0.06)",
                      border: req.category === "IT" ? "1px solid rgba(2, 80, 161, 0.15)" : "1px solid rgba(217, 119, 6, 0.15)",
                      padding: "0.15rem 0.45rem",
                      borderRadius: "4px",
                      textTransform: "uppercase"
                    }}>
                      {req.category === "IT" ? "IT Dept Support" : "Company Owner"}
                    </span>

                    {/* Priority Badge */}
                    <span style={{ 
                      fontSize: "0.65rem", 
                      fontWeight: 800, 
                      color: pColors.text,
                      background: pColors.bg,
                      border: `1px solid ${pColors.border}`,
                      padding: "0.15rem 0.45rem",
                      borderRadius: "4px",
                      textTransform: "uppercase"
                    }}>
                      {req.priority}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <span style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: statusBadge.text,
                    background: statusBadge.bg,
                    padding: "0.2rem 0.6rem",
                    borderRadius: "20px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem"
                  }}>
                    {statusBadge.icon}
                    {req.status}
                  </span>
                </div>

                {/* Subject & Description Content */}
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                    {req.title}
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.4rem", lineHeight: "1.4", whiteSpace: "pre-wrap" }}>
                    {req.description}
                  </p>

                  {/* CC Tag badges */}
                  {req.ccUserIds && (() => {
                    try {
                      const ccIds: string[] = JSON.parse(req.ccUserIds);
                      if (ccIds.length === 0) return null;
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>CC&apos;d:</span>
                          {ccIds.map(id => {
                            const found = companyUsers?.find(cu => cu.id === id);
                            const displayName = found ? (found.name || found.email) : "Colleague";
                            return (
                              <span key={id} style={{ 
                                fontSize: "0.65rem", 
                                color: "var(--text-secondary)", 
                                background: "rgba(15, 23, 42, 0.04)", 
                                padding: "0.1rem 0.4rem", 
                                borderRadius: "4px",
                                border: "1px solid var(--border-dim)"
                              }}>
                                {displayName}
                              </span>
                            );
                          })}
                        </div>
                      );
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>

                {/* Footer Meta Details & Resolve Action Trigger */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  borderTop: "1px solid rgba(15, 23, 42, 0.04)", 
                  paddingTop: "0.75rem",
                  marginTop: "0.25rem",
                  flexWrap: "wrap",
                  gap: "0.5rem"
                }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Submitted by <strong style={{ color: "var(--text-primary)" }}>{req.requester?.name || "Unknown"}</strong> on {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {isHandler && req.status !== "RESOLVED" && req.status !== "REJECTED" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTicket(req);
                        setActionStatus(req.status === "PENDING" ? "IN_PROGRESS" : "RESOLVED");
                        setAdminNotes(req.notes || "");
                        setShowActionModal(true);
                      }}
                      className="btn-glass"
                      style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                    >
                      <CornerDownRight size={12} />
                      Take Action / Resolve
                    </button>
                  )}
                </div>

                {/* Ticket Admin Notes section if resolved / commented */}
                {req.notes && (
                  <div style={{ 
                    background: "rgba(15, 23, 42, 0.02)", 
                    borderLeft: "3px solid var(--gold-premium)", 
                    padding: "0.6rem 0.85rem",
                    borderRadius: "0 6px 6px 0",
                    fontSize: "0.78rem",
                    marginTop: "0.25rem"
                  }}>
                    <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.02em", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.2rem" }}>
                      <MessageSquare size={10} />
                      Resolution/Admin Remarks:
                    </div>
                    <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.78rem", lineHeight: "1.35" }}>
                      {req.notes}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Create Ticket Modal Overlay */}
      {showCreateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.3)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100, padding: "1rem" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "480px", background: "#FFFFFF", border: "1px solid var(--border-dim)", padding: "1.5rem", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)" }}>Submit Support Request</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>Fill in the details below to open a special support ticket.</p>
            </div>

            <form onSubmit={handleCreateTicket} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Category */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>Send Request To</label>
                <select
                  value={newTicket.category}
                  onChange={e => setNewTicket(prev => ({ ...prev, category: e.target.value as "IT" | "COMPANY" }))}
                  className="input-gold"
                  style={{ fontSize: "0.82rem", padding: "0.55rem" }}
                >
                  <option value="IT">IT Support Dept (Technical / Hardware)</option>
                  <option value="COMPANY">Company Owner (Admin / Operations)</option>
                </select>
              </div>

              {/* Priority */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>Urgency Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={e => setNewTicket(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="input-gold"
                  style={{ fontSize: "0.82rem", padding: "0.55rem" }}
                >
                  <option value="LOW">Low - General Question</option>
                  <option value="MEDIUM">Medium - Setup Help</option>
                  <option value="HIGH">High - Blocked Operation</option>
                  <option value="URGENT">Urgent - Urgent Account/ID Setup</option>
                </select>
              </div>

              {/* Title */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>Request Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Broken Chrome profile or proxy replacement needed"
                  value={newTicket.title}
                  onChange={e => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                  className="input-gold"
                  style={{ fontSize: "0.82rem", padding: "0.55rem" }}
                />
              </div>

              {/* Description */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>Detailed Message Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide precise details of your support request or issue..."
                  value={newTicket.description}
                  onChange={e => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                  className="input-gold"
                  style={{ fontSize: "0.82rem", padding: "0.55rem", resize: "none" }}
                />
              </div>

              {/* Carbon Copy (CC) Option */}
              {companyUsers && companyUsers.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>
                    Carbon Copy (CC) Colleagues
                  </label>
                  <input
                    type="text"
                    placeholder="🔍 Search colleagues by name..."
                    value={ccSearchQuery}
                    onChange={e => setCcSearchQuery(e.target.value)}
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.4rem 0.6rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-dim)",
                      background: "rgba(15, 23, 42, 0.02)",
                      color: "var(--text-primary)",
                      outline: "none",
                      width: "100%",
                      boxSizing: "border-box"
                    }}
                  />
                  <div style={{ 
                    maxHeight: "100px", 
                    overflowY: "auto", 
                    border: "1px solid var(--border-dim)", 
                    borderRadius: "8px", 
                    padding: "0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                    background: "rgba(15, 23, 42, 0.01)"
                  }}>
                    {(() => {
                      const filtered = companyUsers.filter(u => {
                        const name = (u.name || "").toLowerCase();
                        const email = (u.email || "").toLowerCase();
                        const query = ccSearchQuery.toLowerCase();
                        return name.includes(query) || email.includes(query);
                      });
                      if (filtered.length === 0) {
                        return (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", padding: "0.25rem 0" }}>
                            No colleagues found matching &quot;{ccSearchQuery}&quot;
                          </span>
                        );
                      }
                      return filtered.map(u => (
                        <label key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", cursor: "pointer", color: "var(--text-primary)" }}>
                          <input
                            type="checkbox"
                            checked={selectedCcUserIds.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCcUserIds(prev => [...prev, u.id]);
                              } else {
                                setSelectedCcUserIds(prev => prev.filter(id => id !== u.id));
                              }
                            }}
                            style={{ accentColor: "var(--gold-premium)" }}
                          />
                          <span>{u.name || u.email} ({u.role.replace("_", " ")})</span>
                        </label>
                      ));
                    })()}
                  </div>
                  <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", lineHeight: "1.2" }}>
                    Selected colleagues will receive notifications and will be authorized to view this ticket.
                  </span>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-glass"
                  style={{ flex: 1, padding: "0.55rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-gold"
                  style={{ flex: 1, padding: "0.55rem" }}
                >
                  {isPending ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Update Status Modal Overlay */}
      {showActionModal && selectedTicket && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.3)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100, padding: "1rem" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "460px", background: "#FFFFFF", border: "1px solid var(--border-dim)", padding: "1.5rem", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)" }}>Manage Request: &quot;{selectedTicket.title}&quot;</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>Update the ticket&apos;s status and add resolution remarks.</p>
            </div>

            <form onSubmit={handleUpdateStatus} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Target Status */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>Target Ticket Status</label>
                <select
                  value={actionStatus}
                  onChange={e => setActionStatus(e.target.value as any)}
                  className="input-gold"
                  style={{ fontSize: "0.82rem", padding: "0.55rem" }}
                >
                  <option value="PENDING">Pending (Awaiting Action)</option>
                  <option value="IN_PROGRESS">In Progress (Active Work)</option>
                  <option value="RESOLVED">Resolved (Ticket Solved)</option>
                  <option value="REJECTED">Rejected (Declined/Closed)</option>
                </select>
              </div>

              {/* Resolution / Admin Notes */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>Resolution / Discussion Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Explain resolution details or comments to send back to the requester..."
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  className="input-gold"
                  style={{ fontSize: "0.82rem", padding: "0.55rem", resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="btn-glass"
                  style={{ flex: 1, padding: "0.55rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-gold"
                  style={{ flex: 1, padding: "0.55rem" }}
                >
                  {isPending ? "Saving..." : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
