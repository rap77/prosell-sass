/**
 * Política de Privacidad — ProSell.
 * Placeholder — en desarrollo.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Política de Privacidad | ProSell",
  description: "Política de privacidad de ProSell SaaS.",
};

export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--ps-bg-base)',
      padding: '48px 16px',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{
          background: 'var(--ps-bg-surface)',
          border: '1px solid var(--ps-border-default)',
          borderRadius: 14,
          padding: 40,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Header */}
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ps-text-primary)' }}>
                Política de Privacidad
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ps-text-disabled)' }}>
                Próximamente
              </p>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--ps-text-secondary)', lineHeight: 1.7 }}>
                La página de Política de Privacidad está en desarrollo. Próximamente vas a encontrar
                el detalle completo de cómo recopilamos, usamos y protegemos tu información personal.
              </p>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--ps-text-secondary)', lineHeight: 1.7 }}>
                Para consultas urgentes sobre nuestras prácticas de privacidad, contactá al equipo en{' '}
                <a
                  href="mailto:privacy@prosell.saas"
                  style={{ color: 'var(--ps-cyan)', textDecoration: 'none', fontWeight: 500 }}
                >
                  privacy@prosell.saas
                </a>.
              </p>
            </div>

            {/* Back button */}
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Link
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 40,
                  padding: '0 18px',
                  background: 'var(--ps-bg-elevated)',
                  border: '1px solid var(--ps-border-default)',
                  borderRadius: 8,
                  color: 'var(--ps-text-secondary)',
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'border-color 150ms',
                }}
              >
                <ArrowLeft size={14} strokeWidth={2} />
                Volver al inicio
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
