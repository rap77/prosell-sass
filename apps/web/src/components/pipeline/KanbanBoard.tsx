"use client";
/**
 * KanbanBoard — ProSell pipeline board.
 *
 * 4 droppable columns (New → Contacted → Qualified → Appointment Set).
 * Drag-and-drop via dnd-kit — only forward transitions allowed.
 * Vendedor filter shows only sellers who have leads in the current view.
 * All colors via var(--ps-*) tokens.
 */

import { useState, useEffect, useRef } from "react";
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
import { Loader2, ChevronDown } from "lucide-react";
import { useLeads, LeadStatus, type Lead } from "@/lib/api/leads";
import { useVendedores } from "@/lib/api/vendedores";
import { KanbanColumn } from "./KanbanColumn";
import { LeadCard } from "./LeadCard";

// ─── Column order ─────────────────────────────────────────────────────────────

const KANBAN_COLUMNS: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.APPOINTMENT_SET,
];

// ─── Transition rules ─────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Partial<Record<LeadStatus, LeadStatus[]>> = {
  [LeadStatus.NEW]: [LeadStatus.CONTACTED],
  [LeadStatus.CONTACTED]: [LeadStatus.QUALIFIED],
  [LeadStatus.QUALIFIED]: [LeadStatus.APPOINTMENT_SET],
  [LeadStatus.APPOINTMENT_SET]: [],
};

function isValidTransition(from: LeadStatus, to: LeadStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

// Type guards — safer than type assertions
function isLeadStatus(value: unknown): value is LeadStatus {
  return (
    typeof value === "string" && KANBAN_COLUMNS.includes(value as LeadStatus)
  );
}

function isLead(value: unknown): value is Lead {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "status" in value
  );
}

