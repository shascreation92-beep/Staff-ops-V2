"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Shield, 
  Database, 
  Laptop, 
  FileText, 
  TrendingUp, 
  Calendar, 
  Building2, 
  Activity, 
  X, 
  ArrowRight,
  Sparkles
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  category: "Operations" | "Infrastructure" | "Intelligence" | "Tools";
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles?: string[];
}

const COMMANDS: CommandItem[] = [
  { id: "dashboard", title: "Main Dashboard", category: "Operations", path: "/", icon: LayoutDashboard },
  { id: "live-roster", title: "Live Duty Roster", category: "Operations", path: "/team-live-roster", icon: Activity },
  { id: "my-team", title: "Team Directory & Performance", category: "Operations", path: "/my-team", icon: Users },
  { id: "leave-requests", title: "Leave Approvals & Calendar", category: "Operations", path: "/leave-requests", icon: Calendar },
  { id: "telemetry", title: "Workstation Telemetry & System", category: "Infrastructure", path: "/telemetry", icon: Laptop },
  { id: "screen-telemetry", title: "Screen Captures & Audits", category: "Infrastructure", path: "/screen-telemetry", icon: Shield },
  { id: "it-management", title: "Hardware Assets & VPNs", category: "Infrastructure", path: "/it-management", icon: Database },
  { id: "it-parser", title: "Account Auto-Parser", category: "Infrastructure", path: "/it-parsed-accounts", icon: Sparkles },
  { id: "accounts", title: "Master Accounts Pool", category: "Intelligence", path: "/accounts", icon: Database },
  { id: "uk-trends", title: "UK Market Trends & Pricing", category: "Intelligence", path: "/uk-trends", icon: TrendingUp },
  { id: "special-requests", title: "Sales Associate Requests", category: "Intelligence", path: "/special-requests", icon: FileText },
  { id: "chat-space", title: "Real-Time Chat Space", category: "Tools", path: "/chat-space", icon: MessageSquare },
  { id: "personal-notes", title: "Personal Notes & Scratchpad", category: "Tools", path: "/personal-notes", icon: FileText },
  { id: "companies", title: "Company Organization Hub", category: "Operations", path: "/companies", icon: Building2 },
  { id: "audit-logs", title: "Security & Compliance Logs", category: "Tools", path: "/audit-logs", icon: Shield },
];

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = COMMANDS.filter(cmd => 
    cmd.title.toLowerCase().includes(query.toLowerCase()) || 
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (path: string) => {
    onClose();
    router.push(path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredCommands[selectedIndex].path);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-[#141226]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 gap-3">
          <Search size={18} className="text-[#38BDF8]" />
          <input 
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or jump to page... (e.g. Roster, IT, Chat)"
            className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none placeholder:text-[#94A3B8]"
          />
          <kbd className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#94A3B8]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-[#94A3B8] text-sm">
              No matching pages or tools found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd.path)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left transition-all ${
                    isSelected 
                      ? "bg-[#38BDF8]/15 text-white border border-[#38BDF8]/30 shadow-sm" 
                      : "text-[#CBD5E1] hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${isSelected ? "bg-[#38BDF8]/20 text-[#38BDF8]" : "bg-white/5 text-[#94A3B8]"}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{cmd.title}</span>
                      <span className="text-[11px] text-[#94A3B8]">{cmd.category}</span>
                    </div>
                  </div>
                  {isSelected && <ArrowRight size={14} className="text-[#38BDF8]" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[11px] text-[#94A3B8]">
          <div className="flex items-center gap-3">
            <span>Navigation: <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10">↑</kbd> <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10">↓</kbd></span>
            <span>Select: <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10">↵</kbd></span>
          </div>
          <span className="text-[#38BDF8] font-semibold">StaffOps Quick Jump</span>
        </div>
      </div>
    </div>
  );
}
