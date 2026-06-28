"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { user_role } from "@prisma/client";
import { Shield, Check, X, Loader2, Menu } from "lucide-react";
import { 
  getUpgradeInvitationAction, 
  acceptUpgradeAction, 
  declineInvitationAction 
} from "@/app/actions/users";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: user_role;
    companyName?: string | null;
    teamLeadName?: string | null;
  };
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const pathname = usePathname();
  const hideHeader = pathname === "/" || pathname === "/accounts";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [invitation, setInvitation] = useState<{ id: string; title: string; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user.role === "SALES_ASSOCIATE") {
      getUpgradeInvitationAction().then((res) => {
        if (res.invitation) {
          setInvitation(res.invitation);
        }
      }).catch(err => console.error("Failed to check upgrade invitations", err));
    }
  }, [user.role]);

  const handleAcceptUpgrade = async () => {
    if (!invitation) return;
    setActionLoading(true);
    try {
      const res = await acceptUpgradeAction(invitation.id);
      if (res.success) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to accept upgrade", error);
      setActionLoading(false);
    }
  };

  const handleDeclineUpgrade = async () => {
    if (!invitation) return;
    setActionLoading(true);
    try {
      const res = await declineInvitationAction(invitation.id, false);
      if (res.success) {
        setInvitation(null);
      }
    } catch (error) {
      console.error("Failed to decline upgrade", error);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ display: "flex", flexDirection: "column" }}>
      {invitation && (
        <div style={{
          width: "100%",
          background: "linear-gradient(90deg, rgba(212, 175, 55, 0.15) 0%, rgba(20, 20, 20, 0.95) 100%)",
          borderBottom: "1px solid rgba(212, 175, 55, 0.3)",
          padding: "0.75rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backdropFilter: "blur(8px)",
          zIndex: 100,
          gap: "1rem",
          flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "50%",
              background: "rgba(212, 175, 55, 0.1)",
              border: "1px solid rgba(212, 175, 55, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--gold-primary)",
              boxShadow: "0 0 10px rgba(212, 175, 55, 0.1)"
            }}>
              <Shield size={14} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {invitation.title}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {invitation.message}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={handleAcceptUpgrade}
              disabled={actionLoading}
              className="btn-gold"
              style={{
                padding: "0.4rem 1rem",
                fontSize: "0.75rem",
                height: "30px",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem"
              }}
            >
              {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              <span>Accept Upgrade</span>
            </button>
            <button
              onClick={handleDeclineUpgrade}
              disabled={actionLoading}
              className="btn-glass"
              style={{
                padding: "0.4rem 0.75rem",
                fontSize: "0.75rem",
                height: "30px",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                border: "1px solid rgba(255, 255, 255, 0.15)"
              }}
            >
              <X size={12} />
              <span>Decline</span>
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar navigation */}
        <Sidebar 
          user={user} 
          isOpen={sidebarOpen} 
          setIsOpen={setSidebarOpen} 
        />

        {/* Mobile Sidebar overlay */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 90,
              backdropFilter: "blur(4px)"
            }}
          />
        )}

        {/* Main Viewport */}
        <main className="main-content" style={hideHeader ? { paddingTop: "2rem" } : undefined}>
          {hideHeader && (
            <button 
              onClick={() => setSidebarOpen(true)}
              className="mobile-menu-trigger btn-glass"
              style={{
                position: "fixed",
                top: "1rem",
                left: "1rem",
                zIndex: 95,
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5), 0 0 10px rgba(255, 215, 0, 0.1)"
              }}
            >
              <Menu size={20} style={{ color: "var(--gold-primary)" }} />
            </button>
          )}

          {!hideHeader && (
            <Header 
              user={user} 
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
            />
          )}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
