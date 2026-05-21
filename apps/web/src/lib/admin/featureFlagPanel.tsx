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
    <div style={{
      position: 'fixed',
      bottom: 16,
      right: 16,
      background: 'var(--ps-bg-surface)',
      border: '1px solid var(--ps-border-default)',
      borderRadius: 10,
      padding: 16,
      boxShadow: '0 8px 24px rgba(6,13,36,0.4)',
      zIndex: 50,
      maxWidth: 280,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--ps-text-primary)' }}>
          Feature Flags
        </h3>
        <span style={{ fontSize: 10, color: 'var(--ps-text-disabled)' }}>(Dev Only)</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        {Object.entries(flags).map(([key, value]) => (
          <label
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 6,
              background: 'transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ps-bg-elevated)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => setFlag(key, e.target.checked)}
              style={{ width: 14, height: 14, accentColor: 'var(--ps-cyan)' }}
            />
            <span style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: 'var(--ps-text-secondary)' }}>
              {key}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: value ? 'var(--ps-success)' : 'var(--ps-error)',
            }}>
              {value ? "ON" : "OFF"}
            </span>
          </label>
        ))}
      </div>

      <button
        onClick={reset}
        style={{
          width: '100%',
          padding: '6px 12px',
          borderRadius: 6,
          background: 'var(--ps-bg-elevated)',
          border: '1px solid var(--ps-border-default)',
          color: 'var(--ps-text-secondary)',
          fontSize: 11,
          cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ps-bg-base)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ps-bg-elevated)' }}
      >
        Restablecer valores por defecto
      </button>

      <div style={{
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1px solid var(--ps-border-subtle)',
        fontSize: 10,
        color: 'var(--ps-text-disabled)',
      }}>
        Cambios persisten en localStorage
      </div>
    </div>
  );
}
