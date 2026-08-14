"use client";

import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Database, 
  MessageSquare, 
  FileText, 
  Laptop, 
  Shield, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Coffee, 
  Square, 
  Search, 
  Plus, 
  Sparkles, 
  Send, 
  ArrowRight, 
  RefreshCw, 
  X, 
  Check, 
  Coins, 
  Building2,
  TrendingUp,
  Activity,
  Layers,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import { 
  INITIAL_DEMO_USERS, 
  INITIAL_DEMO_ACCOUNTS, 
  INITIAL_DEMO_CHATS, 
  INITIAL_DEMO_NOTES, 
  MockUser, 
  MockAccount, 
  MockChatMessage, 
  MockNote 
} from "./mockDemoData";

export function playDemoChime(type: "clock-in" | "clock-out" | "message") {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";

    if (type === "clock-in") {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5
    } else if (type === "clock-out") {
      osc.frequency.setValueAtTime(783.99, now); // G5
      osc.frequency.exponentialRampToValueAtTime(440.00, now + 0.2); // A4
    } else {
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.1); // B5
    }

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    // Audio blocked by browser policy until gesture
  }
}

export default function DemoSandboxDashboard({ onExit }: { onExit: () => void }) {
  // Demo Role state
  const [activeRole, setActiveRole] = useState<"SUPER_ADMIN" | "TEAM_LEAD" | "SALES_ASSOCIATE" | "IT_DEPARTMENT">("SUPER_ADMIN");
  const [activeTab, setActiveTab] = useState<"dashboard" | "roster" | "accounts" | "chat" | "notes" | "telemetry">("dashboard");

  // In-memory Mock Data States
  const [users, setUsers] = useState<MockUser[]>(INITIAL_DEMO_USERS);
  const [accounts, setAccounts] = useState<MockAccount[]>(INITIAL_DEMO_ACCOUNTS);
  const [chats, setChats] = useState<MockChatMessage[]>(INITIAL_DEMO_CHATS);
  const [notes, setNotes] = useState<MockNote[]>(INITIAL_DEMO_NOTES);

  // Filter & Input States
  const [accountFilter, setAccountFilter] = useState("ALL");
  const [accountSearch, setAccountSearch] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [showAddNote, setShowAddNote] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Shift Timer for active role demo user
  const currentUser = users.find(u => u.role === activeRole) || users[0];
  const [dutyStatus, setDutyStatus] = useState<"ON_DUTY" | "ON_BREAK" | "OFF_DUTY">(currentUser.dutyStatus);
  const [shiftMinutes, setShiftMinutes] = useState(currentUser.totalMinutes || 120);

  // Sync role change with user duty status
  useEffect(() => {
    const user = users.find(u => u.role === activeRole) || users[0];
    setDutyStatus(user.dutyStatus);
    setShiftMinutes(user.totalMinutes || 120);
  }, [activeRole, users]);

  // Live timer tick
  useEffect(() => {
    let interval: any = null;
    if (dutyStatus === "ON_DUTY") {
      interval = setInterval(() => {
        setShiftMinutes(prev => prev + 1);
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [dutyStatus]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleDuty = (newStatus: "ON_DUTY" | "ON_BREAK" | "OFF_DUTY") => {
    setDutyStatus(newStatus);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, dutyStatus: newStatus } : u));
    playDemoChime(newStatus === "ON_DUTY" ? "clock-in" : "clock-out");
    showToast(`Duty status updated to ${newStatus.replace("_", " ")}`);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: MockChatMessage = {
      id: `chat-${Date.now()}`,
      senderName: `${currentUser.name} (You)`,
      senderRole: currentUser.role,
      message: chatInput.trim(),
      time: "Just now",
      isSelf: true
    };

    setChats(prev => [...prev, newMsg]);
    setChatInput("");
    playDemoChime("message");

    // Simulated auto-reply from Team Lead after 1.5s
    setTimeout(() => {
      const botReply: MockChatMessage = {
        id: `chat-${Date.now() + 1}`,
        senderName: "Sarah Jenkins (Team Lead Bot)",
        senderRole: "TEAM_LEAD",
        message: `Received your message: "${newMsg.message.slice(0, 30)}..." — Great work! Roster and account quotas are updated in real time.`,
        time: "Just now",
        isSelf: false
      };
      setChats(prev => [...prev, botReply]);
      playDemoChime("message");
    }, 1200);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;

    const newNote: MockNote = {
      id: `note-${Date.now()}`,
      title: newNoteTitle.trim(),
      content: newNoteContent.trim() || "No content provided.",
      category: "Personal",
      isPinned: true,
      updatedAt: "Just now"
    };

    setNotes(prev => [newNote, ...prev]);
    setNewNoteTitle("");
    setNewNoteContent("");
    setShowAddNote(false);
    showToast("Personal note saved successfully!");
  };

  const handleResetData = () => {
    setUsers(INITIAL_DEMO_USERS);
    setAccounts(INITIAL_DEMO_ACCOUNTS);
    setChats(INITIAL_DEMO_CHATS);
    setNotes(INITIAL_DEMO_NOTES);
    setDutyStatus("ON_DUTY");
    showToast("Demo sandbox data reset to defaults.");
  };

  // Filtered accounts
  const filteredAccounts = accounts.filter(acc => {
    const matchesPlatform = accountFilter === "ALL" || acc.platform.toLowerCase().includes(accountFilter.toLowerCase());
    const matchesSearch = acc.seriesNumber.toLowerCase().includes(accountSearch.toLowerCase()) || 
                          acc.accountHolder.toLowerCase().includes(accountSearch.toLowerCase()) ||
                          acc.assignedTo.toLowerCase().includes(accountSearch.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

  const totalVerifiedCount = accounts.filter(a => a.verificationStatus === "Yes").length;
  const totalDemoEarnings = totalVerifiedCount * 300;

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-[#0B0916] text-white overflow-hidden font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-[200] px-4 py-2.5 rounded-xl bg-[#38BDF8] text-[#0B0916] font-bold text-xs shadow-2xl flex items-center gap-2 animate-fadeIn">
          <Check size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Demo Controller Bar */}
      <header className="h-14 bg-[#141226]/95 border-b border-white/10 px-4 md:px-6 flex items-center justify-between backdrop-blur-xl shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black tracking-wider uppercase">
            <Sparkles size={13} className="animate-pulse" />
            <span>Interactive Sandbox</span>
          </div>
          <span className="text-xs text-[#94A3B8] hidden sm:inline">
            Zero DB Risk • 100% In-Memory Simulation
          </span>
        </div>

        {/* Role Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl">
          {(["SUPER_ADMIN", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"] as const).map(role => {
            const isSelected = activeRole === role;
            const labels = {
              SUPER_ADMIN: "👑 Super Admin",
              TEAM_LEAD: "👨‍💼 Team Lead",
              SALES_ASSOCIATE: "🚀 Sales Associate",
              IT_DEPARTMENT: "💻 IT Dept"
            };

            return (
              <button
                key={role}
                onClick={() => {
                  setActiveRole(role);
                  showToast(`Switched view to ${labels[role]}`);
                }}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                  isSelected 
                    ? "bg-[#38BDF8] text-[#0B0916] shadow-md shadow-[#38BDF8]/20" 
                    : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                }`}
              >
                {labels[role]}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetData}
            title="Reset Sandbox Data"
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-[#CBD5E1] flex items-center gap-1.5 transition-all"
          >
            <RefreshCw size={12} />
            <span className="hidden md:inline">Reset Sandbox</span>
          </button>
          <button
            onClick={onExit}
            className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 flex items-center gap-1.5 transition-all"
          >
            <X size={13} />
            <span>Exit Demo</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sandbox Navigation Sidebar */}
        <aside className="w-64 bg-[#0E0C1B] border-r border-white/10 p-3.5 flex flex-col justify-between shrink-0 hidden md:flex">
          <div className="flex flex-col gap-1">
            {/* User Profile Card */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 mb-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center font-black text-sm text-white border border-[#38BDF8]">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">{currentUser.name}</span>
                <span className="text-[10px] text-[#38BDF8] font-bold uppercase">{currentUser.role.replace("_", " ")}</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === "dashboard" ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30" : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Overview & Stats</span>
            </button>

            <button
              onClick={() => setActiveTab("roster")}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === "roster" ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30" : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={16} />
                <span>Live Duty Roster</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">
                {users.filter(u => u.dutyStatus === "ON_DUTY").length} Live
              </span>
            </button>

            <button
              onClick={() => setActiveTab("accounts")}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === "accounts" ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30" : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Database size={16} />
                <span>Master Accounts Pool</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[10px]">
                {accounts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === "chat" ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30" : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare size={16} />
                <span>Chat Workspace</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-ping" />
            </button>

            <button
              onClick={() => setActiveTab("notes")}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === "notes" ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30" : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
              }`}
            >
              <FileText size={16} />
              <span>Personal Notes</span>
            </button>

            <button
              onClick={() => setActiveTab("telemetry")}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === "telemetry" ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30" : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
              }`}
            >
              <Laptop size={16} />
              <span>Hardware Telemetry</span>
            </button>
          </div>

          {/* Quick Shift Duty Status Widget */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#94A3B8]">My Shift Duty</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                dutyStatus === "ON_DUTY" ? "bg-emerald-500/20 text-emerald-400" : (dutyStatus === "ON_BREAK" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400")
              }`}>
                {dutyStatus.replace("_", " ")}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#CBD5E1]">
              <Clock size={13} className="text-[#38BDF8]" />
              <span>{Math.floor(shiftMinutes / 60)}h {shiftMinutes % 60}m active</span>
            </div>

            <div className="grid grid-cols-3 gap-1 pt-1">
              <button
                onClick={() => handleToggleDuty("ON_DUTY")}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                  dutyStatus === "ON_DUTY" ? "bg-emerald-500 text-black shadow-md" : "bg-white/5 hover:bg-white/10 text-[#CBD5E1]"
                }`}
              >
                <Play size={10} />
                <span>Duty</span>
              </button>
              <button
                onClick={() => handleToggleDuty("ON_BREAK")}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                  dutyStatus === "ON_BREAK" ? "bg-amber-500 text-black shadow-md" : "bg-white/5 hover:bg-white/10 text-[#CBD5E1]"
                }`}
              >
                <Coffee size={10} />
                <span>Break</span>
              </button>
              <button
                onClick={() => handleToggleDuty("OFF_DUTY")}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                  dutyStatus === "OFF_DUTY" ? "bg-rose-500 text-white shadow-md" : "bg-white/5 hover:bg-white/10 text-[#CBD5E1]"
                }`}
              >
                <Square size={10} />
                <span>Exit</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Dynamic Sandbox Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 bg-[#0B0916]">
          {/* Top Overview KPI Cards */}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Welcome Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#141226] to-[#1E1B38] border border-white/10 relative overflow-hidden shadow-2xl">
                <div className="flex flex-col gap-1 z-10">
                  <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                    <span>Welcome to StaffOps v2</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30">
                      LIVE SANDBOX
                    </span>
                  </h1>
                  <p className="text-sm text-[#94A3B8]">
                    Testing as <strong className="text-white">{currentUser.name}</strong> ({currentUser.role.replace("_", " ")}). Explore live metrics, accounts, and communications.
                  </p>
                </div>
                <div className="flex items-center gap-3 z-10">
                  <button 
                    onClick={() => setActiveTab("roster")}
                    className="px-4 py-2 rounded-xl bg-[#38BDF8] text-[#0B0916] font-bold text-xs shadow-lg shadow-[#38BDF8]/25 hover:bg-[#7dd3fc] transition-all flex items-center gap-2"
                  >
                    <span>View Live Team</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[#94A3B8] text-xs font-semibold">
                    <span>Total Verified Accounts</span>
                    <Database size={16} className="text-[#38BDF8]" />
                  </div>
                  <span className="text-3xl font-black text-white">{totalVerifiedCount}</span>
                  <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> 100% On Target (Rule: 40/TL)
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[#94A3B8] text-xs font-semibold">
                    <span>Calculated Value (£)</span>
                    <Coins size={16} className="text-amber-400" />
                  </div>
                  <span className="text-3xl font-black text-amber-400">£{totalDemoEarnings.toLocaleString()}</span>
                  <span className="text-[11px] text-[#94A3B8]">
                    £300 / account payout rule
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[#94A3B8] text-xs font-semibold">
                    <span>Active Team On-Duty</span>
                    <Activity size={16} className="text-emerald-400" />
                  </div>
                  <span className="text-3xl font-black text-white">{users.filter(u => u.dutyStatus === "ON_DUTY").length} / {users.length}</span>
                  <span className="text-[11px] text-emerald-400 font-bold">
                    80% Operational Attendance
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[#94A3B8] text-xs font-semibold">
                    <span>Active VPN & Telemetry</span>
                    <Laptop size={16} className="text-purple-400" />
                  </div>
                  <span className="text-3xl font-black text-purple-400">100%</span>
                  <span className="text-[11px] text-emerald-400 font-bold">
                    Surfshark London Node OK
                  </span>
                </div>
              </div>

              {/* Live Accounts & Team Snapshot */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Accounts Pool */}
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Database size={16} className="text-[#38BDF8]" />
                      <span>Live Accounts Pool</span>
                    </h3>
                    <button onClick={() => setActiveTab("accounts")} className="text-xs text-[#38BDF8] font-bold hover:underline">
                      View All ({accounts.length})
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {accounts.slice(0, 3).map(acc => (
                      <div key={acc.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[#38BDF8] flex items-center justify-center font-mono text-xs font-bold">
                            {acc.platform.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">{acc.seriesNumber}</span>
                            <span className="text-[11px] text-[#94A3B8]">{acc.accountHolder} • {acc.platform}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                            {acc.status}
                          </span>
                          <span className="text-xs font-bold text-amber-400">£{acc.earnings}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Live Duty Snapshot */}
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Users size={16} className="text-emerald-400" />
                      <span>Team Live Roster</span>
                    </h3>
                    <button onClick={() => setActiveTab("roster")} className="text-xs text-[#38BDF8] font-bold hover:underline">
                      Manage Roster
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {users.map(u => (
                      <div key={u.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">{u.name}</span>
                            <span className="text-[11px] text-[#94A3B8]">{u.role.replace("_", " ")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.dutyStatus === "ON_DUTY" ? "bg-emerald-500/20 text-emerald-400" : (u.dutyStatus === "ON_BREAK" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400")
                          }`}>
                            {u.dutyStatus.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Accounts Pool View */}
          {activeTab === "accounts" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Database size={20} className="text-[#38BDF8]" />
                    <span>Master Accounts Pool</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8]">
                    Manage Vinted UK, Facebook Marketplace, and eBay UK accounts with live status tracking.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      type="text"
                      value={accountSearch}
                      onChange={e => setAccountSearch(e.target.value)}
                      placeholder="Search accounts..."
                      className="pl-8 pr-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#38BDF8]"
                    />
                  </div>

                  <select
                    value={accountFilter}
                    onChange={e => setAccountFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-[#141226] border border-white/10 rounded-xl text-white focus:outline-none"
                  >
                    <option value="ALL">All Platforms</option>
                    <option value="Vinted">Vinted UK</option>
                    <option value="Facebook">Facebook Marketplace</option>
                    <option value="eBay">eBay UK</option>
                  </select>
                </div>
              </div>

              {/* Accounts Table */}
              <div className="w-full rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-[#CBD5E1] border-b border-white/5 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3.5">Series Number</th>
                      <th className="p-3.5">Platform</th>
                      <th className="p-3.5">Account Holder</th>
                      <th className="p-3.5">Assigned Rep</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Verification</th>
                      <th className="p-3.5">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {filteredAccounts.map(acc => (
                      <tr key={acc.id} className="hover:bg-white/[0.02] transition-all">
                        <td className="p-3.5 font-mono font-bold text-[#38BDF8]">{acc.seriesNumber}</td>
                        <td className="p-3.5 text-white font-medium">{acc.platform}</td>
                        <td className="p-3.5 text-[#CBD5E1]">{acc.accountHolder}</td>
                        <td className="p-3.5 text-[#94A3B8]">{acc.assignedTo}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            acc.status === "VERIFIED" ? "bg-emerald-500/20 text-emerald-400" : (acc.status === "UNDER_REVIEW" ? "bg-amber-500/20 text-amber-400" : "bg-sky-500/20 text-sky-400")
                          }`}>
                            {acc.status}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`font-bold ${acc.verificationStatus === "Yes" ? "text-emerald-400" : "text-amber-400"}`}>
                            {acc.verificationStatus}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-amber-400">£{acc.earnings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Live Roster View */}
          {activeTab === "roster" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Users size={20} className="text-emerald-400" />
                    <span>Live Team Operations Roster</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8]">
                    Real-time operational presence, break monitoring, and shift duty logs.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map(u => (
                  <div key={u.id} className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col gap-4 hover:border-white/10 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-black text-sm text-white border border-white/10">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">{u.name}</span>
                          <span className="text-xs text-[#94A3B8]">{u.email}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        u.dutyStatus === "ON_DUTY" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : (u.dutyStatus === "ON_BREAK" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30")
                      }`}>
                        {u.dutyStatus.replace("_", " ")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs text-[#CBD5E1]">
                      <div>Clock In: <strong className="text-white">{u.clockInTime || "N/A"}</strong></div>
                      <div>Verified Accounts: <strong className="text-emerald-400">{u.verifiedAccountsCount}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Workspace View */}
          {activeTab === "chat" && (
            <div className="flex flex-col gap-4 h-full max-h-[600px] animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-[#38BDF8]" />
                  <span className="font-bold text-sm text-white">Operations Chat Channel</span>
                </div>
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Live Team Channel
                </span>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-4 bg-white/[0.01] rounded-2xl border border-white/5">
                {chats.map(msg => (
                  <div key={msg.id} className={`flex flex-col max-w-[80%] ${msg.isSelf ? "ml-auto items-end" : "mr-auto items-start"}`}>
                    <span className="text-[10px] text-[#94A3B8] font-bold mb-1">{msg.senderName} • {msg.time}</span>
                    <div className={`p-3 rounded-2xl text-xs ${
                      msg.isSelf ? "bg-[#38BDF8] text-[#0B0916] font-medium" : "bg-white/10 text-white border border-white/10"
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Message Input */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type a simulated message to your team (e.g. Completed Vinted batch)..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-2xl bg-[#38BDF8] text-[#0B0916] font-bold text-xs hover:bg-[#7dd3fc] transition-all flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}

          {/* Personal Notes View */}
          {activeTab === "notes" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <FileText size={20} className="text-[#38BDF8]" />
                    <span>Personal Notes & Scratchpad</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8]">
                    Save quick procedures, daily goals, and private operational snippets.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddNote(!showAddNote)}
                  className="px-4 py-2 rounded-xl bg-[#38BDF8] text-[#0B0916] font-bold text-xs flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>{showAddNote ? "Cancel" : "Add Note"}</span>
                </button>
              </div>

              {showAddNote && (
                <form onSubmit={handleAddNote} className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                  <input
                    type="text"
                    value={newNoteTitle}
                    onChange={e => setNewNoteTitle(e.target.value)}
                    placeholder="Note Title..."
                    className="px-3.5 py-2 text-xs bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none"
                    required
                  />
                  <textarea
                    value={newNoteContent}
                    onChange={e => setNewNoteContent(e.target.value)}
                    placeholder="Note details, checklist, or instructions..."
                    rows={3}
                    className="px-3.5 py-2 text-xs bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none"
                  />
                  <button type="submit" className="w-fit px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs">
                    Save Note
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notes.map(note => (
                  <div key={note.id} className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{note.title}</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-[#94A3B8] text-[10px]">{note.category}</span>
                    </div>
                    <p className="text-xs text-[#CBD5E1] whitespace-pre-line leading-relaxed">{note.content}</p>
                    <span className="text-[10px] text-[#94A3B8] pt-2 border-t border-white/5">{note.updatedAt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Telemetry View */}
          {activeTab === "telemetry" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Laptop size={20} className="text-purple-400" />
                  <span>Workstation Hardware & VPN Telemetry</span>
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  Automated background health checks reporting CPU, RAM, active VPN nodes, and screen audit intervals.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col gap-3">
                  <span className="text-xs font-bold text-[#94A3B8]">VPN Fleet Status</span>
                  <span className="text-2xl font-black text-emerald-400">100% Secure</span>
                  <p className="text-xs text-[#CBD5E1]">Surfshark UK Nodes • 0 IP Leaks</p>
                </div>
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col gap-3">
                  <span className="text-xs font-bold text-[#94A3B8]">Desktop Agent Version</span>
                  <span className="text-2xl font-black text-[#38BDF8]">V-4.4.8 (.zip)</span>
                  <p className="text-xs text-[#CBD5E1]">Node.js Native Telemetry Daemon</p>
                </div>
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col gap-3">
                  <span className="text-xs font-bold text-[#94A3B8]">Anti-Tamper Monitor</span>
                  <span className="text-2xl font-black text-purple-400">0 Tamper Alerts</span>
                  <p className="text-xs text-[#CBD5E1]">Clock & VPN lock active</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
