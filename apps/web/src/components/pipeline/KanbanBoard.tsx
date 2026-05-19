"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLeads, LeadStatus, type Lead } from "@/lib/api/leads";
import { useVendedores } from "@/lib/api/vendedores";
import { KanbanColumn } from "./KanbanColumn";
import { LeadCard } from "./LeadCard";

const KANBAN_COLUMNS: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.APPOINTMENT_SET,
];

// Valid forward transitions in the kanban
const VALID_KANBAN_TRANSITIONS: Partial<Record<LeadStatus, LeadStatus[]>> = {
  [LeadStatus.NEW]: [LeadStatus.CONTACTED],
  [LeadStatus.CONTACTED]: [LeadStatus.QUALIFIED],
  [LeadStatus.QUALIFIED]: [LeadStatus.APPOINTMENT_SET],
  [LeadStatus.APPOINTMENT_SET]: [],
};

function isValidTransition(from: LeadStatus, to: LeadStatus): boolean {
  return (VALID_KANBAN_TRANSITIONS[from] ?? []).includes(to);
}

export function KanbanBoard() {
  const [vendedorFilter, setVendedorFilter] = useState<string>("");
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useLeads(
    vendedorFilter ? { vendedor_id: vendedorFilter } : undefined,
    200
  );
  const { data: vendedores = [] } = useVendedores();

  const updateStatus = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: LeadStatus }) => {
      const res = await fetch(`/api/v1/leads/${leadId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update lead status");
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: () => {
      toast.error("No se pudo actualizar el estado del lead");
    },
  });

  // Group leads by status
  const columnLeads = useMemo(
    () =>
      KANBAN_COLUMNS.reduce<Record<LeadStatus, Lead[]>>(
        (acc, status) => {
          acc[status] = leads.filter((l) => l.status === status);
          return acc;
        },
        {} as Record<LeadStatus, Lead[]>
      ),
    [leads]
  );

  // Vendedores with leads in the current board (for selector)
  const activeVendedorIds = useMemo(() => {
    return new Set(leads.map((l) => l.vendedor_id).filter(Boolean) as string[]);
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const lead = event.active.data.current?.lead as Lead | undefined;
    if (lead) setActiveLead(lead);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const lead = active.data.current?.lead as Lead | undefined;
    const targetStatus = over.id as LeadStatus;

    if (!lead || lead.status === targetStatus) return;

    if (!isValidTransition(lead.status, targetStatus)) {
      toast.error("Transición inválida", {
        description: `No podés mover un lead de "${lead.status}" a "${targetStatus}" directamente.`,
      });
      return;
    }

    updateStatus.mutate({ leadId: lead.id, status: targetStatus });
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Cargando pipeline...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Vendedor filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground" htmlFor="vendedor-select">
          Filtrar por vendedor:
        </label>
        <select
          id="vendedor-select"
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
          value={vendedorFilter}
          onChange={(e) => setVendedorFilter(e.target.value)}
        >
          <option value="">Todos los vendedores</option>
          {vendedores
            .filter((v) => activeVendedorIds.has(v.id))
            .map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
        </select>
      </div>

      {/* Kanban board — horizontal scroll on mobile, grid on desktop */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Mobile: vertical stack — Desktop: 4-column grid */}
        <div className="flex flex-col gap-4 md:grid md:grid-cols-4 md:gap-3 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((status) => (
            <KanbanColumn key={status} status={status} leads={columnLeads[status]} />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
