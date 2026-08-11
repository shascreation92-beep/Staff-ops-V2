"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  SlidersHorizontal,
  ChevronDown,
  X,
  MessageSquare
} from "lucide-react";
import NotificationBell from "./NotificationBell";

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
  itNotes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
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

interface Associate {
  id: string;
  name: string | null;
  email: string;
}

interface TeamLiveRosterListProps {
  initialAccounts: Account[];
  user: {
    id: string;
    role: string;
    name?: string | null;
    email?: string | null;
  };
  activeAssociates: Associate[];
}

export default function TeamLiveRosterList({ initialAccounts, user, activeAssociates }: TeamLiveRosterListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const [accountsList, setAccountsList] = useState<Account[]>(initialAccounts);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State for Read-Only IT Comment View
  const [selectedITCommentAccount, setSelectedITCommentAccount] = useState<Account | null>(null);
  const [showITCommentModal, setShowITCommentModal] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedAssociate, setSelectedAssociate] = useState("ALL");

  // Helper: Single-digit normalization
  const formatNumber = (num: number | string | null | undefined): string => {
    if (num === null || num === undefined) return "0";
    const n = typeof num === "string" ? parseInt(num, 10) : num;
    if (isNaN(n)) return num.toString();
    if (n < 0) return n.toString();
    return n.toString();
  };

  // Sync data with incoming server-side updates on refresh
  useEffect(() => {
    setAccountsList(initialAccounts);
  }, [initialAccounts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedPlatform, selectedStatus, selectedAssociate]);

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
      case "IT_PENDING":
        return "badge pending";
      case "REJECTED":
        return "badge suspended";
      default:
        return "badge developer";
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
        background: "rgba(20, 18, 38, 0.75)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.09)",
        position: "relative",
        zIndex: 50
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }} className="text-gold-gradient">
            TEAM LIVE ROSTER
          </h2>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {user.role === "SUPER_ADMIN" && "Global system-wide roster monitor covering all registered accounts."}
            {user.role === "COMPANY_OWNER" && "Company-wide roster monitor covering all registered accounts."}
            {user.role === "TEAM_LEAD" && "Real-time feed tracking all entries made by your assigned Sales Representatives."}
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
      <div className="glass-panel" style={{ padding: "1.25rem", background: "rgba(20, 18, 38, 0.75)", backdropFilter: "blur(16px)", border: "1px solid rgba(255, 255, 255, 0.09)" }}>
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
              <label className="form-label">Sales Representative</label>
              <div style={{ position: "relative" }}>
                <select
                  value={selectedAssociate}
                  onChange={(e) => setSelectedAssociate(e.target.value)}
                  className="input-gold"
                  style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem", appearance: "none", width: "100%" }}
                >
                  <option value="ALL">All Representatives</option>
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
                <th>IT Comments</th>
              </tr>
            </thead>
            <tbody>
              {totalRecords === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    No associate accounts matched the specified filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((acc) => {
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
                          const timePart = d.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" });
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{datePart}</span>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{timePart}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <span 
                          className={getStatusBadgeClass(acc.status)}
                          style={getStatusBadgeClass(acc.status) === "badge pending" ? {
                            background: "rgba(245, 158, 11, 0.08)",
                            border: "1px solid rgba(245, 158, 11, 0.25)",
                            color: "#D97706"
                          } : undefined}
                        >
                          {acc.status.replace("IT_", "").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td 
                        onClick={() => {
                          if (acc.itNotes) {
                            setSelectedITCommentAccount(acc);
                            setShowITCommentModal(true);
                          }
                        }}
                        style={{
                          cursor: acc.itNotes ? "pointer" : "default",
                          color: acc.itNotes ? "var(--gold-premium)" : "inherit",
                          fontWeight: acc.itNotes ? 600 : "normal",
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                        title={acc.itNotes ? "Click to view full IT comment" : "No IT comment left"}
                      >
                        {acc.itNotes ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                            <MessageSquare size={12} style={{ opacity: 0.8 }} />
                            {acc.itNotes.length > 25 ? `${acc.itNotes.slice(0, 25)}...` : acc.itNotes}
                          </span>
                        ) : (
                          <span style={{ opacity: 0.35 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
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

      {/* 4. Read-Only IT Comment Modal Popup */}
      {showITCommentModal && selectedITCommentAccount && (
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
            maxWidth: "500px",
            width: "100%",
            padding: "2rem",
            background: "rgba(20, 18, 38, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "var(--shadow-premium)",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem"
          }}>
            <div className="kpi-card-glow"></div>

            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.75rem" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--gold-premium)", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase" }}>
                  IT Department Remarks
                </span>
                <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>
                  {selectedITCommentAccount.serialCode} - {selectedITCommentAccount.idName}
                </h2>
              </div>
              <button 
                onClick={() => {
                  setShowITCommentModal(false);
                  setSelectedITCommentAccount(null);
                }} 
                style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Textarea */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <textarea
                readOnly
                rows={5}
                value={selectedITCommentAccount.itNotes || ""}
                className="input-gold"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  fontSize: "0.85rem",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-dim)",
                  resize: "none",
                  color: "var(--text-primary)",
                  cursor: "not-allowed"
                }}
              />
              {/* Timestamp Subtitle */}
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic", alignSelf: "flex-end" }}>
                Last Updated by IT: {(() => {
                  const d = new Date(selectedITCommentAccount.updatedAt || selectedITCommentAccount.createdAt);
                  return `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}, ${d.getFullYear()} ${d.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
                })()}
              </span>
            </div>

            {/* Close Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-dim)", paddingTop: "0.75rem" }}>
              <button
                onClick={() => {
                  setShowITCommentModal(false);
                  setSelectedITCommentAccount(null);
                }}
                className="btn-glass"
                style={{ padding: "0.45rem 1.25rem", fontSize: "0.85rem" }}
              >
                Close Remarks
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
