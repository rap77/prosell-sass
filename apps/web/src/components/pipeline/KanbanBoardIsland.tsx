'use client'

import dynamic from 'next/dynamic'

const KanbanBoard = dynamic(
  () => import('@/components/pipeline/KanbanBoard').then((m) => m.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 200, color: 'var(--ps-text-secondary)', fontSize: 14,
      }}>
        Cargando pipeline...
      </div>
    ),
  }
)

export function KanbanBoardIsland() {
  return <KanbanBoard />
}
