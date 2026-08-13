"use client";

import React, { useTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  updateAccountStatusAction, 
  bulkUpdateAccountStatusAction,
  updateAccountDetailsByTLAction,
  getPlatformsAction 
} from "@/app/actions/accounts";
import { 
  Check, 
  X, 
  ShieldAlert, 
  MessageSquare, 
  Edit3, 
  CheckSquare, 
  Square, 
  Save, 
  Sparkles,
  Layers,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { toast } from "react-hot-toast";
import ConfirmationModal from "./ConfirmationModal";
import NotificationBell from "./NotificationBell";

interface AssociatesRequestsListProps {
  requests: any[];
}

export default function AssociatesRequestsList({ requests }: AssociatesRequestsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // TL Account Edit Modal State
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [editForm, setEditForm] = useState({
    platformId: "",
    serialCode: "",
    idName: "",
    adsPublished: 0,
    verificationStatus: "No" as "Yes" | "No",
    comment: ""
  });

  useEffect(() => {
    // Fetch platforms for TL Edit modal
    getPlatformsAction()
      .then((res) => setPlatforms(res || []))
      .catch((err) => console.warn("Failed to load platforms:", err));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [sortOrder, requests]);

  const handleOpenCommentModal = (text: string) => {
    setCommentText(text);
    setShowCommentModal(true);
  };

  // Toggle Single Selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select All visible paginated items
  const handleSelectAllCurrentPage = (currentBatch: any[]) => {
    const batchIds = currentBatch.map((r) => r.id);
    const allSelected = batchIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !batchIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...batchIds])));
    }
  };

  // Single Action
  const handleAction = (accountId: string, status: "FORWARDED_TO_IT" | "REJECTED", actionName: string) => {
    const confirmMessage = `Are you sure you want to ${actionName.toLowerCase()} this request?`;
    setConfirmConfig({
      isOpen: true,
      title: `${actionName} Request`,
      message: confirmMessage,
      onConfirm: () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        startTransition(async () => {
          try {
            const notes = `${actionName} by Team Lead`;
            const res = await updateAccountStatusAction(accountId, status, notes);
            if (res.success) {
              toast.success(`Request ${actionName.toLowerCase()}ed successfully!`);
              setSelectedIds((prev) => prev.filter((id) => id !== accountId));
              router.refresh();
            }
          } catch (err: any) {
            toast.error(err.message || `Failed to ${actionName.toLowerCase()} request.`);
          }
        });
      }
    });
  };

  // Bulk Action Execution
  const handleBulkAction = (status: "FORWARDED_TO_IT" | "REJECTED", actionLabel: string) => {
    if (selectedIds.length === 0) return;

    const count = selectedIds.length;
    const confirmMessage = `Are you sure you want to ${actionLabel.toLowerCase()} all ${count} selected requests in batch?`;

    setConfirmConfig({
      isOpen: true,
      title: `Bulk ${actionLabel} (${count} Items)`,
      message: confirmMessage,
      onConfirm: () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        startTransition(async () => {
          try {
            const res = await bulkUpdateAccountStatusAction(selectedIds, status);
            if (res.success) {
              toast.success(`Batch Processed: ${res.count} of ${count} requests ${actionLabel.toLowerCase()}ed successfully!`);
              setSelectedIds([]);
              router.refresh();
            } else {
              toast.error(res.error || "Failed to process bulk operation.");
            }
          } catch (err: any) {
            toast.error(err.message || "Failed to execute bulk action.");
          }
        });
      }
    });
  };

  // Open Edit Modal
  const handleOpenEditModal = (req: any) => {
    setEditingAccount(req);
    setEditForm({
      platformId: req.platformId || "",
      serialCode: req.serialCode || "",
      idName: req.idName || "",
      adsPublished: req.adsPublished || 0,
      verificationStatus: (req.verificationStatus === "Yes" ? "Yes" : "No") as "Yes" | "No",
      comment: req.comment || ""
    });
  };

  // Submit Edit Form
  const handleSaveAccountEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    startTransition(async () => {
      try {
        const res = await updateAccountDetailsByTLAction({
          accountId: editingAccount.id,
          platformId: editForm.platformId,
          serialCode: editForm.serialCode,
          idName: editForm.idName,
          adsPublished: editForm.adsPublished,
          verificationStatus: editForm.verificationStatus,
          comment: editForm.comment
        });

        if (res.success) {
          toast.success("Account details updated successfully by Team Lead!");
          setEditingAccount(null);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to save account changes.");
        }
      } catch (err: any) {
        toast.error(err.message || "Error updating account details.");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", position: "relative", zIndex: 100, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", borderRadius: "16px", background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)", border: "1px solid rgba(255, 255, 255, 0.08)", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)" }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }} className="text-gold-gradient">
            REPRESENTATIVES ACCOUNT REQUESTS
          </h2>
          <p style={{ fontSize: "0.82rem", color: "#94A3B8", marginTop: "0.2rem" }}>
            Review, edit, and bulk approve or reject incoming account requests forwarded by your Sales Representatives.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <NotificationBell />
        </div>
      </div>

      {/* Floating Bulk Action Bar when items selected */}
      {selectedIds.length > 0 && (
        <div style={{
          padding: "0.85rem 1.5rem",
          background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)",
          borderRadius: "12px",
          border: "1.5px solid #8B5CF6",
          boxShadow: "0 10px 25px rgba(139, 92, 246, 0.25)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          color: "#FFFFFF"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{
              background: "#8B5CF6",
              color: "#FFFFFF",
              fontSize: "0.8rem",
              fontWeight: 800,
              padding: "0.25rem 0.65rem",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem"
            }}>
              <Layers size={14} />
              <span>{selectedIds.length} Requests Selected</span>
            </span>
            <span style={{ fontSize: "0.82rem", color: "#94A3B8" }}>
              Perform bulk action for all checked associate requests
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <button
              onClick={() => handleBulkAction("FORWARDED_TO_IT", "Approve")}
              className="btn-success"
              style={{
                padding: "0.45rem 1rem",
                fontSize: "0.8rem",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
              }}
              disabled={isPending}
            >
              <CheckCircle2 size={15} />
              <span>Bulk Approve ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => handleBulkAction("REJECTED", "Reject")}
              className="btn-danger"
              style={{
                padding: "0.45rem 1rem",
                fontSize: "0.8rem",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)"
              }}
              disabled={isPending}
            >
              <XCircle size={15} />
              <span>Bulk Reject ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#94A3B8",
                padding: "0.45rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.78rem",
                cursor: "pointer",
                fontWeight: 700
              }}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Requests Table */}
      <div className="glass-panel" style={{ padding: "0", background: "linear-gradient(135deg, #141226 0%, #0E0C1B 100%)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)", overflow: "hidden" }}>
        <div className="table-container-outer" style={{ width: "100%" }}>
          <table className="premium-table">
            <thead>
              {(() => {
                const sortedRequests = [...requests].sort((a, b) => {
                  const dateA = new Date(a.createdAt).getTime();
                  const dateB = new Date(b.createdAt).getTime();
                  return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
                });

                const ITEMS_PER_PAGE = 50;
                const totalRecords = sortedRequests.length;
                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRecords);
                const paginatedBatch = sortedRequests.slice(startIndex, endIndex);

                const isAllBatchSelected =
                  paginatedBatch.length > 0 &&
                  paginatedBatch.every((r) => selectedIds.includes(r.id));

                return (
                  <tr style={{ background: "linear-gradient(90deg, #141226 0%, #1E1B3A 100%)", borderBottom: "1px solid rgba(255, 255, 255, 0.12)" }}>
                    <th style={{ width: "40px", textAlign: "center", color: "#FFFFFF" }}>
                      <input
                        type="checkbox"
                        checked={isAllBatchSelected}
                        onChange={() => handleSelectAllCurrentPage(paginatedBatch)}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        title="Select All Current Page Requests"
                      />
                    </th>
                    <th style={{ textAlign: "center", color: "#FFFFFF", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.04em" }}>Associate Name</th>
                    <th style={{ textAlign: "center", color: "#FFFFFF", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.04em" }}>Platform</th>
                    <th style={{ textAlign: "center", color: "#FFFFFF", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.04em" }}>Serial Code</th>
                    <th style={{ textAlign: "center", color: "#FFFFFF", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.04em" }}>ID Name</th>
                    <th style={{ textAlign: "center", color: "#FFFFFF", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.04em" }}>Ads Published</th>
                    <th style={{ textAlign: "center", color: "#FFFFFF", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.04em" }}>Verification</th>
                    <th onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")} style={{ textAlign: "center", color: "#FFFFFF", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.04em", cursor: "pointer", userSelect: "none" }}>
                      Submitted Date {sortOrder === "desc" ? "↓" : "↑"}
                    </th>
                    <th style={{ textAlign: "center", color: "#FFFFFF", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.04em" }}>Comments</th>
                    <th style={{ textAlign: "center", color: "#FFFFFF", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.04em" }}>Actions</th>
                  </tr>
                );
              })()}
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                      <ShieldAlert size={36} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                      <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>No incoming requests pending.</span>
                      <span style={{ fontSize: "0.8rem" }}>When your associates submit requests, they will show up here.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                (() => {
                  const sortedRequests = [...requests].sort((a, b) => {
                    const dateA = new Date(a.createdAt).getTime();
                    const dateB = new Date(b.createdAt).getTime();
                    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
                  });

                  const ITEMS_PER_PAGE = 50;
                  const totalRecords = sortedRequests.length;
                  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRecords);
                  const paginatedRequests = sortedRequests.slice(startIndex, endIndex);

                  return (
                    <>
                      {paginatedRequests.map((req) => {
                        const associateName = req.user_account_createdByIdTouser?.name || "Unknown Associate";
                        const d = new Date(req.createdAt);
                        const datePart = `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}, ${d.getFullYear()}`;
                        const timePart = d.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" });

                        // Check if edited by TL (updatedById !== createdById)
                        const isEditedByTL = req.updatedById && req.updatedById !== req.createdById;
                        const editorName = req.user_account_updatedByIdTouser?.name || "Team Lead";
                        const updatedTimeStr = req.updatedAt ? `${new Date(req.updatedAt).toLocaleDateString()} ${new Date(req.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "";

                        const isSelected = selectedIds.includes(req.id);

                        return (
                          <tr 
                            key={req.id}
                            style={{
                              background: isSelected ? "rgba(139, 92, 246, 0.15)" : "rgba(20, 18, 38, 0.4)",
                              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                              transition: "background 0.2s ease"
                            }}
                          >
                            {/* Checkbox Column */}
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(req.id)}
                                style={{ cursor: "pointer", width: "16px", height: "16px" }}
                              />
                            </td>

                            {/* Associate Name with Glowing Updated Dot Indicator */}
                            <td style={{ textAlign: "center", fontWeight: 700, color: "#FFFFFF" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                                {isEditedByTL && (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      width: "9px",
                                      height: "9px",
                                      borderRadius: "50%",
                                      background: "#38BDF8",
                                      boxShadow: "0 0 8px #38BDF8, 0 0 14px rgba(56, 189, 248, 0.9)",
                                      flexShrink: 0,
                                      cursor: "help"
                                    }}
                                    title={`Updated by Team Lead (${editorName}) at ${updatedTimeStr}`}
                                  />
                                )}
                                <span>{associateName}</span>
                              </div>
                            </td>

                            <td style={{ textAlign: "center" }}>
                              <span style={{ fontSize: "0.72rem", fontWeight: 800, padding: "0.2rem 0.55rem", borderRadius: "6px", background: "rgba(56, 189, 248, 0.12)", color: "#38BDF8", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                                {req.platform?.name?.toUpperCase() || "N/A"}
                              </span>
                            </td>
                            <td style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "#E2E8F0" }}>
                              {req.serialCode}
                            </td>
                            <td style={{ textAlign: "center" }}>
                               <span style={{ fontWeight: 600, color: "#FFFFFF" }}>{req.idName}</span>
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: "#FFFFFF" }}>{req.adsPublished.toString()}</td>
                            <td style={{ textAlign: "center" }}>
                              <span
                                style={{ 
                                  fontSize: "0.7rem", 
                                  fontWeight: 800, 
                                  padding: "0.2rem 0.6rem", 
                                  borderRadius: "20px",
                                  background: req.verificationStatus === "Yes" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                  color: req.verificationStatus === "Yes" ? "#10B981" : "#EF4444",
                                  border: req.verificationStatus === "Yes" ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)"
                                }}
                              >
                                {req.verificationStatus === "Yes" ? "VERIFIED" : "UNVERIFIED"}
                              </span>
                            </td>
                             <td style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.78rem", lineHeight: "1.2" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", alignItems: "center" }}>
                                  <span style={{ fontWeight: 700, color: "#E2E8F0" }}>{datePart}</span>
                                  <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>{timePart}</span>
                                </div>
                             </td>
                             <td style={{ textAlign: "center" }}>
                                <button
                                  onClick={() => handleOpenCommentModal(req.comment || "")}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: "0.25rem",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    margin: "0 auto",
                                    transition: "transform 0.2s ease"
                                  }}
                                  title={req.comment ? `Comment: "${req.comment}"` : "No comment"}
                                >
                                  {req.comment ? (
                                    <MessageSquare 
                                      size={18} 
                                      style={{ 
                                        fill: "#10B981", 
                                        color: "#10B981",
                                        filter: "drop-shadow(0 0 2px rgba(16, 185, 129, 0.3))" 
                                      }} 
                                    />
                                  ) : (
                                    <MessageSquare 
                                      size={18} 
                                      style={{ 
                                        color: "#64748B", 
                                        opacity: 0.5 
                                      }} 
                                    />
                                  )}
                                </button>
                             </td>

                            {/* Actions Column: Edit Details + Approve + Reject */}
                            <td style={{ textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", alignItems: "center" }}>
                                {/* Edit Details Button */}
                                <button
                                  onClick={() => handleOpenEditModal(req)}
                                  style={{
                                    padding: "0.3rem 0.6rem",
                                    fontSize: "0.75rem",
                                    height: "auto",
                                    background: "rgba(255, 255, 255, 0.08)",
                                    color: "#FFFFFF",
                                    border: "1px solid rgba(255, 255, 255, 0.12)",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem"
                                  }}
                                  title="Edit account details as Team Lead"
                                  disabled={isPending}
                                >
                                  <Edit3 size={12} style={{ color: "#38BDF8" }} />
                                  <span>Edit</span>
                                </button>

                                {/* Approve Button */}
                                <button
                                  onClick={() => handleAction(req.id, "FORWARDED_TO_IT", "Approve")}
                                  className="btn-success"
                                  style={{
                                    padding: "0.3rem 0.65rem",
                                    fontSize: "0.75rem",
                                    height: "auto",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                  }}
                                  disabled={isPending}
                                >
                                  <Check size={12} />
                                  <span>Approve</span>
                                </button>

                                {/* Reject Button */}
                                <button
                                  onClick={() => handleAction(req.id, "REJECTED", "Reject")}
                                  className="btn-danger"
                                  style={{
                                    padding: "0.3rem 0.65rem",
                                    fontSize: "0.75rem",
                                    height: "auto",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                  }}
                                  disabled={isPending}
                                >
                                  <X size={12} />
                                  <span>Reject</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })()
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {(() => {
          const sortedRequests = [...requests];
          const ITEMS_PER_PAGE = 50;
          const totalRecords = sortedRequests.length;
          const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1;
          const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
          const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRecords);

          if (totalRecords === 0) return null;

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

          return (
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
              <span style={{ fontSize: "0.78rem", color: "#94A3B8", fontWeight: 500 }}>
                Showing {totalRecords === 0 ? 0 : startIndex + 1}-{endIndex} of {totalRecords} entries
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "6px",
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: currentPage === 1 ? "#64748B" : "#FFFFFF",
                    cursor: currentPage === 1 ? "default" : "pointer",
                    opacity: currentPage === 1 ? 0.5 : 1,
                    transition: "all 0.2s ease"
                  }}
                >
                  Previous
                </button>

                {getPageNumbers().map((pageNum, idx) => {
                  if (pageNum === '...') {
                    return (
                      <span key={`dots-${idx}`} style={{ padding: "0 0.5rem", color: "#94A3B8", fontSize: "0.78rem" }}>
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
                        background: isSelected ? "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)" : "rgba(255, 255, 255, 0.04)",
                        border: isSelected ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "6px",
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: isSelected ? "#FFFFFF" : "#94A3B8",
                        boxShadow: isSelected ? "0 0 10px rgba(56, 189, 248, 0.2)" : "none",
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
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "6px",
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: currentPage === totalPages ? "#64748B" : "#FFFFFF",
                    cursor: currentPage === totalPages ? "default" : "pointer",
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    transition: "all 0.2s ease"
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        isPending={isPending}
      />

      {/* View Comments Modal */}
      {showCommentModal && (
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
          <div className="glass-panel kpi-card" style={{
            maxWidth: "450px",
            width: "100%",
            padding: "2rem",
            background: "linear-gradient(180deg, #1A1733 0%, #100E24 100%)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "20px",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            position: "relative"
          }}>
            <div className="kpi-card-glow"></div>
            
            <div className="kpi-header" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "0.75rem" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.75rem", color: "#38BDF8", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  ACCOUNT COMMENTS
                </span>
                <h2 className="text-gold-gradient" style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
                  View Comments
                </h2>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Submission Notes / Comments</label>
              <div style={{
                padding: "1rem",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                fontSize: "0.9rem",
                color: "#FFFFFF",
                minHeight: "80px",
                fontStyle: commentText ? "normal" : "italic",
                whiteSpace: "pre-wrap"
              }}>
                {commentText || "No comments cataloged for this request."}
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                type="button"
                onClick={() => setShowCommentModal(false)}
                className="btn-glass"
                style={{ flex: 1 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TL Edit Account Details Modal */}
      {editingAccount && (
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
          <div className="glass-panel kpi-card" style={{
            maxWidth: "520px",
            width: "100%",
            padding: "2rem",
            background: "linear-gradient(180deg, #1A1733 0%, #100E24 100%)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "20px",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            position: "relative",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <div className="kpi-header" style={{ borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#0EA5E9", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                  TEAM LEAD EDIT MODE
                </span>
                <h2 className="text-gold-gradient" style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>
                  Edit Account Request Details
                </h2>
              </div>
              <button
                onClick={() => setEditingAccount(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAccountEdit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Platform Selector */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Platform</label>
                <select
                  value={editForm.platformId}
                  onChange={(e) => setEditForm({ ...editForm, platformId: e.target.value })}
                  className="input-gold"
                  style={{ width: "100%", padding: "0.6rem 0.75rem" }}
                  required
                >
                  <option value="">Select Platform</option>
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Serial Code */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Serial Code</label>
                <input
                  type="text"
                  value={editForm.serialCode}
                  onChange={(e) => setEditForm({ ...editForm, serialCode: e.target.value })}
                  className="input-gold"
                  style={{ width: "100%", padding: "0.6rem 0.75rem", fontFamily: "var(--font-mono)" }}
                  required
                />
              </div>

              {/* ID Name */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>ID Name</label>
                <input
                  type="text"
                  value={editForm.idName}
                  onChange={(e) => setEditForm({ ...editForm, idName: e.target.value })}
                  className="input-gold"
                  style={{ width: "100%", padding: "0.6rem 0.75rem" }}
                  required
                />
              </div>

              {/* Ads Published & Verification Status Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Ads Published</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.adsPublished}
                    onChange={(e) => setEditForm({ ...editForm, adsPublished: parseInt(e.target.value) || 0 })}
                    className="input-gold"
                    style={{ width: "100%", padding: "0.6rem 0.75rem" }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Verification</label>
                  <select
                    value={editForm.verificationStatus}
                    onChange={(e) => setEditForm({ ...editForm, verificationStatus: e.target.value as "Yes" | "No" })}
                    className="input-gold"
                    style={{ width: "100%", padding: "0.6rem 0.75rem" }}
                  >
                    <option value="Yes">Verified (Yes)</option>
                    <option value="No">Unverified (No)</option>
                  </select>
                </div>
              </div>

              {/* Comments / Notes */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Submission Notes / Comments</label>
                <textarea
                  rows={3}
                  value={editForm.comment}
                  onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                  className="input-gold"
                  style={{ width: "100%", padding: "0.6rem 0.75rem", fontSize: "0.85rem" }}
                  placeholder="Enter comments or revision notes..."
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="btn-glass"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold"
                  style={{ flex: 1.5, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
                  disabled={isPending}
                >
                  <Save size={16} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
