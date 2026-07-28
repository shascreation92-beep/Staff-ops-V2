"use client";

import React, { useState, useTransition, useEffect } from "react";
import { 
  createAnnouncementAction 
} from "@/app/actions/settings";
import { RuleForm } from "@/components/settings/RuleForm";
import PlatformManager from "@/components/settings/PlatformManager";
import { 
  sendInvitationAction,
  declineInvitationAction,
  updateTeamLeadNameAction,
  approveSalesAssociateAction,
  adminResetUserPasswordAction,
  toggleUserStatusAction,
  editUserAccountAction,
  reassignAssociateAction
} from "@/app/actions/users";
import { 
  Sliders, 
  Building, 
  Plus, 
  Trash2, 
  Megaphone, 
  FileText, 
  Check, 
  HelpCircle,
  AlertCircle,
  Users,
  Edit2,
  Key,
  Eye,
  EyeOff,
  Search,
  UserCheck,
  Download
} from "lucide-react";
import { user_role } from "@prisma/client";
import NotificationBell from "./NotificationBell";

interface SettingsShardProps {
  currentUser: {
    id: string;
    role: user_role;
    email?: string | null;
    companyId?: string | null;
  };
  platforms: any[];
  companies: any[];
  rules: Record<string, string>;
  announcements: any[];
  pendingInvitations: any[];
  users: any[];
}

