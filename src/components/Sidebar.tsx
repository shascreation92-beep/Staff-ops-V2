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
  Pencil,
  HelpCircle,
  TrendingUp,
  Calendar
} from "lucide-react";
import { signOut } from "next-auth/react";
import { user_role } from "@prisma/client";
import { updateUserPasswordAction } from "@/app/actions/users";
import { getPendingTLRequestsCountAction } from "@/app/actions/accounts";
import { getPendingLeaveApprovalsCountAction } from "@/app/actions/leave-requests";
import { updateUserBioAction } from "@/app/actions/profile";
import { useITConfig } from "./ITConfigProvider";
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

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
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update bio.");
    } finally {
      setIsUpdatingBio(false);
    }
  };
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      canvas.width = 250;
      canvas.height = 250;

      ctx.clearRect(0, 0, 250, 250);

      // Circle clip path
      ctx.beginPath();
      ctx.arc(125, 125, 125, 0, Math.PI * 2);
      ctx.clip();

      ctx.translate(125, 125);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.translate(-125, -125);

      const imgAspect = img.width / img.height;
      let drawW = 250;
      let drawH = 250;
      let drawX = 0;
      let drawY = 0;

      if (imgAspect > 1) {
        drawW = 250 * imgAspect;
        drawX = (250 - drawW) / 2;
      } else {
        drawH = 250 / imgAspect;
        drawY = (250 - drawH) / 2;
      }

      ctx.drawImage(img, drawX + offsetX, drawY + offsetY, drawW, drawH);

      const croppedBase64 = canvas.toDataURL("image/png");

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

  // Dynamic notification count for TL requests
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  useEffect(() => {
    if (user.role !== "TEAM_LEAD") return;

    const fetchCount = () => {
      getPendingTLRequestsCountAction()
        .then(count => setPendingRequestsCount(count))
        .catch(err => console.error("Failed to fetch pending requests count", err));
    };

    fetchCount();
    const interval = setInterval(fetchCount, 15000); // refresh every 15 seconds
    return () => clearInterval(interval);
  }, [user.role]);

  // Dynamic chat notification states (unread messages, group join requests)
  const [chatStatus, setChatStatus] = useState<{ hasUnread: boolean; hasJoinRequests: boolean }>({
    hasUnread: false,
    hasJoinRequests: false
  });

  // Dynamic special requests status dot
  const [specialRequestStatus, setSpecialRequestStatus] = useState<{ hasUnread: boolean; dotColor: "red" | "orange" | "green" | null }>({
    hasUnread: false,
    dotColor: null
  });

  useEffect(() => {
    const fetchChatStatus = async () => {
      try {
        const { getChatBadgeStatusAction } = await import("@/app/actions/chat");
        const status = await getChatBadgeStatusAction();
        setChatStatus(status);
      } catch (err) {
        console.error("Failed to fetch chat status badge", err);
      }
    };

    fetchChatStatus();
    const interval = setInterval(fetchChatStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchSpecialRequestStatus = async () => {
      try {
        const { getSpecialRequestsBadgeStatusAction } = await import("@/app/actions/special-requests");
        const status = await getSpecialRequestsBadgeStatusAction();
        setSpecialRequestStatus(status);
      } catch (err) {
        console.error("Failed to fetch special requests badge status", err);
      }
    };

    fetchSpecialRequestStatus();
    const interval = setInterval(fetchSpecialRequestStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Dynamic leave approvals count badge
  const [pendingLeavesCount, setPendingLeavesCount] = useState<number>(0);

  useEffect(() => {
    const fetchLeavesCount = async () => {
      try {
        const res = await getPendingLeaveApprovalsCountAction();
        setPendingLeavesCount(res.count || 0);
      } catch (err) {
        console.error("Failed to fetch pending leaves count", err);
      }
    };

    fetchLeavesCount();
    const interval = setInterval(fetchLeavesCount, 10000);
    return () => clearInterval(interval);
  }, []);

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
      id: "team-leads", 
      label: "Team Leads", 
      path: "/team-leads", 
      icon: UserCheck,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER"] 
    },
    { 
      id: "it-management", 
      label: "IT Management", 
      path: "/it-management", 
      icon: Shield,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER"] 
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
      id: "leave-requests", 
      label: ["COMPANY_OWNER", "SUPER_ADMIN"].includes(user.role) ? "Leave Approvals" : "My Leaves", 
      path: "/leave-requests", 
      icon: Calendar,
      roles: ["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE"] 
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
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      {/* Omagie/Boltz Logo Container */}
      <div className="sidebar-logo-container">
        <div className="sidebar-logo-brand">
          <img src="/logo.png" alt="Worknode Logo" style={{ width: "28px", height: "28px", borderRadius: "6px", objectFit: "cover", marginRight: "0.4rem" }} />
          <span className="sidebar-logo-text">Worknode</span>
        </div>
      </div>

      {/* User Profile Header (Top-ish, below Logo) */}
      <div className="sidebar-profile">
        <style dangerouslySetInnerHTML={{ __html: `
          .profile-action-toolbar {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.6rem;
            margin-bottom: 0.75rem;
          }
          .profile-action-btn {
            background: rgba(173, 232, 244, 0.25);
            border: 1px solid rgba(0, 119, 182, 0.20);
            color: var(--text-primary);
            cursor: pointer;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
          }
          .profile-action-btn:hover {
            background: rgba(173, 232, 244, 0.55);
            border-color: #0096C7;
            color: #0077B6;
            transform: scale(1.1);
            box-shadow: 0 0 10px rgba(72, 202, 228, 0.5);
          }
          .profile-action-btn:active {
            transform: scale(0.95);
          }
        ` }} />

        <div 
          className="profile-avatar-container"
          style={{ position: "relative" }}
        >
          <div className="profile-avatar-circle" style={{ overflow: "hidden", position: "relative" }}>
            <img 
              src={user.image || "/uploads/avatars/default-avatar.png"} 
              alt={user.name || "Operator"} 
              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
            />
          </div>
        </div>

        {/* Profile Action Toolbar */}
        <div className="profile-action-toolbar">
          {/* Edit DP Button */}
          <button 
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="profile-action-btn"
            title="Upload Display Picture"
          >
            <Pencil size={12} />
          </button>

          {/* Change Password Button */}
          {["SUPER_ADMIN", "COMPANY_OWNER"].includes(user.role) && (
            <button
              type="button"
              onClick={() => {
                setNewPassword("");
                setChangePassError(null);
                setChangePassSuccess(false);
                setShowChangePassModal(true);
              }}
              className="profile-action-btn"
              title="Change Password"
            >
              <Key size={12} />
            </button>
          )}

          {/* Edit Bio Button */}
          <button 
            type="button"
            onClick={() => setShowBioModal(true)} 
            className="profile-action-btn"
            title="Edit Bio"
          >
            <FileText size={12} />
          </button>
        </div>

        <div className="profile-info" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
          <span className="profile-name" title={user.name || "Operator"} style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>
            {user.name || "Operator"}
          </span>
          <span 
            className="profile-designation-badge" 
            title={getDesignation(user.role)} 
            style={{ 
              fontSize: "0.68rem", 
              fontWeight: 700, 
              color: "var(--gold-premium)", 
              background: "rgba(173, 232, 244, 0.4)", 
              border: "1px solid rgba(0, 119, 182, 0.15)",
              borderRadius: "12px",
              padding: "0.15rem 0.6rem",
              textAlign: "center",
              display: "inline-block",
              letterSpacing: "0.02em"
            }}
          >
            {getDesignation(user.role)}
          </span>
          <span className="profile-email" title={user.email || ""} style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.05rem" }}>
            {user.email || ""}
          </span>
          <div style={{ 
            marginTop: "0.4rem", 
            padding: "0.4rem 0.5rem", 
            background: "rgba(2, 80, 161, 0.04)", 
            borderRadius: "6px", 
            border: "1px dashed rgba(2, 80, 161, 0.15)",
            display: "flex", 
            flexDirection: "column",
            gap: "0.2rem",
            position: "relative"
          }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--gold-premium)", textTransform: "uppercase", letterSpacing: "0.05em" }}>User Bio</span>
            </div>
            <p style={{ 
              fontSize: "0.68rem", 
              color: currentBio ? "var(--text-secondary)" : "var(--text-muted)", 
              margin: 0, 
              lineHeight: "1.3",
              wordBreak: "break-word",
              fontStyle: currentBio ? "normal" : "italic"
            }}>
              {currentBio || "No bio added yet. Click the edit bio icon above to add a bio."}
            </p>
          </div>
        </div>
      </div>


      <nav className="sidebar-menu">
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
                className="sidebar-item"
                style={{
                  background: "none",
                  border: "none",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  color: "var(--text-secondary)",
                  borderRadius: "8px",
                  fontSize: "0.88rem",
                  fontWeight: 500,
                  gap: "0.75rem"
                }}
              >
                <Icon className="sidebar-icon" size={20} />
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <Icon className="sidebar-icon" size={20} />
              <span>{item.label}</span>
              {item.id === "associates-requests" && pendingRequestsCount > 0 && (
                <span 
                  style={{
                    marginLeft: "auto",
                    background: "linear-gradient(135deg, #ff4d4d, #cc0000)",
                    color: "white",
                    borderRadius: "9999px",
                    padding: "0.15rem 0.5rem",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                    lineHeight: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 8px rgba(239, 68, 68, 0.4)",
                    animation: "pulse 2s infinite"
                  }}
                >
                  🔴 {pendingRequestsCount}
                </span>
              )}
              {item.id === "chat-space" && (chatStatus.hasUnread || chatStatus.hasJoinRequests) && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginLeft: "auto" }}>
                  {chatStatus.hasJoinRequests && (
                    <span 
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#0250A1",
                        boxShadow: "0 0 6px #0250A1",
                        display: "inline-block"
                      }}
                      title="Pending Join Requests"
                    />
                  )}
                  {chatStatus.hasUnread && (
                    <span 
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#10B981",
                        boxShadow: "0 0 6px #10B981",
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
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: specialRequestStatus.dotColor === "red" 
                        ? "#EF4444" 
                        : specialRequestStatus.dotColor === "orange" 
                          ? "#F59E0B" 
                          : "#10B981",
                      boxShadow: specialRequestStatus.dotColor === "red" 
                        ? "0 0 8px #EF4444" 
                        : specialRequestStatus.dotColor === "orange" 
                          ? "0 0 8px #F59E0B" 
                          : "0 0 8px #10B981",
                      display: "inline-block",
                      animation: specialRequestStatus.dotColor === "red" ? "pulse 1.5s infinite" : "none"
                    }}
                    title={`${specialRequestStatus.dotColor === "red" ? "Urgent" : specialRequestStatus.dotColor === "orange" ? "Pending" : "Normal"} Support Request`}
                  />
                </div>
              )}
              {item.id === "leave-requests" && pendingLeavesCount > 0 && (
                <span 
                  style={{
                    marginLeft: "auto",
                    background: "linear-gradient(135deg, #0284C7, #0077B6)",
                    color: "white",
                    borderRadius: "9999px",
                    padding: "0.15rem 0.5rem",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                    lineHeight: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 8px rgba(2, 132, 199, 0.4)"
                  }}
                >
                  {pendingLeavesCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>



      <div className="sidebar-footer-wrap">
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="sidebar-logout-btn"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>


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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>
                UPLOAD DISPLAY PICTURE
              </h2>
              <button 
                onClick={() => { setShowUploadModal(false); setImageSrc(null); setSelectedFile(null); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
              Select an image file, adjust zoom, rotate, and drag the picture inside the circle frame below.
            </p>

            {/* Hidden Input or Dropzone */}
            {!imageSrc ? (
              <div 
                style={{
                  border: "2px dashed var(--border-gold)",
                  borderRadius: "8px",
                  padding: "2rem 1rem",
                  textAlign: "center",
                  background: "#F9FAFB",
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
                <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>🖼️</span>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Click to choose image
                </span>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "block", marginTop: "0.25rem" }}>
                  Supports PNG, JPG, WEBP (Max 5MB)
                </span>
              </div>
            ) : (
              /* Cropper / Preview Controls */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>
                {/* Circular Crop Frame with dragging */}
                <div 
                  style={{
                    width: "180px",
                    height: "180px",
                    borderRadius: "50%",
                    border: "3px solid var(--gold-glow)",
                    overflow: "hidden",
                    position: "relative",
                    background: "#000",
                    cursor: "grab"
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
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)", minWidth: "50px" }}>Zoom</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="3" 
                      step="0.05"
                      value={zoom} 
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: "var(--gold-primary)" }}
                    />
                    <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", width: "30px", textAlign: "right" }}>
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)", minWidth: "50px" }}>Rotate</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="360" 
                      step="1"
                      value={rotation} 
                      onChange={(e) => setRotation(parseInt(e.target.value))}
                      style={{ flex: 1, accentColor: "var(--gold-primary)" }}
                    />
                    <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", width: "30px", textAlign: "right" }}>
                      {rotation}°
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "1rem", width: "100%" }}>
                  <button
                    type="button"
                    onClick={() => { setImageSrc(null); setSelectedFile(null); }}
                    className="btn-glass"
                    style={{ flex: 1 }}
                    disabled={isUploading}
                  >
                    Change Image
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAvatar}
                    className="btn-gold"
                    style={{ flex: 1 }}
                    disabled={isUploading}
                  >
                    {isUploading ? "Saving Avatar..." : "Save Photo"}
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
    </aside>
  );
}
