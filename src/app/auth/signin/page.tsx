"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Shield, Lock, ArrowRight, Terminal } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("admin@worknode.com");
  const [password, setPassword] = useState("••••••••");
  const [activeRole, setActiveRole] = useState("SUPER_ADMIN");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse error parameters if any
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

  // Canvas background animation
  useEffect(() => {
    const canvas = document.getElementById("auth-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Particle definition
    class Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 0.5;
        this.speedY = -(Math.random() * 0.4 + 0.15); // floats upward
        this.speedX = (Math.random() - 0.5) * 0.2;
        this.opacity = Math.random() * 0.5 + 0.15;
      }

      update() {
        this.y += this.speedY;
        this.x += this.speedX;

        // Horizonal bounds wrap
        if (this.x < 0 || this.x > width) {
          this.x = Math.random() * width;
        }

        // Off top screen boundary reset
        if (this.y < 0) {
          this.y = height;
          this.x = Math.random() * width;
          this.opacity = Math.random() * 0.5 + 0.15;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${this.opacity})`; // Emerald tint
        ctx.shadowBlur = this.size * 3;
        ctx.shadowColor = "rgba(16, 185, 129, 0.4)";
        ctx.fill();
      }
    }

    const particles: Particle[] = [];
    const particleCount = 70;
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle grid network lines
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(16, 185, 129, 0.03)";
      ctx.lineWidth = 1;
      const gridSize = 70;

      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
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

    if (!email.trim()) {
      setError("Please specify a login email address.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await signIn("developer-login", {
        email: email,
        password: password,
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

  const handleRoleSelection = (role: string, targetEmail: string) => {
    setActiveRole(role);
    setEmail(targetEmail);
  };



  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "1.5rem",
      position: "relative",
      overflow: "hidden",
      background: "linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)"
    }}>
      {/* Animated canvas starfield */}
      <canvas
        id="auth-canvas"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
          pointerEvents: "none"
        }}
      />

      <div className="glass-panel" style={{
        maxWidth: "440px",
        width: "100%",
        padding: "2.5rem 2.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        border: "1px solid var(--border-dim)",
        boxShadow: "0 10px 30px rgba(16, 185, 129, 0.1), 0 1px 3px rgba(16, 185, 129, 0.05)",
        background: "#FFFFFF",
        position: "relative",
        zIndex: 1,
        borderRadius: "16px"
      }}>
        {/* Logo and Header Block */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
          <div style={{
            width: "4.5rem",
            height: "4.5rem",
            borderRadius: "50%",
            backgroundColor: "var(--gold-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(0, 176, 116, 0.25)",
            border: "2px solid var(--gold-glow)"
          }}>
            <Shield size={34} style={{ color: "#FFFFFF" }} />
          </div>
          <h1 style={{
            fontSize: "1.9rem",
            fontWeight: 800,
            color: "var(--gold-primary)",
            letterSpacing: "0.08em",
            marginTop: "0.6rem"
          }}>
            WORKNODE
          </h1>
          <span style={{ 
            fontSize: "0.75rem", 
            color: "var(--text-secondary)", 
            letterSpacing: "0.18em", 
            textTransform: "uppercase",
            fontWeight: 600
          }}>
            Secure SaaS Portal
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--border-radius-sm)",
            padding: "0.6rem 0.85rem",
            color: "var(--color-danger)",
            fontSize: "0.8rem",
            textAlign: "center"
          }}>
            {error}
          </div>
        )}

        {/* Google Authentication Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          style={{
            width: "100%",
            height: "46px",
            fontSize: "0.9rem",
            fontWeight: 700,
            color: "#FFFFFF",
            backgroundColor: "var(--gold-primary)",
            border: "none",
            borderRadius: "6px",
            boxShadow: "0 4px 15px rgba(0, 176, 116, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            cursor: "pointer",
            letterSpacing: "0.04em",
            transition: "all 0.2s ease"
          }}
          className="btn-google-auth"
        >
          <Lock size={16} />
          <span>SIGN IN WITH GOOGLE</span>
        </button>

        {/* Or Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", width: "100%", margin: "0.25rem 0" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }}></div>
          <span style={{ fontSize: "0.7rem", color: "#555555", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            OR DEVELOPER BYPASS
          </span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }}></div>
        </div>

        {/* Developer Console bypass pills */}
        <form onSubmit={handleDevLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
            
            {/* Super Admin Pill Row */}
            <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
              <button
                type="button"
                onClick={() => handleRoleSelection("SUPER_ADMIN", "admin@worknode.com")}
                className={`glass-pill ${activeRole === "SUPER_ADMIN" ? "active" : ""}`}
                style={{ width: "100%", maxWidth: "250px" }}
                disabled={isLoading}
              >
                Super Admin
              </button>
            </div>

            {/* Company / IT Dept Row */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", width: "100%" }}>
              <button
                type="button"
                onClick={() => handleRoleSelection("COMPANY_OWNER", "owner@acme.com")}
                className={`glass-pill ${activeRole === "COMPANY_OWNER" ? "active" : ""}`}
                style={{ flex: 1 }}
                disabled={isLoading}
              >
                Company
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelection("IT_DEPARTMENT", "it@acme.com")}
                className={`glass-pill ${activeRole === "IT_DEPARTMENT" ? "active" : ""}`}
                style={{ flex: 1 }}
                disabled={isLoading}
              >
                IT Dept.
              </button>
            </div>

            {/* Team Lead / Sales Associate Row */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", width: "100%" }}>
              <button
                type="button"
                onClick={() => handleRoleSelection("TEAM_LEAD", "lead@acme.com")}
                className={`glass-pill ${activeRole === "TEAM_LEAD" ? "active" : ""}`}
                style={{ flex: 1 }}
                disabled={isLoading}
              >
                Team Lead
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelection("SALES_ASSOCIATE", "sales@acme.com")}
                className={`glass-pill ${activeRole === "SALES_ASSOCIATE" ? "active" : ""}`}
                style={{ flex: 1 }}
                disabled={isLoading}
              >
                Sales Rep.
              </button>
            </div>
          </div>

          {/* Form Inputs (Custom Style) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.25rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <input
                type="text"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setActiveRole(""); // remove active pill highlight when customized
                }}
                disabled={isLoading}
                className="glass-input"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="glass-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              height: "44px",
              fontSize: "0.9rem",
              fontWeight: 700,
              color: "#FFFFFF",
              backgroundColor: "var(--gold-primary)",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(0, 176, 116, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              marginTop: "0.25rem",
              transition: "all 0.2s ease"
            }}
            className="btn-signin-enter"
          >
            <span>SIGN IN & ENTER</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Footer info */}
        <div style={{
          textAlign: "center",
          fontSize: "0.7rem",
          color: "#555555",
          marginTop: "0.25rem"
        }}>
          Worknode V2.0 © 2026. Data strictly isolated under SOC2 guidelines.
        </div>
      </div>
    </div>
  );
}
