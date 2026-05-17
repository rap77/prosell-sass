"use client";

import Link from "next/link";

interface GlobalErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorPage({
  error,
  reset,
}: GlobalErrorPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12 dark:from-slate-900 dark:to-slate-800 sm:px-6 lg:px-8">
      <main className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-bold text-slate-900 transition-colors hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
          >
            <svg
              className="h-8 w-8"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>ProSell</span>
          </Link>

          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
              Algo salió mal
            </p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              No pudimos cargar esta vista
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 sm:text-base">
              Ocurrió un problema inesperado. Intenta nuevamente o vuelve al
              dashboard para seguir trabajando.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={reset}
            className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
          >
            Intentar de nuevo
          </button>

          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-offset-slate-800"
          >
            Ir al dashboard
          </Link>

          {error.digest ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Código de referencia: {error.digest}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
