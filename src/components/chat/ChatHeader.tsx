"use client";

import React from "react";
import { User, Users, Lock, Bell, BellOff, Image, Mic } from "lucide-react";

interface ChatHeaderProps {
  activeTarget: {
    id: string;
    name: string;
    isGroup?: boolean;
    isPrivate?: boolean;
    image?: string | null;
    isOnline?: boolean;
  } | null;
  isDnd: boolean;
  onToggleDnd: () => void;
  onOpenMediaDrawer: () => void;
  onToggleVoiceRecorder?: () => void;
}

export function ChatHeader({
  activeTarget,
  isDnd,
  onToggleDnd,
  onOpenMediaDrawer,
  onToggleVoiceRecorder,
}: ChatHeaderProps) {
  if (!activeTarget) {
    return (
      <div className="h-16 border-b border-slate-800 bg-slate-900/60 px-6 flex items-center justify-between text-slate-400">
        <span className="text-sm font-medium">Select a conversation or group to start chatting</span>
      </div>
    );
  }

  return (
    <div className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          {activeTarget.isGroup ? (
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
              {activeTarget.isPrivate ? <Lock className="w-4 h-4" /> : <Users className="w-5 h-5" />}
            </div>
          ) : activeTarget.image ? (
            <img
              src={activeTarget.image}
              alt={activeTarget.name}
              className="w-10 h-10 rounded-full object-cover border border-slate-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center font-bold">
              {activeTarget.name.charAt(0).toUpperCase()}
            </div>
          )}

          {!activeTarget.isGroup && (
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                activeTarget.isOnline ? "bg-emerald-500" : "bg-slate-500"
              }`}
            />
          )}
        </div>

        <div>
          <h2 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
            {activeTarget.name}
            {activeTarget.isPrivate && <Lock className="w-3.5 h-3.5 text-amber-400" />}
          </h2>
          <p className="text-xs text-slate-400">
            {activeTarget.isGroup
              ? "Group Channel"
              : activeTarget.isOnline
              ? "Online now"
              : "Offline"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onToggleVoiceRecorder && (
          <button
            onClick={onToggleVoiceRecorder}
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
            title="Record Voice Note"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onOpenMediaDrawer}
          className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
          title="Shared Media & Files"
        >
          <Image className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleDnd}
          className={`p-2 rounded-xl border transition-all ${
            isDnd
              ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
              : "text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
          }`}
          title={isDnd ? "DND Active (Notifications muted)" : "Toggle Do Not Disturb"}
        >
          {isDnd ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
