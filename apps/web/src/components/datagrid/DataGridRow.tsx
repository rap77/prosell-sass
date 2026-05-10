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

export const MemoizedDataGridRow = DataGridRow;
