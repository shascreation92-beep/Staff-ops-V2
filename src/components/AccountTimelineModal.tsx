"use client";

import React, { useState, useEffect } from "react";
import { X, CheckCircle2, Clock, Activity, ArrowRight, User } from "lucide-react";
import { getAccountHistoryAction } from "@/app/actions/accounts";

interface AccountTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: {
    id: string;
    serialCode: string;
    idName: string;
    status: string;
  } | null;
}

interface HistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  notes: string | null;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
    role: string;
  };
}

export function AccountTimelineModal({ isOpen, onClose, account }: AccountTimelineModalProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && account) {
      setLoading(true);
      getAccountHistoryAction(account.id)
        .then((res) => {
          if (res.success && res.history) {
            setHistory(res.history as any);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div>
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Account Status Journey
            </h3>
            <p className="text-xs text-slate-400">
              {account.idName} • <span className="font-mono text-cyan-300">{account.serialCode}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              Loading audit timeline...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No historical status transitions recorded yet for this account.
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-800 space-y-6">
              {history.map((item, idx) => (
                <div key={item.id} className="relative group">
                  {/* Timeline Dot */}
                  <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-cyan-500 border-4 border-slate-900 shadow-md" />

                  <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 group-hover:border-cyan-500/30 transition-all">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 font-semibold text-xs text-slate-200">
                        {item.fromStatus && (
                          <>
                            <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400">
                              {item.fromStatus}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                          </>
                        )}
                        <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {item.toStatus}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 mb-2 whitespace-pre-wrap">
                        {item.notes}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1 border-t border-slate-800/50">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>{item.user.name || item.user.email}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-500 capitalize">{item.user.role.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
