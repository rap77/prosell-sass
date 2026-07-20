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
      className={`rounded-[10px] border border-ps-warning bg-ps-warning-bg p-4 ${className || ""}`}
      style={style}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={18}
          strokeWidth={2}
          aria-hidden="true"
          className="shrink-0 text-ps-warning"
          style={{ marginTop: 1 }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="m-0 text-xs font-semibold text-ps-warning">
            {duplicates.length === 1
              ? "Posible duplicado detectado"
              : `${duplicates.length} posibles duplicados detectados`}
          </h3>
          <p className="mt-1 text-xs text-ps-text-secondary">
            {duplicates.length === 1
              ? "Este lead podría ya existir en el sistema."
              : `Se encontraron ${duplicates.length} leads duplicados en el sistema.`}
          </p>

          {/* Lista de duplicados */}
          <ul
            data-testid="duplicate-list"
            className="mt-3 p-0 list-none flex flex-col gap-2"
          >
            {duplicates.map((match) => {
              const confidenceStyle = CONFIDENCE_STYLES[match.confidence];
              const confidenceLabel = CONFIDENCE_LABELS[match.confidence];
              const matchLabel = MATCH_TYPE_LABELS[match.match_type];

              return (
                <li
                  key={match.lead_id}
                  data-testid={`duplicate-item-${match.lead_id}`}
                  className="flex flex-wrap items-center gap-2 text-xs"
                >
                  {/* Link al lead o ID plano */}
                  {onLeadClick ? (
                    <button
                      type="button"
                      onClick={() => onLeadClick(match.lead_id)}
                      aria-label={`Ver lead ${match.lead_id}`}
                      className="bg-none border-none p-0 font-mono text-[11px] text-ps-text-primary underline underline-offset-[2px] cursor-pointer"
                    >
                      {match.lead_id.slice(0, 8)}...
                    </button>
                  ) : (
                    <span className="font-mono text-[11px] text-ps-text-primary">
                      {match.lead_id.slice(0, 8)}...
                    </span>
                  )}

                  {/* Tipo de coincidencia */}
                  <span className="text-ps-text-secondary">
                    vía {matchLabel}
                  </span>

                  {/* Badge de confianza */}
                  <span
                    aria-label={`Confianza: ${confidenceLabel}`}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={confidenceStyle}
                  >
                    Confianza {confidenceLabel}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-[11px] text-ps-text-tertiary">
            Revisá los leads de arriba antes de continuar para evitar
            duplicados.
          </p>
        </div>
      </div>
    </div>
  );
}
