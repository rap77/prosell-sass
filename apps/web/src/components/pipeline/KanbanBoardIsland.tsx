"use client";

import dynamic from "next/dynamic";

const KanbanBoard = dynamic(
  () => import("@/components/pipeline/KanbanBoard").then((m) => m.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center h-[200px] text-sm"
        style={{
          color: "var(--ps-text-secondary)",
        }}
      >
        Cargando pipeline...
      </div>
    ),
  },
);

export function KanbanBoardIsland() {
  return <KanbanBoard />;
}
