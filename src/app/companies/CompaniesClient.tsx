"use client";

import React, { useState, useTransition } from "react";
import { 
  Building2, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Pencil, 
  Trash2, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Key, 
  ShieldCheck, 
  UserCheck 
} from "lucide-react";
import { toast } from "react-hot-toast";
import { 
  createCompanyAction, 
  updateCompanyAction, 
  archiveCompanyAction, 
  getCompaniesAction 
} from "@/app/actions/company";

interface CompanyItem {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  status: string;
  createdAt: string;
  ownerPassword?: string;
}

interface CompaniesClientProps {
  initialCompanies: CompanyItem[];
}

export default function CompaniesClient({ initialCompanies }: CompaniesClientProps) {
  const [companies, setCompanies] = useState<CompanyItem[]>(initialCompanies);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form Fields - Create
  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [companyPassword, setCompanyPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields - Edit
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editOwnerEmail, setEditOwnerEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // Created Credentials State (for Copy)
  const [createdCredentials, setCreatedCredentials] = useState<{
    companyName: string;
    ownerName: string;
    ownerEmail: string;
    password: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  // Helper to generate a strong random password
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const refreshData = async () => {
    const res = await getCompaniesAction();
    if (res.success && res.companies) {
      const formatted = res.companies.map((c: any) => ({
        id: c.id,
        name: c.name,
        ownerName: c.ownerName || (c.user[0]?.name ?? "N/A"),
        ownerEmail: c.ownerEmail || (c.user[0]?.email ?? "N/A"),
        status: c.status,
        createdAt: new Date(c.createdAt).toISOString(),
        ownerPassword: c.user[0]?.password || ""
      }));
      setCompanies(formatted);
    }
  };

  // Submit Create Company
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim() || !ownerName.trim() || !ownerEmail.trim() || !companyPassword.trim()) {
      toast.error("Please fill out all fields.");
      return;
    }

    if (companyPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createCompanyAction({
          name: companyName.trim(),
          ownerName: ownerName.trim(),
          ownerEmail: ownerEmail.trim(),
          password: companyPassword,
        });

        if (res.success) {
          toast.success(`Company "${companyName}" created successfully!`);
          setCreatedCredentials({
            companyName: companyName.trim(),
            ownerName: ownerName.trim(),
            ownerEmail: ownerEmail.trim(),
            password: companyPassword,
          });
          setShowAddModal(false);
          setShowSuccessModal(true);

          // Reset fields
          setCompanyName("");
          setOwnerName("");
          setOwnerEmail("");
          setCompanyPassword("");

          await refreshData();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to create company.");
      }
    });
  };

  // Submit Edit Company
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    startTransition(async () => {
      try {
        const res = await updateCompanyAction({
          id: editingCompany.id,
          name: editName.trim(),
          ownerName: editOwnerName.trim(),
          ownerEmail: editOwnerEmail.trim(),
          password: editPassword ? editPassword : undefined,
        });

        if (res.success) {
          toast.success("Company details updated successfully!");
          setShowEditModal(false);
          setEditingCompany(null);
          await refreshData();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to update company.");
      }
    });
  };

  // Handle Archive Company
  const handleArchiveCompany = async (company: CompanyItem) => {
    if (!confirm(`Are you sure you want to archive "${company.name}"? This action can be undone by database administrators.`)) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await archiveCompanyAction(company.id);
        if (res.success) {
          toast.success(`Company "${company.name}" archived.`);
          await refreshData();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to archive company.");
      }
    });
  };

  // Copy Credentials to Clipboard
  const handleCopyCredentials = (emailStr: string, passStr: string) => {
    const text = `Worknode SaaS Login Credentials\n-------------------------------\nCompany: ${createdCredentials?.companyName || ""}\nOwner Name: ${createdCredentials?.ownerName || ""}\nLogin Email: ${emailStr}\nPassword: ${passStr}\nLogin URL: http://localhost:3000/auth/signin`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  // Filtered companies list
  const filteredCompanies = companies.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.ownerEmail.toLowerCase().includes(q) ||
      c.ownerName.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header Container */}
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
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.6rem", margin: 0 }}>
            <Building2 style={{ color: "#0077B6" }} /> Company & Tenant Management
          </h1>
          <p style={{ margin: "0.2rem 0 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Provision multi-tenant companies, manage owner credentials, and monitor company status.
          </p>
        </div>

        <button
          onClick={() => {
            setCompanyName("");
            setOwnerName("");
            setOwnerEmail("");
            setCompanyPassword(generatePassword());
            setShowAddModal(true);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.65rem 1.3rem",
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
          <Plus size={18} /> Add New Company
        </button>
      </div>

      {/* Filter & Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", gap: "1rem" }}>
        <div style={{ position: "relative", minWidth: "300px", flex: 1, maxWidth: "450px" }}>
          <Search size={16} style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company name, owner or email..."
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem 0.6rem 2.4rem",
              borderRadius: "10px",
              border: "1px solid var(--border-dim)",
              fontSize: "0.88rem",
              background: "#FFFFFF",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
        </div>

        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
          Total Registered Tenants: <span style={{ color: "#0077B6", fontWeight: 800 }}>{filteredCompanies.length}</span>
        </div>
      </div>

      {/* Directory Table */}
      <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid rgba(0, 119, 182, 0.15)", boxShadow: "0 4px 20px rgba(0, 119, 182, 0.05)", padding: "1.25rem", overflowX: "auto" }}>
        {filteredCompanies.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <Building2 size={40} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.3rem 0" }}>No Companies Found</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>Try clearing your search query or click &quot;Add New Company&quot; to provision a tenant.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-dim)", color: "var(--text-muted)" }}>
                <th style={{ padding: "0.75rem" }}>Company Name</th>
                <th style={{ padding: "0.75rem" }}>Owner Name</th>
                <th style={{ padding: "0.75rem" }}>Owner Email (Credentials)</th>
                <th style={{ padding: "0.75rem" }}>Status</th>
                <th style={{ padding: "0.75rem" }}>Created Date</th>
                <th style={{ padding: "0.75rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <td style={{ padding: "0.75rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(0, 119, 182, 0.1)", color: "#0077B6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      {c.name}
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem", color: "var(--text-primary)", fontWeight: 600 }}>{c.ownerName}</td>
                  <td style={{ padding: "0.75rem", color: "var(--text-secondary)" }}>{c.ownerEmail}</td>
                  <td style={{ padding: "0.75rem" }}>
                    <span style={{ padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700, background: "rgba(34, 197, 94, 0.1)", color: "#16A34A", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ padding: "0.75rem", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => handleCopyCredentials(c.ownerEmail, c.ownerPassword || "••••••••")}
                        title="Copy Credentials"
                        style={{ padding: "0.45rem", borderRadius: "6px", background: "rgba(0, 119, 182, 0.08)", border: "1px solid rgba(0, 119, 182, 0.2)", color: "#0077B6", cursor: "pointer" }}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingCompany(c);
                          setEditName(c.name);
                          setEditOwnerName(c.ownerName);
                          setEditOwnerEmail(c.ownerEmail);
                          setEditPassword("");
                          setShowEditModal(true);
                        }}
                        title="Edit Company"
                        style={{ padding: "0.45rem", borderRadius: "6px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)", color: "#D97706", cursor: "pointer" }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleArchiveCompany(c)}
                        title="Archive Company"
                        style={{ padding: "0.45rem", borderRadius: "6px", background: "rgba(225, 29, 72, 0.1)", border: "1px solid rgba(225, 29, 72, 0.2)", color: "#E11D48", cursor: "pointer" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal 1: Add New Company */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0, 8, 20, 0.65)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid rgba(0, 119, 182, 0.15)", width: "100%", maxWidth: "500px", padding: "1.75rem", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Building2 size={22} style={{ color: "#0077B6" }} /> Add New Company Tenant
              </h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "var(--text-muted)", fontWeight: 700 }}>✕</button>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Provision a new company tenant and create its primary Company Owner credentials.
            </p>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  required
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--border-dim)", fontSize: "0.88rem", outline: "none", background: "#FFFFFF" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>Company Owner Name</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--border-dim)", fontSize: "0.88rem", outline: "none", background: "#FFFFFF" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>Company Owner Email (Credentials Email)</label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="e.g. owner@acme.com"
                  required
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--border-dim)", fontSize: "0.88rem", outline: "none", background: "#FFFFFF" }}
                />
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>Owner Account Password</label>
                  <button
                    type="button"
                    onClick={() => setCompanyPassword(generatePassword())}
                    style={{ background: "none", border: "none", color: "#0077B6", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}
                  >
                    <RefreshCw size={12} /> Auto-Generate
                  </button>
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={companyPassword}
                    onChange={(e) => setCompanyPassword(e.target.value)}
                    placeholder="Enter or generate password..."
                    required
                    minLength={6}
                    style={{ width: "100%", padding: "0.65rem 2.4rem 0.65rem 0.65rem", borderRadius: "8px", border: "1px solid var(--border-dim)", fontSize: "0.88rem", outline: "none", background: "#FFFFFF" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: "0.65rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: "0.6rem 1.2rem", borderRadius: "8px", background: "transparent", border: "1px solid var(--border-dim)", color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{ padding: "0.6rem 1.4rem", borderRadius: "8px", background: "#0077B6", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}
                >
                  {isPending ? "Creating Tenant..." : "Create Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Success Credentials & One-Click Copy */}
      {showSuccessModal && createdCredentials && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0, 8, 20, 0.65)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid rgba(34, 197, 94, 0.3)", width: "100%", maxWidth: "480px", padding: "1.75rem", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(34, 197, 94, 0.15)", color: "#16A34A", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "0.75rem" }}>
                <ShieldCheck size={28} />
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.3rem 0" }}>Company Created Successfully!</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                Copy the Company Owner login credentials below to share with the client.
              </p>
            </div>

            <div style={{ background: "var(--background-secondary, #F8FAFC)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-dim)", marginBottom: "1.25rem", fontSize: "0.85rem" }}>
              <div style={{ marginBottom: "0.5rem" }}><strong>Company:</strong> {createdCredentials.companyName}</div>
              <div style={{ marginBottom: "0.5rem" }}><strong>Owner:</strong> {createdCredentials.ownerName}</div>
              <div style={{ marginBottom: "0.5rem" }}><strong>Email:</strong> {createdCredentials.ownerEmail}</div>
              <div><strong>Password:</strong> <code style={{ background: "#E2E8F0", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>{createdCredentials.password}</code></div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                onClick={() => handleCopyCredentials(createdCredentials.ownerEmail, createdCredentials.password)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.65rem 1.4rem",
                  borderRadius: "10px",
                  background: copied ? "#16A34A" : "linear-gradient(135deg, #0077B6 0%, #0096C7 100%)",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0, 119, 182, 0.25)",
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied to Clipboard!" : "Copy Credentials"}
              </button>

              <button
                onClick={() => setShowSuccessModal(false)}
                style={{ padding: "0.65rem 1.2rem", borderRadius: "10px", background: "transparent", border: "1px solid var(--border-dim)", color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Company */}
      {showEditModal && editingCompany && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0, 8, 20, 0.65)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid rgba(0, 119, 182, 0.15)", width: "100%", maxWidth: "480px", padding: "1.75rem", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Pencil size={20} style={{ color: "#D97706" }} /> Edit Company Details
              </h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "var(--text-muted)", fontWeight: 700 }}>✕</button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>Company Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--border-dim)", fontSize: "0.88rem", background: "#FFFFFF" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>Owner Name</label>
                <input
                  type="text"
                  value={editOwnerName}
                  onChange={(e) => setEditOwnerName(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--border-dim)", fontSize: "0.88rem", background: "#FFFFFF" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>Owner Email</label>
                <input
                  type="email"
                  value={editOwnerEmail}
                  onChange={(e) => setEditOwnerEmail(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--border-dim)", fontSize: "0.88rem", background: "#FFFFFF" }}
                />
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>Reset Password (Optional)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep existing password"
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--border-dim)", fontSize: "0.88rem", background: "#FFFFFF" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ padding: "0.6rem 1.2rem", borderRadius: "8px", background: "transparent", border: "1px solid var(--border-dim)", color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{ padding: "0.6rem 1.4rem", borderRadius: "8px", background: "#D97706", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}
                >
                  {isPending ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
