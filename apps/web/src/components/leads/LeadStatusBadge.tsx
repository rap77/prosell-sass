"use client";

/**
 * LeadStatusBadge — ProSell design system badge for lead lifecycle status.
 * Uses var(--ps-*) tokens so dark/light theme works automatically.
 * Labels in Spanish (Rioplatense).
 */

import { LeadStatus } from "@/lib/api/leads";

interface LeadStatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

type StatusConfig = {
  label: string;
  bg: string;
  color: string;
  dot: string;
};

const STATUS_CONFIG: Record<LeadStatus, StatusConfig> = {
  [LeadStatus.NEW]: {
    label: "Nuevo",
    bg: "var(--ps-info-bg)",
    color: "var(--ps-cyan)",
    dot: "var(--ps-cyan)",
  },
  [LeadStatus.CONTACTED]: {
    label: "Contactado",
    bg: "var(--ps-warning-bg)",
    color: "var(--ps-warning)",
    dot: "var(--ps-warning)",
  },
  [LeadStatus.QUALIFIED]: {
    label: "Calificado",
    bg: "var(--ps-success-bg)",
    color: "var(--ps-success)",
    dot: "var(--ps-success)",
  },
  [LeadStatus.APPOINTMENT_SET]: {
    label: "Cita agendada",
    bg: "rgba(139,92,246,0.12)",
    color: "#a78bfa",
    dot: "#a78bfa",
  },
  [LeadStatus.LOST]: {
    label: "Perdido",
    bg: "rgba(138,155,191,0.10)",
    color: "var(--ps-text-secondary)",
    dot: "var(--ps-text-tertiary)",
  },
};

export function LeadStatusBadge({
  status,
  className = "",
}: LeadStatusBadgeProps) {
  const { label, bg, color, dot } = STATUS_CONFIG[status];

  return (
    <span
      data-testid="status-badge"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.75 text-xs font-medium whitespace-nowrap ${className}`}
      style={{
        background: bg,
        color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: dot,
        }}
      />
      {label}
    </span>
  );
}