const COLUMN_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: "Nuevo",
  [LeadStatus.CONTACTED]: "Contactado",
  [LeadStatus.QUALIFIED]: "Calificado",
  [LeadStatus.APPOINTMENT_SET]: "Cita agendada",
  [LeadStatus.LOST]: "Perdido",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function KanbanBoard() {
  const [vendedorFilter, setVendedorFilter] = useState("");
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const queryClient = useQueryClient();

  const pendingMutations = useRef<
    Map<
      string,
      {
        fromStatus: LeadStatus;
        toStatus: LeadStatus;
        toastId: string | number;
      }
    >
  >(new Map());

  // On unmount, dismiss pending toasts — onDismiss commits the mutations
  useEffect(() => {
    const pending = pendingMutations.current;
    return () => {
      pending.forEach(({ toastId }) => toast.dismiss(toastId));
    };
  }, []);

  // Cap at 100 to stay within ListLeadsRequest DTO limit (le=100)
  const { data: leadsFromServer = [], isLoading } = useLeads(
    vendedorFilter ? { vendedor_id: vendedorFilter } : undefined,
    100,
  );
  const { data: vendedores = [] } = useVendedores();

  // Local mirror — source of truth for the board UI.
  // Sync server data to local state - updates when server data changes after mutations
  const [localLeads, setLocalLeads] = useState<Lead[]>(leadsFromServer);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync from server after mutations
    setLocalLeads(leadsFromServer);
  }, [leadsFromServer]);

  const updateStatus = useMutation({
    mutationFn: async ({
      leadId,
      status,
    }: {
      leadId: string;
      status: LeadStatus;
    }) => {
      const res = await fetch(`/api/v1/leads/${leadId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ new_status: status }),
      });
      if (!res.ok) throw new Error("Failed to update lead status");
      return res.json();
    },
    onSettled: () =>
      void queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  // Group leads by status column — from local state, not from query cache
  // ponytail: React 19 compiler handles memoization automatically
  const columnLeads = KANBAN_COLUMNS.reduce<Record<LeadStatus, Lead[]>>(
    (acc, status) => {
      acc[status] = localLeads.filter((l) => l.status === status);
      return acc;
    },
    Object.fromEntries(KANBAN_COLUMNS.map((status) => [status, []])) as Record<
      LeadStatus,
      Lead[]
    >,
  );

  // Only show vendedores who have leads in the current board
  // ponytail: React 19 compiler handles memoization automatically
  const activeVendedorIds = new Set(
    localLeads
      .map((l) => l.vendedor_id)
      .filter((id): id is string => Boolean(id)),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    const leadCandidate = event.active.data.current?.lead;
    if (isLead(leadCandidate)) setActiveLead(leadCandidate);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      setActiveLead(null);
      return;
    }

    const leadCandidate = active.data.current?.lead;
    if (!isLead(leadCandidate)) {
      setActiveLead(null);
      return;
    }
    const lead = leadCandidate;

    if (!isLeadStatus(over.id)) {
      setActiveLead(null);
      return;
    }

    const targetStatus = over.id;
    if (lead.status === targetStatus) {
      setActiveLead(null);
      return;
    }

    if (!isValidTransition(lead.status, targetStatus)) {
      setActiveLead(null);
      toast.error("Transición inválida", {
        description: `No podés mover de "${COLUMN_LABELS[lead.status]}" a "${COLUMN_LABELS[targetStatus]}".`,
      });
      return;
    }

    // If this lead already has a pending mutation, ignore the new drag
    if (pendingMutations.current.has(lead.id)) {
      setActiveLead(null);
      return;
    }

    const fromStatus = lead.status;
    const toStatus = targetStatus;

    // Optimistic update + clear overlay — single React batch, zero flash
    setLocalLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, status: toStatus } : l)),
    );
    setActiveLead(null);

    // Called by onAutoClose (5s timeout) and onDismiss (manual close / unmount)
    const commitMutation = () => {
      if (!pendingMutations.current.has(lead.id)) return;
      pendingMutations.current.delete(lead.id);
      updateStatus.mutate(
        { leadId: lead.id, status: toStatus },
        {
          onError: () => {
            setLocalLeads((prev) =>
              prev.map((l) =>
                l.id === lead.id ? { ...l, status: fromStatus } : l,
              ),
            );
            toast.error("No se pudo actualizar el estado del lead");
          },
        },
      );
    };

    const toastId = toast(`Lead movido a "${COLUMN_LABELS[toStatus]}"`, {
      duration: 5000,
      action: {
        label: "Deshacer",
        onClick: () => {
          pendingMutations.current.delete(lead.id);
          setLocalLeads((prev) =>
            prev.map((l) =>
              l.id === lead.id ? { ...l, status: fromStatus } : l,
            ),
          );
        },
      },
      onAutoClose: commitMutation,
      onDismiss: commitMutation,
    });

    pendingMutations.current.set(lead.id, { fromStatus, toStatus, toastId });
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2.5 p-16 text-ps-text-secondary">
        <Loader2
          size={18}
          strokeWidth={2}
          style={{ animation: "spin 0.8s linear infinite" }}
        />
        <span className="text-sm">Cargando pipeline...</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Vendedor filter */}
      {vendedores.length > 0 && (
        <div className="flex items-center gap-2.5">
          <label
            htmlFor="vendedor-select"
            className="text-xs font-medium text-ps-text-secondary whitespace-nowrap"
          >
            Filtrar por vendedor:
          </label>
          <div className="relative">
            <select
              id="vendedor-select"
              value={vendedorFilter}
              onChange={(e) => setVendedorFilter(e.target.value)}
              className="h-8.5 pl-3 pr-8 appearance-none bg-ps-input-bg border border-ps-input-border rounded-lg text-ps-text-primary text-xs outline-none cursor-pointer"
              style={{
                background: "var(--ps-input-bg)",
                borderColor: "var(--ps-input-border)",
                color: "var(--ps-text-primary)",
              }}
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
            <ChevronDown
              size={14}
              strokeWidth={2}
              className="absolute right-2.5 top-1/2 text-ps-text-secondary pointer-events-none"
              style={{
                transform: "translateY(-50%)",
              }}
            />
          </div>
        </div>
      )}

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-3 overflow-x-auto pb-2">
          {KANBAN_COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              leads={columnLeads[status]}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
