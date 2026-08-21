"use client";

import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { isVehicleProduct, type Product } from "@/types/product";

interface ReviewQueueTableProps {
  products: Product[];
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  /** Hide the checkbox column entirely for tabs with no bulk action. */
  selectable?: boolean;
}

// ponytail: local label map, same pattern as ProductAuditTrail.tsx —
// each surface that shows ProductStatus keeps its own small map rather
// than sharing one, since the values needed differ per surface.
const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  published: "Publicado",
  paused: "En mantenimiento",
  reserved: "Apartado",
  sold: "Vendido",
  rejected: "Rechazado",
  archived: "Archivado",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ps-border-default bg-ps-elevated px-2.5 py-[3px] text-xs font-medium text-ps-text-secondary">
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ponytail: click-to-expand instead of a hover tooltip — rejection
// reasons are free text with no length cap, so a hover-only tooltip
// would clip long text and never work on touch devices.
function RejectionReasonCell({ reason }: { reason: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          title={reason}
          className="block max-w-[220px] truncate text-left text-ps-text-secondary underline decoration-dotted underline-offset-2 hover:text-ps-text-primary"
        >
          {reason}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Motivo del rechazo</DialogTitle>
        </DialogHeader>
        <p className="whitespace-pre-wrap text-sm text-ps-text-secondary">
          {reason}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function getProductDisplayTitle(product: Product): string {
  if (product.title.length > 5) return product.title;
  if (!isVehicleProduct(product)) return product.title;
  return `${product.attributes.year || ""} ${product.attributes.model || product.title}`.trim();
}

export function ReviewQueueTable({
  products,
  selectedIds,
  onSelectionChange,
  selectable = true,
}: ReviewQueueTableProps) {
  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(products.map((p) => p.id)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleToggle = (productId: string, checked: boolean) => {
    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(productId);
    } else {
      newSelection.delete(productId);
    }
    onSelectionChange(newSelection);
  };

  const allSelected =
    products.length > 0 && selectedIds.size === products.length;
  const someSelected =
    selectedIds.size > 0 && selectedIds.size < products.length;
  const showReasonColumn = products.some((p) => p.rejection_reason);

  return (
    <div className="overflow-x-auto rounded-lg border border-ps-border-default bg-ps-surface">
      <table className="w-full">
        <thead className="border-b border-ps-border-default bg-ps-elevated">
          <tr>
            {selectable && (
              <th className="w-12 p-4">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) =>
                    handleToggleAll(checked === true)
                  }
                  aria-label="Seleccionar todos"
                  className={
                    someSelected ? "data-[state=checked]:bg-ps-cyan" : ""
                  }
                />
              </th>
            )}
            <th className="p-4 text-left text-sm font-semibold text-ps-text-primary">
              Producto
            </th>
            <th className="p-4 text-left text-sm font-semibold text-ps-text-primary">
              Precio
            </th>
            <th className="p-4 text-left text-sm font-semibold text-ps-text-primary">
              Estado
            </th>
            {showReasonColumn && (
              <th className="p-4 text-left text-sm font-semibold text-ps-text-primary">
                Motivo
              </th>
            )}
            <th className="p-4 text-left text-sm font-semibold text-ps-text-primary">
              Enviado
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-b border-ps-border-default last:border-0 hover:bg-ps-elevated"
            >
              {selectable && (
                <td className="p-4">
                  <Checkbox
                    checked={selectedIds.has(product.id)}
                    onCheckedChange={(checked) =>
                      handleToggle(product.id, checked === true)
                    }
                    aria-label={`Seleccionar ${product.title}`}
                  />
                </td>
              )}
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-ps-elevated">
                    {product.image_urls?.[0] ? (
                      <Image
                        src={
                          product.image_urls[0].startsWith("http")
                            ? product.image_urls[0]
                            : `${process.env.NEXT_PUBLIC_MINIO_URL || "http://localhost:9002/prosell-assets"}/${product.image_urls[0]}`
                        }
                        alt={product.title}
                        width={48}
                        height={48}
                        className="rounded object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg
                          className="h-6 w-6 text-ps-text-tertiary"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ps-text-primary">
                      {getProductDisplayTitle(product)}
                    </p>
                    {product.org_code && (
                      <span
                        className={`mt-1 inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white ${product.org_color ? "" : "bg-ps-tertiary"}`}
                        style={
                          product.org_color
                            ? { backgroundColor: product.org_color }
                            : undefined
                        }
                      >
                        {product.org_code}
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="p-4 text-ps-text-primary">
                ${(product.price_cents / 100).toLocaleString()}
              </td>
              <td className="p-4">
                <StatusPill status={product.status} />
              </td>
              {showReasonColumn && (
                <td className="p-4">
                  {product.rejection_reason ? (
                    <RejectionReasonCell reason={product.rejection_reason} />
                  ) : (
                    <span className="text-ps-text-tertiary">—</span>
                  )}
                </td>
              )}
              <td className="p-4 text-ps-text-secondary">
                {product.submitted_for_approval_at
                  ? new Date(
                      product.submitted_for_approval_at,
                    ).toLocaleDateString()
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
