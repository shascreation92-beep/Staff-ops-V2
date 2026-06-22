"use client";

import React, { useState, useTransition } from "react";
import { 
  addPlatformAction, 
  archivePlatformAction, 
  createAnnouncementAction, 
  updateCompanyRuleAction 
} from "@/app/actions/settings";
import { 
  Sliders, 
  Building, 
  Plus, 
  Trash2, 
  Megaphone, 
  FileText, 
  Check, 
  HelpCircle,
  AlertCircle
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
}

export default function SettingsShard({
  currentUser,
  platforms,
  companies,
  rules,
  announcements
}: SettingsShardProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"RULES" | "PLATFORMS" | "ANNOUNCEMENTS">("RULES");

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

      </div>
    </div>
  );
}
