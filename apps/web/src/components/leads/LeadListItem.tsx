"use client";

/**
 * LeadListItem — ProSell-styled single lead row with swipe-to-reveal actions.
 *
 * - Left cyan border accent for unread leads (< 5 min)
 * - Gradient avatar with buyer initials
 * - Buyer name + email + phone stacked
 * - Vehicle title + year/make/model
 * - Message preview (1 line)
 * - LeadStatusDropdown (in-place quick update)
 * - Time ago + source chip
 * - Swipe left to reveal edit/delete actions (mobile-first)
 * All colors via var(--ps-*) — dark/light automatic.
 */

import type { ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";
import type { Lead, LeadStatus } from "@/lib/api/leads";
import { LeadStatusDropdown } from "./LeadStatusDropdown";
import { Mail, Phone, MessageSquare, Car, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeadListItemProps {
  lead: Lead;
  onStatusUpdate?: (leadId: string, newStatus: LeadStatus) => void;
  isUnread?: boolean;
  actions?: ReactNode;
  onEdit?: (leadId: string) => void;
  onDelete?: (leadId: string) => void;
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
  onEdit,
  onDelete,
}: LeadListItemProps) {
  const timeAgo = formatDistanceToNow(new Date(lead.created_at), {
    addSuffix: true,
    locale: es,
  });
  const sourceLabel = SOURCE_LABELS[lead.source?.toLowerCase()] ?? lead.source;

  return (
    <div
      data-testid="lead-item"
      className="relative overflow-hidden border-b"
      style={{
        borderLeft: isUnread
          ? "3px solid var(--ps-cyan)"
          : "3px solid transparent",
        borderBottomColor: "var(--ps-table-divider)",
      }}
    >
      {/* Action buttons (revealed on swipe) */}
      {(onEdit || onDelete) && (
        <div
          data-testid="swipe-actions"
          className="absolute right-0 top-0 h-full flex items-center gap-2 px-3"
          style={{
            background: "var(--ps-bg-elevated)",
          }}
        >
          {onEdit && (
            <Button
              size="touch-icon"
              variant="ghost"
              data-testid="action-edit"
              aria-label="Editar lead"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(lead.id);
              }}
              style={{ color: "var(--ps-cyan)" }}
            >
              <Edit2 className="h-5 w-5" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="touch-icon"
              variant="ghost"
              data-testid="action-delete"
              aria-label="Eliminar lead"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(lead.id);
              }}
              style={{ color: "var(--ps-error)" }}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}

      {/* Swipeable content */}
      <motion.div
        data-testid="swipe-container"
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors duration-150"
        style={{
          background: isUnread ? "rgba(77,184,255,0.03)" : "transparent",
        }}
        onTouchStart={(e) => {
          // Active state for touch devices
          e.currentTarget.style.background = "var(--ps-table-row-hover)";
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.background = isUnread
            ? "rgba(77,184,255,0.03)"
            : "transparent";
        }}
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold tracking-tight"
          style={{
            background:
              "linear-gradient(135deg, var(--ps-cyan), var(--ps-blue))",
            color: "var(--ps-bg-base)",
          }}
        >
          {getInitials(lead.buyer_name)}
        </div>

        {/* Buyer info */}
        <div className="flex-shrink-0 w-[180px] min-w-0">
          <p
            className="m-0 text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ color: "var(--ps-text-primary)" }}
          >
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
            <p
              className="mt-0.5 text-xs flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap"
              style={{ color: "var(--ps-text-secondary)" }}
            >
              <Mail size={10} strokeWidth={2} className="flex-shrink-0" />
              {lead.buyer_email}
            </p>
          )}
          {lead.buyer_phone && (
            <p
              className="mt-0.5 text-xs flex items-center gap-1"
              style={{ color: "var(--ps-text-secondary)" }}
            >
              <Phone size={10} strokeWidth={2} className="flex-shrink-0" />
              {lead.buyer_phone}
            </p>
          )}
        </div>

        {/* Vehicle */}
        <div className="flex-shrink-0 w-[170px] min-w-0">
          {lead.product ? (
            <>
              <p
                className="m-0 text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ color: "var(--ps-text-primary)" }}
              >
                {lead.product.title}
              </p>
              <p
                className="mt-0.5 text-xs flex items-center gap-1"
                style={{ color: "var(--ps-text-secondary)" }}
              >
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
            <span
              className="text-xs italic"
              style={{ color: "var(--ps-text-tertiary)" }}
            >
              Sin vehículo
            </span>
          )}
        </div>

        {/* Message preview */}
        <div className="flex-1 min-w-0">
          {lead.message ? (
            <p
              className="m-0 text-xs overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-1"
              style={{ color: "var(--ps-text-secondary)" }}
            >
              <MessageSquare
                size={11}
                strokeWidth={2}
                className="flex-shrink-0"
                style={{ color: "var(--ps-text-tertiary)" }}
              />
              {lead.message}
            </p>
          ) : (
            <span
              className="text-xs italic"
              style={{ color: "var(--ps-text-tertiary)" }}
            >
              Sin mensaje
            </span>
          )}
        </div>

        {/* Status dropdown — stop propagation so row click doesn't fire */}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <LeadStatusDropdown
            leadId={lead.id}
            currentStatus={lead.status}
            onStatusUpdated={(newStatus) =>
              onStatusUpdate?.(lead.id, newStatus)
            }
          />
        </div>

        {/* Time + source */}
        <div className="flex-shrink-0 text-right min-w-[90px]">
          <p
            className="m-0 text-xs"
            style={{ color: "var(--ps-text-secondary)" }}
          >
            {timeAgo}
          </p>
          <span
            className="inline-block mt-1 text-[10px] font-semibold tracking-widest uppercase"
            style={{
              background: "rgba(138,155,191,0.08)",
              padding: "1px 6px",
              borderRadius: 4,
              color: "var(--ps-text-tertiary)",
            }}
          >
            {sourceLabel}
          </span>
        </div>

        {/* Extra actions slot */}
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </motion.div>
    </div>
  );
}
