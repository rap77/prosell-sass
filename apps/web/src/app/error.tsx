"use client";

/**
 * Route error boundary — ProSell error page.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import Link from "next/link";
import Image from "next/image";
import { AlertTriangle } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div
      className="flex min-h-screen items-center justify-center text-center p-6"
      style={{
        background: "var(--ps-bg-base)",
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

        {/* Icon + copy */}
        <div className="flex flex-col items-center gap-3.5">
          <div
            className="w-[52px] h-[52px] rounded-[14px] border flex items-center justify-center"
            style={{
              background: "var(--ps-warning-bg)",
              borderColor: "var(--ps-warning)",
            }}
          >
            <AlertTriangle
              size={22}
              strokeWidth={2}
              style={{ color: "var(--ps-warning)" }}
            />
          </div>
          <div>
            <p
              className="m-0 text-xs font-bold uppercase"
              style={{
                letterSpacing: "0.14em",
                color: "var(--ps-warning)",
              }}
            >
              Algo salió mal
            </p>
            <h1
              className="mt-2 text-2xl font-bold"
              style={{
                letterSpacing: "-0.02em",
                color: "var(--ps-text-primary)",
              }}
            >
              No pudimos cargar esta vista
            </h1>
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{
                color: "var(--ps-text-secondary)",
              }}
            >
              Ocurrió un problema inesperado. Intentá de nuevo o volvé al
              dashboard para seguir trabajando.
            </p>
          </div>
        </div>

        {/* Action card */}
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
  );
}
