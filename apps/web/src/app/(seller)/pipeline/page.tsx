/**
 * PipelinePage — ProSell kanban pipeline.
 * Server Component: just renders the KanbanBoard client island.
 */

import { KanbanBoard } from '@/components/pipeline/KanbanBoard'

export default function PipelinePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ps-text-primary)', lineHeight: 1.2 }}>
            Pipeline
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
            Vista kanban del ciclo de ventas. Arrastrá los leads entre columnas para actualizar su estado.
          </p>
        </div>
      </div>

      {/* Kanban board */}
      <KanbanBoard />
    </div>
  )
}
