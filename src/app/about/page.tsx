import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LogIn, Shield, Users, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | Worknode",
  description: "Learn about the mission, values, and story behind Worknode—the secure, real-time team operations platform.",
  keywords: ["About Worknode", "Company Story", "Core Values", "Team Operations", "SaaS Team Dashboard"],
  openGraph: {
    title: "About Us | Worknode",
    description: "Learn about the mission, values, and story behind Worknode.",
    type: "website",
  }
};

export default function AboutPage() {
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
      {/* Navbar CSS Rules */}
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(72, 202, 228, 0.2) !important;
          box-shadow: 0 10px 25px rgba(0, 119, 182, 0.15);
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
        top: "10%",
        left: "-10%",
        width: "40vw",
        height: "40vw",
        background: "radial-gradient(circle, rgba(72, 202, 228, 0.08) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0
      }} />
      <div style={{
        position: "absolute",
        bottom: "15%",
        right: "-10%",
        width: "50vw",
        height: "50vw",
        background: "radial-gradient(circle, rgba(0, 119, 182, 0.06) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      {/* Sticky Header Navbar */}
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
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
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
          </Link>

          {/* Navigation Links */}
          <div className="nav-links" style={{ display: "flex", gap: "2.25rem", alignItems: "center" }}>
            <Link href="/" style={{ textDecoration: "none", color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem", fontWeight: 600, transition: "color 0.2s" }}>Home</Link>
            <Link href="/#features" style={{ textDecoration: "none", color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem", fontWeight: 600, transition: "color 0.2s" }}>Features</Link>
            <Link href="/#faq" style={{ textDecoration: "none", color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem", fontWeight: 600, transition: "color 0.2s" }}>FAQ</Link>
            <Link href="/about" style={{ textDecoration: "none", color: "#48CAE4", fontSize: "0.85rem", fontWeight: 600, transition: "color 0.2s" }}>About Us</Link>
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
          }}>
            <span>Sign In</span>
            <LogIn size={15} />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        width: "100%",
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "3.5rem 1.5rem",
        zIndex: 1
      }}>
        {/* Visual Split-Screen Hero Section */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "4rem",
          alignItems: "center",
          marginBottom: "5rem"
        }}>
          {/* Left Side: Professional Narrative */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{
              alignSelf: "flex-start",
              padding: "0.4rem 0.9rem",
              background: "rgba(72, 202, 228, 0.08)",
              border: "1px solid rgba(72, 202, 228, 0.2)",
              borderRadius: "20px",
              color: "#48CAE4",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em"
            }}>
              Our Mission
            </div>
             <h1 style={{
              fontSize: "2.5rem",
              fontWeight: 900,
              lineHeight: "1.25",
              background: "linear-gradient(to right, #FFFFFF 10%, #ADE8F4 50%, #48CAE4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.02em",
              margin: 0
            }}>
              Smarter Teams.<br />Better Business.
            </h1>
            <p style={{
              fontSize: "1rem",
              lineHeight: "1.65",
              color: "rgba(255, 255, 255, 0.8)",
              margin: 0,
              fontWeight: 500
            }}>
              At Worknode, we believe that smarter teams build better businesses. Our mission is to provide organizations with a highly secure, real-time platform that streamlines rosters, communication, and administrative transparency, allowing team leaders to focus on what matters most—growth and collaboration.
            </p>
            <p style={{
              fontSize: "0.9rem",
              lineHeight: "1.65",
              color: "rgba(255, 255, 255, 0.6)",
              margin: 0
            }}>
              Worknode was founded with a single, clear vision: to eliminate the friction in managing active operational teams. In fast-paced business environments, coordinating rosters, managing live shift broadcasts, and keeping records secure is often a highly disjointed process. 
            </p>
            <p style={{
              fontSize: "0.9rem",
              lineHeight: "1.65",
              color: "rgba(255, 255, 255, 0.6)",
              margin: 0
            }}>
              We built Worknode to bridge that gap. By combining high-performance live chat sync with robust database integrity, and protecting administrative logs with our signature dual-lock SOC2 audit trails, we created an ecosystem where management and staff operate in perfect harmony.
            </p>
          </div>

          {/* Right Side: Portrait Image Frame */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            position: "relative"
          }}>
            {/* Glowing backcard outline effect */}
            <div style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              top: "10px",
              left: "10px",
              background: "rgba(72, 202, 228, 0.03)",
              border: "1px solid rgba(72, 202, 228, 0.1)",
              borderRadius: "16px",
              zIndex: 0
            }} />
            
            <div className="glass-card" style={{
              background: "rgba(255, 255, 255, 0.01)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "16px",
              padding: "0.85rem",
              backdropFilter: "blur(8px)",
              width: "100%",
              maxWidth: "380px",
              zIndex: 1,
              transition: "all 0.3s ease"
            }}>
              <img 
                src="/about.png" 
                alt="Founder Profile" 
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: "10px",
                  display: "block",
                  objectFit: "cover",
                  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.3)"
                }}
              />
              <div style={{
                marginTop: "1rem",
                textAlign: "center"
              }}>
                <h3 style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "#FFFFFF",
                  margin: "0 0 0.2rem 0"
                }}>
                  Faizan Muhammad
                </h3>
                <p style={{
                  fontSize: "0.75rem",
                  color: "#48CAE4",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  margin: 0
                }}>
                  Founder & CEO
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Core Values Section */}
        <div style={{ marginBottom: "5rem" }}>
          <h2 style={{
            textAlign: "center",
            fontSize: "1.75rem",
            fontWeight: 850,
            background: "linear-gradient(to right, #FFFFFF, #E0F2FE, #ADE8F4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "2.5rem",
            letterSpacing: "-0.01em"
          }}>
            Our Core Values
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem"
          }}>
            {/* Value 1 */}
            <div className="glass-card" style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "12px",
              padding: "2rem 1.75rem",
              backdropFilter: "blur(6px)",
              transition: "all 0.3s ease"
            }}>
              <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "8px", background: "rgba(72, 202, 228, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#48CAE4", marginBottom: "1.25rem" }}>
                <Zap size={20} />
              </div>
              <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#FFFFFF" }}>Operational Clarity</h4>
              <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.5)", margin: 0, lineHeight: "1.5" }}>
                Interactive shift timelines and real-time status feeds eliminate guesswork and streamline decision-making.
              </p>
            </div>

            {/* Value 2 */}
            <div className="glass-card" style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "12px",
              padding: "2rem 1.75rem",
              backdropFilter: "blur(6px)",
              transition: "all 0.3s ease"
            }}>
              <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "8px", background: "rgba(72, 202, 228, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#48CAE4", marginBottom: "1.25rem" }}>
                <Shield size={20} />
              </div>
              <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#FFFFFF" }}>Immutable Audit Shield</h4>
              <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.5)", margin: 0, lineHeight: "1.5" }}>
                SOC2-compliant logging with dual-signature authorization guarantees maximum security and strict platform accountability.
              </p>
            </div>

            {/* Value 3 */}
            <div className="glass-card" style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "12px",
              padding: "2rem 1.75rem",
              backdropFilter: "blur(6px)",
              transition: "all 0.3s ease"
            }}>
              <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "8px", background: "rgba(72, 202, 228, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#48CAE4", marginBottom: "1.25rem" }}>
                <Users size={20} />
              </div>
              <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#FFFFFF" }}>Instant Team Sync</h4>
              <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.5)", margin: 0, lineHeight: "1.5" }}>
                Pusher-integrated live channels keep all team leads and associates in immediate alignment during fast-paced operations.
              </p>
            </div>
          </div>
        </div>

        {/* Access Banner CTA */}
        <div className="glass-card" style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "14px",
          padding: "2.5rem 2rem",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1.5rem",
          backdropFilter: "blur(8px)"
        }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 0.4rem 0", color: "#FFFFFF" }}>
              Ready to unify your operations?
            </h3>
            <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.5)", margin: 0 }}>
              Unlock live rosters, secure dual-lock audits, and responsive team channels.
            </p>
          </div>
          <Link href="/auth/signin" style={{
            textDecoration: "none",
            height: "44px",
            background: "#0077B6",
            border: "none",
            borderRadius: "8px",
            padding: "0 1.5rem",
            color: "#FFFFFF",
            fontSize: "0.85rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: "0 4px 15px rgba(0, 119, 182, 0.2)",
            transition: "all 0.2s"
          }}>
            <span>Access Workspace</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>

      {/* Footer */}
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
