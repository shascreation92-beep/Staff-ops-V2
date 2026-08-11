"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Sliders, 
  Shield, 
  Database, 
  Laptop, 
  FileText,
  UserCheck,
  LogOut,
  Key,
  ClipboardCheck,
  Megaphone,
  Wallet,
  Monitor,
  Activity,
  Cpu,
  Pencil,
  HelpCircle,
  TrendingUp,
  Calendar,
  Building2,
  Clock,
  Power,
  Coffee,
  UserX,
  CheckCircle2,
  AlertCircle,
  Bell,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus
} from "lucide-react";
import { signOut } from "next-auth/react";
import { user_role } from "@prisma/client";
import { updateUserPasswordAction } from "@/app/actions/users";
import { CURRENT_AGENT_VERSION } from "@/lib/agent-version";
import { getPendingTLRequestsCountAction } from "@/app/actions/accounts";
import { getPendingLeaveApprovalsCountAction } from "@/app/actions/leave-requests";
import { updateUserBioAction } from "@/app/actions/profile";
import { createCompanyAction } from "@/app/actions/company";
import { getChatBadgeStatusAction } from "@/app/actions/chat";
import { getSpecialRequestsBadgeStatusAction } from "@/app/actions/special-requests";
import { toggleShiftDutyAction, getUserCurrentDutyAction, getCompanyDutyAttendanceAction } from "@/app/actions/shift";
import { useITConfig } from "./ITConfigProvider";
import FeedbackModal from "./FeedbackModal";
import { toast } from "react-hot-toast";
import { useRef } from "react";

const DatabaseCubeIcon = ({ className, size = 20 }: { className?: string; size?: number }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Connected Cube Lines */}
    <line x1="12" y1="3" x2="5" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="3" x2="19" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="3" x2="12" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

    <line x1="5" y1="7" x2="5" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="5" y1="7" x2="9" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

    <line x1="19" y1="7" x2="19" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="19" y1="7" x2="15" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

    <line x1="12" y1="21" x2="5" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="21" x2="19" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="21" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

    <line x1="5" y1="17" x2="9" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="19" y1="17" x2="15" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

    {/* Database Cylinder Stack in Center (with white fill to mask behind lines) */}
    <path
      d="M 9 10 L 9 14 A 3 1.2 0 0 0 15 14 L 15 10 A 3 1.2 0 0 0 9 10 Z"
      fill="white"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <ellipse cx="12" cy="10" rx="3" ry="1.2" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <path d="M 9 12 A 3 1.2 0 0 0 15 12" fill="none" stroke="currentColor" strokeWidth="1.5" />

    {/* Six Outer Nodes (Circles) */}
    <circle cx="12" cy="3" r="1.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="5" cy="7" r="1.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="19" cy="7" r="1.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="5" cy="17" r="1.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="19" cy="17" r="1.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="21" r="1.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

