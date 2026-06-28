import React from "react";
import { HelpCircle } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isPending = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem"
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(212, 175, 55, 0.15)",
          borderRadius: "12px",
          position: "relative",
          background: "linear-gradient(135deg, rgba(20, 20, 20, 0.85) 0%, rgba(10, 10, 10, 0.95) 100%)",
          border: "1px solid rgba(212, 175, 55, 0.25)"
        }}
      >
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          <div
            style={{
              background: "rgba(212, 175, 55, 0.1)",
              borderRadius: "50%",
              padding: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(212, 175, 55, 0.3)",
              color: "var(--gold-primary)"
            }}
          >
            <HelpCircle size={24} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
              {title}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
              {message}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
          <button
            onClick={onCancel}
            disabled={isPending}
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "var(--text-secondary)",
              padding: "0.5rem 1.25rem",
              fontSize: "0.8rem",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="btn-gold"
            style={{
              padding: "0.5rem 1.25rem",
              fontSize: "0.8rem",
              borderRadius: "6px",
              cursor: "pointer",
              opacity: isPending ? 0.7 : 1,
              transition: "all 0.2s"
            }}
          >
            {isPending ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
