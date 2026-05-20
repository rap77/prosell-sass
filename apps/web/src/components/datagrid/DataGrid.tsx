"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type RowSelectionState,
  flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Building2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  branch_id?: string;
  branch_name?: string;
}

interface DataGridProps {
  data: Vehicle[];
  onPublish?: (vehicleId: string) => void;
  onEdit?: (vehicleId: string) => void;
  onDelete?: (vehicleId: string) => void;
  onBulkAssignBranch?: (productIds: string[]) => void;
  onRowClick?: (vehicleId: string) => void;
}

export function DataGrid({
  data = [],
  onPublish = () => {},
  onEdit = () => {},
  onDelete = () => {},
  onBulkAssignBranch,
  onRowClick,
}: DataGridProps) {
  "use no memo"; // TanStack Table API is incompatible with React Compiler auto-memoization
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const stopRowNavigation = (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const handleRowClick = (vehicleId: string) => {
    if (!onRowClick) {
      return undefined;
    }

    return () => {
      onRowClick(vehicleId);
    };
  };

  const handleRowKeyDown = (vehicleId: string) => (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (!onRowClick) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onRowClick(vehicleId);
  };

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
          <div onClick={stopRowNavigation} onKeyDown={stopRowNavigation}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={`Select row ${row.id}`}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "photo_url",
        header: "Photo",
        cell: ({ row }) => {
          const photoUrl = row.original.photo_url;
          return photoUrl ? (
            <Image
              src={photoUrl}
              alt=""
              width={60}
              height={60}
              className="w-15 h-15 rounded-md object-cover"
              unoptimized
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
        cell: ({ row }) => (
          <span className="font-medium">{row.original.title}</span>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => {
          const price = row.original.price;
          return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(price);
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "branch_name",
        header: "Branch",
        cell: ({ row }) => {
          const branchName = row.original.branch_name;
          return branchName ? (
            <span className="text-sm">{branchName}</span>
          ) : (
            <span className="text-sm text-muted-foreground">Unassigned</span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div onClick={stopRowNavigation} onKeyDown={stopRowNavigation}>
            <ActionMenu
              vehicleId={row.original.id}
              vehicleTitle={row.original.title}
              onPublish={() => onPublish(row.original.id)}
              onEdit={() => onEdit(row.original.id)}
              onDelete={() => onDelete(row.original.id)}
            />
          </div>
        ),
      },
    ];

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 is incompatible with React Compiler by design; "use no memo" is already applied
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
  });

  // Get selected vehicle IDs
  const selectedProductIds = Object.keys(rowSelection).map((rowIndex) => {
      const index = parseInt(rowIndex, 10);
      return data[index]?.id;
    }).filter((productId): productId is string => productId !== undefined);

  const handleBulkAssign = () => {
    if (onBulkAssignBranch && selectedProductIds.length > 0) {
      onBulkAssignBranch(selectedProductIds);
    }
  };

  // Row virtualization for 60fps performance
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 60, // Row height in px
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const rowsToRender =
    virtualRows.length > 0
      ? virtualRows.map((virtualRow) => ({
          key: virtualRow.key,
          row: table.getRowModel().rows[virtualRow.index],
        }))
      : table.getRowModel().rows.map((row) => ({
          key: row.id,
          row,
        }));

  return (
    <div className="w-full border border-border rounded-lg overflow-hidden">
      {/* Bulk actions toolbar */}
      {selectedProductIds.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedProductIds.length} product{selectedProductIds.length !== 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onBulkAssignBranch && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBulkAssign}
                className="flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                Assign to Branch
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRowSelection({})}
            >
              Clear selection
            </Button>
          </div>
        </div>
      )}

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
            {rowsToRender.map(({ key, row }) => (
                <tr
                  key={key}
                  data-row-id={row.id}
                  data-testid="vehicle-row"
                  data-vehicle-id={row.original.id}
                  className={cn(
                    "border-b border-border transition-colors",
                    onRowClick
                      ? "cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      : "hover:bg-muted/50",
                  )}
                  onClick={handleRowClick(row.original.id)}
                  onKeyDown={handleRowKeyDown(row.original.id)}
                  tabIndex={onRowClick ? 0 : undefined}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
