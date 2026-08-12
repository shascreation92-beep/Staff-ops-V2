"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Mail, Award, Plus, X, AlertCircle, Users, Search, Eye, EyeOff } from "lucide-react";
import { onboardTeamLeadAction, toggleUserStatusAction, adminResetUserPasswordAction } from "@/app/actions/users";
import { toast } from "react-hot-toast";
import NotificationBell from "./NotificationBell";
import ConfirmationModal from "./ConfirmationModal";

import { issueRemoteITCommandAction, resolveTamperLogAction, createLaptopAssetAction, deleteLaptopAssetAction } from "@/app/actions/it-features";
import { Laptop, Terminal, ShieldAlert, Cpu, HardDrive, RefreshCw, Trash2, CheckCircle2, Download, ExternalLink } from "lucide-react";

interface ITMember {
  id: string;
  name: string | null;
  email: string;
  status: string;
  password?: string | null;
  createdAt: Date | string;
  employee?: {
    employeeId: string;
    laptopPassword?: string | null;
  } | null;
}

interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  employee?: {
    employeeId: string;
  } | null;
}

interface LaptopAssetItem {
  id: string;
  assetTag: string;
  serialNumber: string;
  brand: string;
  model?: string | null;
  specsCpu?: string | null;
  specsRam?: string | null;
  specsStorage?: string | null;
  windowsVersion?: string | null;
  assigneeUserId?: string | null;
  companyId?: string | null;
  laptopPassword?: string | null;
  vpnCredentials?: string | null;
  conditionStatus: string;
  repairNotes?: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
    employee?: {
      employeeId: string;
    } | null;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
}

interface TamperLogItem {
  id: string;
  userId: string;
  reason: string;
  details?: string | null;
  severity: string;
  isResolved: boolean;
  createdAt: Date | string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    employee?: {
      employeeId: string;
    } | null;
  } | null;
}

interface ITManagementDirectoryProps {
  itPersonnel: ITMember[];
  allStaff?: StaffMember[];
  laptopAssets?: LaptopAssetItem[];
  tamperLogs?: TamperLogItem[];
  companies: { id: string; name: string }[];
  currentUserRole: string;
  currentUserCompanyId: string | null;
}

