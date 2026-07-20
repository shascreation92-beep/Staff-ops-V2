"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  Clipboard, 
  Check, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save, 
  Database, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Edit,
  Palette,
  Filter,
  CheckCircle2
} from "lucide-react";
import { toast } from "react-hot-toast";
import { 
  saveParsedAccountsAction, 
  getParsedAccountsLedgerAction,
  updateParsedAccountColorAction,
  updateParsedAccountRemarksAction,
  bulkUpdateParsedAccountsColorAction
} from "@/app/actions/it-parsed-accounts";
import { formatDate12h } from "@/lib/date-formatter";

interface ITAccountsParserClientProps {
  initialAccounts: any[];
  initialTotal: number;
  user: {
    id: string;
    name?: string | null;
    role: string;
    companyId?: string | null;
  };
}

interface ParsedRow {
  seriesNumber: string;
  password: string;
  name: string;
  isValid: boolean;
}

export default function ITAccountsParserClient({
  initialAccounts,
  initialTotal,
  user
}: ITAccountsParserClientProps) {
  const [pasteContent, setPasteContent] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [ledger, setLedger] = useState<any[]>(initialAccounts);
  const [totalRecords, setTotalRecords] = useState<number>(initialTotal);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showHistoryPasswords, setShowHistoryPasswords] = useState<{ [key: string]: boolean }>({});
  const [showPreviewPasswords, setShowPreviewPasswords] = useState<{ [key: number]: boolean }>({});
  
  // Highlighter & Remarks states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [colorFilter, setColorFilter] = useState<"ALL" | "GREEN" | "YELLOW" | "NONE">("ALL");
  const [editingRemarksId, setEditingRemarksId] = useState<string | null>(null);
  const [tempRemarks, setTempRemarks] = useState<string>("");
  const [savingRemarksId, setSavingRemarksId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Sync ledger updates when initialAccounts changes (e.g. on new page navigation)
  useEffect(() => {
    setLedger(initialAccounts);
  }, [initialAccounts]);

  // Helper for single-digit format (e.g., "05" instead of "5")
  const pad = (num: number): string => {
    return num < 10 ? `0${num}` : String(num);
  };

  // Split tab-separated text payload into records
  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPasteContent(val);

    if (!val.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = val.split(/\r?\n/).filter(line => line.trim() !== "");
    const tempRows: ParsedRow[] = lines.map(line => {
      const parts = line.split("\t");
      
      const seriesNumber = parts[0]?.trim() || "";
      const password = parts[1]?.trim() || "";
      const name = parts[2]?.trim() || "";
      
      const isValid = seriesNumber.length > 0 && password.length > 0 && name.length > 0;

      return {
        seriesNumber,
        password,
        name,
        isValid
      };
    });

    setParsedRows(tempRows);
  };

  const handleClearPreview = () => {
    setPasteContent("");
    setParsedRows([]);
    setShowPreviewPasswords({});
    toast.success("Cleared parser preview");
  };

  const handleSaveAccounts = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    
    if (validRows.length === 0) {
      toast.error("No valid accounts to save. Please fix the paste errors.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = validRows.map(r => ({
          seriesNumber: r.seriesNumber,
          password: r.password,
          name: r.name
        }));

        const res = await saveParsedAccountsAction(payload);
        if (res.success) {
          toast.success(`${pad(res.count || 0)} Created Accounts Loaded Successfully`);
          handleClearPreview();
          // Reload page 1 history ledger
          const ledgerRes = await getParsedAccountsLedgerAction(1);
          if (ledgerRes.success) {
            setLedger(ledgerRes.accounts || []);
            setTotalRecords(ledgerRes.total || 0);
            setCurrentPage(1);
            setSelectedIds(new Set());
          }
        } else {
          toast.error(res.error || "Failed to load accounts.");
        }
      } catch (err: any) {
        toast.error(err.message || "An error occurred during save.");
      }
    });
  };

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1) return;
    try {
      const ledgerRes = await getParsedAccountsLedgerAction(newPage);
      if (ledgerRes.success) {
        setLedger(ledgerRes.accounts || []);
        setTotalRecords(ledgerRes.total || 0);
        setCurrentPage(newPage);
        setSelectedIds(new Set()); // Reset selections on page change
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleHistoryPassword = (id: string) => {
    setShowHistoryPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const togglePreviewPassword = (idx: number) => {
    setShowPreviewPasswords(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Color selection triggers
  const handleColorChange = async (id: string, color: string | null) => {
    try {
      const res = await updateParsedAccountColorAction(id, color);
      if (res.success) {
        setLedger(prev => prev.map(item => item.id === id ? { ...item, color } : item));
        toast.success("Row highlight updated");
      } else {
        toast.error(res.error || "Failed to update highlight color");
      }
    } catch (e: any) {
      toast.error(e.message || "Error updating color");
    }
  };

  // Bulk color highlights
  const handleBulkColorChange = async (color: string | null) => {
    if (selectedIds.size === 0) return;
    const idsArray = Array.from(selectedIds);
    try {
      const res = await bulkUpdateParsedAccountsColorAction(idsArray, color);
      if (res.success) {
        setLedger(prev => prev.map(item => idsArray.includes(item.id) ? { ...item, color } : item));
        setSelectedIds(new Set());
        toast.success(`Highlight updated for ${idsArray.length} items`);
      } else {
        toast.error(res.error || "Failed to update highlights");
      }
    } catch (e: any) {
      toast.error(e.message || "Error updating highlights");
    }
  };

  // Remarks save handler
  const handleSaveRemarks = async (id: string) => {
    setSavingRemarksId(id);
    try {
      const res = await updateParsedAccountRemarksAction(id, tempRemarks.trim() || null);
      if (res.success) {
        setLedger(prev => prev.map(item => item.id === id ? { ...item, remarks: tempRemarks.trim() } : item));
        setEditingRemarksId(null);
        toast.success("Remarks updated successfully");
      } else {
        toast.error(res.error || "Failed to save remarks");
      }
    } catch (e: any) {
      toast.error(e.message || "Error saving remarks");
    } finally {
      setSavingRemarksId(null);
    }
  };

  // Selection toggles
  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllOnPage = () => {
    const allIdsOnPage = filteredLedger.map(item => item.id);
    const allSelectedOnPage = allIdsOnPage.every(id => selectedIds.has(id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        allIdsOnPage.forEach(id => next.delete(id));
      } else {
        allIdsOnPage.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Filter local ledger elements
  const filteredLedger = ledger.filter(item => {
    if (colorFilter === "ALL") return true;
    if (colorFilter === "GREEN") return item.color === "GREEN";
    if (colorFilter === "YELLOW") return item.color === "YELLOW";
    if (colorFilter === "NONE") return !item.color;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(totalRecords / 50));
  const validCount = parsedRows.filter(r => r.isValid).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", height: "100%", width: "100%", overflowY: "auto", paddingBottom: "3rem" }}>
      
      {/* Page Header */}
      <div className="glass-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem", borderRadius: "12px", background: "rgba(255, 255, 255, 0.45)", border: "1px solid var(--border-dim)" }}>
        <div>
          <h1 style={{ fontSize: "1.55rem", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database style={{ color: "var(--gold-premium)" }} size={26} />
            IT Accounts Parser
          </h1>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            Securely paste, validate, and load Google Sheets/Excel spreadsheets directly into your tenant workspace.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.68rem", color: "var(--text-muted)", background: "rgba(15, 23, 42, 0.03)", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--border-dim)" }}>
          <ShieldCheck size={14} style={{ color: "green" }} />
          Role: IT Agent
        </div>
      </div>

      {/* Grid paste & Preview splits */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem", alignItems: "start" }}>
        
        {/* Left Side: Paste Workspace */}
        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "16px", background: "#FFFFFF", border: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)" }}>
              Sheets Ingestion Paste Zone
            </h2>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Copy rows from Sheets (Column A: Series Number, Column B: Password, Column C: Name) and paste here.
            </p>
          </div>

          <textarea
            value={pasteContent}
            onChange={handlePasteChange}
            placeholder="Paste your spreadsheet rows here (Ctrl+V)&#10;Format (Tab Separated):&#10;SERIES-001	P@ssword123	David IT&#10;SERIES-002	AdminSecure4	Sarah IT"
            style={{
              width: "100%",
              height: "220px",
              fontSize: "0.75rem",
              fontFamily: "monospace",
              lineHeight: "1.45",
              background: "rgba(15, 23, 42, 0.015)",
              border: "1px solid var(--border-dim)",
              borderRadius: "8px",
              padding: "0.75rem",
              resize: "none",
              color: "var(--text-primary)",
              outline: "none"
            }}
          />

          {parsedRows.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                Rows detected: {pad(parsedRows.length)} (Valid: {pad(validCount)})
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={handleClearPreview}
                  className="btn-glass"
                  style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.72rem", padding: "0.4rem 0.6rem", borderRadius: "6px" }}
                >
                  <Trash2 size={13} />
                  Clear
                </button>
                <button
                  onClick={handleSaveAccounts}
                  disabled={isPending || validCount === 0}
                  className="btn-gold"
                  style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.72rem", padding: "0.4rem 0.8rem", borderRadius: "6px", fontWeight: 800 }}
                >
                  <Save size={13} />
                  {isPending ? "Loading..." : "Submit Records"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Validation checklist and row preview */}
        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "16px", background: "#FFFFFF", border: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)" }}>
              Data Validator & Real-Time Grid
            </h2>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Validates parsed rows automatically before committing them.
            </p>
          </div>

          {parsedRows.length === 0 ? (
            <div style={{ padding: "3.5rem 1rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
              <Clipboard size={24} style={{ color: "var(--text-muted)" }} />
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>No data pasted. Paste rows in the left panel to trigger preview validation.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "250px", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}>
                    <th style={{ padding: "0.4rem" }}>#</th>
                    <th style={{ padding: "0.4rem" }}>Series Code</th>
                    <th style={{ padding: "0.4rem" }}>Password</th>
                    <th style={{ padding: "0.4rem" }}>Name</th>
                    <th style={{ padding: "0.4rem" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, idx) => (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: "1px solid var(--border-dim)", 
                        background: row.isValid ? "transparent" : "rgba(239, 68, 68, 0.05)" 
                      }}
                    >
                      <td style={{ padding: "0.4rem", fontWeight: 700 }}>{pad(idx + 1)}</td>
                      <td style={{ padding: "0.4rem", fontWeight: 700 }}>{row.seriesNumber || <span style={{ color: "red", fontStyle: "italic" }}>[Empty]</span>}</td>
                      <td style={{ padding: "0.4rem", fontFamily: "monospace" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                          <span>{showPreviewPasswords[idx] ? row.password : "••••••••"}</span>
                          {row.password && (
                            <button 
                              onClick={() => togglePreviewPassword(idx)}
                              style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "flex", color: "var(--text-muted)" }}
                            >
                              {showPreviewPasswords[idx] ? <EyeOff size={11} /> : <Eye size={11} />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "0.4rem" }}>{row.name || <span style={{ color: "red", fontStyle: "italic" }}>[Empty]</span>}</td>
                      <td style={{ padding: "0.4rem" }}>
                        {row.isValid ? (
                          <span style={{ color: "green", fontWeight: 800 }}>✓ Valid</span>
                        ) : (
                          <span style={{ color: "red", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.1rem" }}>
                            <AlertTriangle size={10} />
                            Fix
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {parsedRows.length > 0 && validCount > 0 && (
            <div style={{ padding: "0.5rem", borderRadius: "8px", background: "rgba(34, 197, 94, 0.06)", border: "1px solid rgba(34, 197, 94, 0.2)", fontSize: "0.72rem", color: "green", fontWeight: 700 }}>
              🚀 {pad(validCount)} Created Accounts Loaded Successfully (Ready to save)
            </div>
          )}
        </div>

      </div>

      {/* Ledger Table Panel (History List) */}
      <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "16px", background: "#FFFFFF", border: "1px solid var(--border-dim)" }}>
        
        {/* Table Title and Color Filter Options */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            IT Account Load History
          </h2>
          
          {/* Color filter pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "rgba(0,0,0,0.02)", padding: "0.25rem", borderRadius: "8px", border: "1px solid var(--border-dim)" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", padding: "0 0.5rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.2rem" }}>
              <Filter size={11} /> Filter:
            </span>
            <button 
              onClick={() => setColorFilter("ALL")}
              style={{
                background: colorFilter === "ALL" ? "rgba(0, 119, 182, 0.08)" : "transparent",
                border: "none",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: colorFilter === "ALL" ? "var(--gold-primary)" : "var(--text-secondary)",
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              All
            </button>
            <button 
              onClick={() => setColorFilter("GREEN")}
              style={{
                background: colorFilter === "GREEN" ? "rgba(34, 197, 94, 0.12)" : "transparent",
                border: "none",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "#22C55E",
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Green
            </button>
            <button 
              onClick={() => setColorFilter("YELLOW")}
              style={{
                background: colorFilter === "YELLOW" ? "rgba(234, 179, 8, 0.12)" : "transparent",
                border: "none",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "#D97706",
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Yellow
            </button>
            <button 
              onClick={() => setColorFilter("NONE")}
              style={{
                background: colorFilter === "NONE" ? "rgba(100, 116, 139, 0.1)" : "transparent",
                border: "none",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}>
                <th style={{ padding: "0.6rem 0.4rem", width: "40px" }}>
                  <input 
                    type="checkbox"
                    checked={filteredLedger.length > 0 && filteredLedger.every(item => selectedIds.has(item.id))}
                    onChange={handleSelectAllOnPage}
                    style={{ cursor: "pointer", accentColor: "var(--gold-primary)" }}
                  />
                </th>
                <th style={{ padding: "0.6rem 0.4rem", width: "50px" }}>#</th>
                <th style={{ padding: "0.6rem 0.4rem" }}>Series Code</th>
                <th style={{ padding: "0.6rem 0.4rem" }}>Password</th>
                <th style={{ padding: "0.6rem 0.4rem" }}>Owner Name</th>
                <th style={{ padding: "0.6rem 0.4rem" }}>Created Date</th>
                <th style={{ padding: "0.6rem 0.4rem" }}>Highlight</th>
                <th style={{ padding: "0.6rem 0.4rem" }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", fontWeight: 600 }}>
                    No uploaded account records matching the selected color filter.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((acc, idx) => {
                  const isRowSelected = selectedIds.has(acc.id);
                  let rowBackground = isRowSelected ? "rgba(2, 119, 182, 0.03)" : "transparent";
                  let borderLeftStyle = "none";

                  if (acc.color === "GREEN") {
                    rowBackground = "rgba(34, 197, 94, 0.06)";
                    borderLeftStyle = "4px solid #22C55E";
                  } else if (acc.color === "YELLOW") {
                    rowBackground = "rgba(234, 179, 8, 0.06)";
                    borderLeftStyle = "4px solid #EAB308";
                  }

                  return (
                    <tr 
                      key={acc.id} 
                      style={{ 
                        borderBottom: "1px solid var(--border-dim)", 
                        background: rowBackground,
                        borderLeft: borderLeftStyle,
                        transition: "background 0.2s"
                      }}
                    >
                      {/* Checkbox column */}
                      <td style={{ padding: "0.6rem 0.4rem" }}>
                        <input 
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => toggleSelectRow(acc.id)}
                          style={{ cursor: "pointer", accentColor: "var(--gold-primary)" }}
                        />
                      </td>

                      <td style={{ padding: "0.6rem 0.4rem", fontWeight: 700 }}>
                        {pad((currentPage - 1) * 50 + idx + 1)}
                      </td>
                      <td style={{ padding: "0.6rem 0.4rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {acc.seriesNumber}
                      </td>
                      <td style={{ padding: "0.6rem 0.4rem", fontFamily: "monospace" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <span>{showHistoryPasswords[acc.id] ? acc.password : "••••••••"}</span>
                          <button 
                            onClick={() => toggleHistoryPassword(acc.id)}
                            style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "flex", color: "var(--text-muted)" }}
                          >
                            {showHistoryPasswords[acc.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "0.6rem 0.4rem", color: "var(--text-secondary)" }}>
                        {acc.name}
                      </td>
                      <td style={{ padding: "0.6rem 0.4rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        <span className="show-seconds-desktop">{formatDate12h(acc.createdAt, true)}</span>
                        <span className="hide-seconds-mobile" style={{ display: "none" }}>{formatDate12h(acc.createdAt, false)}</span>
                      </td>

                      {/* Color Circle Picker */}
                      <td style={{ padding: "0.6rem 0.4rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <button
                            onClick={() => handleColorChange(acc.id, acc.color === "GREEN" ? null : "GREEN")}
                            title="Highlight Green"
                            style={{
                              width: "14px",
                              height: "14px",
                              borderRadius: "50%",
                              background: "#22C55E",
                              border: acc.color === "GREEN" ? "2px solid var(--text-primary)" : "1px solid rgba(0,0,0,0.15)",
                              cursor: "pointer",
                              padding: 0,
                              transform: acc.color === "GREEN" ? "scale(1.15)" : "scale(1)",
                              transition: "transform 0.15s"
                            }}
                          />
                          <button
                            onClick={() => handleColorChange(acc.id, acc.color === "YELLOW" ? null : "YELLOW")}
                            title="Highlight Yellow"
                            style={{
                              width: "14px",
                              height: "14px",
                              borderRadius: "50%",
                              background: "#EAB308",
                              border: acc.color === "YELLOW" ? "2px solid var(--text-primary)" : "1px solid rgba(0,0,0,0.15)",
                              cursor: "pointer",
                              padding: 0,
                              transform: acc.color === "YELLOW" ? "scale(1.15)" : "scale(1)",
                              transition: "transform 0.15s"
                            }}
                          />
                          {acc.color && (
                            <button
                              onClick={() => handleColorChange(acc.id, null)}
                              title="Clear Highlight"
                              style={{
                                border: "none",
                                background: "transparent",
                                fontSize: "0.68rem",
                                fontWeight: 800,
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                padding: "0 0.15rem",
                                display: "flex",
                                alignItems: "center"
                              }}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Remarks Field (Inline Editing) */}
                      <td style={{ padding: "0.6rem 0.4rem" }}>
                        {editingRemarksId === acc.id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <input
                              type="text"
                              value={tempRemarks}
                              onChange={(e) => setTempRemarks(e.target.value)}
                              onBlur={() => handleSaveRemarks(acc.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveRemarks(acc.id);
                                if (e.key === "Escape") setEditingRemarksId(null);
                              }}
                              autoFocus
                              placeholder="Write remark..."
                              style={{
                                width: "100%",
                                maxWidth: "250px",
                                height: "26px",
                                background: "#FFFFFF",
                                border: "1.5px solid var(--gold-primary)",
                                borderRadius: "4px",
                                padding: "0 0.5rem",
                                fontSize: "0.72rem",
                                outline: "none",
                                color: "var(--text-primary)"
                              }}
                            />
                            {savingRemarksId === acc.id && (
                              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", animation: "pulse 1s infinite" }}>
                                Saving...
                              </span>
                            )}
                          </div>
                        ) : (
                          <div 
                            onClick={() => {
                              setEditingRemarksId(acc.id);
                              setTempRemarks(acc.remarks || "");
                            }}
                            className="remarks-cell-hover"
                            style={{ 
                              display: "inline-flex", 
                              alignItems: "center", 
                              gap: "0.4rem", 
                              cursor: "pointer",
                              padding: "0.2rem 0.4rem",
                              borderRadius: "4px",
                              maxWidth: "320px",
                              minWidth: "100px",
                              width: "100%",
                              transition: "background 0.2s"
                            }}
                          >
                            {acc.remarks ? (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-primary)", wordBreak: "break-word" }}>
                                {acc.remarks}
                              </span>
                            ) : (
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                Add remark...
                              </span>
                            )}
                            <Edit size={11} className="edit-icon" style={{ opacity: 0.3, flexShrink: 0 }} />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Verbatim footer indicator */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
          <span>
            Showing 1-50 of {pad(totalRecords)} entries
          </span>
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn-glass"
                style={{ padding: "0.3rem", borderRadius: "6px" }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontWeight: 700 }}>{pad(currentPage)} / {pad(totalPages)}</span>
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="btn-glass"
                style={{ padding: "0.3rem", borderRadius: "6px" }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Floating Contextual Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div style={{
          position: "fixed",
          bottom: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(255, 255, 255, 0.95)",
          border: "1.5px solid var(--border-dim)",
          boxShadow: "0 10px 30px rgba(0, 8, 20, 0.15)",
          borderRadius: "9999px",
          padding: "0.45rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          zIndex: 100,
          backdropFilter: "blur(12px)",
          animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 750, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
            ⚡ {selectedIds.size} rows selected
          </span>
          <div style={{ height: "16px", width: "1px", background: "var(--border-dim)" }} />
          <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
            <button
              onClick={() => handleBulkColorChange("GREEN")}
              className="btn-glass"
              style={{ 
                padding: "0.25rem 0.75rem", 
                fontSize: "0.72rem", 
                display: "inline-flex", 
                alignItems: "center", 
                gap: "0.3rem", 
                color: "#22C55E", 
                borderRadius: "9999px",
                fontWeight: 700
              }}
            >
              <Palette size={11} />
              Highlight Green
            </button>
            <button
              onClick={() => handleBulkColorChange("YELLOW")}
              className="btn-glass"
              style={{ 
                padding: "0.25rem 0.75rem", 
                fontSize: "0.72rem", 
                display: "inline-flex", 
                alignItems: "center", 
                gap: "0.3rem", 
                color: "#D97706", 
                borderRadius: "9999px",
                fontWeight: 700
              }}
            >
              <Palette size={11} />
              Highlight Yellow
            </button>
            <button
              onClick={() => handleBulkColorChange(null)}
              className="btn-glass"
              style={{ 
                padding: "0.25rem 0.75rem", 
                fontSize: "0.72rem", 
                color: "var(--text-secondary)", 
                borderRadius: "9999px",
                fontWeight: 700
              }}
            >
              Clear Highlight
            </button>
          </div>
        </div>
      )}

      {/* Styled hover state styles using dynamic CSS in React */}
      <style jsx global>{`
        .remarks-cell-hover:hover {
          background: rgba(0,0,0,0.02);
        }
        .remarks-cell-hover:hover .edit-icon {
          opacity: 0.8 !important;
        }
        @keyframes slideUp {
          from {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
