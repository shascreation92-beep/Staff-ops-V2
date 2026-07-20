"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Shield, Lock, ArrowRight, Terminal, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("faizancheena9@gmail.com");
  const [password, setPassword] = useState("Cupoftea@90");
  const [activeRole, setActiveRole] = useState("SUPER_ADMIN");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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

  // Canvas background animation with interactive neural network
  useEffect(() => {
    const canvas = document.getElementById("auth-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = {
      x: null as number | null,
      y: null as number | null,
      radius: 130
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

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
        this.size = Math.random() * 2 + 1; // slightly larger for visibility
        this.speedX = (Math.random() - 0.5) * 0.45; // float slow in all directions
        this.speedY = (Math.random() - 0.5) * 0.45;
        this.opacity = Math.random() * 0.5 + 0.25;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Bounce off screen boundaries to keep particle density uniform
        if (this.x < 0 || this.x > width) this.speedX = -this.speedX;
        if (this.y < 0 || this.y > height) this.speedY = -this.speedY;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(72, 202, 228, ${this.opacity})`; // Worknode Cyan
        ctx.shadowBlur = this.size * 3;
        ctx.shadowColor = "rgba(72, 202, 228, 0.4)";
        ctx.fill();
      }
    }

    const particles: Particle[] = [];
    const particleCount = 80;
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Dynamic constellation connection logic
    const drawLines = () => {
      if (!ctx) return;
      for (let a = 0; a < particles.length; a++) {
        // Draw connection to cursor
        if (mouse.x !== null && mouse.y !== null) {
          const dx = particles[a].x - mouse.x;
          const dy = particles[a].y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const alpha = (1 - dist / mouse.radius) * 0.3;
            ctx.strokeStyle = `rgba(72, 202, 228, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        // Draw connections to other particles
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 90) {
            const alpha = (1 - dist / 90) * 0.15;
            ctx.strokeStyle = `rgba(72, 202, 228, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle futuristic network space grid
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(72, 202, 228, 0.015)";
      ctx.lineWidth = 1;
      const gridSize = 80;

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

      // Draw connections first
      drawLines();

      // Update and draw particles on top
      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const executeLogin = async (loginEmail: string, loginPassword: string) => {
    setIsLoading(true);
    setError(null);

    if (!loginEmail.trim()) {
      setError("Please specify a login email address.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await signIn("developer-login", {
        email: loginEmail,
        password: loginPassword,
        callbackUrl: "/",
        redirect: false,
      });

      if (res?.error) {
        setError(res.error === "CredentialsSignin" ? "Invalid email or password" : res.error);
        setIsLoading(false);
      } else if (res?.ok) {
        window.location.href = res.url || "/";
      } else {
        setError("Invalid email or password");
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Authentication failed.");
      setIsLoading(false);
    }
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(email, password);
  };

  const handleRoleSelection = (role: string, targetEmail: string, targetPassword = "pass123") => {
    setActiveRole(role);
    setEmail(targetEmail);
    setPassword(targetPassword);
    setError(null);
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
      background: "linear-gradient(135deg, #03045E 0%, #000814 100%)"
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .login-card-container {
          display: flex;
          flex-direction: row;
          max-width: 840px;
          width: 100%;
          border: 1px solid var(--border-dim);
          box-shadow: 0 10px 30px rgba(0, 119, 182, 0.08), 0 1px 3px rgba(0, 119, 182, 0.04);
          background: #FFFFFF;
          position: relative;
          z-index: 1;
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .login-brand-panel {
          flex: 1;
          background: linear-gradient(135deg, #0077B6 0%, #023E8A 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3.5rem 2.5rem;
          color: #FFFFFF;
          position: relative;
          text-align: center;
          gap: 0.8rem;
        }

        .login-form-panel {
          flex: 1.2;
          padding: 2.5rem 2.25rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 1.25rem;
          background: #FFFFFF;
        }

        @media (max-width: 768px) {
          .login-card-container {
            flex-direction: column;
            max-width: 440px;
            margin: 1rem auto;
          }
          .login-brand-panel {
            padding: 2.5rem 1.5rem;
          }
          .login-form-panel {
            padding: 2rem 1.5rem;
          }
        }

        .back-btn-hover:hover {
          color: #48CAE4 !important;
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(72, 202, 228, 0.35) !important;
          box-shadow: 0 4px 15px rgba(72, 202, 228, 0.1);
        }
      `}} />

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

      {/* Back Button */}
      <Link href="/" style={{
        position: "absolute",
        top: "1.5rem",
        left: "1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        textDecoration: "none",
        color: "rgba(255, 255, 255, 0.65)",
        fontSize: "0.8rem",
        fontWeight: 700,
        zIndex: 10,
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "20px",
        padding: "0.4rem 0.85rem",
        backdropFilter: "blur(8px)",
        transition: "all 0.25s ease",
        letterSpacing: "0.02em",
        textTransform: "uppercase"
      }}
      className="back-btn-hover"
      >
        <ArrowLeft size={14} />
        <span>Back to Home</span>
      </Link>

      <div className="login-card-container">
        {/* Left Column: Premium Branding Panel */}
        <div className="login-brand-panel">
          {/* Decorative ambient glows inside left panel */}
          <div style={{
            position: "absolute",
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            background: "rgba(72, 202, 228, 0.25)",
            filter: "blur(40px)",
            top: "10%",
            left: "10%",
            pointerEvents: "none"
          }} />
          <div style={{
            position: "absolute",
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            background: "rgba(0, 180, 216, 0.15)",
            filter: "blur(50px)",
            bottom: "10%",
            right: "10%",
            pointerEvents: "none"
          }} />

          {/* Glowing logo container */}
          <div style={{
            width: "5.5rem",
            height: "5.5rem",
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.15)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "0.5rem",
            zIndex: 1
          }}>
            <img src="/logo.png" alt="Worknode Logo" style={{
              width: "3.5rem",
              height: "3.5rem",
              objectFit: "contain",
              filter: "brightness(0) invert(1)"
            }} />
          </div>
          
          <h1 style={{
            fontSize: "2.1rem",
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "#FFFFFF",
            margin: 0,
            textShadow: "0 2px 10px rgba(0,0,0,0.15)",
            zIndex: 1
          }}>
            WORKNODE
          </h1>
          
          <span style={{
            fontSize: "0.75rem",
            color: "rgba(255, 255, 255, 0.75)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontWeight: 600,
            zIndex: 1
          }}>
            Secure SaaS Portal
          </span>
          
          <p style={{
            fontSize: "0.7rem",
            color: "rgba(255, 255, 255, 0.5)",
            letterSpacing: "0.08em",
            lineHeight: "1.5",
            maxWidth: "240px",
            marginTop: "1.5rem",
            textTransform: "uppercase",
            fontWeight: 500,
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            paddingTop: "1.5rem",
            zIndex: 1
          }}>
            Continuous Workflow & Collaboration Platform
          </p>
        </div>

        {/* Right Column: Clean Form Panel */}
        <div className="login-form-panel">
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

          {/* Developer Console bypass pills */}
          <form onSubmit={handleDevLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
              
              {/* Super Admin Pill Row */}
              <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                <button
                  type="button"
                  onClick={() => handleRoleSelection("SUPER_ADMIN", "faizancheena9@gmail.com", "Cupoftea@90")}
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
                  onClick={() => handleRoleSelection("COMPANY_OWNER", "owner@acme.com", "pass123")}
                  className={`glass-pill ${activeRole === "COMPANY_OWNER" ? "active" : ""}`}
                  style={{ flex: 1 }}
                  disabled={isLoading}
                >
                  Company
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelection("IT_DEPARTMENT", "it@acme.com", "pass123")}
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
                  onClick={() => handleRoleSelection("TEAM_LEAD", "lead@acme.com", "pass123")}
                  className={`glass-pill ${activeRole === "TEAM_LEAD" ? "active" : ""}`}
                  style={{ flex: 1 }}
                  disabled={isLoading}
                >
                  Team Lead
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelection("SALES_ASSOCIATE", "sales@acme.com", "pass123")}
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

              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="glass-input"
                  style={{ paddingRight: "2.5rem" }}
                />
                <span
                  onClick={() => !isLoading && setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    color: "#999999",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px",
                    userSelect: "none",
                    zIndex: 20,
                    pointerEvents: "auto"
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
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
                boxShadow: "0 4px 15px rgba(0, 119, 182, 0.2)",
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
    </div>
  );
}
