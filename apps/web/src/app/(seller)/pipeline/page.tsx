/**
 * PipelinePage — ProSell kanban pipeline.
 * Server Component: delegates to KanbanBoardIsland (client) which lazy-loads
 * KanbanBoard with ssr:false to avoid Turbopack @dnd-kit/core pnpm symlink issue.
 */

import { KanbanBoardIsland } from "@/components/pipeline/KanbanBoardIsland";

export default function PipelinePage() {
  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-text-primary leading-[1.2]">
            Pipeline
          </h1>
          <p className="m-0 mt-1 text-sm text-text-secondary">
            Vista kanban del ciclo de ventas. Arrastrá los leads entre columnas
            para actualizar su estado.
          </p>
        </div>
      </div>

      <KanbanBoardIsland />
    </div>
  );
}
