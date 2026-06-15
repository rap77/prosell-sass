"use client";

/**
 * DuplicateWarning — aviso de leads duplicados en ProSell.
 *
 * Se muestra cuando un lead comparte datos de contacto (email, teléfono o ambos)
 * con leads existentes del mismo tenant. No renderiza nada si no hay duplicados.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { AlertTriangle } from "lucide-react";

// ============================================
// TYPES
// ============================================

/**
 * Representa un match de lead duplicado devuelto por la API.
 */
export interface DuplicateMatch {
  lead_id: string;
  match_type: "email" | "phone" | "both";
  confidence: "high" | "medium" | "low";
}

interface DuplicateWarningProps {
  /** Lista de duplicados detectados para este lead */
  duplicates: DuplicateMatch[];
  /** Callback opcional al hacer click en un lead duplicado */
  onLeadClick?: (leadId: string) => void;
  style?: React.CSSProperties;
  className?: string;
}

// ============================================
// MAPS
// ============================================

const CONFIDENCE_LABELS: Record<DuplicateMatch["confidence"], string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const CONFIDENCE_STYLES: Record<
  DuplicateMatch["confidence"],
  React.CSSProperties
> = {
  high: {
    color: "var(--ps-error)",
    background: "var(--ps-error-bg)",
    border: "1px solid var(--ps-error)",
  },
  medium: {
    color: "var(--ps-warning)",
    background: "var(--ps-warning-bg)",
    border: "1px solid var(--ps-warning)",
  },
  low: {
    color: "var(--ps-cyan)",
    background: "var(--ps-info-bg)",
    border: "1px solid rgba(77,184,255,0.25)",
  },
};

const MATCH_TYPE_LABELS: Record<DuplicateMatch["match_type"], string> = {
  email: "coincidencia de email",
  phone: "coincidencia de teléfono",
  both: "coincidencia de email y teléfono",
};

// ============================================
// COMPONENT
// ============================================

export function DuplicateWarning({
  duplicates,
  onLeadClick,
  style,
  className,
}: DuplicateWarningProps) {
  if (!duplicates || duplicates.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="duplicate-warning"
      role="alert"
      aria-label="Posibles leads duplicados detectados"
      className={className}
      style={{
        borderRadius: 10,
        border: "1px solid var(--ps-warning)",
        background: "var(--ps-warning-bg)",
        padding: 16,
        ...style,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <AlertTriangle
          size={18}
          strokeWidth={2}
          aria-hidden="true"
          style={{ color: "var(--ps-warning)", flexShrink: 0, marginTop: 1 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ps-warning)",
            }}
          >
            {duplicates.length === 1
              ? "Posible duplicado detectado"
              : `${duplicates.length} posibles duplicados detectados`}
          </h3>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "var(--ps-text-secondary)",
            }}
          >
            {duplicates.length === 1
              ? "Este lead podría ya existir en el sistema."
              : `Se encontraron ${duplicates.length} leads duplicados en el sistema.`}
          </p>

          {/* Lista de duplicados */}
          <ul
            data-testid="duplicate-list"
            style={{
              margin: "12px 0 0",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {duplicates.map((match) => {
              const confidenceStyle = CONFIDENCE_STYLES[match.confidence];
              const confidenceLabel = CONFIDENCE_LABELS[match.confidence];
              const matchLabel = MATCH_TYPE_LABELS[match.match_type];

              return (
                <li
                  key={match.lead_id}
                  data-testid={`duplicate-item-${match.lead_id}`}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  {/* Link al lead o ID plano */}
                  {onLeadClick ? (
                    <button
                      type="button"
                      onClick={() => onLeadClick(match.lead_id)}
                      aria-label={`Ver lead ${match.lead_id}`}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: "var(--ps-text-primary)",
                        textDecoration: "underline",
                        textUnderlineOffset: 2,
                        cursor: "pointer",
                      }}
                    >
                      {match.lead_id.slice(0, 8)}...
                    </button>
                  ) : (
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: "var(--ps-text-primary)",
                      }}
                    >
                      {match.lead_id.slice(0, 8)}...
                    </span>
                  )}

                  {/* Tipo de coincidencia */}
                  <span style={{ color: "var(--ps-text-secondary)" }}>
                    vía {matchLabel}
                  </span>

                  {/* Badge de confianza */}
                  <span
                    aria-label={`Confianza: ${confidenceLabel}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      borderRadius: 99,
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 600,
                      ...confidenceStyle,
                    }}
                  >
                    Confianza {confidenceLabel}
                  </span>
                </li>
              );
            })}
          </ul>

          <p
            style={{
              margin: "12px 0 0",
              fontSize: 11,
              color: "var(--ps-text-tertiary)",
            }}
          >
            Revisá los leads de arriba antes de continuar para evitar
            duplicados.
          </p>
        </div>
      </div>
    </div>
  );
}
