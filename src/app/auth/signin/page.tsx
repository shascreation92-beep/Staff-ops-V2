"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Shield, Key, Lock, ArrowRight, Server, Terminal } from "lucide-react";

export default function SignInPage() {
  const [selectedEmail, setSelectedEmail] = useState("admin@staffops.com");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse error parameters if any (e.g. NextAuth auth errors)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) {
        if (err === "OAuthSignin" || err === "OAuthCallback") {
          setError("Google Authentication failed. Please try again.");
        } else if (err === "Callback") {
          setError("Unauthorized access. Your account might be pending approval or blocked.");
        } else {
          setError(`Authentication error: ${err}`);
        }
      }
    }
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (err: any) {
      setError(err?.message || "An error occurred during Google sign-in.");
      setIsLoading(false);
    }
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await signIn("developer-login", {
        email: selectedEmail,
        callbackUrl: "/",
        redirect: true,
      });
      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Developer bypass failed.");
      setIsLoading(false);
    }
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
        maxWidth: "460px",
        width: "100%",
        padding: "2.5rem 2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        border: "1px solid var(--border-gold)",
        boxShadow: "var(--shadow-premium), var(--shadow-gold-glow)",
        background: "rgba(10, 10, 10, 0.95)"
      }}>
        {/* Logo and Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
          <div className="user-avatar-gold" style={{ width: "3.5rem", height: "3.5rem", fontSize: "1.5rem" }}>
            <Shield size={28} style={{ color: "var(--bg-primary)" }} />
          </div>
          <h1 className="text-gold-gradient" style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            letterSpacing: "0.05em",
            marginTop: "0.5rem"
          }}>
            STAFFOPS
          </h1>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Secure SaaS Portal
          </span>
        </div>

        {/* Info Box */}
        <div style={{
          background: "rgba(255, 215, 0, 0.03)",
          border: "1px solid rgba(255, 215, 0, 0.1)",
          borderRadius: "var(--border-radius-sm)",
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          fontSize: "0.8rem",
          color: "var(--text-secondary)"
        }}>
          <Server size={18} style={{ color: "var(--gold-primary)", flexShrink: 0 }} />
          <span>Multi-tenant isolation & data partition sharding enabled. Connection secure.</span>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--border-radius-sm)",
            padding: "0.75rem 1rem",
            color: "var(--color-danger)",
            fontSize: "0.85rem",
            textAlign: "center"
          }}>
            {error}
          </div>
        )}

        {/* Google Authentication Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="btn-gold"
          style={{
            width: "100%",
            height: "46px",
            fontSize: "0.95rem"
          }}
        >
          <Lock size={18} />
          {isLoading ? "AUTHORIZING..." : "SIGN IN WITH GOOGLE"}
        </button>

        {/* Or Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border-dim)" }}></div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>OR DEVELOPER BYPASS</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-dim)" }}></div>
        </div>

        {/* Developer Console bypass */}
        <form onSubmit={handleDevLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Terminal size={14} /> Select Identity
            </label>
            <select
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              className="select-gold"
              style={{ height: "42px" }}
              disabled={isLoading}
            >
              <option value="admin@staffops.com">admin@staffops.com (SUPER_ADMIN)</option>
              <option value="owner@acme.com">owner@acme.com (COMPANY_OWNER - Acme Corp)</option>
              <option value="lead@acme.com">lead@acme.com (TEAM_LEAD - Acme Corp)</option>
              <option value="sales@acme.com">sales@acme.com (SALES_ASSOCIATE - Acme Corp)</option>
              <option value="it@acme.com">it@acme.com (IT_DEPARTMENT - Acme Corp)</option>
              <option value="owner@betacorp.com">owner@betacorp.com (COMPANY_OWNER - Beta Corp [PENDING])</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-glass"
            style={{
              width: "100%",
              height: "42px",
              fontSize: "0.9rem"
            }}
          >
            <span>Bypass Auth & Enter</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Footer */}
        <div style={{
          textAlign: "center",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          marginTop: "0.5rem"
        }}>
          StaffOps V2.0 © 2026. Data strictly isolated under SOC2 guidelines.
        </div>
      </div>
    </div>
  );
}
