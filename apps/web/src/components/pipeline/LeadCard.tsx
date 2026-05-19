"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Car, Clock, User } from "lucide-react";
import { type Lead } from "@/lib/api/leads";

interface LeadCardProps {
  lead: Lead;
}

export function LeadCard({ lead }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-lg border bg-background p-3 shadow-sm cursor-grab active:cursor-grabbing select-none transition-opacity ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
    >
      {/* Buyer name */}
      <p className="text-sm font-medium leading-tight line-clamp-1">{lead.buyer_name}</p>

      {/* Vehicle interest */}
      {vehicleLabel && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Car className="h-3 w-3 shrink-0" />
          <span className="line-clamp-1">{vehicleLabel}</span>
        </div>
      )}

      {/* Price */}
      {lead.product && (
        <p className="mt-0.5 text-xs font-medium text-primary">
          {new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: lead.product.currency,
            maximumFractionDigits: 0,
          }).format(lead.product.price_cents / 100)}
        </p>
      )}

      {/* Footer: time in stage + vendedor */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{timeInStage}</span>
        </div>
        {lead.vendedor_id && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
            <User className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
