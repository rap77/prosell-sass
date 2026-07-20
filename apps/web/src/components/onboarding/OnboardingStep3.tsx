"use client";

/**
 * OnboardingStep3 — invitación al equipo en el flujo de onboarding de ProSell.
 *
 * Paso 3 (opcional): invitar al primer vendedor por email.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useState } from "react";
import { Users } from "lucide-react";

// ============================================
// STYLES
// ============================================

const INPUT_STYLE = `
  .ps-ob3-input {
    width: 100%;
    border-radius: 8px;
    border: 1px solid var(--ps-input-border);
    background: var(--ps-input-bg);
    color: var(--ps-text-primary);
    font-size: 13px;
    padding: 8px 12px;
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }
  .ps-ob3-input:focus {
    border-color: var(--ps-cyan);
    box-shadow: var(--ps-input-focus-shadow);
  }
  .ps-ob3-input::placeholder {
    color: var(--ps-text-tertiary);
  }
`;

// ============================================
// TYPES
// ============================================

interface OnboardingStep3Props {
  onComplete: () => void;
  onBack: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function OnboardingStep3({
  onComplete,
  onBack,
  onSkip,
  isLoading,
}: OnboardingStep3Props) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleInvite() {
    if (!email.trim() || !EMAIL_RE.test(email)) {
      onComplete();
      return;
    }
    try {
      await fetch("/api/v1/teams/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      // Non-blocking — proceed regardless
    }
    onComplete();
  }

  return (
    <>
      <style>{INPUT_STYLE}</style>

      <div className="flex flex-col gap-6">
        {/* Encabezado */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full shrink-0" style={{ background: "var(--ps-info-bg)" }}>
            <Users size={18} strokeWidth={2} style={{ color: "var(--ps-cyan)" }} />
          </div>
          <div>
            <h2 className="m-0 text-base font-bold" style={{ color: "var(--ps-text-primary)" }}>
              Invitá a tu equipo
            </h2>
            <p className="mt-0.5 text-sm" style={{ color: "var(--ps-text-secondary)" }}>
              Opcional — podés invitar a tu primer vendedor ahora o hacerlo
              después desde Configuración
            </p>
          </div>
        </div>

        {/* Contenido */}
        {sent ? (
          <p className="m-0 text-sm" style={{ color: "var(--ps-success)" }}>
            ¡Invitación enviada! Continuando...
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="invite-email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--ps-text-primary)" }}
              >
                Email del integrante
              </label>
              <input
                id="invite-email"
                type="email"
                placeholder="vendedor@tuempresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ps-ob3-input"
              />
            </div>

            <div className="rounded-lg border border-dashed p-3.5 text-center text-sm" style={{ borderColor: "var(--ps-border-default)", color: "var(--ps-text-secondary)" }}>
              También podés invitar a más personas desde{" "}
              <strong style={{ color: "var(--ps-text-primary)" }}>
                Configuración → Equipo
              </strong>{" "}
              en cualquier momento.
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="h-9.5 px-4 rounded text-sm font-medium cursor-pointer transition-opacity"
              style={{
                background: "var(--ps-bg-elevated)",
                border: "1px solid var(--ps-border-default)",
                color: "var(--ps-text-secondary)",
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={onSkip}
              disabled={isLoading}
              className="h-9.5 px-4 rounded text-sm font-medium cursor-pointer transition-opacity"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ps-text-secondary)",
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              Saltar
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleInvite()}
            disabled={isLoading}
            className="h-9.5 px-4 rounded text-sm font-bold cursor-pointer transition-opacity"
            style={{
              background: "var(--ps-cyan)",
              border: "none",
              color: "var(--ps-bg-base)",
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? "Finalizando..." : "Finalizar"}
          </button>
        </div>
      </div>
    </>
  );
}
