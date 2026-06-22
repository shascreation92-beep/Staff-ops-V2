"use client";

import React, { useState, useTransition } from "react";
import { 
  addPlatformAction, 
  archivePlatformAction, 
  createAnnouncementAction, 
  updateCompanyRuleAction 
} from "@/app/actions/settings";
import { 
  sendInvitationAction,
  declineInvitationAction,
  updateTeamLeadNameAction
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
  Edit2
} from "lucide-react";
import { user_role } from "@prisma/client";

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
  const [activeTab, setActiveTab] = useState<"RULES" | "PLATFORMS" | "ANNOUNCEMENTS" | "INVITATIONS" | "USERS">("RULES");

  // State for target company selection (Super Admin override)
  const [targetCompanyId, setTargetCompanyId] = useState(
    currentUser.companyId || (companies[0]?.id || "")
  );

  // Platform manager state
  const [newPlatformName, setNewPlatformName] = useState("");
  const [platformError, setPlatformError] = useState<string | null>(null);

  // Rule engine state
  const [minAds, setMinAds] = useState(parseInt(rules["minAds"] || "10", 10));
  const [requireVerification, setRequireVerification] = useState(
    rules["requireVerification"] !== "false" ? "true" : "false"
  );
  const [ruleSuccessMsg, setRuleSuccessMsg] = useState<string | null>(null);

  // Announcements state
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annTargetCompany, setAnnTargetCompany] = useState("");
  const [annError, setAnnError] = useState<string | null>(null);
  const [annSuccessMsg, setAnnSuccessMsg] = useState<string | null>(null);

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

  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const isCompanyOwner = currentUser.role === "COMPANY_OWNER";

  // Dynamic Rule change handler
  const handleUpdateRules = (e: React.FormEvent) => {
    e.preventDefault();
    setRuleSuccessMsg(null);

    startTransition(async () => {
      try {
        await updateCompanyRuleAction({
          key: "minAds",
          value: minAds.toString(),
          targetCompanyId: isSuperAdmin ? targetCompanyId : undefined
        });

        await updateCompanyRuleAction({
          key: "requireVerification",
          value: requireVerification,
          targetCompanyId: isSuperAdmin ? targetCompanyId : undefined
        });

        setRuleSuccessMsg("Threshold rules synchronized successfully.");
        setTimeout(() => setRuleSuccessMsg(null), 3000);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleAddPlatform = (e: React.FormEvent) => {
    e.preventDefault();
    setPlatformError(null);

    if (!newPlatformName.trim()) return;

    startTransition(async () => {
      try {
        await addPlatformAction({ name: newPlatformName });
        setNewPlatformName("");
      } catch (err: any) {
        setPlatformError(err.message);
      }
    });
  };

  const handleArchivePlatform = async (id: string, name: string) => {
    if (confirm(`Are you sure you wish to archive platform "${name}"? Existing accounts using this platform will remain.`)) {
      try {
        await archivePlatformAction(id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    setAnnError(null);
    setAnnSuccessMsg(null);

    startTransition(async () => {
      try {
        await createAnnouncementAction({
          title: annTitle,
          content: annContent,
          targetCompanyId: annTargetCompany === "" ? undefined : annTargetCompany
        });

        setAnnTitle("");
        setAnnContent("");
        setAnnTargetCompany("");
        setAnnSuccessMsg("System announcement successfully distributed to target nodes.");
        setTimeout(() => setAnnSuccessMsg(null), 3000);
      } catch (err: any) {
        setAnnError(err.message || "Failed to publish announcement.");
      }
    });
  };

  return (
    <div className="glass-panel" style={{
      display: "grid",
      gridTemplateColumns: "240px 1fr",
      minHeight: "550px",
      background: "rgba(10, 10, 10, 0.95)",
      border: "1px solid var(--border-gold)",
      borderRadius: "var(--border-radius-md)",
      overflow: "hidden"
    }}>
      
      {/* Sidebar options */}
      <div style={{
        borderRight: "1px solid var(--border-dim)",
        display: "flex",
        flexDirection: "column",
        background: "rgba(5, 5, 5, 0.4)",
        padding: "1rem"
      }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 0.5rem 1rem 0.5rem", borderBottom: "1px solid var(--border-dim)" }}>
          Configuration Panel
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
            <>
              <button
                onClick={() => setActiveTab("INVITATIONS")}
                className={`sidebar-item ${activeTab === "INVITATIONS" ? "active" : ""}`}
                style={{ border: "none", background: "none", width: "100%", textAlign: "left" }}
              >
                <Users className="sidebar-icon" size={16} />
                <span>Team Invitations</span>
              </button>

              <button
                onClick={() => setActiveTab("USERS")}
                className={`sidebar-item ${activeTab === "USERS" ? "active" : ""}`}
                style={{ border: "none", background: "none", width: "100%", textAlign: "left" }}
              >
                <Users className="sidebar-icon" size={16} />
                <span>User Accounts</span>
              </button>
            </>
          )}

          {isSuperAdmin && (
            <>
              <button
                onClick={() => setActiveTab("PLATFORMS")}
                className={`sidebar-item ${activeTab === "PLATFORMS" ? "active" : ""}`}
                style={{ border: "none", background: "none", width: "100%", textAlign: "left" }}
              >
                <Building className="sidebar-icon" size={16} />
                <span>Platform Manager</span>
              </button>

              <button
                onClick={() => setActiveTab("ANNOUNCEMENTS")}
                className={`sidebar-item ${activeTab === "ANNOUNCEMENTS" ? "active" : ""}`}
                style={{ border: "none", background: "none", width: "100%", textAlign: "left" }}
              >
                <Megaphone className="sidebar-icon" size={16} />
                <span>Announcements</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content pane */}
      <div style={{ padding: "2rem", overflowY: "auto" }}>
        
        {/* Tab 1: Rule Engine */}
        {activeTab === "RULES" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>DYNAMIC RULE ENGINE</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Adjust operational requirements and verification statuses.
              </p>
            </div>

            {ruleSuccessMsg && (
              <div style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-success)", fontSize: "0.85rem" }}>
                {ruleSuccessMsg}
              </div>
            )}

            <form onSubmit={handleUpdateRules} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "460px" }}>
              {isSuperAdmin && (
                <div className="form-group">
                  <label className="form-label">Active Shard Target Company</label>
                  <select
                    value={targetCompanyId}
                    onChange={(e) => setTargetCompanyId(e.target.value)}
                    className="select-gold"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <span>Minimum Ads Required</span>
                  <span title="Sets the threshold for warning flags on ads published" style={{ display: "inline-flex", cursor: "help" }}>
                    <HelpCircle size={14} style={{ color: "var(--text-muted)" }} />
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={minAds}
                  onChange={(e) => setMinAds(parseInt(e.target.value, 10) || 0)}
                  className="input-gold"
                  disabled={isPending}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Require Document Verification</label>
                <select
                  value={requireVerification}
                  onChange={(e) => setRequireVerification(e.target.value)}
                  className="select-gold"
                  disabled={isPending}
                >
                  <option value="true">Yes (Flag unverified accounts red)</option>
                  <option value="false">No (Accept unverified accounts)</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-gold"
                style={{ width: "100%", height: "42px", marginTop: "1rem" }}
                disabled={isPending}
              >
                {isPending ? "Syncing Rules..." : "SYNC RULES"}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Platform Manager */}
        {activeTab === "PLATFORMS" && isSuperAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>PLATFORM MANAGER</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Add, manage, and archive account platform directories.
              </p>
            </div>

            {platformError && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                {platformError}
              </div>
            )}

            {/* Add Platform Form */}
            <form onSubmit={handleAddPlatform} style={{ display: "flex", gap: "0.75rem", maxWidth: "460px" }}>
              <input
                type="text"
                required
                placeholder="e.g. Gumtree"
                value={newPlatformName}
                onChange={(e) => setNewPlatformName(e.target.value)}
                className="input-gold"
                style={{ flex: 1, height: "42px" }}
                disabled={isPending}
              />
              <button
                type="submit"
                className="btn-gold"
                style={{ height: "42px" }}
                disabled={isPending}
              >
                <Plus size={16} />
                <span>Add</span>
              </button>
            </form>

            {/* Platform Table list */}
            <div className="table-container-outer" style={{ maxWidth: "550px", marginTop: "1rem" }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Platform Name</th>
                    <th>Created At</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {platforms.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                        No platforms configured.
                      </td>
                    </tr>
                  ) : (
                    platforms.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.name.toUpperCase()}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            onClick={() => handleArchivePlatform(p.id, p.name)}
                            className="btn-danger"
                            style={{ padding: "0.25rem 0.5rem", height: "auto" }}
                            title="Archive Platform"
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
        )}

        {/* Tab 3: System Announcements */}
        {activeTab === "ANNOUNCEMENTS" && isSuperAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>BROADCAST SYSTEM ANNOUNCEMENT</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Send messages and alerts to company dashboard banners.
              </p>
            </div>

            {annSuccessMsg && (
              <div style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-success)", fontSize: "0.85rem" }}>
                {annSuccessMsg}
              </div>
            )}

            {annError && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                {annError}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem" }}>
              {/* Dispatcher Form */}
              <form onSubmit={handleSendAnnouncement} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Recipient Scope</label>
                  <select
                    value={annTargetCompany}
                    onChange={(e) => setAnnTargetCompany(e.target.value)}
                    className="select-gold"
                    disabled={isPending}
                  >
                    <option value="">Global Broadcast (All Companies)</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Announcement Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Critical Shard Database Maintenance"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="input-gold"
                    disabled={isPending}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Announcement Content</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Enter broadcast details, links or schedules..."
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    className="input-gold"
                    style={{ resize: "none" }}
                    disabled={isPending}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-gold"
                  style={{ width: "100%", height: "42px", marginTop: "0.5rem" }}
                  disabled={isPending}
                >
                  {isPending ? "Broadcasting..." : "DISPATCH BROADCAST"}
                </button>
              </form>

              {/* History list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.5rem" }}>
                  Announcement Archive
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "380px", overflowY: "auto" }}>
                  {announcements.length === 0 ? (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No broadcasts recorded.</span>
                  ) : (
                    announcements.map(ann => (
                      <div key={ann.id} style={{ padding: "0.75rem", border: "1px solid var(--border-gold)", borderRadius: "var(--border-radius-sm)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--gold-primary)" }}>{ann.title}</span>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>{ann.content}</p>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          Sent: {new Date(ann.createdAt).toLocaleDateString()} | Scope: {ann.company?.name || "Global"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
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
        {activeTab === "USERS" && (isSuperAdmin || isCompanyOwner) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>USER ACCOUNTS DIRECTORY</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Monitor system operators, view plain-text active passwords, and manage profiles.
              </p>
            </div>

            <div className="table-container-outer" style={{ width: "100%", marginTop: "1rem" }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email Address</th>
                    <th>Designation Role</th>
                    <th>Status</th>
                    <th>Active Password</th>
                    <th>Mapped Team Lead</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                        No user accounts cataloged.
                      </td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.name || "N/A"}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className="badge developer" style={{ fontSize: "0.7rem" }}>
                            {u.role.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.status === "APPROVED" ? "verified" : "pending"}`} style={{ fontSize: "0.7rem" }}>
                            {u.status}
                          </span>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--gold-premium)" }}>
                          {u.password || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No Password Set</span>}
                        </td>
                        <td>
                          {u.role === "SALES_ASSOCIATE" ? (
                            u.user?.name || <span style={{ color: "var(--text-muted)" }}>—</span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>N/A</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {u.role === "TEAM_LEAD" && (
                            <button
                              onClick={() => {
                                setEditTLUserId(u.id);
                                setEditTLName(u.name || "");
                                setEditTLError(null);
                                setShowEditTLModal(true);
                              }}
                              className="btn-glass"
                              style={{ padding: "0.25rem 0.5rem", height: "auto", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                              title="Edit Team Lead Name"
                            >
                              <Edit2 size={12} />
                              <span>Edit Profile</span>
                            </button>
                          )}
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
          background: "rgba(0,0,0,0.85)",
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
            background: "rgba(10,10,10,0.98)",
            border: "1px solid var(--border-gold)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem"
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

    </div>
  );
}
