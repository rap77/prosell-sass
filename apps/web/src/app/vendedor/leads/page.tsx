'use client'

/**
 * VendedorLeadsPage — ProSell Leads Inbox.
 * Lists all leads assigned to the current seller with
 * search, status filter pills, pagination and real-time polling.
 */

import { useRouter } from 'next/navigation'
import { LeadList } from '@/components/leads'
import { Plus } from 'lucide-react'

export default function VendedorLeadsPage() {
  const router = useRouter()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ps-text-primary)', lineHeight: 1.2 }}>
            Leads
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
            Gestioná tus prospectos y seguí su estado en el pipeline.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/pipeline')}
          style={{
            height: 36, padding: '0 14px',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--ps-cyan)', color: 'var(--ps-bg-base)',
            border: 0, borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Ver pipeline
        </button>
      </div>

      {/* Lead list with filters + table */}
      <LeadList onLeadClick={(id) => router.push(`/vendedor/leads/${id}`)} />
    </div>
  )
}
