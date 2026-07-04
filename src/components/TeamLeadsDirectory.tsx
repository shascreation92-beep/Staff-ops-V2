"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Users, Mail, Award, Plus, X, AlertCircle } from "lucide-react";
import { onboardTeamLeadAction } from "@/app/actions/users";
import { toast } from "react-hot-toast";
import NotificationBell from "./NotificationBell";

interface Associate {
  id: string;
  name: string | null;
  email: string;
  status: string;
  lastActiveAt: Date | string | null;
}

interface TeamLead {
  id: string;
  name: string | null;
  email: string;
  status: string;
  createdAt: Date | string;
  employee?: {
    employeeId: string;
  } | null;
  associates: Associate[];
}

interface TeamLeadsDirectoryProps {
  teamLeads: TeamLead[];
  companies: { id: string; name: string }[];
  currentUserRole: string;
}

export default function TeamLeadsDirectory({ teamLeads, companies, currentUserRole }: TeamLeadsDirectoryProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [onboardFullName, setOnboardFullName] = useState("");
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardEmployeeId, setOnboardEmployeeId] = useState("");
  const [onboardPassword, setOnboardPassword] = useState("");
  const [onboardCompanyId, setOnboardCompanyId] = useState(companies[0]?.id || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
          companyId: onboardCompanyId
        });

        if (res.success) {
          toast.success("Team Lead onboarded successfully!");
          setShowAddModal(false);
          setOnboardFullName("");
          setOnboardEmail("");
          setOnboardEmployeeId("");
          setOnboardPassword("");
          router.refresh();
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to onboard Team Lead.");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header and Summary card */}
      <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem", position: "relative", zIndex: 50 }}>
        <div style={{ flex: 1, minWidth: "280px" }}>
          <h1 className="text-gold-gradient" style={{ fontSize: "1.5rem", fontWeight: 800 }}>TEAM LEADS & ASSOCIATE ORGANIZATIONAL DIRECTORY</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Monitor Team Leaders, their assigned Sales Associates, and team sizes across the tenant shard.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginLeft: "auto" }}>
          <NotificationBell />
          {/* ADD TL Button */}
          <button
            onClick={() => {
              setShowAddModal(true);
              setOnboardFullName("");
              setOnboardEmail("");
              setOnboardEmployeeId("");
              setOnboardPassword("");
              setOnboardCompanyId(companies[0]?.id || "");
              setErrorMsg(null);
            }}
            className="btn-gold"
            style={{
              padding: "0.6rem 1.2rem",
              fontSize: "0.8rem",
              height: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              borderRadius: "6px"
            }}
          >
            <Plus size={16} />
            <span>ADD TL</span>
          </button>

          {/* Total Team Leads Box */}
          <div style={{
            background: "rgba(251, 191, 36, 0.05)",
            border: "1px solid var(--border-gold)",
            borderRadius: "8px",
            padding: "0.6rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}>
            <Users style={{ color: "var(--gold-premium)" }} size={24} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{teamLeads.length}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginTop: "0.15rem" }}>Total Team Leads</span>
            </div>
          </div>
        </div>
      </div>

      {teamLeads.length === 0 ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
          <Users size={48} style={{ margin: "0 auto 1rem", color: "var(--text-muted)" }} />
          <h3 style={{ fontWeight: 700, color: "var(--text-primary)" }}>No Team Leads Found</h3>
          <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Use the &quot;ADD TL&quot; button to onboard Team Leads.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: "1.5rem" }}>
          {teamLeads.map((tl) => (
            <div key={tl.id} className="glass-panel" style={{
              padding: "1.5rem",
              border: "1px solid var(--border-dim)",
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
                background: "var(--gold-gradient)"
              }} />

              {/* Lead Details Header */}
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "50%",
                  backgroundColor: "rgba(251, 191, 36, 0.08)",
                  border: "1px solid var(--border-gold)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--gold-premium)"
                }}>
                  <UserCheck size={22} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>{tl.name || "Unnamed Leader"}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    <Mail size={12} />
                    <span>{tl.email}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                    <span className="badge active" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>
                      ID: {tl.employee?.employeeId || "N/A"}
                    </span>
                    <span className={`badge ${tl.status === 'APPROVED' ? 'active' : 'pending'}`} style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>
                      {tl.status === 'APPROVED' ? 'ACTIVE' : tl.status}
                    </span>
                  </div>
                </div>
                
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Users size={14} style={{ color: "var(--text-muted)" }} />
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>{tl.associates.length} Associates</span>
                </div>
              </div>

              {/* Team list section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", borderTop: "1px solid var(--border-dim)", paddingTop: "1rem" }}>
                <h4 style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--gold-primary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Award size={14} />
                  <span>Mapped Sales Team</span>
                </h4>

                {tl.associates.length === 0 ? (
                  <div style={{
                    background: "rgba(255, 255, 255, 0.01)",
                    border: "1px dashed var(--border-dim)",
                    borderRadius: "6px",
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    fontStyle: "italic"
                  }}>
                    No associates mapped to this team lead.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {tl.associates.map((assoc) => (
                      <div key={assoc.id} style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 0.75rem",
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid var(--border-dim)",
                        borderRadius: "6px"
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>{assoc.name || "N/A"}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{assoc.email}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span className={`badge ${assoc.status === 'APPROVED' ? 'active' : (assoc.status === 'PENDING' ? 'pending' : 'blocked')}`} style={{ fontSize: "0.65rem" }}>
                            {assoc.status === 'APPROVED' ? 'ACTIVE' : assoc.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD TL Modal Dialog */}
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
            maxWidth: "480px",
            padding: "2rem",
            border: "1px solid var(--border-gold)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            position: "relative"
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
              <h3 className="text-gold-gradient" style={{ fontSize: "1.2rem", fontWeight: 800 }}>ONBOARD NEW TEAM LEADER</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Create an approved Team Leader account with active credentials.
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

            <form onSubmit={handleOnboardSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Company / Tenant Shard</label>
                <select
                  value={onboardCompanyId}
                  onChange={(e) => setOnboardCompanyId(e.target.value)}
                  className="select-gold"
                  disabled={isPending}
                  required
                >
                  <option value="" disabled>Select Company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Employee ID (Globally Unique)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TL-001"
                  value={onboardEmployeeId}
                  onChange={(e) => setOnboardEmployeeId(e.target.value)}
                  className="input-gold"
                  disabled={isPending}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Lead"
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
                  placeholder="e.g. jane@company.com"
                  value={onboardEmail}
                  onChange={(e) => setOnboardEmail(e.target.value)}
                  className="input-gold"
                  disabled={isPending}
                />
              </div>

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

              <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  {isPending ? "Onboarding..." : "Onboard Team Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
