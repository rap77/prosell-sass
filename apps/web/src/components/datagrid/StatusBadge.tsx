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
  color: string;
  icon: React.ElementType;
  label: string;
};

const STATUS_CONFIG: Record<VehicleStatus, StatusConfig> = {
  published: {
    color: "var(--ps-success)",
    icon: CheckCircle2,
    label: "Publicado",
  },
  online: {
    color: "var(--ps-cyan)",
    icon: Globe,
    label: "Online",
  },
  pending: {
    color: "var(--ps-warning)",
    icon: Clock,
    label: "Pendiente",
  },
  draft: {
    color: "var(--ps-text-secondary)",
    icon: File,
    label: "Borrador",
  },
  expired: {
    color: "var(--ps-text-secondary)",
    icon: Clock,
    label: "Expirado",
  },
  failed: {
    color: "var(--ps-error)",
    icon: XCircle,
    label: "Fallido",
  },
  sold: {
    color: "#a78bfa",
    icon: CheckCircle,
    label: "Vendido",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { color, icon: Icon, label } = STATUS_CONFIG[status];

  return (
    <span
      data-testid="vehicle-status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        // ponytail: solid dark backdrop for readability over images
        background: "rgba(30,30,30,0.85)",
        color,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: "nowrap",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }}
    >
      <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
      <span className="sr-only">{status}:</span>
      {label}
    </span>
  );
}
