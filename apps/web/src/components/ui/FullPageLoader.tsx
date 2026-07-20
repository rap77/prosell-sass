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
      className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{
        background: "var(--ps-bg-base)",
      }}
    >
      <style>{`
        @keyframes fpLoaderSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fpLoaderFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div
        className="flex flex-col items-center"
        style={{
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
          className="mt-4 text-xs"
          style={{
            color: "var(--ps-text-secondary)",
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
