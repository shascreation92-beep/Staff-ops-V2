import React from "react";
import { HelpCircle, AlertTriangle, Trash2 } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
  confirmText?: string;
  variant?: "danger" | "warning" | "gold";
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isPending = false,
  confirmText = "Confirm",
  variant = "gold"
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(5, 4, 10, 0.7)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
        padding: "1rem"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) {
          onCancel();
        }
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.75), 0 0 30px rgba(56, 189, 248, 0.08)",
          borderRadius: "16px",
          position: "relative",
          background: "linear-gradient(180deg, rgba(20, 17, 38, 0.98) 0%, rgba(11, 9, 22, 0.99) 100%)",
          border: isDanger ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(56, 189, 248, 0.22)",
          backdropFilter: "blur(24px) saturate(190%)"
        }}
      >
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          <div
            style={{
              background: isDanger ? "rgba(239, 68, 68, 0.12)" : "rgba(56, 189, 248, 0.12)",
              borderRadius: "12px",
              padding: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: isDanger ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(56, 189, 248, 0.3)",
              color: isDanger ? "#EF4444" : "#38BDF8",
              flexShrink: 0
            }}
          >
            {isDanger ? <Trash2 size={22} /> : <HelpCircle size={22} />}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, color: "#FFFFFF", letterSpacing: "0.02em" }}>
              {title}
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
              {message}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.65rem", marginTop: "0.5rem" }}>
          <button
            onClick={onCancel}
            disabled={isPending}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "var(--text-secondary)",
              padding: "0.45rem 1.1rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              borderRadius: "8px",
              cursor: isPending ? "not-allowed" : "pointer",
              transition: "all 0.2s"
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            style={{
              background: isDanger 
                ? "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)" 
                : "var(--gold-gradient)",
              border: "none",
              color: "#FFFFFF",
              padding: "0.45rem 1.25rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              borderRadius: "8px",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
              boxShadow: isDanger 
                ? "0 0 15px rgba(239, 68, 68, 0.4)" 
                : "var(--shadow-gold-glow)",
              transition: "all 0.2s"
            }}
          >
            {isPending ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
