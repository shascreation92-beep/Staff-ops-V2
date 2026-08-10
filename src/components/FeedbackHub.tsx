"use client";

import React, { useState, useTransition } from "react";
import { 
  Sparkles, 
  Send, 
  Upload, 
  CheckCircle2, 
  Star, 
  Clock, 
  MessageSquare, 
  Paperclip, 
  Search, 
  Filter, 
  Trash2, 
  ShieldCheck, 
  X, 
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { submitFeedbackAction, updateFeedbackStatusAction, deleteFeedbackAction } from "@/app/actions/feedback";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface FeedbackHubProps {
  userRole: string;
  initialHistory: any[];
  initialAdminFeedbackList: any[];
}

export default function FeedbackHub({ userRole, initialHistory, initialAdminFeedbackList }: FeedbackHubProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isAdmin = ["SUPER_ADMIN", "COMPANY_OWNER"].includes(userRole);

  // Active Tab: SUBMIT, HISTORY, or ADMIN (if admin)
  const [activeTab, setActiveTab] = useState<"SUBMIT" | "HISTORY" | "ADMIN">(
    isAdmin ? "ADMIN" : "SUBMIT"
  );

  // Submission Form State
  const [category, setCategory] = useState<"FEATURE_REQUEST" | "BUG_REPORT" | "SYSTEM_SPEED" | "SUGGESTION">("SUGGESTION");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);

  // User History State
  const [historyList, setHistoryList] = useState<any[]>(initialHistory);

  // Admin Management State
  const [adminFeedbackList, setAdminFeedbackList] = useState<any[]>(initialAdminFeedbackList);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Admin Respond Modal State
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [replyStatus, setReplyStatus] = useState<"NEW" | "IN_REVIEW" | "PLANNED" | "COMPLETED" | "DISMISSED">("IN_REVIEW");
  const [adminReplyInput, setAdminReplyInput] = useState("");

  // Preview Image Lightbox Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (data.url) {
        setAttachmentUrl(data.url);
        toast.success("Screenshot attached successfully!");
      } else {
        toast.error("Upload failed.");
      }
    } catch {
      toast.error("Failed to upload screenshot.");
    } finally {
      setUploading(false);
    }
  };

  // Submit Feedback Form Handler
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and detailed message are required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await submitFeedbackAction({
          category,
          rating,
          subject,
          message,
          attachmentUrl
        });

        if (res.success) {
          toast.success(res.message || "Feedback submitted!");
          setSubject("");
          setMessage("");
          setAttachmentUrl("");
          // Add to local history list
          setHistoryList(prev => [
            {
              id: res.feedbackId,
              category,
              rating,
              subject,
              message,
              attachmentUrl,
              status: "NEW",
              createdAt: new Date().toISOString()
            },
            ...prev
          ]);
          setActiveTab("HISTORY");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to submit feedback.");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to submit feedback.");
      }
    });
  };

  // Admin Respond Handler
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
          toast.success(res.message || "Updated successfully!");
          setSelectedFeedback(null);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to update.");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to update.");
      }
    });
  };

  // Admin Delete Handler
  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback entry?")) return;

    startTransition(async () => {
      const res = await deleteFeedbackAction(id);
      if (res.success) {
        toast.success("Feedback deleted.");
        setAdminFeedbackList(prev => prev.filter(item => item.id !== id));
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete.");
      }
    });
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
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

  const getStatusBadge = (st: string) => {
    switch (st) {
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
        return { label: st, bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
    }
  };

  // Filter Admin items
  const filteredAdminList = adminFeedbackList.filter(f => {
    const matchesSearch = 
      f.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.user?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.user?.email || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || f.status === statusFilter;
    const matchesCategory = categoryFilter === "ALL" || f.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: "1.5rem 1.75rem", background: "linear-gradient(135deg, #03045E 0%, #023E8A 100%)", color: "#FFFFFF" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Sparkles size={24} style={{ color: "#48CAE4" }} />
              <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>STAFF FEEDBACK &amp; SUGGESTION HUB</h1>
            </div>
            <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.75)" }}>
              Submit ideas, request features, report issues, and track status updates from Super Admin in real time.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="glass-panel" style={{ padding: "0.5rem", background: "#FFFFFF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveTab("SUBMIT")}
            style={{
              padding: "0.55rem 1.25rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              border: activeTab === "SUBMIT" ? "1.5px solid #0077B6" : "1px solid transparent",
              background: activeTab === "SUBMIT" ? "rgba(0, 119, 182, 0.08)" : "transparent",
              color: activeTab === "SUBMIT" ? "#0077B6" : "#4B5563",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              transition: "all 0.2s ease"
            }}
          >
            <Send size={16} />
            <span>🚀 Submit Suggestion</span>
          </button>

          <button
            onClick={() => setActiveTab("HISTORY")}
            style={{
              padding: "0.55rem 1.25rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              border: activeTab === "HISTORY" ? "1.5px solid #0077B6" : "1px solid transparent",
              background: activeTab === "HISTORY" ? "rgba(0, 119, 182, 0.08)" : "transparent",
              color: activeTab === "HISTORY" ? "#0077B6" : "#4B5563",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              transition: "all 0.2s ease"
            }}
          >
            <Clock size={16} />
            <span>📋 My Feedback History ({historyList.length})</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab("ADMIN")}
              style={{
                padding: "0.55rem 1.25rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                border: activeTab === "ADMIN" ? "1.5px solid #0077B6" : "1px solid transparent",
                background: activeTab === "ADMIN" ? "rgba(0, 119, 182, 0.08)" : "transparent",
                color: activeTab === "ADMIN" ? "#0077B6" : "#4B5563",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                marginLeft: "auto",
                transition: "all 0.2s ease"
              }}
            >
              <ShieldCheck size={16} />
              <span>🛡️ Admin Portal ({adminFeedbackList.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: SUBMIT FEEDBACK FORM */}
      {activeTab === "SUBMIT" && (
        <div className="glass-panel" style={{ padding: "2rem", background: "#FFFFFF", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <Sparkles size={22} style={{ color: "#0077B6" }} />
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#03045E" }}>
              SUBMIT NEW FEEDBACK OR FEATURE IDEA
            </h2>
          </div>

          <form onSubmit={handleSubmitForm} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Category */}
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#03045E", display: "block", marginBottom: "0.4rem" }}>
                Select Category *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.6rem" }}>
                {[
                  { id: "SUGGESTION", label: "💡 Suggestion" },
                  { id: "FEATURE_REQUEST", label: "🚀 New Feature" },
                  { id: "BUG_REPORT", label: "🐞 Bug Report" },
                  { id: "SYSTEM_SPEED", label: "⚡ System Speed" }
                ].map(cat => (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setCategory(cat.id as any)}
                    style={{
                      padding: "0.6rem 0.85rem",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: category === cat.id ? "2px solid #0077B6" : "1px solid #E5E7EB",
                      background: category === cat.id ? "rgba(0, 119, 182, 0.08)" : "#F9FAFB",
                      color: category === cat.id ? "#0077B6" : "#4B5563",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Star Rating */}
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#03045E", display: "block", marginBottom: "0.3rem" }}>
                Rate Your Platform Experience *
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}
                  >
                    <Star
                      size={28}
                      style={{
                        color: (hoverRating || rating) >= star ? "#F59E0B" : "#D1D5DB",
                        fill: (hoverRating || rating) >= star ? "#F59E0B" : "none"
                      }}
                    />
                  </button>
                ))}
                <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#F59E0B", marginLeft: "0.5rem" }}>
                  {rating} / 5 Stars
                </span>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#03045E", display: "block", marginBottom: "0.3rem" }}>
                Title / Subject *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Add quick filter for active Vinted accounts..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "0.88rem"
                }}
              />
            </div>

            {/* Detailed Description */}
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#03045E", display: "block", marginBottom: "0.3rem" }}>
                Detailed Description *
              </label>
              <textarea
                required
                rows={5}
                placeholder="Describe your suggestion, feature request, or issue in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "0.88rem",
                  resize: "vertical"
                }}
              />
            </div>

            {/* Screenshot Attachment */}
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#03045E", display: "block", marginBottom: "0.3rem" }}>
                Attach Screenshot or File (Optional)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <label style={{
                  padding: "0.55rem 1rem",
                  background: "#F3F4F6",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#374151",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}>
                  <Upload size={16} />
                  <span>{uploading ? "Uploading..." : "Choose Image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                    disabled={uploading}
                  />
                </label>

                {attachmentUrl && (
                  <span style={{ fontSize: "0.8rem", color: "#10B981", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    <CheckCircle2 size={16} /> Screenshot Attached
                  </span>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: "0.5rem" }}>
              <button
                type="submit"
                disabled={isPending || uploading}
                className="btn-gold"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                {isPending ? "Submitting to Super Admin..." : "Submit Suggestion"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: MY FEEDBACK HISTORY */}
      {activeTab === "HISTORY" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {historyList.length === 0 ? (
            <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", background: "#FFFFFF" }}>
              <MessageSquare size={36} style={{ margin: "0 auto 0.75rem auto", opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>You haven't submitted any feedback yet.</p>
            </div>
          ) : (
            historyList.map(item => {
              const catBadge = getCategoryBadge(item.category);
              const statBadge = getStatusBadge(item.status);
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
                    gap: "0.85rem"
                  }}
                >
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
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formattedDate}</span>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ margin: "0 0 0.35rem 0", fontSize: "1rem", fontWeight: 800, color: "#03045E" }}>{item.subject}</h3>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#374151", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>{item.message}</p>
                  </div>

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
                        <Paperclip size={14} /> View Screenshot
                      </button>
                    </div>
                  )}

                  {/* Super Admin Official Reply Box */}
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
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: ADMIN MANAGEMENT PORTAL (Super Admin & Company Owner) */}
      {activeTab === "ADMIN" && isAdmin && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Filter Bar */}
          <div className="glass-panel" style={{ padding: "0.85rem 1.25rem", background: "#FFFFFF" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
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

          {/* Feed List */}
          {filteredAdminList.length === 0 ? (
            <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", background: "#FFFFFF" }}>
              <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>No feedback submissions found.</p>
            </div>
          ) : (
            filteredAdminList.map((item) => {
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
                    gap: "0.85rem"
                  }}
                >
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
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formattedDate}</span>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ margin: "0 0 0.35rem 0", fontSize: "1rem", fontWeight: 800, color: "#03045E" }}>{item.subject}</h3>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#374151", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>{item.message}</p>
                  </div>

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

                  {/* User info & respond actions */}
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
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
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
                RESPOND &amp; UPDATE FEEDBACK STATUS
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
