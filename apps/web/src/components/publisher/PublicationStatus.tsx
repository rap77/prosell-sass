import { cn } from "@/lib/utils";
import type { PublicationStatus as PublicationStatusType, ErrorCategory } from "@/lib/api/publisherApi";

// ============================================
// TYPES
// ============================================

interface PublicationStatusProps {
  status: PublicationStatusType | null | undefined;
  errorCategory?: ErrorCategory | null;
  blockedUntilConfirmed?: boolean;
}

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG = {
  pending: {
    label: "Pendiente",
    className: "bg-yellow-100 text-yellow-800",
  },
  publishing: {
    label: "Publicando...",
    className: "bg-blue-100 text-blue-800 animate-pulse",
  },
  published: {
    label: "Publicado",
    className: "bg-green-100 text-green-800",
  },
  failed: {
    label: "Error",
    className: "bg-red-100 text-red-800",
  },
  expired: {
    label: "Expirado",
    className: "bg-slate-100 text-slate-600",
  },
  sold: {
    label: "Vendido",
    className: "bg-purple-100 text-purple-800",
  },
} as const satisfies Record<PublicationStatusType, { label: string; className: string }>;

// ============================================
// COMPONENT
// ============================================

/**
 * PublicationStatus — inline badge for catalog row.
 *
 * Category B (blocking error) shows a distinct "Atención Requerida" label
 * so the vendedor immediately knows manual intervention is needed.
 */
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

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
      )}
    >
      {isBlocked ? "Atención Requerida" : config.label}
    </span>
  );
}
