"use client";

import React, { useState, useTransition } from "react";
import { 
  Sparkles, 
  Search, 
  Filter, 
  MessageSquare, 
  Star, 
  CheckCircle2, 
  Clock, 
  Paperclip, 
  Send, 
  Trash2, 
  ExternalLink,
  ThumbsUp,
  AlertTriangle,
  Zap,
  HelpCircle,
  X
} from "lucide-react";
import { updateFeedbackStatusAction, deleteFeedbackAction } from "@/app/actions/feedback";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface FeedbackDashboardProps {
  initialFeedback: any[];
  userRole: string;
}

export default function FeedbackDashboard({ initialFeedback, userRole }: FeedbackDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [feedbackList, setFeedbackList] = useState<any[]>(initialFeedback);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Selected feedback item for Admin Reply & Status Modal
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [replyStatus, setReplyStatus] = useState<"NEW" | "IN_REVIEW" | "PLANNED" | "COMPLETED" | "DISMISSED">("IN_REVIEW");
  const [adminReplyInput, setAdminReplyInput] = useState("");

  // Preview Image Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Calculate Metrics
  const totalCount = feedbackList.length;
  const newCount = feedbackList.filter(f => f.status === "NEW").length;
  const plannedCount = feedbackList.filter(f => ["PLANNED", "COMPLETED"].includes(f.status)).length;
  const avgRating = totalCount > 0 
    ? (feedbackList.reduce((acc, curr) => acc + (curr.rating || 5), 0) / totalCount).toFixed(1)
    : "5.0";

  // Filter items
  const filteredFeedback = feedbackList.filter(f => {
    const matchesSearch = 
      f.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.user?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.user?.email || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || f.status === statusFilter;
    const matchesCategory = categoryFilter === "ALL" || f.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback) return;

    startTransition(async () => {
      try {
        const res = await updateFeedbackStatusAction({
          feedbackId: selectedFeedback.id,
          status: replyStatus,
          adminReply: adminReplyInput
        });

        if (res.success) {
          toast.success(res.message || "Feedback updated successfully!");
          setSelectedFeedback(null);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to update feedback.");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to update feedback.");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback entry?")) return;

    startTransition(async () => {
      const res = await deleteFeedbackAction(id);
      if (res.success) {
        toast.success("Feedback entry deleted.");
        setFeedbackList(prev => prev.filter(item => item.id !== id));
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete.");
      }
    });
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "FEATURE_REQUEST":
        return { label: "🚀 Feature Request", bg: "rgba(14, 165, 233, 0.1)", color: "#0284C7", border: "rgba(14, 165, 233, 0.25)" };
      case "BUG_REPORT":
        return { label: "🐞 Bug Report", bg: "rgba(239, 68, 68, 0.1)", color: "#EF4444", border: "rgba(239, 68, 68, 0.25)" };
      case "SYSTEM_SPEED":
        return { label: "⚡ System Speed", bg: "rgba(245, 158, 11, 0.1)", color: "#D97706", border: "rgba(245, 158, 11, 0.25)" };
      default:
        return { label: "💡 Suggestion", bg: "rgba(16, 185, 129, 0.1)", color: "#10B981", border: "rgba(16, 185, 129, 0.25)" };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return { label: "NEW", bg: "rgba(59, 130, 246, 0.1)", color: "#3B82F6", border: "rgba(59, 130, 246, 0.3)" };
      case "IN_REVIEW":
        return { label: "IN REVIEW", bg: "rgba(245, 158, 11, 0.1)", color: "#D97706", border: "rgba(245, 158, 11, 0.3)" };
      case "PLANNED":
        return { label: "PLANNED", bg: "rgba(147, 51, 234, 0.1)", color: "#9333EA", border: "rgba(147, 51, 234, 0.3)" };
      case "COMPLETED":
        return { label: "COMPLETED", bg: "rgba(16, 185, 129, 0.1)", color: "#10B981", border: "rgba(16, 185, 129, 0.3)" };
      case "DISMISSED":
        return { label: "DISMISSED", bg: "rgba(107, 114, 128, 0.1)", color: "#6B7280", border: "rgba(107, 114, 128, 0.3)" };
      default:
        return { label: status, bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: "1.5rem 1.75rem", background: "linear-gradient(135deg, #03045E 0%, #023E8A 100%)", color: "#FFFFFF" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Sparkles size={24} style={{ color: "#48CAE4" }} />
              <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>STAFF FEEDBACK & SUGGESTIONS</h1>
            </div>
            <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.75)" }}>
              Review staff suggestions, feature requests, and bug reports to drive continuous platform improvement.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Summary Grid */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-info">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Submissions</span>
            <MessageSquare size={18} style={{ color: "#3B82F6" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#03045E", marginTop: "0.4rem" }}>{totalCount}</div>
        </div>

        <div className="kpi-card kpi-success">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>New Submissions</span>
            <Clock size={18} style={{ color: "#10B981" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#10B981", marginTop: "0.4rem" }}>{newCount}</div>
        </div>

        <div className="kpi-card kpi-info">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Planned / Delivered</span>
            <CheckCircle2 size={18} style={{ color: "#9333EA" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#9333EA", marginTop: "0.4rem" }}>{plannedCount}</div>
        </div>

        <div className="kpi-card kpi-success">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Avg Staff Rating</span>
            <Star size={18} style={{ color: "#F59E0B", fill: "#F59E0B" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#F59E0B", marginTop: "0.4rem" }}>{avgRating} / 5.0</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: "0.85rem 1.25rem", background: "#FFFFFF" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          {/* Search Box */}
          <div className="table-search-wrapper" style={{ width: "260px" }}>
            <Search className="header-search-icon" />
            <input
              type="text"
              placeholder="Search feedback, staff, subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="header-search-input"
            />
          </div>

          {/* Select Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="table-select-filter"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="NEW">NEW</option>
              <option value="IN_REVIEW">IN REVIEW</option>
              <option value="PLANNED">PLANNED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="DISMISSED">DISMISSED</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="table-select-filter"
            >
              <option value="ALL">ALL CATEGORIES</option>
              <option value="SUGGESTION">💡 SUGGESTION</option>
              <option value="FEATURE_REQUEST">🚀 FEATURE REQUEST</option>
              <option value="BUG_REPORT">🐞 BUG REPORT</option>
              <option value="SYSTEM_SPEED">⚡ SYSTEM SPEED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feedback Feed Cards List */}
      {filteredFeedback.length === 0 ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          <MessageSquare size={36} style={{ margin: "0 auto 0.75rem auto", opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>No feedback entries found matching your filter criteria.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredFeedback.map((item) => {
            const catBadge = getCategoryBadge(item.category);
            const statBadge = getStatusBadge(item.status);
            const userName = item.user?.name || item.user?.email || "Staff Member";
            const userRoleText = item.user?.role?.replace("_", " ") || "Operator";
            const companyName = item.user?.company?.name || "Global Tenant";
            const formattedDate = new Date(item.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  background: "#FFFFFF",
                  padding: "1.25rem 1.5rem",
                  borderLeft: `4px solid ${statBadge.color}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                  transition: "all 0.2s ease"
                }}
              >
                {/* Top Row: Category, Rating, Status, Date */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      padding: "0.25rem 0.6rem",
                      borderRadius: "6px",
                      background: catBadge.bg,
                      color: catBadge.color,
                      border: `1px solid ${catBadge.border}`
                    }}>
                      {catBadge.label}
                    </span>

                    {/* Star Rating */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.15rem" }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          size={14}
                          style={{
                            color: s <= (item.rating || 5) ? "#F59E0B" : "#E5E7EB",
                            fill: s <= (item.rating || 5) ? "#F59E0B" : "none"
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      padding: "0.2rem 0.6rem",
                      borderRadius: "9999px",
                      background: statBadge.bg,
                      color: statBadge.color,
                      border: `1px solid ${statBadge.border}`
                    }}>
                      {statBadge.label}
                    </span>

                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {formattedDate}
                    </span>
                  </div>
                </div>

                {/* Subject & Message Body */}
                <div>
                  <h3 style={{ margin: "0 0 0.35rem 0", fontSize: "1rem", fontWeight: 800, color: "#03045E" }}>
                    {item.subject}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#374151", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                    {item.message}
                  </p>
                </div>

                {/* Attachment Thumbnail if present */}
                {item.attachmentUrl && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(item.attachmentUrl)}
                      style={{
                        padding: "0.35rem 0.65rem",
                        background: "rgba(0, 119, 182, 0.08)",
                        border: "1px solid rgba(0, 119, 182, 0.2)",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#0077B6",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem"
                      }}
                    >
                      <Paperclip size={14} /> View Attached Screenshot
                    </button>
                  </div>
                )}

                {/* Admin Reply Box if present */}
                {item.adminReply && (
                  <div style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", fontWeight: 700, color: "#0284C7" }}>
                      <span>💬 Super Admin Reply ({item.repliedBy || "Admin"})</span>
                      <span>{item.repliedAt ? new Date(item.repliedAt).toLocaleDateString("en-GB") : ""}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "#334155", fontStyle: "italic" }}>
                      "{item.adminReply}"
                    </p>
                  </div>
                )}

                {/* Bottom Row: User Info & Actions */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  paddingTop: "0.6rem",
                  borderTop: "1px solid #F1F5F9"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #0077B6, #023E8A)",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.75rem"
                    }}>
                      {userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#03045E" }}>{userName}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                        ({userRoleText} • {companyName})
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                      onClick={() => {
                        setSelectedFeedback(item);
                        setReplyStatus(item.status || "IN_REVIEW");
                        setAdminReplyInput(item.adminReply || "");
                      }}
                      className="btn-gold"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.76rem" }}
                    >
                      <Send size={13} />
                      <span>{item.adminReply ? "Edit Reply / Status" : "Respond & Update"}</span>
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="btn-danger"
                      style={{ padding: "0.35rem 0.6rem", fontSize: "0.76rem" }}
                      title="Delete Feedback"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Respond & Status Modal */}
      {selectedFeedback && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(3, 4, 94, 0.45)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div className="glass-panel" style={{
            background: "#FFFFFF",
            width: "100%",
            maxWidth: "500px",
            padding: "1.75rem",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#03045E" }}>
                RESPOND & UPDATE FEEDBACK STATUS
              </h3>
              <button onClick={() => setSelectedFeedback(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: "#F8FAFC", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#03045E" }}>{selectedFeedback.subject}</div>
              <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.2rem" }}>
                Submitted by {selectedFeedback.user?.name || selectedFeedback.user?.email}
              </div>
            </div>

            <form onSubmit={handleUpdateStatus} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#03045E", display: "block", marginBottom: "0.4rem" }}>
                  Update Status
                </label>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontSize: "0.82rem",
                    fontWeight: 600
                  }}
                >
                  <option value="NEW">🔵 NEW (Unreviewed)</option>
                  <option value="IN_REVIEW">🟡 IN REVIEW (Evaluating)</option>
                  <option value="PLANNED">🟣 PLANNED (Added to Roadmap)</option>
                  <option value="COMPLETED">🟢 COMPLETED (Delivered)</option>
                  <option value="DISMISSED">⚪ DISMISSED (Closed)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#03045E", display: "block", marginBottom: "0.4rem" }}>
                  Super Admin Official Reply (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Type an official response or update for the staff member..."
                  value={adminReplyInput}
                  onChange={(e) => setAdminReplyInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontSize: "0.82rem"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                  style={{ flex: 1, padding: "0.6rem", borderRadius: "6px", border: "1px solid #D1D5DB", background: "#F3F4F6", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-gold"
                  style={{ flex: 1, padding: "0.6rem", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}
                >
                  {isPending ? "Saving..." : "Save Status & Reply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Image Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            cursor: "pointer"
          }}
        >
          <img 
            src={previewImage} 
            alt="Attached Screenshot" 
            style={{ maxWidth: "90%", maxHeight: "90vh", borderRadius: "8px", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }} 
          />
        </div>
      )}

    </div>
  );
}
