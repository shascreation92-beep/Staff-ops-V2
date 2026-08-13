"use client";

import React, { useState, useEffect } from "react";
import { Search, Mail, Shield, User, CircleDot, Database, MessageSquare, Lock, Copy, Check, X } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useSearchParams } from "next/navigation";
import { updateAccount2FACodeAction } from "@/app/actions/accounts";
import { toast } from "react-hot-toast";

interface Account {
  id: string;
  serialCode: string;
  idName: string;
  adsPublished: number;
  status: string;
  issueType?: string | null;
  createdAt: Date | string;
  comment?: string | null;
  platform: {
    id: string;
    name: string;
  };
  user_account_createdByIdTouser: {
    name: string | null;
    email: string;
    role: string;
    user?: {
      name: string | null;
    } | null;
  };
}

interface Platform {
  id: string;
  name: string;
}

interface MasterAccountsListProps {
  initialAccounts: Account[];
  platforms: Platform[];
  currentUserRole: string;
}

export default function MasterAccountsList({ initialAccounts, platforms, currentUserRole }: MasterAccountsListProps) {
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // 2FA Comments Modal States
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [twoFactorInput, setTwoFactorInput] = useState("");
  const [isSaving2FA, setIsSaving2FA] = useState(false);
  const [copiedState, setCopiedState] = useState(false);

  const [accountsList, setAccountsList] = useState<Account[]>(initialAccounts);

  useEffect(() => {
    setAccountsList(initialAccounts);
  }, [initialAccounts]);

  useEffect(() => {
    const searchVal = searchParams.get("search");
    const platformVal = searchParams.get("platform");
    const statusVal = searchParams.get("status");

    if (searchVal !== null) setSearchTerm(searchVal);
    if (platformVal !== null) setSelectedPlatform(platformVal);
    if (statusVal !== null) setSelectedStatus(statusVal);
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedPlatform, selectedStatus]);

  const filteredAccounts = accountsList.filter((acc) => {
    // Search filter
    const term = searchTerm.toLowerCase();
    const serialMatch = acc.serialCode.toLowerCase().includes(term);
    const idNameMatch = acc.idName.toLowerCase().includes(term);
    const addedByMatch = (acc.user_account_createdByIdTouser.name || "").toLowerCase().includes(term);
    const issueMatch = (acc.issueType || "").toLowerCase().includes(term);
    const searchMatch = serialMatch || idNameMatch || addedByMatch || issueMatch;

    // Platform filter
    const platformMatch = selectedPlatform === "ALL" || acc.platform.id === selectedPlatform;

    // Status filter
    const statusMatch = selectedStatus === "ALL" || acc.status === selectedStatus;

    return searchMatch && platformMatch && statusMatch;
  });

  const ITEMS_PER_PAGE = 50;
  const totalRecords = filteredAccounts.length;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRecords);
  const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex);

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

  const getStatusBadge = (status: string) => {
    const cleanStatus = status.replace(/^IT_/, "").replace(/_/g, " ");
    const isPending = ["PENDING", "PENDING_TL", "PENDING TL"].includes(cleanStatus.toUpperCase());
    
    if (isPending) {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          fontSize: "0.72rem",
          fontWeight: 700,
          background: "rgba(245, 158, 11, 0.08)",
          color: "#D97706",
          padding: "0.2rem 0.6rem",
          borderRadius: "4px",
          border: "1px solid rgba(245, 158, 11, 0.2)"
        }}>
          {cleanStatus}
        </span>
      );
    }
    
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: "0.72rem",
        fontWeight: 700,
        background: "rgba(2, 80, 161, 0.05)",
        color: "#0250A1",
        padding: "0.2rem 0.6rem",
        borderRadius: "4px",
        border: "1px solid rgba(2, 80, 161, 0.15)"
      }}>
        {cleanStatus}
      </span>
    );
  };

  const formatDate = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month}, ${year}`;
  };

  const formatTime = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    const hrs = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    const secs = d.getSeconds().toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const handleSave2FA = async () => {
    if (!editingAccount) return;
    setIsSaving2FA(true);
    try {
      const res = await updateAccount2FACodeAction(editingAccount.id, twoFactorInput);
      if (res.success) {
        setAccountsList(prev => 
          prev.map(acc => 
            acc.id === editingAccount.id 
              ? { ...acc, comment: twoFactorInput } 
              : acc
          )
        );
        setShow2FAModal(false);
        setEditingAccount(null);
        toast.success("2FA credentials saved successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update 2FA code.");
    } finally {
      setIsSaving2FA(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Merged Header & Filters card */}
      <div className="glass-panel" style={{
        padding: "1rem 1.5rem",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: "1.5rem",
        background: "rgba(20, 18, 38, 0.75)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.09)",
        position: "relative",
        zIndex: 40
      }}>
        {/* Left Filters Group */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "1rem", flex: 1, minWidth: "280px" }}>
          {/* Search */}
          <div style={{ flex: "1 1 250px", display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255, 255, 255, 0.04)", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
            <Search size={16} style={{ color: "#94A3B8" }} />
            <input
              type="text"
              placeholder="Search serial, name, or creator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontSize: "0.82rem",
                background: "transparent",
                color: "#FFFFFF"
              }}
            />
          </div>

          {/* Platform Dropdown */}
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="select-gold"
            style={{
              flex: "0 1 180px",
              height: "36px",
              background: "rgba(20, 18, 38, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "6px",
              padding: "0 0.5rem",
              fontSize: "0.82rem",
              color: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
              position: "relative",
              zIndex: 40
            }}
          >
            <option value="ALL">All Platforms</option>
            {platforms.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="select-gold"
            style={{
              flex: "0 1 180px",
              height: "36px",
              background: "rgba(20, 18, 38, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "6px",
              padding: "0 0.5rem",
              fontSize: "0.82rem",
              color: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
              position: "relative",
              zIndex: 40
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED_BY_TEAM_LEAD">Approved by TL</option>
            <option value="FORWARDED_TO_IT">Forwarded to IT</option>
            <option value="ACTIVE">Active</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Right Notification Group */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginLeft: "auto", position: "relative", zIndex: 50 }}>
          <NotificationBell />
        </div>
      </div>

      {/* Unified Accounts Sheet Table */}
      <div className="glass-panel" style={{ padding: "0", background: "rgba(20, 18, 38, 0.75)", backdropFilter: "blur(16px)", overflowX: "auto", border: "1px solid rgba(255, 255, 255, 0.09)" }}>
        {filteredAccounts.length === 0 ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            No accounts found matching the current search filters.
          </div>
        ) : (
          <table className="compact-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
            <thead>
              <tr style={{ background: "#0250A1" }}>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)", textAlign: "center" }}>ADDED BY</th>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)", textAlign: "center" }}>TEAM LEAD</th>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)", textAlign: "center" }}>PLATFORM</th>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)", textAlign: "center" }}>ID SERIAL</th>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)", textAlign: "center" }}>ID NAME</th>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)", textAlign: "center" }}>ADS PUB.</th>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)", textAlign: "center" }}>TIME OF ENTRY</th>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)", textAlign: "center" }}>2FA</th>
                <th style={{ color: "#FFFFFF", padding: "0.5rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1.5px solid var(--border-gold)", textAlign: "center" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAccounts.map((acc) => {
                const creatorName = acc.user_account_createdByIdTouser.name || acc.user_account_createdByIdTouser.email;
                const managerName = acc.user_account_createdByIdTouser.role === "TEAM_LEAD" 
                  ? "Self" 
                  : (acc.user_account_createdByIdTouser.user?.name || "-");

                return (
                  <tr key={acc.id} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    <td style={{ padding: "0.5rem 0.6rem", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", textAlign: "center" }}>{creatorName}</td>
                    <td style={{ padding: "0.5rem 0.6rem", fontSize: "0.82rem", color: "var(--text-secondary)", textAlign: "center" }}>{managerName}</td>
                    <td style={{ padding: "0.5rem 0.6rem", fontSize: "0.82rem", color: "var(--text-secondary)", textAlign: "center" }}>{acc.platform.name}</td>
                    <td style={{ padding: "0.5rem 0.6rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>{acc.serialCode}</td>
                    <td style={{ padding: "0.5rem 0.6rem", fontSize: "0.82rem", color: "var(--text-secondary)", textAlign: "center" }}>{acc.idName}</td>
                    <td style={{ padding: "0.5rem 0.6rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>{acc.adsPublished.toString()}</td>
                    <td style={{ padding: "0.5rem 0.6rem", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", flexDirection: "column", gap: "0.05rem", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-primary)" }}>{formatDate(acc.createdAt)}</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{formatTime(acc.createdAt)}</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", textAlign: "center" }}>
                      {currentUserRole === "IT_DEPARTMENT" || currentUserRole === "SUPER_ADMIN" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAccount(acc);
                            setTwoFactorInput(acc.comment || "");
                            setCopiedState(false);
                            setShow2FAModal(true);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: acc.comment ? "var(--gold-premium)" : "var(--text-muted)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0.25rem",
                            borderRadius: "4px",
                            transition: "all 0.2s"
                          }}
                          title={acc.comment ? "View / Edit 2FA Credentials" : "Add 2FA Credentials"}
                        >
                          <MessageSquare size={16} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toast.error("Access restricted: 2FA codes are only visible to the IT Department.")}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-muted)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0.25rem",
                            opacity: 0.6
                          }}
                          title="2FA Locked - IT Department Only"
                        >
                          <Lock size={14} />
                        </button>
                      )}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", textAlign: "center" }}>{getStatusBadge(acc.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Premium Minimalist Pagination Control Bar */}
        {totalRecords > 0 && (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 1.5rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.09)",
            background: "rgba(20, 18, 38, 0.75)",
            backdropFilter: "blur(16px)",
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

      {/* Secure 2FA comments Modal */}
      {show2FAModal && editingAccount && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(11, 9, 22, 0.75)",
          backdropFilter: "blur(10px)",
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
            background: "linear-gradient(180deg, #1A1733 0%, #100E24 100%)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>2FA Credentials</h3>
                <span style={{ fontSize: "0.68rem", color: "var(--gold-premium)", fontWeight: 700 }}>
                  ID Serial: {editingAccount.serialCode}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => { setShow2FAModal(false); setEditingAccount(null); }} 
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 700 }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  2FA Codes / Comments
                </label>
                {twoFactorInput && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(twoFactorInput);
                      setCopiedState(true);
                      setTimeout(() => setCopiedState(false), 2000);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.65rem",
                      color: copiedState ? "#10B981" : "var(--gold-primary)",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.2rem"
                    }}
                  >
                    {copiedState ? <Check size={11} /> : <Copy size={11} />}
                    {copiedState ? "Copied!" : "Copy Code"}
                  </button>
                )}
              </div>
              <textarea
                rows={5}
                value={twoFactorInput}
                onChange={(e) => setTwoFactorInput(e.target.value)}
                placeholder="Paste the 2FA secret key, backup codes, or authenticator configuration..."
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-dim)",
                  fontSize: "0.82rem",
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                  background: "#F9FAFB",
                  lineHeight: "1.4"
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="btn-glass"
                onClick={() => { setShow2FAModal(false); setEditingAccount(null); }}
                style={{ padding: "0.5rem 1rem", fontSize: "0.78rem" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-gold"
                onClick={handleSave2FA}
                disabled={isSaving2FA}
                style={{ padding: "0.5rem 1.25rem", fontSize: "0.78rem" }}
              >
                {isSaving2FA ? "Saving..." : "Save Codes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