export default function SettingsShard({
  currentUser,
  platforms,
  companies,
  rules,
  announcements,
  pendingInvitations,
  users
}: SettingsShardProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"RULES" | "PLATFORMS" | "INVITATIONS" | "USERS">(
    currentUser.role === "IT_DEPARTMENT" ? "USERS" : "RULES"
  );

  // State for target company selection (Super Admin override)
  const [targetCompanyId, setTargetCompanyId] = useState(
    currentUser.companyId || (companies[0]?.id || "")
  );

  // Rule engine state
  const [minAds, setMinAds] = useState(parseInt(rules["minAds"] || "10", 10));
  const [requireVerification, setRequireVerification] = useState(
    rules["requireVerification"] !== "false" ? "true" : "false"
  );
  const [targetToMaintain, setTargetToMaintain] = useState(
    parseInt(rules["targetToMaintain"] || "15", 10)
  );
  const [targetToMaintainFB, setTargetToMaintainFB] = useState(
    parseInt(rules["targetToMaintainFB"] || "15", 10)
  );
  // Removed rule success message state (handled within RuleForm)



  // Invitations state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"TEAM_LEAD" | "IT_DEPARTMENT">("TEAM_LEAD");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  const handleSendInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccessMsg(null);

    if (!inviteEmail.trim()) return;

    startTransition(async () => {
      try {
        const res = await sendInvitationAction({
          email: inviteEmail,
          role: inviteRole
        });

        setInviteEmail("");
        setInviteSuccessMsg(
          res.mode === "UPGRADE"
            ? "Upgrade invitation successfully sent to active Sales Representative."
            : "Invitation successfully dispatched to new Gmail address."
        );
        setTimeout(() => setInviteSuccessMsg(null), 4000);
      } catch (err: any) {
        setInviteError(err.message || "Failed to dispatch invitation.");
      }
    });
  };

  const handleCancelInvitation = async (id: string, emailAddress: string) => {
    if (confirm(`Are you sure you wish to cancel and delete the invitation for "${emailAddress}"?`)) {
      try {
        await declineInvitationAction("", true, id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Edit Team Lead Name state
  const [showEditTLModal, setShowEditTLModal] = useState(false);
  const [editTLUserId, setEditTLUserId] = useState("");
  const [editTLName, setEditTLName] = useState("");
  const [editTLError, setEditTLError] = useState<string | null>(null);

  const handleEditTLNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditTLError(null);
    if (!editTLName.trim()) return;

    startTransition(async () => {
      try {
        const res = await updateTeamLeadNameAction(editTLUserId, editTLName.trim());
        if (res.success) {
          setShowEditTLModal(false);
          setEditTLUserId("");
          setEditTLName("");
        }
      } catch (err: any) {
        setEditTLError(err.message || "Failed to update Team Lead profile.");
      }
    });
  };

  // Approve Sales Associate state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveUserId, setApproveUserId] = useState("");
  const [approveUserName, setApproveUserName] = useState("");
  const [approveEmployeeId, setApproveEmployeeId] = useState("");
  const [approvePassword, setApprovePassword] = useState("");
  const [approveError, setApproveError] = useState<string | null>(null);

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApproveError(null);
    if (!approveEmployeeId.trim() || !approvePassword.trim()) {
      setApproveError("Employee ID and Password are required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await approveSalesAssociateAction({
          userId: approveUserId,
          employeeId: approveEmployeeId.trim(),
          password: approvePassword.trim()
        });
        if (res.success) {
          setShowApproveModal(false);
          setApproveUserId("");
          setApproveUserName("");
          setApproveEmployeeId("");
          setApprovePassword("");
        }
      } catch (err: any) {
        setApproveError(err.message || "Failed to approve onboarding request.");
      }
    });
  };

  // Admin Reset Password state
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [resetPassUserId, setResetPassUserId] = useState("");
  const [resetPassUserName, setResetPassUserName] = useState("");
  const [resetPassUserEmail, setResetPassUserEmail] = useState("");
  const [resetPassNewPassword, setResetPassNewPassword] = useState("");
  const [resetPassError, setResetPassError] = useState<string | null>(null);

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
          setShowResetPassModal(false);
          setResetPassUserId("");
          setResetPassUserName("");
          setResetPassUserEmail("");
          setResetPassNewPassword("");
        }
      } catch (err: any) {
        setResetPassError(err.message || "Failed to reset password.");
      }
    });
  };

  // Edit Account State
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [editAccountUserId, setEditAccountUserId] = useState("");
  const [editAccountName, setEditAccountName] = useState("");
  const [editAccountPassword, setEditAccountPassword] = useState("");
  const [editAccountRole, setEditAccountRole] = useState<"TEAM_LEAD" | "SALES_ASSOCIATE" | "IT_DEPARTMENT">("SALES_ASSOCIATE");
  const [editAccountStatus, setEditAccountStatus] = useState<"APPROVED" | "BLOCKED">("APPROVED");
  const [editAccountTeamLeadId, setEditAccountTeamLeadId] = useState<string | null>(null);
  const [editAccountError, setEditAccountError] = useState<string | null>(null);

  // Reassign Associate State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignAssociateId, setReassignAssociateId] = useState("");
  const [reassignAssociateName, setReassignAssociateName] = useState("");
  const [reassignTeamLeadId, setReassignTeamLeadId] = useState<string | null>(null);
  const [reassignError, setReassignError] = useState<string | null>(null);

  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const staffUsers = users.filter(u => u.role === "TEAM_LEAD" || u.role === "SALES_ASSOCIATE" || u.role === "IT_DEPARTMENT");
  const filteredUsers = staffUsers.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  const ITEMS_PER_PAGE = 50;
  const totalRecords = filteredUsers.length;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRecords);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

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

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "APPROVED" ? "BLOCKED" : "APPROVED";
    startTransition(async () => {
      try {
        await toggleUserStatusAction(userId, newStatus);
      } catch (err: any) {
        alert(err.message || "Failed to toggle status.");
      }
    });
  };

  const handleEditAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditAccountError(null);
    startTransition(async () => {
      try {
        const res = await editUserAccountAction({
          userId: editAccountUserId,
          name: editAccountName.trim(),
          password: editAccountPassword.trim() || undefined,
          status: editAccountStatus,
          role: editAccountRole,
          teamLeadId: editAccountRole === "SALES_ASSOCIATE" ? editAccountTeamLeadId : null
        });
        if (res.success) {
          setShowEditAccountModal(false);
          setEditAccountUserId("");
          setEditAccountName("");
          setEditAccountPassword("");
        }
      } catch (err: any) {
        setEditAccountError(err.message || "Failed to update user account.");
      }
    });
  };

  const handleReassignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReassignError(null);

    startTransition(async () => {
      try {
        const res = await reassignAssociateAction(reassignAssociateId, reassignTeamLeadId);
        if (res.success) {
          setShowReassignModal(false);
          setReassignAssociateId("");
          setReassignAssociateName("");
          setReassignTeamLeadId(null);
        }
      } catch (err: any) {
        setReassignError(err.message || "Failed to reassign associate.");
      }
    });
  };

  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const isCompanyOwner = currentUser.role === "COMPANY_OWNER";

  // Dynamic Rule change handler
  // Updated rule handling moved to RuleForm component





  const totalStaff = filteredUsers.length;
  const activeStaff = filteredUsers.filter(u => u.status === "APPROVED").length;
  const disabledStaff = filteredUsers.filter(u => u.status === "BLOCKED" || u.status === "REJECTED").length;

  return (
    <>
      {/* Title Card */}
      <div className="glass-panel mx-6 mt-6 mb-5" style={{
        padding: "1rem 1.5rem",
        background: "#FFFFFF",
        border: "1px solid var(--border-dim)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: 40
      }}>
        <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, lineHeight: "1.2" }}>USER DIRECTORY</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, marginTop: "0.25rem" }}>
          Manage employee profiles, override passwords, set roles, and control active dashboard access.
        </p>
      </div>

      {/* Search & Analytics Card */}
      <div className="glass-panel mx-6 mb-5" style={{
        padding: "1rem 1.5rem",
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
        {/* Search Input Field */}
        <div style={{
          position: "relative",
          width: "260px",
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
            placeholder="Search by name or email..."
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

        {/* Counter Metrics Pills */}
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
            TOTAL STAFF: {totalStaff}
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
            ACTIVE: {activeStaff}
          </div>

          <a
            href="/desktop-agent/Install-StaffOps-Workstation.bat"
            download
            style={{
              height: "36px",
              background: "linear-gradient(135deg, #0077B6, #023E8A)",
              color: "#FFFFFF",
              borderRadius: "6px",
              padding: "0 0.85rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              textDecoration: "none",
              boxShadow: "0 2px 6px rgba(2, 62, 138, 0.25)"
            }}
          >
            <Download size={15} />
            <span>Download Workstation Security Sync (.exe)</span>
          </a>
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
            DISABLED: {disabledStaff}
          </div>
        </div>
      </div>

      {/* Main Table Container Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mx-6 mb-6" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="table-container-outer" style={{ width: "100%" }}>
          <table className="premium-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ padding: "0.75rem 1rem", width: "20%" }}>FULL NAME</th>
                <th style={{ padding: "0.75rem 1rem", width: "25%" }}>GMAIL (READ-ONLY)</th>
                <th style={{ padding: "0.75rem 1rem", width: "15%" }}>PASSWORD</th>
                <th style={{ padding: "0.75rem 1rem", width: "15%" }}>DESIGNATION</th>
                <th style={{ padding: "0.75rem 1rem", width: "15%" }}>STATUS</th>
                <th style={{ textAlign: "center", padding: "0.75rem 1rem", width: "15%" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {totalRecords === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                    No matching Team Leads or Sales Representatives found in the system.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, padding: "0.75rem 1rem" }}>{u.name || "N/A"}</td>
                    <td style={{ color: "var(--text-secondary)", padding: "0.75rem 1rem" }}>{u.email}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--gold-premium)", fontWeight: 600 }}>
                          {u.password ? (visiblePasswords[u.id] ? u.password : "••••••••") : <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontWeight: 400 }}>No Password</span>}
                        </span>
                        {u.password && (
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(u.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--text-muted)",
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "0.25rem",
                              transition: "color 0.2s ease"
                            }}
                            title={visiblePasswords[u.id] ? "Hide Password" : "Show Password"}
                          >
                            {visiblePasswords[u.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span 
                        className={`badge ${u.role === "TEAM_LEAD" ? "developer" : (u.role === "IT_DEPARTMENT" ? "active" : "default")}`} 
                        style={{ 
                          fontSize: "0.7rem",
                          background: u.role === "TEAM_LEAD" 
                            ? "rgba(16, 185, 129, 0.1)" 
                            : u.role === "IT_DEPARTMENT" 
                              ? "rgba(167, 139, 250, 0.1)" 
                              : "rgba(59, 130, 246, 0.1)",
                          color: u.role === "TEAM_LEAD" 
                            ? "#10B981" 
                            : u.role === "IT_DEPARTMENT" 
                              ? "#8B5CF6" 
                              : "#3B82F6",
                          border: u.role === "TEAM_LEAD" 
                            ? "1px solid rgba(16, 185, 129, 0.2)" 
                            : u.role === "IT_DEPARTMENT" 
                              ? "1px solid rgba(167, 139, 250, 0.2)" 
                              : "1px solid rgba(59, 130, 246, 0.2)"
                        }}
                      >
                        {u.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u.id, u.status)}
                          disabled={isPending}
                          style={{
                            position: "relative",
                            width: "44px",
                            height: "24px",
                            borderRadius: "12px",
                            background: u.status === "APPROVED" ? "#10B981" : "#D1D5DB",
                            border: "none",
                            cursor: isPending ? "not-allowed" : "pointer",
                            transition: "background-color 0.2s ease",
                            outline: "none",
                            padding: 0,
                            display: "inline-flex",
                            alignItems: "center"
                          }}
                          title={u.status === "APPROVED" ? "Toggle to Disable" : "Toggle to Activate"}
                        >
                          <span style={{
                            position: "absolute",
                            left: u.status === "APPROVED" ? "22px" : "2px",
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            background: "#FFFFFF",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15)",
                            transition: "left 0.2s ease"
                          }} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem" }}>
                        <button
                          onClick={() => {
                            setEditAccountUserId(u.id);
                            setEditAccountName(u.name || "");
                            setEditAccountPassword(u.password || "");
                            setEditAccountRole(u.role === "TEAM_LEAD" ? "TEAM_LEAD" : "SALES_ASSOCIATE");
                            setEditAccountStatus(u.status === "BLOCKED" ? "BLOCKED" : "APPROVED");
                            setEditAccountTeamLeadId(u.teamLeadId);
                            setEditAccountError(null);
                            setShowEditAccountModal(true);
                          }}
                          className="btn-glass"
                          style={{ padding: "0.25rem 0.5rem", height: "auto", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <Edit2 size={12} />
                          <span>Edit Account</span>
                        </button>
                        {u.role === "SALES_ASSOCIATE" && (
                          <button
                            onClick={() => {
                              setReassignAssociateId(u.id);
                              setReassignAssociateName(u.name || u.email);
                              setReassignTeamLeadId(u.teamLeadId);
                              setReassignError(null);
                              setShowReassignModal(true);
                            }}
                            className="btn-glass"
                            style={{ 
                              padding: "0.25rem 0.5rem", 
                              height: "auto", 
                              display: "inline-flex", 
                              alignItems: "center", 
                              gap: "0.25rem",
                              color: "var(--gold-primary)",
                              borderColor: "var(--border-gold)"
                            }}
                          >
                            <UserCheck size={12} />
                            <span>Reallocate</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Premium Minimalist Pagination Control Bar */}
        {totalRecords > 0 && (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 0",
            borderTop: "1px solid var(--border-dim)",
            background: "#FFFFFF",
            flexWrap: "wrap",
            gap: "1rem"
          }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Showing {totalRecords === 0 ? 0 : startIndex + 1}-{endIndex} of {totalRecords} entries
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

      {/* Edit Team Lead Name Modal */}
      {showEditTLModal && (
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
            <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>EDIT TEAM LEAD PROFILE</h2>

            {editTLError && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                {editTLError}
              </div>
            )}

            <form onSubmit={handleEditTLNameSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Team Lead Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter new profile name"
                  value={editTLName}
                  onChange={(e) => setEditTLName(e.target.value)}
                  className="input-gold"
                  disabled={isPending}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => { setShowEditTLModal(false); setEditTLUserId(""); }}
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
                  {isPending ? "Updating..." : "Save Name"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Onboarding Modal */}
      {showApproveModal && (
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
            maxWidth: "450px",
            width: "100%",
            padding: "2rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            boxShadow: "var(--shadow-premium)"
          }}>
            <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>APPROVE ONBOARDING REQUEST</h2>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Assigning credentials to: <strong style={{ color: "var(--text-primary)" }}>{approveUserName}</strong>
            </div>

            {approveError && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                {approveError}
              </div>
            )}

            <form onSubmit={handleApproveSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Employee ID (Globally Unique)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-101"
                  value={approveEmployeeId}
                  onChange={(e) => setApproveEmployeeId(e.target.value)}
                  className="input-gold"
                  disabled={isPending}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Password</label>
                <input
                  type="text"
                  required
                  placeholder="Enter user account password"
                  value={approvePassword}
                  onChange={(e) => setApprovePassword(e.target.value)}
                  className="input-gold"
                  disabled={isPending}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => { setShowApproveModal(false); setApproveUserId(""); setApproveUserName(""); }}
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
                  {isPending ? "Approving..." : "Approve & Create"}
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
              User: <strong style={{ color: "var(--text-primary)" }}>{resetPassUserName || resetPassUserEmail}</strong>
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
                    setResetPassUserEmail("");
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
      {/* Edit Account Modal */}
      {showEditAccountModal && (
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
            maxWidth: "460px",
            width: "100%",
            padding: "2rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            boxShadow: "var(--shadow-premium)"
          }}>
            <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>EDIT EMPLOYEE ACCOUNT</h2>

            {editAccountError && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                {editAccountError}
              </div>
            )}

            <form onSubmit={handleEditAccountSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter employee full name"
                  value={editAccountName}
                  onChange={(e) => setEditAccountName(e.target.value)}
                  className="input-gold"
                  disabled={isPending}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password Override</label>
                <input
                  type="text"
                  placeholder="Enter new password override"
                  value={editAccountPassword}
                  onChange={(e) => setEditAccountPassword(e.target.value)}
                  className="input-gold"
                  disabled={isPending}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role Designation</label>
                <select
                  value={editAccountRole}
                  onChange={(e) => setEditAccountRole(e.target.value as any)}
                  className="select-gold"
                  disabled={isPending}
                >
                  <option value="TEAM_LEAD">TEAM LEAD</option>
                  <option value="SALES_ASSOCIATE">SALES REPRESENTATIVE</option>
                  <option value="IT_DEPARTMENT">IT DEPARTMENT</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Account Status</label>
                <select
                  value={editAccountStatus}
                  onChange={(e) => setEditAccountStatus(e.target.value as any)}
                  className="select-gold"
                  disabled={isPending}
                >
                  <option value="APPROVED">Active (Approved)</option>
                  <option value="BLOCKED">Disabled (Blocked)</option>
                </select>
              </div>

              {editAccountRole === "SALES_ASSOCIATE" && (
                <div className="form-group">
                  <label className="form-label">Assign Team Lead</label>
                  <select
                    value={editAccountTeamLeadId || ""}
                    onChange={(e) => setEditAccountTeamLeadId(e.target.value ? e.target.value : null)}
                    className="select-gold"
                    disabled={isPending}
                  >
                    <option value="">No Mapped Team Lead</option>
                    {users
                      .filter(u => u.role === "TEAM_LEAD" && u.status === "APPROVED")
                      .map(tl => (
                        <option key={tl.id} value={tl.id}>
                          {tl.name || tl.email}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditAccountModal(false);
                    setEditAccountUserId("");
                    setEditAccountName("");
                    setEditAccountPassword("");
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
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showReassignModal && (
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
            maxWidth: "460px",
            width: "100%",
            padding: "2rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            boxShadow: "var(--shadow-premium)"
          }}>
            <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>REASSIGN SALES REPRESENTATIVE</h2>

            {reassignError && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                {reassignError}
              </div>
            )}

            <form onSubmit={handleReassignSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Representative Name</label>
                <input
                  type="text"
                  readOnly
                  value={reassignAssociateName}
                  className="input-gold"
                  style={{ background: "#F3F4F6", cursor: "not-allowed" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Team Lead</label>
                <select
                  value={reassignTeamLeadId || ""}
                  onChange={(e) => setReassignTeamLeadId(e.target.value ? e.target.value : null)}
                  className="select-gold"
                  disabled={isPending}
                >
                  <option value="">No Mapped Team Lead</option>
                  {users
                    .filter(u => u.role === "TEAM_LEAD" && u.status === "APPROVED")
                    .map(tl => (
                      <option key={tl.id} value={tl.id}>
                        {tl.name || tl.email}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowReassignModal(false);
                    setReassignAssociateId("");
                    setReassignAssociateName("");
                    setReassignTeamLeadId(null);
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
                  {isPending ? "Reassigning..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
