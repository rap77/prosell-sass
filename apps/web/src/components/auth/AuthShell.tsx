'use client'

/**
 * AuthShell — Shared split-layout wrapper for all auth screens.
 *
 * Left:  ProSell brand panel (gradient + testimonial) — always the same
 * Right: Form area — receives `children`
 *
 * Responsive: left panel hides on mobile (via .ps-auth-split CSS rule in globals.css).
 */

import Image from 'next/image'

// ─── Brand panel (left side) ──────────────────────────────────────────────────

function AuthBrandPanel() {
  return (
    <aside
      aria-hidden="true"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '48px 56px',
        background: 'linear-gradient(135deg, #060D24 0%, #0D1B6E 60%, #1E5FD4 100%)',
        display: 'flex',
        flexDirection: 'column',
        color: '#fff',
      }}
    >
      {/* Radial glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(77,184,255,0.18), transparent 70%)',
      }} />
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: [
          'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '56px 56px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Logo — tabIndex -1 because the aside is aria-hidden, making this link unreachable by keyboard */}
        <a
          href="/"
          tabIndex={-1}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em',
            color: '#fff', textDecoration: 'none',
          }}
        >
          <Image src="/logo-mark.png" alt="ProSell" width={271} height={294} style={{ height: 34, width: 'auto', flexShrink: 0 }} />
          ProSell
        </a>

        {/* Hero + testimonial */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 18, maxWidth: 480, margin: 'auto 0', padding: '32px 0',
        }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1, margin: 0, color: '#fff' }}>
            Tu pipeline,<br />centralizado.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)', maxWidth: 380, margin: 0 }}>
            Miles de equipos comerciales ya cierran más rápido con ProSell.
          </p>

          <figure style={{
            margin: '12px 0 0',
            background: 'rgba(13,27,62,0.45)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 12,
            padding: '22px 24px',
            boxShadow: '0 16px 48px rgba(6,13,36,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}>
            <div style={{ color: '#F5A623', fontSize: 13, letterSpacing: 1, marginBottom: 12 }}>★★★★★</div>
            <blockquote style={{ fontSize: 15, lineHeight: 1.55, fontStyle: 'italic', color: '#fff', margin: '0 0 14px', letterSpacing: '-0.005em' }}>
              &ldquo;Pasamos de perder el 40% de leads a cerrar el doble en el mismo tiempo.&rdquo;
            </blockquote>
            <figcaption style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
              <span style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #4DB8FF, #1E5FD4)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#060D24', flexShrink: 0,
              }}>MR</span>
              <span>
                <b style={{ color: '#fff', fontWeight: 600 }}>Martín R.</b>
                {' '}
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>· Gerente Comercial</span>
              </span>
            </figcaption>
          </figure>
        </div>

        {/* Status footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#22D3A0', boxShadow: '0 0 6px #22D3A0',
            display: 'inline-block', flexShrink: 0,
          }} />
          Todos los sistemas operativos · v2.4.1
        </div>
      </div>
    </aside>
  )
}

// ─── Shared shell ─────────────────────────────────────────────────────────────

/**
 * AuthShell wraps the split layout.
 * Usage:
 * ```tsx
 * <AuthShell>
 *   <AuthFormHead title="Bienvenido" subtitle="Ingresá tu cuenta" />
 *   <form>...</form>
 *   <p>¿No tenés cuenta? ...</p>
 * </AuthShell>
 * ```
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="ps-auth-split"
      style={{
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        minHeight: '100vh',
      }}
    >
      <AuthBrandPanel />

      <main
        style={{
          background: 'var(--ps-bg-base)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 48,
        }}
      >
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {children}
        </div>
      </main>
    </div>
  )
}

// ─── Form heading helper ───────────────────────────────────────────────────────

export function AuthFormHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, margin: '0 0 6px', color: 'var(--ps-text-primary)' }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: 14, color: 'var(--ps-text-secondary)', margin: 0, lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

// ─── Shared input styling ─────────────────────────────────────────────────────

export const authInputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  height: 44,
  padding: '0 14px',
  background: 'var(--ps-input-bg)',
  border: `1px solid ${hasError ? 'var(--ps-error)' : 'var(--ps-input-border)'}`,
  borderRadius: 8,
  color: 'var(--ps-text-primary)',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 180ms, box-shadow 180ms, background 180ms',
})

export function focusAuthInput(el: HTMLInputElement, hasError: boolean) {
  el.style.borderColor = hasError ? 'var(--ps-error)' : 'var(--ps-cyan)'
  el.style.boxShadow   = hasError
    ? '0 0 0 3px var(--ps-input-error-shadow)'
    : '0 0 0 3px var(--ps-input-focus-shadow)'
  el.style.background  = 'var(--ps-input-bg-focus)'
}

export function blurAuthInput(el: HTMLInputElement, hasError: boolean) {
  el.style.borderColor = hasError ? 'var(--ps-error)' : 'var(--ps-input-border)'
  el.style.boxShadow   = 'none'
  el.style.background  = 'var(--ps-input-bg)'
}

// ─── Shared sub-components ────────────────────────────────────────────────────

import { AlertCircle } from 'lucide-react'

export function AuthFieldError({ message }: { message: string }) {
  return (
    <span role="alert" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ps-error)', marginTop: 6 }}>
      <AlertCircle size={12} strokeWidth={2.5} />
      {message}
    </span>
  )
}

export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 8,
      background: 'var(--ps-error-bg)',
      border: '1px solid rgba(240,68,56,0.25)',
    }}>
      <AlertCircle size={14} style={{ color: 'var(--ps-error)', flexShrink: 0 }} strokeWidth={2.5} />
      <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--ps-error)' }}>{message}</p>
    </div>
  )
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'var(--ps-text-disabled)', fontSize: 12 }}>
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, var(--ps-input-border), transparent)' }} />
      {label}
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, var(--ps-input-border), transparent)' }} />
    </div>
  )
}

export function AuthSubmitButton({
  label,
  loadingLabel,
  isLoading,
  disabled,
}: {
  label: string
  loadingLabel: string
  isLoading: boolean
  disabled: boolean
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={{
        marginTop: 8,
        width: '100%', height: 44,
        background: disabled ? 'rgba(77,184,255,0.4)' : 'var(--ps-cyan)',
        color: 'var(--ps-bg-base)',
        border: 0, borderRadius: 8,
        fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'background 180ms, box-shadow 180ms, transform 180ms',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background  = 'var(--ps-cyan-hover)'
          e.currentTarget.style.boxShadow   = '0 8px 28px rgba(77,184,255,0.30)'
          e.currentTarget.style.transform   = 'translateY(-1px)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = disabled ? 'rgba(77,184,255,0.4)' : 'var(--ps-cyan)'
        e.currentTarget.style.boxShadow  = ''
        e.currentTarget.style.transform  = ''
      }}
    >
      {isLoading ? loadingLabel : label}
    </button>
  )
}
