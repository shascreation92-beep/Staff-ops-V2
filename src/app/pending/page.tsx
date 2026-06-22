"use client";

import React, { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { ShieldAlert, LogOut, Loader2, Mail } from "lucide-react";
import { 
  getPendingUserStatusAction, 
  acceptJoinAction, 
  declineInvitationAction 
} from "@/app/actions/users";

export default function PendingPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [invitation, setInvitation] = useState<{ id: string; title: string; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async (isFirst = false) => {
    try {
      const res = await getPendingUserStatusAction();
      if (!res.authenticated) {
        // Redirect to sign in if no valid session
        window.location.href = "/auth/signin";
        return;
      }
      
      if (res.status === "APPROVED") {
        window.location.href = "/";
        return;
      }

      setUserId(res.id || "");
      setStatus(res.status || "");
      setRole(res.role || "");
      setInvitation(res.invitation || null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch status details.");
    } finally {
      if (isFirst) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchStatus(true));
    
    // Poll status every 5 seconds
    const interval = setInterval(() => {
      fetchStatus(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/signin" });
  };

  const handleAccept = async () => {
    if (!userId) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await acceptJoinAction(userId);
      if (res.success) {
        window.location.href = "/";
      }
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation.");
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!userId) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await declineInvitationAction("", true, userId);
      if (res.success) {
        signOut({ callbackUrl: "/auth/signin" });
      }
    } catch (err: any) {
      setError(err.message || "Failed to decline invitation.");
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "rgba(5, 5, 5, 0.98)"
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--gold-primary)" }} />
          <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontFamily: "var(--font-mono)" }}>
            INITIALIZING SECURITY SHARD...
          </span>
        </div>
      </div>
    );
  }

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
        {error && (
          <div style={{
            width: "100%",
            padding: "0.75rem 1rem",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--border-radius-sm)",
            color: "rgba(239, 68, 68, 0.9)",
            fontSize: "0.85rem",
            textAlign: "left"
          }}>
            {error}
          </div>
        )}

        {invitation ? (
          <>
            <div style={{
              width: "4.5rem",
              height: "4.5rem",
              borderRadius: "50%",
              background: "rgba(212, 175, 55, 0.06)",
              border: "1px solid rgba(212, 175, 55, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--gold-primary)",
              boxShadow: "0 0 15px rgba(212, 175, 55, 0.15)",
              position: "relative"
            }}>
              <Mail size={36} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <h1 className="text-gold-gradient" style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                letterSpacing: "0.05em"
              }}>
                INVITATION RECEIVED
              </h1>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {role.replace("_", " ")} ROLE OFFER
              </span>
            </div>

            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              {invitation.message}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", marginTop: "0.5rem" }}>
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="btn-gold"
                style={{
                  width: "100%",
                  height: "42px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                <span>Accept & Activate Account</span>
              </button>

              <button
                onClick={handleDecline}
                disabled={actionLoading}
                className="btn-glass"
                style={{
                  width: "100%",
                  height: "42px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "rgba(239, 68, 68, 0.9)"
                }}
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                <span>Decline Invitation</span>
              </button>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
