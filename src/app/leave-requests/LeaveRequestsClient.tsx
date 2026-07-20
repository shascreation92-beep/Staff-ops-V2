"use client";

import React, { useState, useTransition } from "react";
import { 
  Calendar, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  UserCheck, 
  Building2, 
  FileText, 
  Send, 
  RefreshCw,
  Phone,
  MessageSquare,
  ShieldCheck,
  Search,
  Filter
} from "lucide-react";
import { toast } from "react-hot-toast";
import { 
  createLeaveRequestAction, 
  updateLeaveRequestStatusAction, 
  reSubmitLeaveRequestAction,
  getLeaveRequestsAction 
} from "@/app/actions/leave-requests";

interface UserProp {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "SUPER_ADMIN" | "COMPANY_OWNER" | "TEAM_LEAD" | "SALES_ASSOCIATE" | "IT_DEPARTMENT";
  companyId?: string | null;
  teamLeadId?: string | null;
}

interface LeaveRequestItem {
  id: string;
  userId: string;
  companyId: string;
  teamLeadId?: string | null;
  leaveType: string;
  startDate: string | Date;
  endDate: string | Date;
  totalDays: number;
  reason: string;
  emergencyContact?: string | null;
  status: "PENDING_TL" | "PENDING_COMPANY" | "APPROVED" | "REJECTED" | string;
  tlNotes?: string | null;
  tlActionAt?: string | Date | null;
  companyNotes?: string | null;
  companyActionAt?: string | Date | null;
  createdAt: string | Date;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
    image?: string | null;
  };
}

interface LeaveRequestsClientProps {
  user: UserProp;
  initialData: {
    success: boolean;
    myLeaves?: LeaveRequestItem[];
    pendingApprovals?: LeaveRequestItem[];
    allHistory?: LeaveRequestItem[];
  };
}

