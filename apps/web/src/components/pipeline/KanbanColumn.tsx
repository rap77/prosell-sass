"use client";

/**
 * KanbanColumn — ProSell-styled droppable pipeline column.
 *
 * Each column has a colored top-border accent matching the lead status.
 * Column body uses var(--ps-bg-surface) and highlights on drag-over.
 * Price totals grouped by currency (backend may send mixed currencies).
 */

import { useDroppable } from "@dnd-kit/core";
import { type Lead, type LeadStatus } from "@/lib/api/leads";
import { LeadCard } from "./LeadCard";

// ─── Per-status design tokens ─────────────────────────────────────────────────

type ColumnTheme = {
  dot: string;
  accent: string;
  overBg: string;
  overRing: string;
};

const COLUMN_THEME: Record<string, ColumnTheme> = {
  new: {
    dot: "var(--ps-cyan)",
    accent: "var(--ps-cyan)",
    overBg: "rgba(77,184,255,0.04)",
    overRing: "rgba(77,184,255,0.25)",
  },
  contacted: {
    dot: "var(--ps-warning)",
    accent: "var(--ps-warning)",
    overBg: "rgba(245,166,35,0.04)",
    overRing: "rgba(245,166,35,0.25)",
  },
  qualified: {
    dot: "var(--ps-success)",
    accent: "var(--ps-success)",
    overBg: "rgba(34,211,160,0.04)",
    overRing: "rgba(34,211,160,0.25)",
  },
  appointment_set: {
    dot: "#a78bfa",
    accent: "#a78bfa",
    overBg: "rgba(139,92,246,0.04)",
    overRing: "rgba(139,92,246,0.25)",
  },
};

const FALLBACK_THEME: ColumnTheme = {
  dot: "var(--ps-text-tertiary)",
  accent: "var(--ps-border-default)",
  overBg: "var(--ps-hover-bg-xs)",
  overRing: "var(--ps-border-default)",
};

const COLUMN_LABELS: Record<string, string> = {
  new: "Nuevos",
  contacted: "Contactados",
  qualified: "Calificados",
  appointment_set: "Con cita",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: LeadStatus;
  leads: Lead[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KanbanColumn({ status, leads }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const theme = COLUMN_THEME[status] ?? FALLBACK_THEME;

  // Group price totals by currency
  const totalsByCurrency = leads.reduce<Record<string, number>>((acc, lead) => {
    if (lead.product?.price_cents && lead.product.currency) {
      acc[lead.product.currency] =
        (acc[lead.product.currency] ?? 0) + lead.product.price_cents;
    }
    return acc;
  }, {});

  const hasPrices = Object.keys(totalsByCurrency).length > 0;

  return (
    <div
      className="flex flex-col flex-1 min-w-[260px] rounded-[12px] overflow-hidden border border-ps-border-default bg-ps-surface"
      style={{
        // Top accent line simulated via boxShadow so it doesn't affect layout
        boxShadow: `inset 0 3px 0 0 ${theme.accent}`,
      }}
    >
      {/* Column header */}
      <div className="flex flex-col px-[14px] pt-[14px] pb-[10px] gap-1">
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              background: theme.dot,
              boxShadow: `0 0 6px ${theme.dot}`,
            }}
          />
          {/* Label */}
          <span className="flex-1 text-xs font-semibold text-ps-text-primary">
            {COLUMN_LABELS[status] ?? status}
          </span>
          {/* Count badge */}
          <span
            className="inline-flex items-center justify-center min-w-[22px] h-5 px-[7px] rounded-[20px] bg-ps-elevated border border-ps-border-subtle text-xs font-bold"
            style={{
              color: leads.length > 0 ? theme.dot : "var(--ps-text-tertiary)",
            }}
          >
            {leads.length}
          </span>
        </div>

        {/* Price totals */}
        {hasPrices && (
          <div className="flex flex-wrap gap-x-2 pl-4">
            {Object.entries(totalsByCurrency).map(([currency, cents]) => (
              <span
                key={currency}
                className="text-xs font-medium text-ps-text-secondary"
              >
                {new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency,
                  maximumFractionDigits: 0,
                }).format(cents / 100)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 flex flex-col gap-2 px-[10px] py-[4px] pb-3 min-h-60 overflow-y-auto rounded-b-[12px] transition-[background,box-shadow] duration-150"
        style={{
          background: isOver ? theme.overBg : "transparent",
          boxShadow: isOver ? `inset 0 0 0 2px ${theme.overRing}` : "none",
        }}
      >
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}

        {leads.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-xs text-ps-tertiary border border-dashed border-ps-border-subtle rounded-lg min-h-20 my-1">
            Arrastrá un lead aquí
          </div>
        )}
      </div>
    </div>
  );
}
