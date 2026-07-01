"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Database, 
  ShieldCheck, 
  ShieldX, 
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";
import { toast } from "react-hot-toast";
import NotificationBell from "./NotificationBell";
import { shiftAccountOwnershipAction } from "@/app/actions/accounts";

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

  // Local map to track visual selection state for controlled dropdowns
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<{ [accId: string]: string }>({});

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedAssociate, setSelectedAssociate] = useState("ALL");

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
    console.log("[SHIFT ACCOUNT FRONTEND] Syncing local accounts list with initialAccounts:", initialAccounts.length);
    setAccountsList(initialAccounts);
    
    // Build initial owner IDs map
    const ownerIdsMap: { [accId: string]: string } = {};
    initialAccounts.forEach(acc => {
      ownerIdsMap[acc.id] = acc.createdById;
    });
    setSelectedOwnerIds(ownerIdsMap);
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

  // Handle shift account ownership
  const handleShiftAccount = async (accountId: string, newAssociateId: string, currentOwnerName: string) => {
    console.log("[SHIFT ACCOUNT FRONTEND] handleShiftAccount triggered:", { accountId, newAssociateId, currentOwnerName });
    const targetAssoc = activeAssociates.find(a => a.id === newAssociateId);
    if (!targetAssoc) {
      console.error("[SHIFT ACCOUNT FRONTEND] Target associate not found in activeAssociates:", newAssociateId);
      return;
    }
    const targetName = targetAssoc.name || targetAssoc.email;

    // Instantly update visual state to avoid visual lag
    setSelectedOwnerIds(prev => ({ ...prev, [accountId]: newAssociateId }));

    if (confirm(`Are you sure you want to shift this account from ${currentOwnerName} to ${targetName}?`)) {
      startTransition(async () => {
        try {
          console.log("[SHIFT ACCOUNT FRONTEND] Dispatching server action...");
          const res = await shiftAccountOwnershipAction(accountId, newAssociateId);
          console.log("[SHIFT ACCOUNT FRONTEND] Server action response:", res);
          
          if (res && res.success) {
            toast.success(`Account shifted to ${targetName} successfully!`);
            
            // Update local state directly so it is instant
            setAccountsList(prev => prev.map(acc => {
              if (acc.id === accountId) {
                return {
                  ...acc,
                  createdById: newAssociateId,
                  user_account_createdByIdTouser: {
                    name: targetAssoc.name || null,
                    email: targetAssoc.email
                  }
                };
              }
              return acc;
            }));

            router.refresh();
          } else {
            throw new Error("Failed to process reassignment.");
          }
        } catch (err: any) {
          console.error("[SHIFT ACCOUNT FRONTEND] Error caught:", err);
          toast.error(err.message || "Failed to shift account ownership.");
          
          // Revert visual selector value on failure
          const originalOwner = accountsList.find(a => a.id === accountId)?.createdById || "";
          setSelectedOwnerIds(prev => ({ ...prev, [accountId]: originalOwner }));
        }
      });
    } else {
      console.log("[SHIFT ACCOUNT FRONTEND] Shifting cancelled by user. Reverting visual dropdown...");
      // Revert visual selector value on cancel
      const originalOwner = accountsList.find(a => a.id === accountId)?.createdById || "";
      setSelectedOwnerIds(prev => ({ ...prev, [accountId]: originalOwner }));
    }
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
                <th style={{ minWidth: "180px" }}>Shift Account</th>
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
                  const currentOwnerValue = selectedOwnerIds[acc.id] || acc.createdById;
                  
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
                        <div style={{ position: "relative", width: "100%" }}>
                          <select
                            value={currentOwnerValue}
                            onChange={(e) => handleShiftAccount(acc.id, e.target.value, creatorName)}
                            className="input-gold"
                            style={{
                              padding: "0.35rem 1.75rem 0.35rem 0.65rem",
                              fontSize: "0.82rem",
                              width: "100%",
                              appearance: "none",
                              cursor: "pointer",
                              border: "1px solid var(--border-dim)"
                            }}
                            disabled={isPending}
                          >
                            {/* Always render current visual owner first */}
                            {activeAssociates.some(assoc => assoc.id === currentOwnerValue) ? null : (
                              <option value={currentOwnerValue}>{creatorName}</option>
                            )}
                            {activeAssociates.map(assoc => (
                              <option key={assoc.id} value={assoc.id}>
                                {assoc.name || assoc.email}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={12} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
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

    </div>
  );
}
