"use client";

import { useDroppable } from "@dnd-kit/core";
import { type Lead, type LeadStatus } from "@/lib/api/leads";
import { LeadCard } from "./LeadCard";

const COLUMN_LABELS: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  appointment_set: "Cita agendada",
};

const COLUMN_COLORS: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-amber-500",
  qualified: "bg-violet-500",
  appointment_set: "bg-emerald-500",
};

interface KanbanColumnProps {
  status: LeadStatus;
  leads: Lead[];
}

export function KanbanColumn({ status, leads }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  // Group totals by currency to avoid summing across incompatible currencies
  const totalsByCurrency = leads.reduce<Record<string, number>>((acc, lead) => {
    if (lead.product?.price_cents && lead.product.currency) {
      acc[lead.product.currency] = (acc[lead.product.currency] ?? 0) + lead.product.price_cents;
    }
    return acc;
  }, {});

  const hasPrices = Object.keys(totalsByCurrency).length > 0;

  const dotColor = COLUMN_COLORS[status] ?? "bg-muted";

  return (
    <div className="flex min-w-[260px] flex-col rounded-xl bg-muted/40 md:min-w-0 md:flex-1">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        <span className="text-sm font-semibold">
          {COLUMN_LABELS[status] ?? status}
        </span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {leads.length}
        </span>
      </div>
      {hasPrices && (
        <div className="px-3 pb-1 flex flex-wrap gap-x-2">
          {Object.entries(totalsByCurrency).map(([currency, cents]) => (
            <p key={currency} className="text-xs text-muted-foreground">
              {new Intl.NumberFormat("es-AR", {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
              }).format(cents / 100)}
            </p>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors ${
          isOver ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""
        }`}
        style={{ minHeight: "200px" }}
      >
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
        {leads.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
            Sin leads
          </div>
        )}
      </div>
    </div>
  );
}
