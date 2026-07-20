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
                Política de Privacidad
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
                La página de Política de Privacidad está en desarrollo.
                Próximamente vas a encontrar el detalle completo de cómo
                recopilamos, usamos y protegemos tu información personal.
              </p>
              <p
                className="text-sm leading-7"
                style={{
                  color: "var(--ps-text-secondary)",
                }}
              >
                Para consultas urgentes sobre nuestras prácticas de privacidad,
                contactá al equipo en{" "}
                <a
                  href="mailto:privacy@prosell.saas"
                  className="no-underline font-medium"
                  style={{
                    color: "var(--ps-cyan)",
                  }}
                >
                  privacy@prosell.saas
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
