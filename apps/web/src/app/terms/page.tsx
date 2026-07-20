/**
 * Términos y Condiciones — ProSell.
 * Placeholder — en desarrollo.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Términos y Condiciones | ProSell",
  description: "Términos y condiciones de uso de ProSell SaaS.",
};

export default function TermsPage() {
  return (
    <div
      className="min-h-screen px-4 py-12"
      style={{
        background: "var(--ps-bg-base)",
      }}
    >
      <div className="max-w-xl mx-auto">
        <div
          className="rounded-2xl p-10"
          style={{
            background: "var(--ps-bg-surface)",
            border: "1px solid var(--ps-border-default)",
          }}
        >
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="text-center">
              <h1
                className="text-2xl font-bold tracking-tight -mb-2"
                style={{
                  color: "var(--ps-text-primary)",
                }}
              >
                Términos y Condiciones
              </h1>
              <p
                className="text-sm"
                style={{
                  color: "var(--ps-text-tertiary)",
                }}
              >
                Próximamente
              </p>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-4">
              <p
                className="text-sm leading-7"
                style={{
                  color: "var(--ps-text-secondary)",
                }}
              >
                La página de Términos y Condiciones está en desarrollo.
                Próximamente vas a encontrar los términos y condiciones
                completos que rigen el uso de ProSell SaaS.
              </p>
              <p
                className="text-sm leading-7"
                style={{
                  color: "var(--ps-text-secondary)",
                }}
              >
                Para consultas urgentes sobre nuestros términos de servicio,
                contactá al equipo legal en{" "}
                <a
                  href="mailto:legal@prosell.saas"
                  className="no-underline font-medium"
                  style={{
                    color: "var(--ps-cyan)",
                  }}
                >
                  legal@prosell.saas
                </a>
                .
              </p>
            </div>

            {/* Back button */}
            <div className="text-center mt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 h-10 px-4.5 rounded-lg text-sm font-medium no-underline"
                style={{
                  background: "var(--ps-bg-elevated)",
                  border: "1px solid var(--ps-border-default)",
                  color: "var(--ps-text-secondary)",
                  transition: "border-color 150ms",
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
