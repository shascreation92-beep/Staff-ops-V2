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
  Key
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





  return (
    <div className="glass-panel" style={{
      display: "grid",
      gridTemplateColumns: "240px 1fr",
      minHeight: "550px",
      background: "#FFFFFF",
      border: "1px solid var(--border-dim)",
      borderRadius: "var(--border-radius-md)",
      overflow: "hidden",
      boxShadow: "var(--shadow-premium)"
    }}>
      
      {/* Sidebar options */}
      <div style={{
        borderRight: "1px solid var(--border-dim)",
        display: "flex",
        flexDirection: "column",
        background: "#F9FAFB",
        padding: "1rem",
        position: "relative",
        zIndex: 50
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-dim)", padding: "0 0.5rem 1rem 0.5rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Configuration Panel
          </div>
          <NotificationBell />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "1rem" }}>
          <button
            onClick={() => setActiveTab("RULES")}
            className={`sidebar-item ${activeTab === "RULES" ? "active" : ""}`}
            style={{ border: "none", background: "none", width: "100%", textAlign: "left" }}
          >
            <Sliders className="sidebar-icon" size={16} />
            <span>Rule Engine</span>
          </button>

          {(isSuperAdmin || isCompanyOwner) && (
            <button
              onClick={() => setActiveTab("INVITATIONS")}
              className={`sidebar-item ${activeTab === "INVITATIONS" ? "active" : ""}`}
              style={{ border: "none", background: "none", width: "100%", textAlign: "left" }}
            >
              <Users className="sidebar-icon" size={16} />
              <span>Team Invitations</span>
            </button>
          )}

          {(isSuperAdmin || isCompanyOwner || currentUser.role === "IT_DEPARTMENT") && (
            <button
              onClick={() => setActiveTab("USERS")}
              className={`sidebar-item ${activeTab === "USERS" ? "active" : ""}`}
              style={{ border: "none", background: "none", width: "100%", textAlign: "left" }}
            >
              <Users className="sidebar-icon" size={16} />
              <span>User Accounts</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab("PLATFORMS")}
              className={`sidebar-item ${activeTab === "PLATFORMS" ? "active" : ""}`}
              style={{ border: "none", background: "none", width: "100%", textAlign: "left" }}
            >
              <Building className="sidebar-icon" size={16} />
              <span>Platform Manager</span>
            </button>
          )}

        </div>
      </div>

      {/* Content pane */}
      <div style={{ padding: "2rem", overflowY: "auto" }}>
        
        {/* Tab 1: Threshold Rules */}
        {activeTab === "RULES" && (
          <RuleForm
            currentUserRole={currentUser.role}
            companies={companies}
            initialValues={{
              minAds,
              requireVerification: requireVerification as 'true' | 'false',
              targetToMaintain,
              targetToMaintainFB,
            }}
            targetCompanyId={isSuperAdmin ? targetCompanyId : undefined}
          />
        )}

        {/* Tab 2: Platform Manager */}
        {activeTab === "PLATFORMS" && isSuperAdmin && (
          <PlatformManager platforms={platforms} isPending={isPending} />
        )}


        {/* Tab 4: Team Invitations */}
        {activeTab === "INVITATIONS" && (isSuperAdmin || isCompanyOwner) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>TEAM INVITATION DISPATCHER</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Add new IT department operators or designate Team Leads by sending email invitations.
              </p>
            </div>

            {inviteSuccessMsg && (
              <div style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-success)", fontSize: "0.85rem" }}>
                {inviteSuccessMsg}
              </div>
            )}

            {inviteError && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                {inviteError}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem" }}>
              {/* Form */}
              <form onSubmit={handleSendInvitation} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "380px" }}>
                <div className="form-group">
                  <label className="form-label">Recipient Gmail Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. operator@gmail.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="input-gold"
                    disabled={isPending}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Designation Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="select-gold"
                    disabled={isPending}
                  >
                    <option value="TEAM_LEAD">Team Lead</option>
                    <option value="IT_DEPARTMENT">IT Department Member</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn-gold"
                  style={{ width: "100%", height: "42px", marginTop: "0.5rem" }}
                  disabled={isPending}
                >
                  {isPending ? "Sending..." : "DISPATCH INVITATION"}
                </button>
              </form>

              {/* Invitation List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.5rem" }}>
                  Pending Invitations
                </h3>
                <div className="table-container-outer" style={{ maxHeight: "380px", overflowY: "auto" }}>
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Recipient</th>
                        <th>Role</th>
                        <th style={{ textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingInvitations.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem", fontSize: "0.8rem" }}>
                            No active invitations.
                          </td>
                        </tr>
                      ) : (
                        pendingInvitations.map(invite => (
                          <tr key={invite.id}>
                            <td style={{ fontWeight: 500, fontSize: "0.85rem" }}>{invite.email}</td>
                            <td>
                              <span className="badge pending" style={{ fontSize: "0.65rem" }}>
                                {invite.role.replace("_", " ")}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                onClick={() => handleCancelInvitation(invite.id, invite.email)}
                                className="btn-danger"
                                style={{ padding: "0.25rem 0.5rem", height: "auto" }}
                                title="Cancel Invite"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: User Accounts Directory */}
        {activeTab === "USERS" && (isSuperAdmin || isCompanyOwner || currentUser.role === "IT_DEPARTMENT") && (
          <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>USER DIRECTORY</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Manage employee profiles, override passwords, set roles, and control active dashboard access.
              </p>
            </div>

            <div className="table-container-outer" style={{ width: "100%", marginTop: "1rem" }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Gmail (Read-Only)</th>
                    <th>Password Override</th>
                    <th>Role Designation Badge</th>
                    <th>Account Status Switch</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === "TEAM_LEAD" || u.role === "SALES_ASSOCIATE").length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                        No Team Leads or Sales Associates registered in the system.
                      </td>
                    </tr>
                  ) : (
                    users
                      .filter(u => u.role === "TEAM_LEAD" || u.role === "SALES_ASSOCIATE")
                      .map(u => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 600 }}>{u.name || "N/A"}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--gold-premium)", fontWeight: 600 }}>
                                {u.password ? (visiblePasswords[u.id] ? u.password : "••••••••") : <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontWeight: 400 }}>No Password</span>}
                              </span>
                              {u.password && (
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(u.id)}
                                  className="btn-glass"
                                  style={{ padding: "0.15rem 0.4rem", height: "auto", fontSize: "0.65rem", display: "inline-flex", alignItems: "center" }}
                                >
                                  {visiblePasswords[u.id] ? "Hide" : "Show"}
                                </button>
                              )}
                            </div>
                          </td>
                          <td>
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
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <button
                                onClick={() => handleToggleStatus(u.id, u.status)}
                                disabled={isPending}
                                style={{
                                  background: u.status === "APPROVED" ? "#10B981" : "#EF4444",
                                  color: "#FFFFFF",
                                  border: "none",
                                  borderRadius: "12px",
                                  padding: "0.25rem 0.75rem",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  cursor: isPending ? "not-allowed" : "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  transition: "all 0.2s ease"
                                }}
                              >
                                <span style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: "#FFFFFF",
                                  display: "inline-block"
                                }} />
                                <span>{u.status === "APPROVED" ? "Active" : (u.status === "PENDING" ? "Pending" : "Disabled")}</span>
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>
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

    </div>
  );
}
