import { useState } from "react";
import type {
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
} from "@tanstack/react-table";

export function useDataGrid() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  return {
    sorting,
    setSorting,
    globalFilter,
    setGlobalFilter,
    rowSelection,
    setRowSelection,
    columnFilters,
    setColumnFilters,
  };
}
