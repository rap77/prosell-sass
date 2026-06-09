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
  dot: "var(--ps-text-disabled)",
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
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 260,
        flex: 1,
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid var(--ps-border-default)`,
        background: "var(--ps-bg-surface)",
        // Top accent line simulated via boxShadow so it doesn't affect layout
        boxShadow: `inset 0 3px 0 0 ${theme.accent}`,
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: "14px 14px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Status dot */}
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: theme.dot,
              flexShrink: 0,
              boxShadow: `0 0 6px ${theme.dot}`,
            }}
          />
          {/* Label */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ps-text-primary)",
              flex: 1,
            }}
          >
            {COLUMN_LABELS[status] ?? status}
          </span>
          {/* Count badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 22,
              height: 20,
              padding: "0 7px",
              borderRadius: 20,
              background: "var(--ps-bg-elevated)",
              border: "1px solid var(--ps-border-subtle)",
              fontSize: 11,
              fontWeight: 700,
              color: leads.length > 0 ? theme.dot : "var(--ps-text-disabled)",
            }}
          >
            {leads.length}
          </span>
        </div>

        {/* Price totals */}
        {hasPrices && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0 8px",
              paddingLeft: 16,
            }}
          >
            {Object.entries(totalsByCurrency).map(([currency, cents]) => (
              <span
                key={currency}
                style={{
                  fontSize: 11,
                  color: "var(--ps-text-secondary)",
                  fontWeight: 500,
                }}
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
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "4px 10px 12px",
          minHeight: 240,
          overflowY: "auto",
          background: isOver ? theme.overBg : "transparent",
          boxShadow: isOver ? `inset 0 0 0 2px ${theme.overRing}` : "none",
          transition: "background 150ms, box-shadow 150ms",
          borderRadius: "0 0 12px 12px",
        }}
      >
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}

        {leads.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "var(--ps-text-disabled)",
              border: `1px dashed var(--ps-border-subtle)`,
              borderRadius: 8,
              minHeight: 80,
              margin: "4px 0",
            }}
          >
            Arrastrá un lead aquí
          </div>
        )}
      </div>
    </div>
  );
}
