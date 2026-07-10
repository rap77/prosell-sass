"use client";

import { Loader2 } from "lucide-react";

interface FullPageLoaderProps {
  message?: string;
}

/**
 * Centered full-page loader with optional message.
 * ponytail: single source of truth for loading screens
 */
export function FullPageLoader({
  message = "Cargando...",
}: FullPageLoaderProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ps-bg-base)",
        zIndex: 9999,
      }}
    >
      <style>{`
        @keyframes fpLoaderSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fpLoaderFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div
        style={{
          textAlign: "center",
          animation: "fpLoaderFadeIn 0.2s ease-out",
        }}
      >
        <Loader2
          size={40}
          strokeWidth={1.5}
          style={{
            color: "var(--ps-cyan)",
            animation: "fpLoaderSpin 0.8s linear infinite",
          }}
        />
        <p
          style={{
            margin: "16px 0 0",
            fontSize: 13,
            color: "var(--ps-text-secondary)",
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
