"use client";

import React, { useState, useTransition } from "react";
import { 
  createEmployeeAction, 
  updateEmployeeITAction, 
  archiveEmployeeAction 
} from "@/app/actions/employees";
import { onboardSalesAssociateAction, onboardTeamLeadAction } from "@/app/actions/users";
import { 
  Search, 
  Plus, 
  Laptop, 
  Lock, 
  Trash2, 
  X, 
  Check, 
  AlertCircle,
  FileText,
  User,
  Key,
  ShieldAlert,
  UserCheck,
  Eye,
  EyeOff,
  Users
} from "lucide-react";
import { user_role } from "@prisma/client";

interface EmployeesListProps {
  currentUser: {
    id: string;
    role: user_role;
    email?: string | null;
  };
  employees: any[];
  companies: any[];
  teamLeads?: any[];
}

export default function EmployeesList({
  currentUser,
  employees,
  companies,
  teamLeads = []
}: EmployeesListProps) {
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("ALL");

  // Unified modal state
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [unifiedTab, setUnifiedTab] = useState<"EMPLOYEE" | "ASSOCIATE">(
    currentUser.role === "TEAM_LEAD" ? "ASSOCIATE" : "EMPLOYEE"
  );

  // Onboard Associate form state
  const [onboardFullName, setOnboardFullName] = useState("");
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardEmployeeId, setOnboardEmployeeId] = useState("");
  const [onboardPassword, setOnboardPassword] = useState("");
  const [onboardTeamLeadId, setOnboardTeamLeadId] = useState("");
  const [onboardRole, setOnboardRole] = useState<"SALES_ASSOCIATE" | "TEAM_LEAD">("SALES_ASSOCIATE");
  const [onboardError, setOnboardError] = useState<string | null>(null);

  // Create Employee form state
  const [employeeId, setEmployeeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [targetCompanyId, setTargetCompanyId] = useState(companies[0]?.id || "");
  const [addLaptopBrand, setAddLaptopBrand] = useState<"HP" | "Dell" | "ThinkPad" | "">("");
  const [addLaptopModel, setAddLaptopModel] = useState("");
  const [addLaptopSerialNumber, setAddLaptopSerialNumber] = useState("");
  const [addWindowsVersion, setAddWindowsVersion] = useState<"Windows_10" | "Windows_11" | "">("");
  const [addVpnProvider, setAddVpnProvider] = useState<"Surfshark" | "ExpressVPN" | "NordVPN" | "ProtonVPN" | "PureVPN" | "HideMe" | "">("");
  const [addLaptopPassword, setAddLaptopPassword] = useState("");
  const [addVpnCredentials, setAddVpnCredentials] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  // IT modal
  const [showITModal, setShowITModal] = useState(false);

  // Show/hide password toggles
  const [showLaptopPass, setShowLaptopPass] = useState(false);
  const [showVpnCreds, setShowVpnCreds] = useState(false);
  const [showITLaptopPass, setShowITLaptopPass] = useState(false);
  const [showITVpnCreds, setShowITVpnCreds] = useState(false);
  const [activeEmp, setActiveEmp] = useState<any | null>(null);
  const [laptopBrand, setLaptopBrand] = useState<"HP" | "Dell" | "ThinkPad" | "">("");
  const [laptopModel, setLaptopModel] = useState("");
  const [laptopSerialNumber, setLaptopSerialNumber] = useState("");
  const [windowsVersion, setWindowsVersion] = useState<"Windows_10" | "Windows_11" | "">("");
  const [vpnProvider, setVpnProvider] = useState<"Surfshark" | "ExpressVPN" | "NordVPN" | "ProtonVPN" | "PureVPN" | "HideMe" | "">("");
  const [laptopPassword, setLaptopPassword] = useState("");
  const [vpnCredentials, setVpnCredentials] = useState("");
  const [itError, setItError] = useState<string | null>(null);

  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const isCompanyOwner = currentUser.role === "COMPANY_OWNER";
  const isTeamLead = currentUser.role === "TEAM_LEAD";
  const isIT = currentUser.role === "IT_DEPARTMENT";

  const canCreate = isSuperAdmin || isCompanyOwner || isTeamLead;
  const canEditIT = isSuperAdmin || isCompanyOwner || isTeamLead;

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.company?.name || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBrand = brandFilter === "ALL" || emp.laptopBrand === brandFilter;

    return matchesSearch && matchesBrand;
  });

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError(null);

    startTransition(async () => {
      try {
        if (onboardRole === "TEAM_LEAD") {
          if (!onboardEmployeeId.trim() || !onboardPassword.trim()) {
            setOnboardError("Employee ID and Password are required to onboard a Team Lead.");
            return;
          }
          const res = await onboardTeamLeadAction({
            fullName: onboardFullName,
            email: onboardEmail,
            employeeId: onboardEmployeeId.trim(),
            password: onboardPassword.trim()
          });

          if (res.success) {
            setShowUnifiedModal(false);
            setOnboardFullName("");
            setOnboardEmail("");
            setOnboardEmployeeId("");
            setOnboardPassword("");
            setOnboardRole("SALES_ASSOCIATE");
          }
        } else {
          const res = await onboardSalesAssociateAction({
            fullName: onboardFullName,
            email: onboardEmail,
            employeeId: isTeamLead ? "" : onboardEmployeeId,
            password: isTeamLead ? "" : onboardPassword,
            teamLeadId: isTeamLead ? "" : onboardTeamLeadId
          });

          if (res.success) {
            setShowUnifiedModal(false);
            setOnboardFullName("");
            setOnboardEmail("");
            setOnboardEmployeeId("");
            setOnboardPassword("");
            setOnboardTeamLeadId("");
          }
        }
      } catch (err: any) {
        setOnboardError(err.message || "Failed to onboard operator.");
      }
    });
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    startTransition(async () => {
      try {
        const res = await createEmployeeAction({
          employeeId,
          fullName,
          email,
          status: "ACTIVE",
          targetCompanyId: isSuperAdmin ? targetCompanyId : undefined,
          laptopBrand: addLaptopBrand === "" ? null : addLaptopBrand,
          laptopModel: addLaptopModel === "" ? null : addLaptopModel,
          laptopSerialNumber: addLaptopSerialNumber === "" ? null : addLaptopSerialNumber,
          windowsVersion: addWindowsVersion === "" ? null : addWindowsVersion,
          vpnProvider: addVpnProvider === "" ? null : addVpnProvider,
          laptopPassword: addLaptopPassword === "" ? null : addLaptopPassword,
          vpnCredentials: addVpnCredentials === "" ? null : addVpnCredentials,
        });

        if (res.success) {
          setShowUnifiedModal(false);
          setEmployeeId("");
          setFullName("");
          setEmail("");
          setAddLaptopBrand("");
          setAddLaptopModel("");
          setAddLaptopSerialNumber("");
          setAddWindowsVersion("");
          setAddVpnProvider("");
          setAddLaptopPassword("");
          setAddVpnCredentials("");
        }
      } catch (err: any) {
        setAddError(err.message || "Failed to add employee.");
      }
    });
  };

  const openITModal = (emp: any) => {
    setActiveEmp(emp);
    setLaptopBrand(emp.laptopBrand || "");
    setLaptopModel(emp.laptopModel || "");
    setLaptopSerialNumber(emp.laptopSerialNumber || "");
    setWindowsVersion(emp.windowsVersion || "");
    setVpnProvider(emp.vpnProvider || "");
    setLaptopPassword(emp.laptopPassword || "");
    setVpnCredentials(emp.vpnCredentials || "");
    setItError(null);
    setShowITModal(true);
  };

  const handleUpdateITSpecs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmp) return;
    setItError(null);

    startTransition(async () => {
      try {
        const res = await updateEmployeeITAction(activeEmp.id, {
          laptopBrand: laptopBrand === "" ? null : laptopBrand,
          laptopModel: laptopModel === "" ? null : laptopModel,
          laptopSerialNumber: laptopSerialNumber === "" ? null : laptopSerialNumber,
          windowsVersion: windowsVersion === "" ? null : windowsVersion,
          vpnProvider: vpnProvider === "" ? null : vpnProvider,
          laptopPassword: laptopPassword === "" ? null : laptopPassword,
          vpnCredentials: vpnCredentials === "" ? null : vpnCredentials,
        });

        if (res.success) {
          setShowITModal(false);
          setActiveEmp(null);
        }
      } catch (err: any) {
        setItError(err.message || "Failed to update IT specs.");
      }
    });
  };

  const handleArchive = async (id: string, name: string) => {
    if (confirm(`Are you absolutely sure you wish to soft-delete (archive) employee "${name}"? This action can be restored by Super Admin.`)) {
      try {
        await archiveEmployeeAction(id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Search Toolbar */}
      <div className="glass-panel table-panel" style={{ padding: "0.6rem 1.25rem", marginBottom: 0 }}>
        <div className="table-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", flex: 1 }}>
            <div className="table-search-wrapper" style={{ width: "100%", maxWidth: "360px" }}>
              <Search className="header-search-icon" />
              <input
                type="text"
                placeholder="Search name, email, ID, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="header-search-input"
              />
            </div>

            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="table-select-filter"
            >
              <option value="ALL">ALL HARDWARE BRANDS</option>
              <option value="HP">HP</option>
              <option value="Dell">DELL</option>
              <option value="ThinkPad">THINKPAD</option>
              <option value="NULL">NO HARDWARE ASSIGNED</option>
            </select>
          </div>

          {canCreate && (
            <button className="btn-gold" onClick={() => { setUnifiedTab(currentUser.role === "TEAM_LEAD" ? "ASSOCIATE" : "EMPLOYEE"); setShowUnifiedModal(true); }}>
              <Plus size={16} />
              <span>ADD / ONBOARD</span>
            </button>
          )}

          {/* Row Count */}
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
            {filteredEmployees.length} / {employees.length} records
          </span>
        </div>
      </div>

      {/* Employees Grid / Table */}
      <div className="glass-panel table-panel">
        <div className="table-container-outer">
          <table className="premium-table">
            <thead>
              <tr>
                {isSuperAdmin && <th>Tenant Company</th>}
                <th>Employee ID</th>
                <th>Full Name</th>
                <th>Email Address</th>
                <th>Laptop Specs</th>
                <th>VPN Provider</th>
                <th>OS Version</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 9 : 8} style={{ padding: "3rem 1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: "3rem", height: "3rem", borderRadius: "50%", background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold-primary)" }}>
                        <Users size={22} />
                      </div>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.9rem" }}>No Employees Found</span>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center", maxWidth: "280px", lineHeight: 1.5 }}>No employees match your current filters. Try clearing the search or use the <strong style={{ color: "var(--gold-primary)" }}>ADD / ONBOARD</strong> button to add one.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id}>
                    {isSuperAdmin && (
                      <td style={{ fontWeight: 600, color: "var(--gold-primary)" }}>
                        {emp.company?.name || "Global"}
                      </td>
                    )}
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--gold-premium)" }}>
                      {emp.employeeId}
                    </td>
                    <td style={{ fontWeight: 600 }}>{emp.fullName}</td>
                    <td>{emp.email}</td>
                    <td>
                      {emp.laptopBrand ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                            {emp.laptopBrand} {emp.laptopModel || ""}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            S/N: {emp.laptopSerialNumber || "N/A"}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      {emp.vpnProvider ? (
                        <span className="badge developer" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                          {emp.vpnProvider}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>None</span>
                      )}
                    </td>
                    <td>
                      {emp.windowsVersion ? (
                        <span style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
                          {emp.windowsVersion.replace("_", " ")}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>N/A</span>
                      )}
                    </td>
                    <td>
                      <span className="badge verified" style={{ fontSize: "0.7rem" }}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        
                        {canEditIT && (
                          <button
                            onClick={() => openITModal(emp)}
                            className="btn-glass"
                            style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", gap: "0.25rem" }}
                            title="Assign Laptop/VPN"
                          >
                            <Laptop size={12} />
                            <span>IT Deploy</span>
                          </button>
                        )}

                        {canCreate && (
                          <button
                            onClick={() => handleArchive(emp.id, emp.fullName)}
                            className="btn-danger"
                            style={{ padding: "0.25rem 0.5rem", height: "auto" }}
                            title="Archive Employee"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unified Add / Onboard Modal */}
      {showUnifiedModal && (
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
            maxWidth: "540px",
            width: "100%",
            padding: "2rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "var(--shadow-premium)"
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>ADD / ONBOARD</h2>
              <button
                type="button"
                onClick={() => setShowUnifiedModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0.25rem" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Tab Switcher */}
            {currentUser.role !== "TEAM_LEAD" && (
              <div style={{ display: "flex", gap: "0", background: "rgba(255,255,255,0.03)", borderRadius: "6px", border: "1px solid var(--border-dim)", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setUnifiedTab("EMPLOYEE")}
                  style={{
                    flex: 1,
                    padding: "0.55rem 1rem",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    letterSpacing: "0.05em",
                    transition: "all 0.2s",
                    background: unifiedTab === "EMPLOYEE" ? "var(--gold-gradient)" : "transparent",
                    color: unifiedTab === "EMPLOYEE" ? "var(--bg-primary)" : "var(--text-secondary)"
                  }}
                >
                  ADD EMPLOYEE
                </button>
                <button
                  type="button"
                  onClick={() => setUnifiedTab("ASSOCIATE")}
                  style={{
                    flex: 1,
                    padding: "0.55rem 1rem",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    letterSpacing: "0.05em",
                    transition: "all 0.2s",
                    background: unifiedTab === "ASSOCIATE" ? "var(--gold-gradient)" : "transparent",
                    color: unifiedTab === "ASSOCIATE" ? "var(--bg-primary)" : "var(--text-secondary)"
                  }}
                >
                  ONBOARD ASSOCIATE
                </button>
              </div>
            )}

            {/* ── TAB: ADD EMPLOYEE ── */}
            {unifiedTab === "EMPLOYEE" && (
              <>
                {addError && (
                  <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                    {addError}
                  </div>
                )}
                <form onSubmit={handleAddEmployee} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {isSuperAdmin && (
                    <div className="form-group">
                      <label className="form-label">Tenant Company</label>
                      <select value={targetCompanyId} onChange={(e) => setTargetCompanyId(e.target.value)} className="select-gold">
                        {companies.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Employee ID (Globally Unique)</label>
                    <input type="text" required placeholder="e.g. EMP-9304" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="input-gold" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" required placeholder="e.g. Sarah Connor" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-gold" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" required placeholder="e.g. sarah@acme.com" value={email} onChange={(e) => setEmail(e.target.value)} className="input-gold" />
                  </div>
                  <div style={{ height: "1px", background: "var(--border-dim)", margin: "0.25rem 0" }}></div>
                  <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--gold-premium)" }}>Laptop & Credentials Setup</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="form-group">
                      <label className="form-label">Laptop Brand</label>
                      <select value={addLaptopBrand} onChange={(e) => setAddLaptopBrand(e.target.value as any)} className="select-gold">
                        <option value="">Unassigned</option>
                        <option value="HP">HP</option>
                        <option value="Dell">Dell</option>
                        <option value="ThinkPad">ThinkPad</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Windows Version</label>
                      <select value={addWindowsVersion} onChange={(e) => setAddWindowsVersion(e.target.value as any)} className="select-gold">
                        <option value="">N/A</option>
                        <option value="Windows_10">Windows 10</option>
                        <option value="Windows_11">Windows 11</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="form-group">
                      <label className="form-label">Laptop Model</label>
                      <input type="text" placeholder="e.g. Latitude 5420" value={addLaptopModel} onChange={(e) => setAddLaptopModel(e.target.value)} className="input-gold" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Laptop Serial S/N</label>
                      <input type="text" placeholder="e.g. TAG-23091A" value={addLaptopSerialNumber} onChange={(e) => setAddLaptopSerialNumber(e.target.value)} className="input-gold" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Laptop Administrator Password</label>
                    <div style={{ position: "relative" }}>
                      <input type={showLaptopPass ? "text" : "password"} placeholder="Specify strong password" value={addLaptopPassword} onChange={(e) => setAddLaptopPassword(e.target.value)} className="input-gold" style={{ paddingRight: "2.5rem" }} />
                      <button type="button" onClick={() => setShowLaptopPass(v => !v)} style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                        {showLaptopPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div style={{ height: "1px", background: "var(--border-dim)", margin: "0.25rem 0" }}></div>
                  <div className="form-group">
                    <label className="form-label">VPN Provider</label>
                    <select value={addVpnProvider} onChange={(e) => setAddVpnProvider(e.target.value as any)} className="select-gold">
                      <option value="">No VPN</option>
                      <option value="Surfshark">Surfshark</option>
                      <option value="ExpressVPN">ExpressVPN</option>
                      <option value="NordVPN">NordVPN</option>
                      <option value="ProtonVPN">ProtonVPN</option>
                      <option value="PureVPN">PureVPN</option>
                      <option value="HideMe">HideMe</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                    <button type="button" onClick={() => setShowUnifiedModal(false)} className="btn-glass" style={{ flex: 1 }} disabled={isPending}>Cancel</button>
                    <button type="submit" className="btn-gold" style={{ flex: 1 }} disabled={isPending}>{isPending ? "Adding..." : "Add Employee"}</button>
                  </div>
                </form>
              </>
            )}

            {/* ── TAB: ONBOARD ASSOCIATE / TEAM LEAD ── */}
            {unifiedTab === "ASSOCIATE" && (
              <>
                {onboardError && (
                  <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                    {onboardError}
                  </div>
                )}
                <form onSubmit={handleOnboardSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {currentUser.role !== "TEAM_LEAD" && (
                    <div className="form-group">
                      <label className="form-label">Onboarding Role</label>
                      <select
                        value={onboardRole}
                        onChange={(e) => setOnboardRole(e.target.value as any)}
                        className="select-gold"
                        disabled={isPending}
                      >
                        <option value="SALES_ASSOCIATE">Sales Associate</option>
                        <option value="TEAM_LEAD">Team Leader</option>
                      </select>
                    </div>
                  )}
                  {(!isTeamLead || onboardRole === "TEAM_LEAD") && (
                    <div className="form-group">
                      <label className="form-label">Employee ID (Globally Unique)</label>
                      <input type="text" required placeholder="e.g. EMP-101" value={onboardEmployeeId} onChange={(e) => setOnboardEmployeeId(e.target.value)} className="input-gold" disabled={isPending} />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" required placeholder="e.g. Alice Margatroid" value={onboardFullName} onChange={(e) => setOnboardFullName(e.target.value)} className="input-gold" disabled={isPending} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" required placeholder="e.g. alice@company.com" value={onboardEmail} onChange={(e) => setOnboardEmail(e.target.value)} className="input-gold" disabled={isPending} />
                  </div>
                  {(!isTeamLead || onboardRole === "TEAM_LEAD") && (
                    <div className="form-group">
                      <label className="form-label">Initial Password</label>
                      <input type="text" required placeholder="Assign initial password" value={onboardPassword} onChange={(e) => setOnboardPassword(e.target.value)} className="input-gold" disabled={isPending} />
                    </div>
                  )}
                  {!isTeamLead && onboardRole === "SALES_ASSOCIATE" && teamLeads.length > 0 && (
                    <div className="form-group">
                      <label className="form-label">Assign to Team Lead</label>
                      <select
                        value={onboardTeamLeadId}
                        onChange={(e) => setOnboardTeamLeadId(e.target.value)}
                        className="select-gold"
                        disabled={isPending}
                      >
                        <option value="">Unassigned (None)</option>
                        {teamLeads.map((tl) => (
                          <option key={tl.id} value={tl.id}>
                            {tl.name || tl.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                    <button type="button" onClick={() => setShowUnifiedModal(false)} className="btn-glass" style={{ flex: 1 }} disabled={isPending}>Cancel</button>
                    <button type="submit" className="btn-gold" style={{ flex: 1 }} disabled={isPending}>
                      {isPending ? "Onboarding..." : (onboardRole === "TEAM_LEAD" ? "Onboard Team Lead" : "Onboard Associate")}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* IT Provisioning / Hardware Modal */}
      {showITModal && activeEmp && (
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
            maxWidth: "540px",
            width: "100%",
            padding: "2rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "var(--shadow-premium)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="text-gold-gradient" style={{ fontSize: "1.25rem", fontWeight: 800 }}>IT DEPLOYMENT MANAGER</h2>
              <button 
                onClick={() => { setShowITModal(false); setActiveEmp(null); }}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.75rem" }}>
              Operator: <strong style={{ color: "var(--text-primary)" }}>{activeEmp.fullName}</strong> ({activeEmp.email})
              <br />
              ID: <strong style={{ color: "var(--gold-premium)" }}>{activeEmp.employeeId}</strong>
            </div>

            {itError && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "0.6rem 1rem", borderRadius: "4px", color: "var(--color-danger)", fontSize: "0.8rem" }}>
                {itError}
              </div>
            )}

            <form onSubmit={handleUpdateITSpecs} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Laptop Brand</label>
                  <select
                    value={laptopBrand}
                    onChange={(e) => setLaptopBrand(e.target.value as any)}
                    className="select-gold"
                  >
                    <option value="">Unassigned</option>
                    <option value="HP">HP</option>
                    <option value="Dell">Dell</option>
                    <option value="ThinkPad">ThinkPad</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Windows Version</label>
                  <select
                    value={windowsVersion}
                    onChange={(e) => setWindowsVersion(e.target.value as any)}
                    className="select-gold"
                  >
                    <option value="">N/A</option>
                    <option value="Windows_10">Windows 10</option>
                    <option value="Windows_11">Windows 11</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Laptop Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Latitude 5420"
                    value={laptopModel}
                    onChange={(e) => setLaptopModel(e.target.value)}
                    className="input-gold"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Laptop Serial S/N</label>
                  <input
                    type="text"
                    placeholder="e.g. TAG-23091A"
                    value={laptopSerialNumber}
                    onChange={(e) => setLaptopSerialNumber(e.target.value)}
                    className="input-gold"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Laptop Administrator Password</label>
                <input
                  type="text"
                  placeholder="Leave blank or specify strong password"
                  value={laptopPassword}
                  onChange={(e) => setLaptopPassword(e.target.value)}
                  className="input-gold"
                />
              </div>

              <div style={{ flex: 1, height: "1px", background: "var(--border-dim)", margin: "0.5rem 0" }}></div>

              <div className="form-group">
                <label className="form-label">VPN Provider</label>
                <select
                  value={vpnProvider}
                  onChange={(e) => setVpnProvider(e.target.value as any)}
                  className="select-gold"
                >
                  <option value="">No VPN</option>
                  <option value="Surfshark">Surfshark</option>
                  <option value="ExpressVPN">ExpressVPN</option>
                  <option value="NordVPN">NordVPN</option>
                  <option value="ProtonVPN">ProtonVPN</option>
                  <option value="PureVPN">PureVPN</option>
                  <option value="HideMe">HideMe</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => { setShowITModal(false); setActiveEmp(null); }}
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
                  {isPending ? "Saving Specs..." : "Save IT Specifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
