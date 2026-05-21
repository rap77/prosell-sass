/**
 * Landing page — ProSell SaaS.
 *
 * Server Component — no auth state needed.
 * Authenticated users are redirected by the app router after login.
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{
      display: 'flex',
      minHeight: '100vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ps-bg-base)',
      padding: '32px 24px',
      textAlign: 'center',
    }}>

      {/* Brand wordmark */}
      <div style={{ marginBottom: 32 }}>
        <span style={{
          display: 'inline-block',
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--ps-cyan)',
          marginBottom: 18,
        }}>
          ProSell
        </span>

        <h1 style={{
          margin: 0,
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--ps-text-primary)',
          lineHeight: 1.1,
        }}>
          Vendé más.{' '}
          <span style={{
            background: 'linear-gradient(135deg, var(--ps-cyan), var(--ps-blue))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Con inteligencia.
          </span>
        </h1>

        <p style={{
          margin: '18px auto 0',
          maxWidth: 480,
          fontSize: 16,
          color: 'var(--ps-text-secondary)',
          lineHeight: 1.6,
        }}>
          Plataforma SaaS de análisis de mercado y gestión de ventas para concesionarias de vehículos.
        </p>
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/auth/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 44,
            padding: '0 28px',
            background: 'var(--ps-cyan)',
            color: 'var(--ps-bg-base)',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          Iniciar sesión
        </Link>
        <Link
          href="/auth/register"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 44,
            padding: '0 28px',
            background: 'var(--ps-bg-elevated)',
            border: '1px solid var(--ps-border-default)',
            color: 'var(--ps-text-primary)',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Registrarse
        </Link>
      </div>

      {/* Feature pills */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        marginTop: 48,
        maxWidth: 560,
      }}>
        {[
          'Inventario en tiempo real',
          'Pipeline Kanban',
          'Publicación en Facebook Marketplace',
          'Analytics de ventas',
          'Leads automáticos',
          '2FA incluido',
        ].map((feature) => (
          <span
            key={feature}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 99,
              background: 'var(--ps-bg-elevated)',
              border: '1px solid var(--ps-border-subtle)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--ps-text-secondary)',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ps-cyan)', flexShrink: 0 }} />
            {feature}
          </span>
        ))}
      </div>

      {/* Footer */}
      <p style={{
        position: 'absolute',
        bottom: 24,
        fontSize: 11,
        color: 'var(--ps-text-disabled)',
      }}>
        © {new Date().getFullYear()} ProSell SaaS · Todos los derechos reservados
      </p>

    </main>
  )
}
