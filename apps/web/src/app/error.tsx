'use client'

/**
 * Route error boundary — ProSell error page.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import Link from 'next/link'
import Image from 'next/image'
import { AlertTriangle } from 'lucide-react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ps-bg-base)',
      padding: '32px 24px',
      textAlign: 'center',
    }}>
      <main style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Brand */}
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', justifyContent: 'center' }}>
          <Image src="/logo-mark.png" alt="ProSell" width={271} height={294} style={{ height: 28, width: 'auto', flexShrink: 0 }} />
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ps-text-primary)' }}>ProSell</span>
        </Link>

        {/* Icon + copy */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--ps-warning-bg)', border: '1px solid var(--ps-warning)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={22} strokeWidth={2} style={{ color: 'var(--ps-warning)' }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ps-warning)' }}>
              Algo salió mal
            </p>
            <h1 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ps-text-primary)' }}>
              No pudimos cargar esta vista
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)', lineHeight: 1.6 }}>
              Ocurrió un problema inesperado. Intentá de nuevo o volvé al dashboard para seguir trabajando.
            </p>
          </div>
        </div>

        {/* Action card */}
        <div style={{
          background: 'var(--ps-bg-surface)',
          border: '1px solid var(--ps-border-default)',
          borderRadius: 14,
          padding: '24px 24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          boxShadow: '0 4px 24px rgba(6,13,36,0.3)',
        }}>
          <button
            type="button"
            onClick={reset}
            style={{
              display: 'inline-flex', width: '100%', alignItems: 'center', justifyContent: 'center',
              height: 42, borderRadius: 8, border: 'none',
              background: 'var(--ps-cyan)', color: 'var(--ps-bg-base)',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Intentar de nuevo
          </button>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex', width: '100%', alignItems: 'center', justifyContent: 'center',
              height: 42, borderRadius: 8,
              background: 'var(--ps-bg-elevated)', border: '1px solid var(--ps-border-default)',
              color: 'var(--ps-text-secondary)', fontSize: 14, fontWeight: 500, textDecoration: 'none',
            }}
          >
            Ir al dashboard
          </Link>
          {error.digest && (
            <p style={{ margin: 0, fontSize: 11, color: 'var(--ps-text-disabled)' }}>
              Referencia: {error.digest}
            </p>
          )}
        </div>

      </main>
    </div>
  )
}
