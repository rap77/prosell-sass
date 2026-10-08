import { Loader2, ClockIcon, PhoneIcon, StickyNoteIcon } from "lucide-react";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { LeadActivityType } from "@/lib/api/schemas/leads";
import type { LeadAuditLogEntry, LeadActivityEntry } from "@/lib/api/leads";

type TimelineItem =
  | { kind: "status_change"; created_at: string; entry: LeadAuditLogEntry }
  | { kind: "activity"; created_at: string; entry: LeadActivityEntry };

function mergeTimeline(
  auditLogs: LeadAuditLogEntry[],
  activities: LeadActivityEntry[],
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...auditLogs.map((entry): TimelineItem => ({
      kind: "status_change",
      created_at: entry.created_at,
      entry,
    })),
    ...activities.map((entry): TimelineItem => ({
      kind: "activity",
      created_at: entry.created_at,
      entry,
    })),
  ];
  return items.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function formatTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TimelineRow({
  item,
  isLast,
}: {
  item: TimelineItem;
  isLast: boolean;
}) {
  const Icon =
    item.kind === "status_change"
      ? ClockIcon
      : item.entry.type === LeadActivityType.CALL
        ? PhoneIcon
        : StickyNoteIcon;

  return (
    <li
      className="relative flex gap-4"
      data-testid={`timeline-item-${item.entry.id}`}
    >
      <div className="flex flex-col items-center" aria-hidden="true">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ps-elevated border border-ps-border-default">
          <Icon className="h-4 w-4 text-ps-text-tertiary" />
        </div>
        {!isLast && <div className="mt-1 w-px grow bg-ps-border-subtle" />}
      </div>

      <div className="pb-6 min-w-0 flex-1">
        <time
          dateTime={item.created_at}
          className="block text-xs text-ps-text-tertiary mb-2"
        >
          {formatTimestamp(item.created_at)}
        </time>

        {item.kind === "status_change" ? (
          <div
            className="flex flex-wrap items-center gap-2"
            data-testid="audit-entry"
          >
            <LeadStatusBadge status={item.entry.old_status} />
            <span
              className="text-xs text-ps-text-tertiary"
              aria-label="changed to"
            >
              →
            </span>
            <LeadStatusBadge status={item.entry.new_status} />
          </div>
        ) : (
          <div data-testid="activity-entry">
            <span className="mb-1 inline-block text-[11px] font-semibold uppercase tracking-wide text-ps-text-tertiary">
              {item.entry.type === LeadActivityType.CALL ? "Llamada" : "Nota"}
            </span>
            <p className="m-0 text-sm text-ps-text-primary">
              {item.entry.content}
            </p>
          </div>
        )}
      </div>
    </li>
  );
}

export interface LeadTimelineProps {
  auditLogs: LeadAuditLogEntry[];
  activities: LeadActivityEntry[];
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
}

/** LeadTimeline — unified chronological feed of status changes (automatic,
 * LeadAuditLog) and manual notes/calls (LeadActivity). CRM roadmap Fase 4. */
export function LeadTimeline({
  auditLogs,
  activities,
  isLoading = false,
  error = null,
  className = "",
}: LeadTimelineProps) {
  if (isLoading) {
    return (
      <div
        className={`flex items-center gap-2 py-4 text-ps-text-tertiary ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span className="text-sm">Cargando actividad...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-lg border border-destructive/50 bg-ps-error-bg px-4 py-3 text-sm text-destructive ${className}`}
        role="alert"
      >
        Error al cargar la actividad: {error.message}
      </div>
    );
  }

  const items = mergeTimeline(auditLogs, activities);

  if (items.length === 0) {
    return (
      <div
        className={`rounded-lg border border-dashed border-ps-border-default p-6 text-center text-sm text-ps-text-tertiary ${className}`}
      >
        Sin actividad registrada todavía.
      </div>
    );
  }

  return (
    <section className={className} aria-label="Actividad del lead">
      <ul className="space-y-0">
        {items.map((item, index) => (
          <TimelineRow
            key={item.entry.id}
            item={item}
            isLast={index === items.length - 1}
          />
        ))}
      </ul>
    </section>
  );
}
