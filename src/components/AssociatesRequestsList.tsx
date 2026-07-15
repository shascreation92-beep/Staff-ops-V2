"use client";

import React, { useTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateAccountStatusAction } from "@/app/actions/accounts";
import { Check, X, ShieldAlert, AlertCircle, Database, Calendar, MessageSquare } from "lucide-react";
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

  const handleOpenCommentModal = (text: string) => {
    setCommentText(text);
    setShowCommentModal(true);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortOrder, requests]);

  const handleAction = (accountId: string, status: "FORWARDED_TO_IT" | "REJECTED", actionName: string) => {
    const confirmMessage = `Are you sure you want to ${actionName.toLowerCase()} this request?`;
    setConfirmConfig({
      isOpen: true,
      title: `${actionName} Request`,
      message: confirmMessage,
      onConfirm: () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        startTransition(async () => {
          try {
            const notes = `${actionName} by Team Lead`;
            const res = await updateAccountStatusAction(accountId, status, notes);
            if (res.success) {
              alert(`Request ${actionName.toLowerCase()}ed successfully!`);
              toast.success(`Request ${actionName.toLowerCase()}ed successfully!`);
              router.refresh();
            }
          } catch (err: any) {
            alert("Error executing action: " + (err.message || "Unknown error"));
            toast.error(err.message || `Failed to ${actionName.toLowerCase()} request.`);
          }
        });
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="glass-panel" style={{ padding: "1.5rem", position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }} className="text-gold-gradient">
            ASSOCIATES ACCOUNT REQUESTS
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Review and approve or reject incoming account/ID requests forwarded by your Sales Associates.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <NotificationBell />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "0", background: "#FFFFFF", border: "1px solid var(--border-dim)", overflow: "hidden" }}>
        <div className="table-container-outer" style={{ width: "100%" }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Associate Name</th>
                <th>Platform</th>
                <th>Serial Code</th>
                <th>ID Name</th>
                <th>Ads Published</th>
                <th>Verification</th>
                <th onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Submitted Date {sortOrder === "desc" ? "↓" : "↑"}
                </th>
                <th>Comments</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
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
                  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1;
                  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRecords);
                  const paginatedRequests = sortedRequests.slice(startIndex, endIndex);

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
                    <>
                      {paginatedRequests.map((req) => {
                        const associateName = req.user_account_createdByIdTouser?.name || "Unknown Associate";
                        const d = new Date(req.createdAt);
                        const datePart = `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}, ${d.getFullYear()}`;
                        const timePart = d.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" });

                        return (
                          <tr key={req.id}>
                            <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                              {associateName}
                            </td>
                            <td>
                              <span className="badge developer" style={{ fontSize: "0.75rem" }}>
                                {req.platform?.name || "N/A"}
                              </span>
                            </td>
                            <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                              {req.serialCode}
                            </td>
                            <td>
                               <span style={{ fontWeight: 600 }}>{req.idName}</span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{req.adsPublished.toString()}</td>
                            <td>
                              <span
                                className={`badge ${req.verificationStatus === "Yes" ? "verified" : "danger"}`}
                                style={{ fontSize: "0.7rem" }}
                              >
                                {req.verificationStatus === "Yes" ? "Verified" : "Unverified"}
                              </span>
                            </td>
                             <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: "1.2" }}>
                               <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                                 <span style={{ fontWeight: 600 }}>{datePart}</span>
                                 <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{timePart}</span>
                               </div>
                             </td>
                             <td>
                               <button
                                 onClick={() => handleOpenCommentModal(req.comment || "")}
                                 style={{
                                   background: "none",
                                   border: "none",
                                   cursor: "pointer",
                                   padding: "0.25rem",
                                   display: "flex",
                                   alignItems: "center",
                                   justifyContent: "center",
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
                                       color: "var(--text-muted)", 
                                       opacity: 0.5 
                                     }} 
                                   />
                                 )}
                               </button>
                             </td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                <button
                                  onClick={() => handleAction(req.id, "FORWARDED_TO_IT", "Approve")}
                                  className="btn-success"
                                  style={{
                                    padding: "0.3rem 0.75rem",
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
                                <button
                                  onClick={() => handleAction(req.id, "REJECTED", "Reject")}
                                  className="btn-danger"
                                  style={{
                                    padding: "0.3rem 0.75rem",
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

        {/* Premium Minimalist Pagination Control Bar */}
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
              borderTop: "1px solid var(--border-dim)",
              background: "#FFFFFF",
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

      {showCommentModal && (
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
            maxWidth: "450px",
            width: "100%",
            padding: "2rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            boxShadow: "var(--shadow-premium)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            position: "relative"
          }}>
            <div className="kpi-card-glow"></div>
            
            <div className="kpi-header" style={{ borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.75rem" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--gold-premium)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
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
                background: "var(--bg-primary)",
                border: "1px solid var(--border-dim)",
                borderRadius: "8px",
                fontSize: "0.9rem",
                color: "var(--text-primary)",
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
    </div>
  );
}
