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
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--ps-error)",
            }}
          >
            Error 404
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--ps-text-primary)",
            }}
          >
            Esta página no existe
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "var(--ps-text-secondary)",
              lineHeight: 1.6,
            }}
          >
            La ruta que intentaste abrir no está disponible o fue movida.
            Regresá al dashboard para continuar gestionando tu operación.
          </p>
        </div>

        {/* Action card */}
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
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
              height: 42,
              borderRadius: 8,
              background: "var(--ps-cyan)",
              color: "var(--ps-bg-base)",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Volver al dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
