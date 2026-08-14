"use client";

import React from "react";

export function SkeletonBox({ className = "", height = "1rem", width = "100%" }: { className?: string; height?: string; width?: string }) {
  return (
    <div
      className={`skeleton-shimmer rounded-lg ${className}`}
      style={{ height, width }}
    />
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <SkeletonBox height="1rem" width="40%" />
            <SkeletonBox height="2rem" width="2rem" className="rounded-xl" />
          </div>
          <SkeletonBox height="2rem" width="60%" />
          <SkeletonBox height="0.8rem" width="80%" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden p-4 flex flex-col gap-3">
      {/* Table Header */}
      <div className="grid gap-4 pb-3 border-b border-white/5" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBox key={i} height="1.2rem" width="70%" />
        ))}
      </div>
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-4 py-2 border-b border-white/[0.03]" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, c) => (
            <SkeletonBox key={c} height="1rem" width={c === 0 ? "85%" : "60%"} />
          ))}
        </div>
      ))}
    </div>
  );
}
