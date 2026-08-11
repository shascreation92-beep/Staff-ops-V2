"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveSalesAssociateAction, rejectSalesAssociateAction } from "@/app/actions/users";
import { ShieldCheck, UserCheck, Key, X, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";

interface PendingUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  companyId: string | null;
  company?: { name: string } | null;
  user?: { name: string | null } | null; // team lead relation
}

interface PendingOnboardingListProps {
  pendingUsers: PendingUser[];
}

export default function PendingOnboardingList({ pendingUsers }: PendingOnboardingListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State to track which user is being approved
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApproveSubmit = (e: React.FormEvent, userId: string) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!password.trim()) {
      setErrorMsg("Password is required to approve onboarding.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await approveSalesAssociateAction({
          userId,
          password: password.trim(),
          employeeId: employeeId.trim() || undefined,
        });

        if (res?.success) {
          toast.success(res.message || "Sales Representative approved and activated successfully!");
          setActiveUserId(null);
          setPassword("");
          setEmployeeId("");
          router.refresh();
        } else {
          const errText = res?.error || "Failed to approve onboarding.";
          setErrorMsg(errText);
          toast.error(errText);
        }
      } catch (err: any) {
        const errText = err.message || "Failed to approve onboarding.";
        setErrorMsg(errText);
        toast.error(errText);
      }
    });
  };

  const handleReject = (userId: string) => {
    if (!window.confirm("Are you sure you want to reject and cancel this onboarding request?")) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await rejectSalesAssociateAction(userId);

        if (res.success) {
          toast.success("Sales Representative onboarding request has been rejected.");
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to reject request.");
      }
    });
  };

  if (pendingUsers.length === 0) return null;

  return (
    <div style={{ marginTop: "2.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800 }} className="text-gold-gradient">
          PENDING REPRESENTATIVE ONBOARDING REQUESTS
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
          The following Sales Representatives have been added by Team Leads and require password assignment and approval.
        </p>
      </div>

      <div className="table-container-outer" style={{ width: "100%" }}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email Address</th>
              <th>Mapped Team Lead</th>
              <th>Tenant Company</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingUsers.map((u) => {
              const isApproving = activeUserId === u.id;

              return (
                <tr key={u.id} style={{ verticalAlign: "middle" }}>
                  <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{u.name || "N/A"}</td>
                  <td>{u.email}</td>
                  <td>
                    {u.user?.name ? (
                      <span className="badge pending" style={{ fontSize: "0.7rem" }}>
                        TL: {u.user.name}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>None</span>
                    )}
                  </td>
                  <td>{u.company?.name || "Global / System"}</td>
                  <td style={{ textAlign: "right" }}>
                    {!isApproving ? (
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => {
                            setActiveUserId(u.id);
                            setPassword("");
                            setEmployeeId("");
                            setErrorMsg(null);
                          }}
                          className="btn-gold"
                          style={{
                            padding: "0.35rem 0.8rem",
                            fontSize: "0.75rem",
                            height: "auto",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <UserCheck size={14} />
                          <span>Approve & Onboard</span>
                        </button>
                        <button
                          onClick={() => handleReject(u.id)}
                          className="btn-glass"
                          style={{
                            padding: "0.35rem 0.8rem",
                            fontSize: "0.75rem",
                            height: "auto",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            borderColor: "rgba(239, 68, 68, 0.4)",
                            color: "var(--color-danger)"
                          }}
                        >
                          <X size={14} />
                          <span>Reject Request</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                          alignItems: "flex-end",
                          background: "rgba(255, 255, 255, 0.02)",
                          padding: "0.75rem",
                          borderRadius: "6px",
                          border: "1px solid var(--border-gold)",
                          maxWidth: "350px",
                          marginLeft: "auto",
                        }}
                      >
                        <form
                          onSubmit={(e) => handleApproveSubmit(e, u.id)}
                          style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", textAlign: "left" }}>
                            <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                              Assign Password
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Type password..."
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="input-gold"
                              style={{ height: "30px", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                            />
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", textAlign: "left" }}>
                            <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                              Employee ID (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="Auto-generated if blank"
                              value={employeeId}
                              onChange={(e) => setEmployeeId(e.target.value)}
                              className="input-gold"
                              style={{ height: "30px", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                            />
                          </div>

                          {errorMsg && (
                            <span style={{ fontSize: "0.7rem", color: "var(--color-danger)", display: "flex", alignItems: "center", gap: "0.25rem", textAlign: "left" }}>
                              <AlertCircle size={10} />
                              {errorMsg}
                            </span>
                          )}

                          <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end", marginTop: "0.25rem" }}>
                            <button
                              type="button"
                              onClick={() => setActiveUserId(null)}
                              className="btn-glass"
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem", height: "auto" }}
                              disabled={isPending}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="btn-gold"
                              style={{ padding: "0.25rem 0.6rem", fontSize: "0.7rem", height: "auto" }}
                              disabled={isPending}
                            >
                              {isPending ? "Approving..." : "Confirm"}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
