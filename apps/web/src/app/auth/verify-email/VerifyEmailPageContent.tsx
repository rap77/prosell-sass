'use client'

/**
 * VerifyEmailPageContent — ProSell email-verification screen.
 * Uses AuthShell for the split brand+form layout.
 * Auto-verifies on mount using the token from URL.
 * States: loading → success | error (no-token, api-error)
 * Logic: authApi.verifyEmail(token) on mount
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authApi, ApiError } from '@/lib/api/authApi'
import { getErrorMessage } from '@/lib/utils/error'
import { CheckCircle2, AlertTriangle, Loader2, MailCheck } from 'lucide-react'
import {
  AuthShell,
} from '@/components/auth/AuthShell'

// ─── States ───────────────────────────────────────────────────────────────────

type VerifyState = 'loading' | 'success' | 'error'

// ─── Icon badge helper ────────────────────────────────────────────────────────

function IconBadge({
  variant,
  children,
}: {
  variant: 'loading' | 'success' | 'error'
  children: React.ReactNode
}) {
  const colorMap = {
    loading: { bg: 'var(--ps-info-bg)',    border: 'rgba(77,184,255,0.25)',   color: 'var(--ps-cyan)' },
    success: { bg: 'var(--ps-success-bg)', border: 'rgba(34,211,160,0.25)',  color: 'var(--ps-success)' },
    error:   { bg: 'var(--ps-error-bg)',   border: 'rgba(240,68,56,0.25)',   color: 'var(--ps-error)' },
  }
  const { bg, border, color } = colorMap[variant]
  return (
    <div style={{
      width: 64, height: 64, borderRadius: '50%',
      background: bg, border: `1px solid ${border}`, color,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </div>
  )
}

// ─── CTA button (full-width link) ─────────────────────────────────────────────

function CtaLink({ href, label, secondary = false }: { href: string; label: string; secondary?: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        height: 44, width: '100%',
        background: secondary ? 'transparent' : 'var(--ps-cyan)',
        color: secondary ? 'var(--ps-text-secondary)' : 'var(--ps-bg-base)',
        border: secondary ? '1px solid var(--ps-input-border)' : '0',
        borderRadius: 8,
        fontSize: secondary ? 14 : 15,
        fontWeight: secondary ? 500 : 600,
        letterSpacing: '-0.005em',
        textDecoration: 'none',
      }}
    >
      {label}
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface VerifyEmailPageContentProps {
  token?: string
}

export function VerifyEmailPageContent({ token }: VerifyEmailPageContentProps) {
  const [state, setState] = useState<VerifyState>(() =>
    token && token.trim() !== '' ? 'loading' : 'error',
  )
  const [errorMsg, setErrorMsg]  = useState<string | null>(() =>
    token && token.trim() !== '' ? null : 'El enlace de verificación no es válido.',
  )
  const [notFound, setNotFound]  = useState(false)

  useEffect(() => {
    // No token → already initialized to error state, skip async work
    if (!token || token.trim() === '') {
      return
    }

    let cancelled = false

    const verify = async () => {
      try {
        await authApi.verifyEmail(token)
        if (!cancelled) setState('success')
      } catch (err) {
        if (cancelled) return
        setState('error')
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setNotFound(true)
            setErrorMsg('El enlace de verificación no existe.')
          } else if (err.status === 400) {
            setErrorMsg(err.message || 'El enlace expiró o ya fue utilizado.')
          } else {
            setErrorMsg(err.message || 'No pudimos verificar tu email.')
          }
        } else {
          setErrorMsg(getErrorMessage(err, 'No pudimos verificar tu email. Intentá de nuevo.'))
        }
      }
    }

    verify()
    return () => { cancelled = true }
  }, [token])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <AuthShell>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
          <IconBadge variant="loading">
            <Loader2 size={28} strokeWidth={1.8} style={{ animation: 'spin 1s linear infinite' }} />
          </IconBadge>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, margin: '0 0 8px', color: 'var(--ps-text-primary)' }}>
              Verificando tu email...
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ps-text-secondary)', margin: 0, lineHeight: 1.6 }}>
              Esperá un momento mientras confirmamos tu dirección de email.
            </p>
          </div>
        </div>
        {/* Inline keyframe for the spinner — avoids external CSS dep */}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </AuthShell>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (state === 'success') {
    return (
      <AuthShell>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
          <IconBadge variant="success">
            <CheckCircle2 size={28} strokeWidth={1.8} />
          </IconBadge>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, margin: '0 0 8px', color: 'var(--ps-text-primary)' }}>
              ¡Email verificado!
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ps-text-secondary)', margin: 0, lineHeight: 1.6, maxWidth: 300 }}>
              Tu cuenta está activa. Ya podés iniciar sesión y empezar a usar ProSell.
            </p>
          </div>
          <div style={{ width: '100%' }}>
            <CtaLink href="/auth/login" label="Iniciar sesión" />
          </div>
        </div>
      </AuthShell>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  return (
    <AuthShell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <IconBadge variant="error">
          <AlertTriangle size={28} strokeWidth={1.8} />
        </IconBadge>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, margin: '0 0 8px', color: 'var(--ps-text-primary)' }}>
            {notFound ? 'Enlace no encontrado' : 'Verificación fallida'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ps-text-secondary)', margin: 0, lineHeight: 1.6, maxWidth: 300 }}>
            {errorMsg ?? 'El enlace expiró o ya fue utilizado. Registrate de nuevo para obtener uno.'}
          </p>
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <CtaLink href="/auth/register" label="Volver al registro" />
          <CtaLink href="/auth/login" label="Iniciar sesión" secondary />
        </div>
      </div>
    </AuthShell>
  )
}
