"use client";

import React from "react";

interface MonitoringStatusDotProps {
  status?: "ACTIVE" | "IDLE" | "INTERRUPTED" | "OFF_DUTY" | string;
  size?: number;
}

export default function MonitoringStatusDot({ status = "OFF_DUTY", size = 9 }: MonitoringStatusDotProps) {
  let color = "#94A3B8"; // Gray default
  let shadowColor = "rgba(148, 163, 184, 0.4)";
  let pulseClass = "";
  let tooltipText = "⚪ Off Duty";

  if (status === "ACTIVE") {
    color = "#10B981"; // Green
    shadowColor = "rgba(16, 185, 129, 0.6)";
    pulseClass = "status-dot-pulse green";
    tooltipText = "🟢 Screen Monitoring Active";
  } else if (status === "IDLE") {
    color = "#F59E0B"; // Amber
    shadowColor = "rgba(245, 158, 11, 0.6)";
    pulseClass = "status-dot-pulse amber";
    tooltipText = "🟡 Screen Monitoring Active (Idle)";
  } else if (status === "INTERRUPTED") {
    color = "#EF4444"; // Red
    shadowColor = "rgba(239, 68, 68, 0.6)";
    pulseClass = "status-dot-pulse red";
    tooltipText = "🔴 Screen Monitoring Interrupted";
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
        boxShadow: `0 0 6px ${shadowColor}`,
        flexShrink: 0,
        verticalAlign: "middle"
      }}
    />
  );
}
