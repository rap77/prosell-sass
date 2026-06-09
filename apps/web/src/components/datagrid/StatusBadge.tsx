/**
 * StatusBadge — ProSell design system badge for vehicle status.
 * Uses var(--ps-*) tokens so dark/light theme works automatically.
 */

import {
  CheckCircle2,
  Clock,
  XCircle,
  File,
  Globe,
  CheckCircle,
} from "lucide-react";

export type VehicleStatus =
  | "published"
  | "pending"
  | "failed"
  | "draft"
  | "expired"
  | "online"
  | "sold";

interface StatusBadgeProps {
  status: VehicleStatus;
}

type StatusConfig = {
  bg: string;
  color: string;
  icon: React.ElementType;
  label: string;
};

const STATUS_CONFIG: Record<VehicleStatus, StatusConfig> = {
  published: {
    bg: "var(--ps-success-bg)",
    color: "var(--ps-success)",
    icon: CheckCircle2,
    label: "Publicado",
  },
  online: {
    bg: "var(--ps-info-bg)",
    color: "var(--ps-cyan)",
    icon: Globe,
    label: "Online",
  },
  pending: {
    bg: "var(--ps-warning-bg)",
    color: "var(--ps-warning)",
    icon: Clock,
    label: "Pendiente",
  },
  draft: {
    bg: "rgba(138,155,191,0.12)",
    color: "var(--ps-text-secondary)",
    icon: File,
    label: "Borrador",
  },
  expired: {
    bg: "rgba(138,155,191,0.12)",
    color: "var(--ps-text-secondary)",
    icon: Clock,
    label: "Expirado",
  },
  failed: {
    bg: "var(--ps-error-bg)",
    color: "var(--ps-error)",
    icon: XCircle,
    label: "Fallido",
  },
  sold: {
    bg: "rgba(139,92,246,0.12)",
    color: "#a78bfa",
    icon: CheckCircle,
    label: "Vendido",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { bg, color, icon: Icon, label } = STATUS_CONFIG[status];

  return (
    <span
      data-testid="vehicle-status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
      <span className="sr-only">{status}:</span>
      {label}
    </span>
  );
}