export default function ITManagementDirectory({ 
  itPersonnel, 
  allStaff = [], 
  laptopAssets = [], 
  tamperLogs = [], 
  companies, 
  currentUserRole, 
  currentUserCompanyId 
}: ITManagementDirectoryProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active Tab: PERSONNEL | SECURITY_ALERTS | LAPTOP_ASSETS | REMOTE_COMMANDS
  const [activeTab, setActiveTab] = useState<"PERSONNEL" | "SECURITY_ALERTS" | "LAPTOP_ASSETS" | "REMOTE_COMMANDS">("PERSONNEL");

  // Laptop Asset State
  const [showAddLaptopModal, setShowAddLaptopModal] = useState(false);
  const [assetTag, setAssetTag] = useState("LAP-");
  const [serialNumber, setSerialNumber] = useState("");
  const [brand, setBrand] = useState("Dell");
  const [model, setModel] = useState("Latitude 5420");
  const [specsCpu, setSpecsCpu] = useState("Intel Core i5-1145G7");
  const [specsRam, setSpecsRam] = useState("16GB DDR4");
  const [specsStorage, setSpecsStorage] = useState("512GB NVMe SSD");
  const [windowsVersion, setWindowsVersion] = useState("Windows 11 Pro (23H2)");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [laptopPassword, setLaptopPassword] = useState("");
  const [vpnCredentials, setVpnCredentials] = useState("");
  const [conditionStatus, setConditionStatus] = useState<"EXCELLENT" | "GOOD" | "REPAIR_REQUIRED" | "ARCHIVED">("EXCELLENT");
  const [repairNotes, setRepairNotes] = useState("");

  // Remote Command Selection State
  const [selectedCommandTargetUser, setSelectedCommandTargetUser] = useState("");

  // Search query
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Onboard Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [onboardFullName, setOnboardFullName] = useState("");
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardEmployeeId, setOnboardEmployeeId] = useState("IT-");
  const [onboardPassword, setOnboardPassword] = useState("");
  const [onboardCompanyId, setOnboardCompanyId] = useState(currentUserCompanyId || companies[0]?.id || "");
  const [onboardRole, setOnboardRole] = useState<"TEAM_LEAD" | "SALES_ASSOCIATE" | "IT_DEPARTMENT">("IT_DEPARTMENT");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit / Reset Password State
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [resetPassUserId, setResetPassUserId] = useState("");
  const [resetPassUserName, setResetPassUserName] = useState("");
  const [resetPassNewPassword, setResetPassNewPassword] = useState("");
  const [resetPassError, setResetPassError] = useState<string | null>(null);

  // Confirmation Modal State
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

  // Show/Hide password toggles state
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAddLaptopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await createLaptopAssetAction({
          assetTag,
          serialNumber,
          brand,
          model,
          specsCpu,
          specsRam,
          specsStorage,
          windowsVersion,
          assigneeUserId: assigneeUserId || undefined,
          laptopPassword,
          vpnCredentials,
          conditionStatus,
          repairNotes
        });

        if (res.success) {
          toast.success("Laptop asset registered successfully!");
          setShowAddLaptopModal(false);
          setAssetTag("LAP-");
          setSerialNumber("");
          setRepairNotes("");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to create laptop asset.");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to save laptop asset.");
      }
    });
  };

  const handleIssueCommand = (targetUserId: string, commandType: "RESTART_AGENT" | "CLEAR_CACHE" | "FLUSH_DNS" | "FORCE_SYNC") => {
    startTransition(async () => {
      try {
        const res = await issueRemoteITCommandAction({ targetUserId, commandType });
        if (res.success) {
          toast.success(res.message || "Remote IT command sent successfully!");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to issue command.");
        }
      } catch (err: any) {
        toast.error(err.message || "Command error.");
      }
    });
  };

  const handleResolveAlert = (logId: string) => {
    startTransition(async () => {
      await resolveTamperLogAction(logId);
      toast.success("Security violation alert resolved!");
      router.refresh();
    });
  };

  const handleExportLaptopCSV = () => {
    if (laptopAssets.length === 0) {
      toast.error("No laptop assets available to export.");
      return;
    }
    const headers = "Asset Tag,Serial Number,Brand,Model,CPU,RAM,Storage,Windows,Assignee,Condition,Password\n";
    const rows = laptopAssets.map(a => 
      `"${a.assetTag}","${a.serialNumber}","${a.brand}","${a.model || ''}","${a.specsCpu || ''}","${a.specsRam || ''}","${a.specsStorage || ''}","${a.windowsVersion || ''}","${a.user?.name || a.user?.email || 'Unassigned'}","${a.conditionStatus}","${a.laptopPassword || ''}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `StaffOps_Laptop_Assets_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const res = await onboardTeamLeadAction({
          fullName: onboardFullName,
          email: onboardEmail,
          employeeId: onboardEmployeeId.trim(),
          password: onboardPassword.trim(),
          companyId: onboardCompanyId,
          role: onboardRole
        });

        if (res.success) {
          toast.success(`${onboardRole.replace("_", " ")} onboarded successfully!`);
          setShowAddModal(false);
          setOnboardFullName("");
          setOnboardEmail("");
          setOnboardEmployeeId("IT-");
          setOnboardPassword("");
          setOnboardRole("IT_DEPARTMENT");
          router.refresh();
        } else {
          setErrorMsg(res.error || "Failed to onboard user.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to onboard user.");
      }
    });
  };

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "APPROVED" ? "BLOCKED" : "APPROVED";
    const agentName = itPersonnel.find(x => x.id === userId)?.name || "IT Agent";
    
    setConfirmConfig({
      isOpen: true,
      title: newStatus === "APPROVED" ? "Enable IT Agent Account" : "Disable IT Agent Account",
      message: `Are you sure you want to change ${agentName}'s status to ${newStatus === "APPROVED" ? "ACTIVE" : "DISABLED"}?`,
      onConfirm: () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        startTransition(async () => {
          try {
            const res = await toggleUserStatusAction(userId, newStatus);
            if (res.success) {
              toast.success(`${agentName} has been ${newStatus === "APPROVED" ? "enabled" : "disabled"} successfully.`);
              router.refresh();
            }
          } catch (err: any) {
            toast.error(err.message || "Failed to update user status.");
          }
        });
      }
    });
  };

  const handleResetPassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetPassError(null);
    if (!resetPassNewPassword.trim()) {
      setResetPassError("Password cannot be empty.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await adminResetUserPasswordAction({
          userId: resetPassUserId,
          newPassword: resetPassNewPassword.trim()
        });
        if (res.success) {
          toast.success("Password reset successfully!");
          setShowResetPassModal(false);
          setResetPassUserId("");
          setResetPassUserName("");
          setResetPassNewPassword("");
          router.refresh();
        }
      } catch (err: any) {
        setResetPassError(err.message || "Failed to reset password.");
      }
    });
  };

  // Filter IT Personnel
  const filteredPersonnel = itPersonnel.filter(it => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (it.name || "").toLowerCase().includes(q) ||
      (it.email || "").toLowerCase().includes(q) ||
      (it.employee?.employeeId || "").toLowerCase().includes(q)
    );
  });

  // Pagination calculations
  const ITEMS_PER_PAGE = 50;
  const totalRecords = filteredPersonnel.length;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRecords);
  const paginatedPersonnel = filteredPersonnel.slice(startIndex, endIndex);

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

  const totalITCount = filteredPersonnel.length;
  const activeITCount = filteredPersonnel.filter(u => u.status === "APPROVED").length;
  const disabledITCount = filteredPersonnel.filter(u => u.status === "BLOCKED" || u.status === "REJECTED").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Title Card (Two-Row Header Config: Row 1) */}
      <div className="glass-panel mx-6 mt-6 mb-5" style={{
        padding: "1rem 1.5rem",
        background: "#FFFFFF",
        border: "1px solid var(--border-dim)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: 40
      }}>
        <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, lineHeight: "1.2" }}>IT MANAGEMENT & WORKSTATION CONTROL CENTER</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, marginTop: "0.25rem" }}>
          Manage IT personnel, laptop hardware assets, remote workstation commands, and system anti-tamper alerts.
        </p>

        {/* Navigation Tabs Bar */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", borderBottom: "1px solid #E5E7EB", paddingBottom: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveTab("PERSONNEL")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              fontSize: "0.82rem",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: activeTab === "PERSONNEL" ? "#3B82F6" : "#F3F4F6",
              color: activeTab === "PERSONNEL" ? "#FFFFFF" : "#4B5563"
            }}
          >
            <Users size={15} /> 👥 IT Directory ({itPersonnel.length})
          </button>

          <button
            onClick={() => setActiveTab("SECURITY_ALERTS")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              fontSize: "0.82rem",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: activeTab === "SECURITY_ALERTS" ? "#EF4444" : (tamperLogs.some(t => !t.isResolved) ? "rgba(239, 68, 68, 0.15)" : "#F3F4F6"),
              color: activeTab === "SECURITY_ALERTS" ? "#FFFFFF" : (tamperLogs.some(t => !t.isResolved) ? "#DC2626" : "#4B5563")
            }}
          >
            <ShieldAlert size={15} /> 🛡️ Security Alerts {tamperLogs.some(t => !t.isResolved) && `(${tamperLogs.filter(t => !t.isResolved).length})`}
          </button>

          <button
            onClick={() => setActiveTab("LAPTOP_ASSETS")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              fontSize: "0.82rem",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: activeTab === "LAPTOP_ASSETS" ? "#10B981" : "#F3F4F6",
              color: activeTab === "LAPTOP_ASSETS" ? "#FFFFFF" : "#4B5563"
            }}
          >
            <Laptop size={15} /> 📋 Laptop Inventory ({laptopAssets.length})
          </button>

          <button
            onClick={() => setActiveTab("REMOTE_COMMANDS")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              fontSize: "0.82rem",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: activeTab === "REMOTE_COMMANDS" ? "#8B5CF6" : "#F3F4F6",
              color: activeTab === "REMOTE_COMMANDS" ? "#FFFFFF" : "#4B5563"
            }}
          >
            <Terminal size={15} /> 💻 Remote Maintenance Hub
          </button>
        </div>
      </div>

      {/* Search & Analytics Card (Two-Row Header Config: Row 2) */}
      <div className="glass-panel mx-6 mb-5" style={{
        padding: "1.5rem",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: "1.5rem",
        background: "#FFFFFF",
        border: "1px solid var(--border-dim)",
        position: "relative",
        zIndex: 40
      }}>
        {/* Left Side: Search and Onboard button */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          {/* Search Input Field */}
          <div style={{
            position: "relative",
            width: "280px",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "#F9FAFB",
            padding: "0.5rem 0.75rem",
            height: "36px",
            borderRadius: "6px",
            border: "1px solid var(--border-dim)"
          }}>
            <Search size={16} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search IT by name, email or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontSize: "0.82rem",
                background: "transparent",
                color: "var(--text-primary)"
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: "1.2rem",
                  display: "flex",
                  alignItems: "center",
                  lineHeight: 1,
                  padding: 0
                }}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* ADD USER (Onboard button) */}
          <button
            onClick={() => {
              setShowAddModal(true);
              setOnboardFullName("");
              setOnboardEmail("");
              setOnboardEmployeeId("IT-");
              setOnboardPassword("");
              setOnboardCompanyId(currentUserCompanyId || companies[0]?.id || "");
              setOnboardRole("IT_DEPARTMENT");
              setErrorMsg(null);
            }}
            className="btn-gold"
            style={{
              padding: "0.6rem 1.2rem",
              fontSize: "0.8rem",
              height: "36px",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              borderRadius: "6px"
            }}
          >
            <Plus size={16} />
            <span>ADD USER</span>
          </button>
        </div>

        {/* Right Side: Notification Icon & Metrics */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <NotificationBell />

          {/* Metrics Counter Pills */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <div style={{
              height: "36px",
              background: "#FFFFFF",
              border: "1px solid var(--border-dim)",
              borderRadius: "6px",
              padding: "0 0.75rem",
              fontSize: "0.82rem",
              color: "var(--text-primary)",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
            }}>
              TOTAL IT: {totalITCount.toString()}
            </div>
            <div style={{
              height: "36px",
              background: "#FFFFFF",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: "6px",
              padding: "0 0.75rem",
              fontSize: "0.82rem",
              color: "#10B981",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
            }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" style={{ display: "inline-block" }} />
              ACTIVE: {activeITCount.toString()}
            </div>
            <div style={{
              height: "36px",
              background: "#FFFFFF",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "6px",
              padding: "0 0.75rem",
              fontSize: "0.82rem",
              color: "#EF4444",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
            }}>
              DISABLED: {disabledITCount.toString()}
            </div>
          </div>
        </div>
      </div>

      {/* Tab 2: Security Anti-Tamper Alerts View */}
      {activeTab === "SECURITY_ALERTS" && (
        <div className="glass-panel" style={{ padding: "1.5rem", background: "#FFFFFF", borderRadius: "8px", border: "1px solid var(--border-dim)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#EF4444", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldAlert size={20} /> 🛡️ SYSTEM ANTI-TAMPER & VIOLATION LOGS
            </h3>
            <span style={{ fontSize: "0.8rem", color: "#6B7280" }}>Total Security Events: {tamperLogs.length}</span>
          </div>

          {tamperLogs.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6B7280" }}>
              <CheckCircle2 size={48} style={{ color: "#10B981", margin: "0 auto 1rem" }} />
              <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>No Security Anti-Tamper Violations Detected</h4>
              <p style={{ fontSize: "0.82rem" }}>All remote workstations are running securely with active agent heartbeats.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem" }}>Timestamp</th>
                    <th style={{ padding: "0.75rem" }}>Associate / Workstation</th>
                    <th style={{ padding: "0.75rem" }}>Violation Reason</th>
                    <th style={{ padding: "0.75rem" }}>Details</th>
                    <th style={{ padding: "0.75rem" }}>Severity</th>
                    <th style={{ padding: "0.75rem" }}>Status</th>
                    <th style={{ padding: "0.75rem" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tamperLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid #F3F4F6", background: log.isResolved ? "#FFFFFF" : "rgba(239, 68, 68, 0.04)" }}>
                      <td style={{ padding: "0.75rem", whiteSpace: "nowrap", color: "#4B5563" }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: "0.75rem", fontWeight: 700, color: "#111827" }}>
                        {log.user?.name || log.user?.email || "Unknown Workstation"}
                        {log.user?.employee?.employeeId && (
                          <span style={{ fontSize: "0.7rem", color: "#6B7280", marginLeft: "0.4rem" }}>({log.user.employee.employeeId})</span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem", color: "#EF4444", fontWeight: 700 }}>
                        {log.reason}
                      </td>
                      <td style={{ padding: "0.75rem", color: "#4B5563", maxWidth: "250px" }}>
                        {log.details || "N/A"}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <span style={{
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          background: log.severity === "CRITICAL" ? "#FEE2E2" : "#FEF3C7",
                          color: log.severity === "CRITICAL" ? "#DC2626" : "#D97706"
                        }}>
                          {log.severity}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        {log.isResolved ? (
                          <span style={{ color: "#10B981", fontWeight: 700 }}>✓ Resolved</span>
                        ) : (
                          <span style={{ color: "#DC2626", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.2rem" }}>
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
                            UNRESOLVED
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        {!log.isResolved && (
                          <button
                            onClick={() => handleResolveAlert(log.id)}
                            style={{
                              padding: "0.3rem 0.65rem",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              background: "#10B981",
                              color: "#FFFFFF",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer"
                            }}
                          >
                            Resolve Alert
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Laptop Equipment & Asset Inventory View */}
      {activeTab === "LAPTOP_ASSETS" && (
        <div className="glass-panel" style={{ padding: "1.5rem", background: "#FFFFFF", borderRadius: "8px", border: "1px solid var(--border-dim)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#10B981", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Laptop size={20} /> 📋 LAPTOP EQUIPMENT & ASSET INVENTORY
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#6B7280", margin: "0.2rem 0 0 0" }}>
                Track company-issued laptops, serial numbers, hardware specifications, and staff password vault.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={handleExportLaptopCSV}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#F3F4F6",
                  color: "#374151",
                  border: "1px solid #D1D5DB",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                <Download size={15} /> Export CSV
              </button>
              <button
                onClick={() => setShowAddLaptopModal(true)}
                className="btn-gold"
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                <Plus size={15} /> Add Laptop Asset
              </button>
            </div>
          </div>

          {laptopAssets.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6B7280" }}>
              <Laptop size={48} style={{ color: "#9CA3AF", margin: "0 auto 1rem" }} />
              <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>No Laptop Assets Registered Yet</h4>
              <p style={{ fontSize: "0.82rem" }}>Click &quot;Add Laptop Asset&quot; to catalog company laptops, serial numbers, and passwords.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem" }}>Asset Tag</th>
                    <th style={{ padding: "0.75rem" }}>Serial Number</th>
                    <th style={{ padding: "0.75rem" }}>Brand & Model</th>
                    <th style={{ padding: "0.75rem" }}>Hardware Specs</th>
                    <th style={{ padding: "0.75rem" }}>Assigned Employee</th>
                    <th style={{ padding: "0.75rem" }}>Laptop Password</th>
                    <th style={{ padding: "0.75rem" }}>Condition</th>
                    <th style={{ padding: "0.75rem" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {laptopAssets.map((asset) => (
                    <tr key={asset.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "0.75rem", fontWeight: 800, color: "#1D4ED8" }}>
                        {asset.assetTag}
                      </td>
                      <td style={{ padding: "0.75rem", fontFamily: "monospace", color: "#111827" }}>
                        {asset.serialNumber}
                      </td>
                      <td style={{ padding: "0.75rem", fontWeight: 700, color: "#111827" }}>
                        {asset.brand} {asset.model || ""}
                      </td>
                      <td style={{ padding: "0.75rem", color: "#4B5563" }}>
                        <div>{asset.specsCpu || "Intel Core i5"}</div>
                        <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>{asset.specsRam || "16GB"} RAM | {asset.specsStorage || "512GB"} SSD</div>
                      </td>
                      <td style={{ padding: "0.75rem", fontWeight: 700, color: "#111827" }}>
                        {asset.user?.name || asset.user?.email || (
                          <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        {asset.laptopPassword ? (
                          <span style={{ fontFamily: "monospace", background: "#F3F4F6", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>
                            {asset.laptopPassword}
                          </span>
                        ) : (
                          <span style={{ color: "#9CA3AF" }}>N/A</span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <span style={{
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          background: asset.conditionStatus === "EXCELLENT" ? "#D1FAE5" : (asset.conditionStatus === "GOOD" ? "#DBEAFE" : "#FEE2E2"),
                          color: asset.conditionStatus === "EXCELLENT" ? "#065F46" : (asset.conditionStatus === "GOOD" ? "#1E40AF" : "#991B1B")
                        }}>
                          {asset.conditionStatus}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <button
                          onClick={() => {
                            if (confirm("Delete this laptop asset record?")) {
                              deleteLaptopAssetAction(asset.id).then(() => {
                                toast.success("Laptop asset deleted.");
                                router.refresh();
                              });
                            }
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#EF4444",
                            cursor: "pointer"
                          }}
                          title="Delete Asset"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Remote Workstation Command Maintenance Hub */}
      {activeTab === "REMOTE_COMMANDS" && (
        <div className="glass-panel" style={{ padding: "1.5rem", background: "#FFFFFF", borderRadius: "8px", border: "1px solid var(--border-dim)" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#8B5CF6", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Terminal size={20} /> 💻 REMOTE WORKSTATION MAINTENANCE HUB
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#6B7280", margin: "0.2rem 0 0 0" }}>
              Issue 1-click remote maintenance commands directly to staff Windows laptops in real-time!
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
            {allStaff.map((staff) => (
              <div key={staff.id} style={{
                padding: "1.25rem",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                background: "#F9FAFB",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#111827" }}>
                      {staff.name || staff.email}
                    </h4>
                    <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                      {staff.role.replace("_", " ")} {staff.employee?.employeeId && `| ID: ${staff.employee.employeeId}`}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.7rem", fontWeight: 800, padding: "0.2rem 0.5rem", background: "#E0E7FF", color: "#3730A3", borderRadius: "4px" }}>
                    AGENT ACTIVE
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <button
                    onClick={() => handleIssueCommand(staff.id, "RESTART_AGENT")}
                    style={{
                      padding: "0.4rem 0.6rem",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: "#FEF3C7",
                      color: "#92400E",
                      border: "1px solid #FCD34D",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem"
                    }}
                  >
                    <RefreshCw size={13} /> Restart Agent
                  </button>

                  <button
                    onClick={() => handleIssueCommand(staff.id, "CLEAR_CACHE")}
                    style={{
                      padding: "0.4rem 0.6rem",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: "#E0F2FE",
                      color: "#075985",
                      border: "1px solid #7DD3FC",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem"
                    }}
                  >
                    <HardDrive size={13} /> Clear Cache
                  </button>

                  <button
                    onClick={() => handleIssueCommand(staff.id, "FLUSH_DNS")}
                    style={{
                      padding: "0.4rem 0.6rem",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: "#EDE9FE",
                      color: "#5B21B6",
                      border: "1px solid #C4B5FD",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem"
                    }}
                  >
                    <Cpu size={13} /> Flush DNS
                  </button>

                  <button
                    onClick={() => handleIssueCommand(staff.id, "FORCE_SYNC")}
                    style={{
                      padding: "0.4rem 0.6rem",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: "#D1FAE5",
                      color: "#065F46",
                      border: "1px solid #6EE7B7",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem"
                    }}
                  >
                    <CheckCircle2 size={13} /> Force Sync
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 1: Default IT Personnel Grid Container */}
      {activeTab === "PERSONNEL" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "1.5rem" }}>
            {totalRecords === 0 ? (
              <div className="glass-panel" style={{ gridColumn: "1 / -1", padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                <Shield size={48} style={{ margin: "0 auto 1rem", color: "var(--text-muted)", opacity: 0.5 }} />
                <h3 style={{ fontWeight: 700, color: "var(--text-primary)" }}>No IT Personnel Cataloged</h3>
                <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Use the &quot;ADD USER&quot; button to onboard IT department members.</p>
              </div>
            ) : (
              paginatedPersonnel.map((it) => {
                const initials = it.name
                  ? it.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                  : "IT";

                return (
                  <div key={it.id} className="glass-panel" style={{
                    padding: "1.5rem",
                    border: it.status === "BLOCKED" ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid var(--border-dim)",
                    boxShadow: it.status === "BLOCKED" ? "0 4px 12px rgba(239, 68, 68, 0.03)" : "none",
                    position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem"
                }}>
                  {/* Subtle top indicator bar */}
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: it.status === "BLOCKED" ? "linear-gradient(90deg, #EF4444, #F87171)" : "var(--gold-gradient)"
                  }} />

                  {/* Header Details */}
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <div style={{
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "50%",
                      backgroundColor: it.status === "BLOCKED" ? "rgba(239, 68, 68, 0.08)" : "rgba(167, 139, 250, 0.08)",
                      border: it.status === "BLOCKED" ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid rgba(167, 139, 250, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: it.status === "BLOCKED" ? "#EF4444" : "#8B5CF6"
                    }}>
                      <Shield size={22} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>{it.name || "Unnamed IT Specialist"}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        <Mail size={12} />
                        <span>{it.email}</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                        <span className="badge active" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem", background: "rgba(167, 139, 250, 0.08)", color: "#8B5CF6", border: "1px solid rgba(167, 139, 250, 0.25)" }}>
                          ID: {it.employee?.employeeId || "N/A"}
                        </span>
                        <span className={`badge ${it.status === 'APPROVED' ? 'active' : 'inactive'}`} style={{
                          fontSize: "0.65rem",
                          padding: "0.1rem 0.4rem",
                          background: it.status === 'APPROVED' ? "rgba(34, 197, 94, 0.08)" : "rgba(239, 68, 68, 0.08)",
                          color: it.status === 'APPROVED' ? "#22C55E" : "#EF4444",
                          border: it.status === 'APPROVED' ? "1px solid rgba(34, 197, 94, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)"
                        }}>
                          {it.status === 'APPROVED' ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </div>

                      {/* Password Field Display */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "0.55rem",
                        padding: "0.4rem 0.6rem",
                        background: "rgba(15, 23, 42, 0.025)",
                        border: "1px dashed var(--border-dim)",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        width: "fit-content",
                        minWidth: "155px"
                      }}>
                        <span style={{ color: "var(--text-muted)", fontWeight: 500, marginRight: "0.5rem" }}>
                          Pass:
                        </span>
                        <code style={{
                          fontFamily: "monospace",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          letterSpacing: showPasswords[it.id] ? "normal" : "0.15em",
                          fontSize: "0.75rem"
                        }}>
                          {showPasswords[it.id] ? (
                            it.employee?.laptopPassword || (it.password && !it.password.startsWith("$2b$") && !it.password.startsWith("$2a$") ? it.password : "Protected (Use Reset Password)")
                          ) : "••••••••"}
                        </code>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(it.id)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: "0 0.25rem",
                            cursor: "pointer",
                            color: "var(--text-muted)",
                            marginLeft: "0.6rem",
                            display: "flex",
                            alignItems: "center"
                          }}
                          title={showPasswords[it.id] ? "Hide Password" : "Show Password"}
                        >
                          {showPasswords[it.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid var(--border-dim)", paddingTop: "1rem", marginTop: "auto" }}>
                    <button
                      onClick={() => handleToggleStatus(it.id, it.status)}
                      className={`btn-glass`}
                      style={{
                        flex: 1,
                        padding: "0.35rem",
                        fontSize: "0.78rem",
                        height: "auto",
                        color: it.status === "APPROVED" ? "var(--color-danger)" : "var(--color-success)",
                        borderColor: it.status === "APPROVED" ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)"
                      }}
                      disabled={isPending}
                    >
                      {isPending ? (
                        it.status === "APPROVED" ? "Disabling..." : "Enabling..."
                      ) : (
                        it.status === "APPROVED" ? "Disable Account" : "Enable Account"
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setResetPassUserId(it.id);
                        setResetPassUserName(it.name || it.email);
                        setResetPassNewPassword("");
                        setResetPassError(null);
                        setShowResetPassModal(true);
                      }}
                      className="btn-gold"
                      style={{ flex: 1, padding: "0.35rem", fontSize: "0.78rem", height: "auto" }}
                      disabled={isPending}
                    >
                      Reset Password
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Premium Minimalist Pagination Control Bar */}
        {totalRecords > 0 && (
          <div className="glass-panel" style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 1.5rem",
            background: "rgba(20, 18, 38, 0.75)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.09)",
            borderRadius: "var(--border-radius-md)",
            flexWrap: "wrap",
            gap: "1rem"
          }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Showing {totalRecords === 0 ? 0 : startIndex + 1}-{endIndex} of {totalRecords.toString()} entries
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
    )}

      {/* Onboard User Modal Dialog */}
      {showAddModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "768px",
            padding: "2rem",
            border: "1px solid var(--border-gold)",
            background: "#FFFFFF",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            position: "relative",
            zIndex: 50
          }}>
            {/* Close button */}
            <button
              onClick={() => setShowAddModal(false)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer"
              }}
              disabled={isPending}
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-gold-gradient" style={{ fontSize: "1.2rem", fontWeight: 800 }}>ONBOARD NEW USER</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Create an approved user account with explicit designated credentials.
              </p>
            </div>

            {errorMsg && (
              <div style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                padding: "0.6rem 1rem",
                borderRadius: "4px",
                color: "var(--color-danger)",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleOnboardSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Landscape Two-Column Form Grid Layout */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "1.5rem" }}>
                {/* Left Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Role Designation</label>
                    <div style={{
                      background: "#F9FAFB",
                      border: "1px solid var(--border-dim)",
                      borderRadius: "6px",
                      height: "36px",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 0.75rem",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "#8B5CF6"
                    }}>
                      IT TECHNICAL SPECIALIST
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Employee ID (Globally Unique)</label>
                    <input
                      type="text"
                      required
                      placeholder="IT-001"
                      value={onboardEmployeeId}
                      onChange={(e) => setOnboardEmployeeId(e.target.value)}
                      className="input-gold"
                      disabled={isPending}
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={onboardFullName}
                      onChange={(e) => setOnboardFullName(e.target.value)}
                      className="input-gold"
                      disabled={isPending}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. john@company.com"
                      value={onboardEmail}
                      onChange={(e) => setOnboardEmail(e.target.value)}
                      className="input-gold"
                      disabled={isPending}
                    />
                  </div>
                </div>
              </div>

              {/* Initial Password (Full Width) */}
              <div className="form-group">
                <label className="form-label">Initial Password</label>
                <input
                  type="text"
                  required
                  placeholder="Assign initial password"
                  value={onboardPassword}
                  onChange={(e) => setOnboardPassword(e.target.value)}
                  className="input-gold"
                  disabled={isPending}
                />
              </div>

              {/* Buttons (Bottom-Right corner with border-t) */}
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
                paddingTop: "1rem",
                marginTop: "0.5rem",
                borderTop: "1px solid rgba(229, 231, 235, 0.5)"
              }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-glass"
                  style={{ minWidth: "110px" }}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold"
                  style={{ minWidth: "130px" }}
                  disabled={isPending}
                >
                  {isPending ? "Onboarding..." : "Onboard User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {showResetPassModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.3)",
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
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            boxShadow: "var(--shadow-premium)"
          }}>
            <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>RESET USER PASSWORD</h2>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              IT Specialist: <strong style={{ color: "var(--text-primary)" }}>{resetPassUserName}</strong>
            </div>

            {resetPassError && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                {resetPassError}
              </div>
            )}

            <form onSubmit={handleResetPassSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="text"
                  required
                  placeholder="Enter new password"
                  value={resetPassNewPassword}
                  onChange={(e) => setResetPassNewPassword(e.target.value)}
                  className="input-gold"
                  disabled={isPending}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassModal(false);
                    setResetPassUserId("");
                    setResetPassUserName("");
                  }}
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
                  {isPending ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD LAPTOP ASSET MODAL */}
      {showAddLaptopModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div className="glass-panel" style={{
            background: "#FFFFFF",
            width: "100%",
            maxWidth: "520px",
            padding: "1.75rem",
            borderRadius: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#10B981" }}>
                REGISTER NEW LAPTOP ASSET
              </h3>
              <button
                onClick={() => setShowAddLaptopModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddLaptopSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.82rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>Asset Tag *</label>
                  <input
                    type="text"
                    required
                    value={assetTag}
                    onChange={(e) => setAssetTag(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #D1D5DB" }}
                    placeholder="LAP-101"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>Serial Number *</label>
                  <input
                    type="text"
                    required
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #D1D5DB" }}
                    placeholder="SN-78493021"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>Brand *</label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #D1D5DB" }}
                    placeholder="Dell / HP / Lenovo"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #D1D5DB" }}
                    placeholder="Latitude 5420"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={{ fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>CPU Specs</label>
                  <input
                    type="text"
                    value={specsCpu}
                    onChange={(e) => setSpecsCpu(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #D1D5DB" }}
                    placeholder="Core i5-11th Gen"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>RAM</label>
                  <input
                    type="text"
                    value={specsRam}
                    onChange={(e) => setSpecsRam(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #D1D5DB" }}
                    placeholder="16GB DDR4"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>Storage</label>
                  <input
                    type="text"
                    value={specsStorage}
                    onChange={(e) => setSpecsStorage(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #D1D5DB" }}
                    placeholder="512GB SSD"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>Assignee Employee</label>
                <select
                  value={assigneeUserId}
                  onChange={(e) => setAssigneeUserId(e.target.value)}
                  style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #D1D5DB" }}
                >
                  <option value="">-- Unassigned --</option>
                  {allStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name || staff.email} ({staff.role.replace("_", " ")})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>Laptop Password</label>
                  <input
                    type="text"
                    value={laptopPassword}
                    onChange={(e) => setLaptopPassword(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #D1D5DB" }}
                    placeholder="Staff@1234"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>Condition</label>
                  <select
                    value={conditionStatus}
                    onChange={(e: any) => setConditionStatus(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid #D1D5DB" }}
                  >
                    <option value="EXCELLENT">EXCELLENT</option>
                    <option value="GOOD">GOOD</option>
                    <option value="REPAIR_REQUIRED">REPAIR REQUIRED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddLaptopModal(false)}
                  style={{ flex: 1, padding: "0.5rem", borderRadius: "6px", border: "1px solid #D1D5DB", background: "#F3F4F6" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-gold"
                  style={{ flex: 1, padding: "0.5rem", borderRadius: "6px", fontWeight: 700 }}
                >
                  {isPending ? "Saving..." : "Save Laptop Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        isPending={isPending}
      />
    </div>
  );
}
