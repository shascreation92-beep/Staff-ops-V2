"use client";

import React, { useTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateAccountStatusAction } from "@/app/actions/accounts";
import { Check, X, ShieldAlert, AlertCircle, Database, Calendar } from "lucide-react";
import { toast } from "react-hot-toast";
import ConfirmationModal from "./ConfirmationModal";

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

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [router]);

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
      <div className="glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }} className="text-gold-gradient">
          ASSOCIATES ACCOUNT REQUESTS
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
          Review and approve or reject incoming account/ID requests forwarded by your Sales Associates.
        </p>
      </div>

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
              <th>Submitted Date</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                    <ShieldAlert size={36} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                    <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>No incoming requests pending.</span>
                    <span style={{ fontSize: "0.8rem" }}>When your associates submit requests, they will show up here.</span>
                  </div>
                </td>
              </tr>
            ) : (
              requests.map((req) => {
                const associateName = req.user_account_createdByIdTouser?.name || "Unknown Associate";
                const createdDate = new Date(req.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

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
                    <td>{req.idName}</td>
                    <td style={{ fontWeight: 600 }}>{req.adsPublished}</td>
                    <td>
                      <span
                        className={`badge ${req.verificationStatus === "Yes" ? "verified" : "danger"}`}
                        style={{ fontSize: "0.7rem" }}
                      >
                        {req.verificationStatus === "Yes" ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Calendar size={12} />
                        <span>{createdDate}</span>
                      </div>
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
              })
            )}
          </tbody>
        </table>
      </div>
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
