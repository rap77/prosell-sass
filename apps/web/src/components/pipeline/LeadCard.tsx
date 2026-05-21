'use client'

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

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Car, Clock, User, XCircle } from 'lucide-react'
import { LeadStatus, useUpdateLeadStatus, type Lead } from '@/lib/api/leads'

interface LeadCardProps {
  lead: Lead
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

export function LeadCard({ lead }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  })

  const markLost = useUpdateLeadStatus(lead.id)

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const vehicleLabel = lead.product
    ? (
        [lead.product.attributes.year, lead.product.attributes.make, lead.product.attributes.model]
          .filter(Boolean)
          .join(' ')
      ) || lead.product.title
    : null

  const timeInStage = formatDistanceToNow(new Date(lead.updated_at), { addSuffix: false, locale: es })

  const priceLabel = lead.product
    ? new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: lead.product.currency,
        maximumFractionDigits: 0,
      }).format(lead.product.price_cents / 100)
    : null

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'var(--ps-bg-elevated)',
        border: '1px solid var(--ps-border-default)',
        borderRadius: 10,
        padding: '10px 12px',
        cursor: 'grab',
        userSelect: 'none',
        opacity: isDragging ? 0.35 : 1,
        boxShadow: isDragging ? 'none' : '0 1px 4px rgba(6,13,36,0.25)',
        transition: 'opacity 150ms, box-shadow 150ms, border-color 150ms',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) e.currentTarget.style.borderColor = 'var(--ps-border-medium)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--ps-border-default)'
      }}
      {...listeners}
      {...attributes}
    >
      {/* Buyer row: avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--ps-cyan), var(--ps-blue))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: 'var(--ps-bg-base)',
        }}>
          {getInitials(lead.buyer_name)}
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ps-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {lead.buyer_name}
        </p>
      </div>

      {/* Vehicle */}
      {vehicleLabel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
          <Car size={11} strokeWidth={2} style={{ color: 'var(--ps-text-disabled)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--ps-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {vehicleLabel}
          </span>
        </div>
      )}

      {/* Price */}
      {priceLabel && (
        <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--ps-cyan)', letterSpacing: '-0.01em' }}>
          {priceLabel}
        </p>
      )}

      {/* Footer: time in stage + vendedor avatar + mark-lost button */}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={10} strokeWidth={2} style={{ color: 'var(--ps-text-disabled)' }} />
          <span style={{ fontSize: 10, color: 'var(--ps-text-disabled)' }}>{timeInStage}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Vendedor avatar pill */}
          {lead.vendedor_id && (
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'var(--ps-bg-surface)',
              border: '1px solid var(--ps-border-default)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={10} strokeWidth={2} style={{ color: 'var(--ps-text-secondary)' }} />
            </div>
          )}

          {/* Mark as lost — stops drag propagation so click fires cleanly */}
          <button
            type="button"
            title="Marcar como perdido"
            disabled={markLost.isPending}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              markLost.mutate({ status: LeadStatus.LOST })
            }}
            style={{
              width: 22, height: 22,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent',
              border: 0, borderRadius: 6,
              color: 'var(--ps-text-disabled)',
              cursor: 'pointer',
              transition: 'color 150ms, background 150ms',
              opacity: markLost.isPending ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--ps-error)'
              e.currentTarget.style.background = 'var(--ps-danger-hover-bg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--ps-text-disabled)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <XCircle size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
