"use client";

import React, { useState, useTransition } from "react";
import { X, Star, MessageSquare, Upload, CheckCircle2, Sparkles } from "lucide-react";
import { submitFeedbackAction } from "@/app/actions/feedback";
import { toast } from "react-hot-toast";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [isPending, startTransition] = useTransition();

  const [category, setCategory] = useState<"FEATURE_REQUEST" | "BUG_REPORT" | "SYSTEM_SPEED" | "SUGGESTION">("SUGGESTION");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);

  if (!isOpen) return null;

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
        toast.success("Attachment uploaded!");
      } else {
        toast.error("Upload failed.");
      }
    } catch {
      toast.error("Failed to upload screenshot.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
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
          toast.success(res.message || "Thank you! Your feedback has been submitted.");
          setSubject("");
          setMessage("");
          setAttachmentUrl("");
          onClose();
        } else {
          toast.error(res.error || "Failed to submit feedback.");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to submit feedback.");
      }
    });
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
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
        maxWidth: "520px",
        padding: "1.75rem",
        borderRadius: "12px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        maxHeight: "90vh",
        overflowY: "auto"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sparkles size={20} style={{ color: "#0077B6" }} />
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#03045E" }}>
              SUBMIT FEEDBACK & IDEAS
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
          Your feedback goes directly to the Super Admin &amp; Platform Owners to improve StaffOps!
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Category Selector */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#03045E", display: "block", marginBottom: "0.4rem" }}>
              Category
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
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
                    padding: "0.45rem 0.75rem",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: category === cat.id ? "1.5px solid #0077B6" : "1px solid #E5E7EB",
                    background: category === cat.id ? "rgba(0, 119, 182, 0.08)" : "#F9FAFB",
                    color: category === cat.id ? "#0077B6" : "#4B5563"
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Star Rating */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#03045E", display: "block", marginBottom: "0.3rem" }}>
              Platform Experience Rating
            </label>
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "0.2rem" }}
                >
                  <Star
                    size={24}
                    style={{
                      color: (hoverRating || rating) >= star ? "#F59E0B" : "#D1D5DB",
                      fill: (hoverRating || rating) >= star ? "#F59E0B" : "none"
                    }}
                  />
                </button>
              ))}
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#F59E0B", marginLeft: "0.4rem" }}>
                {rating}/5 Stars
              </span>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#03045E", display: "block", marginBottom: "0.2rem" }}>
              Title / Subject *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Add quick shortcut for post codes..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                fontSize: "0.82rem"
              }}
            />
          </div>

          {/* Message Textarea */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#03045E", display: "block", marginBottom: "0.2rem" }}>
              Detailed Description *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Explain your idea, issue, or suggestion in detail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                fontSize: "0.82rem",
                resize: "vertical"
              }}
            />
          </div>

          {/* Optional Attachment Upload */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#03045E", display: "block", marginBottom: "0.2rem" }}>
              Attach Screenshot (Optional)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <label style={{
                padding: "0.45rem 0.85rem",
                background: "#F3F4F6",
                border: "1px solid #D1D5DB",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "#374151",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                <Upload size={14} />
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
                <span style={{ fontSize: "0.75rem", color: "#10B981", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                  <CheckCircle2 size={14} /> Image Attached
                </span>
              )}
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "0.6rem",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                background: "#F3F4F6",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#374151",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || uploading}
              className="btn-gold"
              style={{
                flex: 1,
                padding: "0.6rem",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              {isPending ? "Submitting..." : "Submit Suggestion"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
