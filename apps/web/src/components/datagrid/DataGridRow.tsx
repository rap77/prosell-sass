import { memo } from "react";
import { flexRender, type Row } from "@tanstack/react-table";

interface DataGridRowProps<T> {
  row: Row<T>;
}

export function DataGridRow<T>({ row }: DataGridRowProps<T>) {
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
}

const MemoizedDataGridRowInner = memo(DataGridRow) as <T>(props: DataGridRowProps<T>) => React.ReactElement;
(MemoizedDataGridRowInner as any).displayName = "DataGridRow";
export const MemoizedDataGridRow = MemoizedDataGridRowInner;
