"use client";

import React, { useState, useTransition } from "react";
import { 
  createAccountAction, 
  updateAccountStatusAction, 
  verifyAccountAction,
  updateAccountAdsAction
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
import { toast } from "react-hot-toast";

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

  // Guided Add Account Wizard State
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardPlatformId, setWizardPlatformId] = useState(platforms[0]?.id || "");
  const [wizardSerialCode, setWizardSerialCode] = useState("");
  const [wizardFirstName, setWizardFirstName] = useState("");
  const [wizardSecondName, setWizardSecondName] = useState("");
  const [wizardAdsPublished, setWizardAdsPublished] = useState(0);
  const [wizardVerificationStatus, setWizardVerificationStatus] = useState<"Yes" | "No">("No");
  const [wizardSubmissionDate, setWizardSubmissionDate] = useState(new Date().toISOString().split("T")[0]);
  const [wizardErrorMsg, setWizardErrorMsg] = useState<string | null>(null);

  // Inline ads editing state
  const [editingAdsId, setEditingAdsId] = useState<string | null>(null);
  const [tempAdsValue, setTempAdsValue] = useState<number>(0);

  // Workflow update state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [activeAccount, setActiveAccount] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<account_status>("SUBMITTED");
  const [transitionNotes, setTransitionNotes] = useState("");

  const handleDirectRequestToTL = async (accountId: string) => {
    if (!confirm("Are you sure you want to submit this account request to your Team Lead?")) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await updateAccountStatusAction(
          accountId,
          "PENDING_TL",
          "Request to TL submitted by Associate"
        );
        if (res.success) {
          toast.success("Request successfully forwarded to your Team Lead!");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to submit request.");
      }
    });
  };

  const handleTLApprove = async (accountId: string) => {
    startTransition(async () => {
      try {
        const res = await updateAccountStatusAction(accountId, "FORWARDED_TO_IT", "Approved by Team Lead");
        if (!res.success) alert("Failed to approve.");
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleITAcknowledge = async (accountId: string) => {
    startTransition(async () => {
      try {
        const res = await updateAccountStatusAction(accountId, "IT_PENDING", "Acknowledged by IT Department");
        if (!res.success) alert("Failed to acknowledge.");
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleITResolve = async (accountId: string) => {
    startTransition(async () => {
      try {
        const res = await updateAccountStatusAction(accountId, "SORTED", "Sorted and resolved by IT Department");
        if (!res.success) alert("Failed to resolve.");
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

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
    if (acc.status === "PENDING_TL") {
      return {
        color: "#60A5FA",
        text: "Pending TL Approval",
        bg: "rgba(96, 165, 250, 0.08)",
        border: "rgba(96, 165, 250, 0.25)",
        glow: "none"
      };
    }
    if (acc.status === "FORWARDED_TO_IT") {
      return {
        color: "#A78BFA",
        text: "Forwarded to IT",
        bg: "rgba(167, 139, 250, 0.08)",
        border: "rgba(167, 139, 250, 0.25)",
        glow: "none"
      };
    }
    if (acc.status === "IT_PENDING") {
      return {
        color: "#F59E0B",
        text: "Pending",
        bg: "rgba(245, 158, 11, 0.08)",
        border: "rgba(245, 158, 11, 0.25)",
        glow: "none"
      };
    }
    if (acc.status === "SORTED") {
      return {
        color: "#22C55E",
        text: "Sorted",
        bg: "rgba(34, 197, 94, 0.08)",
        border: "rgba(34, 197, 94, 0.3)",
        glow: "0 0 12px rgba(34, 197, 94, 0.3)"
      };
    }

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

  const handleSaveAds = async (accountId: string) => {
    if (tempAdsValue < 0) return;
    setEditingAdsId(null);
    try {
      await updateAccountAdsAction(accountId, tempAdsValue);
    } catch (err: any) {
      alert(err.message || "Failed to update ads count");
    }
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

  const handleWizardSubmit = () => {
    setWizardErrorMsg(null);
    if (!wizardPlatformId) {
      setWizardErrorMsg("Platform selection is required.");
      return;
    }
    if (!wizardSerialCode.trim()) {
      setWizardErrorMsg("ID Serial is required.");
      return;
    }
    if (!wizardFirstName.trim() || !wizardSecondName.trim()) {
      setWizardErrorMsg("Both first and second names are required.");
      return;
    }
    if (wizardAdsPublished < 0) {
      setWizardErrorMsg("Ads Published must be 0 or more.");
      return;
    }
    if (!wizardVerificationStatus) {
      setWizardErrorMsg("Verification option is required.");
      return;
    }
    if (!wizardSubmissionDate) {
      setWizardErrorMsg("Date of submission is required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createAccountAction({
          platformId: wizardPlatformId,
          serialCode: wizardSerialCode.trim(),
          idName: `${wizardFirstName.trim()} ${wizardSecondName.trim()}`,
          adsPublished: wizardAdsPublished,
          verificationStatus: wizardVerificationStatus,
          submissionDate: wizardSubmissionDate
        });

        if (res.success) {
          setShowAddWizard(false);
          setWizardStep(1);
          setWizardSerialCode("");
          setWizardFirstName("");
          setWizardSecondName("");
          setWizardAdsPublished(0);
          setWizardVerificationStatus("No");
          setWizardSubmissionDate(new Date().toISOString().split("T")[0]);
        }
      } catch (err: any) {
        setWizardErrorMsg(err.message || "Failed to create account.");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Toolbar Controls */}
      <div className="glass-panel table-panel" style={{ padding: "0.6rem 1.25rem", marginBottom: 0 }}>
        <div className="table-toolbar table-toolbar-responsive">
          {/* Center Column: Search icon, Search input, and Select filters */}
          <div className="toolbar-center-group">
            <div className="table-search-wrapper" style={{ width: "100%", maxWidth: "360px" }}>
              <Search className="header-search-icon" />
              <input
                type="text"
                placeholder="Search"
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

          {/* Left Column: Provision and Add Account Buttons */}
          <div className="toolbar-left-group">
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
            {(isSalesAssociate || isTeamLead || isSuperAdmin || isCompanyOwner) && (
              <button 
                className="btn-gold" 
                onClick={() => {
                  setWizardStep(1);
                  setWizardPlatformId(platforms[0]?.id || "");
                  setWizardSerialCode("");
                  setWizardFirstName("");
                  setWizardSecondName("");
                  setWizardAdsPublished(0);
                  setWizardVerificationStatus("No");
                  setWizardSubmissionDate(new Date().toISOString().split("T")[0]);
                  setWizardErrorMsg(null);
                  setShowAddWizard(true);
                }}
                disabled={isPending}
              >
                <Plus size={16} />
                <span>ADD ACCOUNT</span>
              </button>
            )}
          </div>

          {/* Right Column: Notification Icon only */}
          <div className="toolbar-right-group">
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
                <th>ID Serial</th>
                <th>ID Name</th>
                <th>Ads Pub.</th>
                <th>Verified</th>
                <th>date of entry</th>
                <th>Request to TL</th>
                <th>Status</th>
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
                        {editingAdsId === acc.id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input
                              type="number"
                              min="0"
                              value={tempAdsValue}
                              onChange={(e) => setTempAdsValue(parseInt(e.target.value, 10) || 0)}
                              className="input-gold"
                              style={{ width: "80px", padding: "0.2rem 0.4rem", fontSize: "0.85rem" }}
                              autoFocus
                              onBlur={() => handleSaveAds(acc.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveAds(acc.id);
                                if (e.key === "Escape") setEditingAdsId(null);
                              }}
                            />
                          </div>
                        ) : (
                          <div 
                            onClick={() => {
                              setEditingAdsId(acc.id);
                              setTempAdsValue(acc.adsPublished);
                            }}
                            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}
                            title="Click to edit ads count"
                          >
                            <span>{acc.adsPublished} ads</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", opacity: 0.6 }}>✏️</span>
                          </div>
                        )}
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
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {new Date(acc.createdAt).toISOString().split("T")[0]}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "flex-start" }}>
                          {isSalesAssociate && ["DRAFT", "REJECTED"].includes(acc.status) ? (
                            acc.adsPublished >= 4 ? (
                              <button
                                onClick={() => handleDirectRequestToTL(acc.id)}
                                className="btn-gold"
                                style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", height: "auto" }}
                                disabled={isPending}
                              >
                                Request to TL
                              </button>
                            ) : (
                              <span style={{
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                color: "var(--gold-primary)",
                                background: "rgba(212, 175, 55, 0.08)",
                                border: "1px solid rgba(212, 175, 55, 0.3)",
                                borderRadius: "4px",
                                padding: "0.2rem 0.55rem",
                                letterSpacing: "0.03em",
                                whiteSpace: "nowrap"
                              }}>
                                Insufficient Ads
                              </span>
                            )
                          ) : (acc.status === "PENDING_TL" && (isTeamLead || isSuperAdmin)) ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                                ID: {acc.associateId || "N/A"}
                              </span>
                              <button
                                onClick={() => handleTLApprove(acc.id)}
                                className="btn-success"
                                style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", height: "auto" }}
                                disabled={isPending}
                              >
                                Approve / OK
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                              {acc.associateId ? `ID: ${acc.associateId}` : "—"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span className="badge" style={{
                            background: rule.bg,
                            border: `1px solid ${rule.border}`,
                            color: rule.color,
                            boxShadow: rule.glow,
                            fontSize: "0.7rem",
                            letterSpacing: "0.02em"
                          }}>
                            {rule.text}
                          </span>

                          {(acc.status === "FORWARDED_TO_IT" && (isIT || isSuperAdmin)) && (
                            <button
                              onClick={() => handleITAcknowledge(acc.id)}
                              className="btn-glass"
                              style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", height: "auto", border: "1px solid var(--border-gold)" }}
                              disabled={isPending}
                            >
                              OK
                            </button>
                          )}

                          {(acc.status === "IT_PENDING" && (isIT || isSuperAdmin)) && (
                            <button
                              onClick={() => handleITResolve(acc.id)}
                              className="btn-success"
                              style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", height: "auto" }}
                              disabled={isPending}
                            >
                              Done
                            </button>
                          )}

                          {isSuperAdmin && (
                            <select
                              value={acc.status}
                              onChange={(e) => triggerStatusTransition(acc, e.target.value as account_status)}
                              className="table-select-filter"
                              style={{ padding: "0.1rem 1.25rem 0.1rem 0.3rem", fontSize: "0.7rem", height: "auto", marginLeft: "0.5rem" }}
                            >
                              <option value="DRAFT">DRAFT</option>
                              <option value="PENDING_TL">PENDING_TL</option>
                              <option value="FORWARDED_TO_IT">FORWARDED_TO_IT</option>
                              <option value="IT_PENDING">IT_PENDING</option>
                              <option value="SORTED">SORTED</option>
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

      {/* Modal code removed as it is now automated */}

      {/* Guided Add Account Wizard Modal */}
      {showAddWizard && (
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
          <div className="glass-panel kpi-card" style={{
            maxWidth: "500px",
            width: "100%",
            padding: "2.5rem 2rem",
            background: "rgba(10,10,10,0.98)",
            border: "1px solid var(--border-gold)",
            boxShadow: "var(--shadow-premium), var(--shadow-gold-glow-hover)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            position: "relative"
          }}>
            <div className="kpi-card-glow"></div>
            
            {/* Header: Progress & Title */}
            <div className="kpi-header" style={{ borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.75rem", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--gold-premium)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  STEP {wizardStep} OF 6
                </span>
                <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>
                  {wizardStep === 1 && "Platform Selection"}
                  {wizardStep === 2 && "ID Serial Code"}
                  {wizardStep === 3 && "ID Name Definition"}
                  {wizardStep === 4 && "Ads Published Count"}
                  {wizardStep === 5 && "Verification Status"}
                  {wizardStep === 6 && "Submission Date"}
                </h2>
              </div>
              <div className="kpi-icon-wrapper">
                <Database size={20} />
              </div>
            </div>

            {/* Error Message */}
            {wizardErrorMsg && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                {wizardErrorMsg}
              </div>
            )}

            {/* Step Body */}
            <div style={{ minHeight: "140px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {wizardStep === 1 && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Platform Selection</label>
                  <select
                    value={wizardPlatformId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWizardPlatformId(val);
                      if (val) {
                        setWizardStep(2);
                        setWizardErrorMsg(null);
                      }
                    }}
                    className="select-gold"
                    style={{ width: "100%" }}
                  >
                    <option value="">Select Platform...</option>
                    {platforms.map(p => (
                      <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">ID Serial Code</label>
                  <input
                    type="text"
                    required
                    placeholder="Type the ID Serial (e.g. SC-983021)..."
                    value={wizardSerialCode}
                    onChange={(e) => setWizardSerialCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (wizardSerialCode.trim()) {
                          setWizardStep(3);
                          setWizardErrorMsg(null);
                        } else {
                          setWizardErrorMsg("ID Serial is required.");
                        }
                      }
                    }}
                    className="input-gold"
                    style={{ width: "100%" }}
                    autoFocus
                  />
                </div>
              )}

              {wizardStep === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter ID first name..."
                      value={wizardFirstName}
                      onChange={(e) => setWizardFirstName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const nextInput = document.getElementById("wizard-second-name");
                          if (nextInput) {
                            (nextInput as HTMLInputElement).focus();
                          }
                        }
                      }}
                      className="input-gold"
                      style={{ width: "100%" }}
                      autoFocus
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Second Name</label>
                    <input
                      type="text"
                      id="wizard-second-name"
                      required
                      placeholder="Enter ID second name..."
                      value={wizardSecondName}
                      onChange={(e) => setWizardSecondName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (wizardFirstName.trim() && wizardSecondName.trim()) {
                            setWizardStep(4);
                            setWizardErrorMsg(null);
                          } else {
                            setWizardErrorMsg("Both first and second names are required.");
                          }
                        }
                      }}
                      className="input-gold"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ads Published Count</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="Enter number of ads..."
                    value={wizardAdsPublished}
                    onChange={(e) => setWizardAdsPublished(parseInt(e.target.value, 10) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (wizardAdsPublished >= 0) {
                          setWizardStep(5);
                          setWizardErrorMsg(null);
                        } else {
                          setWizardErrorMsg("Ads Published must be 0 or more.");
                        }
                      }
                    }}
                    className="input-gold"
                    style={{ width: "100%" }}
                    autoFocus
                  />
                </div>
              )}

              {wizardStep === 5 && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Verification Option</label>
                  <select
                    value={wizardVerificationStatus}
                    onChange={(e) => {
                      const val = e.target.value as "Yes" | "No";
                      setWizardVerificationStatus(val);
                      setWizardStep(6);
                      setWizardErrorMsg(null);
                    }}
                    className="select-gold"
                    style={{ width: "100%" }}
                  >
                    <option value="No">No (Unverified)</option>
                    <option value="Yes">Yes (Verified)</option>
                  </select>
                </div>
              )}

              {wizardStep === 6 && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Date of Submission</label>
                  <input
                    type="date"
                    required
                    value={wizardSubmissionDate}
                    onChange={(e) => setWizardSubmissionDate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleWizardSubmit();
                      }
                    }}
                    className="input-gold"
                    style={{ width: "100%" }}
                  />
                </div>
              )}
            </div>

            {/* Footer Navigation Buttons */}
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={() => {
                  if (wizardStep > 1) {
                    setWizardStep(prev => prev - 1);
                    setWizardErrorMsg(null);
                  } else {
                    setShowAddWizard(false);
                  }
                }}
                className="btn-glass"
                style={{ flex: 1 }}
                disabled={isPending}
              >
                {wizardStep > 1 ? "Back" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={async () => {
                  setWizardErrorMsg(null);
                  if (wizardStep === 1) {
                    if (!wizardPlatformId) {
                      setWizardErrorMsg("Platform selection is required.");
                      return;
                    }
                    setWizardStep(2);
                  } else if (wizardStep === 2) {
                    if (!wizardSerialCode.trim()) {
                      setWizardErrorMsg("ID Serial is required.");
                      return;
                    }
                    setWizardStep(3);
                  } else if (wizardStep === 3) {
                    if (!wizardFirstName.trim() || !wizardSecondName.trim()) {
                      setWizardErrorMsg("Both first and second names are required.");
                      return;
                    }
                    setWizardStep(4);
                  } else if (wizardStep === 4) {
                    if (wizardAdsPublished < 0) {
                      setWizardErrorMsg("Ads Published must be 0 or more.");
                      return;
                    }
                    setWizardStep(5);
                  } else if (wizardStep === 5) {
                    if (!wizardVerificationStatus) {
                      setWizardErrorMsg("Verification option is required.");
                      return;
                    }
                    setWizardStep(6);
                  } else if (wizardStep === 6) {
                    handleWizardSubmit();
                  }
                }}
                className="btn-gold"
                style={{ flex: 1 }}
                disabled={isPending}
              >
                {isPending ? (
                  "Processing..."
                ) : wizardStep === 6 ? (
                  "Submit"
                ) : (
                  "Next"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
