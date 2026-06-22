"use client";

import React from "react";
import { signOut } from "next-auth/react";
import { ShieldAlert, LogOut, Loader2, Mail } from "lucide-react";

export default function PendingPage() {
  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/signin" });
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "1.5rem",
      position: "relative",
      zIndex: 1
    }}>
      <div className="glass-panel" style={{
        maxWidth: "500px",
        width: "100%",
        padding: "2.5rem 2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "1.5rem",
        border: "1px solid var(--border-gold)",
        boxShadow: "var(--shadow-premium), var(--shadow-gold-glow)",
        background: "rgba(10, 10, 10, 0.95)"
      }}>
        <div style={{
          width: "4.5rem",
          height: "4.5rem",
          borderRadius: "50%",
          background: "rgba(245, 158, 11, 0.06)",
          border: "1px solid rgba(245, 158, 11, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-warning)",
          boxShadow: "0 0 15px rgba(245, 158, 11, 0.15)",
          position: "relative"
        }}>
          <ShieldAlert size={36} />
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "12px",
            height: "12px",
            background: "var(--color-warning)",
            borderRadius: "50%",
            animation: "pulse 2s infinite"
          }}></div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <h1 className="text-gold-gradient" style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            letterSpacing: "0.05em"
          }}>
            ACCESS PENDING APPROVAL
          </h1>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Identity Security Verification
          </span>
        </div>

        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
          Your Google account is registered on our servers. A notification has been dispatched to the 
          <strong> Super Admin</strong>, <strong>Team Lead</strong>, and <strong>IT Department</strong>.
          <br /><br />
          You will be granted access to the control panel immediately upon approval.
        </p>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
          background: "rgba(255, 255, 255, 0.01)",
          padding: "0.5rem 1rem",
          borderRadius: "var(--border-radius-sm)",
          border: "1px solid var(--border-dim)"
        }}>
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--gold-primary)" }} />
          <span>Listening for approval broadcast...</span>
        </div>

        <button
          onClick={handleSignOut}
          className="btn-glass"
          style={{
            width: "100%",
            height: "42px",
            marginTop: "0.5rem"
          }}
        >
          <LogOut size={16} />
          <span>Return to Sign In</span>
        </button>
      </div>
    </div>
  );
}
