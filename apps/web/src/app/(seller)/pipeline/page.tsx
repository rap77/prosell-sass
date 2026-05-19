import { KanbanBoard } from "@/components/pipeline/KanbanBoard";

export default function PipelinePage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Vista kanban del ciclo de ventas. Arrastrá los leads entre columnas para actualizar su estado.
        </p>
      </div>
      <KanbanBoard />
    </div>
  );
}
