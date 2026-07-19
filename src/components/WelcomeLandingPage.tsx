"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";
import { submitContactForm } from "@/app/actions/contact";

export default function WelcomeLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await submitContactForm(null, formData);
      if (res.success) {
        setFormSuccess(true);
        form.reset();
      } else {
        setFormError(res.error || "Failed to submit. Please try again.");
      }
    } catch (err: any) {
      console.error("Contact form client error:", err);
      setFormError(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Canvas background animation with interactive neural network
  useEffect(() => {
    const canvas = document.getElementById("landing-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = {
      x: null as number | null,
      y: null as number | null,
      radius: 140
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
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() - 0.5) * 0.45;
        this.speedY = (Math.random() - 0.5) * 0.45;
        this.opacity = Math.random() * 0.5 + 0.25;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Bounce boundaries
        if (this.x < 0 || this.x > width) this.speedX = -this.speedX;
        if (this.y < 0 || this.y > height) this.speedY = -this.speedY;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(72, 202, 228, ${this.opacity})`;
        ctx.shadowBlur = this.size * 3;
        ctx.shadowColor = "rgba(72, 202, 228, 0.4)";
        ctx.fill();
      }
    }

    const particles: Particle[] = [];
    const particleCount = 85;
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const drawLines = () => {
      if (!ctx) return;
      for (let a = 0; a < particles.length; a++) {
        // Connection to cursor
        if (mouse.x !== null && mouse.y !== null) {
          const dx = particles[a].x - mouse.x;
          const dy = particles[a].y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const alpha = (1 - dist / mouse.radius) * 0.35;
            ctx.strokeStyle = `rgba(72, 202, 228, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        // Connection to other particles
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 95) {
            const alpha = (1 - dist / 95) * 0.15;
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

      // Draw grid
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(72, 202, 228, 0.012)";
      ctx.lineWidth = 1;
      const gridSize = 90;

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

      drawLines();

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

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      position: "relative",
      overflowX: "hidden",
      background: "linear-gradient(135deg, #03045E 0%, #000814 100%)",
      fontFamily: "var(--font-sans, sans-serif)",
      color: "#FFFFFF"
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(72, 202, 228, 0.2) !important;
          box-shadow: 0 10px 25px rgba(0, 119, 182, 0.15);
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(46, 196, 182, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(46, 196, 182, 0); }
          100% { box-shadow: 0 0 0 0 rgba(46, 196, 182, 0); }
        }
        .pulse-dot {
          animation: pulse 2s infinite;
        }

        @media (max-width: 768px) {
          .live-status {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          .nav-links {
            display: none !important;
          }
        }
      `}} />
      {/* Decorative ambient glows */}
      <div style={{
        position: "absolute",
        width: "350px",
        height: "350px",
        borderRadius: "50%",
        background: "rgba(0, 119, 182, 0.2)",
        filter: "blur(80px)",
        top: "20%",
        left: "10%",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute",
        width: "400px",
        height: "400px",
        borderRadius: "50%",
        background: "rgba(72, 202, 228, 0.15)",
        filter: "blur(90px)",
        bottom: "15%",
        right: "10%",
        pointerEvents: "none"
      }} />

      {/* Interactive canvas starfield */}
      <canvas
        id="landing-canvas"
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

      {/* Header Sticky Navbar */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        width: "100%",
        backdropFilter: "blur(12px)",
        background: "rgba(3, 4, 94, 0.25)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        padding: "1rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "2.5rem",
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          justifyContent: "space-between"
        }}>
          {/* Brand Logo & Name */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img src="/logo.png" alt="Worknode Logo" style={{
              width: "2.2rem",
              height: "2.2rem",
              objectFit: "contain",
              filter: "brightness(0) invert(1)"
            }} />
            <span style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#FFFFFF",
              textTransform: "uppercase"
            }}>
              Worknode
            </span>
          </div>

          {/* Navigation Links */}
          <div className="nav-links" style={{ display: "flex", gap: "2.25rem", alignItems: "center" }}>
            <a href="#features" style={{ textDecoration: "none", color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem", fontWeight: 600, transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#48CAE4"} onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)"}>Features</a>
            <a href="#faq" style={{ textDecoration: "none", color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem", fontWeight: 600, transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#48CAE4"} onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)"}>FAQ</a>
            <a href="#contact" style={{ textDecoration: "none", color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem", fontWeight: 600, transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#48CAE4"} onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)"}>Contact</a>
            <Link href="/about" style={{ textDecoration: "none", color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem", fontWeight: 600, transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#48CAE4"} onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)"}>About Us</Link>
          </div>

          {/* Live Status Indicator */}
          <div className="live-status" style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            background: "rgba(46, 196, 182, 0.08)",
            border: "1px solid rgba(46, 196, 182, 0.2)",
            borderRadius: "15px",
            padding: "0.3rem 0.8rem",
            fontSize: "0.75rem",
            color: "#2EC4B6",
            fontWeight: 600
          }}>
            <span className="pulse-dot" style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#2EC4B6",
              display: "inline-block"
            }} />
            <span>Systems Live</span>
          </div>

          {/* CTA Sign In Button */}
          <Link href="/auth/signin" style={{
            textDecoration: "none",
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "#FFFFFF",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "8px",
            padding: "0.5rem 1.1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.15)",
            transition: "all 0.2s ease",
            backdropFilter: "blur(4px)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
          }}
          >
            <span>Sign In</span>
            <LogIn size={15} />
          </Link>
        </div>
      </header>

      {/* Main Hero Body Section */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 2rem",
        zIndex: 1,
        textAlign: "center"
      }}>
        <div style={{
          maxWidth: "750px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem"
        }}>
          {/* Animated Badge */}
          <div style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            background: "linear-gradient(135deg, rgba(72, 202, 228, 0.2) 0%, rgba(0, 119, 182, 0.2) 100%)",
            border: "1px solid rgba(72, 202, 228, 0.3)",
            borderRadius: "30px",
            padding: "0.4rem 1rem",
            color: "#48CAE4",
            boxShadow: "0 0 15px rgba(72, 202, 228, 0.1)"
          }}>
            Next-Gen Workforce Hub
          </div>

          {/* Slogan */}
          <h1 style={{
            fontSize: "3.25rem",
            fontWeight: 800,
            letterSpacing: "-0.01em",
            lineHeight: "1.15",
            margin: "0.25rem 0",
            background: "linear-gradient(to right, #FFFFFF 10%, #ADE8F4 50%, #48CAE4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            Smarter Teams.<br />Better Business.
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: "1.15rem",
            color: "rgba(255, 255, 255, 0.7)",
            lineHeight: "1.6",
            maxWidth: "520px",
            margin: "0 auto",
            fontWeight: 400
          }}>
            Everything You Need to Manage Your Team Efficiently.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
            <Link href="/auth/signin" style={{
              textDecoration: "none",
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "#FFFFFF",
              backgroundColor: "#0077B6",
              border: "none",
              borderRadius: "8px",
              padding: "0.8rem 1.6rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 8px 20px rgba(0, 119, 182, 0.3)",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#0096C7";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 150, 199, 0.4)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#0077B6";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 119, 182, 0.3)";
              e.currentTarget.style.transform = "none";
            }}
            >
              <span>Get Started Now</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </main>

      {/* Metrics Section */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "1.5rem",
        width: "100%",
        maxWidth: "1100px",
        margin: "0 auto 3rem auto",
        padding: "0 1.5rem",
        zIndex: 1
      }}>
        {/* Metric 1 */}
        <div className="glass-card" style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "12px",
          padding: "2rem 1.5rem",
          textAlign: "center",
          backdropFilter: "blur(8px)",
          transition: "all 0.3s ease"
        }}>
          <h3 style={{ fontSize: "2.5rem", fontWeight: 800, color: "#ADE8F4", margin: "0 0 0.5rem 0" }}>99.99%</h3>
          <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.6)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, margin: 0 }}>System SLA Uptime</p>
        </div>
        {/* Metric 2 */}
        <div className="glass-card" style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "12px",
          padding: "2rem 1.5rem",
          textAlign: "center",
          backdropFilter: "blur(8px)",
          transition: "all 0.3s ease"
        }}>
          <h3 style={{ fontSize: "2.5rem", fontWeight: 800, color: "#ADE8F4", margin: "0 0 0.5rem 0" }}>14k+</h3>
          <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.6)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, margin: 0 }}>Operations Dispatched</p>
        </div>
        {/* Metric 3 */}
        <div className="glass-card" style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "12px",
          padding: "2rem 1.5rem",
          textAlign: "center",
          backdropFilter: "blur(8px)",
          transition: "all 0.3s ease"
        }}>
          <h3 style={{ fontSize: "2.5rem", fontWeight: 800, color: "#ADE8F4", margin: "0 0 0.5rem 0" }}>Zero-Trust</h3>
          <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.6)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, margin: 0 }}>SOC2 Security Shield</p>
        </div>
      </div>

      {/* Partner Logos Section */}
      <div style={{
        width: "100%",
        maxWidth: "1100px",
        margin: "2rem auto 4rem auto",
        textAlign: "center",
        padding: "0 1.5rem",
        zIndex: 1
      }}>
        <p style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "1.5rem", fontWeight: 700 }}>
          INTEGRATED SYSTEM TECHNOLOGY
        </p>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "3.5rem",
          opacity: 0.45
        }}>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.1em", color: "#FFFFFF" }}>PRISMA</span>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.15em", color: "#FFFFFF" }}>NEXT.JS</span>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.1em", color: "#FFFFFF" }}>PUSHER</span>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.1em", color: "#FFFFFF" }}>NEXTAUTH</span>
        </div>
      </div>

      {/* How It Works Section */}
      <div id="flow" style={{
        width: "100%",
        maxWidth: "1100px",
        margin: "4rem auto 4.5rem auto",
        padding: "0 1.5rem",
        zIndex: 1
      }}>
        <h2 style={{
          textAlign: "center",
          fontSize: "1.75rem",
          fontWeight: 800,
          background: "linear-gradient(to right, #FFFFFF, #E0F2FE, #ADE8F4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "2.5rem",
          letterSpacing: "-0.01em"
        }}>
          How Worknode Operates
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "2rem"
        }}>
          {/* Step 1 */}
          <div className="glass-card" style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            padding: "2rem 1.75rem",
            backdropFilter: "blur(6px)",
            position: "relative",
            transition: "all 0.3s ease"
          }}>
            <div style={{
              position: "absolute",
              top: "1.5rem",
              right: "1.5rem",
              fontSize: "2.5rem",
              fontWeight: 950,
              color: "rgba(72, 202, 228, 0.3)",
              lineHeight: 1
            }}>01</div>
            <h4 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 0.75rem 0", color: "#48CAE4" }}>1. Provision Workspace</h4>
            <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.55)", margin: 0, lineHeight: "1.5" }}>
              Organizations instantly create a secure, isolated workspace instance. Multi-tenant filtering ensures all tenant data streams are completely partitioned.
            </p>
          </div>

          {/* Step 2 */}
          <div className="glass-card" style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            padding: "2rem 1.75rem",
            backdropFilter: "blur(6px)",
            position: "relative",
            transition: "all 0.3s ease"
          }}>
            <div style={{
              position: "absolute",
              top: "1.5rem",
              right: "1.5rem",
              fontSize: "2.5rem",
              fontWeight: 950,
              color: "rgba(72, 202, 228, 0.3)",
              lineHeight: 1
            }}>02</div>
            <h4 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 0.75rem 0", color: "#48CAE4" }}>2. Build & Dispatch Roster</h4>
            <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.55)", margin: 0, lineHeight: "1.5" }}>
              Team leads design live rosters, set schedules, and dispatch operational updates. Shift changes are recorded instantly into the secure audit log.
            </p>
          </div>

          {/* Step 3 */}
          <div className="glass-card" style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            padding: "2rem 1.75rem",
            backdropFilter: "blur(6px)",
            position: "relative",
            transition: "all 0.3s ease"
          }}>
            <div style={{
              position: "absolute",
              top: "1.5rem",
              right: "1.5rem",
              fontSize: "2.5rem",
              fontWeight: 950,
              color: "rgba(72, 202, 228, 0.3)",
              lineHeight: 1
            }}>03</div>
            <h4 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 0.75rem 0", color: "#48CAE4" }}>3. Instant Live Synchronization</h4>
            <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.55)", margin: 0, lineHeight: "1.5" }}>
              Pusher sync channels automatically distribute status alerts and live rosters to team leads and associates on the ground.
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid Section */}
      <div id="features" style={{
        width: "100%",
        maxWidth: "1100px",
        margin: "3rem auto 4rem auto",
        padding: "0 1.5rem",
        zIndex: 1
      }}>
        <h2 style={{
          textAlign: "center",
          fontSize: "1.75rem",
          fontWeight: 800,
          background: "linear-gradient(to right, #FFFFFF, #E0F2FE, #ADE8F4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "2.5rem",
          letterSpacing: "-0.01em"
        }}>
          Designed for Modern Teams
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem"
        }}>
          <div className="glass-card" style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            padding: "2rem 1.75rem",
            backdropFilter: "blur(6px)",
            transition: "all 0.3s ease"
          }}>
            <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "8px", background: "rgba(72, 202, 228, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#48CAE4", marginBottom: "1.25rem" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#FFFFFF" }}>Live Communications</h4>
            <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.5)", margin: 0, lineHeight: "1.5" }}>Keep your managers and staff aligned with instant group chats and global operational broadcasts.</p>
          </div>

          <div className="glass-card" style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            padding: "2rem 1.75rem",
            backdropFilter: "blur(6px)",
            transition: "all 0.3s ease"
          }}>
            <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "8px", background: "rgba(72, 202, 228, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#48CAE4", marginBottom: "1.25rem" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#FFFFFF" }}>Team Live Roster</h4>
            <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.5)", margin: 0, lineHeight: "1.5" }}>Track active shifts, manage roster status feeds, and dispatch staff updates in real time.</p>
          </div>

          <div className="glass-card" style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            padding: "2rem 1.75rem",
            backdropFilter: "blur(6px)",
            transition: "all 0.3s ease"
          }}>
            <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "8px", background: "rgba(72, 202, 228, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#48CAE4", marginBottom: "1.25rem" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#FFFFFF" }}>Dual-Lock Audit Shield</h4>
            <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.5)", margin: 0, lineHeight: "1.5" }}>Track all administrative actions. Compliance logging is protected by secure dual-key authorization.</p>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div style={{
        width: "100%",
        maxWidth: "1100px",
        margin: "4.5rem auto 4.5rem auto",
        padding: "0 1.5rem",
        zIndex: 1
      }}>
        <h2 style={{
          textAlign: "center",
          fontSize: "1.75rem",
          fontWeight: 800,
          background: "linear-gradient(to right, #FFFFFF, #E0F2FE, #ADE8F4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "2.5rem",
          letterSpacing: "-0.01em"
        }}>
          Trusted by Operations Leaders
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "2rem"
        }}>
          {/* Testimonial 1 */}
          <div className="glass-card" style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "14px",
            padding: "2.25rem 2rem",
            backdropFilter: "blur(6px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            transition: "all 0.3s ease"
          }}>
            <p style={{ fontSize: "0.88rem", color: "rgba(255, 255, 255, 0.75)", fontStyle: "italic", margin: "0 0 1.5rem 0", lineHeight: "1.6" }}>
              "Worknode revolutionized our active roster dispatches. Our operations leads can adjust shifts on the fly, and Pusher handles the instant sync down to every associate's screen in seconds."
            </p>
            <div>
              <div style={{ fontWeight: 700, color: "#FFFFFF", fontSize: "0.9rem" }}>Sarah Jenkins</div>
              <div style={{ fontSize: "0.75rem", color: "#48CAE4" }}>Director of Logistics, Apex Flow</div>
            </div>
          </div>

          {/* Testimonial 2 */}
          <div className="glass-card" style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "14px",
            padding: "2.25rem 2rem",
            backdropFilter: "blur(6px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            transition: "all 0.3s ease"
          }}>
            <p style={{ fontSize: "0.88rem", color: "rgba(255, 255, 255, 0.75)", fontStyle: "italic", margin: "0 0 1.5rem 0", lineHeight: "1.6" }}>
              "The dual-signature audit trail is a compliance game-changer. Our administrative operations logs are fully tamper-proof and SOC2 compliant, satisfying our enterprise security audits."
            </p>
            <div>
              <div style={{ fontWeight: 700, color: "#FFFFFF", fontSize: "0.9rem" }}>Marcus Chen</div>
              <div style={{ fontSize: "0.75rem", color: "#48CAE4" }}>Head of Information Security, Quadrant Systems</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Compliance Section */}
      <div style={{
        width: "100%",
        maxWidth: "1100px",
        margin: "4.5rem auto 4.5rem auto",
        padding: "0 1.5rem",
        zIndex: 1
      }}>
        <h2 style={{
          textAlign: "center",
          fontSize: "1.75rem",
          fontWeight: 800,
          background: "linear-gradient(to right, #FFFFFF, #E0F2FE, #ADE8F4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "2.5rem",
          letterSpacing: "-0.01em"
        }}>
          Enterprise-Grade Data Shield
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "2rem",
          alignItems: "stretch"
        }}>
          {/* Security Card 1 */}
          <div className="glass-card" style={{
            background: "rgba(255, 255, 255, 0.01)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "14px",
            padding: "2.25rem 2rem",
            backdropFilter: "blur(6px)",
            display: "flex",
            gap: "1.25rem",
            alignItems: "flex-start",
            transition: "all 0.3s ease"
          }}>
            <div style={{ color: "#48CAE4", marginTop: "0.25rem" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div>
              <h4 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#FFFFFF" }}>Tenant Database Isolation</h4>
              <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.55)", margin: 0, lineHeight: "1.5" }}>
                Multi-tenant architecture enforces separate database filters and strict token isolation. Your operational shift schedules, directory logs, and group chats are fully partitioned.
              </p>
            </div>
          </div>

          {/* Security Card 2 */}
          <div className="glass-card" style={{
            background: "rgba(255, 255, 255, 0.01)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "14px",
            padding: "2.25rem 2rem",
            backdropFilter: "blur(6px)",
            display: "flex",
            gap: "1.25rem",
            alignItems: "flex-start",
            transition: "all 0.3s ease"
          }}>
            <div style={{ color: "#48CAE4", marginTop: "0.25rem" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <h4 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#FFFFFF" }}>AES-256 In-Transit Encryption</h4>
              <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.55)", margin: 0, lineHeight: "1.5" }}>
                All system channels utilize SSL/TLS connection tunnels. Data dispatched to databases or Pusher channels is fully encrypted, guaranteeing protection from outside network intercepts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div id="faq" style={{
        width: "100%",
        maxWidth: "800px",
        margin: "4rem auto 6rem auto",
        padding: "0 1.5rem",
        zIndex: 1
      }}>
        <h2 style={{
          textAlign: "center",
          fontSize: "1.75rem",
          fontWeight: 800,
          background: "linear-gradient(to right, #FFFFFF, #E0F2FE, #ADE8F4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "2.5rem",
          letterSpacing: "-0.01em"
        }}>
          Frequently Asked Questions
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[
            {
              q: "What is Worknode?",
              a: "Worknode is an enterprise-grade multi-tenant platform designed to optimize team alignment, roster scheduling, live status dispatch, and secure communication channels."
            },
            {
              q: "Is my corporate database isolated?",
              a: "Yes. Worknode operates under strict SOC2 compliance guidelines. All company databases are logically isolated at the query level using secure company identification filters."
            },
            {
              q: "How do I request admin access?",
              a: "Please contact your company IT department. System administrators can create employee profiles and activate your bypass access directly."
            }
          ].map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "10px",
                overflow: "hidden",
                transition: "all 0.2s ease"
              }}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  style={{
                    width: "100%",
                    padding: "1.25rem 1.5rem",
                    background: "none",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span>{item.q}</span>
                  <span style={{ fontSize: "1.25rem", color: "#48CAE4", transition: "transform 0.2s ease", transform: isOpen ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                {isOpen && (
                  <div style={{
                    padding: "0 1.5rem 1.25rem 1.5rem",
                    fontSize: "0.85rem",
                    color: "rgba(255, 255, 255, 0.55)",
                    lineHeight: "1.5",
                    borderTop: "1px solid rgba(255, 255, 255, 0.04)"
                  }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact Section */}
      <div id="contact" style={{
        width: "100%",
        maxWidth: "1100px",
        margin: "4rem auto 6rem auto",
        padding: "0 1.5rem",
        zIndex: 1
      }}>
        <h2 style={{
          textAlign: "center",
          fontSize: "1.75rem",
          fontWeight: 800,
          background: "linear-gradient(to right, #FFFFFF, #E0F2FE, #ADE8F4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "2.5rem",
          letterSpacing: "-0.01em"
        }}>
          Get in Touch
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "3rem"
        }}>
          {/* Left Side: Contact Information */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "2rem"
          }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ADE8F4", margin: 0 }}>Contact Details</h3>
            <p style={{ fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.65)", margin: 0, lineHeight: "1.6" }}>
              Have questions about onboarding, multi-tenant workspace isolation, or platform subscriptions? Contact our admin support desk directly.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* WhatsApp */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "2.25rem", height: "2.25rem", borderRadius: "50%", background: "rgba(72, 202, 228, 0.1)", display: "flex", alignItems: "center", color: "#48CAE4", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.4)", textTransform: "uppercase", fontWeight: 700 }}>WhatsApp Support</div>
                  <a href="https://wa.me/923329331264" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.9rem", color: "#FFFFFF", textDecoration: "none", fontWeight: 600 }}>+92 332 9331264</a>
                </div>
              </div>

              {/* Email */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "2.25rem", height: "2.25rem", borderRadius: "50%", background: "rgba(72, 202, 228, 0.1)", display: "flex", alignItems: "center", color: "#48CAE4", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.4)", textTransform: "uppercase", fontWeight: 700 }}>Email Address</div>
                  <a href="mailto:Shascreation92@gmail.com" style={{ fontSize: "0.9rem", color: "#FFFFFF", textDecoration: "none", fontWeight: 600 }}>Shascreation92@gmail.com</a>
                </div>
              </div>

              {/* Address */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "2.25rem", height: "2.25rem", borderRadius: "50%", background: "rgba(72, 202, 228, 0.1)", display: "flex", alignItems: "center", color: "#48CAE4", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.4)", textTransform: "uppercase", fontWeight: 700 }}>Office Headquarters</div>
                  <span style={{ fontSize: "0.9rem", color: "#FFFFFF", fontWeight: 600 }}>E-11/2, Main Double Road, Islamabad</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Glassmorphic Contact Form */}
          <div className="glass-card" style={{
            background: "rgba(255, 255, 255, 0.01)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "14px",
            padding: "2rem 1.75rem",
            backdropFilter: "blur(8px)"
          }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#FFFFFF", margin: "0 0 1.25rem 0" }}>Send us a Message</h3>
            
            {formSuccess ? (
              <div style={{
                background: "rgba(72, 202, 228, 0.08)",
                border: "1px solid rgba(72, 202, 228, 0.2)",
                borderRadius: "8px",
                padding: "1.5rem",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.75rem"
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#48CAE4" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <div style={{ fontWeight: 700, color: "#FFFFFF" }}>Message Submitted!</div>
                <div style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.6)" }}>Our operations desk will review your submission and contact you shortly.</div>
                <button
                  onClick={() => setFormSuccess(false)}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    color: "#FFFFFF",
                    fontSize: "0.8rem",
                    padding: "0.4rem 1rem",
                    marginTop: "0.5rem",
                    cursor: "pointer"
                  }}
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {formError && (
                  <div style={{
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "6px",
                    padding: "0.6rem 0.88rem",
                    color: "#EF4444",
                    fontSize: "0.8rem",
                    textAlign: "center"
                  }}>
                    {formError}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your Name"
                    required
                    style={{
                      width: "100%",
                      height: "42px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "6px",
                      padding: "0 0.85rem",
                      color: "#FFFFFF",
                      fontSize: "0.85rem",
                      outline: "none"
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <input
                    type="email"
                    name="email"
                    placeholder="Your Email"
                    required
                    style={{
                      width: "100%",
                      height: "42px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "6px",
                      padding: "0 0.85rem",
                      color: "#FFFFFF",
                      fontSize: "0.85rem",
                      outline: "none"
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <textarea
                    name="message"
                    placeholder="Your Message..."
                    required
                    rows={4}
                    style={{
                      width: "100%",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "6px",
                      padding: "0.75rem 0.85rem",
                      color: "#FFFFFF",
                      fontSize: "0.85rem",
                      outline: "none",
                      resize: "vertical"
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    height: "42px",
                    background: "#0077B6",
                    border: "none",
                    borderRadius: "6px",
                    color: "#FFFFFF",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    boxShadow: "0 4px 15px rgba(0, 119, 182, 0.2)",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = "#0096C7";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = "#0077B6";
                    }
                  }}
                >
                  <span>{isSubmitting ? "Sending..." : "Send Message"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Landing Page Footer */}
      <footer style={{
        padding: "2rem",
        zIndex: 1,
        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        textAlign: "center",
        fontSize: "0.75rem",
        color: "rgba(255, 255, 255, 0.4)",
        background: "rgba(0, 8, 20, 0.3)"
      }}>
        Worknode V2.0 © 2026. SOC2 Compliant Operational Data Shield.
      </footer>
    </div>
  );
}
