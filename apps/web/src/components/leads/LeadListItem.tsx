"use client";

/**
 * LeadListItem — ProSell-styled single lead row.
 *
 * - Left cyan border accent for unread leads (< 5 min)
 * - Gradient avatar with buyer initials
 * - Buyer name + email + phone stacked
 * - Vehicle title + year/make/model
 * - Message preview (1 line)
 * - LeadStatusDropdown (in-place quick update)
 * - Time ago + source chip
 * All colors via var(--ps-*) — dark/light automatic.
 */

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Lead, LeadStatus } from "@/lib/api/leads";
import { LeadStatusDropdown } from "./LeadStatusDropdown";
import { Mail, Phone, MessageSquare, Car } from "lucide-react";

interface LeadListItemProps {
  lead: Lead;
  onStatusUpdate?: (leadId: string, newStatus: LeadStatus) => void;
  isUnread?: boolean;
  actions?: React.ReactNode;
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

const SOURCE_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  web: "Web",
  manual: "Manual",
  email: "Email",
  phone: "Teléfono",
};

export function LeadListItem({
  lead,
  onStatusUpdate,
  isUnread = false,
  actions,
}: LeadListItemProps) {
  const timeAgo = formatDistanceToNow(new Date(lead.created_at), {
    addSuffix: true,
    locale: es,
  });
  const sourceLabel = SOURCE_LABELS[lead.source?.toLowerCase()] ?? lead.source;

  return (
    <div
      data-testid="lead-item"
      className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--ps-table-divider)] cursor-pointer transition-colors duration-150"
      style={{
        background: isUnread ? "rgba(77,184,255,0.03)" : "transparent",
        borderLeft: isUnread
          ? "3px solid var(--ps-cyan)"
          : "3px solid transparent",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--ps-table-row-hover)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = isUnread
          ? "rgba(77,184,255,0.03)"
          : "transparent")
      }
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-[var(--ps-bg-base)] tracking-tight"
        style={{
          background: "linear-gradient(135deg, var(--ps-cyan), var(--ps-blue))",
        }}
      >
        {getInitials(lead.buyer_name)}
      </div>

      {/* Buyer info */}
      <div className="flex-shrink-0 w-[180px] min-w-0">
        <p className="m-0 text-sm font-semibold text-[var(--ps-text-primary)] whitespace-nowrap overflow-hidden text-ellipsis">
          {lead.buyer_name}
          {isUnread && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full align-middle ml-1.5"
              style={{
                background: "var(--ps-cyan)",
              }}
            />
          )}
        </p>
        {lead.buyer_email && (
          <p className="mt-0.5 text-xs text-[var(--ps-text-secondary)] flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap">
            <Mail size={10} strokeWidth={2} className="flex-shrink-0" />
            {lead.buyer_email}
          </p>
        )}
        {lead.buyer_phone && (
          <p className="mt-0.5 text-xs text-[var(--ps-text-secondary)] flex items-center gap-1">
            <Phone size={10} strokeWidth={2} className="flex-shrink-0" />
            {lead.buyer_phone}
          </p>
        )}
      </div>

      {/* Vehicle */}
      <div className="flex-shrink-0 w-[170px] min-w-0">
        {lead.product ? (
          <>
            <p className="m-0 text-sm font-medium text-[var(--ps-text-primary)] overflow-hidden text-ellipsis whitespace-nowrap">
              {lead.product.title}
            </p>
            <p className="mt-0.5 text-xs text-[var(--ps-text-secondary)] flex items-center gap-1">
              <Car size={10} strokeWidth={2} className="flex-shrink-0" />
              {[
                lead.product.attributes.year,
                lead.product.attributes.make,
                lead.product.attributes.model,
              ]
                .filter(Boolean)
                .join(" ")}
            </p>
          </>
        ) : (
          <span className="text-xs text-[var(--ps-text-tertiary)] italic">
            Sin vehículo
          </span>
        )}
      </div>

      {/* Message preview */}
      <div className="flex-1 min-w-0">
        {lead.message ? (
          <p className="m-0 text-xs text-[var(--ps-text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-1.25">
            <MessageSquare
              size={11}
              strokeWidth={2}
              className="flex-shrink-0"
              style={{ color: "var(--ps-text-tertiary)" }}
            />
            {lead.message}
          </p>
        ) : (
          <span className="text-xs text-[var(--ps-text-tertiary)] italic">
            Sin mensaje
          </span>
        )}
      </div>

      {/* Status dropdown — stop propagation so row click doesn't fire */}
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <LeadStatusDropdown
          leadId={lead.id}
          currentStatus={lead.status}
          onStatusUpdated={(newStatus) => onStatusUpdate?.(lead.id, newStatus)}
        />
      </div>

      {/* Time + source */}
      <div className="flex-shrink-0 text-right min-w-[90px]">
        <p className="m-0 text-xs text-[var(--ps-text-secondary)]">{timeAgo}</p>
        <span
          className="inline-block mt-0.75 text-[10px] font-semibold tracking-widest uppercase text-[var(--ps-text-tertiary)]"
          style={{
            background: "rgba(138,155,191,0.08)",
            padding: "1px 6px",
            borderRadius: 4,
          }}
        >
          {sourceLabel}
        </span>
      </div>

      {/* Extra actions slot */}
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}
