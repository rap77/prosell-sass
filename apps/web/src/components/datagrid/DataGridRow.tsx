import { memo } from "react";
import { flexRender } from "@tanstack/react-table";

interface DataGridRowProps {
  row: {
    id: string;
    getVisibleCells: () => Array<{
      id: string;
      column: {
        columnDef: {
          cell: unknown;
        };
      };
      getContext: () => unknown;
    }>;
  };
}

export const DataGridRow = memo(({ row }: DataGridRowProps) => {
  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors">
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className="px-4 py-3 text-sm"
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
});

DataGridRow.displayName = "DataGridRow";
