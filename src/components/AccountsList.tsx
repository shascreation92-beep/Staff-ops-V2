"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  createAccountAction, 
  updateAccountStatusAction, 
  verifyAccountAction,
  updateAccountAdsAction,
  updateAccountIssueAction,
  updateAccountCommentAction,
  updateAccountITNotesAction,
  createPlatformAction
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
  Eye,
  MessageSquare,
  X,
  Download
} from "lucide-react";
import { account_status, user_role } from "@prisma/client";
import NotificationBell from "./NotificationBell";
import { toast } from "react-hot-toast";
import ConfirmationModal from "./ConfirmationModal";
import { downloadCSV } from "@/lib/csv-exporter";

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
  teamLeads?: any[];
}

export default function AccountsList({
  currentUser,
  accounts,
  platforms,
  companies,
  rules,
  duplicateMap,
  teamLeads = []
}: AccountsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localAccounts, setLocalAccounts] = useState(accounts);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const formatNumber = (num: number | string | null | undefined): string => {
    if (num === null || num === undefined) return "0";
    const n = typeof num === "string" ? parseInt(num, 10) : num;
    if (isNaN(n)) return num.toString();
    if (n < 0) return n.toString();
    return n.toString();
  };

  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);

  const [submittingId, setSubmittingId] = useState<string | null>(null);
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

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [teamLeadFilter, setTeamLeadFilter] = useState("ALL");

  // Provision modal state
  const [showModal, setShowModal] = useState(false);
  const [platformId, setPlatformId] = useState(platforms[0]?.id || "");
  const [serialCode, setSerialCode] = useState("");
  const [idName, setIdName] = useState("");
  const [adsPublished, setAdsPublished] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<"Yes" | "No">("No");
  const [targetCompanyId, setTargetCompanyId] = useState(companies[0]?.id || "");
  const [comment, setComment] = useState("");
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
  const [wizardComment, setWizardComment] = useState("");
  const [wizardErrorMsg, setWizardErrorMsg] = useState<string | null>(null);

  const [localPlatforms, setLocalPlatforms] = useState(platforms);
  const [showCustomPlatformInput, setShowCustomPlatformInput] = useState(false);
  const [customPlatformName, setCustomPlatformName] = useState("");

  useEffect(() => {
    setLocalPlatforms(platforms);
  }, [platforms]);

  // Comment Modal state
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentAccountId, setCommentAccountId] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isCommentReadOnly, setIsCommentReadOnly] = useState(false);

  // IT Comment Modal State
  const [showITCommentModal, setShowITCommentModal] = useState(false);
  const [selectedITCommentAccountId, setSelectedITCommentAccountId] = useState("");
  const [selectedITNotes, setSelectedITNotes] = useState("");
  const [selectedITNotesAccountSerial, setSelectedITNotesAccountSerial] = useState("");
  const [selectedITNotesAccountIdName, setSelectedITNotesAccountIdName] = useState("");
  const [selectedITNotesTimestamp, setSelectedITNotesTimestamp] = useState<string | Date>("");
  const [seenITComments, setSeenITComments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("seen_it_comments");
        if (stored) {
          setSeenITComments(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to load seen_it_comments", e);
      }
    }
  }, []);

  // Inline ads editing state
  const [editingAdsId, setEditingAdsId] = useState<string | null>(null);
  const [tempAdsValue, setTempAdsValue] = useState<number>(0);

  // IT Comment Modal Save Handler
  const handleSaveITCommentModal = () => {
    if (!selectedITCommentAccountId) return;
    startTransition(async () => {
      try {
        const res = await updateAccountITNotesAction(selectedITCommentAccountId, selectedITNotes);
        if (res.success) {
          toast.success("IT comments updated successfully!");
          setShowITCommentModal(false);
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to save comment.");
      }
    });
  };

  // Workflow update state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [activeAccount, setActiveAccount] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<account_status>("SUBMITTED");
  const [transitionNotes, setTransitionNotes] = useState("");

  const handleDirectRequestToTL = (accountId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Submit Request to Team Lead",
      message: "Are you sure you want to submit this account request to your Team Lead?",
      onConfirm: () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setSubmittingId(accountId);
        startTransition(async () => {
          try {
            const res = await updateAccountStatusAction(
              accountId,
              "PENDING_TL",
              "Request to TL submitted by Associate"
            );
            if (res.success) {
              alert("Your request has been forwarded to your Team Lead successfully.");
              router.refresh();
            }
          } catch (err: any) {
            alert("Error submitting request: " + (err.message || "Unknown error"));
            toast.error(err.message || "Failed to submit request.");
          } finally {
            setSubmittingId(null);
          }
        });
      }
    });
  };

  const handleDirectRequestToIT = (accountId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Submit Request to IT Department",
      message: "Are you sure you want to submit this personal account request directly to the IT Department?",
      onConfirm: () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setSubmittingId(accountId);
        startTransition(async () => {
          try {
            const res = await updateAccountStatusAction(
              accountId,
              "FORWARDED_TO_IT",
              "Direct submission to IT by Team Lead (TL Personal Account)"
            );
            if (res.success) {
              alert("Your request has been forwarded directly to the IT Department.");
              router.refresh();
            }
          } catch (err: any) {
            alert("Error submitting request: " + (err.message || "Unknown error"));
            toast.error(err.message || "Failed to submit request.");
          } finally {
            setSubmittingId(null);
          }
        });
      }
    });
  };

  const handleTLApprove = (accountId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Approve Request",
      message: "Are you sure you want to approve this request?",
      onConfirm: () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        startTransition(async () => {
          try {
            const res = await updateAccountStatusAction(accountId, "FORWARDED_TO_IT", "Approved by Team Lead");
            if (res.success) {
              alert("Approved successfully!");
              router.refresh();
            } else {
              alert("Failed to approve.");
            }
          } catch (err: any) {
            alert(err.message);
          }
        });
      }
    });
  };

  const handleITAccept = (accountId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Accept Request",
      message: "Are you sure you want to accept this request?",
      onConfirm: () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        startTransition(async () => {
          try {
            const res = await updateAccountStatusAction(accountId, "IT_PENDING", "Accepted by IT Department");
            if (res.success) {
              alert("Request accepted successfully!");
              router.refresh();
            } else {
              alert("Failed to accept account.");
            }
          } catch (err: any) {
            alert(err.message);
          }
        });
      }
    });
  };

  const handleITSort = (accountId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Sort Account",
      message: "Are you sure you want to sort and resolve this account?",
      onConfirm: () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        startTransition(async () => {
          try {
            const res = await updateAccountStatusAction(accountId, "SORTED", "Sorted and resolved by IT Department");
            if (res.success) {
              router.refresh();
            } else {
              alert("Failed to sort account.");
            }
          } catch (err: any) {
            alert(err.message);
          }
        });
      }
    });
  };

  const handleUpdateIssue = (accountId: string, issueType: string) => {
    startTransition(async () => {
      try {
        const res = await updateAccountIssueAction(accountId, issueType);
        if (res.success) {
          router.refresh();
        } else {
          alert("Failed to update issue status.");
        }
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
  const filteredAccounts = localAccounts.filter(acc => {
    const matchesSearch = 
      acc.serialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.idName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.company?.name || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || acc.status === statusFilter;
    const matchesPlatform = platformFilter === "ALL" || acc.platformId === platformFilter;

    const matchesTeamLead = teamLeadFilter === "ALL" ||
      acc.teamLeadId === teamLeadFilter ||
      acc.createdById === teamLeadFilter;

    return matchesSearch && matchesStatus && matchesPlatform && matchesTeamLead;
  });

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });

  const handleExportCSV = () => {
    const headers = [
      "Tenant Company",
      "Platform",
      "ID Serial",
      "ID Name",
      "Ads Published",
      "Verified",
      "Status",
      "Created By",
      "Submission Date",
      "Approved Date",
      "Issue / Defect",
      "TL Comment",
      "IT Notes"
    ];

    const rows = sortedAccounts.map(acc => [
      acc.company?.name || "N/A",
      acc.platform?.name || "N/A",
      acc.serialCode || "",
      acc.idName || "",
      (acc.adsPublished || 0).toString(),
      acc.verificationStatus || "",
      acc.status || "",
      acc.user?.name || acc.user?.email || "System",
      acc.submissionDate ? new Date(acc.submissionDate).toLocaleDateString() : "",
      acc.approvedDate ? new Date(acc.approvedDate).toLocaleDateString() : "",
      acc.issue || "",
      acc.comment || "",
      acc.itNotes || ""
    ]);

    downloadCSV(headers, rows, `accounts_export_${new Date().toISOString().slice(0,10)}`);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, platformFilter, teamLeadFilter, sortOrder]);

  const ITEMS_PER_PAGE = 50;
  const totalRecords = sortedAccounts.length;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRecords);
  const paginatedAccounts = sortedAccounts.slice(startIndex, endIndex);

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

  const toggleTimeSort = () => {
    setSortOrder(prev => prev === "desc" ? "asc" : "desc");
  };

  const getStatusStyle = (acc: any) => {
    if (acc.status === "PENDING_TL") {
      return {
        color: "#60A5FA",
        text: "PENDING TL",
        bg: "rgba(96, 165, 250, 0.08)",
        border: "rgba(96, 165, 250, 0.25)",
        glow: "none"
      };
    }
    if (acc.status === "FORWARDED_TO_IT") {
      if (acc.user_account_createdByIdTouser?.role === "TEAM_LEAD") {
        return {
          color: "#A78BFA",
          text: "DIRECT TO IT",
          bg: "rgba(167, 139, 250, 0.08)",
          border: "rgba(167, 139, 250, 0.25)",
          glow: "none"
        };
      }
      const approver = acc.user_account_updatedByIdTouser;
      const approverName = approver?.name || "TL";
      const approverRole = approver?.role;
      
      let labelText = `APPROVED BY TL (${approverName.toUpperCase()})`;
      if (approverRole === "IT_DEPARTMENT") {
        labelText = `FORWARDED BY IT (${approverName.toUpperCase()})`;
      } else if (approverRole === "SUPER_ADMIN" || approverRole === "COMPANY_OWNER") {
        labelText = `APPROVED BY ADMIN (${approverName.toUpperCase()})`;
      }

      return {
        color: "#A78BFA",
        text: labelText,
        bg: "rgba(167, 139, 250, 0.08)",
        border: "rgba(167, 139, 250, 0.25)",
        glow: "none"
      };
    }
    if (acc.status === "IT_PENDING") {
      return {
        color: "#D97706",
        text: "PENDING",
        bg: "rgba(245, 158, 11, 0.08)",
        border: "rgba(245, 158, 11, 0.25)",
        glow: "none"
      };
    }
    if (acc.status === "SORTED") {
      const isTLPersonal = acc.user_account_createdByIdTouser?.role === "TEAM_LEAD";
      if (isTLPersonal) {
        const issue = acc.issueType || "Active";
        if (issue === "Active") {
          return {
            color: "#22C55E",
            text: "ACTIVE",
            bg: "rgba(34, 197, 94, 0.08)",
            border: "rgba(34, 197, 94, 0.3)",
            glow: "0 0 12px rgba(34, 197, 94, 0.3)"
          };
        }
        if (issue === "Marketplace Issue") {
          return {
            color: "var(--color-warning)",
            text: "MARKETPLACE ISSUE",
            bg: "rgba(245, 158, 11, 0.08)",
            border: "rgba(245, 158, 11, 0.25)",
            glow: "none"
          };
        }
        if (issue === "Suspended" || issue === "Suspension Issue") {
          return {
            color: "var(--color-danger)",
            text: "SUSPENSION ISSUE",
            bg: "rgba(239, 68, 68, 0.1)",
            border: "rgba(239, 68, 68, 0.3)",
            glow: "0 0 10px rgba(239, 68, 68, 0.15)"
          };
        }
        if (issue === "Identity Issue") {
          return {
            color: "#0250A1",
            text: "IDENTITY ISSUE",
            bg: "rgba(2, 80, 161, 0.08)",
            border: "rgba(2, 80, 161, 0.25)",
            glow: "none"
          };
        }
      }

      const isIssue = ["Marketplace Issue", "Identity Issue", "Suspended"].includes(acc.issueType);
      return {
        color: isIssue ? "var(--color-danger)" : "#22C55E",
        text: (acc.issueType || "ACTIVE").toUpperCase(),
        bg: isIssue ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.08)",
        border: isIssue ? "rgba(239, 68, 68, 0.3)" : "rgba(34, 197, 94, 0.3)",
        glow: isIssue ? "0 0 10px rgba(239, 68, 68, 0.15)" : "0 0 12px rgba(34, 197, 94, 0.3)"
      };
    }
    if (acc.status === "REJECTED") {
      return {
        color: "var(--color-danger)",
        text: "REJECTED BY TL",
        bg: "rgba(239, 68, 68, 0.1)",
        border: "rgba(239, 68, 68, 0.3)",
        glow: "0 0 10px rgba(239, 68, 68, 0.15)"
      };
    }

    const isVerified = acc.verificationStatus === "Yes";
    const adsCount = acc.adsPublished;
    const isApproved = ["ACTIVE", "COMPLETED"].includes(acc.status);

    if (!isVerified) {
      return {
        color: "var(--color-danger)",
        text: "UNVERIFIED",
        bg: "rgba(239, 68, 68, 0.1)",
        border: "rgba(239, 68, 68, 0.3)",
        glow: "none"
      };
    }

    if (adsCount < minAdsRule) {
      return {
        color: "var(--orange-accent)",
        text: `BELOW MIN ADS (${minAdsRule})`,
        bg: "rgba(255, 138, 0, 0.1)",
        border: "rgba(255, 138, 0, 0.3)",
        glow: "0 0 10px rgba(255, 138, 0, 0.15)"
      };
    }

    if (isVerified && adsCount >= minAdsRule && isApproved) {
      return {
        color: "var(--gold-glow)",
        text: "VERIFIED & APPROVED",
        bg: "rgba(255, 215, 0, 0.05)",
        border: "var(--border-gold)",
        glow: "0 0 10px rgba(255, 215, 0, 0.15)"
      };
    }

    return {
      color: "var(--text-secondary)",
      text: acc.status.replace("IT_", "").replace(/_/g, " "),
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
          targetCompanyId: isSuperAdmin ? targetCompanyId : undefined,
          comment
        });

        if (res.success) {
          setShowModal(false);
          setSerialCode("");
          setIdName("");
          setAdsPublished(0);
          setVerificationStatus("No");
          setComment("");
          if (res.account) {
            setLocalAccounts(prev => [res.account, ...prev]);
          }
          router.refresh();
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to provision account.");
      }
    });
  };

  const handleOpenCommentModal = (acc: any) => {
    setCommentAccountId(acc.id);
    setCommentText(acc.comment || "");
    const isOwnerOrAssociate = currentUser.role === "SALES_ASSOCIATE" || (currentUser.role === "TEAM_LEAD" && acc.createdById === currentUser.id);
    setIsCommentReadOnly(!isOwnerOrAssociate);
    setShowCommentModal(true);
  };

  const handleSaveComment = async () => {
    if (isCommentReadOnly) return;
    startTransition(async () => {
      try {
        const res = await updateAccountCommentAction(commentAccountId, commentText);
        if (res.success) {
          setShowCommentModal(false);
          toast.success("Comment updated successfully.");
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to update comment.");
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
          submissionDate: wizardSubmissionDate,
          comment: wizardComment
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
          setWizardComment("");
          if (res.account) {
            setLocalAccounts(prev => [res.account, ...prev]);
          }
          router.refresh();
        }
      } catch (err: any) {
        setWizardErrorMsg(err.message || "Failed to create account.");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Toolbar Controls */}
      <div className="glass-panel" style={{ padding: "0.85rem 1.25rem", marginBottom: 0, position: "relative", zIndex: 50, overflow: "visible" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", width: "100%" }}>
          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <button 
              className="btn-gold" 
              onClick={handleExportCSV}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}
            >
              <Download size={15} />
              <span>EXPORT CSV</span>
            </button>
            {(isSuperAdmin || isCompanyOwner) && (
              <button 
                className="btn-gold" 
                onClick={() => setShowModal(true)}
                disabled={isPending}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}
              >
                <Plus size={15} />
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
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}
              >
                <Plus size={15} />
                <span>ADD ACCOUNT</span>
              </button>
            )}
          </div>

          {/* Search, Filters & Notification Bell Group */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", flex: "1 1 auto", justifyContent: "flex-end" }}>
            <div className="table-search-wrapper" style={{ width: "180px", flexShrink: 0 }}>
              <Search className="header-search-icon" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="header-search-input"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="table-select-filter"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PENDING_TL">PENDING TL APPROVAL</option>
              <option value="FORWARDED_TO_IT">PENDING IT APPROVAL</option>
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

            {(isIT || isSuperAdmin) && teamLeads && teamLeads.length > 0 && (
              <select
                value={teamLeadFilter}
                onChange={(e) => setTeamLeadFilter(e.target.value)}
                className="table-select-filter"
                style={{ minWidth: "140px" }}
              >
                <option value="ALL">ALL TEAM LEADS</option>
                {teamLeads.map(tl => (
                  <option key={tl.id} value={tl.id}>TL: {tl.name || tl.email}</option>
                ))}
              </select>
            )}

            <NotificationBell />
          </div>
        </div>
      </div>


      {/* Main Table listing */}
      <div className="glass-panel table-panel table-panel-flat">
        <div className="table-container-outer">
          <table className="premium-table compact-table">
            <thead>
              <tr>
                {isSuperAdmin && <th className="col-requested-by">Tenant Company</th>}
                <th className="col-platform">Platform</th>
                <th>ID Serial</th>
                <th className="col-id-name">ID Name</th>
                <th className="col-ads">Ads Pub.</th>
                <th className="col-verified">Verified</th>
                <th onClick={toggleTimeSort} className="col-time" style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span>Entry Time</span>
                    <span>{sortOrder === "desc" ? "↓" : "↑"}</span>
                  </div>
                </th>
                <th className="col-comments">Comments</th>
                <th className="col-requested-by">{isIT ? "Requested By" : "Request to TL"}</th>
                <th className="col-it-comments">IT Comments</th>
                <th className="col-status">Status</th>
              </tr>
            </thead>
            <tbody>
              {totalRecords === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 11 : 10} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    No operational accounts cataloged.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((acc) => {
                  const rule = getStatusStyle(acc);
                  const duplicates = duplicateMap[acc.idName] || 1;

                  return (
                    <tr key={acc.id}>
                      {isSuperAdmin && (
                        <td className="col-requested-by" style={{ fontWeight: 600, color: "var(--gold-primary)" }}>
                          {acc.company?.name || "Global"}
                        </td>
                      )}
                      <td className="col-platform">
                        <span className="badge developer" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                          {acc.platform?.name}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 500 }}>
                        {acc.serialCode}
                      </td>
                      <td className="col-id-name">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", overflow: "hidden" }}>
                          <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={acc.idName}>{acc.idName}</span>
                          {duplicates > 1 && (
                            <span 
                              title={`${duplicates} duplicate records use this ID name`}
                              className="badge" 
                              style={{ 
                                padding: "0.05rem 0.4rem", 
                                background: "rgba(245, 158, 11, 0.08)", 
                                border: "1px solid rgba(245, 158, 11, 0.2)", 
                                color: "var(--color-warning)", 
                                fontSize: "0.65rem" 
                              }}
                            >
                              x{duplicates}
                            </span>
                          )}
                          {acc.user_account_createdByIdTouser?.role === "TEAM_LEAD" && (
                            <span 
                              className="badge" 
                              style={{ 
                                background: "rgba(2, 80, 161, 0.08)", 
                                border: "1px solid rgba(2, 80, 161, 0.25)", 
                                color: "#0250A1", 
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                padding: "0.1rem 0.45rem",
                                borderRadius: "4px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "80px"
                              }}
                              title={`Direct submission from Team Lead ${acc.user_account_createdByIdTouser?.name}`}
                            >
                              👤 TL: {acc.user_account_createdByIdTouser?.name || "N/A"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="col-ads" style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
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
                            <span>{formatNumber(acc.adsPublished)} ads</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", opacity: 0.6 }}>✏️</span>
                          </div>
                        )}
                      </td>
                      <td className="col-verified">
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
                      <td className="col-time" style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: "1.2" }}>
                        {(() => {
                          const d = new Date(acc.createdAt);
                          const datePart = `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}, ${d.getFullYear()}`;
                          const timePart = d.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" });
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                              <span style={{ fontWeight: 600 }}>{datePart}</span>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{timePart}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="col-comments">
                        <button
                          onClick={() => handleOpenCommentModal(acc)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "0.25rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto",
                            transition: "transform 0.2s ease"
                          }}
                          title={acc.comment ? `Comment: "${acc.comment}"` : "No comment"}
                        >
                          {acc.comment ? (
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
                      <td className="col-requested-by">
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "flex-start", overflow: "hidden" }}>
                          {isIT ? (
                            <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100px" }} title={acc.user_account_createdByIdTouser?.name || acc.associateId || "N/A"}>
                              {acc.user_account_createdByIdTouser?.name || acc.associateId || "N/A"}
                            </span>
                          ) : (isSalesAssociate || isTeamLead) && ["DRAFT", "REJECTED"].includes(acc.status) ? (
                            acc.adsPublished >= 4 ? (
                              isSalesAssociate ? (
                                <button
                                  onClick={() => handleDirectRequestToTL(acc.id)}
                                  className="btn-gold"
                                  style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", height: "auto" }}
                                  disabled={isPending || submittingId === acc.id}
                                >
                                  Request to TL
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDirectRequestToIT(acc.id)}
                                  className="btn-gold"
                                  style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", height: "auto" }}
                                  disabled={isPending || submittingId === acc.id}
                                >
                                  Request to IT
                                </button>
                              )
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
                              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "45px" }} title={acc.associateId || "N/A"}>
                                {acc.associateId || "N/A"}
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
                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100px" }} title={acc.associateId || ""}>
                              {acc.associateId || "—"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="col-it-comments" style={{ textAlign: "center" }}>
                        <button
                          onClick={() => {
                            setSelectedITNotes(acc.itNotes || "");
                            setSelectedITNotesAccountSerial(acc.serialCode);
                            setSelectedITNotesAccountIdName(acc.idName);
                            setSelectedITNotesTimestamp(acc.updatedAt || acc.createdAt);
                            setSelectedITCommentAccountId(acc.id);
                            setShowITCommentModal(true);

                            const nextSeen = { ...seenITComments, [acc.id]: acc.itNotes || "" };
                            setSeenITComments(nextSeen);
                            localStorage.setItem("seen_it_comments", JSON.stringify(nextSeen));
                          }}
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
                          title={acc.itNotes ? `IT Comment: "${acc.itNotes}"` : "No IT comment"}
                        >
                          {acc.itNotes ? (
                            <span style={{ display: "inline-flex", alignItems: "center", position: "relative" }}>
                              {seenITComments[acc.id] !== acc.itNotes && (
                                <span 
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    background: "#EF4444",
                                    borderRadius: "50%",
                                    position: "absolute",
                                    top: "-2px",
                                    right: "-2px",
                                    boxShadow: "0 0 4px #EF4444"
                                  }}
                                  title="New IT Comment!"
                                />
                              )}
                              <MessageSquare 
                                size={18} 
                                style={{ 
                                  fill: "#0250A1", 
                                  color: "#0250A1",
                                  filter: "drop-shadow(0 0 2px rgba(2, 80, 161, 0.3))" 
                                }} 
                              />
                            </span>
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
                      <td className="col-status">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                          {/* Dropdown select for Sales Associate (own account), Team Lead (own account), or IT (on TL personal accounts) */}
                          {(acc.status === "SORTED" && (isSalesAssociate || (isTeamLead && acc.createdById === currentUser.id))) ||
                           ((acc.status === "FORWARDED_TO_IT" || acc.status === "SORTED") && (isIT || isSuperAdmin) && acc.user_account_createdByIdTouser?.role === "TEAM_LEAD") ? (
                            <select
                              value={acc.issueType || "Active"}
                              onChange={(e) => handleUpdateIssue(acc.id, e.target.value)}
                              style={{
                                background: rule.bg,
                                border: `1px solid ${rule.border}`,
                                color: rule.color,
                                boxShadow: rule.glow,
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                borderRadius: "999px",
                                padding: "0.2rem 0.55rem",
                                cursor: "pointer",
                                outline: "none",
                                width: "auto",
                                textAlign: "center"
                              }}
                            >
                              <option value="Active" style={{ color: "#22C55E", background: "#FFFFFF" }}>Active</option>
                              <option value="Marketplace Issue" style={{ color: "var(--color-warning)", background: "#FFFFFF" }}>Marketplace Issue</option>
                              <option value="Identity Issue" style={{ color: "#0250A1", background: "#FFFFFF" }}>Identity Issue</option>
                              <option value="Suspended" style={{ color: "var(--color-danger)", background: "#FFFFFF" }}>Suspension Issue</option>
                            </select>
                          ) : (
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
                          )}

                          {/* Normal IT Accept / Sort buttons (only for Associates, meaning NOT TL Personal accounts) */}
                          {(acc.status === "FORWARDED_TO_IT" && (isIT || isSuperAdmin) && acc.user_account_createdByIdTouser?.role !== "TEAM_LEAD") && (
                            <div style={{ display: "flex", gap: "0.35rem" }}>
                              <button
                                onClick={() => handleITAccept(acc.id)}
                                className="btn-gold"
                                style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", height: "auto" }}
                                disabled={isPending}
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleITSort(acc.id)}
                                className="btn-success"
                                style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", height: "auto" }}
                                disabled={isPending}
                              >
                                Sort
                              </button>
                            </div>
                          )}

                          {/* Normal IT Pending Sort button (only for Associates) */}
                          {(acc.status === "IT_PENDING" && (isIT || isSuperAdmin) && acc.user_account_createdByIdTouser?.role !== "TEAM_LEAD") && (
                            <button
                              onClick={() => handleITSort(acc.id)}
                              className="btn-success"
                              style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", height: "auto" }}
                              disabled={isPending}
                            >
                              Sort
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

        {/* Premium Minimalist Pagination Control Bar */}
        {totalRecords > 0 && (
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
        )}
      </div>

      {/* Provision Account Modal */}
      {showModal && (
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
            maxWidth: "500px",
            width: "100%",
            padding: "2rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            boxShadow: "var(--shadow-premium)",
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
          background: "rgba(15, 23, 42, 0.3)",
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
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            boxShadow: "var(--shadow-premium)"
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
            padding: "2.5rem 2rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            boxShadow: "var(--shadow-premium)",
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
                  STEP {formatNumber(wizardStep)} OF {formatNumber(6)}
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
                <div className="form-group" style={{ marginBottom: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <label className="form-label">Platform Selection</label>
                  
                  {!showCustomPlatformInput ? (
                    <>
                      <select
                        value={wizardPlatformId}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "ADD_NEW_CUSTOM") {
                            setShowCustomPlatformInput(true);
                            return;
                          }
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
                        {localPlatforms.map(p => (
                          <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                        ))}
                        <option value="ADD_NEW_CUSTOM" style={{ fontWeight: 700, color: "var(--gold-primary)" }}>
                          + Add New Custom Platform...
                        </option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setShowCustomPlatformInput(true)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--gold-primary)",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          textAlign: "left",
                          padding: 0
                        }}
                      >
                        + Can't find your platform? Add custom platform
                      </button>
                    </>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <input
                        type="text"
                        placeholder="Type new platform name (e.g. TikTok, Etsy)..."
                        value={customPlatformName}
                        onChange={(e) => setCustomPlatformName(e.target.value)}
                        className="input-gold"
                        style={{ width: "100%" }}
                        autoFocus
                      />
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomPlatformInput(false);
                            setCustomPlatformName("");
                          }}
                          className="btn-glass"
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!customPlatformName.trim()) {
                              setWizardErrorMsg("Platform name is required.");
                              return;
                            }
                            try {
                              const res = await createPlatformAction(customPlatformName.trim());
                              if (res.success && res.platform) {
                                setLocalPlatforms(prev => [...prev, res.platform]);
                                setWizardPlatformId(res.platform.id);
                                setShowCustomPlatformInput(false);
                                setCustomPlatformName("");
                                setWizardStep(2);
                                setWizardErrorMsg(null);
                                toast.success(`Added platform "${res.platform.name}"!`);
                              }
                            } catch (err: any) {
                              setWizardErrorMsg(err.message || "Failed to create platform.");
                            }
                          }}
                          className="btn-gold"
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem", flex: 1 }}
                        >
                          Save & Select Platform
                        </button>
                      </div>
                    </div>
                  )}
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
                        if (wizardSubmissionDate) {
                          handleWizardSubmit();
                        } else {
                          setWizardErrorMsg("Date of submission is required.");
                        }
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
                    if (!wizardSubmissionDate) {
                      setWizardErrorMsg("Date of submission is required.");
                      return;
                    }
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
                  {isCommentReadOnly ? "View Comments" : "Edit Comments"}
                </h2>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Submission Notes / Comments</label>
              {isCommentReadOnly ? (
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
                  {commentText || "No comments cataloged for this account."}
                </div>
              ) : (
                <textarea
                  rows={4}
                  maxLength={500}
                  placeholder="e.g. Request fast IT setup, or specific browser login requirements..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="input-gold"
                  style={{ width: "100%", resize: "none", fontFamily: "inherit" }}
                  autoFocus
                />
              )}
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                type="button"
                onClick={() => setShowCommentModal(false)}
                className="btn-glass"
                style={{ flex: 1 }}
                disabled={isPending}
              >
                {isCommentReadOnly ? "Close" : "Cancel"}
              </button>

              {!isCommentReadOnly && (
                <button
                  type="button"
                  onClick={handleSaveComment}
                  className="btn-gold"
                  style={{ flex: 1 }}
                  disabled={isPending}
                >
                  {isPending ? "Saving..." : "Save Comment"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showITCommentModal && (
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
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
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
                  {selectedITNotesAccountSerial} - {selectedITNotesAccountIdName}
                </h2>
              </div>
              <button 
                onClick={() => {
                  setShowITCommentModal(false);
                  setSelectedITNotes("");
                }} 
                style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Textarea */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {isIT || isSuperAdmin ? (
                <textarea
                  rows={5}
                  value={selectedITNotes}
                  onChange={(e) => setSelectedITNotes(e.target.value)}
                  className="input-gold"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    fontSize: "0.85rem",
                    background: "#FFFFFF",
                    border: "1px solid var(--border-dim)",
                    resize: "none",
                    color: "var(--text-primary)"
                  }}
                  placeholder="Type custom IT update, remarks, or diagnostic notes..."
                />
              ) : (
                <textarea
                  readOnly
                  rows={5}
                  value={selectedITNotes}
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
              )}
              {/* Timestamp Subtitle */}
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic", alignSelf: "flex-end" }}>
                Last Updated by IT: {(() => {
                  const d = new Date(selectedITNotesTimestamp);
                  return `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}, ${d.getFullYear()} ${d.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
                })()}
              </span>
            </div>

            {/* Actions Footer */}
            <div style={{ display: "flex", gap: "1rem", borderTop: "1px solid var(--border-dim)", paddingTop: "0.75rem" }}>
              <button
                onClick={() => {
                  setShowITCommentModal(false);
                  setSelectedITNotes("");
                }}
                className="btn-glass"
                style={{ flex: 1 }}
                disabled={isPending}
              >
                {isIT || isSuperAdmin ? "Cancel" : "Close Remarks"}
              </button>

              {(isIT || isSuperAdmin) && (
                <button
                  onClick={handleSaveITCommentModal}
                  className="btn-gold"
                  style={{ flex: 1 }}
                  disabled={isPending}
                >
                  {isPending ? "Saving..." : "Save Comment"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
