"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Car, Clock, User, XCircle } from "lucide-react";
import { toast } from "sonner";
import { LeadStatus, type Lead } from "@/lib/api/leads";
import { Button } from "@/components/ui/button";

interface LeadCardProps {
  lead: Lead;
}

export function LeadCard({ lead }: LeadCardProps) {
  const queryClient = useQueryClient();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const markLost = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/leads/${lead.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: LeadStatus.LOST }),
      });
      if (!res.ok) throw new Error("Failed to mark lead as lost");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead marcado como perdido");
    },
    onError: () => {
      toast.error("No se pudo actualizar el lead");
    },
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

      {/* Footer: time in stage + vendedor + lost action */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{timeInStage}</span>
        </div>
        <div className="flex items-center gap-1">
          {lead.vendedor_id && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
              <User className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
          {/* Stop drag propagation so the button click doesn't trigger a drag */}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-destructive"
            title="Marcar como perdido"
            disabled={markLost.isPending}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              markLost.mutate();
            }}
          >
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
