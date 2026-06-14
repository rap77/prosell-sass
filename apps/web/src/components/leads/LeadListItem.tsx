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
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 20px",
        borderBottom: "1px solid var(--ps-table-divider)",
        background: isUnread ? "rgba(77,184,255,0.03)" : "transparent",
        borderLeft: isUnread
          ? "3px solid var(--ps-cyan)"
          : "3px solid transparent",
        transition: "background 150ms",
        cursor: "pointer",
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
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          flexShrink: 0,
          background: "linear-gradient(135deg, var(--ps-cyan), var(--ps-blue))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--ps-bg-base)",
          letterSpacing: "0.02em",
        }}
      >
        {getInitials(lead.buyer_name)}
      </div>

      {/* Buyer info */}
      <div style={{ flexShrink: 0, width: 180, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--ps-text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {lead.buyer_name}
          {isUnread && (
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--ps-cyan)",
                marginLeft: 6,
                verticalAlign: "middle",
              }}
            />
          )}
        </p>
        {lead.buyer_email && (
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 11,
              color: "var(--ps-text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <Mail size={10} strokeWidth={2} style={{ flexShrink: 0 }} />
            {lead.buyer_email}
          </p>
        )}
        {lead.buyer_phone && (
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 11,
              color: "var(--ps-text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Phone size={10} strokeWidth={2} style={{ flexShrink: 0 }} />
            {lead.buyer_phone}
          </p>
        )}
      </div>

      {/* Vehicle */}
      <div style={{ flexShrink: 0, width: 170, minWidth: 0 }}>
        {lead.product ? (
          <>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--ps-text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {lead.product.title}
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 11,
                color: "var(--ps-text-secondary)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Car size={10} strokeWidth={2} style={{ flexShrink: 0 }} />
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
          <span
            style={{
              fontSize: 12,
              color: "var(--ps-text-tertiary)",
              fontStyle: "italic",
            }}
          >
            Sin vehículo
          </span>
        )}
      </div>

      {/* Message preview */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {lead.message ? (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "var(--ps-text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <MessageSquare
              size={11}
              strokeWidth={2}
              style={{ flexShrink: 0, color: "var(--ps-text-tertiary)" }}
            />
            {lead.message}
          </p>
        ) : (
          <span
            style={{
              fontSize: 12,
              color: "var(--ps-text-tertiary)",
              fontStyle: "italic",
            }}
          >
            Sin mensaje
          </span>
        )}
      </div>

      {/* Status dropdown — stop propagation so row click doesn't fire */}
      <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <LeadStatusDropdown
          leadId={lead.id}
          currentStatus={lead.status}
          onStatusUpdated={(newStatus) => onStatusUpdate?.(lead.id, newStatus)}
        />
      </div>

      {/* Time + source */}
      <div style={{ flexShrink: 0, textAlign: "right", minWidth: 90 }}>
        <p
          style={{ margin: 0, fontSize: 12, color: "var(--ps-text-secondary)" }}
        >
          {timeAgo}
        </p>
        <span
          style={{
            display: "inline-block",
            marginTop: 3,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--ps-text-tertiary)",
            background: "rgba(138,155,191,0.08)",
            padding: "1px 6px",
            borderRadius: 4,
          }}
        >
          {sourceLabel}
        </span>
      </div>

      {/* Extra actions slot */}
      {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}
