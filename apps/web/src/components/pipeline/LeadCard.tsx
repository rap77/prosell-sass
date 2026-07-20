"use client";

/**
 * LeadCard — ProSell-styled draggable kanban card.
 *
 * Displays lead summary inside a kanban column.
 * Uses var(--ps-*) tokens — drag ghost via DragOverlay keeps same styles.
 *
 * Interactions:
 *   - Drag to move between columns (dnd-kit PointerSensor, distance: 8px)
 *   - "Marcar como perdido" button (onPointerDown stops drag propagation)
 */

import { useDraggable } from "@dnd-kit/core";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Car, Clock, User, XCircle } from "lucide-react";
import { LeadStatus, useUpdateLeadStatus, type Lead } from "@/lib/api/leads";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  lead: Lead;
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export function LeadCard({ lead }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const markLost = useUpdateLeadStatus(lead.id);

  const vehicleLabel = lead.product
    ? [
        lead.product.attributes.year,
        lead.product.attributes.make,
        lead.product.attributes.model,
      ]
        .filter(Boolean)
        .join(" ") || lead.product.title
    : null;

  const timeInStage = formatDistanceToNow(new Date(lead.updated_at), {
    addSuffix: false,
    locale: es,
  });

  const priceLabel = lead.product
    ? new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: lead.product.currency,
        maximumFractionDigits: 0,
      }).format(lead.product.price_cents / 100)
    : null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-ps-elevated border border-ps-border-default rounded-[10px] py-2.5 px-3 cursor-grab select-none",
        isDragging
          ? "opacity-0 shadow-none transition-none"
          : "opacity-100 shadow-[0_1px_4px_rgba(6,13,36,0.25)] transition-[opacity,box-shadow,border-color] duration-150",
      )}
      onMouseEnter={(e) => {
        if (!isDragging)
          e.currentTarget.style.borderColor = "var(--ps-border-medium)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--ps-border-default)";
      }}
      {...listeners}
      {...attributes}
    >
      {/* Buyer row: avatar + name */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-[26px] h-[26px] rounded-full shrink-0 bg-gradient-to-br from-ps-cyan to-ps-blue flex items-center justify-center text-[10px] font-bold text-ps-base">
          {getInitials(lead.buyer_name)}
        </div>
        <p className="m-0 text-[13px] font-semibold text-ps-text-primary overflow-hidden text-ellipsis whitespace-nowrap flex-1">
          {lead.buyer_name}
        </p>
      </div>

      {/* Vehicle */}
      {vehicleLabel && (
        <div className="flex items-center gap-[5px] mb-[3px]">
          <Car
            size={11}
            strokeWidth={2}
            className="text-ps-tertiary shrink-0"
          />
          <span className="text-[11px] text-ps-text-secondary overflow-hidden text-ellipsis whitespace-nowrap">
            {vehicleLabel}
          </span>
        </div>
      )}

      {/* Price */}
      {priceLabel && (
        <p className="m-0 mt-[2px] text-[13px] font-bold text-ps-cyan tracking-[-0.01em]">
          {priceLabel}
        </p>
      )}

      {/* Footer: time in stage + vendedor avatar + mark-lost button */}
      <div className="mt-2.5 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          <Clock
            size={10}
            strokeWidth={2}
            className="text-ps-tertiary"
          />
          <span className="text-[10px] text-ps-tertiary">
            {timeInStage}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Vendedor avatar pill */}
          {lead.vendedor_id && (
            <div className="size-[18px] rounded-full bg-ps-surface border border-ps-border-default flex items-center justify-center">
              <User
                size={10}
                strokeWidth={2}
                className="text-ps-text-secondary"
              />
            </div>
          )}

          {/* Mark as lost — stops drag propagation so click fires cleanly */}
          <button
            type="button"
            title="Marcar como perdido"
            disabled={markLost.isPending}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              markLost.mutate({ new_status: LeadStatus.LOST });
            }}
            className={cn(
              "size-[22px] inline-flex items-center justify-center bg-transparent border-0 rounded-md text-ps-tertiary cursor-pointer transition-colors duration-150",
              markLost.isPending ? "opacity-50" : "opacity-100",
            )}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--ps-error)";
              e.currentTarget.style.background = "var(--ps-danger-hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--ps-text-tertiary)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <XCircle size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
