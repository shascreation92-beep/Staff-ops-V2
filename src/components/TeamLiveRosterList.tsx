"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Eye, 
  MessageSquare, 
  Search, 
  Database, 
  ShieldCheck, 
  ShieldX, 
  Lock, 
  X, 
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";
import { toast } from "react-hot-toast";
import NotificationBell from "./NotificationBell";
import { updateAccountCommentAction } from "@/app/actions/accounts";

interface Account {
  id: string;
  platformId: string;
  serialCode: string;
  idName: string;
  adsPublished: number;
  verificationStatus: string;
  status: string;
  associateId: string | null;
  comment: string | null;
  createdAt: string | Date;
  createdById: string;
  platform?: {
    id: string;
    name: string;
  } | null;
  user_account_createdByIdTouser?: {
    name: string | null;
    email: string;
  } | null;
}

interface TeamLiveRosterListProps {
  initialAccounts: Account[];
  user: {
    id: string;
    role: string;
    name?: string | null;
    email?: string | null;
  };
}

export default function TeamLiveRosterList({ initialAccounts, user }: TeamLiveRosterListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const [accountsList, setAccountsList] = useState<Account[]>(initialAccounts);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedAssociate, setSelectedAssociate] = useState("ALL");

  // Modal State
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingComment, setEditingComment] = useState("");

  // Helper: Leading zero padding
  const formatNumber = (num: number | string | null | undefined): string => {
    if (num === null || num === undefined) return "00";
    const n = typeof num === "string" ? parseInt(num, 10) : num;
    if (isNaN(n)) return num.toString();
    if (n < 0) return n.toString();
    return n < 10 ? `0${n}` : n.toString();
  };

  // Sync data with incoming server-side updates on refresh
  useEffect(() => {
    setAccountsList(initialAccounts);
  }, [initialAccounts]);

  // Real-time synchronization polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsSyncing(true);
      startTransition(() => {
        router.refresh();
      });
      setTimeout(() => setIsSyncing(false), 800);
    }, 5000);
    return () => clearInterval(interval);
  }, [router]);

  // Handle saving comment if creator
  const handleSaveComment = async () => {
    if (!selectedAccount) return;
    startTransition(async () => {
      try {
        const res = await updateAccountCommentAction(selectedAccount.id, editingComment);
        if (res.success) {
          toast.success("Comment updated successfully!");
          
          // Update local state directly
          setAccountsList(prev => prev.map(acc => {
            if (acc.id === selectedAccount.id) {
              return { ...acc, comment: editingComment.trim() || null };
            }
            return acc;
          }));

          setSelectedAccount(prev => prev ? { ...prev, comment: editingComment.trim() || null } : null);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to save comment.");
      }
    });
  };

  // Dynamic values for filters
  const platformOptions = Array.from(
    new Set(accountsList.map(a => a.platform?.name).filter(Boolean))
  ) as string[];

  const statusOptions = Array.from(
    new Set(accountsList.map(a => a.status).filter(Boolean))
  ) as string[];

  const associateOptions = Array.from(
    new Set(accountsList.map(a => a.user_account_createdByIdTouser?.name).filter(Boolean))
  ) as string[];

  // Filtered Accounts list
  const filteredAccounts = accountsList.filter(acc => {
    const matchesSearch = 
      acc.serialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.idName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlatform = 
      selectedPlatform === "ALL" || 
      acc.platform?.name === selectedPlatform;

    const matchesStatus = 
      selectedStatus === "ALL" || 
      acc.status === selectedStatus;

    const matchesAssociate = 
      selectedAssociate === "ALL" || 
      acc.user_account_createdByIdTouser?.name === selectedAssociate;

    return matchesSearch && matchesPlatform && matchesStatus && matchesAssociate;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "COMPLETED":
      case "APPROVED_BY_TEAM_LEAD":
      case "SORTED":
        return "badge verified";
      case "PENDING_TL":
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return "badge pending";
      case "REJECTED":
        return "badge suspended";
      default:
        return "badge developer";
    }
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "COMPLETED":
      case "APPROVED_BY_TEAM_LEAD":
      case "SORTED":
        return "#10B981";
      case "PENDING_TL":
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return "#F59E0B";
      case "REJECTED":
        return "#EF4444";
      default:
        return "rgba(2, 80, 161, 0.4)";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* 1. Header Banner & Live Status */}
      <div className="glass-panel" style={{
        padding: "1.5rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1.5rem",
        background: "#FFFFFF",
        border: "1px solid var(--border-dim)"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }} className="text-gold-gradient">
            TEAM LIVE ROSTER
          </h2>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {user.role === "SUPER_ADMIN" && "Global system-wide roster monitor covering all registered accounts."}
            {user.role === "COMPANY_OWNER" && "Company-wide roster monitor covering all registered accounts."}
            {user.role === "TEAM_LEAD" && "Real-time feed tracking all entries made by your assigned Sales Associates."}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {/* Pulsing Sync Dot */}
          <div 
            className="animate-pulse"
            style={{
              width: "7px",
              height: "7px",
              background: "#10B981",
              borderRadius: "50%",
              boxShadow: "0 0 8px #10B981",
              cursor: "help"
            }}
            title={isSyncing ? "Syncing live..." : "Connected Live"}
          ></div>

          {/* Notification Bell */}
          <NotificationBell />
        </div>
      </div>

      {/* 2. Filters & Toolbar */}
      <div className="glass-panel" style={{ padding: "1.25rem", background: "#FFFFFF", border: "1px solid var(--border-dim)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.5rem" }}>
            <SlidersHorizontal size={14} style={{ color: "var(--gold-premium)" }} />
            <span style={{ fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
              Filter & Search Parameters
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            {/* Search Input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <Search size={12} /> Search ID
              </label>
              <input
                type="text"
                placeholder="Search serial or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-gold"
                style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem" }}
              />
            </div>

            {/* Platform Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Platform</label>
              <div style={{ position: "relative" }}>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="input-gold"
                  style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem", appearance: "none", width: "100%" }}
                >
                  <option value="ALL">All Platforms</option>
                  {platformOptions.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
              </div>
            </div>

            {/* Status Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Status</label>
              <div style={{ position: "relative" }}>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="input-gold"
                  style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem", appearance: "none", width: "100%" }}
                >
                  <option value="ALL">All Statuses</option>
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
              </div>
            </div>

            {/* Associate Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Sales Associate</label>
              <div style={{ position: "relative" }}>
                <select
                  value={selectedAssociate}
                  onChange={(e) => setSelectedAssociate(e.target.value)}
                  className="input-gold"
                  style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem", appearance: "none", width: "100%" }}
                >
                  <option value="ALL">All Associates</option>
                  {associateOptions.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Data Roster Table */}
      <div className="glass-panel table-panel">
        <div className="table-container-outer">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Associate Name</th>
                <th>Platform</th>
                <th>ID Serial</th>
                <th>ID Name</th>
                <th>Ads Pub.</th>
                <th>Time of Entry</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    No associate accounts matched the specified filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const creatorName = acc.user_account_createdByIdTouser?.name || "N/A";
                  
                  return (
                    <tr key={acc.id}>
                      <td style={{ fontWeight: 600 }}>{creatorName}</td>
                      <td>
                        <span className="badge developer" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                          {acc.platform?.name}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 500 }}>
                        {acc.serialCode}
                      </td>
                      <td style={{ fontWeight: 600 }}>{acc.idName}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        {formatNumber(acc.adsPublished)} ads
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: "1.2" }}>
                        {(() => {
                          const d = new Date(acc.createdAt);
                          const datePart = `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}, ${d.getFullYear()}`;
                          const timePart = d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{datePart}</span>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{timePart}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(acc.status)}>
                          {acc.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                          <button
                            onClick={() => {
                              setSelectedAccount(acc);
                              setEditingComment(acc.comment || "");
                              setShowModal(true);
                            }}
                            className="btn-glass"
                            style={{
                              padding: "0.3rem 0.5rem",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(2, 80, 161, 0.05)",
                              border: "1px solid rgba(2, 80, 161, 0.15)"
                            }}
                            title="Quick View Details"
                          >
                            <Eye size={14} style={{ color: "var(--gold-premium)" }} />
                          </button>
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

      {/* 4. Details & Comments Modal Popup */}
      {showModal && selectedAccount && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(6px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem"
        }}>
          <div className="glass-panel kpi-card" style={{
            maxWidth: "550px",
            width: "100%",
            padding: "2rem",
            background: "#FFFFFF",
            border: `1px solid var(--border-dim)`,
            borderLeft: `5px solid ${getStatusBorderColor(selectedAccount.status)}`,
            boxShadow: "var(--shadow-premium)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            position: "relative"
          }}>
            <div className="kpi-card-glow"></div>

            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.75rem" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--gold-premium)", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase" }}>
                  Roster Account Details
                </span>
                <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>
                  {selectedAccount.serialCode}
                </h2>
              </div>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setSelectedAccount(null);
                }} 
                style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Details Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem 1.5rem", fontSize: "0.85rem" }}>
              <div>
                <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Associate Name</span>
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{selectedAccount.user_account_createdByIdTouser?.name || "N/A"}</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Platform</span>
                <span style={{ fontWeight: 600 }}>{selectedAccount.platform?.name}</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>ID Name</span>
                <span style={{ fontWeight: 600 }}>{selectedAccount.idName}</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Ads Published</span>
                <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{formatNumber(selectedAccount.adsPublished)} ads</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Time of Entry</span>
                <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                  {(() => {
                    const d = new Date(selectedAccount.createdAt);
                    return `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}, ${d.getFullYear()} ${d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
                  })()}
                </span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Workflow Status</span>
                <span className={getStatusBadgeClass(selectedAccount.status)} style={{ display: "inline-block", marginTop: "0.15rem" }}>
                  {selectedAccount.status}
                </span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Verified Status</span>
                <span className={selectedAccount.verificationStatus === "Yes" ? "badge verified" : "badge suspended"} style={{ display: "inline-block", marginTop: "0.15rem" }}>
                  {selectedAccount.verificationStatus === "Yes" ? "VERIFIED" : "UNVERIFIED"}
                </span>
              </div>
            </div>

            {/* Integrated Comments Area */}
            <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: "1rem", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
                <MessageSquare size={14} style={{ color: "var(--gold-premium)" }} />
                <span style={{ fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
                  Account Comments
                </span>
                
                {/* Edit permission check: only the account creator can edit */}
                {selectedAccount.createdById !== user.id && (
                  <span 
                    style={{ 
                      marginLeft: "auto", 
                      fontSize: "0.7rem", 
                      color: "var(--text-muted)", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "0.25rem",
                      background: "var(--bg-primary)",
                      padding: "0.1rem 0.4rem",
                      borderRadius: "4px"
                    }}
                    title="Comments can only be modified by the original author."
                  >
                    <Lock size={10} /> Read-only
                  </span>
                )}
              </div>

              {selectedAccount.createdById === user.id ? (
                // Editable view for author
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  <textarea
                    rows={3}
                    placeholder="Enter submission comments or notes..."
                    value={editingComment}
                    onChange={(e) => setEditingComment(e.target.value)}
                    className="input-gold"
                    style={{ width: "100%", padding: "0.6rem", fontSize: "0.85rem", resize: "none" }}
                    disabled={isPending}
                  />
                  <button
                    onClick={handleSaveComment}
                    disabled={isPending}
                    className="btn-gold"
                    style={{ alignSelf: "flex-end", padding: "0.4rem 1rem", fontSize: "0.8rem" }}
                  >
                    {isPending ? "Saving..." : "Save Comment"}
                  </button>
                </div>
              ) : (
                // Read-only view for reviewers (Team Lead, Owner, Super Admin)
                <div style={{
                  padding: "0.75rem 1rem",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  color: "var(--text-primary)",
                  minHeight: "60px",
                  fontStyle: selectedAccount.comment ? "normal" : "italic",
                  whiteSpace: "pre-wrap"
                }}>
                  {selectedAccount.comment || "No comments submitted by the Associate."}
                </div>
              )}
            </div>

            {/* Modal Close Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-dim)", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedAccount(null);
                }}
                className="btn-glass"
                style={{ padding: "0.45rem 1.25rem", fontSize: "0.85rem" }}
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
