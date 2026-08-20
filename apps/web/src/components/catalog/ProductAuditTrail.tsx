import { Loader2, ClockIcon, UserIcon, MessageSquareIcon } from "lucide-react";
import type { ProductAuditLogEntry } from "@/lib/api/products";

/**
 * Spanish labels for every ProductStatus value. Product audit entries can
 * carry any of the 8 statuses (unlike the catalog grid's StatusBadge,
 * which only covers draft/pending/published/sold), so this timeline uses
 * its own plain-badge labels rather than importing that component.
 */
const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  published: "Publicado",
  paused: "En mantenimiento",
  reserved: "Apartado",
  sold: "Vendido",
  rejected: "Rechazado",
  archived: "Archivado",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function formatTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex py-[3px] px-2.5 rounded-full bg-ps-elevated border border-ps-border-default text-xs font-medium text-ps-text-secondary">
      {statusLabel(status)}
    </span>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface AuditEntryProps {
  entry: ProductAuditLogEntry;
  isLast: boolean;
}

/**
 * AuditEntry — a single row in the vertical audit timeline. Mirrors
 * LeadAuditTrail's AuditEntry: timestamp, status transition, who, reason.
 * "Who" shows the raw changed_by_user_id -- no name-resolution mechanism
 * exists for audit "who" fields anywhere in this codebase (LeadAuditTrail
 * does the same).
 */
function AuditEntry({ entry, isLast }: AuditEntryProps) {
  return (
    <li className="relative flex gap-4" data-testid="product-audit-entry">
      <div className="flex flex-col items-center" aria-hidden="true">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ps-elevated border border-ps-border-default">
          <ClockIcon className="h-4 w-4 text-ps-text-tertiary" />
        </div>
        {!isLast && <div className="mt-1 w-px grow bg-ps-border-subtle" />}
      </div>

      <div className="pb-6 min-w-0 flex-1">
        <time
          dateTime={entry.created_at}
          className="block text-xs text-ps-text-tertiary mb-2"
          data-testid="product-audit-timestamp"
        >
          {formatTimestamp(entry.created_at)}
        </time>

        <div
          className="flex flex-wrap items-center gap-2 mb-2"
          data-testid="product-audit-status-change"
        >
          <StatusPill status={entry.old_status} />
          <span
            className="text-xs text-ps-text-tertiary"
            aria-label="changed to"
          >
            →
          </span>
          <StatusPill status={entry.new_status} />
          <span className="sr-only">
            Estado cambiado de {statusLabel(entry.old_status)} a{" "}
            {statusLabel(entry.new_status)}
          </span>
        </div>

        {entry.changed_by_user_id && (
          <div
            className="flex items-center gap-1.5 text-xs text-ps-text-tertiary mb-1"
            data-testid="product-audit-changed-by"
          >
            <UserIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Por usuario {entry.changed_by_user_id}</span>
          </div>
        )}

        {entry.reason && (
          <div
            className="flex items-start gap-1.5 text-xs text-ps-text-tertiary"
            data-testid="product-audit-reason"
          >
            <MessageSquareIcon
              className="h-3.5 w-3.5 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span className="italic">{entry.reason}</span>
          </div>
        )}
      </div>
    </li>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface ProductAuditTrailProps {
  auditLogs: ProductAuditLogEntry[];
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
}

/**
 * ProductAuditTrail — vertical timeline of a product's status-change
 * history ("Historial" section on the catalog detail page). Only
 * rendered for super_admin/admin viewers by the caller — the backend
 * 403s everyone else.
 */
export function ProductAuditTrail({
  auditLogs,
  isLoading = false,
  error = null,
  className = "",
}: ProductAuditTrailProps) {
  if (isLoading) {
    return (
      <div
        className={`flex items-center gap-2 py-4 text-ps-text-tertiary ${className}`}
        data-testid="product-audit-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span className="text-sm">Cargando historial...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-lg border border-destructive/50 bg-ps-error-bg px-4 py-3 text-sm text-destructive ${className}`}
        role="alert"
        data-testid="product-audit-error"
      >
        No pudimos cargar el historial: {error.message}
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div
        className={`rounded-lg border border-dashed border-ps-border-default p-6 text-center text-sm text-ps-text-tertiary ${className}`}
        data-testid="product-audit-empty"
      >
        Todavía no hay cambios de estado registrados.
      </div>
    );
  }

  return (
    <section className={className} aria-label="Historial del producto">
      <ul
        className="space-y-0"
        data-testid="product-audit-trail-list"
        aria-label={`${auditLogs.length} cambio${auditLogs.length === 1 ? "" : "s"} de estado`}
      >
        {auditLogs.map((entry, index) => (
          <AuditEntry
            key={entry.id}
            entry={entry}
            isLast={index === auditLogs.length - 1}
          />
        ))}
      </ul>
    </section>
  );
}
