/**
 * PublicationStatus — ProSell inline badge for publication rows.
 * Uses var(--ps-*) tokens — dark/light automatic.
 *
 * Category B (blocking error) shows "Atención requerida" so the
 * vendedor knows manual intervention is needed.
 */

import type {
  PublicationStatus as PublicationStatusType,
  ErrorCategory,
} from "@/lib/api/publisherApi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicationStatusProps {
  status: PublicationStatusType | null | undefined;
  errorCategory?: ErrorCategory | null;
  blockedUntilConfirmed?: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

type StatusConfig = {
  label: string;
  bg: string;
  color: string;
  dot: string;
  pulse?: boolean;
};

const STATUS_CONFIG: Record<PublicationStatusType, StatusConfig> = {
  pending: {
    label: "Pendiente",
    bg: "var(--ps-warning-bg)",
    color: "var(--ps-warning)",
    dot: "var(--ps-warning)",
  },
  publishing: {
    label: "Publicando…",
    bg: "var(--ps-info-bg)",
    color: "var(--ps-cyan)",
    dot: "var(--ps-cyan)",
    pulse: true,
  },
  published: {
    label: "Publicado",
    bg: "var(--ps-success-bg)",
    color: "var(--ps-success)",
    dot: "var(--ps-success)",
  },
  failed: {
    label: "Error",
    bg: "var(--ps-error-bg)",
    color: "var(--ps-error)",
    dot: "var(--ps-error)",
  },
  expired: {
    label: "Expirado",
    bg: "var(--ps-chip-bg)",
    color: "var(--ps-text-secondary)",
    dot: "var(--ps-text-disabled)",
  },
  sold: {
    label: "Vendido",
    bg: "var(--ps-violet-bg)",
    color: "var(--ps-violet)",
    dot: "var(--ps-violet)",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PublicationStatus({
  status,
  errorCategory,
  blockedUntilConfirmed,
}: PublicationStatusProps) {
  if (!status) return null;

  const config = STATUS_CONFIG[status];
  const isBlocked =
    status === "failed" &&
    (errorCategory === "blocking" || blockedUntilConfirmed === true);
  const label = isBlocked ? "Atención requerida" : config.label;

  return (
    <>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 10px",
          borderRadius: 20,
          background: config.bg,
          color: config.color,
          fontSize: 12,
          fontWeight: 500,
          whiteSpace: "nowrap",
          animation: config.pulse
            ? "psStatusPulse 1.4s ease-in-out infinite"
            : undefined,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: config.dot,
            flexShrink: 0,
          }}
        />
        {label}
      </span>
      {config.pulse && (
        <style>{`@keyframes psStatusPulse { 0%,100% { opacity:1 } 50% { opacity:0.55 } }`}</style>
      )}
    </>
  );
}
