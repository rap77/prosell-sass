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
          className="flex min-h-screen items-center justify-center text-center p-6"
          style={{
            background: "var(--ps-bg-base)",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <main className="w-full max-w-[400px] flex flex-col gap-7">
            {/* Brand */}
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2.5 no-underline"
            >
              <Image
                src="/logo-mark.png"
                alt="ProSell"
                width={271}
                height={294}
                className="h-7 w-auto flex-shrink-0"
              />
              <span
                className="text-lg font-bold"
                style={{
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
                className="m-0 text-xs font-bold uppercase"
                style={{
                  letterSpacing: "0.14em",
                  color: "var(--ps-warning)",
                }}
              >
                Error global
              </p>
              <h1
                className="mt-2 text-2xl font-bold"
                style={{
                  letterSpacing: "-0.02em",
                  color: "var(--ps-text-primary)",
                }}
              >
                No pudimos iniciar la aplicación
              </h1>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{
                  color: "var(--ps-text-secondary)",
                }}
              >
                Ocurrió un problema inesperado al cargar ProSell. Intentá de
                nuevo o volvé al dashboard para retomar tu trabajo.
              </p>
            </div>

            {/* Actions */}
            <div
              className="rounded-[14px] p-6 flex flex-col gap-2.5"
              style={{
                background: "var(--ps-bg-surface)",
                border: "1px solid var(--ps-border-default)",
                boxShadow: "0 4px 24px rgba(6,13,36,0.3)",
              }}
            >
              <button
                type="button"
                onClick={reset}
                className="inline-flex w-full items-center justify-center h-[42px] rounded-lg border-none font-bold text-sm cursor-pointer"
                style={{
                  background: "var(--ps-cyan)",
                  color: "var(--ps-bg-base)",
                }}
              >
                Intentar de nuevo
              </button>
              <Link
                href="/dashboard"
                className="inline-flex w-full items-center justify-center h-[42px] rounded-lg font-medium text-sm no-underline"
                style={{
                  background: "var(--ps-bg-elevated)",
                  border: "1px solid var(--ps-border-default)",
                  color: "var(--ps-text-secondary)",
                }}
              >
                Ir al dashboard
              </Link>
              {error.digest && (
                <p
                  className="m-0 text-xs"
                  style={{
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
