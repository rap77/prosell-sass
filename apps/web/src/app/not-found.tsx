import Link from "next/link";
import Image from "next/image";

/**
 * 404 — ProSell not found page.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--ps-bg-base)] px-6 py-8 text-center">
      <main className="w-full max-w-sm flex flex-col gap-7">
        {/* Brand */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5 no-underline">
            <Image
              src="/logo-mark.png"
              alt="ProSell"
              width={271}
              height={294}
              className="h-7 w-auto shrink-0"
            />
            <span className="text-lg font-bold tracking-tight text-[var(--ps-text-primary)]">
              ProSell
            </span>
          </Link>
        </div>

        {/* Copy */}
        <div className="flex flex-col gap-2.5">
          <p className="m-0 text-xs font-bold uppercase tracking-widest text-[var(--ps-error)]">
            Error 404
          </p>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-[var(--ps-text-primary)]">
            Esta página no existe
          </h1>
          <p className="m-0 text-sm text-[var(--ps-text-secondary)] leading-relaxed">
            La ruta que intentaste abrir no está disponible o fue movida.
            Regresá al dashboard para continuar gestionando tu operación.
          </p>
        </div>

        {/* Action card */}
        <div className="rounded-2xl bg-[var(--ps-bg-surface)] border border-[var(--ps-border-default)] p-6 flex flex-col gap-2.5 shadow-lg">
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center h-10 rounded-lg bg-[var(--ps-cyan)] text-[var(--ps-bg-base)] text-sm font-bold no-underline"
          >
            Volver al dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
