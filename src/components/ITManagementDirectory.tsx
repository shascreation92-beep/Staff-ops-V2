"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Mail, Award, Plus, X, AlertCircle, Users, Search, Eye, EyeOff } from "lucide-react";
import { onboardTeamLeadAction, toggleUserStatusAction, adminResetUserPasswordAction } from "@/app/actions/users";
import { toast } from "react-hot-toast";
import NotificationBell from "./NotificationBell";
import ConfirmationModal from "./ConfirmationModal";

interface ITMember {
  id: string;
  name: string | null;
  email: string;
  status: string;
  password?: string | null;
  createdAt: Date | string;
  employee?: {
    employeeId: string;
    laptopPassword?: string | null;
  } | null;
}

interface ITManagementDirectoryProps {
  itPersonnel: ITMember[];
  companies: { id: string; name: string }[];
  currentUserRole: string;
  currentUserCompanyId: string | null;
}

export default function ITManagementDirectory({ itPersonnel, companies, currentUserRole, currentUserCompanyId }: ITManagementDirectoryProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search query
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Onboard Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [onboardFullName, setOnboardFullName] = useState("");
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardEmployeeId, setOnboardEmployeeId] = useState("IT-");
  const [onboardPassword, setOnboardPassword] = useState("");
  const [onboardCompanyId, setOnboardCompanyId] = useState(currentUserCompanyId || companies[0]?.id || "");
  const [onboardRole, setOnboardRole] = useState<"TEAM_LEAD" | "SALES_ASSOCIATE" | "IT_DEPARTMENT">("IT_DEPARTMENT");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit / Reset Password State
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [resetPassUserId, setResetPassUserId] = useState("");
  const [resetPassUserName, setResetPassUserName] = useState("");
  const [resetPassNewPassword, setResetPassNewPassword] = useState("");
  const [resetPassError, setResetPassError] = useState<string | null>(null);

  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  // Show/Hide password toggles state
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const res = await onboardTeamLeadAction({
          fullName: onboardFullName,
          email: onboardEmail,
          employeeId: onboardEmployeeId.trim(),
          password: onboardPassword.trim(),
          companyId: onboardCompanyId,
          role: onboardRole
        });

        if (res.success) {
          toast.success(`${onboardRole.replace("_", " ")} onboarded successfully!`);
          setShowAddModal(false);
          setOnboardFullName("");
          setOnboardEmail("");
          setOnboardEmployeeId("IT-");
          setOnboardPassword("");
          setOnboardRole("IT_DEPARTMENT");
          router.refresh();
        } else {
          setErrorMsg(res.error || "Failed to onboard user.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to onboard user.");
      }
    });
  };

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "APPROVED" ? "BLOCKED" : "APPROVED";
    const agentName = itPersonnel.find(x => x.id === userId)?.name || "IT Agent";
    
    setConfirmConfig({
      isOpen: true,
      title: newStatus === "APPROVED" ? "Enable IT Agent Account" : "Disable IT Agent Account",
      message: `Are you sure you want to change ${agentName}'s status to ${newStatus === "APPROVED" ? "ACTIVE" : "DISABLED"}?`,
      onConfirm: () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        startTransition(async () => {
          try {
            const res = await toggleUserStatusAction(userId, newStatus);
            if (res.success) {
              toast.success(`${agentName} has been ${newStatus === "APPROVED" ? "enabled" : "disabled"} successfully.`);
              router.refresh();
            }
          } catch (err: any) {
            toast.error(err.message || "Failed to update user status.");
          }
        });
      }
    });
  };

  const handleResetPassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetPassError(null);
    if (!resetPassNewPassword.trim()) {
      setResetPassError("Password cannot be empty.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await adminResetUserPasswordAction({
          userId: resetPassUserId,
          newPassword: resetPassNewPassword.trim()
        });
        if (res.success) {
          toast.success("Password reset successfully!");
          setShowResetPassModal(false);
          setResetPassUserId("");
          setResetPassUserName("");
          setResetPassNewPassword("");
          router.refresh();
        }
      } catch (err: any) {
        setResetPassError(err.message || "Failed to reset password.");
      }
    });
  };

  // Filter IT Personnel
  const filteredPersonnel = itPersonnel.filter(it => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (it.name || "").toLowerCase().includes(q) ||
      (it.email || "").toLowerCase().includes(q) ||
      (it.employee?.employeeId || "").toLowerCase().includes(q)
    );
  });

  // Pagination calculations
  const ITEMS_PER_PAGE = 50;
  const totalRecords = filteredPersonnel.length;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRecords);
  const paginatedPersonnel = filteredPersonnel.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const totalITCount = filteredPersonnel.length;
  const activeITCount = filteredPersonnel.filter(u => u.status === "APPROVED").length;
  const disabledITCount = filteredPersonnel.filter(u => u.status === "BLOCKED" || u.status === "REJECTED").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Title Card (Two-Row Header Config: Row 1) */}
      <div className="glass-panel mx-6 mt-6 mb-5" style={{
        padding: "1rem 1.5rem",
        background: "#FFFFFF",
        border: "1px solid var(--border-dim)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: 40
      }}>
        <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, lineHeight: "1.2" }}>IT MANAGEMENT DIRECTORY</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, marginTop: "0.25rem" }}>
          Onboard, inspect, and monitor specialized IT personnel and operational credentials across the tenant shard.
        </p>
      </div>

      {/* Search & Analytics Card (Two-Row Header Config: Row 2) */}
      <div className="glass-panel mx-6 mb-5" style={{
        padding: "1.5rem",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: "1.5rem",
        background: "#FFFFFF",
        border: "1px solid var(--border-dim)",
        position: "relative",
        zIndex: 40
      }}>
        {/* Left Side: Search and Onboard button */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          {/* Search Input Field */}
          <div style={{
            position: "relative",
            width: "280px",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "#F9FAFB",
            padding: "0.5rem 0.75rem",
            height: "36px",
            borderRadius: "6px",
            border: "1px solid var(--border-dim)"
          }}>
            <Search size={16} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search IT by name, email or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontSize: "0.82rem",
                background: "transparent",
                color: "var(--text-primary)"
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: "1.2rem",
                  display: "flex",
                  alignItems: "center",
                  lineHeight: 1,
                  padding: 0
                }}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* ADD USER (Onboard button) */}
          <button
            onClick={() => {
              setShowAddModal(true);
              setOnboardFullName("");
              setOnboardEmail("");
              setOnboardEmployeeId("IT-");
              setOnboardPassword("");
              setOnboardCompanyId(currentUserCompanyId || companies[0]?.id || "");
              setOnboardRole("IT_DEPARTMENT");
              setErrorMsg(null);
            }}
            className="btn-gold"
            style={{
              padding: "0.6rem 1.2rem",
              fontSize: "0.8rem",
              height: "36px",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              borderRadius: "6px"
            }}
          >
            <Plus size={16} />
            <span>ADD USER</span>
          </button>
        </div>

        {/* Right Side: Notification Icon & Metrics */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <NotificationBell />

          {/* Metrics Counter Pills */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <div style={{
              height: "36px",
              background: "#FFFFFF",
              border: "1px solid var(--border-dim)",
              borderRadius: "6px",
              padding: "0 0.75rem",
              fontSize: "0.82rem",
              color: "var(--text-primary)",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
            }}>
              TOTAL IT: {totalITCount.toString()}
            </div>
            <div style={{
              height: "36px",
              background: "#FFFFFF",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: "6px",
              padding: "0 0.75rem",
              fontSize: "0.82rem",
              color: "#10B981",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
            }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" style={{ display: "inline-block" }} />
              ACTIVE: {activeITCount.toString()}
            </div>
            <div style={{
              height: "36px",
              background: "#FFFFFF",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "6px",
              padding: "0 0.75rem",
              fontSize: "0.82rem",
              color: "#EF4444",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
            }}>
              DISABLED: {disabledITCount.toString()}
            </div>
          </div>
        </div>
      </div>

      {/* IT Personnel Grid Container */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "1.5rem" }}>
          {totalRecords === 0 ? (
            <div className="glass-panel" style={{ gridColumn: "1 / -1", padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <Shield size={48} style={{ margin: "0 auto 1rem", color: "var(--text-muted)", opacity: 0.5 }} />
              <h3 style={{ fontWeight: 700, color: "var(--text-primary)" }}>No IT Personnel Cataloged</h3>
              <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Use the &quot;ADD USER&quot; button to onboard IT department members.</p>
            </div>
          ) : (
            paginatedPersonnel.map((it) => {
              const initials = it.name
                ? it.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                : "IT";

              return (
                <div key={it.id} className="glass-panel" style={{
                  padding: "1.5rem",
                  border: it.status === "BLOCKED" ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid var(--border-dim)",
                  boxShadow: it.status === "BLOCKED" ? "0 4px 12px rgba(239, 68, 68, 0.03)" : "none",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem"
                }}>
                  {/* Subtle top indicator bar */}
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: it.status === "BLOCKED" ? "linear-gradient(90deg, #EF4444, #F87171)" : "var(--gold-gradient)"
                  }} />

                  {/* Header Details */}
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <div style={{
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "50%",
                      backgroundColor: it.status === "BLOCKED" ? "rgba(239, 68, 68, 0.08)" : "rgba(167, 139, 250, 0.08)",
                      border: it.status === "BLOCKED" ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid rgba(167, 139, 250, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: it.status === "BLOCKED" ? "#EF4444" : "#8B5CF6"
                    }}>
                      <Shield size={22} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>{it.name || "Unnamed IT Specialist"}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        <Mail size={12} />
                        <span>{it.email}</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                        <span className="badge active" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem", background: "rgba(167, 139, 250, 0.08)", color: "#8B5CF6", border: "1px solid rgba(167, 139, 250, 0.25)" }}>
                          ID: {it.employee?.employeeId || "N/A"}
                        </span>
                        <span className={`badge ${it.status === 'APPROVED' ? 'active' : 'inactive'}`} style={{
                          fontSize: "0.65rem",
                          padding: "0.1rem 0.4rem",
                          background: it.status === 'APPROVED' ? "rgba(34, 197, 94, 0.08)" : "rgba(239, 68, 68, 0.08)",
                          color: it.status === 'APPROVED' ? "#22C55E" : "#EF4444",
                          border: it.status === 'APPROVED' ? "1px solid rgba(34, 197, 94, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)"
                        }}>
                          {it.status === 'APPROVED' ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </div>

                      {/* Password Field Display */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "0.55rem",
                        padding: "0.4rem 0.6rem",
                        background: "rgba(15, 23, 42, 0.025)",
                        border: "1px dashed var(--border-dim)",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        width: "fit-content",
                        minWidth: "155px"
                      }}>
                        <span style={{ color: "var(--text-muted)", fontWeight: 500, marginRight: "0.5rem" }}>
                          Pass:
                        </span>
                        <code style={{
                          fontFamily: "monospace",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          letterSpacing: showPasswords[it.id] ? "normal" : "0.15em",
                          fontSize: "0.75rem"
                        }}>
                          {showPasswords[it.id] ? (
                            it.employee?.laptopPassword || (it.password && !it.password.startsWith("$2b$") && !it.password.startsWith("$2a$") ? it.password : "Protected (Use Reset Password)")
                          ) : "••••••••"}
                        </code>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(it.id)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: "0 0.25rem",
                            cursor: "pointer",
                            color: "var(--text-muted)",
                            marginLeft: "0.6rem",
                            display: "flex",
                            alignItems: "center"
                          }}
                          title={showPasswords[it.id] ? "Hide Password" : "Show Password"}
                        >
                          {showPasswords[it.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid var(--border-dim)", paddingTop: "1rem", marginTop: "auto" }}>
                    <button
                      onClick={() => handleToggleStatus(it.id, it.status)}
                      className={`btn-glass`}
                      style={{
                        flex: 1,
                        padding: "0.35rem",
                        fontSize: "0.78rem",
                        height: "auto",
                        color: it.status === "APPROVED" ? "var(--color-danger)" : "var(--color-success)",
                        borderColor: it.status === "APPROVED" ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)"
                      }}
                      disabled={isPending}
                    >
                      {isPending ? (
                        it.status === "APPROVED" ? "Disabling..." : "Enabling..."
                      ) : (
                        it.status === "APPROVED" ? "Disable Account" : "Enable Account"
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setResetPassUserId(it.id);
                        setResetPassUserName(it.name || it.email);
                        setResetPassNewPassword("");
                        setResetPassError(null);
                        setShowResetPassModal(true);
                      }}
                      className="btn-gold"
                      style={{ flex: 1, padding: "0.35rem", fontSize: "0.78rem", height: "auto" }}
                      disabled={isPending}
                    >
                      Reset Password
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Premium Minimalist Pagination Control Bar */}
        {totalRecords > 0 && (
          <div className="glass-panel" style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 1.5rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            borderRadius: "var(--border-radius-md)",
            flexWrap: "wrap",
            gap: "1rem"
          }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Showing {totalRecords === 0 ? 0 : startIndex + 1}-{endIndex} of {totalRecords.toString()} entries
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-dim)",
                  borderRadius: "6px",
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: currentPage === 1 ? "var(--text-muted)" : "var(--text-primary)",
                  cursor: currentPage === 1 ? "default" : "pointer",
                  opacity: currentPage === 1 ? 0.5 : 1,
                  transition: "all 0.2s ease"
                }}
              >
                Previous
              </button>

              {/* Page numbers */}
              {getPageNumbers().map((pageNum, idx) => {
                if (pageNum === '...') {
                  return (
                    <span key={`dots-${idx}`} style={{ padding: "0 0.5rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                      ...
                    </span>
                  );
                }
                const isSelected = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum as number)}
                    style={{
                      background: isSelected ? "var(--gold-primary)" : "transparent",
                      border: isSelected ? "1px solid var(--gold-primary)" : "1px solid var(--border-dim)",
                      borderRadius: "6px",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: isSelected ? "#FFFFFF" : "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-dim)",
                  borderRadius: "6px",
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: currentPage === totalPages ? "var(--text-muted)" : "var(--text-primary)",
                  cursor: currentPage === totalPages ? "default" : "pointer",
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  transition: "all 0.2s ease"
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Onboard User Modal Dialog */}
      {showAddModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "768px",
            padding: "2rem",
            border: "1px solid var(--border-gold)",
            background: "#FFFFFF",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            position: "relative",
            zIndex: 50
          }}>
            {/* Close button */}
            <button
              onClick={() => setShowAddModal(false)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer"
              }}
              disabled={isPending}
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-gold-gradient" style={{ fontSize: "1.2rem", fontWeight: 800 }}>ONBOARD NEW USER</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Create an approved user account with explicit designated credentials.
              </p>
            </div>

            {errorMsg && (
              <div style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                padding: "0.6rem 1rem",
                borderRadius: "4px",
                color: "var(--color-danger)",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleOnboardSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Landscape Two-Column Form Grid Layout */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "1.5rem" }}>
                {/* Left Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Role Designation</label>
                    <div style={{
                      background: "#F9FAFB",
                      border: "1px solid var(--border-dim)",
                      borderRadius: "6px",
                      height: "36px",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 0.75rem",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "#8B5CF6"
                    }}>
                      IT TECHNICAL SPECIALIST
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Employee ID (Globally Unique)</label>
                    <input
                      type="text"
                      required
                      placeholder="IT-001"
                      value={onboardEmployeeId}
                      onChange={(e) => setOnboardEmployeeId(e.target.value)}
                      className="input-gold"
                      disabled={isPending}
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={onboardFullName}
                      onChange={(e) => setOnboardFullName(e.target.value)}
                      className="input-gold"
                      disabled={isPending}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. john@company.com"
                      value={onboardEmail}
                      onChange={(e) => setOnboardEmail(e.target.value)}
                      className="input-gold"
                      disabled={isPending}
                    />
                  </div>
                </div>
              </div>

              {/* Initial Password (Full Width) */}
              <div className="form-group">
                <label className="form-label">Initial Password</label>
                <input
                  type="text"
                  required
                  placeholder="Assign initial password"
                  value={onboardPassword}
                  onChange={(e) => setOnboardPassword(e.target.value)}
                  className="input-gold"
                  disabled={isPending}
                />
              </div>

              {/* Buttons (Bottom-Right corner with border-t) */}
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
                paddingTop: "1rem",
                marginTop: "0.5rem",
                borderTop: "1px solid rgba(229, 231, 235, 0.5)"
              }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-glass"
                  style={{ minWidth: "110px" }}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold"
                  style={{ minWidth: "130px" }}
                  disabled={isPending}
                >
                  {isPending ? "Onboarding..." : "Onboard User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {showResetPassModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.3)",
          backdropFilter: "blur(6px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem"
        }}>
          <div className="glass-panel" style={{
            maxWidth: "420px",
            width: "100%",
            padding: "2rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            boxShadow: "var(--shadow-premium)"
          }}>
            <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>RESET USER PASSWORD</h2>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              IT Specialist: <strong style={{ color: "var(--text-primary)" }}>{resetPassUserName}</strong>
            </div>

            {resetPassError && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                {resetPassError}
              </div>
            )}

            <form onSubmit={handleResetPassSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="text"
                  required
                  placeholder="Enter new password"
                  value={resetPassNewPassword}
                  onChange={(e) => setResetPassNewPassword(e.target.value)}
                  className="input-gold"
                  disabled={isPending}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassModal(false);
                    setResetPassUserId("");
                    setResetPassUserName("");
                  }}
                  className="btn-glass"
                  style={{ flex: 1 }}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold"
                  style={{ flex: 1 }}
                  disabled={isPending}
                >
                  {isPending ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        isPending={isPending}
      />
    </div>
  );
}
