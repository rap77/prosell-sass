/**
 * StatusBadge — ProSell design system badge for vehicle status.
 * Uses semantic Tailwind classes for color so dark/light theme works automatically.
 */

import {
  CheckCircle2,
  Clock,
  XCircle,
  File,
  Globe,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";

export const VEHICLE_STATUS = {
  PUBLISHED: "published",
  PENDING: "pending",
  FAILED: "failed",
  DRAFT: "draft",
  EXPIRED: "expired",
  ONLINE: "online",
  SOLD: "sold",
} as const;

export type VehicleStatus =
  (typeof VEHICLE_STATUS)[keyof typeof VEHICLE_STATUS];

interface StatusBadgeProps {
  status: VehicleStatus;
}

type StatusConfig = {
  colorClass: string;
  icon: LucideIcon;
  label: string;
};

const STATUS_CONFIG: Record<VehicleStatus, StatusConfig> = {
  published: {
    colorClass: "text-ps-success",
    icon: CheckCircle2,
    label: "Publicado",
  },
  online: {
    colorClass: "text-ps-cyan",
    icon: Globe,
    label: "Online",
  },
  pending: {
    colorClass: "text-ps-warning",
    icon: Clock,
    label: "Pendiente",
  },
  draft: {
    colorClass: "text-ps-text-secondary",
    icon: File,
    label: "Borrador",
  },
  expired: {
    colorClass: "text-ps-text-secondary",
    icon: Clock,
    label: "Expirado",
  },
  failed: {
    colorClass: "text-ps-error",
    icon: XCircle,
    label: "Rechazado",
  },
  sold: {
    colorClass: "text-ps-violet",
    icon: CheckCircle,
    label: "Vendido",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { colorClass, icon: Icon, label } = STATUS_CONFIG[status];

  return (
    <span
      data-testid="vehicle-status"
      className={`inline-flex items-center gap-1 rounded-full bg-black/85 px-2.5 py-[3px] text-xs font-medium whitespace-nowrap shadow-sm ${colorClass}`}
    >
      <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
      <span className="sr-only">{status}:</span>
      {label}
    </span>
  );
}
