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
 * Tailwind CSS 4 semantic classes.
 */

import type { ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";
import type { Lead, LeadStatus } from "@/lib/api/leads";
import { LeadStatusDropdown } from "./LeadStatusDropdown";
import { Mail, Phone, MessageSquare, Car, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      className={cn(
        "relative overflow-hidden border-b border-b-border border-l-[3px]",
        isUnread ? "border-l-ps-cyan" : "border-l-transparent",
      )}
    >
      {/* Action buttons (revealed on swipe) */}
      {(onEdit || onDelete) && (
        <div
          data-testid="swipe-actions"
          className="absolute right-0 top-0 h-full flex items-center gap-2 px-3 bg-muted"
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
              className="text-ps-cyan"
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
              className="text-ps-error"
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
        className={cn(
          "flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors duration-150 hover:bg-muted/50",
          isUnread ? "bg-ps-cyan/[0.03]" : "bg-transparent",
        )}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold tracking-tight bg-gradient-to-br from-ps-cyan to-ps-blue text-ps-base">
          {getInitials(lead.buyer_name)}
        </div>

        {/* Buyer info */}
        <div className="flex-shrink-0 w-[180px] min-w-0">
          <p className="m-0 text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-foreground">
            {lead.buyer_name}
            {isUnread && (
              <span className="inline-block w-1.5 h-1.5 rounded-full align-middle ml-1.5 bg-ps-cyan" />
            )}
          </p>
          {lead.buyer_email && (
            <p className="mt-0.5 text-xs flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground">
              <Mail size={10} strokeWidth={2} className="flex-shrink-0" />
              {lead.buyer_email}
            </p>
          )}
          {lead.buyer_phone && (
            <p className="mt-0.5 text-xs flex items-center gap-1 text-muted-foreground">
              <Phone size={10} strokeWidth={2} className="flex-shrink-0" />
              {lead.buyer_phone}
            </p>
          )}
        </div>

        {/* Vehicle */}
        <div className="flex-shrink-0 w-[170px] min-w-0">
          {lead.product ? (
            <>
              <p className="m-0 text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap text-foreground">
                {lead.product.title}
              </p>
              <p className="mt-0.5 text-xs flex items-center gap-1 text-muted-foreground">
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
            <span className="text-xs italic text-ps-tertiary">
              Sin vehículo
            </span>
          )}
        </div>

        {/* Message preview */}
        <div className="flex-1 min-w-0">
          {lead.message ? (
            <p className="m-0 text-xs overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-1 text-muted-foreground">
              <MessageSquare
                size={11}
                strokeWidth={2}
                className="flex-shrink-0 text-ps-tertiary"
              />
              {lead.message}
            </p>
          ) : (
            <span className="text-xs italic text-ps-tertiary">Sin mensaje</span>
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
          <p className="m-0 text-xs text-muted-foreground">{timeAgo}</p>
          <span className="inline-block mt-1 text-[10px] font-semibold tracking-widest uppercase bg-muted-foreground/10 px-1.5 py-0.5 rounded text-ps-tertiary">
            {sourceLabel}
          </span>
        </div>

        {/* Extra actions slot */}
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </motion.div>
    </div>
  );
}
