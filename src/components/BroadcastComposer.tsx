"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAnnouncementAction } from "@/app/actions/settings";
import { toast } from "react-hot-toast";

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  company?: { name: string } | null;
}

interface BroadcastComposerProps {
  currentUser: {
    id: string;
    role: string;
    email?: string | null;
    companyId?: string | null;
  };
  companies: any[];
  initialAnnouncements: any[];
}

export default function BroadcastComposer({ currentUser, initialAnnouncements }: BroadcastComposerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const res = await createAnnouncementAction({
          title: annTitle,
          content: annContent
        });

        if (res.success) {
          setAnnTitle("");
          setAnnContent("");
          setSuccessMsg("🚀 System announcement broadcast live successfully!");
          toast.success("Announcement distributed successfully!");
          router.refresh();
          setTimeout(() => setSuccessMsg(null), 4000);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to dispatch announcement.");
        toast.error(err.message || "Failed to dispatch announcement.");
      }
    });
  };

  const parseAnnTitle = (rawTitle: string) => {
    try {
      const parsed = JSON.parse(rawTitle);
      if (parsed && typeof parsed === 'object' && 'sender' in parsed) {
        return parsed as { sender: string; type: string; text: string };
      }
    } catch (e) {}
    return { sender: "COMPANY_HQ", type: "COMPANY_UPDATE", text: rawTitle };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>
          📢 Broadcast New Announcement
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
          Draft and publish real-time messages strictly scoped to your active company tenant.
        </p>
      </div>

      {successMsg && (
        <div style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-success)", fontSize: "0.85rem" }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "2.5rem" }}>
        {/* Composer Form Widget */}
        <form
          onSubmit={handleSendAnnouncement}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            background: "#FFFFFF",
            padding: "1.75rem",
            borderRadius: "8px",
            border: "1px solid var(--border-dim)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.02)"
          }}
        >
          <div className="form-group">
            <label className="form-label">Notice Heading</label>
            <input
              type="text"
              required
              placeholder="Enter announcement heading..."
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              className="input-gold"
              disabled={isPending}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Content Message</label>
            <textarea
              rows={6}
              required
              placeholder="Type your official announcement or technical notice here..."
              value={annContent}
              onChange={(e) => setAnnContent(e.target.value)}
              className="input-gold"
              style={{ resize: "none" }}
              disabled={isPending}
            />
          </div>

          <button
            type="submit"
            className="btn-gold"
            style={{ width: "100%", height: "42px", marginTop: "0.5rem" }}
            disabled={isPending}
          >
            {isPending ? "Broadcasting..." : "🚀 Broadcast Live"}
          </button>
        </form>

        {/* History / Archive Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.5rem", color: "var(--text-primary)" }}>
            Announcement History Log
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "480px", overflowY: "auto" }}>
            {initialAnnouncements.length === 0 ? (
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No broadcasts recorded.</span>
            ) : (
              initialAnnouncements.map((ann) => {
                const parsed = parseAnnTitle(ann.title);
                
                return (
                  <div key={ann.id} style={{ padding: "0.85rem", background: "#FFFFFF", border: "1px solid var(--border-gold)", borderRadius: "var(--border-radius-sm)", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {parsed.text}
                    </span>
                    <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                      {ann.content}
                    </p>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "0.1rem" }}>
                      Sent: {new Date(ann.createdAt).toLocaleString()} | Scope: {ann.company?.name || "Active Tenant"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