interface SidebarProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: user_role;
    companyName?: string | null;
    teamLeadName?: string | null;
    image?: string | null;
    bio?: string | null;
  };
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ user, isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();

  // Display Picture (DP) Crop and Upload state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Shift Duty States
  const [dutyStatus, setDutyStatus] = useState<string>("OFF_DUTY");
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [isTogglingDuty, setIsTogglingDuty] = useState(false);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [shiftNotesInput, setShiftNotesInput] = useState("");

  // Attendance Telemetry for Company Owner & TL
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceTab, setAttendanceTab] = useState<"NOT_SIGNED_IN" | "ON_DUTY" | "ON_BREAK">("NOT_SIGNED_IN");

  // Workstation Agent 1-Click Installation Modal
  const [showAgentInstallModal, setShowAgentInstallModal] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [attendanceData, setAttendanceData] = useState<{
    totalCount: number;
    onDutyCount: number;
    onBreakCount: number;
    notSignedInCount: number;
    onDutyMembers: any[];
    onBreakMembers: any[];
    notSignedInMembers: any[];
  }>({
    totalCount: 0,
    onDutyCount: 0,
    onBreakCount: 0,
    notSignedInCount: 0,
    onDutyMembers: [],
    onBreakMembers: [],
    notSignedInMembers: []
  });

  // Fetch Duty Status and Attendance Telemetry
  useEffect(() => {
    getUserCurrentDutyAction().then(res => {
      if (res.success) {
        setDutyStatus(res.dutyStatus || "OFF_DUTY");
        setClockInTime(res.clockInTime || null);
      }
    });

    if (["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD"].includes(user.role)) {
      getCompanyDutyAttendanceAction().then(res => {
        if (res.success && res.totalCount !== undefined) {
          setAttendanceData(res as any);
        }
      });
    }
  }, [user.role]);

  const handleToggleDuty = async (newStatus: "ON_DUTY" | "ON_BREAK" | "OFF_DUTY", notes?: string) => {
    setIsTogglingDuty(true);
    try {
      const res = await toggleShiftDutyAction(newStatus, notes);
      if (res.success) {
        setDutyStatus(res.dutyStatus || "OFF_DUTY");
        toast.success(`Shift duty set to ${newStatus.replace("_", " ")}`);
        setShowClockOutModal(false);
        setShiftNotesInput("");
        if (["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD"].includes(user.role)) {
          const attRes = await getCompanyDutyAttendanceAction();
          if (attRes.success && attRes.totalCount !== undefined) setAttendanceData(attRes as any);
        }
      } else {
        toast.error(res.error || "Failed to update shift duty.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update shift duty.");
    } finally {
      setIsTogglingDuty(false);
    }
  };

  // User Bio States
  const [showBioModal, setShowBioModal] = useState(false);
  const [bioInput, setBioInput] = useState(user.bio || "");
  const [currentBio, setCurrentBio] = useState(user.bio || "");
  const [isUpdatingBio, setIsUpdatingBio] = useState(false);

  const handleUpdateBio = async () => {
    setIsUpdatingBio(true);
    try {
      const res = await updateUserBioAction(bioInput);
      if (res.success) {
        setCurrentBio(res.bio || "");
        setShowBioModal(false);
        toast.success("Bio updated successfully!");
      } else {
        toast.error(res.error || "Failed to update bio.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update bio.");
    } finally {
      setIsUpdatingBio(false);
    }
  };
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Restore sidebar scroll position on route changes & initial mount
  useEffect(() => {
    const savedPos = sessionStorage.getItem("sidebar_scroll_pos");
    if (navRef.current && savedPos) {
      navRef.current.scrollTop = parseInt(savedPos, 10);
    }
  }, [pathname]);

  const handleNavScroll = (e: React.UIEvent<HTMLElement>) => {
    sessionStorage.setItem("sidebar_scroll_pos", e.currentTarget.scrollTop.toString());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result as string);
        setZoom(1);
        setRotation(0);
        setOffsetX(0);
        setOffsetY(0);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStart) {
      setOffsetX(e.clientX - dragStart.x);
      setOffsetY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUpOrLeave = () => {
    setDragStart(null);
  };

  const handleSaveAvatar = async () => {
    if (!imageSrc) return;
    setIsUploading(true);

    const img = new Image();
    img.src = imageSrc;
    img.onload = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 160;
      canvas.height = 160;

      ctx.clearRect(0, 0, 160, 160);

      // Circle clip path
      ctx.beginPath();
      ctx.arc(80, 80, 80, 0, Math.PI * 2);
      ctx.clip();

      ctx.translate(80, 80);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.translate(-80, -80);

      const imgAspect = img.width / img.height;
      let drawW = 160;
      let drawH = 160;
      let drawX = 0;
      let drawY = 0;

      if (imgAspect > 1) {
        drawW = 160 * imgAspect;
        drawX = (160 - drawW) / 2;
      } else {
        drawH = 160 / imgAspect;
        drawY = (160 - drawH) / 2;
      }

      ctx.drawImage(img, drawX + (offsetX * (160 / 200)), drawY + (offsetY * (160 / 200)), drawW, drawH);

      const croppedBase64 = canvas.toDataURL("image/jpeg", 0.85);

      try {
        const { uploadUserAvatarAction } = await import("@/app/actions/users");
        const res = await uploadUserAvatarAction(croppedBase64);
        if (res.success) {
          toast.success("Display Picture saved successfully!");
          setShowUploadModal(false);
          setImageSrc(null);
          setSelectedFile(null);
          window.location.reload();
        } else {
          toast.error(res.error || "Failed to save avatar.");
        }
      } catch (err: any) {
        toast.error("Upload failed: " + err.message);
      } finally {
        setIsUploading(false);
      }
    };
  };

  // Change Password state
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changePassError, setChangePassError] = useState<string | null>(null);
  const [changePassSuccess, setChangePassSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // IT Configurations state
  const [showITConfigOverlay, setShowITConfigOverlay] = useState(false);
  const { facebookCost, vintedCost, updateFacebookCost, updateVintedCost } = useITConfig();
  const [tempFbCost, setTempFbCost] = useState(facebookCost.toString());
  const [tempVintedCost, setTempVintedCost] = useState(vintedCost.toString());

  useEffect(() => {
    setTempFbCost(facebookCost.toString());
  }, [facebookCost]);

  useEffect(() => {
    setTempVintedCost(vintedCost.toString());
  }, [vintedCost]);

  // Dynamic notification & badge status combined polling
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [pendingLeavesCount, setPendingLeavesCount] = useState<number>(0);
  const [chatStatus, setChatStatus] = useState<{ hasUnread: boolean; hasJoinRequests: boolean }>({
    hasUnread: false,
    hasJoinRequests: false
  });
  const [specialRequestStatus, setSpecialRequestStatus] = useState<{ hasUnread: boolean; dotColor: "red" | "orange" | "green" | null }>({
    hasUnread: false,
    dotColor: null
  });

  useEffect(() => {
    let isMounted = true;

    const fetchAllBadges = async () => {
      if (document.hidden) return;

      try {
        const promises: Promise<any>[] = [
          getChatBadgeStatusAction().catch(() => ({ hasUnread: false, hasJoinRequests: false })),
          getSpecialRequestsBadgeStatusAction().catch(() => ({ hasUnread: false, dotColor: null })),
          getPendingLeaveApprovalsCountAction().catch(() => ({ count: 0 }))
        ];

        if (user.role === "TEAM_LEAD") {
          promises.push(getPendingTLRequestsCountAction().catch(() => 0));
        }

        const [chatRes, specialRes, leavesRes, tlRes] = await Promise.all(promises);

        if (!isMounted) return;

        if (chatRes) setChatStatus(chatRes);
        if (specialRes) setSpecialRequestStatus(specialRes);
        if (leavesRes) setPendingLeavesCount(leavesRes?.count || 0);
        if (tlRes !== undefined) setPendingRequestsCount(tlRes);
      } catch (err) {
        console.error("Badge polling error:", err);
      }
    };

    fetchAllBadges();
    const interval = setInterval(fetchAllBadges, 25000); // Efficient 25s loop

    const onFocus = () => fetchAllBadges();
    window.addEventListener("focus", onFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user.role]);

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);
    setChangePassSuccess(false);

    if (!newPassword.trim()) {
      setChangePassError("Password cannot be empty.");
      return;
    }

    if (newPassword.trim().length < 8) {
      setChangePassError("Password must be at least 8 characters.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateUserPasswordAction(newPassword.trim());
        if (res.success) {
          setChangePassSuccess(true);
          setNewPassword("");
          setTimeout(() => {
            setShowChangePassModal(false);
            setChangePassSuccess(false);
          }, 2000);
        }
      } catch (err: any) {
        setChangePassError(err.message || "Failed to change password.");
      }
    });
  };

  // Define sidebar menu options based on user role permissions
  const menuItems = [
    { 
      id: "dashboard", 
      label: "Dashboard", 
      path: "/", 
      icon: LayoutDashboard,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"] 
    },
    { 
      id: "accounts", 
      label: user.role === "TEAM_LEAD" ? "My Data / Add Account" : "User Data", 
      path: "/accounts", 
      icon: Database,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"] 
    },
    {
      id: "chat-space",
      label: "Chat Workspace",
      path: "/chat-space",
      icon: MessageSquare,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"]
    },
    {
      id: "master-accounts-pool",
      label: "Master Accounts Pool",
      path: "/master-accounts-pool",
      icon: DatabaseCubeIcon,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]
    },
    {
      id: "team-live-roster",
      label: "Team Live Roster",
      path: "/team-live-roster",
      icon: Users,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD"]
    },
    { 
      id: "screen-telemetry", 
      label: "Screen Audit", 
      path: "/screen-telemetry", 
      icon: Monitor,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"] 
    },
    { 
      id: "workstation-telemetry", 
      label: "Workstation Hardware", 
      path: "/workstation-telemetry", 
      icon: Cpu,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"] 
    },
    { 
      id: "system-health", 
      label: "Hosting & System Health", 
      path: "/system-health", 
      icon: Activity,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"] 
    },
    { 
      id: "associates-requests", 
      label: "Associates Requests", 
      path: "/associates-requests", 
      icon: ClipboardCheck,
      roles: ["TEAM_LEAD"] 
    },
    { 
      id: "my-team", 
      label: "My Team", 
      path: "/my-team", 
      icon: UserCheck,
      roles: ["TEAM_LEAD"] 
    },
    { 
      id: "team-performance-stats", 
      label: "Team Stats", 
      path: "/team-performance-stats", 
      icon: TrendingUp,
      roles: ["TEAM_LEAD", "SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"] 
    },
    { 
      id: "download-agent", 
      label: `Agent V-${CURRENT_AGENT_VERSION} (.zip)`, 
      path: "/api/download-agent", 
      icon: Laptop,
      isDownload: true,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"] 
    },
    { 
      id: "team-leads", 
      label: "Team Leads", 
      path: "/team-leads", 
      icon: UserCheck,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"] 
    },
    { 
      id: "it-management", 
      label: "IT Management", 
      path: "/it-management", 
      icon: Shield,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"] 
    },
    {
      id: "companies",
      label: "Companies Directory",
      path: "/companies",
      icon: Building2,
      roles: ["SUPER_ADMIN"]
    },
    { 
      id: "it-accounts-parser", 
      label: "IT Accounts Parser", 
      path: "/it-accounts-parser", 
      icon: ClipboardCheck,
      roles: ["IT_DEPARTMENT"] 
    },
    { 
      id: "it-operational-logs", 
      label: "IT Operational Logs", 
      path: "/it-operational-logs", 
      icon: ClipboardCheck,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER"] 
    },
    { 
      id: "feedback", 
      label: "Submit Feedback", 
      path: "/feedback", 
      icon: MessageSquare,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"] 
    },
    { 
      id: "settings", 
      label: user.role === "SUPER_ADMIN" ? "Platform Shard" : (user.role === "IT_DEPARTMENT" ? "User Management" : "Rule Engine"), 
      path: "/settings", 
      icon: Sliders,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"] 
    },
    { 
      id: "personal-notes", 
      label: "My Personal Notes", 
      path: "/personal-notes", 
      icon: FileText,
      roles: ["TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"] 
    },
    { 
      id: "special-requests", 
      label: ["TEAM_LEAD", "SALES_ASSOCIATE"].includes(user.role) ? "Special Request" : "Special Requests", 
      path: "/special-requests", 
      icon: HelpCircle,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"] 
    },
    {
      id: "uk-market-trends",
      label: "UK Market Trends",
      path: "/uk-market-trends",
      icon: TrendingUp,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE"]
    },
    { 
      id: "announcements", 
      label: "Announcements", 
      path: "/announcements", 
      icon: Megaphone,
      roles: ["COMPANY_OWNER", "IT_DEPARTMENT"] 
    },
    {
      id: "it-config",
      label: "IT Configurations",
      path: "#it-config",
      icon: Wallet,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]
    },
    { 
      id: "audit-logs", 
      label: "Audit Logs", 
      path: "/audit-logs", 
      icon: FileText,
      roles: ["SUPER_ADMIN"] 
    }
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));
  const userInitials = user.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "OP";

  const getDesignation = (role: user_role) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "COMPANY_OWNER":
        return "Company Owner";
      case "TEAM_LEAD":
        return "Team Lead";
      case "SALES_ASSOCIATE":
        return "Sales Representative";
      case "IT_DEPARTMENT":
        return "IT Operations";
      default:
        return "Member";
    }
  };

  return (
    <>
      <aside 
        className={`sidebar ${isOpen ? 'mobile-open' : ''}`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "var(--sidebar-width)",
          background: "linear-gradient(180deg, #141226 0%, #0E0C1B 100%)",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          zIndex: 100,
          color: "#FFFFFF",
          boxShadow: "10px 0 35px rgba(0, 0, 0, 0.45)"
        }}
      >
        {/* Floating Circular Blue Sidebar Toggle Arrow Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: "absolute",
            top: "28px",
            right: "-14px",
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
            color: "#FFFFFF",
            border: "2.5px solid #0E0C1B",
            boxShadow: "0 4px 14px rgba(59, 130, 246, 0.6)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 110,
            transition: "transform 0.2s ease"
          }}
          title="Toggle Sidebar"
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* User Profile Header ("Hello 👋 Kafka") */}
        <div style={{
          padding: "1.75rem 1.25rem 1.25rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.85rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
        }}>
          {/* User DP Circle Avatar */}
          <div 
            onClick={() => setShowUploadModal(true)}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontWeight: 900,
              fontSize: "1.15rem",
              overflow: "hidden",
              cursor: "pointer",
              flexShrink: 0,
              boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)",
              border: "1.5px solid rgba(255, 255, 255, 0.25)"
            }}
            title="Click to edit Display Picture"
          >
            {user.image && !imgError ? (
              <img 
                src={user.image} 
                alt={user.name || "Operator"} 
                onError={() => setImgError(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            ) : (
              <span>{userInitials}</span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.78rem", color: "#94A3B8", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
              Hello 👋
            </div>
            <div style={{ 
              fontSize: "1.1rem", 
              fontWeight: 800, 
              color: "#FFFFFF", 
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }} title={user.name || "Operator"}>
              {user.name || "Operator"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem" }}>
              <span style={{ 
                fontSize: "0.68rem", 
                fontWeight: 700, 
                color: "#60A5FA", 
                background: "rgba(59, 130, 246, 0.15)",
                borderRadius: "6px",
                padding: "0.1rem 0.45rem",
                display: "inline-block"
              }}>
                {getDesignation(user.role)}
              </span>

              {/* Edit Bio Trigger Icon */}
              <button
                type="button"
                onClick={() => setShowBioModal(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center"
                }}
                title="Edit User Bio"
              >
                <Pencil size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Links Menu */}
        <nav 
          ref={navRef} 
          onScroll={handleNavScroll}
          style={{
            flex: 1,
            padding: "1rem 0.85rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            overflowY: "auto"
          }}
        >
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            if (item.id === "it-config") {
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setIsOpen(false);
                    setShowITConfigOverlay(true);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: "0.75rem 1rem",
                    color: "#94A3B8",
                    borderRadius: "12px",
                    fontSize: "0.88rem",
                    fontWeight: 500,
                    gap: "0.85rem",
                    transition: "all 0.2s ease"
                  }}
                >
                  <Icon size={19} style={{ color: "#64748B" }} />
                  <span>{item.label}</span>
                </button>
              );
            }

            if ((item as any).isDownload) {
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setIsOpen(false);
                    setShowAgentInstallModal(true);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: "0.75rem 1rem",
                    color: "#94A3B8",
                    borderRadius: "12px",
                    fontSize: "0.88rem",
                    fontWeight: 500,
                    gap: "0.85rem",
                    transition: "all 0.2s ease"
                  }}
                >
                  <Icon size={19} style={{ color: "#64748B" }} />
                  <span>{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.path}
                scroll={false}
                prefetch={true}
                onClick={() => setIsOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.85rem",
                  padding: "0.75rem 1rem",
                  color: isActive ? "#FFFFFF" : "#94A3B8",
                  fontWeight: isActive ? 800 : 500,
                  fontSize: "0.88rem",
                  textDecoration: "none",
                  borderRadius: "12px",
                  background: isActive ? "rgba(255, 255, 255, 0.09)" : "transparent",
                  position: "relative",
                  transition: "all 0.2s ease",
                  boxShadow: isActive ? "inset 0 1px 0 rgba(255,255,255,0.1)" : "none"
                }}
              >
                {/* Glowing Neon Green Indicator Notch for Active Item */}
                {isActive && (
                  <span 
                    style={{
                      position: "absolute",
                      left: "-0.85rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "5px",
                      height: "65%",
                      borderRadius: "0 6px 6px 0",
                      background: "#10B981",
                      boxShadow: "0 0 14px #10B981, 0 0 24px rgba(16, 185, 129, 0.9)"
                    }}
                  />
                )}

                <Icon size={19} style={{ color: isActive ? "#38BDF8" : "#64748B", transition: "color 0.2s ease" }} />
                <span>{item.label}</span>

                {/* Badge Indicator Pills */}
                {item.id === "associates-requests" && pendingRequestsCount > 0 && (
                  <span 
                    style={{
                      marginLeft: "auto",
                      background: "#F59E0B",
                      color: "#000000",
                      borderRadius: "6px",
                      padding: "0.15rem 0.55rem",
                      fontSize: "0.75rem",
                      fontWeight: 900,
                      lineHeight: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 10px rgba(245, 158, 11, 0.5)"
                    }}
                  >
                    {pendingRequestsCount}
                  </span>
                )}
                {item.id === "chat-space" && (chatStatus.hasUnread || chatStatus.hasJoinRequests) && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginLeft: "auto" }}>
                    {chatStatus.hasJoinRequests && (
                      <span 
                        style={{
                          width: "9px",
                          height: "9px",
                          borderRadius: "50%",
                          background: "#3B82F6",
                          boxShadow: "0 0 8px #3B82F6",
                          display: "inline-block"
                        }}
                        title="Pending Join Requests"
                      />
                    )}
                    {chatStatus.hasUnread && (
                      <span 
                        style={{
                          width: "9px",
                          height: "9px",
                          borderRadius: "50%",
                          background: "#10B981",
                          boxShadow: "0 0 8px #10B981",
                          display: "inline-block"
                        }}
                        title="Unread Messages"
                      />
                    )}
                  </div>
                )}
                {item.id === "special-requests" && specialRequestStatus.hasUnread && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginLeft: "auto" }}>
                    <span 
                      style={{
                        width: "9px",
                        height: "9px",
                        borderRadius: "50%",
                        background: specialRequestStatus.dotColor === "red" 
                          ? "#EF4444" 
                          : specialRequestStatus.dotColor === "orange" 
                            ? "#F59E0B" 
                            : "#10B981",
                        boxShadow: specialRequestStatus.dotColor === "red" 
                          ? "0 0 10px #EF4444" 
                          : specialRequestStatus.dotColor === "orange" 
                            ? "0 0 10px #F59E0B" 
                            : "0 0 10px #10B981",
                        display: "inline-block"
                      }}
                      title="Support Request Alert"
                    />
                  </div>
                )}
                {item.id === "leave-requests" && pendingLeavesCount > 0 && (
                  <span 
                    style={{
                      marginLeft: "auto",
                      background: "#F59E0B",
                      color: "#000000",
                      borderRadius: "6px",
                      padding: "0.15rem 0.55rem",
                      fontSize: "0.75rem",
                      fontWeight: 900
                    }}
                  >
                    {pendingLeavesCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Quick Action Card ("Add New Account") */}
        <div 
          onClick={() => {
            setIsOpen(false);
            window.location.href = "/accounts";
          }}
          style={{
            margin: "0.85rem 1rem",
            padding: "1.25rem 1rem",
            borderRadius: "16px",
            border: "1.5px dashed rgba(255, 255, 255, 0.18)",
            background: "rgba(255, 255, 255, 0.03)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.45rem",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          title="Click to launch Account Wizard"
        >
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(59, 130, 246, 0.6)",
            border: "1.5px solid rgba(255, 255, 255, 0.2)"
          }}>
            <Plus size={20} />
          </div>
          <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
            Add new account
          </div>
          <div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>
            Launch 6-Step Wizard
          </div>
        </div>

        {/* Sidebar Footer Logout Bar */}
        <div style={{
          padding: "0.75rem 1rem 1.25rem 1rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem"
        }}>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
              padding: "0.65rem 1rem",
              width: "100%",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#F87171",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              borderRadius: "10px",
              transition: "all 0.2s ease"
            }}
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </aside>


      {/* Change Password Modal */}
      {showChangePassModal && (
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
            maxWidth: "400px",
            width: "100%",
            padding: "2rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            boxShadow: "var(--shadow-premium)"
          }}>
            <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>CHANGE PASSWORD</h2>

            {changePassError && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                {changePassError}
              </div>
            )}

            {changePassSuccess && (
              <div style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-success)", fontSize: "0.85rem" }}>
                Password changed and synchronized in real-time.
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-gold"
                  disabled={isPending}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowChangePassModal(false)}
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
                  {isPending ? "Saving..." : "Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* IT Configurations Sliding Panel Overlay */}
      {showITConfigOverlay && (
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
          justifyContent: "flex-end",
          animation: "fade-in 0.25s ease"
        }}
        onClick={() => setShowITConfigOverlay(false)}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes slide-in-right {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          ` }} />
          <div className="glass-panel" 
            style={{
              width: "360px",
              height: "100%",
              padding: "2rem",
              background: "#FFFFFF",
              borderLeft: "1px solid var(--border-dim)",
              boxShadow: "var(--shadow-premium)",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              animation: "slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>
                IT Configurations
              </h2>
              <button 
                onClick={() => setShowITConfigOverlay(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.4", margin: 0 }}>
              Adjust operational cost configurations for unverified account verification tracking.
            </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", margin: "1rem 0" }}>
               {/* Facebook verification cost input */}
               <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                 <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                   <span style={{
                     width: "8px",
                     height: "8px",
                     borderRadius: "50%",
                     background: "#1877F2",
                     display: "inline-block"
                   }} />
                   <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                     Facebook Verification Cost (PKR)
                   </label>
                 </div>
                 <input
                   type="number"
                   min="0"
                   value={tempFbCost}
                   onChange={(e) => setTempFbCost(e.target.value)}
                   placeholder="300"
                   className="input-gold"
                   style={{
                     fontSize: "0.85rem",
                     padding: "0.6rem 0.85rem"
                   }}
                 />
                 <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: "1.3" }}>
                   Used to calculate the estimated cost for unverified Facebook accounts.
                 </span>
               </div>

               {/* Vinted verification cost input */}
               <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                 <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                   <span style={{
                     width: "8px",
                     height: "8px",
                     borderRadius: "50%",
                     background: "#00A896",
                     display: "inline-block"
                   }} />
                   <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                     Vinted Verification Cost (PKR)
                   </label>
                 </div>
                 <input
                   type="number"
                   min="0"
                   value={tempVintedCost}
                   onChange={(e) => setTempVintedCost(e.target.value)}
                   placeholder="300"
                   className="input-gold"
                   style={{
                     fontSize: "0.85rem",
                     padding: "0.6rem 0.85rem"
                   }}
                 />
                 <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: "1.3" }}>
                   Used to calculate the estimated cost for unverified Vinted accounts.
                 </span>
               </div>
             </div>

             <div style={{ display: "flex", gap: "1rem", marginTop: "auto" }}>
               <button
                 type="button"
                 onClick={() => setShowITConfigOverlay(false)}
                 className="btn-glass"
                 style={{ flex: 1 }}
               >
                 Cancel
               </button>
               <button
                 type="button"
                 className="btn-gold"
                 style={{ flex: 1 }}
                 onClick={async () => {
                   const fbVal = parseFloat(tempFbCost);
                   const vintedVal = parseFloat(tempVintedCost);
                   if (isNaN(fbVal) || fbVal < 0 || isNaN(vintedVal) || vintedVal < 0) {
                     alert("Please enter valid verification costs.");
                     return;
                   }
                   const successFb = await updateFacebookCost(fbVal);
                   const successVinted = await updateVintedCost(vintedVal);
                   if (successFb && successVinted) {
                     setShowITConfigOverlay(false);
                     window.location.reload();
                   } else {
                     alert("Failed to update IT configurations.");
                   }
                 }}
               >
                 Save
               </button>
            </div>
          </div>
        </div>
      )}
      {/* circular crop display picture upload modal */}
      {showUploadModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(3, 4, 94, 0.45)",
          backdropFilter: "blur(8px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div className="glass-panel" style={{
            maxWidth: "480px",
            width: "100%",
            padding: "2rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            boxShadow: "0 20px 40px rgba(0, 119, 182, 0.15)",
            boxSizing: "border-box"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="text-gold-gradient" style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, letterSpacing: "0.02em" }}>
                Upload Display Picture
              </h2>
              <button 
                onClick={() => { setShowUploadModal(false); setImageSrc(null); setSelectedFile(null); }}
                style={{ 
                  background: "none", 
                  border: "none", 
                  cursor: "pointer", 
                  color: "var(--text-muted)", 
                  fontSize: "1.2rem",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%"
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              Select an image file, adjust zoom, rotate, and drag the picture inside the circle frame below.
            </p>

            {/* Hidden Input or Dropzone */}
            {!imageSrc ? (
              <div 
                style={{
                  border: "2px dashed var(--border-gold)",
                  borderRadius: "12px",
                  padding: "2.5rem 1.5rem",
                  textAlign: "center",
                  background: "rgba(0, 119, 182, 0.02)",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onClick={() => {
                  const input = document.getElementById("avatar-file-input");
                  if (input) input.click();
                }}
              >
                <input 
                  type="file" 
                  id="avatar-file-input" 
                  accept="image/*" 
                  style={{ display: "none" }} 
                  onChange={handleFileChange}
                />
                <span style={{ fontSize: "2.2rem", display: "block", marginBottom: "0.5rem" }}>🖼️</span>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Click to choose image
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginTop: "0.35rem" }}>
                  Supports PNG, JPG, WEBP (Max 5MB)
                </span>
              </div>
            ) : (
              /* Cropper / Preview Controls */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem", width: "100%", boxSizing: "border-box" }}>
                {/* Circular Crop Frame with dragging */}
                <div 
                  style={{
                    width: "200px",
                    height: "200px",
                    borderRadius: "50%",
                    border: "4px solid #0077B6",
                    boxShadow: "0 8px 24px rgba(0, 119, 182, 0.2)",
                    overflow: "hidden",
                    position: "relative",
                    background: "#000",
                    cursor: "grab",
                    flexShrink: 0
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                >
                  <img 
                    src={imageSrc} 
                    alt="Preview" 
                    draggable={false}
                    style={{
                      position: "absolute",
                      transformOrigin: "center center",
                      transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom}) rotate(${rotation}deg)`,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      userSelect: "none"
                    }}
                  />
                </div>

                {/* Crop Zoom & Rotation Sliders */}
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.85rem", boxSizing: "border-box", padding: "0 0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", width: "100%" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", minWidth: "55px" }}>Zoom</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="3" 
                      step="0.05"
                      value={zoom} 
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: "#0077B6", minWidth: 0 }}
                    />
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0077B6", minWidth: "42px", textAlign: "right" }}>
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", width: "100%" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", minWidth: "55px" }}>Rotate</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="360" 
                      step="1"
                      value={rotation} 
                      onChange={(e) => setRotation(parseInt(e.target.value))}
                      style={{ flex: 1, accentColor: "#0077B6", minWidth: 0 }}
                    />
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0077B6", minWidth: "42px", textAlign: "right" }}>
                      {rotation}°
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "0.85rem", width: "100%", marginTop: "0.25rem" }}>
                  <button
                    type="button"
                    onClick={() => { setImageSrc(null); setSelectedFile(null); }}
                    style={{
                      flex: 1,
                      height: "44px",
                      background: "rgba(0, 0, 0, 0.04)",
                      border: "1px solid var(--border-dim)",
                      borderRadius: "8px",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                    disabled={isUploading}
                  >
                    Change Image
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAvatar}
                    style={{
                      flex: 1,
                      height: "44px",
                      background: "linear-gradient(135deg, #0077B6 0%, #0250A1 100%)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#FFFFFF",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(0, 119, 182, 0.25)"
                    }}
                    disabled={isUploading}
                  >
                    {isUploading ? "Saving..." : "Save Photo"}
                  </button>
                </div>
              </div>
            )}

            {/* Hidden canvas to perform circular crop */}
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
        </div>
      )}

      {/* Glassmorphic User Bio Update Modal */}
      {showBioModal && (
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
            maxWidth: "400px",
            width: "100%",
            padding: "2rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            boxShadow: "var(--shadow-premium)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Update User Bio</h3>
              <button 
                type="button" 
                onClick={() => setShowBioModal(false)} 
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 700 }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Brief Biography (Max 200 chars)
              </label>
              <textarea
                rows={4}
                value={bioInput}
                maxLength={200}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Write a brief about yourself or operational role..."
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-dim)",
                  fontSize: "0.82rem",
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                  background: "#F9FAFB"
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                  {bioInput.length}/200
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="btn-glass"
                onClick={() => setShowBioModal(false)}
                style={{ padding: "0.5rem 1rem", fontSize: "0.78rem" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-gold"
                onClick={handleUpdateBio}
                disabled={isUpdatingBio}
                style={{ padding: "0.5rem 1.25rem", fontSize: "0.78rem" }}
              >
                {isUpdatingBio ? "Saving..." : "Save Bio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Sign Out (Clock Out) Work Summary Modal */}
      {showClockOutModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(3, 4, 94, 0.45)",
          backdropFilter: "blur(8px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div className="glass-panel" style={{
            maxWidth: "440px",
            width: "100%",
            padding: "1.75rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            boxShadow: "0 20px 40px rgba(0, 119, 182, 0.15)",
            boxSizing: "border-box"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <UserX size={18} style={{ color: "#EF4444" }} />
                <span>Sign Out of Shift</span>
              </h3>
              <button 
                onClick={() => setShowClockOutModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.1rem" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              You are about to sign out of your active shift. Optionally add a short summary of work completed today for your Team Lead / Owner.
            </p>

            <textarea
              rows={3}
              value={shiftNotesInput}
              onChange={(e) => setShiftNotesInput(e.target.value)}
              placeholder="e.g. Completed 12 account verifications, 4 ads published..."
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
                boxSizing: "border-box"
              }}
            />

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-glass"
                onClick={() => setShowClockOutModal(false)}
                style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleDuty("OFF_DUTY", shiftNotesInput)}
                disabled={isTogglingDuty}
                style={{
                  padding: "0.55rem 1.25rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  background: "#EF4444",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)"
                }}
              >
                {isTogglingDuty ? "Signing Out..." : "Confirm Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Owner Attendance Telemetry & Not Signed In Tracker Modal */}
      {showAttendanceModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(3, 4, 94, 0.45)",
          backdropFilter: "blur(8px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div className="glass-panel" style={{
            maxWidth: "600px",
            width: "100%",
            maxHeight: "85vh",
            padding: "1.75rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            boxShadow: "0 25px 50px rgba(0, 119, 182, 0.2)",
            boxSizing: "border-box",
            overflow: "hidden"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Users size={20} style={{ color: "#0077B6" }} />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  Shift Attendance & Not Signed In Tracker
                </h3>
              </div>
              <button 
                onClick={() => setShowAttendanceModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setAttendanceTab("NOT_SIGNED_IN")}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  borderRadius: "8px",
                  border: "none",
                  background: attendanceTab === "NOT_SIGNED_IN" ? "rgba(239, 68, 68, 0.12)" : "transparent",
                  color: attendanceTab === "NOT_SIGNED_IN" ? "#EF4444" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem"
                }}
              >
                <span>🔴 Not Signed In Today</span>
                <span style={{ background: "#EF4444", color: "#FFF", borderRadius: "10px", padding: "0.05rem 0.4rem", fontSize: "0.65rem" }}>
                  {attendanceData.notSignedInCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAttendanceTab("ON_DUTY")}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  borderRadius: "8px",
                  border: "none",
                  background: attendanceTab === "ON_DUTY" ? "rgba(16, 185, 129, 0.12)" : "transparent",
                  color: attendanceTab === "ON_DUTY" ? "#10B981" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem"
                }}
              >
                <span>🟢 On Duty</span>
                <span style={{ background: "#10B981", color: "#FFF", borderRadius: "10px", padding: "0.05rem 0.4rem", fontSize: "0.65rem" }}>
                  {attendanceData.onDutyCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAttendanceTab("ON_BREAK")}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  borderRadius: "8px",
                  border: "none",
                  background: attendanceTab === "ON_BREAK" ? "rgba(245, 158, 11, 0.12)" : "transparent",
                  color: attendanceTab === "ON_BREAK" ? "#F59E0B" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem"
                }}
              >
                <span>🟡 On Break</span>
                <span style={{ background: "#F59E0B", color: "#FFF", borderRadius: "10px", padding: "0.05rem 0.4rem", fontSize: "0.65rem" }}>
                  {attendanceData.onBreakCount}
                </span>
              </button>
            </div>

            {/* Member List Rendering */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem", paddingRight: "0.25rem" }}>
              {attendanceTab === "NOT_SIGNED_IN" && (
                attendanceData.notSignedInMembers.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "#10B981", fontWeight: 700, fontSize: "0.88rem" }}>
                    🎉 All team members have signed in today!
                  </div>
                ) : (
                  attendanceData.notSignedInMembers.map((m: any) => (
                    <div key={m.id} style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.65rem 0.85rem",
                      background: "rgba(239, 68, 68, 0.04)",
                      border: "1px solid rgba(239, 68, 68, 0.15)",
                      borderRadius: "10px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                        <div style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "#EF4444",
                          color: "#FFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "0.85rem"
                        }}>
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{m.name}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{m.email} • {m.role.replace("_", " ")}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#EF4444", background: "rgba(239, 68, 68, 0.12)", padding: "0.2rem 0.55rem", borderRadius: "12px" }}>
                        Not Signed In
                      </span>
                    </div>
                  ))
                )
              )}

              {attendanceTab === "ON_DUTY" && (
                attendanceData.onDutyMembers.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                    No members currently on duty.
                  </div>
                ) : (
                  attendanceData.onDutyMembers.map((m: any) => (
                    <div key={m.id} style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.65rem 0.85rem",
                      background: "rgba(16, 185, 129, 0.04)",
                      border: "1px solid rgba(16, 185, 129, 0.15)",
                      borderRadius: "10px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                        <div style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "#10B981",
                          color: "#FFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "0.85rem"
                        }}>
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{m.name}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{m.email} • {m.role.replace("_", " ")}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#10B981", background: "rgba(16, 185, 129, 0.12)", padding: "0.2rem 0.55rem", borderRadius: "12px" }}>
                        🟢 On Duty
                      </span>
                    </div>
                  ))
                )
              )}

              {attendanceTab === "ON_BREAK" && (
                attendanceData.onBreakMembers.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                    No members currently on break.
                  </div>
                ) : (
                  attendanceData.onBreakMembers.map((m: any) => (
                    <div key={m.id} style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.65rem 0.85rem",
                      background: "rgba(245, 158, 11, 0.04)",
                      border: "1px solid rgba(245, 158, 11, 0.15)",
                      borderRadius: "10px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                        <div style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "#F59E0B",
                          color: "#FFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "0.85rem"
                        }}>
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{m.name}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{m.email} • {m.role.replace("_", " ")}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#F59E0B", background: "rgba(245, 158, 11, 0.12)", padding: "0.2rem 0.55rem", borderRadius: "12px" }}>
                        🟡 On Break
                      </span>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}

    {/* Workstation Agent 1-Click Installation Modal - Rendered globally over workspace */}
    {showAgentInstallModal && (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(8px)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem"
      }}>
        <div className="glass-panel" style={{
          maxWidth: "580px",
          width: "100%",
          padding: "2rem",
          background: "#FFFFFF",
          border: "1px solid var(--border-dim)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          boxShadow: "var(--shadow-premium)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>
              WORKSTATION AGENT V-{CURRENT_AGENT_VERSION} SETUP
            </h2>
            <button
              onClick={() => setShowAgentInstallModal(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.25rem" }}
            >
              ✕
            </button>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "-0.5rem" }}>
            Select your preferred installation method below to enable desktop monitoring on your Windows laptop.
          </p>

          {/* Option 1: 1-Click PowerShell Command */}
          <div style={{ background: "#0F172A", padding: "1.25rem", borderRadius: "10px", border: "1px solid #1E293B" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#38BDF8" }}>
                ⚡ METHOD 1: 1-CLICK POWERSHELL COMMAND (NO WARNINGS)
              </span>
              <span style={{ fontSize: "0.72rem", background: "rgba(16, 185, 129, 0.2)", color: "#10B981", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 700 }}>
                RECOMMENDED
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "#94A3B8", marginBottom: "0.75rem" }}>
              Open PowerShell on your Windows laptop, paste this command, and press Enter. It automatically bypasses Smart App Control and installs in 3 seconds.
            </p>
            <div style={{ background: "#020617", padding: "0.75rem", borderRadius: "6px", border: "1px solid #334155", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#E2E8F0", overflowX: "auto", whiteSpace: "pre", wordBreak: "normal", userSelect: "all", maxWidth: "100%" }}>
              powershell -NoProfile -ExecutionPolicy Bypass -Command &quot;[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13; iwr -useb &apos;https://51-38-71-134.sslip.io/desktop-agent/Install-StaffOps-Workstation.bat&apos; -OutFile &apos;$env:TEMP\Install-StaffOps.bat&apos;; Unblock-File &apos;$env:TEMP\Install-StaffOps.bat&apos;; &amp; &apos;$env:TEMP\Install-StaffOps.bat&apos;&quot;
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13; iwr -useb 'https://51-38-71-134.sslip.io/desktop-agent/Install-StaffOps-Workstation.bat' -OutFile '$env:TEMP\\Install-StaffOps.bat'; Unblock-File '$env:TEMP\\Install-StaffOps.bat'; & '$env:TEMP\\Install-StaffOps.bat'"`;
                  navigator.clipboard.writeText(cmd);
                  setCopiedCommand(true);
                  setTimeout(() => setCopiedCommand(false), 2500);
                }}
                className="btn-gold"
                style={{ flex: 1, minWidth: "140px", padding: "0.6rem", justifyContent: "center" }}
              >
                {copiedCommand ? "✓ Copied!" : "📋 Copy Command"}
              </button>
              <a
                href="/api/download-agent-txt"
                download="Install-StaffOps-Command.txt"
                className="btn-glass"
                style={{ flex: 1, minWidth: "180px", padding: "0.6rem", justifyContent: "center", textDecoration: "none", color: "#38BDF8", borderColor: "#0284C7", display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 700 }}
              >
                <FileText size={15} />
                <span>📄 Download Command .TXT</span>
              </a>
            </div>
          </div>

          {/* Option 2: Download .ZIP Setup Archive */}
          <div style={{ padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-dim)", background: "rgba(248, 250, 252, 0.8)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                📦 METHOD 2: DOWNLOAD SETUP .ZIP ARCHIVE
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Download setup files to extract and run manually.
              </div>
            </div>
            <a href="/api/download-agent" download className="btn-glass" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
              Download .ZIP
            </a>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <button onClick={() => setShowAgentInstallModal(false)} className="btn-glass" style={{ padding: "0.5rem 1.25rem" }}>
              Close
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
}
