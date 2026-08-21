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
import { Building2, Send } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useProductImageUrls,
  useSubmitProductsForApproval,
} from "@/lib/api/products";
import { StatusBadge, type VehicleStatus } from "./StatusBadge";
import { ActionMenu } from "./ActionMenu";

/**
 * Renders a product thumbnail using a time-limited signed DO Spaces URL.
 *
 * DO Spaces is private (403 on direct URLs), so the raw key from the
 * vehicle row must be resolved through the backend signed-URL endpoint.
 * Cache is shared with the catalog card view via TanStack query keys.
 *
 * The backend /image-urls endpoint returns `images: [{ key, url }]`
 * where `key` is the storage key (path). The frontend product rows
 * sometimes carry a FULL public URL instead of a storage key
 * (legacy data written by the bulk-upload flow before the signing
 * migration). To support both shapes we first try a direct match, then
 * fall back to extracting the storage key from the public URL.
 */
function extractStorageKeyFromPublicUrl(value: string): string | null {
  if (!value || !value.includes("://")) return null;
  try {
    const path = new URL(value).pathname.replace(/^\//, "");
    const segments = path.split("/");
    if (segments.length < 2) return null;
    segments.shift(); // drop bucket
    return segments.join("/") || null;
  } catch {
    return null;
  }
}

function SignedPhotoCell({
  productId,
  rawKey,
}: {
  productId: string;
  rawKey?: string;
}) {
  const { data } = useProductImageUrls(rawKey ? productId : undefined);
  const signedUrl =
    rawKey && data
      ? (data.images.find((img) => img.key === rawKey)?.url ??
        data.images.find((img) => {
          const storageKey = extractStorageKeyFromPublicUrl(rawKey);
          return storageKey !== null && img.key === storageKey;
        })?.url)
      : undefined;

  if (!signedUrl) {
    return (
      <div className="w-15 h-15 rounded-md bg-muted flex items-center justify-center">
        <span className="text-xs text-muted-foreground">No photo</span>
      </div>
    );
  }

  return (
    <Image
      src={signedUrl}
      alt=""
      width={60}
      height={60}
      className="w-15 h-15 rounded-md object-cover"
      unoptimized
    />
  );
}

// ponytail: minimal type helper for TanStack meta
interface ColumnMeta {
  headerClassName?: string;
  cellClassName?: string;
}

// ponytail: type guard for GGA TypeScript strict compliance
function getColumnMeta(meta: unknown): ColumnMeta | undefined {
  if (!meta || typeof meta !== "object") {
    return undefined;
  }

  const obj = meta as Record<string, unknown>;

  // Validate shape: both fields optional, must be strings when present
  if (
    (obj.headerClassName !== undefined &&
      typeof obj.headerClassName !== "string") ||
    (obj.cellClassName !== undefined && typeof obj.cellClassName !== "string")
  ) {
    return undefined;
  }

  return {
    headerClassName: obj.headerClassName as string | undefined,
    cellClassName: obj.cellClassName as string | undefined,
  };
}

export interface ProductRow {
  id: string;
  title: string;
  price: number;
  // ponytail: the container (catalog/page.tsx) already maps
  // Product.status to VehicleStatus via transformProductToVehicle
  // before building rows, so this is display-ready — never re-map it.
  status: VehicleStatus;
  photo_url?: string;
  year?: number;
  make?: string;
  model?: string;
  branch_id?: string;
  branch_name?: string;
}

interface DataGridProps {
  data: ProductRow[];
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
  const submitProductsForApproval = useSubmitProductsForApproval();

  const stopRowNavigation = (
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  ) => {
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

  const handleRowKeyDown =
    (vehicleId: string) => (event: KeyboardEvent<HTMLTableRowElement>) => {
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
  const columns: ColumnDef<ProductRow>[] = [
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
      meta: {
        // ponytail: sticky first column for mobile horizontal scroll
        cellClassName: "sticky left-0 z-20 bg-background",
        headerClassName: "sticky left-0 z-20 bg-muted",
      },
    },
    {
      accessorKey: "photo_url",
      header: "Photo",
      cell: ({ row }) => (
        <SignedPhotoCell
          productId={row.original.id}
          rawKey={row.original.photo_url}
        />
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
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
      // Task 2b: Actions always visible on mobile (sticky right, no swipe needed)
      meta: {
        headerClassName: "sticky right-0 bg-background z-10",
        cellClassName: "sticky right-0 bg-background",
      },
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
  const selectedProductIds = Object.keys(rowSelection)
    .map((rowIndex) => {
      const index = parseInt(rowIndex, 10);
      return data[index]?.id;
    })
    .filter((productId): productId is string => productId !== undefined);

  const handleBulkAssign = () => {
    if (onBulkAssignBranch && selectedProductIds.length > 0) {
      onBulkAssignBranch(selectedProductIds);
    }
  };

  // Filter selected products that are eligible for submit (draft/failed).
  // "failed" is the display status for a rejected product — see the
  // ProductRow.status doc comment above.
  const eligibleProductIds = selectedProductIds.filter((id) => {
    const product = data.find((p) => p.id === id);
    return product?.status === "draft" || product?.status === "failed";
  });

  const handleBulkSubmit = () => {
    if (eligibleProductIds.length > 0) {
      submitProductsForApproval.mutate(eligibleProductIds);
      setRowSelection({}); // Clear selection after submit
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
  const paddingTop = virtualRows[0]?.start ?? 0;
  const paddingBottom =
    rowVirtualizer.getTotalSize() - (virtualRows.at(-1)?.end ?? 0);
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
              {selectedProductIds.length} product
              {selectedProductIds.length !== 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {eligibleProductIds.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBulkSubmit}
                disabled={submitProductsForApproval.isPending}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Enviar a revisión ({eligibleProductIds.length})
              </Button>
            )}
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
        data-testid="data-grid-scroll"
        className="surface-scrollbar h-[600px] overflow-auto overflow-x-auto touch-pan-x"
      >
        <table className="w-full border-collapse">
          <thead className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = getColumnMeta(header.column.columnDef.meta);
                  const headerClassName = meta?.headerClassName || "";

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-4 py-3 text-left text-sm font-medium text-foreground border-b border-border",
                        headerClassName,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr aria-hidden="true">
                <td colSpan={columns.length} style={{ height: paddingTop }} />
              </tr>
            )}
            {rowsToRender.map(({ key, row }) => (
              <tr
                key={key}
                data-row-id={row.id}
                data-testid="product-row"
                data-product-id={row.original.id}
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
                {row.getVisibleCells().map((cell) => {
                  const meta = getColumnMeta(cell.column.columnDef.meta);
                  const cellClassName = meta?.cellClassName || "";

                  return (
                    <td
                      key={cell.id}
                      className={cn("px-4 py-3 text-sm", cellClassName)}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {paddingBottom > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={columns.length}
                  style={{ height: paddingBottom }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
