"use client";

import React, { useState, useTransition } from "react";
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
  editUserAccountAction
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
  Search
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
            ? "Upgrade invitation successfully sent to active Sales Associate."
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
  const [editAccountRole, setEditAccountRole] = useState<"TEAM_LEAD" | "SALES_ASSOCIATE">("SALES_ASSOCIATE");
  const [editAccountStatus, setEditAccountStatus] = useState<"APPROVED" | "BLOCKED">("APPROVED");
  const [editAccountTeamLeadId, setEditAccountTeamLeadId] = useState<string | null>(null);
  const [editAccountError, setEditAccountError] = useState<string | null>(null);

  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState("");

  const staffUsers = users.filter(u => u.role === "TEAM_LEAD" || u.role === "SALES_ASSOCIATE");
  const filteredUsers = staffUsers.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

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

  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const isCompanyOwner = currentUser.role === "COMPANY_OWNER";

  // Dynamic Rule change handler
  // Updated rule handling moved to RuleForm component





  const totalStaff = filteredUsers.length;
  const activeStaff = filteredUsers.filter(u => u.status === "APPROVED").length;
  const disabledStaff = filteredUsers.filter(u => u.status === "BLOCKED" || u.status === "REJECTED").length;

  return (
    <>
      {/* Title Row */}
      <div style={{ padding: "0.5rem 1rem 1rem 1.25rem" }}>
        <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>USER DIRECTORY</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
          Manage employee profiles, override passwords, set roles, and control active dashboard access.
        </p>
      </div>

      {/* Sheet Container Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mx-6 mb-6" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Search and Metrics Bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          background: "#F9FAFB",
          border: "1px solid var(--border-dim)",
          borderRadius: "12px",
          padding: "0.75rem 1rem",
          marginTop: "0.5rem"
        }}>
          {/* Search Input Field */}
          <div style={{ position: "relative", flex: 1, maxWidth: "360px" }}>
            <Search 
              size={16} 
              style={{ 
                position: "absolute", 
                left: "0.75rem", 
                top: "50%", 
                transform: "translateY(-50%)", 
                color: "var(--text-muted)" 
              }} 
            />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-gold"
              style={{
                paddingLeft: "2.25rem",
                height: "38px",
                fontSize: "0.85rem",
                width: "100%"
              }}
            />
          </div>

          {/* Counter Metrics Pills */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span className="badge" style={{ background: "rgba(100, 116, 139, 0.08)", color: "var(--text-primary)", border: "1px solid var(--border-dim)", padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600 }}>
              Total Staff: {totalStaff}
            </span>
            <span className="badge" style={{ background: "rgba(16, 185, 129, 0.08)", color: "#10B981", border: "1px solid rgba(16, 185, 129, 0.15)", padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600 }}>
              Active: {activeStaff}
            </span>
            <span className="badge" style={{ background: "rgba(239, 68, 68, 0.08)", color: "#EF4444", border: "1px solid rgba(239, 68, 68, 0.15)", padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600 }}>
              Disabled: {disabledStaff}
            </span>
          </div>
        </div>

        <div className="table-container-outer" style={{ width: "100%", marginTop: "0.5rem", display: "flex", justifyContent: "center" }}>
          <table className="premium-table" style={{ width: "100%", maxWidth: "1024px", margin: "0 auto" }}>
            <thead>
              <tr>
                <th style={{ padding: "0.75rem 1rem", width: "22%" }}>FULL NAME</th>
                <th style={{ padding: "0.75rem 1rem", width: "25%" }}>GMAIL (READ-ONLY)</th>
                <th style={{ padding: "0.75rem 1rem", width: "15%" }}>PASSWORD</th>
                <th style={{ padding: "0.75rem 1rem", width: "16%" }}>DESIGNATION</th>
                <th style={{ padding: "0.75rem 1rem", width: "10%" }}>STATUS</th>
                <th style={{ textAlign: "right", padding: "0.75rem 1rem", width: "12%" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                    No matching Team Leads or Sales Associates found in the system.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
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
                        className={`badge ${u.role === "TEAM_LEAD" ? "developer" : "default"}`} 
                        style={{ 
                          fontSize: "0.7rem",
                          background: u.role === "TEAM_LEAD" ? "rgba(16, 185, 129, 0.1)" : "rgba(59, 130, 246, 0.1)",
                          color: u.role === "TEAM_LEAD" ? "#10B981" : "#3B82F6",
                          border: u.role === "TEAM_LEAD" ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(59, 130, 246, 0.2)"
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
                    <td style={{ textAlign: "right", padding: "0.75rem 1rem" }}>
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                  <option value="SALES_ASSOCIATE">Sales Associate</option>
                  <option value="TEAM_LEAD">Team Lead</option>
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
    </>
  );
}
