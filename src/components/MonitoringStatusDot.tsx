"use client";

import React from "react";

interface MonitoringStatusDotProps {
  status?: "ACTIVE" | "IDLE" | "INTERRUPTED" | "OFF_DUTY" | string;
  size?: number;
}

export default function MonitoringStatusDot({ status = "OFF_DUTY", size = 10 }: MonitoringStatusDotProps) {
  let color = "#EF4444"; // Default Red (Offline / Interrupted)
  let shadowColor = "rgba(239, 68, 68, 0.7)";
  let pulseClass = "status-dot-red";
  let tooltipText = "🔴 Desktop Agent Offline / Not Capturing";

  if (status === "ACTIVE" || status === "IDLE") {
    color = "#A855F7"; // Purple (Desktop Agent Active)
    shadowColor = "rgba(168, 85, 247, 0.8)";
    pulseClass = "status-dot-purple";
    tooltipText = "🟣 Desktop Agent Active & Capturing";
  }

  return (
    <span
      className={pulseClass}
      title={tooltipText}
      style={{
        display: "inline-block",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 10px ${shadowColor}`,
        flexShrink: 0,
        verticalAlign: "middle"
      }}
    />
  );
}
