/**
 * Feature Flag Admin Panel (Dev Only) — ProSell.
 *
 * Panel dev-only para togglear feature flags en runtime.
 * SECURITY: Solo incluido en builds de desarrollo.
 *
 * Usage:
 * ```tsx
 * {process.env.NODE_ENV === 'development' && <FeatureFlagPanel />}
 * ```
 */

"use client";

import { useFeatureFlagStore } from "@/stores/featureFlagStore";

export function FeatureFlagPanel() {
  const flags = useFeatureFlagStore((s) => s.flags);
  const setFlag = useFeatureFlagStore((s) => s.set);
  const reset = useFeatureFlagStore((s) => s.reset);

  return (
    <div className="fixed bottom-4 right-4 bg-ps-bg-surface border border-ps-border-default rounded-[10px] p-4 shadow-xl z-50 max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-xs font-bold text-ps-text-primary">
          Feature Flags
        </h3>
        <span className="text-[10px] text-ps-text-tertiary">(Dev Only)</span>
      </div>

      <div className="flex flex-col gap-1 mb-3">
        {Object.entries(flags).map(([key, value]) => (
          <label
            key={key}
            className="flex items-center gap-2 cursor-pointer px-1.5 py-1 rounded transition-colors"
            style={{ background: "transparent" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--ps-bg-elevated)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => setFlag(key, e.target.checked)}
              style={{ width: 14, height: 14, accentColor: "var(--ps-cyan)" }}
            />
            <span className="flex-1 text-[11px] font-mono text-ps-text-secondary">
              {key}
            </span>
            <span
              className={`text-[10px] font-bold ${
                value ? "text-ps-success" : "text-ps-error"
              }`}
            >
              {value ? "ON" : "OFF"}
            </span>
          </label>
        ))}
      </div>

      <button
        onClick={reset}
        className="w-full px-3 py-1.5 rounded text-xs cursor-pointer text-ps-text-secondary border border-ps-border-default transition-colors"
        style={{ background: "var(--ps-bg-elevated)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--ps-bg-base)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--ps-bg-elevated)";
        }}
      >
        Restablecer valores por defecto
      </button>

      <div className="mt-2 pt-2 border-t border-ps-border-subtle text-[10px] text-ps-text-tertiary">
        Cambios persisten en localStorage
      </div>
    </div>
  );
}
