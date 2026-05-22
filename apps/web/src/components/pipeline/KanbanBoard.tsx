'use client'
/**
 * KanbanBoard — ProSell pipeline board.
 *
 * 4 droppable columns (New → Contacted → Qualified → Appointment Set).
 * Drag-and-drop via dnd-kit — only forward transitions allowed.
 * Vendedor filter shows only sellers who have leads in the current view.
 * All colors via var(--ps-*) tokens.
 */

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, ChevronDown } from 'lucide-react'
import { useLeads, LeadStatus, type Lead } from '@/lib/api/leads'
import { useVendedores } from '@/lib/api/vendedores'
import { KanbanColumn } from './KanbanColumn'
import { LeadCard } from './LeadCard'

// ─── Column order ─────────────────────────────────────────────────────────────

const KANBAN_COLUMNS: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.APPOINTMENT_SET,
]

// ─── Transition rules ─────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Partial<Record<LeadStatus, LeadStatus[]>> = {
  [LeadStatus.NEW]:             [LeadStatus.CONTACTED],
  [LeadStatus.CONTACTED]:       [LeadStatus.QUALIFIED],
  [LeadStatus.QUALIFIED]:       [LeadStatus.APPOINTMENT_SET],
  [LeadStatus.APPOINTMENT_SET]: [],
}

function isValidTransition(from: LeadStatus, to: LeadStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KanbanBoard() {
  const [vendedorFilter, setVendedorFilter] = useState('')
  const [activeLead, setActiveLead]         = useState<Lead | null>(null)
  const queryClient = useQueryClient()

  const { data: leads = [], isLoading } = useLeads(
    vendedorFilter ? { vendedor_id: vendedorFilter } : undefined,
    200
  )
  const { data: vendedores = [] } = useVendedores()

  const updateStatus = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: LeadStatus }) => {
      const res = await fetch(`/api/v1/leads/${leadId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update lead status')
      return res.json()
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['leads'] }),
    onError:   () => toast.error('No se pudo actualizar el estado del lead'),
  })

  // Group leads by status column
  const columnLeads = useMemo(
    () =>
      KANBAN_COLUMNS.reduce<Record<LeadStatus, Lead[]>>(
        (acc, status) => {
          acc[status] = leads.filter((l) => l.status === status)
          return acc
        },
        {} as Record<LeadStatus, Lead[]>
      ),
    [leads]
  )

  // Only show vendedores who have leads in the current board
  const activeVendedorIds = useMemo(
    () => new Set(leads.map((l) => l.vendedor_id).filter(Boolean) as string[]),
    [leads]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragStart(event: DragStartEvent) {
    const lead = event.active.data.current?.lead as Lead | undefined
    if (lead) setActiveLead(lead)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null)
    const { active, over } = event
    if (!over) return

    const lead = active.data.current?.lead as Lead | undefined
    if (!lead) return
    if (!KANBAN_COLUMNS.includes(over.id as LeadStatus)) return

    const targetStatus = over.id as LeadStatus
    if (lead.status === targetStatus) return

    if (!isValidTransition(lead.status, targetStatus)) {
      toast.error('Transición inválida', {
        description: `No podés mover directamente de "${lead.status}" a "${targetStatus}".`,
      })
      return
    }

    updateStatus.mutate({ leadId: lead.id, status: targetStatus })
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 64, color: 'var(--ps-text-secondary)' }}>
        <Loader2 size={18} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 14 }}>Cargando pipeline...</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Vendedor filter */}
      {vendedores.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label
            htmlFor="vendedor-select"
            style={{ fontSize: 13, fontWeight: 500, color: 'var(--ps-text-secondary)', whiteSpace: 'nowrap' }}
          >
            Filtrar por vendedor:
          </label>
          <div style={{ position: 'relative' }}>
            <select
              id="vendedor-select"
              value={vendedorFilter}
              onChange={(e) => setVendedorFilter(e.target.value)}
              style={{
                height: 34,
                paddingLeft: 12, paddingRight: 32,
                appearance: 'none',
                background: 'var(--ps-input-bg)',
                border: '1px solid var(--ps-input-border)',
                borderRadius: 8,
                color: 'var(--ps-text-primary)',
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">Todos los vendedores</option>
              {vendedores
                .filter((v) => activeVendedorIds.has(v.id))
                .map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
            </select>
            <ChevronDown
              size={14}
              strokeWidth={2}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--ps-text-secondary)', pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 8,
        }}>
          {KANBAN_COLUMNS.map((status) => (
            <KanbanColumn key={status} status={status} leads={columnLeads[status]} />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
