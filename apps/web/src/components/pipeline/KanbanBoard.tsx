"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { useLeads, useUpdateLeadStatus, LeadStatus, type Lead } from "@/lib/api/leads";
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
  const [pendingUpdate, setPendingUpdate] = useState<{ leadId: string; status: LeadStatus } | null>(null);

  const { data: leads = [], isLoading } = useLeads(
    vendedorFilter ? { vendedor_id: vendedorFilter } : undefined,
    200
  );

  const updateStatus = useUpdateLeadStatus(pendingUpdate?.leadId ?? "");

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

  // Unique vendedores for selector
  const vendedorOptions = useMemo(() => {
    const ids = new Set(leads.map((l) => l.vendedor_id).filter(Boolean) as string[]);
    return Array.from(ids);
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: { active: { data: { current?: { lead?: Lead } } } }) {
    const lead = event.active.data.current?.lead;
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

    setPendingUpdate({ leadId: lead.id, status: targetStatus });
    updateStatus.mutate(
      { status: targetStatus },
      {
        onError: () => {
          toast.error("No se pudo actualizar el estado del lead");
        },
        onSettled: () => {
          setPendingUpdate(null);
        },
      }
    );
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
          {vendedorOptions.map((id) => (
            <option key={id} value={id}>
              {id.slice(0, 8)}...
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
