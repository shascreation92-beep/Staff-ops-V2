"use client";

import React, { useEffect } from "react";
import { AlertOctagon, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uncaught Runtime System Error:", error);
  }, [error]);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "2rem",
      background: "linear-gradient(135deg, #03045E 0%, #000814 100%)",
      color: "#FFFFFF",
      fontFamily: "var(--font-sans, sans-serif)"
    }}>
      <div style={{
        maxWidth: "520px",
        width: "100%",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "16px",
        padding: "2.5rem 2rem",
        textAlign: "center",
        backdropFilter: "blur(12px)",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.25rem"
      }}>
        <div style={{
          width: "4rem",
          height: "4rem",
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#EF4444"
        }}>
          <AlertOctagon size={32} />
        </div>

        <h1 style={{
          fontSize: "1.5rem",
          fontWeight: 800,
          margin: 0,
          background: "linear-gradient(to right, #FFFFFF, #ADE8F4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          System Interrupted
        </h1>

        <p style={{
          fontSize: "0.88rem",
          color: "rgba(255, 255, 255, 0.65)",
          lineHeight: "1.5",
          margin: 0
        }}>
          An unexpected application state error occurred while executing this module. Operation logs have been recorded for diagnostic review.
        </p>

        {error.message && (
          <div style={{
            width: "100%",
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            fontSize: "0.78rem",
            fontFamily: "var(--font-mono, monospace)",
            color: "#EF4444",
            wordBreak: "break-word",
            textAlign: "left"
          }}>
            {error.message}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", width: "100%", marginTop: "0.5rem" }}>
          <button
            onClick={() => reset()}
            style={{
              flex: 1,
              height: "42px",
              background: "#0077B6",
              border: "none",
              borderRadius: "8px",
              color: "#FFFFFF",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              boxShadow: "0 4px 15px rgba(0, 119, 182, 0.3)",
              transition: "all 0.2s"
            }}
          >
            <RefreshCw size={15} />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            style={{
              flex: 1,
              height: "42px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              color: "#FFFFFF",
              fontSize: "0.85rem",
              fontWeight: 700,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              transition: "all 0.2s"
            }}
          >
            <Home size={15} />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
