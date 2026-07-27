"use client";

import React, { useState } from "react";
import { Image, FileText, X, Download, ExternalLink, Music } from "lucide-react";

interface MediaItem {
  id: string;
  type: "image" | "document" | "audio";
  url: string;
  name: string;
  createdAt: string;
  senderName: string;
}

interface ChatMediaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: MediaItem[];
}

export function ChatMediaDrawer({ isOpen, onClose, items }: ChatMediaDrawerProps) {
  const [activeTab, setActiveTab] = useState<"all" | "images" | "documents" | "audio">("all");

  if (!isOpen) return null;

  const filteredItems = items.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "images") return item.type === "image";
    if (activeTab === "documents") return item.type === "document";
    if (activeTab === "audio") return item.type === "audio";
    return true;
  });

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
        <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
          <Image className="w-4 h-4 text-cyan-400" />
          Shared Media & Files
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-800/80 bg-slate-950/40">
        {(["all", "images", "documents", "audio"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-lg capitalize transition-colors ${
              activeTab === tab
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Items Grid/List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No media or files shared in this chat yet.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="group relative flex items-center gap-3 p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800/80 transition-all"
            >
              {item.type === "image" ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-750">
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                </div>
              ) : item.type === "audio" ? (
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <Music className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                  <FileText className="w-5 h-5" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{item.name}</p>
                <span className="text-[10px] text-slate-400">
                  {item.senderName} • {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>

              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                download
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-750 transition-colors"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
