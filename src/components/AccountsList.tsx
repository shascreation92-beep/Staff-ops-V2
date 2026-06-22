"use client";

import React, { useState, useTransition } from "react";
import { 
  createAccountAction, 
  updateAccountStatusAction, 
  verifyAccountAction 
} from "@/app/actions/accounts";
import { 
  Search, 
  Plus, 
  SlidersHorizontal, 
  ShieldCheck, 
  ShieldX, 
  Key, 
  ArrowRight, 
  AlertCircle,
  HelpCircle,
  Database,
  Building,
  CheckCircle,
  XCircle,
  Eye
} from "lucide-react";
import { account_status, user_role } from "@prisma/client";
import NotificationBell from "./NotificationBell";

interface AccountsListProps {
  currentUser: {
    id: string;
    role: user_role;
    email?: string | null;
  };
  accounts: any[];
  platforms: any[];
  companies: any[];
  rules: Record<string, string>;
  duplicateMap: Record<string, number>;
}

export default function AccountsList({
  currentUser,
  accounts,
  platforms,
  companies,
  rules,
  duplicateMap
}: AccountsListProps) {
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [platformFilter, setPlatformFilter] = useState("ALL");

  // Provision modal state
  const [showModal, setShowModal] = useState(false);
  const [platformId, setPlatformId] = useState(platforms[0]?.id || "");
  const [serialCode, setSerialCode] = useState("");
  const [idName, setIdName] = useState("");
  const [adsPublished, setAdsPublished] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<"Yes" | "No">("No");
  const [targetCompanyId, setTargetCompanyId] = useState(companies[0]?.id || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Workflow update state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [activeAccount, setActiveAccount] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<account_status>("SUBMITTED");
  const [transitionNotes, setTransitionNotes] = useState("");

  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const isCompanyOwner = currentUser.role === "COMPANY_OWNER";
  const isTeamLead = currentUser.role === "TEAM_LEAD";
  const isSalesAssociate = currentUser.role === "SALES_ASSOCIATE";
  const isIT = currentUser.role === "IT_DEPARTMENT";

  // Threshold rules from Database / defaults
  const minAdsRule = parseInt(rules["minAds"] || "10", 10);
  const requireVerificationRule = rules["requireVerification"] !== "false";

  // Filter accounts
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = 
      acc.serialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.idName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.company?.name || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || acc.status === statusFilter;
    const matchesPlatform = platformFilter === "ALL" || acc.platformId === platformFilter;

    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const getStatusStyle = (acc: any) => {
    const isVerified = acc.verificationStatus === "Yes";
    const adsCount = acc.adsPublished;
    const isApproved = ["ACTIVE", "COMPLETED", "APPROVED_BY_TEAM_LEAD"].includes(acc.status);

    if (acc.status === "REJECTED" || !isVerified) {
      return {
        color: "var(--color-danger)",
        text: "Rejected / Unverified",
        bg: "rgba(239, 68, 68, 0.1)",
        border: "rgba(239, 68, 68, 0.3)",
        glow: "0 0 10px rgba(239, 68, 68, 0.15)"
      };
    }

    if (adsCount < minAdsRule) {
      return {
        color: "var(--orange-accent)",
        text: `Below Min Ads (${minAdsRule})`,
        bg: "rgba(255, 138, 0, 0.1)",
        border: "rgba(255, 138, 0, 0.3)",
        glow: "0 0 10px rgba(255, 138, 0, 0.15)"
      };
    }

    if (isVerified && adsCount >= minAdsRule && isApproved) {
      return {
        color: "var(--gold-glow)",
        text: "Verified & Approved",
        bg: "rgba(255, 215, 0, 0.05)",
        border: "var(--border-gold)",
        glow: "0 0 10px rgba(255, 215, 0, 0.15)"
      };
    }

    return {
      color: "var(--text-secondary)",
      text: acc.status.replace(/_/g, " "),
      bg: "rgba(255, 255, 255, 0.02)",
      border: "var(--border-dim)",
      glow: "none"
    };
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const res = await createAccountAction({
          platformId,
          serialCode,
          idName,
          adsPublished,
          verificationStatus,
          targetCompanyId: isSuperAdmin ? targetCompanyId : undefined
        });

        if (res.success) {
          setShowModal(false);
          setSerialCode("");
          setIdName("");
          setAdsPublished(0);
          setVerificationStatus("No");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to provision account.");
      }
    });
  };

  const triggerStatusTransition = (acc: any, status: account_status) => {
    setActiveAccount(acc);
    setTargetStatus(status);
    setTransitionNotes("");
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!activeAccount) return;
    
    startTransition(async () => {
      try {
        const res = await updateAccountStatusAction(
          activeAccount.id,
          targetStatus,
          transitionNotes
        );
        if (res.success) {
          setShowStatusModal(false);
          setActiveAccount(null);
        }
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleToggleVerification = async (accountId: string, current: string) => {
    const nextVal = current !== "Yes";
    if (confirm(`Do you wish to change verification status to ${nextVal ? "VERIFIED" : "UNVERIFIED"}?`)) {
      try {
        await verifyAccountAction(accountId, nextVal);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Toolbar Controls */}
      <div className="glass-panel table-panel" style={{ padding: "1.25rem 1.5rem", marginBottom: 0 }}>
        <div className="table-toolbar table-toolbar-responsive">
          {/* Center Column: Search icon, Search input, and Select filters */}
          <div className="toolbar-center-group">
            <div className="table-search-wrapper" style={{ width: "100%", maxWidth: "360px" }}>
              <Search className="header-search-icon" />
              <input
                type="text"
                placeholder="Search serial, ID name, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="header-search-input"
              />
            </div>

            <div className="table-filter-group">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="table-select-filter"
              >
                <option value="ALL">ALL STATUSES</option>
                <option value="DRAFT">DRAFT</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="UNDER_REVIEW">UNDER REVIEW</option>
                <option value="APPROVED_BY_TEAM_LEAD">APPROVED BY TL</option>
                <option value="ASSIGNED_TO_IT">ASSIGNED TO IT</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="REJECTED">REJECTED</option>
              </select>

              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="table-select-filter"
              >
                <option value="ALL">ALL PLATFORMS</option>
                {platforms.map(p => (
                  <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Column: Provision Button and Notification Icon */}
          <div className="toolbar-right-group">
            {(isSuperAdmin || isCompanyOwner) && (
              <button 
                className="btn-gold" 
                onClick={() => setShowModal(true)}
                disabled={isPending}
              >
                <Plus size={16} />
                <span>PROVISION ACCOUNT</span>
              </button>
            )}
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* Main Table listing */}
      <div className="glass-panel table-panel">
        <div className="table-container-outer">
          <table className="premium-table">
            <thead>
              <tr>
                {isSuperAdmin && <th>Tenant Company</th>}
                <th>Platform</th>
                <th>Serial Code</th>
                <th>ID Name (Duplicates)</th>
                <th>Ads Published</th>
                <th>Verified</th>
                <th>Workflow Status</th>
                <th>Rule Metrics</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 9 : 8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    No operational accounts cataloged.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const rule = getStatusStyle(acc);
                  const duplicates = duplicateMap[acc.idName] || 1;

                  return (
                    <tr key={acc.id}>
                      {isSuperAdmin && (
                        <td style={{ fontWeight: 600, color: "var(--gold-primary)" }}>
                          {acc.company?.name || "Global"}
                        </td>
                      )}
                      <td>
                        <span className="badge developer" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                          {acc.platform?.name}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 500 }}>
                        {acc.serialCode}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span>{acc.idName}</span>
                          {duplicates > 1 && (
                            <span 
                              title={`${duplicates} duplicate records use this ID name`}
                              className="badge" 
                              style={{ 
                                padding: "0.05rem 0.4rem", 
                                background: "rgba(245, 158, 11, 0.08)", 
                                border: "1px solid rgba(245, 158, 11, 0.2)", 
                                color: "#fbbf24", 
                                fontSize: "0.65rem" 
                              }}
                            >
                              x{duplicates}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        {acc.adsPublished} ads
                      </td>
                      <td>
                        <button
                          onClick={() => (isSuperAdmin || isCompanyOwner || isTeamLead) && handleToggleVerification(acc.id, acc.verificationStatus)}
                          disabled={!(isSuperAdmin || isCompanyOwner || isTeamLead)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: (isSuperAdmin || isCompanyOwner || isTeamLead) ? "pointer" : "default",
                            display: "flex",
                            alignItems: "center"
                          }}
                        >
                          {acc.verificationStatus === "Yes" ? (
                            <span className="badge verified" style={{ gap: "0.25rem" }}>
                              <ShieldCheck size={12} /> Yes
                            </span>
                          ) : (
                            <span className="badge suspended" style={{ gap: "0.25rem" }}>
                              <ShieldX size={12} /> No
                            </span>
                          )}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span className="badge" style={{
                            background: acc.status === "ACTIVE" ? "rgba(34,197,94,0.06)" : acc.status === "REJECTED" ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)",
                            border: acc.status === "ACTIVE" ? "1px solid rgba(34,197,94,0.2)" : acc.status === "REJECTED" ? "1px solid rgba(239,68,68,0.2)" : "1px solid var(--border-dim)",
                            color: acc.status === "ACTIVE" ? "var(--color-success)" : acc.status === "REJECTED" ? "var(--color-danger)" : "var(--text-secondary)",
                            fontSize: "0.7rem"
                          }}>
                            {acc.status.replace(/_/g, " ")}
                          </span>
                          {(acc.status === "ASSIGNED_TO_IT" || acc.status === "IN_PROGRESS") && acc.user_account_updatedByIdTouser && (
                            <span 
                              title={`Claimed by ${acc.user_account_updatedByIdTouser.name || acc.user_account_updatedByIdTouser.email}`}
                              style={{
                                width: "18px",
                                height: "18px",
                                borderRadius: "50%",
                                background: "rgba(212, 175, 55, 0.2)",
                                border: "1px solid var(--gold-premium)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.65rem",
                                fontWeight: 800,
                                color: "var(--gold-premium)",
                                cursor: "help",
                                boxShadow: "0 0 8px rgba(212, 175, 55, 0.4)"
                              }}
                            >
                              {(acc.user_account_updatedByIdTouser.name || acc.user_account_updatedByIdTouser.email || "I").charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div 
                          className="badge" 
                          style={{ 
                            background: rule.bg, 
                            border: `1px solid ${rule.border}`, 
                            color: rule.color, 
                            boxShadow: rule.glow,
                            fontSize: "0.7rem"
                          }}
                        >
                          {rule.text}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          
                          {/* Sales Associate workflow action: Submit */}
                          {isSalesAssociate && ["DRAFT", "REJECTED"].includes(acc.status) && (
                            <button
                              onClick={() => triggerStatusTransition(acc, "SUBMITTED")}
                              className="btn-glass"
                              style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", gap: "0.25rem" }}
                            >
                              <span>Submit</span> <ArrowRight size={12} />
                            </button>
                          )}

                          {/* Team Lead workflow action: TL Approve/Reject */}
                          {isTeamLead && ["SUBMITTED", "UNDER_REVIEW"].includes(acc.status) && (
                            <>
                              <button
                                onClick={() => triggerStatusTransition(acc, "APPROVED_BY_TEAM_LEAD")}
                                className="btn-success"
                                style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", height: "auto" }}
                              >
                                TL Approve
                              </button>
                              <button
                                onClick={() => triggerStatusTransition(acc, "REJECTED")}
                                className="btn-danger"
                                style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", height: "auto" }}
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {/* IT Department workflow action */}
                          {isIT && acc.status === "APPROVED_BY_TEAM_LEAD" && (
                            <button
                              onClick={() => triggerStatusTransition(acc, "ASSIGNED_TO_IT")}
                              className="btn-glass"
                              style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                            >
                              IT Assign
                            </button>
                          )}

                          {isIT && acc.status === "ASSIGNED_TO_IT" && (
                            <button
                              onClick={() => triggerStatusTransition(acc, "IN_PROGRESS")}
                              className="btn-gold"
                              style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", height: "auto" }}
                            >
                              In Progress
                            </button>
                          )}

                          {isIT && acc.status === "IN_PROGRESS" && (
                            <button
                              onClick={() => triggerStatusTransition(acc, "ACTIVE")}
                              className="btn-success"
                              style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", height: "auto" }}
                            >
                              Set Active
                            </button>
                          )}

                          {/* Super Admin unrestricted override */}
                          {isSuperAdmin && (
                            <select
                              value={acc.status}
                              onChange={(e) => triggerStatusTransition(acc, e.target.value as account_status)}
                              className="table-select-filter"
                              style={{ padding: "0.15rem 1.5rem 0.15rem 0.45rem", fontSize: "0.75rem" }}
                            >
                              <option value="DRAFT">DRAFT</option>
                              <option value="SUBMITTED">SUBMITTED</option>
                              <option value="UNDER_REVIEW">UNDER REVIEW</option>
                              <option value="APPROVED_BY_TEAM_LEAD">TL APPROVED</option>
                              <option value="ASSIGNED_TO_IT">ASSIGNED IT</option>
                              <option value="IN_PROGRESS">IN PROGRESS</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="REJECTED">REJECTED</option>
                            </select>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Account Modal */}
      {showModal && (
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
            maxWidth: "500px",
            width: "100%",
            padding: "2rem",
            background: "rgba(10,10,10,0.98)",
            border: "1px solid var(--border-gold)",
            boxShadow: "var(--shadow-premium), var(--shadow-gold-glow-hover)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem"
          }}>
            <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>PROVISION SYSTEM SHARD</h2>

            {errorMsg && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateAccount} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {isSuperAdmin && (
                <div className="form-group">
                  <label className="form-label">Target Tenant Company</label>
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
                <label className="form-label">Platform</label>
                <select
                  value={platformId}
                  onChange={(e) => setPlatformId(e.target.value)}
                  className="select-gold"
                >
                  {platforms.map(p => (
                    <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Serial Code (Globally Unique)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SC-983021"
                  value={serialCode}
                  onChange={(e) => setSerialCode(e.target.value)}
                  className="input-gold"
                />
              </div>

              <div className="form-group">
                <label className="form-label">ID Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Ads Portal"
                  value={idName}
                  onChange={(e) => setIdName(e.target.value)}
                  className="input-gold"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Ads Published</label>
                  <input
                    type="number"
                    min="0"
                    value={adsPublished}
                    onChange={(e) => setAdsPublished(parseInt(e.target.value, 10) || 0)}
                    className="input-gold"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Verification</label>
                  <select
                    value={verificationStatus}
                    onChange={(e) => setVerificationStatus(e.target.value as "Yes" | "No")}
                    className="select-gold"
                  >
                    <option value="No">No (Unverified)</option>
                    <option value="Yes">Yes (Verified)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  {isPending ? "Provisioning..." : "Provision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Update / Workflow Transition Modal */}
      {showStatusModal && activeAccount && (
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
            maxWidth: "460px",
            width: "100%",
            padding: "2rem",
            background: "rgba(10,10,10,0.98)",
            border: "1px solid var(--border-gold)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem"
          }}>
            <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>WORKFLOW PIPELINE TRANSITION</h2>
            
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Account Serial: <strong style={{ color: "var(--text-primary)" }}>{activeAccount.serialCode}</strong>
              <br />
              Current State: <strong style={{ color: "var(--gold-primary)" }}>{activeAccount.status}</strong>
              <br />
              Target State: <strong style={{ color: "var(--color-success)" }}>{targetStatus}</strong>
            </div>

            <div className="form-group">
              <label className="form-label">Workflow Action Notes / Comments</label>
              <textarea
                rows={3}
                placeholder="Specify reasons, diagnostic notes or assignments details..."
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                className="input-gold"
                style={{ resize: "none", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => {
                  setShowStatusModal(false);
                  setActiveAccount(null);
                }}
                className="btn-glass"
                style={{ flex: 1 }}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                className="btn-gold"
                style={{ flex: 1 }}
                disabled={isPending}
              >
                {isPending ? "Transitioning..." : "Apply Transition"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
