"use client";

import { useRef, useMemo, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "./StatusBadge";
import { ActionMenu } from "./ActionMenu";

export interface Vehicle {
  id: string;
  title: string;
  price: number;
  status: "published" | "pending" | "failed" | "draft" | "expired" | "online" | "sold";
  photo_url?: string;
  year?: number;
  make?: string;
  model?: string;
}

interface DataGridProps {
  data: Vehicle[];
  onPublish?: (vehicleId: string) => void;
  onEdit?: (vehicleId: string) => void;
  onDelete?: (vehicleId: string) => void;
}

export function DataGrid({
  data = [],
  onPublish = () => {},
  onEdit = () => {},
  onDelete = () => {},
}: DataGridProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Stable columns definition (prevent re-renders)
  const columns: ColumnDef<Vehicle>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Select row ${row.id}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "photo_url",
        header: "Photo",
        cell: ({ getValue }) => {
          const photoUrl = getValue() as string | undefined;
          return photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="w-15 h-15 rounded-md object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-15 h-15 rounded-md bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No photo</span>
            </div>
          );
        },
      },
      {
        accessorKey: "title",
        header: "Vehicle",
        cell: (info) => <span className="font-medium">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: (info) => {
          const price = info.getValue() as number;
          return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(price);
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue() as Vehicle["status"]} />,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <ActionMenu
            vehicleId={row.original.id}
            vehicleTitle={row.original.title}
            onPublish={() => onPublish(row.original.id)}
            onEdit={() => onEdit(row.original.id)}
            onDelete={() => onDelete(row.original.id)}
          />
        ),
      },
    ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Row virtualization for 60fps performance
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 60, // Row height in px
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  // Development warning if virtualization is not working
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const rows = document.querySelectorAll('[data-row-id]');
      if (rows.length > 100) {
        console.warn(
          `⚠️ Rendering ${rows.length} rows - should be ~40 (virtualization not working)`
        );
      }
    }
  }, []);

  return (
    <div className="w-full border border-border rounded-lg overflow-hidden">
      <div
        ref={tableContainerRef}
        className="h-[600px] overflow-auto"
      >
        <table className="w-full border-collapse">
          <thead className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-medium text-foreground border-b border-border"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {virtualRows.map((virtualRow) => {
              const row = table.getRowModel().rows[virtualRow.index];
              return (
                <tr
                  key={row.id}
                  data-row-id={row.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
