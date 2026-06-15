"use client";

/**
 * Global root error boundary — ProSell.
 *
 * Renders outside the Next.js layout tree, so we inline the essential
 * ProSell dark-mode CSS custom properties directly in a <style> tag.
 * All color references still use var(--ps-*) tokens for consistency.
 */

import Link from "next/link";
import Image from "next/image";

const PS_VARS = `
  :root {
    --ps-bg-base: #060d24;
    --ps-bg-surface: #0d1836;
    --ps-bg-elevated: #162040;
    --ps-border-default: rgba(77,184,255,0.12);
    --ps-text-primary: #e8eeff;
    --ps-text-secondary: rgba(138,155,191,0.9);
    --ps-text-tertiary: #7384ad;
    --ps-cyan: #4db8ff;
    --ps-bg-base-rgb: 6,13,36;
    --ps-warning: #f59e0b;
    --ps-warning-bg: rgba(245,158,11,0.08);
  }
`;

interface GlobalRootErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalRootErrorPage({
  error,
  reset,
}: GlobalRootErrorPageProps) {
  return (
    <html lang="es">
      <body>
        <style>{PS_VARS}</style>

        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--ps-bg-base)",
            padding: "32px 24px",
            textAlign: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <main
            style={{
              width: "100%",
              maxWidth: 400,
              display: "flex",
              flexDirection: "column",
              gap: 28,
            }}
          >
            {/* Brand */}
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                justifyContent: "center",
              }}
            >
              <Image
                src="/logo-mark.png"
                alt="ProSell"
                width={271}
                height={294}
                style={{ height: 28, width: "auto", flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--ps-text-primary)",
                }}
              >
                ProSell
              </span>
            </Link>

            {/* Copy */}
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "var(--ps-warning)",
                }}
              >
                Error global
              </p>
              <h1
                style={{
                  margin: "8px 0 0",
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--ps-text-primary)",
                }}
              >
                No pudimos iniciar la aplicación
              </h1>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 13,
                  color: "var(--ps-text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                Ocurrió un problema inesperado al cargar ProSell. Intentá de
                nuevo o volvé al dashboard para retomar tu trabajo.
              </p>
            </div>

            {/* Actions */}
            <div
              style={{
                background: "var(--ps-bg-surface)",
                border: "1px solid var(--ps-border-default)",
                borderRadius: 14,
                padding: "24px 24px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                boxShadow: "0 4px 24px rgba(6,13,36,0.3)",
              }}
            >
              <button
                type="button"
                onClick={reset}
                style={{
                  display: "inline-flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 42,
                  borderRadius: 8,
                  border: "none",
                  background: "var(--ps-cyan)",
                  color: "var(--ps-bg-base)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Intentar de nuevo
              </button>
              <Link
                href="/dashboard"
                style={{
                  display: "inline-flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 42,
                  borderRadius: 8,
                  background: "var(--ps-bg-elevated)",
                  border: "1px solid var(--ps-border-default)",
                  color: "var(--ps-text-secondary)",
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Ir al dashboard
              </Link>
              {error.digest && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "var(--ps-text-tertiary)",
                  }}
                >
                  Referencia: {error.digest}
                </p>
              )}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
