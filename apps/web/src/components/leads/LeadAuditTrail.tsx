"use client";

import { LeadStatus, type LeadAuditLogEntry } from "@/lib/api/leads";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { Loader2, ClockIcon, UserIcon, MessageSquareIcon } from "lucide-react";

/**
 * Status label mapping for display.
 * Same order as LeadStatusBadge — keeps labels consistent.
 */
const STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: "New",
  [LeadStatus.CONTACTED]: "Contacted",
  [LeadStatus.QUALIFIED]: "Qualified",
  [LeadStatus.APPOINTMENT_SET]: "Appointment Set",
  [LeadStatus.LOST]: "Lost",
};

/**
 * Formats an ISO timestamp to a human-readable date+time string.
 */
function formatTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface AuditEntryProps {
  entry: LeadAuditLogEntry;
  isLast: boolean;
}

/**
 * AuditEntry — a single row in the vertical audit timeline.
 *
 * Displays:
 *  - Timestamp (when)
 *  - Status transition: old → new (color-coded badges)
 *  - Who made the change (user ID — backend may enrich later)
 *  - Reason if provided
 */
function AuditEntry({ entry, isLast }: AuditEntryProps) {
  return (
    <li className="relative flex gap-4" data-testid="audit-entry">
      {/* Vertical connecting line — hidden after last entry */}
      <div className="flex flex-col items-center" aria-hidden="true">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted border border-border">
          <ClockIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        {!isLast && <div className="mt-1 w-px grow bg-border" />}
      </div>

      {/* Entry body */}
      <div className="pb-6 min-w-0 flex-1">
        {/* Timestamp */}
        <time
          dateTime={entry.created_at}
          className="block text-xs text-muted-foreground mb-2"
          data-testid="audit-timestamp"
        >
          {formatTimestamp(entry.created_at)}
        </time>

        {/* Status transition */}
        <div
          className="flex flex-wrap items-center gap-2 mb-2"
          data-testid="audit-status-change"
        >
          <LeadStatusBadge status={entry.old_status} />
          <span
            className="text-xs text-muted-foreground"
            aria-label="changed to"
          >
            →
          </span>
          <LeadStatusBadge status={entry.new_status} />
          <span className="sr-only">
            Status changed from {STATUS_LABELS[entry.old_status]} to{" "}
            {STATUS_LABELS[entry.new_status]}
          </span>
        </div>

        {/* Who made the change */}
        {entry.changed_by_user_id && (
          <div
            className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"
            data-testid="audit-changed-by"
          >
            <UserIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Changed by user {entry.changed_by_user_id}</span>
          </div>
        )}

        {/* Reason for change */}
        {entry.reason && (
          <div
            className="flex items-start gap-1.5 text-xs text-muted-foreground"
            data-testid="audit-reason"
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

export interface LeadAuditTrailProps {
  /** Ordered list of audit log entries (newest-first as returned by backend). */
  auditLogs: LeadAuditLogEntry[];
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
}

/**
 * LeadAuditTrail — vertical timeline of lead status change history.
 *
 * Renders audit log entries in chronological order (newest first).
 * Each entry shows: timestamp, status change (from → to), who made the
 * change, and optional reason.
 *
 * Accepts raw data + loading/error states so the parent can compose
 * this with any data-fetching strategy (useLeadAuditTrail hook or SSR).
 */
export function LeadAuditTrail({
  auditLogs,
  isLoading = false,
  error = null,
  className = "",
}: LeadAuditTrailProps) {
  if (isLoading) {
    return (
      <div
        className={`flex items-center gap-2 py-4 text-muted-foreground ${className}`}
        data-testid="audit-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span className="text-sm">Loading audit history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive ${className}`}
        role="alert"
        data-testid="audit-error"
      >
        Failed to load audit history: {error.message}
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div
        className={`rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground ${className}`}
        data-testid="audit-empty"
      >
        No status changes recorded yet.
      </div>
    );
  }

  return (
    <section className={className} aria-label="Lead audit trail">
      <ul
        className="space-y-0"
        data-testid="audit-trail-list"
        aria-label={`${auditLogs.length} status change${auditLogs.length === 1 ? "" : "s"}`}
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
