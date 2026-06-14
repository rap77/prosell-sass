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

  const btnBase: React.CSSProperties = {
    height: 38,
    padding: "0 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    opacity: isLoading ? 0.5 : 1,
    transition: "opacity 0.15s",
  };

  return (
    <>
      <style>{INPUT_STYLE}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Encabezado */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--ps-info-bg)",
              flexShrink: 0,
            }}
          >
            <Users
              size={18}
              strokeWidth={2}
              style={{ color: "var(--ps-cyan)" }}
            />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "var(--ps-text-primary)",
              }}
            >
              Invitá a tu equipo
            </h2>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 13,
                color: "var(--ps-text-secondary)",
              }}
            >
              Opcional — podés invitar a tu primer vendedor ahora o hacerlo
              después desde Configuración
            </p>
          </div>
        </div>

        {/* Contenido */}
        {sent ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--ps-success)" }}>
            ¡Invitación enviada! Continuando...
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                htmlFor="invite-email"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--ps-text-primary)",
                  marginBottom: 6,
                }}
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

            <div
              style={{
                borderRadius: 8,
                border: "1px dashed var(--ps-border-default)",
                padding: "14px 16px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--ps-text-secondary)",
              }}
            >
              También podés invitar a más personas desde{" "}
              <strong style={{ color: "var(--ps-text-primary)" }}>
                Configuración → Equipo
              </strong>{" "}
              en cualquier momento.
            </div>
          </div>
        )}

        {/* Acciones */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              style={{
                ...btnBase,
                background: "var(--ps-bg-elevated)",
                border: "1px solid var(--ps-border-default)",
                color: "var(--ps-text-secondary)",
              }}
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={onSkip}
              disabled={isLoading}
              style={{
                ...btnBase,
                background: "transparent",
                border: "none",
                color: "var(--ps-text-secondary)",
              }}
            >
              Saltar
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleInvite()}
            disabled={isLoading}
            style={{
              ...btnBase,
              background: "var(--ps-cyan)",
              border: "none",
              color: "var(--ps-bg-base)",
              fontWeight: 700,
            }}
          >
            {isLoading ? "Finalizando..." : "Finalizar"}
          </button>
        </div>
      </div>
    </>
  );
}