export default function LeaveRequestsClient({ user, initialData }: LeaveRequestsClientProps) {
  const [isPending, startTransition] = useTransition();

  // Data States
  const [myLeaves, setMyLeaves] = useState<LeaveRequestItem[]>(initialData.myLeaves || []);
  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequestItem[]>(initialData.pendingApprovals || []);
  const [allHistory, setAllHistory] = useState<LeaveRequestItem[]>(initialData.allHistory || []);

  // UI Tabs
  const [activeTab, setActiveTab] = useState<"my-leaves" | "approvals" | "history">("my-leaves");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Apply Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveType, setLeaveType] = useState("CASUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  // Action Modal State (Approve / Reject)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestItem | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  // Resubmit Modal State
  const [resubmitTarget, setResubmitTarget] = useState<LeaveRequestItem | null>(null);

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper to reload data
  const refreshData = async () => {
    const res = await getLeaveRequestsAction();
    if (res.success) {
      setMyLeaves((res.myLeaves as any) || []);
      setPendingApprovals((res.pendingApprovals as any) || []);
      setAllHistory((res.allHistory as any) || []);
    }
  };

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Leave records updated!");
    }, 400);
  };

  // Calculate duration days dynamically
  const calculateDays = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 0;
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const calculatedDays = calculateDays(startDate, endDate);

  // Submit new leave application
  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates.");
      return;
    }
    if (calculatedDays <= 0) {
      toast.error("End date must be on or after start date.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason for your leave.");
      return;
    }

    startTransition(async () => {
      const res = await createLeaveRequestAction({
        leaveType,
        startDate,
        endDate,
        totalDays: calculatedDays,
        reason,
        emergencyContact,
      });

      if (res.success) {
        toast.success("Leave request submitted successfully!");
        setShowApplyModal(false);
        setReason("");
        setEmergencyContact("");
        setStartDate("");
        setEndDate("");
        await refreshData();
      } else {
        toast.error(res.error || "Failed to submit leave request.");
      }
    });
  };

  // Approve or Reject Action
  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType) return;

    startTransition(async () => {
      const res = await updateLeaveRequestStatusAction(selectedRequest.id, actionType, reviewNotes);
      if (res.success) {
        toast.success(`Leave request ${actionType === "APPROVE" ? "approved" : "rejected"} successfully!`);
        setSelectedRequest(null);
        setActionType(null);
        setReviewNotes("");
        await refreshData();
      } else {
        toast.error(res.error || "Action failed.");
      }
    });
  };

  // Re-submit rejected request
  const handleConfirmResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmitTarget) return;

    const days = calculateDays(startDate, endDate);
    if (days <= 0) {
      toast.error("Invalid dates for re-submission.");
      return;
    }

    startTransition(async () => {
      const res = await reSubmitLeaveRequestAction(resubmitTarget.id, {
        leaveType,
        startDate,
        endDate,
        totalDays: days,
        reason,
        emergencyContact,
      });

      if (res.success) {
        toast.success("Leave request re-submitted successfully!");
        setResubmitTarget(null);
        await refreshData();
      } else {
        toast.error(res.error || "Re-submission failed.");
      }
    });
  };

  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case "SICK":
        return <span style={{ padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700, background: "rgba(239, 68, 68, 0.1)", color: "#EF4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}>🤒 Sick Leave</span>;
      case "CASUAL":
        return <span style={{ padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700, background: "rgba(14, 165, 233, 0.1)", color: "#0EA5E9", border: "1px solid rgba(14, 165, 233, 0.2)" }}>🌴 Casual Leave</span>;
      case "EMERGENCY":
        return <span style={{ padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700, background: "rgba(245, 158, 11, 0.1)", color: "#F59E0B", border: "1px solid rgba(245, 158, 11, 0.2)" }}>🚨 Emergency</span>;
      case "FAMILY":
        return <span style={{ padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700, background: "rgba(168, 85, 247, 0.1)", color: "#A855F7", border: "1px solid rgba(168, 85, 247, 0.2)" }}>👨‍👩‍👧 Family Leave</span>;
      default:
        return <span style={{ padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700, background: "rgba(107, 114, 128, 0.1)", color: "#6B7280" }}>{type}</span>;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_TL":
        return (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.25rem 0.65rem", borderRadius: "20px", background: "rgba(245, 158, 11, 0.12)", color: "#D97706", fontSize: "0.75rem", fontWeight: 700, border: "1px solid rgba(245, 158, 11, 0.25)" }}>
            <Clock size={12} /> Awaiting TL Review
          </div>
        );
      case "PENDING_COMPANY":
        return (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.25rem 0.65rem", borderRadius: "20px", background: "rgba(2, 132, 199, 0.12)", color: "#0284C7", fontSize: "0.75rem", fontWeight: 700, border: "1px solid rgba(2, 132, 199, 0.25)" }}>
            <Building2 size={12} /> Awaiting Company Approval
          </div>
        );
      case "APPROVED":
        return (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.25rem 0.65rem", borderRadius: "20px", background: "rgba(34, 197, 94, 0.12)", color: "#16A34A", fontSize: "0.75rem", fontWeight: 700, border: "1px solid rgba(34, 197, 94, 0.25)" }}>
            <CheckCircle2 size={12} /> Approved
          </div>
        );
      case "REJECTED":
        return (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.25rem 0.65rem", borderRadius: "20px", background: "rgba(225, 29, 72, 0.12)", color: "#E11D48", fontSize: "0.75rem", fontWeight: 700, border: "1px solid rgba(225, 29, 72, 0.25)" }}>
            <XCircle size={12} /> Rejected
          </div>
        );
      default:
        return null;
    }
  };

  const renderProgressBar = (req: LeaveRequestItem) => {
    const isTlApproved = req.status === "PENDING_COMPANY" || req.status === "APPROVED";
    const isCompanyApproved = req.status === "APPROVED";
    const isRejected = req.status === "REJECTED";

    return (
      <div style={{ margin: "0.75rem 0", background: "var(--background-secondary, #f8fafc)", padding: "0.6rem 0.8rem", borderRadius: "10px", border: "1px solid var(--border-dim)" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.4rem", display: "flex", justifyContent: "space-between" }}>
          <span>Approval Workflow Timeline</span>
          {isRejected && <span style={{ color: "#E11D48", fontWeight: 700 }}>Decision: Rejected</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
          {/* Step 1: Submission */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#22C55E", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>1</div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)" }}>Submitted</span>
          </div>

          <div style={{ flex: 1, height: "2px", background: isTlApproved ? "#22C55E" : (isRejected ? "#E11D48" : "#CBD5E1"), margin: "0 0.5rem" }} />

          {/* Step 2: TL Approval */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: isTlApproved ? "#22C55E" : (isRejected && req.tlNotes ? "#E11D48" : "#94A3B8"), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>2</div>
            <span style={{ fontSize: "0.75rem", fontWeight: isTlApproved ? 700 : 500, color: isTlApproved ? "var(--text-primary)" : "var(--text-muted)" }}>TL Review</span>
          </div>

          <div style={{ flex: 1, height: "2px", background: isCompanyApproved ? "#22C55E" : (isRejected && req.companyNotes ? "#E11D48" : "#CBD5E1"), margin: "0 0.5rem" }} />

          {/* Step 3: Company Approval */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: isCompanyApproved ? "#22C55E" : (isRejected && req.companyNotes ? "#E11D48" : "#94A3B8"), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>3</div>
            <span style={{ fontSize: "0.75rem", fontWeight: isCompanyApproved ? 700 : 500, color: isCompanyApproved ? "var(--text-primary)" : "var(--text-muted)" }}>Company Approval</span>
          </div>
        </div>

        {/* Review Notes Preview */}
        {(req.tlNotes || req.companyNotes) && (
          <div style={{ marginTop: "0.5rem", paddingTop: "0.4rem", borderTop: "1px dashed var(--border-dim)", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            {req.tlNotes && <div><strong>TL Notes:</strong> {req.tlNotes}</div>}
            {req.companyNotes && <div><strong>Company Notes:</strong> {req.companyNotes}</div>}
          </div>
        )}
      </div>
    );
  };

  const isOwnerOrAdmin = ["COMPANY_OWNER", "SUPER_ADMIN"].includes(user.role);
  const isTeamLead = user.role === "TEAM_LEAD";

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header Card Container */}
      <div 
        style={{ 
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid rgba(0, 119, 182, 0.15)",
          padding: "1.5rem",
          boxShadow: "0 4px 20px rgba(0, 119, 182, 0.05)",
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "1.5rem", 
          flexWrap: "wrap", 
          gap: "1rem" 
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.6rem", margin: 0 }}>
            <Calendar style={{ color: "#0077B6" }} /> Leave Management & Approvals
          </h1>
          <p style={{ margin: "0.2rem 0 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Apply for leave, track multi-tiered approval workflows, and review team time-off applications.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.6rem 1rem",
              borderRadius: "10px",
              background: "rgba(173, 232, 244, 0.25)",
              border: "1px solid rgba(0, 119, 182, 0.2)",
              color: "var(--text-primary)",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: isRefreshing ? "not-allowed" : "pointer",
              opacity: isRefreshing ? 0.7 : 1,
              transition: "all 0.2s ease"
            }}
          >
            <RefreshCw size={14} style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }} /> 
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setReason("");
              setEmergencyContact("");
              setShowApplyModal(true);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.65rem 1.2rem",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #0077B6 0%, #0096C7 100%)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.9rem",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0, 119, 182, 0.25)",
            }}
          >
            <Plus size={16} /> Apply for Leave
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-dim)", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setActiveTab("my-leaves")}
          style={{
            padding: "0.75rem 1.2rem",
            fontWeight: 700,
            fontSize: "0.9rem",
            color: activeTab === "my-leaves" ? "#0077B6" : "var(--text-muted)",
            borderBottom: activeTab === "my-leaves" ? "3px solid #0077B6" : "3px solid transparent",
            background: "none",
            borderLeft: "none",
            borderRight: "none",
            borderTop: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <FileText size={16} /> My Leaves ({myLeaves.length})
        </button>

        {(isTeamLead || isOwnerOrAdmin) && (
          <button
            onClick={() => setActiveTab("approvals")}
            style={{
              padding: "0.75rem 1.2rem",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: activeTab === "approvals" ? "#0077B6" : "var(--text-muted)",
              borderBottom: activeTab === "approvals" ? "3px solid #0077B6" : "3px solid transparent",
              background: "none",
              borderLeft: "none",
              borderRight: "none",
              borderTop: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <ShieldCheck size={16} /> Pending Approvals
            {pendingApprovals.length > 0 && (
              <span style={{ background: "#EF4444", color: "#fff", borderRadius: "12px", padding: "0.15rem 0.5rem", fontSize: "0.75rem", fontWeight: 800 }}>
                {pendingApprovals.length}
              </span>
            )}
          </button>
        )}

        {isOwnerOrAdmin && (
          <button
            onClick={() => setActiveTab("history")}
            style={{
              padding: "0.75rem 1.2rem",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: activeTab === "history" ? "#0077B6" : "var(--text-muted)",
              borderBottom: activeTab === "history" ? "3px solid #0077B6" : "3px solid transparent",
              background: "none",
              borderLeft: "none",
              borderRight: "none",
              borderTop: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Building2 size={16} /> All Company History ({allHistory.length})
          </button>
        )}
      </div>

      {/* Content Area */}
      {activeTab === "my-leaves" && (
        <div>
          {myLeaves.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 2rem", background: "#ffffff", borderRadius: "16px", border: "1px solid rgba(0, 119, 182, 0.15)", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              <Calendar size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.4rem 0" }}>No Leave Applications Submitted Yet</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.2rem" }}>
                Need time off? Click the button below to submit a leave request to your manager.
              </p>
              <button
                onClick={() => setShowApplyModal(true)}
                style={{
                  padding: "0.6rem 1.2rem",
                  borderRadius: "10px",
                  background: "#0077B6",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                + Apply for Leave
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "1.25rem" }}>
              {myLeaves.map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    border: "1px solid rgba(0, 119, 182, 0.15)",
                    padding: "1.25rem",
                    boxShadow: "0 4px 20px rgba(0, 119, 182, 0.05)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      {getLeaveTypeBadge(req.leaveType)}
                      {renderStatusBadge(req.status)}
                    </div>

                    <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                      {new Date(req.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      {" → "}
                      {new Date(req.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>

                    <div style={{ fontSize: "0.8rem", color: "#0077B6", fontWeight: 700, marginBottom: "0.6rem" }}>
                      Duration: {req.totalDays} Day(s)
                    </div>

                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 0.5rem 0", lineHeight: 1.4 }}>
                      <strong>Reason:</strong> {req.reason}
                    </p>

                    {req.emergencyContact && (
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Phone size={12} /> Emergency: {req.emergencyContact}
                      </div>
                    )}

                    {renderProgressBar(req)}
                  </div>

                  {/* Resubmit button if rejected */}
                  {req.status === "REJECTED" && (
                    <button
                      onClick={() => {
                        setResubmitTarget(req);
                        setLeaveType(req.leaveType);
                        setStartDate(new Date(req.startDate).toISOString().split("T")[0]);
                        setEndDate(new Date(req.endDate).toISOString().split("T")[0]);
                        setReason(req.reason);
                        setEmergencyContact(req.emergencyContact || "");
                      }}
                      style={{
                        marginTop: "0.75rem",
                        width: "100%",
                        padding: "0.55rem",
                        borderRadius: "8px",
                        background: "rgba(225, 29, 72, 0.1)",
                        border: "1px solid rgba(225, 29, 72, 0.3)",
                        color: "#E11D48",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <RefreshCw size={14} /> Edit & Re-submit Leave Request
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approvals Tab */}
      {activeTab === "approvals" && (
        <div>
          {pendingApprovals.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 2rem", background: "#ffffff", borderRadius: "16px", border: "1px solid rgba(0, 119, 182, 0.15)", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)" }}>
              <CheckCircle2 size={48} style={{ color: "#22C55E", marginBottom: "1rem" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.4rem 0" }}>All Caught Up!</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
                There are no leave requests currently awaiting your approval.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {pendingApprovals.map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    border: "1px solid rgba(0, 119, 182, 0.15)",
                    padding: "1.25rem",
                    boxShadow: "0 4px 20px rgba(0, 119, 182, 0.05)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "280px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#0077B6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem" }}>
                        {req.user.name ? req.user.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-primary)" }}>{req.user.name || "Employee"}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{req.user.email} • Role: {req.user.role}</div>
                      </div>
                      <div style={{ marginLeft: "auto" }}>
                        {getLeaveTypeBadge(req.leaveType)}
                      </div>
                    </div>

                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", margin: "0.4rem 0" }}>
                      Dates: {new Date(req.startDate).toLocaleDateString("en-GB")} → {new Date(req.endDate).toLocaleDateString("en-GB")} ({req.totalDays} Days)
                    </div>

                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0.2rem 0" }}>
                      <strong>Reason:</strong> {req.reason}
                    </p>

                    {req.emergencyContact && (
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                        📞 Emergency Contact: {req.emergencyContact}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                    <button
                      onClick={() => {
                        setSelectedRequest(req);
                        setActionType("REJECT");
                        setReviewNotes("");
                      }}
                      style={{
                        padding: "0.6rem 1.1rem",
                        borderRadius: "10px",
                        background: "rgba(225, 29, 72, 0.1)",
                        border: "1px solid rgba(225, 29, 72, 0.3)",
                        color: "#E11D48",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      Reject
                    </button>

                    <button
                      onClick={() => {
                        setSelectedRequest(req);
                        setActionType("APPROVE");
                        setReviewNotes("");
                      }}
                      style={{
                        padding: "0.6rem 1.1rem",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
                        border: "none",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(34, 197, 94, 0.25)",
                      }}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && isOwnerOrAdmin && (
        <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid rgba(0, 119, 182, 0.15)", boxShadow: "0 4px 20px rgba(0, 119, 182, 0.05)", padding: "1.25rem", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-dim)", color: "var(--text-muted)" }}>
                <th style={{ padding: "0.75rem" }}>Applicant</th>
                <th style={{ padding: "0.75rem" }}>Leave Type</th>
                <th style={{ padding: "0.75rem" }}>Dates</th>
                <th style={{ padding: "0.75rem" }}>Days</th>
                <th style={{ padding: "0.75rem" }}>Reason</th>
                <th style={{ padding: "0.75rem" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {allHistory.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <td style={{ padding: "0.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {item.user.name || "Employee"} ({item.user.role})
                  </td>
                  <td style={{ padding: "0.75rem" }}>{getLeaveTypeBadge(item.leaveType)}</td>
                  <td style={{ padding: "0.75rem" }}>
                    {new Date(item.startDate).toLocaleDateString("en-GB")} - {new Date(item.endDate).toLocaleDateString("en-GB")}
                  </td>
                  <td style={{ padding: "0.75rem", fontWeight: 700 }}>{item.totalDays}</td>
                  <td style={{ padding: "0.75rem", color: "var(--text-secondary)" }}>{item.reason}</td>
                  <td style={{ padding: "0.75rem" }}>{renderStatusBadge(item.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Apply for Leave */}
      {showApplyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: "1rem" }}>
          <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid rgba(0, 119, 182, 0.15)", width: "100%", maxWidth: "540px", padding: "1.75rem", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.5rem 0" }}>Apply for Leave</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Fill out the form below. Your application will follow the company approval chain.
            </p>

            <form onSubmit={handleCreateLeave}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>Leave Category</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--border-dim)", background: "var(--bg-input, #fff)", color: "var(--text-primary)", fontSize: "0.88rem" }}
                >
                  <option value="CASUAL">🌴 Casual / Annual Leave</option>
                  <option value="SICK">🤒 Sick / Medical Leave</option>
                  <option value="EMERGENCY">🚨 Emergency Leave</option>
                  <option value="FAMILY">👨‍👩‍👧 Family / Special Leave</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border-dim)", background: "var(--bg-input, #fff)", color: "var(--text-primary)" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border-dim)", background: "var(--bg-input, #fff)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>

              {calculatedDays > 0 && (
                <div style={{ background: "rgba(0, 119, 182, 0.08)", padding: "0.6rem 0.8rem", borderRadius: "8px", border: "1px solid rgba(0, 119, 182, 0.2)", color: "#0077B6", fontSize: "0.85rem", fontWeight: 700, marginBottom: "1rem" }}>
                  ⏱ Duration: {calculatedDays} Day(s) Requested
                </div>
              )}

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>Reason for Leave</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you require leave..."
                  required
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--border-dim)", background: "var(--bg-input, #fff)", color: "var(--text-primary)", fontSize: "0.88rem", resize: "none" }}
                />
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>Emergency Contact (Optional)</label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Phone number or contact info during leave"
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border-dim)", background: "var(--bg-input, #fff)", color: "var(--text-primary)" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  style={{ padding: "0.6rem 1.2rem", borderRadius: "8px", background: "transparent", border: "1px solid var(--border-dim)", color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{ padding: "0.6rem 1.4rem", borderRadius: "8px", background: "#0077B6", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}
                >
                  {isPending ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Review Action (Approve / Reject) */}
      {selectedRequest && actionType && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: "1rem" }}>
          <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid rgba(0, 119, 182, 0.15)", width: "100%", maxWidth: "480px", padding: "1.5rem", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: actionType === "APPROVE" ? "#16A34A" : "#E11D48", margin: "0 0 0.5rem 0" }}>
              {actionType === "APPROVE" ? "Approve Leave Request" : "Reject Leave Request"}
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              You are taking action on {selectedRequest.user.name || "Employee"}&apos;s leave request ({selectedRequest.totalDays} days).
            </p>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>Reviewer Notes (Optional)</label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add feedback or notes regarding your decision..."
                style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--border-dim)", background: "var(--bg-input, #fff)", color: "var(--text-primary)", fontSize: "0.88rem", resize: "none" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                }}
                style={{ padding: "0.6rem 1.2rem", borderRadius: "8px", background: "transparent", border: "1px solid var(--border-dim)", color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmAction}
                disabled={isPending}
                style={{
                  padding: "0.6rem 1.4rem",
                  borderRadius: "8px",
                  background: actionType === "APPROVE" ? "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)" : "linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)",
                  color: "#fff",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {isPending ? "Processing..." : (actionType === "APPROVE" ? "Confirm Approval" : "Confirm Rejection")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Resubmit Request */}
      {resubmitTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: "1rem" }}>
          <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid rgba(0, 119, 182, 0.15)", width: "100%", maxWidth: "540px", padding: "1.75rem" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.5rem 0" }}>Edit & Re-submit Leave Request</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Update your details and re-submit your request to restart the approval process.
            </p>

            <form onSubmit={handleConfirmResubmit}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>Leave Category</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--border-dim)", background: "var(--bg-input, #fff)", color: "var(--text-primary)", fontSize: "0.88rem" }}
                >
                  <option value="CASUAL">🌴 Casual / Annual Leave</option>
                  <option value="SICK">🤒 Sick / Medical Leave</option>
                  <option value="EMERGENCY">🚨 Emergency Leave</option>
                  <option value="FAMILY">👨‍👩‍👧 Family / Special Leave</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border-dim)", background: "var(--bg-input, #fff)", color: "var(--text-primary)" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border-dim)", background: "var(--bg-input, #fff)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>Updated Reason</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--border-dim)", background: "var(--bg-input, #fff)", color: "var(--text-primary)", fontSize: "0.88rem", resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
                <button
                  type="button"
                  onClick={() => setResubmitTarget(null)}
                  style={{ padding: "0.6rem 1.2rem", borderRadius: "8px", background: "transparent", border: "1px solid var(--border-dim)", color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{ padding: "0.6rem 1.4rem", borderRadius: "8px", background: "#0077B6", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}
                >
                  {isPending ? "Re-submitting..." : "Re-submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
