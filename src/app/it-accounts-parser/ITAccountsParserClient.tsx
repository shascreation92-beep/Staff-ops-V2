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
  ShieldCheck
} from "lucide-react";
import { toast } from "react-hot-toast";
import { saveParsedAccountsAction, getParsedAccountsLedgerAction } from "@/app/actions/it-parsed-accounts";

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
  
  const [isPending, startTransition] = useTransition();

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

  const totalPages = Math.max(1, Math.ceil(totalRecords / 50));
  const validCount = parsedRows.filter(r => r.isValid).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", height: "100%", width: "100%", overflowY: "auto", paddingBottom: "1.5rem" }}>
      
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
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
          IT Account Load History
        </h2>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}>
                <th style={{ padding: "0.6rem 0.4rem" }}>#</th>
                <th style={{ padding: "0.6rem 0.4rem" }}>Series Code</th>
                <th style={{ padding: "0.6rem 0.4rem" }}>Password</th>
                <th style={{ padding: "0.6rem 0.4rem" }}>Owner Name</th>
                <th style={{ padding: "0.6rem 0.4rem" }}>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No uploaded account records found.
                  </td>
                </tr>
              ) : (
                ledger.map((acc, idx) => (
                  <tr key={acc.id} style={{ borderBottom: "1px solid var(--border-dim)" }}>
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
                    <td style={{ padding: "0.6rem 0.4rem", color: "var(--text-muted)" }}>
                      {new Date(acc.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
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

    </div>
  );
}
