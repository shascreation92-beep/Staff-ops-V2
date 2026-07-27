"use client";

import React from "react";
import { Pin, CheckSquare, Clock, Globe, Share2, Trash2, Edit3, CheckCircle2 } from "lucide-react";

export interface PersonalNoteItem {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  color: string;
  isChecklist: boolean;
  isSharedAnnouncement?: boolean;
  isSharedByMe?: boolean;
  isGlobalPinned?: boolean;
  timerExpiresAt?: string | null;
  isAcknowledged?: boolean;
  sharedFromTlName?: string | null;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NoteCardProps {
  note: PersonalNoteItem;
  onTogglePin: (id: string) => void;
  onEdit: (note: PersonalNoteItem) => void;
  onDelete: (id: string) => void;
  onAcknowledge?: (id: string) => void;
}

export function NoteCard({ note, onTogglePin, onEdit, onDelete, onAcknowledge }: NoteCardProps) {
  const getBgColor = (color: string) => {
    switch (color) {
      case "amber":
        return "bg-amber-950/40 border-amber-800/50 text-amber-100";
      case "emerald":
        return "bg-emerald-950/40 border-emerald-800/50 text-emerald-100";
      case "indigo":
        return "bg-indigo-950/40 border-indigo-800/50 text-indigo-100";
      case "rose":
        return "bg-rose-950/40 border-rose-800/50 text-rose-100";
      case "cyan":
        return "bg-cyan-950/40 border-cyan-800/50 text-cyan-100";
      default:
        return "bg-slate-900/60 border-slate-800 text-slate-200";
    }
  };

  return (
    <div
      className={`group relative p-4 rounded-2xl border backdrop-blur-md transition-all duration-200 hover:shadow-xl hover:border-cyan-500/40 ${getBgColor(
        note.color
      )}`}
    >
      {/* Badges Bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {note.isGlobalPinned && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Globe className="w-3 h-3" /> Team Announcement
            </span>
          )}

          {note.isSharedAnnouncement && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Share2 className="w-3 h-3" /> Shared by {note.sharedFromTlName || "TL"}
            </span>
          )}

          {note.category && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">
              {note.category}
            </span>
          )}
        </div>

        <button
          onClick={() => onTogglePin(note.id)}
          className={`p-1.5 rounded-lg transition-colors ${
            note.isPinned
              ? "text-cyan-400 bg-cyan-500/20 border border-cyan-500/30"
              : "text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-200 hover:bg-slate-800"
          }`}
          title={note.isPinned ? "Unpin Note" : "Pin Note"}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Note Title & Content */}
      <h4 className="font-semibold text-sm text-slate-100 mb-1.5 line-clamp-1">{note.title}</h4>
      <p className="text-xs text-slate-300/90 whitespace-pre-wrap line-clamp-4 leading-relaxed mb-3">
        {note.content}
      </p>

      {/* Footer Info & Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-500" />
          {new Date(note.updatedAt).toLocaleDateString()}
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {note.isSharedAnnouncement && !note.isAcknowledged && onAcknowledge && (
            <button
              onClick={() => onAcknowledge(note.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 text-[10px] font-medium transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" /> Acknowledge
            </button>
          )}

          <button
            onClick={() => onEdit(note)}
            className="p-1 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
            title="Edit Note"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Delete Note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
